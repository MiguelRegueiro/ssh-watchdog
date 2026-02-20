# Changelog

All notable changes to SSH Watchdog are documented in this file.

## [4] - 2026-02-20

### Added
- IPv6 session detection in addition to IPv4.
- Support for modern remote-address formats from `who` output, including bracketed and zone-suffixed IPv6 normalization.
- Branding assets structure under `assets/images/`.

### Changed
- Replaced shell pipeline parsing (`bash`, `grep -P`, `sort`) with direct `who` subprocess execution and JavaScript parsing.
- Notification delivery moved to GNOME Shell system notifications (`Main.notify`) for better stability across sessions (notifications now appear under `System`).
- Empty-state menu icon changed to `network-idle-symbolic` for a neutral cross-theme appearance.
- Repository and metadata versioning now follows EGO integer release versions.
- Project license is now `GPL-3.0-or-later` (previously MIT in earlier development stages).

### Fixed
- Resolved notification lifecycle issues that produced disposed `MessageTray.Source` errors in GNOME Shell logs.
- Improved refresh and update behavior consistency when opening the extension menu.

### Docs
- Updated README to match runtime behavior, including IPv4/IPv6 coverage, notification behavior, and known limitations.
- Documented release workflow and versioning policy.

## [3] - 2026-02-18 (`1.0.3` in legacy naming)

### Review Compliance Fixes
- Removed `schemas/gschemas.compiled` from the extension package (GNOME 45+).
- Switched to `this.getSettings()` without schema parameters (schema is defined in `metadata.json`).
- Removed legacy `init()` pattern cleanup.
- Replaced manual signal ID tracking with `connectObject()` / `disconnectObject()`.
- Replaced synchronous spawn with async `Gio.Subprocess` flow.
- Moved SSH command constant into the `SSHWatchdogIndicator` class.

### Reliability Improvements
- Added async refresh guards to prevent overlapping command executions.
- Improved lifecycle cleanup during `disable()` / `destroy()`.
- Improved notification source cleanup behavior to avoid buildup.

## [2] - 2026-02-17

### Changed
- Cosmetic and UI presentation adjustments.

### Notes
- This iteration was not accepted on EGO and was superseded by v3 review-compliance fixes.

## [1] - 2026-02-17 (Initial Public Release)

### Highlights
- Initial public release of SSH Watchdog for GNOME Shell.
- Top-bar indicator and menu designed for clarity.
- Per-session visibility from active SSH logins.
- Native connect/disconnect notifications.
- Straightforward preferences for quick configuration.
- Packaging and metadata prepared for public distribution.

## Versioning Notes

- EGO updates require a strictly increasing integer in `extension/metadata.json` (`version` field).
- Legacy GitHub release names used semantic version labels (`1.0.x`) during early development.
- Historical release `1.0.3` corresponds to EGO version `3`.
- Current release line uses EGO integer versioning (current: `4`).

## License Notes

- The project license is `GPL-3.0-or-later`.
- The repository previously used MIT during earlier development; current and future releases are governed by GPL.
