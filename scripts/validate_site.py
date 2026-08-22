#!/usr/bin/env python3

import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parent.parent
SITE_ORIGIN = "https://pointvernon.com"
EXPECTED_ASSET_VERSION = "20260822-audit"


class PageAudit(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.canonical = []
        self.descriptions = []
        self.feed_links = []
        self.h1_count = 0
        self.hrefs = []
        self.ids = []
        self.json_ld = []
        self.lang = None
        self.resources = []
        self.title_parts = []
        self._in_json_ld = False
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "html":
            self.lang = values.get("lang")
        if tag == "title":
            self._in_title = True
        if tag == "h1":
            self.h1_count += 1
        if values.get("id"):
            self.ids.append(values["id"])
        if tag == "a" and values.get("href"):
            self.hrefs.append(values["href"])
        if tag == "meta" and values.get("name") == "description":
            self.descriptions.append(values.get("content", ""))
        if tag == "link" and values.get("rel") == "canonical":
            self.canonical.append(values.get("href", ""))
        if tag == "link" and values.get("type") == "application/atom+xml":
            self.feed_links.append(values.get("href", ""))
        if tag == "link" and values.get("rel") == "stylesheet" and values.get("href"):
            self.resources.append(values["href"])
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

    def handle_endtag(self, tag):
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


def expected_page_date(text):
    dates = re.findall(r'"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"', text)
    dates += re.findall(r'<time\b[^>]*\bdatetime="(\d{4}-\d{2}-\d{2})"', text)
    return max(dates) if dates else None


def main():
    errors = []
    page_files = sorted(path for path in ROOT.rglob("index.html") if ".git" not in path.parts)
    parsed_pages = {}
    titles = {}
    descriptions = {}

    for file_path in page_files:
        route = route_for(file_path)
        parser, text = parse_page(file_path)
        parsed_pages[route] = (parser, text)
        titles[route] = parser.title
        descriptions[route] = parser.descriptions[0] if parser.descriptions else ""

        if parser.lang != "en-AU":
            errors.append(f"{route}: expected lang=en-AU")
        if not parser.title:
            errors.append(f"{route}: missing title")
        if len(parser.descriptions) != 1 or not parser.descriptions[0]:
            errors.append(f"{route}: expected one non-empty meta description")
        elif len(parser.descriptions[0]) > 160:
            errors.append(f"{route}: meta description is {len(parser.descriptions[0])} characters")
        if parser.h1_count != 1:
            errors.append(f"{route}: expected one H1, found {parser.h1_count}")
        if len(parser.canonical) != 1 or parser.canonical[0] != SITE_ORIGIN + route:
            errors.append(f"{route}: canonical does not match route ({parser.canonical})")
        if len(parser.feed_links) != 1 or urlsplit(parser.feed_links[0]).path != "/updates.xml":
            errors.append(f"{route}: missing or incorrect Atom discovery link")
        duplicate_ids = [item for item, count in Counter(parser.ids).items() if count > 1]
        if duplicate_ids:
            errors.append(f"{route}: duplicate IDs {duplicate_ids}")
        if f"style.css?v={EXPECTED_ASSET_VERSION}" not in " ".join(parser.resources):
            errors.append(f"{route}: stylesheet version is stale")
        if f"privacy.js?v={EXPECTED_ASSET_VERSION}" not in " ".join(parser.resources):
            errors.append(f"{route}: privacy script version is stale")
        if re.search(r"\b(TODO|TBC|owner confirmation required|placeholder)\b", text, re.IGNORECASE):
            errors.append(f"{route}: unfinished public marker found")

        for raw_json in parser.json_ld:
            try:
                json.loads(raw_json)
            except json.JSONDecodeError as error:
                errors.append(f"{route}: invalid JSON-LD ({error})")

        for resource in parser.resources:
            parts = urlsplit(resource)
            if parts.scheme or resource.startswith("//") or not parts.path.startswith("/"):
                continue
            target = file_for_site_path(parts.path)
            if not target.is_file():
                errors.append(f"{route}: missing resource {parts.path}")

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
            if parts.scheme in {"http", "https", "mailto", "tel"} or href.startswith("//"):
                continue
            target_route = route if not parts.path else parts.path
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
                if parts.fragment not in target_parser.ids:
                    errors.append(f"{route}: missing fragment target {href}")

    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    sitemap_root = ET.parse(ROOT / "sitemap.xml").getroot()
    sitemap_dates = {}
    for node in sitemap_root.findall("sm:url", namespace):
        loc = node.findtext("sm:loc", namespaces=namespace)
        lastmod = node.findtext("sm:lastmod", namespaces=namespace)
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

    try:
        ET.parse(ROOT / "updates.xml")
    except ET.ParseError as error:
        errors.append(f"updates.xml: invalid Atom XML ({error})")

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
        "valid JSON-LD, complete internal links/resources, matching sitemap dates, Atom XML and security.txt."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
