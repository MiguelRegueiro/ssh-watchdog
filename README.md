# SSH Watchdog GNOME Extension

SSH Watchdog is a self-contained GNOME Shell extension for SSH session visibility.

Current behavior:
- Top bar indicator shows active SSH device count as `SSH: N`.
- Dropdown menu shows one line per unique remote IPv4 address.
- Refresh interval is 10 seconds.
- When active session count increases, GNOME sends a system notification with the newly connected IP address(es).
- Notifications are only emitted on increases in count, so steady-state polling does not spam.

## How It Works

Single component:

1. GNOME extension (`extension/extension.js`)
- Polls every 10s using: `who | grep -oP '\(\K[\d\.]+' | sort -u`
- Extracts IPv4 inside parentheses from `who` output.
- Tracks previous state (`lastCount` + last seen IP set).
- Sends notifications through GNOME Shell (`Main.notify`) only for newly seen IPs when the count goes up.

## Project Layout

- `extension/extension.js`: main GNOME extension logic + notification handling.
- `extension/metadata.json`: extension metadata (UUID, name, shell compatibility).
- `extension/stylesheet.css`: UI styles.
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
