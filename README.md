# SSH Watchdog GNOME Extension

SSH Watchdog is a self-contained GNOME Shell extension for SSH session visibility.

## Features

- Modern UI: Redesigned "Apple-style" popup menu with symbolic icons and monospaced typography.
- Smart Notifications: Independent toggles for connection and disconnection alerts with intelligent IP tracking.
- Customization: Independent controls for icons, "SSH:" prefix, and refresh intervals.

Current behavior:
- Top bar indicator shows active SSH device count as `SSH: N`.
- Dropdown menu shows one line per unique remote IPv4 address.
- Refresh interval is configurable in Preferences (`1-60` seconds, default `10`).
- Appearance preference currently supports toggling the indicator icon.
- When active session count increases, GNOME sends a system notification with the newly connected IP address(es).
- Notifications are only emitted on increases in count, so steady-state polling does not spam.

## How It Works

Single component:

1. GNOME extension (`extension/extension.js`)
- Polls using user-configurable interval via GSettings.
- Uses: `who | grep -oP '\(\K[\d\.]+' | sort -u`
- Extracts IPv4 inside parentheses from `who` output.
- Tracks previous state (`lastCount` + last seen IP set).
- Sends notifications through GNOME Shell (`Main.notify`) only for newly seen IPs when the count goes up.
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
