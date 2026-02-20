<h1 align="center"><img src="assets/images/ssh-watchdog-logo-256.png" width="42" alt="SSH Watchdog logo" align="absmiddle" />&nbsp;SSH Watchdog</h1>

<p align="center">
  Shows active SSH sessions in the GNOME top bar.
</p>

<p align="center">
  <a href="https://extensions.gnome.org/extension/9343/ssh-watchdog/">
    <img alt="Install on GNOME Extensions" src="https://img.shields.io/badge/Install-GNOME%20Extensions-4A86CF?style=for-the-badge">
  </a>
  <br />
  <a href="https://extensions.gnome.org/extension/9343/ssh-watchdog/">Direct link</a>
</p>

## Install

- Recommended: install from GNOME Extensions (EGO) using Extension Manager:
  `https://extensions.gnome.org/extension/9343/ssh-watchdog/`
- Updates and removal are handled directly in Extension Manager.

## Features

- Top-bar indicator with live SSH session count.
- Dropdown menu listing unique active client IPv4 and IPv6 addresses.
- Optional notifications for newly seen remote addresses and closed address sessions.
- Configurable refresh interval (`1` to `60` seconds).
- Appearance toggles for icon and `SSH:` label prefix.
- Menu refresh when opened, in addition to interval polling.

## Screenshots

| **Idle State** | **Session Details** |
|---|---|
| <img src="screenshots/ssh-watchdog-01-idle.png" width="400" alt="Idle State"> | <img src="screenshots/ssh-watchdog-03-active-sessions.png" width="400" alt="Session Details"> |

| **Connection Notification** | **Preferences** |
|---|---|
| <img src="screenshots/ssh-watchdog-02-notification.png" width="400" alt="Connection Notification"> | <img src="screenshots/ssh-watchdog-04-preferences.png" width="400" alt="Preferences"> |

## Compatibility

- GNOME Shell `45` through `50`.
- Uses local `who` output as the SSH session data source.

## Runtime Requirements

- `who` available in `PATH`
- Active SSH logins represented in `who` output

## Preferences (Defaults)

- Refresh interval: `10` seconds (range `1-60`).
- Show icon: `true`.
- Show SSH prefix: `true`.
- Show notifications: `true`.
- Show disconnection alerts: `true`.

## Privacy and Data Handling

- No telemetry.
- No outbound network calls.
- Session information is derived locally from the system `who` command output.

## Known Limitations

- If a session is not reported by `who`, it will not appear in the extension.
- Entries where `who` reports only hostnames (not IP addresses) are ignored.
- Connect/disconnect notifications start after the first polling baseline is established.
- Disconnection alerts are address-based: closing one of multiple sessions from the same address may not trigger an alert.
- Notifications are delivered through GNOME Shell's system notification source.

## Support

- Report issues: `https://github.com/MiguelRegueiro/ssh-watchdog/issues`
- For diagnostics, collect GNOME Shell logs with:

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

## Release Documentation

- Changelog: `CHANGELOG.md`
- Release process: `RELEASE.md`

## Project Layout

- `extension/extension.js`: main extension runtime and notification logic.
- `extension/prefs.js`: Adwaita preferences UI.
- `extension/schemas/org.gnome.shell.extensions.ssh-watchdog.gschema.xml`: GSettings schema.
- `extension/metadata.json`: extension metadata (UUID, shell compatibility, version).
- `extension/stylesheet.css`: extension styles.
- `LICENSE`: project license (`GPL-3.0-or-later`).

## License

This project is licensed under `GPL-3.0-or-later`. See `LICENSE`.
