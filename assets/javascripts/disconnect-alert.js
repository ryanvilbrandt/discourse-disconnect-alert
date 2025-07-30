import { withPluginApi } from "discourse/lib/plugin-api";

function showDisconnectBanner(api) {
  api.showBanner("Cannot connect to the server. Please check your internet connection.", {
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
  setInterval(() => {
    fetch("/srv/status.json", { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error();
        if (failed) {
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
  }, 10000); // Ping every 10 seconds
}

export default {
  name: "disconnect-alert",
  initialize() {
    withPluginApi("0.8.7", (api) => {
      startPing(api);
    });
  },
};

