console.log("disconnect-alert.js file is being executed");

import { withPluginApi } from "discourse/lib/plugin-api";

function showDisconnectBanner(api) {
  const siteSettings = api.container.lookup("service:site-settings");
  const message = siteSettings.disconnect_alert_message;

  api.showBanner(message, {
    id: "disconnect-alert",
    type: "error",
    dismissable: false
  });
}

function hideDisconnectBanner(api) {
  api.hideBanner("disconnect-alert");
}

function startPing(api) {
  let failed = false;
  let pingInterval;

  const checkServerConnection = () => {
    console.log("Checking server connection...");

    // Get CSRF token from meta tag
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");

    const headers = {
      "Accept": "application/json",
      "cache": "no-store"
    };

    // Only add CSRF token if it exists
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }

    fetch("/srv/status.json", {
      method: "GET",
      credentials: "same-origin",
      headers: headers,
      cache: "no-store"
    })
        .then((response) => {
          console.log("Server response:", response.status);
          if (!response.ok) throw new Error("Server responded with error");
          return response.text();
        })
        .then((data) => {
          console.log("Server data:", data);
          if (data === "ok" && failed) {
            hideDisconnectBanner(api);
            failed = false;
          }
        })
        .catch((error) => {
          console.log("Server connection failed:", error);
          if (!failed) {
            showDisconnectBanner(api);
            failed = true;
          }
        });
  };

  // Initial check
  checkServerConnection();

  // Setup regular interval
  const pingIntervalTime = api.container.lookup("service:site-settings").disconnect_alert_ping_interval;
  console.log(`Setting up ping interval: ${pingIntervalTime}ms`);
  pingInterval = setInterval(checkServerConnection, pingIntervalTime);

  // Clean up on page unload
  window.addEventListener("beforeunload", () => {
    if (pingInterval) {
      clearInterval(pingInterval);
    }
  });
}

export default {
  name: "disconnect-alert",
  initialize(container) {
    console.log("Plugin initialize() called!");
    const siteSettings = container.lookup("service:site-settings");
    console.log("Site settings:", siteSettings);
    console.log("Plugin enabled:", siteSettings.disconnect_alert_enabled);

    if (!siteSettings.disconnect_alert_enabled) {
      console.log("Plugin disabled via settings");
      return;
    }

    console.log("About to call withPluginApi...");
    withPluginApi("0.8.7", (api) => {
      console.log("Inside withPluginApi callback, starting ping...");
      startPing(api);
    });
    console.log("Plugin initialized!");
  }
}
