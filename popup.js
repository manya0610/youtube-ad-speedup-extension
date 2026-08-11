const enabledBox = document.getElementById('enabled');
const status = document.getElementById('status');

function render(settings) {
  enabledBox.checked = settings.enabled;
  status.textContent = settings.enabled
    ? `Ads at ${settings.adSpeed}× · video at ${settings.normalSpeed}×`
    : 'Paused — ads play normally.';
}

loadSettings().then(render);

enabledBox.addEventListener('change', async () => {
  await saveSettings({ enabled: enabledBox.checked });
  render(await loadSettings());
});

document.getElementById('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
