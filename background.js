// Keeps the toolbar icon showing whether the extension is armed.
function paintBadge(enabled) {
  chrome.action.setBadgeText({ text: enabled ? '' : 'OFF' });
  chrome.action.setBadgeBackgroundColor({ color: '#888888' });
  chrome.action.setTitle({
    title: enabled ? 'YouTube Ad Speed-Up — on' : 'YouTube Ad Speed-Up — off',
  });
}

function sync() {
  chrome.storage.sync.get({ enabled: true }, ({ enabled }) => paintBadge(enabled));
}

chrome.runtime.onStartup.addListener(sync);
chrome.runtime.onInstalled.addListener(sync);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.enabled) paintBadge(changes.enabled.newValue);
});
