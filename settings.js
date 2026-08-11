// Shared defaults + storage helpers. Loaded by content script, popup and options.
const DEFAULTS = {
  enabled: true,
  adSpeed: 16,
  normalSpeed: 1,
  muteAds: true,
  autoSkip: true,
  seekAds: true,
};

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULTS, resolve);
  });
}

function saveSettings(patch) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(patch, resolve);
  });
}
