const form = document.getElementById("add-form");
const input = document.getElementById("domain");
const list = document.getElementById("sites");
const formStatus = document.getElementById("form-status");
const ioStatus = document.getElementById("io-status");
const exportButton = document.getElementById("export");
const importButton = document.getElementById("import");
const importFile = document.getElementById("import-file");

function normalizeDomain(domain) {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(":")[0];
}

async function getSites() {
  const data = await chrome.storage.local.get({ sites: [] });
  return data.sites;
}

async function saveSites(sites) {
  await chrome.storage.local.set({ sites });
}

async function render() {
  const sites = await getSites();
  list.replaceChildren();

  if (!sites.length) {
    const empty = document.createElement("li");
    empty.textContent = "No websites configured.";
    empty.className = "empty";
    list.appendChild(empty);
    return;
  }

  for (const site of sites) {
    const li = document.createElement("li");

    const span = document.createElement("span");
    span.textContent = site;

    const button = document.createElement("button");
    button.textContent = "Remove";
    button.type = "button";

    button.addEventListener("click", async () => {
      const current = await getSites();
      await saveSites(current.filter(item => item !== site));
      await render();
    });

    li.append(span, button);
    list.appendChild(li);
  }
}

// ---- Add a single domain ----

form.addEventListener("submit", async event => {
  event.preventDefault();

  const domain = normalizeDomain(input.value);

  if (!domain || !domain.includes(".")) {
    formStatus.textContent = "Enter a valid domain, e.g. reddit.com";
    return;
  }

  const sites = await getSites();

  if (sites.includes(domain)) {
    formStatus.textContent = "That domain is already configured.";
    return;
  }

  sites.push(domain);
  sites.sort();

  await saveSites(sites);

  input.value = "";
  formStatus.textContent = `Added ${domain}.`;
  await render();
});

// ---- Export sites to a .txt file ----

exportButton.addEventListener("click", async () => {
  const sites = await getSites();

  if (!sites.length) {
    ioStatus.textContent = "Nothing to export - no sites configured.";
    return;
  }

  const content = sites.join("\n") + "\n";
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "brave-history-cleaner-sites.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);

  ioStatus.textContent = `Exported ${sites.length} site${sites.length === 1 ? "" : "s"}.`;
});

// ---- Import sites from a .txt file ----

importButton.addEventListener("click", () => {
  importFile.click();
});

importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();

    const incoming = text
      .split(/\r?\n/)
      .map(normalizeDomain)
      .filter(d => d && d.includes("."));

    const existing = await getSites();
    const merged = Array.from(new Set([...existing, ...incoming])).sort();

    await saveSites(merged);
    await render();

    const added = merged.length - existing.length;
    const skipped = incoming.length - added;

    ioStatus.textContent =
      `Imported ${added} new site${added === 1 ? "" : "s"}` +
      (skipped > 0
        ? `, skipped ${skipped} duplicate or invalid line${skipped === 1 ? "" : "s"}.`
        : ".");
  } catch (error) {
    ioStatus.textContent = `Import failed: ${error.message}`;
  } finally {
    importFile.value = ""; // allow re-importing the same file
  }
});

render();