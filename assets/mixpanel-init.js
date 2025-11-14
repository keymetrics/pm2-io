(function () {
  "use strict";

  const config = window.MIXPANEL_CONFIG || {};

  const debugLog = function () {
    if (config.debug) {
      console.log.apply(console, arguments);
    }
  };

  if (!config.token || config.token === "YOUR_MIXPANEL_TOKEN_HERE") {
    debugLog("[Mixpanel] No valid token configured. Tracking disabled.");
    return;
  }

  let mixpanelInitialized = false;

  function initializeMixpanel() {
    if (mixpanelInitialized) {
      debugLog("[Mixpanel] Already initialized, skipping...");
      return;
    }

    const isEUUser = window.GEO_DETECTION && window.GEO_DETECTION.isEU;
    const shouldIgnoreDNT = !isEUUser || config.ignore_dnt;

    const mixpanelConfig = {
      token: config.token.substring(0, 8) + "...",
      debug: config.debug || false,
      api_host: config.api_host || "default",
      ignore_dnt: true,
      track_pageview: false,
      persistence: "cookie"
    }

    if (config.api_host) {
      mixpanelConfig.api_host = config.api_host;
    }

    mixpanel.init(config.token, mixpanelConfig);
    mixpanelInitialized = true;
  }

  window.addEventListener("analytics-consent-granted", function () {
    debugLog("[Mixpanel] Analytics consent granted - initializing Mixpanel");
    initializeMixpanel();
  });

  window.addEventListener("analytics-consent-rejected", function () {
    debugLog("[Mixpanel] Analytics consent rejected - opting out of tracking");
    if (mixpanel && typeof mixpanel.opt_out_tracking === "function") {
      mixpanel.opt_out_tracking();
    }
  });

  function checkConsentAndInit() {
    if (!window.GEO_DETECTION || !window.GEO_DETECTION.detected) {
      debugLog("[Mixpanel] Waiting for geo-detection to complete...");
      window.addEventListener("geo-detection-complete", checkConsentAndInit, {
        once: true,
      });
      return;
    }

    if (window.ANALYTICS_CONSENT_GIVEN === true) {
      debugLog(
        "[Mixpanel] Pre-existing consent found - initializing immediately"
      );
      initializeMixpanel();
    } else {
      debugLog("[Mixpanel] Waiting for user consent...");
    }
  }

  if (window.CONSENT_READY) {
    checkConsentAndInit();
  } else {
    window.addEventListener("consent-manager-ready", checkConsentAndInit);
  }

  function trackCurrentPage() {
    const path = window.location.pathname;
    const pageEvents = {
      "/": "homepage_page_visited",
      "/index.html": "homepage_page_visited",
      "/pricing.html": "pricing_page_visited",
      "/pricing": "pricing_page_visited",
      "/contact.html": "contact_page_visited",
      "/contact": "contact_page_visited",
      "/blog.html": "blog_page_visited",
      "/blog": "blog_page_visited",
      "/contributors.html": "contributors_page_visited",
      "/contributors": "contributors_page_visited",
      "/users.html": "users_page_visited",
      "/users": "users_page_visited",
    };

    if (path.startsWith("/docs/")) {
      const props = { doc_path: path, doc_title: document.title };
      mixpanel.track("documentation_visited", props);
      debugLog("[Mixpanel] 📄 Page tracked: documentation_visited", props);
      return;
    }

    if (path.startsWith("/blog/")) {
      const props = { post_path: path, post_title: document.title };
      mixpanel.track("blog_post_visited", props);
      debugLog("[Mixpanel] 📄 Page tracked: blog_post_visited", props);
      return;
    }

    const eventName = pageEvents[path];
    if (eventName) {
      const props = { page_path: path, page_title: document.title };
      mixpanel.track(eventName, props);
      debugLog("[Mixpanel] 📄 Page tracked:", eventName, props);
    } else {
      debugLog("[Mixpanel] ⚠️  No tracking event defined for path:", path);
    }
  }

  function setupCrossSiteTracking() {
    const distinctId = mixpanel.get_distinct_id();

    document.querySelectorAll("a[data-track-cross-site]").forEach((link) => {
      try {
        const url = new URL(link.href);
        url.searchParams.set("mpid", distinctId);
        link.href = url.toString();

        debugLog("[Mixpanel] 🔗 Cross-site link prepared:", link.href);
      } catch (err) {
        debugLog("[Mixpanel] ⚠️  Invalid link:", link.href);
      }
    });

    document.addEventListener("click", function (e) {
      const link = e.target.closest("a[data-track-cross-site]");
      if (!link) return;

      const trackingEvent =
        link.getAttribute("data-tracking-event") || "cross_site_link_clicked";

      mixpanel.track(trackingEvent, {
        device_id: distinctId,
        destination_url: link.href,
        link_text: link.textContent.trim(),
      });

      debugLog("[Mixpanel] 🔗 Cross-site link clicked:", trackingEvent);
    });

    debugLog(
      "[Mixpanel] 🔗 Cross-site tracking enabled for",
      document.querySelectorAll("a[data-track-cross-site]").length,
      "links"
    );
  }

  if (config.debug) {
    window.mp = mixpanel;
    debugLog("[Mixpanel] 💡 Debug mode: Access mixpanel via window.mp");
  }
})();
