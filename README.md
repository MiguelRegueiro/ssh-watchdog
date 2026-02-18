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

- **Comprehensive Session Visibility:** Features a high-visibility top-bar indicator displaying active SSH session counts (e.g., SSH: N) and a monospaced dropdown menu. This interface itemizes unique remote IPv4 addresses using symbolic iconography and a modern, layout optimized for both aesthetic appeal and rapid technical legibility.
- **Intelligent Notification System:** Provides independent toggles for connection and disconnection alerts, featuring IP-aware state tracking to minimize redundant notifications and optimize user experience.
- **Customization Options:** Provides independent toggles to enable or disable the indicator icon and the SSH: text label for a personalized top-bar footprint. Additionally, users can calibrate the background polling frequency between 1 and 60 seconds (defaulting to 10 seconds) to balance real-time responsiveness with system resource efficiency.

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
