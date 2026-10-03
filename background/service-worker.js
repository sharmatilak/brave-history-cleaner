// Firefox MV3 uses event pages, Chromium MV3 uses service workers.
// Both expose the same chrome.* APIs, but this guard makes it obvious
// if a future feature uses something one browser doesn't have.
for (const api of ["history", "storage", "tabs", "alarms"]) {
  if (!chrome[api]) {
    console.error(`[History Cleaner] Required API missing: chrome.${api}`);
  }
}

const DEFAULTS = {
  sites: [],
  lastCleanup: 0
};

async function getSettings() {
  return chrome.storage.local.get(DEFAULTS);
}

function normalizeDomain(domain) {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(":")[0];
}

function matchesDomain(url, domain) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const target = normalizeDomain(domain);
    return hostname === target || hostname.endsWith("." + target);
  } catch {
    return false;
  }
}

// Core sweep. `since` = epoch ms; 0 = all time.
async function clearConfiguredHistory({ since = 0 } = {}) {
  const settings = await getSettings();

  if (!settings.sites.length) {
    return { deleted: 0, message: "No websites are configured." };
  }

  const items = await chrome.history.search({
    text: "",
    startTime: since,
    endTime: Date.now(),
    maxResults: 100000
  });

  let deleted = 0;

  for (const item of items) {
    if (!item.url) continue;
    const matches = settings.sites.some(site => matchesDomain(item.url, site));
    if (matches) {
      await chrome.history.deleteUrl({ url: item.url });
      deleted++;
    }
  }

  return {
    deleted,
    message:
      deleted === 1
        ? "Removed 1 history entry."
        : `Removed ${deleted} history entries.`
  };
}

// Incremental: only entries newer than lastCleanup, then advance the bookmark.
async function runIncrementalCleanup(reason) {
  const { lastCleanup } = await chrome.storage.local.get({ lastCleanup: 0 });
  const result = await clearConfiguredHistory({ since: lastCleanup });
  await chrome.storage.local.set({ lastCleanup: Date.now() });
  console.log(`[History Cleaner] ${reason} (incremental): ${result.message}`);
  return result;
}

// Full: wipe everything for configured sites, all time.
async function runFullCleanup(reason) {
  const result = await clearConfiguredHistory({ since: 0 });
  await chrome.storage.local.set({ lastCleanup: Date.now() });
  console.log(`[History Cleaner] ${reason} (full): ${result.message}`);
  return result;
}

// ---- Worker wake-up: incremental ----
runIncrementalCleanup("worker-startup").catch(e =>
  console.error("[History Cleaner] worker-startup failed:", e)
);

// ---- Browser startup: full ----
chrome.runtime.onStartup.addListener(() => {
  runFullCleanup("browser-startup").catch(e =>
    console.error("[History Cleaner] browser-startup failed:", e)
  );
});

// ---- Periodic alarm: incremental ----
async function ensureAlarm() {
  const existing = await chrome.alarms.get("cleanup");
  if (!existing) {
    chrome.alarms.create("cleanup", { periodInMinutes: 1 });
  }
}

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name !== "cleanup") return;
  runIncrementalCleanup("periodic").catch(e =>
    console.error("[History Cleaner] periodic failed:", e)
  );
});

// ---- Tab close: incremental ----
chrome.tabs.onRemoved.addListener(() => {
  runIncrementalCleanup("tab-closed").catch(e =>
    console.error("[History Cleaner] tab-closed failed:", e)
  );
});

// ---- Popup button: full ----
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === "clearHistory") {
    runFullCleanup("popup")
      .then(sendResponse)
      .catch(error =>
        sendResponse({ deleted: 0, message: `Error: ${error.message}` })
      );
    return true;
  }
});

// ---- Install ----
chrome.runtime.onInstalled.addListener(async () => {
  const { lastCleanup } = await chrome.storage.local.get({ lastCleanup: 0 });
  if (!lastCleanup) {
    await chrome.storage.local.set({ lastCleanup: Date.now() });
  }
  await ensureAlarm();
});