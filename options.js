const fields = {
  adSpeed: document.getElementById('adSpeed'),
  normalSpeed: document.getElementById('normalSpeed'),
  muteAds: document.getElementById('muteAds'),
  autoSkip: document.getElementById('autoSkip'),
  seekAds: document.getElementById('seekAds'),
};
const saved = document.getElementById('saved');

function clamp(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(16, Math.max(0.25, n));
}

loadSettings().then((settings) => {
  fields.adSpeed.value = settings.adSpeed;
  fields.normalSpeed.value = settings.normalSpeed;
  fields.muteAds.checked = settings.muteAds;
  fields.autoSkip.checked = settings.autoSkip;
  fields.seekAds.checked = settings.seekAds;
});

document.getElementById('save').addEventListener('click', async () => {
  const patch = {
    adSpeed: clamp(fields.adSpeed.value, DEFAULTS.adSpeed),
    normalSpeed: clamp(fields.normalSpeed.value, DEFAULTS.normalSpeed),
    muteAds: fields.muteAds.checked,
    autoSkip: fields.autoSkip.checked,
    seekAds: fields.seekAds.checked,
  };

  // Reflect any clamping back into the inputs.
  fields.adSpeed.value = patch.adSpeed;
  fields.normalSpeed.value = patch.normalSpeed;

  await saveSettings(patch);

  saved.classList.add('show');
  setTimeout(() => saved.classList.remove('show'), 1200);
});
