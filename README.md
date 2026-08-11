# youtube-ad-speedup-extension

A Chrome extension that plays YouTube ads at 16× (muted) and jumps them to the
end, so an unskippable pre-roll costs you about a second instead of thirty.

Your actual video is untouched — the speed-up only applies while YouTube marks
the player as showing an ad, and it reverts the moment the ad finishes.

## Install

There's no build step and nothing to compile. Load the folder as an unpacked
extension:

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions` — type it in the address bar,
   links to it don't work.
3. Turn on **Developer mode** with the toggle in the top-right.
4. Click **Load unpacked** and select the repository folder itself — the one
   containing `manifest.json`. Don't open the folder and pick the file.

It runs immediately. Open or reload a YouTube tab to test — the content script
only injects on page load, so tabs that were already open won't have it yet.

Optionally, click the puzzle-piece icon in the toolbar and pin **YouTube Ad
Speed-Up** so the on/off toggle is one click away.

### Two things that are normal

- Chrome may warn *"Disable developer mode extensions"* on startup. Dismiss it;
  the extension keeps working. It reappears occasionally.
- The toolbar shows a generic puzzle icon, since no icon files are declared.

## Usage

Click the toolbar icon for an on/off switch. When it's off, the badge reads
`OFF` and ads play normally.

Click **Settings…** in the popup (or right-click the icon → Options) for:

| Setting | Default | What it does |
| --- | --- | --- |
| Ad playback speed | `16` | Chrome caps playback at 16×. |
| Normal playback speed | `1` | What the video returns to when the ad ends. Set to `1.5` if that's how you watch. |
| Mute ads | on | Unmutes afterwards, unless you had the video muted already. |
| Jump ads to the end | on | Seeks the ad's own media to its final frame. The reliable one. |
| Auto-click "Skip" | on | Clicks the Skip button once YouTube arms it. |

Settings apply immediately, mid-ad, with no page reload.

## Development

After editing any file, click the circular refresh arrow on the extension's card
at `chrome://extensions`. If you changed `content.js` or `settings.js`, reload
the YouTube tab as well — the popup and options page don't need it.

| File | Role |
| --- | --- |
| `manifest.json` | Permissions, content script, popup, options page, service worker |
| `settings.js` | Shared defaults and `chrome.storage.sync` helpers |
| `content.js` | All page logic: ad detection, speed, seek, skip |
| `popup.html` / `popup.js` | Toolbar on/off toggle |
| `options.html` / `options.js` | Settings page |
| `background.js` | Paints the `OFF` badge on the toolbar icon |

`content.js` logs what it's doing to the YouTube tab's console under the
`[ad-speedup]` prefix — ad start/end, and each skip-button attempt.

## Known limitation

The post-ad **interstitial** — the card with a pie countdown that appears once an
ad's video has already finished — can't be skipped. Its Skip button sits at
`opacity: 0.5` and ignores clicks until YouTube arms it, and scripted clicks are
rejected outright once it does (the page checks `event.isTrusted`). Its countdown
is wall-clock, so there's no playback rate to raise and no media to seek.

Getting past it would need the `chrome.debugger` permission to synthesise a
trusted click, which makes Chrome display a permanent *"started debugging this
browser"* banner on every YouTube tab. Not worth it for a few seconds.
