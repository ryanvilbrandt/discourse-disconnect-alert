# Discourse Disconnect Alert

A Discourse plugin that alerts users with a prominent banner when the server becomes unreachable.

## Features

- Periodically checks server connectivity via AJAX requests
- Displays a prominent error banner when the server can't be reached
- Automatically removes the banner when connectivity is restored
- Configurable check interval and message text

## Installation

Follow the [plugin installation guide](https://meta.discourse.org/t/install-a-plugin/19157).

```
git clone https://github.com/username/discourse-disconnect-alert.git
```

## Configuration

In your Discourse admin settings:

1. Enable or disable the plugin functionality via `disconnect_alert_enabled`
2. Configure the check interval with `disconnect_alert_ping_interval` (in milliseconds)
3. Customize the error message with `disconnect_alert_message`

## Development

### Running tests

```
plugin:spec[disconnect-alert]
```

## License

MIT
