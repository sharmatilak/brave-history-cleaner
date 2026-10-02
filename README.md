# 🧹 Brave History Cleaner

> Auto-delete browsing history for specific domains without touching cookies, cache, or anything else.

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
3. [Installation](#installation)
4. [Usage](#usage)
5. [How It Works](#how-it-works)
6. [Permissions Explained](#permissions-explained)
7. [Configuration & Tuning](#configuration--tuning)
8. [Troubleshooting](#troubleshooting)
9. [Limitations](#limitations)
10. [FAQ](#faq)
11. [Contributing](#contributing)
12. [Credits](#credits)
13. [License](#license)

---

## Why?

Most "history cleaner" tools do one of two things:

1. Wipe **everything** on a schedule. Heavy-handed, and you lose history you actually wanted.
2. Rely on **incognito mode** for specific sites. Clunky, and it changes how the site behaves.

I wanted something in between. Keep my history, except for these specific sites, automatically, forever.

That's what this extension tries to do. It's small. It runs in the background. You configure it once and forget about it.

Everything else about your browser stays untouched: cookies, cache, passwords, bookmarks, downloads, and other sites' history. Only the domains you name disappear.

---

## Features

- ✅ **Automatic cleanup** - runs on tab close, on a timer, and on browser startup
- ✅ **On-demand full sweep** - one click in the popup clears all configured-site history
- ✅ **Surgical deletion** - only history entries, nothing else
- ✅ **Subdomain matching** - `reddit.com` also matches `www.reddit.com`, `old.reddit.com`, etc.
- ✅ **Domain normalization** - input like `https://www.Reddit.com/` is stored as `reddit.com`
- ✅ **Import / export** - save your domain list to a `.txt` file or load one from disk
- ✅ **Dark UI** - popup and options pages styled for readability
- ✅ **No telemetry, no network calls** - everything runs locally
- ✅ **MV3-safe** - uses `chrome.storage.local` and `chrome.alarms`, not the unreliable `chrome.storage.session` or `onSuspend`
- ✅ **Zero dependencies** - plain JavaScript, no build step, no bundler

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

> ⚠️ **Heads up:** Manifest V3 caches the service worker aggressively. If you don't reload the extension after editing, the old code keeps running. This is the #1 reason changes seem to "not work."

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

### Import / export

Your configured site list can be saved to and loaded from a plain `.txt` file.

**Export**

1. Open the options page, scroll to **Import / Export**.
2. Click **Export as .txt**.
3. A file named `brave-history-cleaner-sites.txt` downloads, one domain per line, sorted alphabetically.

**Import**

1. Open the options page, scroll to **Import / Export**.
2. Click **Import from .txt** and pick a file.
3. Lines are normalized automatically:
   - `https://WWW.Reddit.com/r/all` → `reddit.com`
   - `REDDIT.COM:443` → `reddit.com`
4. Duplicates against your existing list are skipped.
5. Blank lines and lines without a `.` are ignored.

**Behavior**

- Import **merges** with your existing list. It does not replace it.
- Both operations are fully client-side. No network calls.
- No new permissions are required.

### Automatic cleanup

Once sites are configured, cleanup happens automatically:

| Event | Action |
|---|---|
| A tab closes | Incremental sweep (new entries since last sweep) |
| Every 1 minute | Incremental sweep |
| Browser starts | **Full sweep** (everything for configured sites) |
| Service worker wakes | Incremental sweep |

You don't need to press anything for these. They happen in the background.

---

## How It Works

The extension has three components:

1. **Service worker** (`background/service-worker.js`) - listens for events and performs history deletion.
2. **Popup** (`popup/`) - quick UI to see the configured count and trigger a full sweep.
3. **Options page** (`options/`) - full UI to manage the domain list.

Every cleanup runs the same operation:

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

| Trigger | Sweep type | What it deletes | When it runs |
|---|---|---|---|
| Worker wake | Incremental | New entries since `lastCleanup` | Every time the service worker spins up |
| Browser start | **Full** | Everything for configured sites | Browser process starts |
| Every 1 minute | Incremental | New entries since `lastCleanup` | Background alarm |
| Any tab closes | Incremental | New entries since `lastCleanup` | Immediately |
| Popup button | **Full** | Everything for configured sites | On click |

### Domain matching

Matching is hostname-based and prefix-safe:

```js
function matchesDomain(url, domain) {
  const hostname = new URL(url).hostname.toLowerCase();
  const target = normalizeDomain(domain);
  return hostname === target || hostname.endsWith("." + target);
}
```

With `reddit.com` configured:

| URL | Matches? |
|---|---|
| `https://reddit.com/` | ✅ |
| `https://www.reddit.com/r/all` | ✅ |
| `https://old.reddit.com/` | ✅ |
| `https://notreddit.com/` | ❌ |
| `https://reddit.com.evil.com/` | ❌ |

The `endsWith("." + target)` check prevents false positives like `notreddit.com`.

---

## Permissions Explained

| Permission | Why it's needed |
|---|---|
| `history` | Read and delete history entries (`search`, `deleteUrl`) |
| `storage` | Persist the domain list and `lastCleanup` bookmark |
| `tabs` | Detect tab closes (`tabs.onRemoved`) to trigger incremental sweeps |
| `alarms` | Schedule the 1-minute background sweep |

The extension does **not** request:

- `cookies` - it never touches cookies
- `browsingData` - it uses targeted `deleteUrl`, not bulk clearing
- `<all_urls>` host permissions - it doesn't inject scripts into pages

---

## Configuration & Tuning

### Change the periodic sweep frequency

In `background/service-worker.js`, find `ensureAlarm()`:

```js
chrome.alarms.create("cleanup", { periodInMinutes: 1 });
```

Change `1` to any positive number. Lower = more responsive, higher = less CPU.

### Full sweep on tab close

Replace `runIncrementalCleanup("tab-closed")` with `runFullCleanup("tab-closed")`. Not recommended, it's expensive.

### Add a whitelist

Not implemented. The place to add it is inside `clearConfiguredHistory` before the `deleteUrl` call.

---

## Troubleshooting

### "It's not deleting anything"

1. **Reload the extension** at `brave://extensions` (click ⟳ on the card).
2. Open the service worker console (click **service worker** on the card).
3. Look for red errors. Common ones:
   - `chrome.alarms is undefined` → `"alarms"` missing from `manifest.json`, or you didn't reload.
   - `chrome.storage.session is not available` → old v1.0.0 code still running.

Verify storage with:

```js
chrome.storage.local.get().then(console.log)
```

You should see `sites` and `lastCleanup`, **not** `sessionStart`.

### "It deletes some sites but not others"

Domains must be bare (`reddit.com`), not `https://reddit.com` or `www.reddit.com`. Check with:

```js
chrome.storage.local.get().then(console.log)
```

If you see bad entries, remove and re-add via the options page.

### "The popup button says Removed 0"

Either there's nothing to delete (expected), your domain list is empty or malformed, or you haven't reloaded the extension.

### "Console shows `Promise {<pending>}`"

That's not an error. `chrome.storage.local.get()` returns a Promise. Use `.then(console.log)` or `await`.

### "The extension is using too much CPU"

Lower the alarm frequency or comment out the `chrome.alarms.create` call.

---

## Limitations

- **No reliable "browser closing" event** in MV3. Cleanup happens on next startup instead. This is a platform limitation, not a bug.
- **Matching is hostname-only.** URL paths aren't considered, so you can't clean `reddit.com/r/foo` but keep `reddit.com/r/bar`.
- **Import always merges.** There's no "replace existing list" option yet.
- **No sync across devices.** It uses `storage.local`, not `storage.sync`.

---

## FAQ

**Q: Does this delete cookies, cache, or localStorage?**
No. Only matching history entries are removed. Cookies, cache, site data, passwords, bookmarks, and downloads are untouched.

**Q: Does this work in Chrome/Edge, not just Brave?**
Yes. It's a standard MV3 extension. Should work on any Chromium-based browser.

**Q: Does it work in Firefox?**
Not out of the box. Firefox MV3 differs slightly (`browser.*` namespace, different `background` manifest key). Would need minor porting.

**Q: Does it delete history while I'm browsing, or only after?**
Both. Tab close triggers an immediate incremental sweep. Every minute, an alarm sweep runs. Browser start does a full reset.

**Q: Can it clean subdomains?**
Yes, automatically. `reddit.com` cleans `www.reddit.com`, `old.reddit.com`, `np.reddit.com`, etc.

**Q: Can I move my site list to another machine?**
Yes. Use **Export as .txt** on machine A, then **Import from .txt** on machine B. The file is plain text, one domain per line.

**Q: Does it slow down my browser?**
No. Incremental sweeps are milliseconds. The full sweep on startup takes a few hundred ms for typical history sizes.

**Q: Is my data sent anywhere?**
No. Zero network calls. Everything stays in `chrome.storage.local` and the browser's history API.

**Q: How do I uninstall it?**
`brave://extensions` → your extension → **Remove**.

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, and [CHANGELOG.md](CHANGELOG.md) for version history.

---

## Credits

I built this for personal use and figured I'd put it on GitHub in case it's useful to anyone else. It's a small project, but I did use DeepSeek as a coding assistant while writing the service worker, the import/export logic, and parts of the options page. The architecture decisions, testing, and the parts specific to my use case are mine. The AI help was mostly for boilerplate and catching edge cases I would have missed. If you spot anything that looks off, open an issue and I'll take a look.

Thanks to anyone who tries it out.

---

## License

[MIT](LICENSE). Do whatever you want with it.

---

## If you find this useful

Give it a ⭐ if you feel like it. Helps other people find it.
