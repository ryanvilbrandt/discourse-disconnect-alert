# name: discourse-disconnect-alert
# about: Alerts users with a banner if the server cannot be reached
# version: 0.1
# authors: Ryan Vilbrandt

enabled_site_setting :disconnect_alert_enabled

register_asset "javascripts/disconnect-alert.js", :client

