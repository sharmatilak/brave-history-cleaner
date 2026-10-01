const form = document.getElementById("add-form");
const input = document.getElementById("domain");
const list = document.getElementById("sites");
const status = document.getElementById("status");

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

form.addEventListener("submit", async event => {
  event.preventDefault();

  const domain = normalizeDomain(input.value);

  if (!domain || !domain.includes(".")) {
    status.textContent = "Enter a valid domain, e.g. reddit.com";
    return;
  }

  const sites = await getSites();

  if (sites.includes(domain)) {
    status.textContent = "That domain is already configured.";
    return;
  }

  sites.push(domain);
  sites.sort();

  await saveSites(sites);

  input.value = "";
  status.textContent = `Added ${domain}.`;
  await render();
});

render();