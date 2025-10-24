(function() {
  'use strict';

  const config = window.MIXPANEL_CONFIG || {};

  const debugLog = function() {
    if (config.debug) {
      console.log.apply(console, arguments);
    }
  };

  if (!config.token || config.token === 'YOUR_MIXPANEL_TOKEN_HERE') {
    debugLog('[Mixpanel] No valid token configured. Tracking disabled.');
    return;
  }

  const mixpanelConfig = {
    debug: config.debug || false,
    ignore_dnt: config.ignore_dnt || false,
    track_pageview: false,
    persistence: 'localStorage',
    loaded: function(mp) {
      debugLog('[Mixpanel] ✓ Initialized successfully');
      debugLog('[Mixpanel] Configuration:', {
        token: config.token.substring(0, 8) + '...',
        api_host: config.api_host || 'default',
        debug: config.debug,
        ignore_dnt: config.ignore_dnt,
        environment: config.env
      });
      trackCurrentPage();
      setupCrossSiteTracking();
    }
  };

  if (config.api_host) {
    mixpanelConfig.api_host = config.api_host;
  }

  mixpanel.init(config.token, mixpanelConfig);

  function trackCurrentPage() {
    const path = window.location.pathname;
    const pageEvents = {
      '/': 'homepage_page_visited',
      '/index.html': 'homepage_page_visited',
      '/pricing.html': 'pricing_page_visited',
      '/pricing': 'pricing_page_visited',
      '/contact.html': 'contact_page_visited',
      '/contact': 'contact_page_visited',
      '/blog.html': 'blog_page_visited',
      '/blog': 'blog_page_visited',
      '/contributors.html': 'contributors_page_visited',
      '/contributors': 'contributors_page_visited',
      '/users.html': 'users_page_visited',
      '/users': 'users_page_visited'
    };

    if (path.startsWith('/docs/')) {
      const props = { doc_path: path, doc_title: document.title };
      mixpanel.track('documentation_visited', props);
      debugLog('[Mixpanel] 📄 Page tracked: documentation_visited', props);
      return;
    }

    if (path.startsWith('/blog/')) {
      const props = { post_path: path, post_title: document.title };
      mixpanel.track('blog_post_visited', props);
      debugLog('[Mixpanel] 📄 Page tracked: blog_post_visited', props);
      return;
    }

    const eventName = pageEvents[path];
    if (eventName) {
      const props = { page_path: path, page_title: document.title };
      mixpanel.track(eventName, props);
      debugLog('[Mixpanel] 📄 Page tracked:', eventName, props);
    } else {
      debugLog('[Mixpanel] ⚠️  No tracking event defined for path:', path);
    }
  }

  const originalTrack = mixpanel.track;
  mixpanel.track = function(eventName, properties, callback) {
    debugLog('[Mixpanel] 📊 Tracking event:', eventName, properties || {});
    return originalTrack.call(this, eventName, properties, callback);
  };

  window.trackEvent = function(eventName, properties) {
    mixpanel.track(eventName, properties);
  };

  window.getDistinctId = function() {
    return mixpanel.get_distinct_id();
  };

  function setupCrossSiteTracking() {
    const distinctId = mixpanel.get_distinct_id();

    document.querySelectorAll('a[data-track-cross-site]').forEach(link => {
      try {
        const url = new URL(link.href);
        url.searchParams.set('mpid', distinctId);
        link.href = url.toString();

        debugLog('[Mixpanel] 🔗 Cross-site link prepared:', link.href);
      } catch (err) {
        debugLog('[Mixpanel] ⚠️  Invalid link:', link.href);
      }
    });

    document.addEventListener('click', function(e) {
      const link = e.target.closest('a[data-track-cross-site]');
      if (!link) return;

      const trackingEvent = link.getAttribute('data-tracking-event') || 'cross_site_link_clicked';

      mixpanel.track(trackingEvent, {
        device_id: distinctId,
        destination_url: link.href,
        link_text: link.textContent.trim()
      });

      debugLog('[Mixpanel] 🔗 Cross-site link clicked:', trackingEvent);
    });

    debugLog('[Mixpanel] 🔗 Cross-site tracking enabled for',
      document.querySelectorAll('a[data-track-cross-site]').length, 'links');
  }

  window.mp = mixpanel;
  debugLog('[Mixpanel] 💡 Tip: Access mixpanel via window.mp or use trackEvent() helper');

})();
