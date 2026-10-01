const status = document.getElementById("status");
const clearButton = document.getElementById("clear");
const settingsButton = document.getElementById("settings");
const result = document.getElementById("result");

async function load() {
  const data = await chrome.storage.local.get({ sites: [] });

  if (data.sites.length === 0) {
    status.textContent = "No websites configured.";
    clearButton.disabled = true;
  } else {
    status.textContent =
      `${data.sites.length} website${data.sites.length === 1 ? "" : "s"} configured.`;
  }
}

clearButton.addEventListener("click", async () => {
  clearButton.disabled = true;
  result.textContent = "Clearing...";

  try {
    const response = await chrome.runtime.sendMessage({
      action: "clearHistory"
    });

    result.textContent = response.message;
  } catch (error) {
    result.textContent = `Error: ${error.message}`;
  }

  clearButton.disabled = false;
});

settingsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

load();