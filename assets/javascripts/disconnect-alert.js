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
    fetch("/srv/status.json", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
        "X-CSRF-Token": api.session.csrfToken
      },
      cache: "no-store"
    })
        .then((response) => {
          if (!response.ok) throw new Error("Server responded with error");
          return response.text();
        })
        .then((data) => {
          if (data === "ok" && failed) {
            hideDisconnectBanner(api);
            failed = false;
          }
        })
        .catch(() => {
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

    if (!siteSettings.disconnect_alert_enabled) {
      return;
    }

    withPluginApi("0.8.7", (api) => {
      startPing(api);
    });
  }
}

