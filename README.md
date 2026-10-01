# 🧹 Brave History Cleaner

> **Surgically auto-delete browsing history for specific domains — without touching cookies, cache, or anything else.**

[![Manifest V3](https://img.shields.io/badge/manifest-v3-blue)](https://developer.chrome.com/docs/extensions/mv3/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Brave%20%7C%20Chrome%20%7C%20Edge-orange)]()
[![No Telemetry](https://img.shields.io/badge/telemetry-none-success)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)]()

A Manifest V3 browser extension that automatically removes browsing history for a user-defined list of websites, without touching cookies, cache, passwords, bookmarks, or downloads.

---

## Table of Contents

1. [Why?](#why)
2. [Features](#features)
3. [Screenshots](#screenshots)
4. [Installation](#installation)
5. [Usage](#usage)
6. [How It Works](#how-it-works)
7. [File Structure](#file-structure)
8. [Architecture](#architecture)
9. [Permissions Explained](#permissions-explained)
10. [Storage Schema](#storage-schema)
11. [Behavior Matrix](#behavior-matrix)
12. [Configuration & Tuning](#configuration--tuning)
13. [Troubleshooting](#troubleshooting)
14. [Development Notes](#development-notes)
15. [Limitations](#limitations)
16. [FAQ](#faq)
17. [Changelog](#changelog)
18. [Contributing](#contributing)
19. [License](#license)

---

## Why?

Every existing "history cleaner" tool does one of two things:

1. Wipes **everything** on a schedule — heavy-handed, and you lose history you wanted to keep.
2. Relies on **incognito mode** for specific sites — clunky, and it changes how the site behaves.

What I wanted was something in between: **"Keep my history, except for these specific sites, forever, automatically."**

That's what this extension does. It's surgical. It's automatic. It runs in the background. You configure it once and forget about it.

Everything else about your browser stays untouched — cookies, cache, passwords, bookmarks, downloads, other sites' history. Only the sites you name disappear.

---

## Features

- ✅ **Automatic cleanup** — runs on tab close, on a timer, and on browser startup
- ✅ **On-demand full sweep** — one click in the popup nukes all configured-site history
- ✅ **Surgical deletion** — only history entries, nothing else
- ✅ **Subdomain matching** — `reddit.com` also matches `www.reddit.com`, `old.reddit.com`, etc.
- ✅ **Domain normalization** — input like `https://www.Reddit.com/` is stored as `reddit.com`
- ✅ **Dark UI** — popup and options pages styled for readability
- ✅ **No telemetry, no network calls** — everything runs locally
- ✅ **MV3-safe** — uses `chrome.storage.local` and `chrome.alarms`, not the unreliable `chrome.storage.session` or `onSuspend`
- ✅ **Zero dependencies** — pure JavaScript, no build step, no bundler

---

## Screenshots

> Add screenshots here once you have them. Suggested layout:
>
> | Popup | Options page |
> |---|---|
> | `![Popup](docs/popup.png)` | `![Options](docs/options.png)` |

---

## Installation

### From source (developer mode)

1. Download or clone this repository to a folder on your computer.
2. Open your browser and go to:
   - Brave: `brave://extensions`
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json`.
6. The extension icon should appear in your toolbar.

### Updating after code changes

After editing any file:

1. Go to `brave://extensions`.
2. Click the **reload arrow** (⟳) on the extension card.
3. If you edited `service-worker.js`, click the **service worker** link on the card to inspect its console.

> ⚠️ **Critical:** Manifest V3 caches the service worker aggressively. If you don't reload the extension after editing, the old code keeps running — this is the #1 cause of "my changes don't work."

---

## Usage

### Adding websites to clean

1. Click the extension icon → **Manage websites**.
2. Type a domain (e.g. `reddit.com`) and click **Add website**.
3. Domains are normalized automatically:
   - `https://www.Reddit.com/r/all` → `reddit.com`
   - `REDDIT.COM:443` → `reddit.com`
4. Repeat for each site you want cleaned.

### Removing websites

- In the options page, click **Remove** next to any domain.

### Manual full sweep

- Click the extension icon → **CLEAR ALL HISTORY**.
- This deletes **every** history entry for **all** configured sites, all time.

### Automatic cleanup

Once sites are configured, cleanup happens automatically:

| Event | Action |
|---|---|
| A tab closes | Incremental sweep (new entries since last sweep) |
| Every 1 minute | Incremental sweep |
| Browser starts | **Full sweep** (everything for configured sites) |
| Service worker wakes | Incremental sweep |

You do not need to press anything for these — they happen in the background.

---

## How It Works

### Overview

The extension has three components:

1. **Service worker** (`background/service-worker.js`) — the brain. Listens for events and performs history deletion.
2. **Popup** (`popup/`) — quick UI to see configured count and trigger a full sweep.
3. **Options page** (`options/`) — full UI to manage the domain list.

### The sweep algorithm

At its core, every cleanup is the same operation:

```
1. Read the configured sites from chrome.storage.local.
2. Ask chrome.history for all entries in a time range.
3. For each entry, check if its hostname matches any configured site.
4. If yes, call chrome.history.deleteUrl on it.
5. Advance the "lastCleanup" bookmark to now.
```

The only difference between an **incremental** and **full** sweep is the time range:

- **Incremental** → `startTime = lastCleanup` (only new entries)
- **Full** → `startTime = 0` (everything, all time)

### Incremental vs. full

| Aspect | Incremental | Full |
|---|---|---|
| Range | Since `lastCleanup` | Since epoch (all time) |
| Cost | Small (few entries) | Larger (scans everything) |
| Triggered by | Tab close, alarm, worker wake | Browser startup, popup button |
| Purpose | Fast routine cleanup | Catch-all / on-demand nuke |

### Domain matching

Matching is hostname-based and prefix-safe:

```js
function matchesDomain(url, domain) {
  const hostname = new URL(url).hostname.toLowerCase();
  const target = normalizeDomain(domain);
  return hostname === target || hostname.endsWith("." + target);
}
```

Examples with `reddit.com` configured:

| URL | Matches? |
|---|---|
| `https://reddit.com/` | ✅ |
| `https://www.reddit.com/r/all` | ✅ |
| `https://old.reddit.com/` | ✅ |
| `https://notreddit.com/` | ❌ |
| `https://reddit.com.evil.com/` | ❌ (hostname ends with `.evil.com`) |

Note: the `endsWith("." + target)` check prevents false positives like `notreddit.com`.

### The `lastCleanup` bookmark

`lastCleanup` is a Unix epoch (ms) stored in `chrome.storage.local`. It marks the boundary between "already swept" and "not yet swept."

- Incremental sweeps read it as `startTime`, then write `Date.now()` back.
- Full sweeps ignore it as `startTime` (use `0`) but still write `Date.now()` back, so the next incremental sweep doesn't redo work.

This is why the extension never re-scans the whole history on every tab close.

---

## File Structure

```
brave-history-cleaner/
├── manifest.json                 # Extension metadata & permissions
├── background/
│   └── service-worker.js         # All cleanup logic, event listeners
├── options/
│   ├── options.html              # Domain management page
│   ├── options.css               # Dark theme styling
│   └── options.js                # Add/remove domains, persistence
└── popup/
    ├── popup.html                # Popup UI
    ├── popup.css                 # Popup styling
    └── popup.js                  # Popup logic (status, clear button)
```

---

## Architecture

### Event flow

```
┌──────────────────────┐
│  Browser / System    │
└──────────┬───────────┘
           │
           ├──► tabs.onRemoved          ─┐
           ├──► alarms.onAlarm (1 min)  ─┤
           ├──► runtime.onStartup       ─┼──► service-worker.js
           ├──► runtime.onInstalled     ─┤      │
           └──► runtime.onMessage       ─┘      │
                                                 ▼
                                    ┌────────────────────────┐
                                    │ clearConfiguredHistory │
                                    │  (since = range)       │
                                    └────────────┬───────────┘
                                                 │
                          ┌──────────────────────┼──────────────────────┐
                          ▼                      ▼                      ▼
                 chrome.storage.local    chrome.history.search   chrome.history.deleteUrl
```

### Message protocol

The popup talks to the service worker via `chrome.runtime.sendMessage`:

**Request:**
```js
{ action: "clearHistory" }
```

**Response:**
```js
{ deleted: 17, message: "Removed 17 history entries." }
```

**Error response:**
```js
{ deleted: 0, message: "Error: <reason>" }
```

---

## Permissions Explained

| Permission | Why it's needed |
|---|---|
| `history` | Read and delete history entries (`search`, `deleteUrl`) |
| `storage` | Persist the domain list and `lastCleanup` bookmark |
| `tabs` | Detect tab closes (`tabs.onRemoved`) to trigger incremental sweeps |
| `alarms` | Schedule the 1-minute background sweep |

The extension does **not** request:

- `cookies` — we never touch cookies
- `browsingData` — we use targeted `deleteUrl`, not bulk clearing
- `<all_urls>` host permissions — we don't inject scripts into pages

---

## Storage Schema

All state lives in `chrome.storage.local` under two keys:

```js
{
  sites: ["reddit.com", "youtube.com"],  // Array<string>, sorted alphabetically
  lastCleanup: 1790846325863              // number, Unix epoch (ms)
}
```

| Key | Type | Description |
|---|---|---|
| `sites` | `string[]` | Normalized domains to clean |
| `lastCleanup` | `number` | Timestamp of the last sweep |

> The old `sessionStart` key from v1.0.0 is no longer used and can be safely ignored (or deleted).

---

## Behavior Matrix

| Trigger | Sweep type | What it deletes | When it runs |
|---|---|---|---|
| Worker wake | Incremental | New entries since `lastCleanup` | Every time the service worker spins up |
| `runtime.onStartup` | **Full** | Everything for configured sites | Browser process starts |
| `alarms.onAlarm` | Incremental | New entries since `lastCleanup` | Every 1 minute |
| `tabs.onRemoved` | Incremental | New entries since `lastCleanup` | Any tab closes |
| `runtime.onMessage` (`clearHistory`) | **Full** | Everything for configured sites | Popup button click |
| `runtime.onInstalled` | None (seeds state) | — | Extension install/update |

### Why this split?

- **Tab close** and **periodic** run often, so they must be cheap → incremental.
- **Browser startup** is the closest thing to a "browser closed" hook we can reliably detect, so it does the heavy full sweep. This gives the user the perception that "closing the browser cleaned everything."
- **Popup button** is explicit user intent → do the maximum.

---

## Configuration & Tuning

### Change the periodic sweep frequency

In `background/service-worker.js`, find `ensureAlarm()`:

```js
chrome.alarms.create("cleanup", { periodInMinutes: 1 });
```

Change `1` to any positive number (min is `0.5` in Chrome/Brave; `1` is the documented floor).

**Trade-off:** lower = more responsive, higher = less CPU.

### Change the sweep trigger set

Want a full sweep on every tab close? Replace `runIncrementalCleanup("tab-closed")` with `runFullCleanup("tab-closed")`. Not recommended — it's expensive.

### Add a whitelist (never clean these paths)

Not implemented. If you need it, the place to add it is inside `clearConfiguredHistory` before the `deleteUrl` call.

---

## Troubleshooting

### "It's not deleting anything"

1. **Reload the extension.** Go to `brave://extensions` → click ⟳ on the extension card.
2. Open the service worker console: click **service worker** on the extension card.
3. Look for red errors. Common ones:
   - `chrome.alarms is undefined` → you forgot `"alarms"` in `manifest.json` or didn't reload.
   - `chrome.storage.session is not available` → you're running old v1.0.0 code.
4. Run this in the service worker console to verify basics:

   ```js
   chrome.storage.local.get().then(console.log)
   ```

   You should see `sites` and `lastCleanup` — **not** `sessionStart`.

### "It deletes some sites but not others"

Check the domain format in storage:

```js
chrome.storage.local.get().then(console.log)
```

Domains must be bare (`reddit.com`), not `https://reddit.com` or `www.reddit.com`. If you see bad entries, clear them and re-add via the options page.

### "The popup button says Removed 0"

Either:

- You have no history for the configured sites (expected — nothing to delete).
- Your domain list is empty or malformed (check options page).
- You haven't reloaded the extension since editing.

### "Console shows `Promise {<pending>}`"

That's not an error. `chrome.storage.local.get()` returns a Promise. Use:

```js
chrome.storage.local.get().then(console.log)
```

or:

```js
console.log(await chrome.storage.local.get())
```

### "Nothing happens when I close a tab"

- The service worker might be asleep. It will wake on the `onRemoved` event, but only if it was registered before the worker was killed — it is, because it's at the top level of the script.
- Check the worker console for `[History Cleaner] tab-closed (incremental): ...`.

### "The extension is using too much CPU"

Lower the alarm frequency or disable the periodic sweep:

```js
// chrome.alarms.create("cleanup", { periodInMinutes: 1 });
```

---

## Development Notes

### Why `chrome.storage.local` instead of `chrome.storage.session`?

`chrome.storage.session` sounds right for transient data, but in MV3 it is **cleared when the service worker is terminated** (after ~30 seconds of idle). This makes it useless for tracking anything across events. We use `chrome.storage.local` and a timestamp.

### Why not `chrome.runtime.onSuspend` for browser close?

`onSuspend` exists but is **not guaranteed to fire**, and when it does, you have only a few hundred milliseconds before the worker is killed. Deleting history entries requires multiple async `chrome.history.deleteUrl` calls, which would often be cut off. The startup-sweep pattern is the standard, reliable workaround.

### Why not `chrome.browsingData.remove`?

It can't filter by domain. It either wipes everything or nothing. Targeted `chrome.history.deleteUrl` is the only way to remove specific URLs.

### Why not batch deletion with `chrome.history.deleteRange`?

`deleteRange` deletes **all** history inside a time window — it has no URL filter. It is not usable for per-domain deletion.

---

## Limitations

- **No reliable "browser closing" event** in MV3. Cleanup happens on next startup instead. This is a platform limitation, not a bug.
- **Startup sweep needs a startup event.** If the browser is launched and killed before `runtime.onStartup` fires, that session's history survives until the next full sweep.
- **Matching is hostname-only.** URL paths are not considered. If you want `reddit.com/r/foo` cleaned but not `reddit.com/r/bar`, this extension can't do it.
- **No import/export of the domain list.** You'd need to manually copy from `chrome.storage.local` via the service worker console.
- **No sync across devices.** Uses `storage.local`, not `storage.sync`.

---

## FAQ

**Q: Does this delete cookies, cache, or localStorage?**

No. Only history entries matching the configured domains are removed. Cookies, cache, site data, passwords, bookmarks, and downloads are untouched.

**Q: Does this work in Chrome/Edge, not just Brave?**

Yes. It's a standard MV3 extension. Tested primarily on Brave, but Chrome, Edge, and other Chromium browsers should work identically.

**Q: Does it work in Firefox?**

Not out of the box. Firefox supports MV3 with some differences (`browser.*` namespace, and a different `background` manifest key). Would need minor porting.

**Q: Does it delete history while I'm browsing, or only after?**

Both. Tab close triggers an immediate incremental sweep; the alarm catches anything that slips through every minute; startup does the full reset.

**Q: Can it clean subdomains of a site?**

Yes, automatically. Configuring `reddit.com` cleans `www.reddit.com`, `old.reddit.com`, `np.reddit.com`, etc.

**Q: Can I whitelist a subdomain?**

Not currently. Everything under the configured root is cleaned.

**Q: Does it slow down my browser?**

No. Incremental sweeps are milliseconds; the full sweep on startup runs once and takes a few hundred ms for a typical history size.

**Q: Is my data sent anywhere?**

No. Zero network calls. Everything is local to `chrome.storage.local` and the browser's history API.

**Q: How do I uninstall it?**

`brave://extensions` → your extension → **Remove**. Your history already deleted stays deleted; your configured site list is discarded.

---

## Changelog

### v1.1.0 (current)

- Complete rewrite of the service worker
- Added automatic cleanup (tab close, periodic alarm, browser startup)
- Switched from `chrome.storage.session` to `chrome.storage.local` for reliability
- Added `alarms` permission
- Incremental vs. full sweep distinction
- Popup button now performs a full sweep
- Added console logging for debugging

### v1.0.0

- Initial release: manual clear only, unreliable session tracking

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

[MIT](LICENSE) — do whatever you want.

---

## Credits

Built as a personal project. Uses only native browser APIs, no third-party libraries.

---

## If you find this useful

Give it a ⭐ — it helps other people find it.
