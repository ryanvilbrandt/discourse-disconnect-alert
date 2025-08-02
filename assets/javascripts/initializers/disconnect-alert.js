import { withPluginApi } from "discourse/lib/plugin-api";

// DEBUG feature: expose these functions globally for testing
window.discourseDisconnectAlert = {
  showBanner: null,
  hideBanner: null,
  toggleBanner: null
};

function showDisconnectBanner(api) {
  console.log("showDisconnectBanner called");
  const siteSettings = api.container.lookup("service:site-settings");
  const message = siteSettings.disconnect_alert_message;
  console.log("Banner message:", message);

  // Create a banner element and inject it into the page
  if (!document.getElementById("disconnect-alert-banner")) {
    console.log("Creating new banner element");
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
    console.log("Banner element created:", banner);

    // Insert into the body
    document.body.appendChild(banner);
    console.log("Banner appended to body, element now in DOM:", !!document.getElementById("disconnect-alert-banner"));

    // Add click handler to the close button
    document.getElementById("disconnect-alert-close")?.addEventListener("click", (e) => {
      e.preventDefault();
      hideDisconnectBanner(api);
    });

    // Debug CSS - check if styles are applied
    console.log("Banner computed styles:", window.getComputedStyle(banner));

    // Verify the stylesheet is loaded
    const stylesheetLoaded = Array.from(document.styleSheets).some(sheet => {
      try {
        return sheet.cssRules && Array.from(sheet.cssRules).some(rule =>
          rule.selectorText && rule.selectorText.includes("disconnect-alert-banner"));
      } catch (e) {
        // Cross-origin stylesheet
        return false;
      }
    });
    console.log("Disconnect alert stylesheet loaded:", stylesheetLoaded);

    // Force some inline styles to make it visible regardless
    banner.style.cssText = `
      background-color: red !important;
      color: white !important;
      padding: 15px !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 99999 !important;
      font-size: 18px !important;
      text-align: center !important;
      font-weight: bold !important;
    `;
    console.log("Applied fallback inline styles");
  } else {
    console.log("Banner already exists, not creating a new one");
  }
}

function hideDisconnectBanner(api) {
  console.log("hideDisconnectBanner called");
  const banner = document.getElementById("disconnect-alert-banner");
  if (banner) {
    console.log("Found banner to hide");
    // Add a slide-up class for animation
    banner.classList.add("slide-up");
    console.log("Added slide-up class");

    // Remove the banner after animation completes
    setTimeout(() => {
      if (banner && banner.parentNode) {
        console.log("Removing banner from DOM");
        banner.remove();
        console.log("Banner removed, still in DOM?", !!document.getElementById("disconnect-alert-banner"));
      } else {
        console.log("Banner or parent no longer exists");
      }
    }, 300);
  } else {
    console.log("No banner found to hide");
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
  console.log("startPing called with api:", !!api);
  let failed = false;
  let pingInterval;

  // Set up global test functions
  window.discourseDisconnectAlert.showBanner = () => showDisconnectBanner(api);
  window.discourseDisconnectAlert.hideBanner = () => hideDisconnectBanner(api);
  window.discourseDisconnectAlert.toggleBanner = () => toggleDisconnectBanner(api);

  // Add a keyboard shortcut for testing (Alt+Shift+D)
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.key === 'D') {
      console.log("DEBUG: Manual banner toggle triggered");
      const isShowing = toggleDisconnectBanner(api);
      console.log(`DEBUG: Banner is now ${isShowing ? 'visible' : 'hidden'}`);
    }
  });

  const checkServerConnection = () => {
    console.log("Checking server connection...");

    // Get CSRF token from meta tag
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
    console.log("CSRF token found:", !!csrfToken);

    const headers = {
      "Accept": "application/json",
      "cache": "no-store"
    };

    // Only add the CSRF token if it exists
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }

    console.log("Request headers:", headers);
    console.log("Current connection state - failed:", failed);

    fetch("/srv/status.json", {
      method: "GET",
      credentials: "same-origin",
      headers: headers,
      cache: "no-store"
    })
      .then((response) => {
        console.log("Server response status:", response.status);
        console.log("Response ok:", response.ok);
        if (!response.ok) {
          console.log("Throwing error because response not ok");
          throw new Error(`Server responded with error: ${response.status}`);
        }
        return response.text();
      })
      .then((data) => {
        console.log("Server data received:", data);
        console.log("Current failed state:", failed);
        if (failed) {
          console.log("Connection restored, hiding banner");
          hideDisconnectBanner(api);
          failed = false;
          console.log("Failed state reset to:", failed);
        } else {
          console.log("Connection was already good, nothing to do");
        }
      })
      .catch((error) => {
        console.log("Server connection failed:", error.message);
        console.log("Current failed state:", failed);
        if (!failed) {
          console.log("First failure detected, showing banner");
          showDisconnectBanner(api);
          failed = true;
          console.log("Failed state set to:", failed);
        } else {
          console.log("Already in failed state, not showing banner again");
        }
      });
  };

  // Initial check
  console.log("Running initial connection check");
  checkServerConnection();

  // Setup regular interval
  const pingIntervalTime = api.container.lookup("service:site-settings").disconnect_alert_ping_interval;
  console.log(`Setting up ping interval: ${pingIntervalTime}ms`);
  pingInterval = setInterval(checkServerConnection, pingIntervalTime);
  console.log("Interval set:", !!pingInterval);

  // Clean up on page unload
  window.addEventListener("beforeunload", () => {
    console.log("Page unloading, clearing interval");
    if (pingInterval) {
      clearInterval(pingInterval);
      console.log("Interval cleared");
    }
  });
}

export default {
  name: "disconnect-alert",
  initialize(container) {
    console.log("==== DISCONNECT ALERT PLUGIN INITIALIZING ====");
    const siteSettings = container.lookup("service:site-settings");
    console.log("Site settings loaded:", !!siteSettings);
    console.log("Disconnect alert plugin enabled:", siteSettings.disconnect_alert_enabled);

    if (!siteSettings.disconnect_alert_enabled) {
      console.log("Disconnect alert plugin disabled via settings, stopping initialization");
      return;
    }

    console.log("Plugin enabled, continuing initialization");
    console.log("About to call withPluginApi...");
    withPluginApi("0.8.7", (api) => {
      console.log("Plugin API loaded:", !!api);
      console.log("Starting ping service");
      startPing(api);
    });
    console.log("Plugin initialized!");

    // Debug global environment
    console.log("Checking if document is ready:", document.readyState);
    console.log("Body exists:", !!document.body);

    // Add a console message explaining how to test
    console.log("%c Disconnect Alert Test Methods:", "font-weight: bold; font-size: 14px; color: #0078D7;");
    console.log("%c • Press Alt+Shift+D to toggle the banner", "color: #333; font-size: 13px;");
    console.log("%c • Run window.discourseDisconnectAlert.showBanner() to show", "color: #333; font-size: 13px;");
    console.log("%c • Run window.discourseDisconnectAlert.hideBanner() to hide", "color: #333; font-size: 13px;");
    console.log("%c • Run window.discourseDisconnectAlert.toggleBanner() to toggle", "color: #333; font-size: 13px;");

    // Check that our stylesheet is loaded
    window.addEventListener('load', () => {
      console.log("Window loaded event fired");
      console.log("Checking for disconnect-alert styles:");
      let stylesFound = false;

      for (let i = 0; i < document.styleSheets.length; i++) {
        try {
          const sheet = document.styleSheets[i];
          console.log(`Stylesheet ${i}:`, sheet.href);

          if (sheet.href && sheet.href.includes('disconnect-alert')) {
            console.log("Found disconnect-alert stylesheet!");
            stylesFound = true;
          }
        } catch (e) {
          console.log(`Cannot read stylesheet ${i} due to CORS`);
        }
      }

      console.log("Disconnect alert styles found:", stylesFound);

      // Log debug testing instructions again after page load
      console.log("%c Disconnect Alert is ready for testing", "font-weight: bold; font-size: 14px; color: green;");
    });
  }
}