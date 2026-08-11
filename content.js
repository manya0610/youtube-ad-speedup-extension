(function () {
  let settings = { ...DEFAULTS };
  let adActive = false;
  let mutedByUs = false;
  let listeningTo = null;
  let adPoll = null;
  let skipWatch = null;
  // Duration of your actual video, sampled whenever no ad is showing.
  let mainDuration = null;

  const lastClicked = new WeakMap();
  const dimmedSince = new WeakMap();

  function log(...args) {
    console.log('%c[ad-speedup]', 'color:#c00;font-weight:bold', ...args);
  }

  function getVideo() {
    return document.querySelector('video');
  }

  function startAd(video) {
    log('ad started — speed', settings.adSpeed);
    adActive = true;
    video.playbackRate = settings.adSpeed;
    if (settings.muteAds && !video.muted) {
      video.muted = true;
      mutedByUs = true;
    }
    startAdPoll();
  }

  // The skip button can become clickable without any DOM mutation firing, so
  // polling is more reliable than waiting on the observer for this one.
  function startAdPoll() {
    if (adPoll) return;
    adPoll = setInterval(() => {
      keepAdSpeed();
      if (settings.seekAds) seekAdToEnd();
      if (settings.autoSkip) clickSkip();
    }, 250);
  }

  function stopAdPoll() {
    clearInterval(adPoll);
    adPoll = null;
  }

  // Banner and overlay ads have no media to seek, and some don't set the player
  // classes we key off, so the Skip button is the only lever. This watch runs
  // for as long as the page is open rather than only during a video ad, which
  // covers the "second ad in the pod is a banner" case. It's just a
  // querySelectorAll — clicking is gated on a visible, skip-named element.
  function startSkipWatch() {
    if (skipWatch) return;
    skipWatch = setInterval(() => {
      if (settings.enabled && settings.autoSkip) clickSkip();
    }, 250);
  }

  // The most reliable skip: jump the ad's own media to its end. It needs no
  // button, works on ads YouTube never lets you skip, and beats the race where
  // the Skip button only arms as the sped-up ad is already ending.
  function seekAdToEnd() {
    const video = getVideo();
    if (!video || !adActive) return false;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return false;

    // Only a video ad replaces the media; banner/overlay ads leave your own
    // video loaded in the element, where seeking to the end would be a disaster.
    if (!document.querySelector('.html5-video-player.ad-interrupting')) return false;
    if (isMainVideo(video)) return false;

    const target = video.duration - 0.1;
    if (video.currentTime >= target) return false;

    video.currentTime = target;
    return true;
  }

  // An ad pod is several ads back to back. YouTube swaps a new source into the
  // same <video> for each one, and a source swap resets playbackRate to 1 — so
  // the speed has to be re-asserted, not just set once when the pod starts.
  function keepAdSpeed() {
    const video = getVideo();
    if (!video || !adActive || isMainVideo(video)) return;
    if (video.playbackRate !== settings.adSpeed) {
      video.playbackRate = settings.adSpeed;
    }
  }

  // During a banner ad the element still holds your own video. Its length gives
  // it away — no ad happens to run exactly as long as the video it interrupts.
  function isMainVideo(video) {
    return (
      mainDuration !== null &&
      Number.isFinite(video.duration) &&
      Math.abs(video.duration - mainDuration) < 0.5
    );
  }

  function keepAdMuted() {
    const video = getVideo();
    if (!video || !adActive || !settings.muteAds) return;
    if (!video.muted) {
      video.muted = true;
      mutedByUs = true;
    }
  }

  function watchVideo(video) {
    if (listeningTo === video) return;
    listeningTo = video;
    // ratechange catches YouTube resetting us; the rest catch the next ad loading.
    video.addEventListener('ratechange', keepAdSpeed);
    for (const evt of ['loadstart', 'loadeddata', 'playing', 'durationchange']) {
      video.addEventListener(evt, keepAdSpeed);
      video.addEventListener(evt, keepAdMuted);
      // durationchange is the first moment seeking to the end is possible.
      video.addEventListener(evt, () => {
        if (settings.seekAds) seekAdToEnd();
      });
    }
  }

  function endAd(video) {
    log('ad ended — back to', settings.normalSpeed);
    adActive = false;
    stopAdPoll();
    video.playbackRate = settings.normalSpeed;
    if (mutedByUs) {
      video.muted = false;
      mutedByUs = false;
    }
  }

  // YouTube has renamed this button several times and runs A/B variants, so cast
  // a wide net rather than betting on one class.
  // Matches the button itself and its inner parts (…__icon, …__text), since the
  // clickable element is often the span's parent rather than a real <button>.
  const SKIP_SELECTORS = [
    '[class*="skip-ad-button"]',
    '[class*="skip-button"]',
    '[class*="videoAdUiSkipButton"]',
    '[id*="skip-button"]',
  ].join(', ');

  function isVisible(el) {
    return el.getClientRects().length > 0;
  }

  function isSkipish(el) {
    // Guard against clicking the ad body itself, which opens the advertiser.
    const cls = typeof el.className === 'string' ? el.className : '';
    return /skip/i.test(cls) || /skip/i.test(el.id || '');
  }

  // YouTube's player controls listen on pointer/mouse events, so a bare .click()
  // is frequently ignored. Replay the full sequence a real cursor produces.
  function realClick(el) {
    const rect = el.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      button: 0,
      buttons: 1,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
    };

    // Wake the player out of autohide first. While the controls are hidden the
    // skip button sits at opacity 0.5 and may not be wired up yet; YouTube's
    // autohide listens for mousemove on the player and won't care that ours is
    // synthetic. Costs nothing if autohide wasn't the problem.
    const player = document.querySelector('#movie_player');
    if (player) {
      player.dispatchEvent(new MouseEvent('mousemove', opts));
    }

    el.dispatchEvent(new PointerEvent('pointerover', opts));
    el.dispatchEvent(new PointerEvent('pointerenter', opts));
    el.dispatchEvent(new MouseEvent('mouseover', opts));
    el.dispatchEvent(new PointerEvent('pointermove', opts));
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', { ...opts, buttons: 0 }));
    el.dispatchEvent(new MouseEvent('mouseup', { ...opts, buttons: 0 }));
    el.dispatchEvent(new MouseEvent('click', { ...opts, buttons: 0 }));
    if (typeof el.click === 'function') el.click();
  }

  // One target per skip widget. Matching …__text and …__icon as well as the
  // button meant we fired three overlapping pointer sequences at nested
  // elements — nothing like a real click, and easy for a handler to reject.
  // YouTube dims the skip button to opacity 0.5 while the ad is not yet
  // skippable and inertly ignores every click, scripted or real, until then.
  // Waiting for it to arm is the whole game — this is not autohide, a synthetic
  // mousemove on the player does not clear it.
  function isArmed(el) {
    const style = getComputedStyle(el);
    return parseFloat(style.opacity) >= 0.9 && style.pointerEvents !== 'none';
  }

  function skipTargets() {
    const found = new Set();

    for (const el of document.querySelectorAll(SKIP_SELECTORS)) {
      const button = el.closest('button, [role="button"]');
      const target = button && isSkipish(button) ? button : el;
      if (!isVisible(target) || target.disabled) continue;

      if (!isArmed(target)) {
        // Log the wait once per button, not once per poll.
        if (!dimmedSince.has(target)) {
          dimmedSince.set(target, Date.now());
          log('skip button present but dimmed — waiting for it to arm');
        }
        continue;
      }

      const waited = dimmedSince.get(target);
      if (waited) {
        log(`skip button armed after ${((Date.now() - waited) / 1000).toFixed(1)}s`);
        dimmedSince.delete(target);
      }
      found.add(target);
    }

    return [...found];
  }

  function describe(el) {
    return `${el.tagName.toLowerCase()}.${el.className || ''}#${el.id || ''}`;
  }

  function clickSkip() {
    const targets = skipTargets();
    if (!targets.length) return false;

    for (const el of targets) {
      // Retry a button that hasn't armed yet, but at 1/s rather than 4/s so the
      // log stays readable and we don't hammer the handler.
      const now = Date.now();
      if (now - (lastClicked.get(el) || 0) < 1000) continue;
      lastClicked.set(el, now);

      log('clicking skip →', describe(el));
      realClick(el);
      // If it worked the button goes away; verify so we know which side failed.
      setTimeout(() => {
        if (el.isConnected && isVisible(el)) {
          log('still present 1s after click — YouTube ignored it:', describe(el));
        }
      }, 1000);
    }

    return true;
  }

  function apply() {
    const video = getVideo();
    if (!video) return;
    watchVideo(video);

    const adPresent =
      settings.enabled && !!document.querySelector('.html5-video-player.ad-showing');

    // Sample your video's length between ads, so seekAdToEnd can recognise it
    // and refuse to skip your own content.
    if (!adPresent && Number.isFinite(video.duration) && video.duration > 0) {
      mainDuration = video.duration;
    }

    if (adPresent && !adActive) {
      startAd(video);
    } else if (!adPresent && adActive) {
      endAd(video);
    } else if (adPresent) {
      keepAdSpeed();
    }

    // Deliberately not gated on adPresent: the post-ad interstitial can outlive
    // the player's ad classes, and that gap is where the second skip was lost.
    if (settings.enabled && settings.autoSkip) clickSkip();
  }

  // Re-run the transition with the new values so changes take effect mid-ad.
  function refresh() {
    const video = getVideo();
    if (video && adActive) endAd(video);
    apply();
  }

  const observer = new MutationObserver(apply);

  loadSettings().then((stored) => {
    settings = stored;
    apply();
    observer.observe(document.body, { childList: true, subtree: true });
    startSkipWatch();
    log('running. autoSkip =', settings.autoSkip, '| seekAds =', settings.seekAds);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in settings) settings[key] = newValue;
    }
    refresh();
  });
})();
