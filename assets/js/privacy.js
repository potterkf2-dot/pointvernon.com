(function () {
  "use strict";

  const storageKey = "point-vernon-analytics-choice";
  const measurementId = "G-003LRJYP3K";
  const banner = document.querySelector("[data-privacy-banner]");

  if (!banner) return;

  const allowButton = banner.querySelector("[data-analytics-allow]");
  const declineButton = banner.querySelector("[data-analytics-decline]");
  const settingsButtons = document.querySelectorAll("[data-privacy-settings]");

  function readChoice() {
    try {
      return window.localStorage.getItem(storageKey);
    } catch (error) {
      return null;
    }
  }

  function storeChoice(choice) {
    try {
      window.localStorage.setItem(storageKey, choice);
    } catch (error) {
      // If storage is blocked, the site remains usable and Analytics stays off
      // on the next page load.
    }
  }

  function loadAnalytics() {
    if (document.querySelector("script[data-point-vernon-analytics]")) return;

    window["ga-disable-" + measurementId] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    window.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied"
    });
    window.gtag("set", "ads_data_redaction", true);
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      transport_type: "beacon"
    });

    const script = document.createElement("script");
    script.async = true;
    script.dataset.pointVernonAnalytics = "true";
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }

  function showBanner(moveFocus) {
    banner.hidden = false;
    if (moveFocus && allowButton) allowButton.focus();
  }

  function hideBanner() {
    banner.hidden = true;
  }

  function choose(choice) {
    storeChoice(choice);
    if (choice === "allow") {
      loadAnalytics();
    } else {
      window["ga-disable-" + measurementId] = true;
    }
    hideBanner();
  }

  function cleanValue(value, fallback) {
    const cleaned = String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    return cleaned || fallback;
  }

  function pagePath() {
    return window.location.pathname || "/";
  }

  function contentGroupForPath(path) {
    const value = String(path || "/");
    if (value === "/") return "home";
    if (/^\/(beaches|eli-creek-beach|gatakers-bay|point-vernon-beach|gables-point-beach|walks|fishing|artificial-reef|tides|whales)\//.test(value)) return "coast";
    if (/^\/(visiting|map-access|accessibility|accommodation|getting-around)\//.test(value)) return "visit";
    if (/^\/(moving-buying|property-checks)\//.test(value)) return "moving";
    if (/^\/(history|the-gables-history|charles-polson-history|parraweena-park)\//.test(value)) return "history";
    if (/^\/(local-life|local-help|food-coffee|whats-on|parkrun|parks-playgrounds|dog-friendly-foreshore)\//.test(value)) return "local";
    return "site";
  }

  function sendAnalyticsEvent(eventName, parameters) {
    if (readChoice() !== "allow" || typeof window.gtag !== "function") return;

    window.gtag("event", eventName, Object.assign({
      page_path: pagePath(),
      content_group: contentGroupForPath(pagePath())
    }, parameters || {}));
  }

  function officialSourceType(hostname) {
    if (hostname.endsWith(".gov.au")) return "government";
    if (hostname === "beachsafe.org.au" || hostname.endsWith(".beachsafe.org.au")) return "water_safety";
    if (hostname === "parkrun.com.au" || hostname.endsWith(".parkrun.com.au")) return "event_organiser";
    if (hostname === "translink.com.au" || hostname.endsWith(".translink.com.au")) return "transport";
    return null;
  }

  function closestServiceName(link) {
    const section = link.closest("section[id]");
    return cleanValue(link.dataset.serviceName || (section && section.id), "general");
  }

  document.addEventListener("click", function (event) {
    const link = event.target.closest("a[href]");
    if (!link) return;

    const explicitEvent = link.dataset.analyticsEvent;
    const linkText = cleanValue(link.textContent, "link");

    if (explicitEvent === "select_home_path") {
      sendAnalyticsEvent(explicitEvent, {
        path_name: cleanValue(link.dataset.pathName, "unknown"),
        link_url: link.pathname || "/",
        link_text: linkText,
        position: cleanValue(link.dataset.position, "unknown")
      });
      return;
    }

    if (explicitEvent === "select_guide") {
      sendAnalyticsEvent(explicitEvent, {
        guide_slug: cleanValue(link.dataset.guideSlug, "unknown"),
        selected_content_group: contentGroupForPath(link.pathname),
        link_text: linkText,
        position: cleanValue(link.dataset.position, "unknown")
      });
      return;
    }

    if (explicitEvent === "map_click") {
      sendAnalyticsEvent(explicitEvent, {
        map_provider: cleanValue(link.dataset.mapProvider, "unknown"),
        place_name: cleanValue(link.dataset.placeName, "Point Vernon")
      });
      return;
    }

    if (explicitEvent === "contact_click") {
      sendAnalyticsEvent(explicitEvent, {
        contact_type: cleanValue(link.dataset.contactType, "unknown"),
        service_name: closestServiceName(link)
      });
      return;
    }

    if (explicitEvent === "event_suggestion_click") {
      sendAnalyticsEvent(explicitEvent, {
        method: "email"
      });
      return;
    }

    if (link.protocol === "tel:" || link.protocol === "mailto:") {
      sendAnalyticsEvent("contact_click", {
        contact_type: link.protocol === "tel:" ? "phone" : "email",
        service_name: closestServiceName(link)
      });
      return;
    }

    let destination;
    try {
      destination = new URL(link.href, window.location.href);
    } catch (error) {
      return;
    }

    const sourceType = officialSourceType(destination.hostname);
    if (sourceType) {
      sendAnalyticsEvent("outbound_official_source", {
        destination_domain: destination.hostname,
        source_type: sourceType
      });
      return;
    }

    if (/^((www|maps)\.)?google\.[a-z.]+$/.test(destination.hostname) || /^(www\.)?(maps\.apple\.com|openstreetmap\.org)$/.test(destination.hostname)) {
      sendAnalyticsEvent("map_click", {
        map_provider: destination.hostname,
        place_name: "Point Vernon"
      });
    }
  });

  if (allowButton) allowButton.addEventListener("click", function () { choose("allow"); });
  if (declineButton) declineButton.addEventListener("click", function () { choose("decline"); });

  settingsButtons.forEach(function (button) {
    button.addEventListener("click", function () { showBanner(true); });
  });

  const savedChoice = readChoice();
  if (savedChoice === "allow") {
    loadAnalytics();
  } else if (savedChoice !== "decline") {
    showBanner(false);
  }
}());
