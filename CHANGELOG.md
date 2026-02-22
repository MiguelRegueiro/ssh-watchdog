# Changelog

All notable changes to SSH Watchdog are documented in this file.

## [Unreleased]

### Added
- Optional per-session termination controls in the dropdown menu (`Enable Session Termination`, default `false`).
- Session termination safety flow:
  - explicit `End -> Confirm/Cancel` action path,
  - ownership guard (current user only),
  - termination progress state (`ending...`),
  - async `TERM` with fallback `KILL` and post-action verification.
- Session-row field toggles for `user`, `TTY`, and `remote IP` (all default `true`).
- New schema keys for session controls and session-row visibility.

### Changed
- Session model moved from unique-address rows to per-session rows (`user + tty + address`) while preserving IPv4/IPv6 filtering and normalization.
- Indicator count now reflects active sessions.
- Alert logic moved from address-based diffs to per-session diffs:
  - connection alerts trigger for new sessions even from the same IP,
  - disconnection alerts trigger for closed sessions, including manual terminations from the extension.
- Alert labels in preferences are now explicit:
  - `Connection Alerts`
  - `Disconnection Alerts`
- Preferences information architecture was reorganized for clarity:
  - `Monitoring`
  - `Alerts`
  - `Top Bar`
  - `Session List`
  - `Session Control`
- Session row presentation is more compact (`user tty ip`) with ellipsis handling for long lines.
- Session action controls now use GNOME Shell-native button styling (`button`, `default`, `flat`).
- Non-terminable sessions now show a lock state instead of exposing a failing action path.

### Docs
- README updated for:
  - per-session behavior,
  - connection/disconnection alert semantics,
  - session display toggles,
  - session-control behavior and requirements.

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
- Current published EGO release is integer version `4`.
- Ongoing development in this repository targets next release version `5`.

## License Notes

- The project license is `GPL-3.0-or-later`.
- The repository previously used MIT during earlier development; current and future releases are governed by GPL.
