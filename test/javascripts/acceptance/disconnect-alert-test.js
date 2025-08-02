import { acceptance, exists } from "discourse/tests/helpers/qunit-helpers";
import { test } from "qunit";
import { settled } from "@ember/test-helpers";
import pretender from "pretender";

acceptance("Disconnect Alert", {
  settings: {
    disconnect_alert_enabled: true,
    disconnect_alert_ping_interval: 5000,
    disconnect_alert_message: "Custom test disconnect message"
  },
  beforeEach() {
    this.server = new pretender();
  },
  afterEach() {
    this.server.shutdown();
  }
});

test("Shows banner when server is unreachable", async (assert) => {
  this.server.get("/srv/status.json", () => {
    return [503, {}, { error: "Service unavailable" }];
  });

  await visit("/");
  await settled();

  assert.ok(
    exists(".banner.banner-error"),
    "displays error banner when server returns error"
  );

  assert.ok(
    document.querySelector(".banner-error").textContent.includes("Custom test disconnect message"),
    "displays the correct error message from site settings"
  );

  // Now simulate the server coming back online
  this.server.get("/srv/status.json", () => {
    return [200, { "Content-Type": "application/json" }, { status: "ok" }];
  });

  // Wait for the next ping
  await settled();

  // Manually trigger the check instead of waiting for interval
  await visit("/");
  await settled();

  assert.notOk(
    exists(".banner.banner-error"),
    "removes error banner when server becomes available"
  );
});
