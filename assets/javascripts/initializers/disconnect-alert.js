import { withPluginApi } from "discourse/lib/plugin-api";

// DEBUG feature: expose these functions globally for testing
window.discourseDisconnectAlert = {
  showBanner: null,
  hideBanner: null,
  toggleBanner: null
};

function showDisconnectBanner(api) {
  console.debug("showDisconnectBanner called");
  const siteSettings = api.container.lookup("service:site-settings");
  const message = siteSettings.disconnect_alert_message;
  console.debug("Banner message:", message);

  // Create a banner element and inject it into the page
  if (!document.getElementById("disconnect-alert-banner")) {
    console.debug("Creating new banner element");
    const banner = document.createElement("div");
    banner.id = "disconnect-alert-banner";

    // Add a close button for testing purposes
    banner.innerHTML = `
      ⚠️ ${message}
      <button id="disconnect-alert-close" 
              style="margin-left: 15px; padding: 5px 10px; background: rgba(0,0,0,0.2); 
                     border: none; color: white; border-radius: 4px; cursor: pointer">
        Close
      </button>
    `;
    console.debug("Banner element created:", banner);

    // Insert into the body
    document.body.appendChild(banner);
    console.debug("Banner appended to body, element now in DOM:", !!document.getElementById("disconnect-alert-banner"));

    // Add click handler to the close button
    document.getElementById("disconnect-alert-close")?.addEventListener("click", (e) => {
      e.preventDefault();
      hideDisconnectBanner(api);
    });

    // Debug CSS - check if styles are applied
    console.debug("Banner computed styles:", window.getComputedStyle(banner));

    // Verify the stylesheet is loaded by checking for applied styles
    setTimeout(() => {
      const computedStyle = window.getComputedStyle(banner);
      const backgroundColorApplied = computedStyle.backgroundColor === 'rgb(228, 87, 53)'; // #e45735
      console.debug("Banner styles applied from stylesheet:",
                  backgroundColorApplied ? "Yes" : "No (using fallback styles)");
    }, 10);
  } else {
    console.debug("Banner already exists, not creating a new one");
  }
}

function hideDisconnectBanner(api) {
  console.debug("hideDisconnectBanner called");
  const banner = document.getElementById("disconnect-alert-banner");
  if (banner) {
    console.debug("Found banner to hide");
    // Add a slide-up class for animation
    banner.classList.add("slide-up");
    console.debug("Added slide-up class");

    // Remove the banner after animation completes
    setTimeout(() => {
      if (banner && banner.parentNode) {
        console.debug("Removing banner from DOM");
        banner.remove();
        console.debug("Banner removed, still in DOM?", !!document.getElementById("disconnect-alert-banner"));
      } else {
        console.debug("Banner or parent no longer exists");
      }
    }, 300);
  } else {
    console.debug("No banner found to hide");
  }
}

// Create a toggle function for the banner
function toggleDisconnectBanner(api) {
  if (document.getElementById("disconnect-alert-banner")) {
    hideDisconnectBanner(api);
    return false; // Banner was hidden
  } else {
    showDisconnectBanner(api);
    return true; // Banner was shown
  }
}

function startPing(api) {
  console.debug("startPing called with api:", !!api);
  let failed = false;
  let pingInterval;

  // Set up global test functions
  window.discourseDisconnectAlert.showBanner = () => showDisconnectBanner(api);
  window.discourseDisconnectAlert.hideBanner = () => hideDisconnectBanner(api);
  window.discourseDisconnectAlert.toggleBanner = () => toggleDisconnectBanner(api);

  // Add a keyboard shortcut for testing (Alt+Shift+D)
  // document.addEventListener('keydown', (e) => {
  //   if (e.altKey && e.shiftKey && e.key === 'D') {
  //     console.debug("DEBUG: Manual banner toggle triggered");
  //     const isShowing = toggleDisconnectBanner(api);
  //     console.debug(`DEBUG: Banner is now ${isShowing ? 'visible' : 'hidden'}`);
  //   }
  // });

  const checkServerConnection = () => {
    console.debug("Checking server connection...");

    // Get CSRF token from meta tag
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
    console.debug("CSRF token found:", !!csrfToken);

    const headers = {
      "Accept": "application/json",
      "cache": "no-store"
    };

    // Only add the CSRF token if it exists
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }

    console.debug("Request headers:", headers);
    console.debug("Current connection state - failed:", failed);

    fetch("/srv/status.json", {
      method: "GET",
      credentials: "same-origin",
      headers: headers,
      cache: "no-store"
    })
      .then((response) => {
        console.debug("Server response status:", response.status);
        console.debug("Response ok:", response.ok);
        if (!response.ok) {
          console.debug("Throwing error because response not ok");
          throw new Error(`Server responded with error: ${response.status}`);
        }
        return response.text();
      })
      .then((data) => {
        console.debug("Server data received:", data);
        console.debug("Current failed state:", failed);
        if (failed) {
          console.debug("Connection restored, hiding banner");
          hideDisconnectBanner(api);
          failed = false;
          console.debug("Failed state reset to:", failed);
        } else {
          console.debug("Connection was already good, nothing to do");
        }
      })
      .catch((error) => {
        console.debug("Server connection failed:", error.message);
        console.debug("Current failed state:", failed);
        if (!failed) {
          console.debug("First failure detected, showing banner");
          showDisconnectBanner(api);
          failed = true;
          console.debug("Failed state set to:", failed);
        } else {
          console.debug("Already in failed state, not showing banner again");
        }
      });
  };

  // Initial check
  console.debug("Running initial connection check");
  checkServerConnection();

  // Setup regular interval
  const pingIntervalTime = api.container.lookup("service:site-settings").disconnect_alert_ping_interval;
  console.debug(`Setting up ping interval: ${pingIntervalTime}ms`);
  pingInterval = setInterval(checkServerConnection, pingIntervalTime);
  console.debug("Interval set:", !!pingInterval);

  // Clean up on page unload
  window.addEventListener("beforeunload", () => {
    console.debug("Page unloading, clearing interval");
    if (pingInterval) {
      clearInterval(pingInterval);
      console.debug("Interval cleared");
    }
  });
}

export default {
  name: "disconnect-alert",
  initialize(container) {
    console.debug("==== DISCONNECT ALERT PLUGIN INITIALIZING ====");
    const siteSettings = container.lookup("service:site-settings");
    console.debug("Site settings loaded:", !!siteSettings);
    console.debug("Disconnect alert plugin enabled:", siteSettings.disconnect_alert_enabled);

    if (!siteSettings.disconnect_alert_enabled) {
      console.debug("Disconnect alert plugin disabled via settings, stopping initialization");
      return;
    }

    console.debug("Plugin enabled, continuing initialization");
    console.debug("About to call withPluginApi...");
    withPluginApi("0.8.7", (api) => {
      console.debug("Plugin API loaded:", !!api);
      console.debug("Starting ping service");
      startPing(api);
    });
    console.debug("Plugin initialized!");

    // Debug global environment
    console.debug("Checking if document is ready:", document.readyState);
    console.debug("Body exists:", !!document.body);

    // Add a console message explaining how to test
    console.log("%c Disconnect Alert Test Methods:", "font-weight: bold; font-size: 14px; color: #0078D7;");
    // console.log("%c • Press Alt+Shift+D to toggle the banner", "color: #333; font-size: 13px;");
    console.log("%c • Run window.discourseDisconnectAlert.showBanner() to show", "color: #333; font-size: 13px;");
    console.log("%c • Run window.discourseDisconnectAlert.hideBanner() to hide", "color: #333; font-size: 13px;");
    console.log("%c • Run window.discourseDisconnectAlert.toggleBanner() to toggle", "color: #333; font-size: 13px;");

    // Check that our stylesheet is loaded
    window.addEventListener('load', () => {
      console.debug("Window loaded event fired");
      console.debug("Checking for disconnect-alert styles:");

      // Test if we can create a test element and see if styles apply
      const testEl = document.createElement('div');
      testEl.id = 'disconnect-alert-banner';
      testEl.style.cssText = 'position: absolute; visibility: hidden; pointer-events: none;';
      document.body.appendChild(testEl);

      // Check computed styles
      const computedStyle = window.getComputedStyle(testEl);
      const stylesApplied = computedStyle.backgroundColor === 'rgb(228, 87, 53)'; // #e45735

      console.debug("Disconnect alert styles found and applied:", stylesApplied);
      testEl.remove();

      // Log debug testing instructions again after page load
      console.log("%c Disconnect Alert is ready for testing", "font-weight: bold; font-size: 14px; color: green;");
    });
  }
}