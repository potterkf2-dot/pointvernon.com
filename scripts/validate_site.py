#!/usr/bin/env python3

import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parent.parent / "docs"
SITE_ORIGIN = "https://pointvernon.com"
EXPECTED_STYLE_VERSION = "20261011-map-v2"
EXPECTED_PRIVACY_VERSION = "20261004-engagement-v1"
EXPECTED_CONSENT_STORAGE_KEY = "point-vernon-analytics-choice-v2"
LEGACY_CONSENT_STORAGE_KEY = "point-vernon-analytics-choice"
EXPECTED_MEASUREMENT_ID = "G-003LRJYP3K"
EXPECTED_BANNER_COPY = "Allow cookies to measure visits and useful clicks? Advertising is disabled."
EXPECTED_ENHANCED_MEASUREMENT_COPY = (
    "Enhanced Measurement may also record scrolls, outbound-link clicks, file downloads, "
    "on-site search results, embedded-video interactions, and form starts or submissions"
)


class PageAudit(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.canonical = []
        self.descriptions = []
        self.feed_links = []
        self.h1_count = 0
        self.headings = []
        self.hrefs = []
        self.ids = []
        self.aria_references = []
        self.json_ld = []
        self.images = []
        self.robots = []
        self.lang = None
        self.resources = []
        self.title_parts = []
        self._in_json_ld = False
        self._in_title = False
        self._in_head = False

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "head":
            self._in_head = True
        if tag == "html":
            self.lang = values.get("lang")
        if tag == "title" and self._in_head:
            self._in_title = True
        if tag == "h1":
            self.h1_count += 1
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self.headings.append(int(tag[1]))
        if values.get("id"):
            self.ids.append(values["id"])
        for attribute in ("aria-labelledby", "aria-describedby", "aria-controls"):
            for target in values.get(attribute, "").split():
                self.aria_references.append((attribute, target))
        if tag == "a" and values.get("href"):
            self.hrefs.append(values["href"])
        if tag == "meta" and values.get("name") == "description":
            self.descriptions.append(values.get("content", ""))
        if tag == "meta" and values.get("name", "").lower() in {"robots", "googlebot", "bingbot"}:
            self.robots.extend(re.split(r"[,\s]+", values.get("content", "").lower()))
        if tag == "link" and values.get("rel") == "canonical":
            self.canonical.append(values.get("href", ""))
        if tag == "link" and values.get("type") == "application/atom+xml":
            self.feed_links.append(values.get("href", ""))
        if tag == "link" and values.get("rel") in {"stylesheet", "preload", "icon", "apple-touch-icon"} and values.get("href"):
            self.resources.append(values["href"])
        if tag == "link" and values.get("imagesrcset"):
            self.resources.extend(item.strip().split()[0] for item in values["imagesrcset"].split(","))
        if tag == "script":
            if values.get("src"):
                self.resources.append(values["src"])
            self._in_json_ld = values.get("type") == "application/ld+json"
            if self._in_json_ld:
                self.json_ld.append("")
        if tag in {"img", "source"}:
            if values.get("src"):
                self.resources.append(values["src"])
            if values.get("srcset"):
                self.resources.extend(item.strip().split()[0] for item in values["srcset"].split(","))
        if tag == "img":
            self.images.append(values)

    def handle_endtag(self, tag):
        if tag == "head":
            self._in_head = False
        if tag == "title":
            self._in_title = False
        if tag == "script":
            self._in_json_ld = False

    def handle_data(self, data):
        if self._in_title:
            self.title_parts.append(data)
        if self._in_json_ld:
            self.json_ld[-1] += data

    @property
    def title(self):
        return " ".join("".join(self.title_parts).split())


def route_for(file_path):
    relative = file_path.relative_to(ROOT).as_posix()
    if relative == "index.html":
        return "/"
    return "/" + relative.removesuffix("index.html")


def file_for_site_path(site_path):
    decoded = unquote(site_path)
    relative = decoded.lstrip("/")
    if not relative:
        return ROOT / "index.html"
    candidate = ROOT / relative
    if decoded.endswith("/"):
        candidate = candidate / "index.html"
    return candidate


def parse_page(file_path):
    parser = PageAudit()
    text = file_path.read_text(encoding="utf-8")
    parser.feed(text)
    return parser, text


def is_site_url(parts):
    """Include absolute first-party URLs in checks, as well as root-relative URLs."""
    if parts.scheme and parts.scheme not in {"http", "https"}:
        return False
    return not parts.netloc or parts.netloc == urlsplit(SITE_ORIGIN).netloc


def validate_breadcrumbs(schema, route, errors):
    if not isinstance(schema, dict):
        errors.append(f"{route}: JSON-LD must be an object")
        return
    nodes = schema.get("@graph", [schema])
    if not isinstance(nodes, list):
        errors.append(f"{route}: JSON-LD @graph must be an array")
        return
    for node in nodes:
        if not isinstance(node, dict):
            errors.append(f"{route}: JSON-LD graph entry must be an object")
            continue
        if node.get("@type") != "BreadcrumbList":
            continue
        items = node.get("itemListElement", [])
        if not isinstance(items, list) or len(items) < 2:
            errors.append(f"{route}: breadcrumb needs at least two items")
            continue
        for position, item in enumerate(items, start=1):
            if not isinstance(item, dict):
                errors.append(f"{route}: breadcrumb item {position} must be an object")
                continue
            if item.get("@type") != "ListItem" or item.get("position") != position or not item.get("name"):
                errors.append(f"{route}: invalid breadcrumb name, type or position at item {position}")
            destination = item.get("item", "")
            if not isinstance(destination, str) or not destination.startswith(SITE_ORIGIN + "/"):
                errors.append(f"{route}: breadcrumb item {position} must use a canonical site URL")
            elif not file_for_site_path(urlsplit(destination).path).is_file():
                errors.append(f"{route}: broken breadcrumb URL {destination}")
        if not isinstance(items[-1], dict) or items[-1].get("item") != SITE_ORIGIN + route:
            errors.append(f"{route}: final breadcrumb does not match this page")


def expected_page_date(text):
    dates = re.findall(r'"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"', text)
    dates += re.findall(r'<time\b[^>]*\bdatetime="(\d{4}-\d{2}-\d{2})"', text)
    return max(dates) if dates else None


def object_setting(body, key):
    match = re.search(rf"\b{re.escape(key)}\s*:\s*[\"']([^\"']+)[\"']", body)
    return match.group(1) if match else None


def consent_command(script, command):
    return re.search(
        rf'window\.gtag\(\s*"consent"\s*,\s*"{re.escape(command)}"\s*,\s*\{{(?P<body>.*?)\}}\s*\);',
        script,
        re.DOTALL,
    )


def validate_asset_versions(parser, label, errors):
    style_resources = [
        resource for resource in parser.resources
        if urlsplit(resource).path == "/assets/css/style.css"
    ]
    expected_style = f"/assets/css/style.css?v={EXPECTED_STYLE_VERSION}"
    if style_resources != [expected_style]:
        errors.append(f"{label}: expected one stylesheet reference at {expected_style}")

    privacy_resources = [
        resource for resource in parser.resources
        if urlsplit(resource).path == "/assets/js/privacy.js"
    ]
    expected_privacy = f"/assets/js/privacy.js?v={EXPECTED_PRIVACY_VERSION}"
    if privacy_resources != [expected_privacy]:
        errors.append(f"{label}: expected one privacy script reference at {expected_privacy}")


def validate_privacy_surface(text, label, errors):
    if text.count(EXPECTED_BANNER_COPY) != 1:
        errors.append(f"{label}: expected the current Analytics cookie disclosure once")
    if text.count(">Allow analytics</button>") != 1:
        errors.append(f"{label}: expected one current Analytics allow control")
    if "Allow anonymous Analytics" in text or "Analytics storage remain disabled" in text:
        errors.append(f"{label}: stale cookieless Analytics wording remains")

    for attribute in (
        "data-privacy-banner",
        "data-analytics-allow",
        "data-analytics-decline",
        "data-privacy-settings",
    ):
        count = text.count(attribute)
        if attribute == "data-privacy-settings":
            if count < 1:
                errors.append(f"{label}: expected at least one privacy settings control")
        elif count != 1:
            errors.append(f"{label}: expected one {attribute} consent control")

    if re.search(
        r'<script\b[^>]*\bsrc=["\'](?:https:)?//(?:www\.)?googletagmanager\.com/',
        text,
        re.IGNORECASE,
    ):
        errors.append(f"{label}: direct Google tag would load before consent")
    if re.search(r"<script\b[^>]*>[^<]*(?:dataLayer|\bgtag\s*\()", text, re.IGNORECASE):
        errors.append(f"{label}: inline Google tag initialisation would run before consent")


def validate_analytics_script(errors):
    script_path = ROOT / "assets" / "js" / "privacy.js"
    script = script_path.read_text(encoding="utf-8")

    if f'const storageKey = "{EXPECTED_CONSENT_STORAGE_KEY}";' not in script:
        errors.append("privacy.js: current consent storage key is missing or stale")
    if f'const legacyStorageKey = "{LEGACY_CONSENT_STORAGE_KEY}";' not in script:
        errors.append("privacy.js: legacy consent storage key is missing")
    if script.count(f'const measurementId = "{EXPECTED_MEASUREMENT_ID}";') != 1:
        errors.append("privacy.js: expected GA4 measurement ID is missing or duplicated")
    if 'if (legacyChoice === "decline")' not in script:
        errors.append("privacy.js: legacy declines are not preserved")
    if 'window.localStorage.setItem(storageKey, "decline");' not in script:
        errors.append("privacy.js: legacy declines are not migrated to the current key")
    if re.search(r'legacyChoice\s*===\s*["\']allow["\']|return\s+legacyChoice', script):
        errors.append("privacy.js: legacy allow must not grant cookie-backed Analytics")

    default_consent = consent_command(script, "default")
    update_consent = consent_command(script, "update")
    if not default_consent:
        errors.append("privacy.js: missing default-denied consent command")
    else:
        for setting in ("ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"):
            if object_setting(default_consent.group("body"), setting) != "denied":
                errors.append(f"privacy.js: default {setting} must be denied")

    if not update_consent:
        errors.append("privacy.js: missing reusable consent update")
    else:
        update_body = update_consent.group("body")
        for setting in ("ad_storage", "ad_user_data", "ad_personalization"):
            if object_setting(update_body, setting) != "denied":
                errors.append(f"privacy.js: updated {setting} must remain denied")
        if not re.search(r"\banalytics_storage\s*:\s*analyticsStorage\b", update_body):
            errors.append("privacy.js: consent update must use the requested Analytics state")

    enable_position = script.find('window["ga-disable-" + measurementId] = false;')
    default_position = script.find('window.gtag("consent", "default", {')
    grant_position = script.find('queueAnalyticsConsent("granted");')
    guard_position = script.find("if (analyticsScript) return;")
    js_position = script.find('window.gtag("js", new Date());')
    config_position = script.find('window.gtag("config", measurementId, {')
    source_position = script.find('script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);')
    append_position = script.find("document.head.appendChild(script);")
    page_view_position = script.find('window.gtag("event", "page_view"')
    ordered_positions = (
        enable_position,
        default_position,
        grant_position,
        guard_position,
        js_position,
        config_position,
        source_position,
        append_position,
    )
    if min(ordered_positions) < 0:
        errors.append("privacy.js: required consent, GA4 configuration or tag-injection step is missing")
    elif list(ordered_positions) != sorted(ordered_positions):
        errors.append("privacy.js: consent grant and GA4 configuration must be queued before tag injection")
    if page_view_position >= 0 and grant_position > page_view_position:
        errors.append("privacy.js: Analytics consent must be granted before page_view")

    if script.count('document.createElement("script")') != 1:
        errors.append("privacy.js: expected exactly one dynamic Analytics script element")
    if script.count("script.dataset.pointVernonAnalytics = \"true\";") != 1:
        errors.append("privacy.js: Analytics script marker is missing or duplicated")
    if script.count("document.head.appendChild(script);") != 1:
        errors.append("privacy.js: Analytics tag must be appended exactly once")
    if script.count("https://www.googletagmanager.com/gtag/js?id=") != 1:
        errors.append("privacy.js: Google tag source is missing or duplicated")

    config_match = re.search(
        r'window\.gtag\("config",\s*measurementId,\s*\{(?P<body>.*?)\}\);',
        script,
        re.DOTALL,
    )
    if not config_match:
        errors.append("privacy.js: missing GA4 config")
    else:
        config_body = config_match.group("body")
        for setting in ("allow_google_signals", "allow_ad_personalization_signals"):
            if not re.search(rf"\b{setting}\s*:\s*false\b", config_body):
                errors.append(f"privacy.js: {setting} must remain false")
        if not re.search(r"\bsend_page_view\s*:\s*true\b", config_body):
            errors.append("privacy.js: config must emit its initial page view after consent")

    disable_match = re.search(
        r"function disableAnalytics\(\)\s*\{(?P<body>.*?)\n  \}",
        script,
        re.DOTALL,
    )
    if not disable_match:
        errors.append("privacy.js: missing disableAnalytics toggle path")
    else:
        disable_body = disable_match.group("body")
        if 'window["ga-disable-" + measurementId] = true;' not in disable_body:
            errors.append("privacy.js: declining must set ga-disable")
        if 'typeof window.gtag === "function"' not in disable_body:
            errors.append("privacy.js: declining must not create or load gtag when it is absent")
        if 'queueAnalyticsConsent("denied");' not in disable_body:
            errors.append("privacy.js: declining after load must update Analytics consent to denied")
        if "loadAnalytics(" in disable_body or "googletagmanager.com" in disable_body:
            errors.append("privacy.js: declining must not load Analytics")

    if not re.search(r'if \(choice === "allow"\) \{\s*loadAnalytics\(\);', script):
        errors.append("privacy.js: fresh allow does not load Analytics")
    if not re.search(r'if \(savedChoice === "allow"\) \{\s*loadAnalytics\(\);', script):
        errors.append("privacy.js: saved current-version allow does not load Analytics")
    if not re.search(r'else if \(savedChoice === "decline"\) \{\s*disableAnalytics\(\);', script):
        errors.append("privacy.js: saved decline does not keep Analytics disabled")
    if len(re.findall(r"\bloadAnalytics\(\);", script)) != 3:
        errors.append("privacy.js: Analytics must load only from fresh, saved or synchronised current-version allow")


def validate_privacy_version_references(errors):
    checked_suffixes = {".html", ".js", ".md", ".pl", ".py"}
    for path in ROOT.rglob("*"):
        if not path.is_file() or ".git" in path.parts or path.suffix not in checked_suffixes:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for version in re.findall(r"privacy\.js\?v=([A-Za-z0-9._-]+)", text):
            if version != EXPECTED_PRIVACY_VERSION:
                label = path.relative_to(ROOT).as_posix()
                errors.append(f"{label}: stale privacy script version {version}")


def main():
    errors = []
    public_suffixes = {".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".avif", ".webp", ".svg", ".ico", ".txt", ".xml"}
    for public_file in ROOT.rglob("*"):
        if public_file.is_file() and public_file.name not in {"CNAME", ".nojekyll"} and public_file.suffix.lower() not in public_suffixes:
            errors.append(f"Unexpected public file: {public_file.relative_to(ROOT)}")
    if (ROOT / "assets/css/style.css").stat().st_size >= 25000:
        errors.append("Stylesheet must remain under 25,000 bytes")
    if list((ROOT / "assets/css").glob("*.css")) != [ROOT / "assets/css/style.css"]:
        errors.append("Expected one shared stylesheet")
    page_files = sorted(path for path in ROOT.rglob("index.html") if ".git" not in path.parts)
    redirects = {"/updates/": "/whats-on/", "/editorial-policy/": "/about/#standards"}
    parsed_pages = {}
    titles = {}
    descriptions = {}

    for file_path in page_files:
        route = route_for(file_path)
        parser, text = parse_page(file_path)
        if route in redirects:
            target = redirects[route]
            canonical = SITE_ORIGIN + target.split("#")[0]
            if "noindex" not in parser.robots or parser.canonical != [canonical]:
                errors.append(f"{route}: retired route must be a noindex redirect to {target}")
            if not re.search(r'<meta[^>]+content="0; url=' + re.escape(target) + r'"[^>]+http-equiv="refresh"', text) or parser.hrefs != [target]:
                errors.append(f"{route}: expected immediate redirect and a single fallback link")
            continue
        parsed_pages[route] = (parser, text)
        titles[route] = parser.title
        descriptions[route] = parser.descriptions[0] if parser.descriptions else ""

        if parser.lang != "en-AU":
            errors.append(f"{route}: expected lang=en-AU")
        if not parser.title or len(parser.title) >= 60:
            errors.append(f"{route}: title must be non-empty and under 60 characters")
        if len(parser.descriptions) != 1 or not parser.descriptions[0]:
            errors.append(f"{route}: expected one non-empty meta description")
        elif not 120 <= len(parser.descriptions[0]) <= 155:
            errors.append(f"{route}: meta description is {len(parser.descriptions[0])} characters")
        if parser.h1_count != 1:
            errors.append(f"{route}: expected one H1, found {parser.h1_count}")
        for previous, current in zip(parser.headings, parser.headings[1:]):
            if current > previous + 1:
                errors.append(f"{route}: heading level skips from H{previous} to H{current}")
        if {"noindex", "none"}.intersection(parser.robots):
            errors.append(f"{route}: public sitemap page must not declare noindex")
        if len(parser.canonical) != 1 or parser.canonical[0] != SITE_ORIGIN + route:
            errors.append(f"{route}: canonical does not match route ({parser.canonical})")
        if parser.feed_links:
            errors.append(f"{route}: retired feed discovery link must not return")
        if any(urlsplit(href).path in {"/updates/", "/updates.xml", "/editorial-policy/"} for href in parser.hrefs):
            errors.append(f"{route}: link to retired content")
        if any(SITE_ORIGIN + old_route in text for old_route in redirects):
            errors.append(f"{route}: stale retired URL in content or structured data")
        duplicate_ids = [item for item, count in Counter(parser.ids).items() if count > 1]
        if duplicate_ids:
            errors.append(f"{route}: duplicate IDs {duplicate_ids}")
        for attribute, target in parser.aria_references:
            if target not in parser.ids:
                errors.append(f"{route}: {attribute} points to missing ID {target}")
        validate_asset_versions(parser, route, errors)
        validate_privacy_surface(text, route, errors)
        public_copy = re.sub(r"<[^>]+>", " ", text)
        if re.search(r"\b(TODO|TBC|owner confirmation required|placeholder)\b", public_copy, re.IGNORECASE):
            errors.append(f"{route}: unfinished public marker found")

        for raw_json in parser.json_ld:
            try:
                validate_breadcrumbs(json.loads(raw_json), route, errors)
            except json.JSONDecodeError as error:
                errors.append(f"{route}: invalid JSON-LD ({error})")

        for image in parser.images:
            label = image.get("src", "unnamed image")
            if "alt" not in image:
                errors.append(f"{route}: image is missing an alt attribute ({label})")
            for dimension in ("width", "height"):
                value = image.get(dimension) or ""
                if not value.isdigit() or int(value) <= 0:
                    errors.append(f"{route}: image needs a positive {dimension} ({label})")

        for resource in parser.resources:
            parts = urlsplit(resource)
            if not is_site_url(parts) or not parts.path.startswith("/"):
                continue
            target = file_for_site_path(parts.path)
            if not target.is_file():
                errors.append(f"{route}: missing resource {parts.path}")

    not_found_parser, not_found_text = parse_page(ROOT / "404.html")
    validate_asset_versions(not_found_parser, "/404.html", errors)
    validate_privacy_surface(not_found_text, "/404.html", errors)
    if not {"noindex", "none"}.intersection(not_found_parser.robots):
        errors.append("/404.html: error page must declare noindex")
    if not_found_parser.canonical:
        errors.append("/404.html: remove the canonical from the error page")
    validate_analytics_script(errors)
    validate_privacy_version_references(errors)

    privacy_text = parsed_pages.get("/privacy/", (None, ""))[1]
    if EXPECTED_ENHANCED_MEASUREMENT_COPY not in privacy_text:
        errors.append("/privacy/: Enhanced Measurement disclosure is missing or stale")

    for value, count in Counter(titles.values()).items():
        if value and count > 1:
            routes = [route for route, title in titles.items() if title == value]
            errors.append(f"Duplicate title on {routes}: {value}")
    for value, count in Counter(descriptions.values()).items():
        if value and count > 1:
            routes = [route for route, description in descriptions.items() if description == value]
            errors.append(f"Duplicate description on {routes}: {value}")

    for route, (parser, _) in parsed_pages.items():
        for href in parser.hrefs:
            parts = urlsplit(href)
            if not is_site_url(parts):
                continue
            target_route = parts.path or ("/" if parts.netloc else route)
            if not target_route.startswith("/"):
                errors.append(f"{route}: unsupported relative link {href}")
                continue
            target_file = file_for_site_path(target_route)
            if not target_file.is_file():
                errors.append(f"{route}: broken internal link {href}")
                continue
            if parts.fragment and target_file.name == "index.html":
                target_canonical_route = route_for(target_file)
                target_parser = parsed_pages.get(target_canonical_route, (parse_page(target_file)[0], ""))[0]
                if unquote(parts.fragment) not in target_parser.ids:
                    errors.append(f"{route}: missing fragment target {href}")

    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    sitemap_root = ET.parse(ROOT / "sitemap.xml").getroot()
    sitemap_dates = {}
    for node in sitemap_root.findall("sm:url", namespace):
        loc = node.findtext("sm:loc", namespaces=namespace)
        lastmod = node.findtext("sm:lastmod", namespaces=namespace)
        if not loc or not loc.startswith(SITE_ORIGIN + "/"):
            errors.append(f"Sitemap contains a missing or non-canonical URL: {loc}")
            continue
        if loc.removeprefix(SITE_ORIGIN) in sitemap_dates:
            errors.append(f"Sitemap contains duplicate URL: {loc}")
        sitemap_dates[loc.removeprefix(SITE_ORIGIN)] = lastmod

    if set(sitemap_dates) != set(parsed_pages):
        errors.append(
            f"Sitemap/page mismatch: missing={sorted(set(parsed_pages) - set(sitemap_dates))}; "
            f"extra={sorted(set(sitemap_dates) - set(parsed_pages))}"
        )
    for route, (_, text) in parsed_pages.items():
        page_date = expected_page_date(text)
        if sitemap_dates.get(route) != page_date:
            errors.append(f"{route}: sitemap {sitemap_dates.get(route)} != page {page_date}")

    if (ROOT / "updates.xml").exists():
        errors.append("updates.xml: retired feed must not be republished")
    for route in redirects:
        if not (ROOT / route.strip("/") / "index.html").is_file():
            errors.append(f"{route}: legacy redirect is missing")

    security = (ROOT / ".well-known" / "security.txt").read_text(encoding="utf-8")
    for required in ["Contact:", "Expires:", "Canonical:"]:
        if required not in security:
            errors.append(f"security.txt: missing {required}")

    if errors:
        print("Site validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(
        f"Validated {len(parsed_pages)} pages: unique metadata, self-canonicals, one H1, "
        "valid JSON-LD and breadcrumbs, internal links/resources, image dimensions and alt attributes, "
        "heading order, indexability, matching sitemap dates, retired-route handling and security.txt."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
