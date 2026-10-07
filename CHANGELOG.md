# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned

- Subdomain whitelisting
- Optional desktop notifications after sweeps
- Sync across devices via `storage.sync`

---

## [1.2.3] - 2026-10-07

### Changed

- Added properly sized icon files (16×16, 48×48, 128×128) and pointed the
  manifest at them. Previously all sizes referenced a single oversized PNG,
  which caused the toolbar icon to render poorly or fall back to the default
  in some browsers.
- `manifest.json` version bumped to `1.2.3`.

---

## [1.2.2] - 2026-10-06

### Added

- **Firefox support.** The extension now installs in Firefox (MV3) alongside
  Brave, Chrome, and Edge. No JavaScript changes were needed - Firefox aliases
  the `chrome.*` namespace to `browser.*`, so the history, storage, alarms, and
  tabs code runs unchanged.
- `background.scripts` key in the manifest, listed alongside the existing
  `background.service_worker`. Firefox MV3 uses event pages, Chromium MV3 uses
  service workers. Both keys coexist in one manifest; each browser reads the
  one it understands.
- `browser_specific_settings.gecko` block in the manifest with a stable
  extension ID, `strict_min_version: "142.0"`, and a
  `data_collection_permissions` declaration. All three are required by recent
  Firefox versions.
- Runtime API guard at the top of `service-worker.js` that logs if any required
  `chrome.*` API is missing, so future feature additions don't silently break
  one browser.

### Changed

- Moved status messages in the options page so they appear directly below
  the input they relate to. Adding a domain now shows feedback under the
  add form; import/export feedback appears under the import/export buttons.
- Replaced remaining em dashes with hyphens in user-facing strings.
- `manifest.json` version bumped to `1.2.2`.
- README platform badge now lists Firefox; added a Firefox installation
  subsection; updated the Firefox FAQ entry.

### Notes

- No new permissions were added. The permission list remains
  `history`, `storage`, `tabs`, and `alarms`.
- Behaviour is identical across all supported browsers.

---

## [1.2.0] - 2026-10-02

### Added

- **Import sites from a `.txt` file** - one domain per line, pick a file and
  merge it into your existing list. Lines are normalized (lowercased, stripped
  of `https://`, `www.`, paths, and ports). Invalid lines and duplicates are
  skipped automatically.
- **Export sites to a `.txt` file** - download your current domain list as
  `brave-history-cleaner-sites.txt`, one domain per line, sorted.
- New **Import / Export** section on the options page with two buttons.

### Changed

- No behavioral changes to the cleanup logic - sweeps, triggers, and matching
  are identical to v1.1.0.

### Notes

- Import merges with the existing list rather than replacing it. Duplicates are
  removed. Use the "Remove" button in the options page to prune unwanted
  entries after importing.
- No new permissions were added. Both import and export are fully client-side
  and require nothing beyond the existing `storage` permission.

---

## [1.1.0] - 2026-10-01

### Added

- Automatic cleanup on tab close
- Periodic background sweep (every 1 minute via `chrome.alarms`)
- Full sweep on browser startup
- On-demand full sweep via the popup button
- Domain normalization (`https://www.Reddit.com/` → `reddit.com`)
- Subdomain matching (`reddit.com` also matches `old.reddit.com`)
- Service worker console logging for debugging

### Changed

- Complete rewrite of `background/service-worker.js`
- Switched state persistence from `chrome.storage.session` to `chrome.storage.local`
  (session storage is cleared when the MV3 service worker is terminated)
- Popup button now performs a **full** sweep instead of a session-range sweep
- `manifest.json` version bumped to `1.1.0`

### Fixed

- Extension no longer loses track of what it has cleaned when the service worker sleeps
- History entries are now reliably deleted on tab close instead of only on manual trigger

### Removed

- Deprecated `sessionStart` storage key (unused after the rewrite)

---

## [1.0.0] - 2026-09-30

### Added

- Initial release
- Manual "CLEAR HISTORY" button in the popup
- Domain list management in the options page
- History deletion for configured domains
- Attempted session tracking via `chrome.storage.session`

### Known issues

- `chrome.storage.session` gets cleared when the MV3 service worker terminates,
  so session tracking was unreliable
- No automatic cleanup - required pressing the popup button each time
- `sessionStart` was set once at install time and never reset

---

[Unreleased]: https://github.com/sharmatilak/brave-history-cleaner/compare/v1.2.3...HEAD
[1.2.3]: https://github.com/sharmatilak/brave-history-cleaner/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/sharmatilak/brave-history-cleaner/compare/v1.2.0...v1.2.2
[1.2.0]: https://github.com/sharmatilak/brave-history-cleaner/compare/v1.1.0...v1.2.0
