(function () {
  "use strict";

  const storageKey = "point-vernon-analytics-choice-v2";
  const legacyStorageKey = "point-vernon-analytics-choice";
  const measurementId = "G-003LRJYP3K";
  const banner = document.querySelector("[data-privacy-banner]");

  if (!banner) return;

  const allowButton = banner.querySelector("[data-analytics-allow]");
  const declineButton = banner.querySelector("[data-analytics-decline]");
  const settingsButtons = document.querySelectorAll("[data-privacy-settings]");
  let consentChoice = readChoice();
  const guidePaths = new Set(["/accessibility/", "/accommodation/", "/artificial-reef/", "/beaches/", "/boat-ramps/", "/charles-polson-history/", "/coastal-wildlife/", "/dog-friendly-foreshore/", "/eli-creek-beach/", "/fishing/", "/food-coffee/", "/gables-point-beach/", "/gatakers-bay/", "/getting-around/", "/history/", "/local-help/", "/local-life/", "/map-access/", "/moving-buying/", "/parkrun/", "/parks-playgrounds/", "/parraweena-park/", "/point-vernon-beach/", "/property-checks/", "/the-gables-history/", "/things-to-do/", "/tides/", "/visiting/", "/walks/", "/whales/", "/whats-on/"]);

  function readChoice() {
    try {
      const currentChoice = window.localStorage.getItem(storageKey);
      if (currentChoice === "allow" || currentChoice === "decline") return currentChoice;

      // Preserve an earlier refusal, but never treat the former cookieless
      // "allow" choice as permission to set first-party Analytics cookies.
      const legacyChoice = window.localStorage.getItem(legacyStorageKey);
      if (legacyChoice === "decline") {
        window.localStorage.setItem(storageKey, "decline");
        return "decline";
      }
      return null;
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

  function queueAnalyticsConsent(analyticsStorage) {
    window.gtag("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: analyticsStorage
    });
  }

  function loadAnalytics() {
    const analyticsScript = document.querySelector("script[data-point-vernon-analytics]");

    window["ga-disable-" + measurementId] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    if (!analyticsScript) {
      window.gtag("consent", "default", {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "denied"
      });
    }
    // loadAnalytics is reached only after a current or previously saved v2
    // opt-in. Queue the grant before config emits its automatic page view.
    queueAnalyticsConsent("granted");

    // Re-allowing on the same page must restore consent and ga-disable, but it
    // must not load or configure the same Google tag twice.
    if (analyticsScript) return;

    window.gtag("set", "ads_data_redaction", true);
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      content_group: contentGroupForPath(pagePath()),
      send_page_view: true,
      transport_type: "beacon"
    });

    const script = document.createElement("script");
    script.async = true;
    script.dataset.pointVernonAnalytics = "true";
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }

  function disableAnalytics() {
    window["ga-disable-" + measurementId] = true;
    if (typeof window.gtag === "function") {
      queueAnalyticsConsent("denied");
    }
  }

  function showBanner(moveFocus) {
    banner.hidden = false;
    if (moveFocus && allowButton) allowButton.focus();
  }

  function hideBanner() {
    banner.hidden = true;
  }

  function choose(choice) {
    consentChoice = choice;
    storeChoice(choice);
    if (choice === "allow") {
      loadAnalytics();
    } else {
      disableAnalytics();
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
    if (value === "/things-to-do/") return "explore";
    if (/^\/(beaches|eli-creek-beach|gatakers-bay|point-vernon-beach|gables-point-beach|walks|fishing|artificial-reef|tides|whales)\//.test(value)) return "coast";
    if (/^\/(visiting|map-access|accessibility|accommodation|getting-around)\//.test(value)) return "visit";
    if (/^\/(moving-buying|property-checks)\//.test(value)) return "moving";
    if (/^\/(history|the-gables-history|charles-polson-history|parraweena-park)\//.test(value)) return "history";
    if (/^\/(local-life|local-help|food-coffee|whats-on|parkrun|parks-playgrounds|dog-friendly-foreshore)\//.test(value)) return "local";
    return "site";
  }

  function sendAnalyticsEvent(eventName, parameters) {
    if (consentChoice !== "allow" || typeof window.gtag !== "function") return;

    window.gtag("event", eventName, Object.assign({
      page_path: pagePath(),
      content_group: contentGroupForPath(pagePath())
    }, parameters || {}));
  }

  function officialSourceType(hostname) {
    if (hostname.endsWith(".gov.au")) return "government";
    if (/^(www\.)?beachsafe\.(org|com)\.au$/.test(hostname)) return "water_safety";
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

    if (destination.origin === window.location.origin) {
      if (destination.pathname === pagePath() && destination.hash && link.closest(".in-page-nav")) {
        sendAnalyticsEvent("select_section", {
          section_name: cleanValue(destination.hash.slice(1), "unknown")
        });
      } else if (guidePaths.has(destination.pathname) && destination.pathname !== pagePath()) {
        sendAnalyticsEvent("select_guide", {
          guide_slug: destination.pathname.split("/")[1],
          selected_content_group: contentGroupForPath(destination.pathname),
          position: link.closest(".primary-nav") ? "navigation" : link.closest(".related-section") ? "related" : "inline"
        });
      }
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

  // Apply a choice made in another tab to both automatic and custom events.
  // Removal of the preference fails closed and asks for a fresh decision.
  window.addEventListener("storage", function (event) {
    if (event.key !== storageKey && event.key !== null) return;
    consentChoice = readChoice();
    if (consentChoice === "allow") {
      loadAnalytics();
      hideBanner();
    } else {
      disableAnalytics();
      if (consentChoice === "decline") hideBanner();
      else showBanner(false);
    }
  });

  const savedChoice = consentChoice;
  if (savedChoice === "allow") {
    loadAnalytics();
  } else if (savedChoice === "decline") {
    disableAnalytics();
  } else {
    showBanner(false);
  }
}());
