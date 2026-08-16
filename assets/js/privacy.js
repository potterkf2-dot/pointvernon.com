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
      allow_ad_personalization_signals: false
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
