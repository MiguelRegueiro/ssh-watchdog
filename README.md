# SSH Watchdog GNOME Extension

<p align="center">
  <img src="screenshots/ssh-watchdog-gnome-extension.png" width="800" alt="SSH Watchdog GNOME Extension">
</p>

SSH Watchdog is a self-contained GNOME Shell extension for SSH session visibility.

## Interface

|  |  |
|---|---|
| <sub>Idle State</sub><br><img src="screenshots/ssh-watchdog-01-idle.png" width="400" alt="Idle State"> | <sub>Session Details</sub><br><img src="screenshots/ssh-watchdog-03-active-sessions.png" width="400" alt="Session Details"> |
| <sub>Native Notifications</sub><br><img src="screenshots/ssh-watchdog-02-notification.png" width="400" alt="Native Notifications"> | <sub>Configuration</sub><br><img src="screenshots/ssh-watchdog-04-preferences.png" width="400" alt="Configuration"> |

## Features

- Modern UI: Redesigned "Apple-style" popup menu with symbolic icons and monospaced typography.
- Session Visibility: Top bar indicator can show active SSH session count as `SSH: N`, and the dropdown lists one line per unique remote IPv4 address.
- Smart Notifications: Independent toggles for connection and disconnection alerts with IP-aware state tracking to avoid polling noise.
- Customization: Independent controls for the indicator icon, `SSH:` label prefix, and polling interval (`1-60` seconds, default `10`).

## How It Works

Single component:

1. GNOME extension (`extension/extension.js`)
- Polls using user-configurable interval via GSettings.
- Uses: `who | grep -oP '\(\K[\d\.]+' | sort -u`
- Extracts IPv4 inside parentheses from `who` output.
- Tracks previous state (`lastCount` + last seen IP set).
- Sends notifications through GNOME Shell (`Main.notify`) for connection and disconnection events based on state transitions.
- Reacts live to preference changes without needing GNOME Shell restart.

## Project Layout

- `extension/extension.js`: main GNOME extension logic + notification handling.
- `extension/prefs.js`: Adwaita-based preferences window.
- `extension/schemas/org.gnome.shell.extensions.ssh-watchdog.gschema.xml`: settings schema.
- `extension/metadata.json`: extension metadata (UUID, name, shell compatibility).
- `extension/stylesheet.css`: UI styles.
- `INSTALL.md`: manual installation instructions.
- `LICENSE`: project license (MIT).
- `packaging/`: PKGBUILD/install hooks.

## Compatibility

- GNOME Shell versions declared: `45`, `46`, `47`, `48`, `49`.
- Requires `sshd` for SSH sessions and `who` command availability.
- `grep -P` is used for regex extraction.

## Known Limitations

- Current parser intentionally targets IPv4 only (`[\d\.]+`).
- IPv6-only remote hosts are not shown with the current command.
- UI state depends on `who`; if a session is not represented there, it will not appear in the extension.

## Debugging

- GNOME Shell logs:
```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

## Installation

For local/manual installation instructions, see `INSTALL.md`.

## Packaging

- PKGBUILD is in `packaging/PKGBUILD`.
- It fetches release tarballs from:
  - `https://github.com/MiguelRegueiro/ssh-watchdog`
- Schemas are compiled during packaging and in the install hook.
