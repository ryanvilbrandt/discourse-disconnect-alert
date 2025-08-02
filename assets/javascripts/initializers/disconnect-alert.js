import { withPluginApi } from "discourse/lib/plugin-api";

function showDisconnectBanner(api) {
  const siteSettings = api.container.lookup("service:site-settings");
  const message = siteSettings.disconnect_alert_message;

  // Create a banner element and inject it into the page
  if (!document.getElementById("disconnect-alert-banner")) {
    const banner = document.createElement("div");
    banner.id = "disconnect-alert-banner";
    banner.innerHTML = `⚠️ ${message}`;

    // Insert into the body
    document.body.appendChild(banner);
  }
}

function hideDisconnectBanner(api) {
  const banner = document.getElementById("disconnect-alert-banner");
  if (banner) {
    // Add a slide-up class for animation
    banner.classList.add("slide-up");

    // Remove the banner after animation completes
    setTimeout(() => {
      if (banner && banner.parentNode) {
        banner.remove();
      }
    }, 300);
  }
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

    // Only add the CSRF token if it exists
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
    const siteSettings = container.lookup("service:site-settings");
    console.log("Disconnect alert plugin enabled:", siteSettings.disconnect_alert_enabled);

    if (!siteSettings.disconnect_alert_enabled) {
      console.log("Disconnect alert plugin disabled via settings");
      return;
    }

    withPluginApi("0.8.7", (api) => {
      startPing(api);
    });
    console.log("Plugin initialized!");
  }
}