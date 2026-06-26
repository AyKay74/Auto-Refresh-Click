// content.js
(function () {
  const DEFAULTS = {
    enabled: true,
    refreshIntervalMs: 5000,
    refreshMode: 'soft',
    urlFilterMode: 'any', 
    urlFilterValue: '',
    buttonText: '',
    soundEnabled: true,
    matchMode: 'contains', 
    volume: 0.5,
    autoClickEnabled: true,
    stopOnFound: false,
  };

  let settings = { ...DEFAULTS };
  let pendingTimer = null;
  let audioCtx = null;
  let clickDisabled = false;

  function log(...args) {
    console.log('[Auto Refresh & Click]', ...args);
  }

  function loadSettings(cb) {
    chrome.storage.local.get(null, (stored) => {
      settings = { ...DEFAULTS, ...stored };
      cb && cb();
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const key of Object.keys(changes)) {
      if (key in DEFAULTS) settings[key] = changes[key].newValue;
    }
    log('Settings updated', settings);
  });

  function shouldRunOnThisPage() {
    const currentUrl = location.href.toLowerCase();
    
    // 1. ABSOLUTE SAFEGUARD: Never refresh if the user is working inside a task, checking history, or changing settings
    if (
      currentUrl.includes('/task/show') || 
      currentUrl.includes('/personalized_task_history') || 
      currentUrl.includes('/recent_tasks') || 
      currentUrl.includes('/settings') ||
      currentUrl.includes('/task_results_portal')
    ) {
      return false;
    }

    const mode = settings.urlFilterMode || 'any';
    if (mode === 'any' || !settings.urlFilterValue) return true;

    const filterVal = settings.urlFilterValue.trim().toLowerCase();

    // 2. DUAL-INDEX ROUTING: If targeting RaterHub, allow exactly and only the two valid index endpoints
    if (filterVal.includes('/evaluation/rater')) {
      const cleanPath = location.pathname.replace(/\/$/, ""); 
      return cleanPath === '/evaluation/rater' || cleanPath === '/evaluation/rater/task/index';
    }

    // Fallback logic for any other custom filter types
    if (mode === 'exact') {
      try {
        const target = new URL(settings.urlFilterValue, location.href);
        return location.origin === target.origin && location.pathname === target.pathname;
      } catch (e) {
        return location.href === settings.urlFilterValue;
      }
    }
    return currentUrl.includes(filterVal);
  }

  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  }

  function findTargetElement() {
    const text = (settings.buttonText || '').trim().toLowerCase();
    if (!text) return null;

    const primaryCandidates = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]');
    for (const el of primaryCandidates) {
      if (el.classList && el.classList.contains('ext-highlight-marker')) continue; // Skip already highlighted
      const elText = (el.value || el.innerText || el.textContent || '').trim().toLowerCase();
      const isMatch = settings.matchMode === 'exact' ? elText === text : elText.includes(text);
      if (isMatch && isVisible(el)) return el;
    }

    const secondaryCandidates = document.querySelectorAll('span, div');
    let bestMatch = null;
    for (const el of secondaryCandidates) {
      if (el.classList && el.classList.contains('ext-highlight-marker')) continue; // Skip already highlighted
      const elText = (el.innerText || el.textContent || '').trim().toLowerCase();
      const isMatch = settings.matchMode === 'exact' ? elText === text : elText.includes(text);
      if (isMatch && isVisible(el)) {
        bestMatch = el;
      }
    }
    
    return bestMatch;
  }

  function highlightExactText(el, textToFind) {
    if (!textToFind || !el) return;
    const lowerTarget = textToFind.toLowerCase();
    
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    let node;
    
    while ((node = walker.nextNode())) {
      const nodeText = node.nodeValue.toLowerCase();
      const matchIndex = nodeText.indexOf(lowerTarget);
      
      if (matchIndex >= 0) {
        const originalText = node.nodeValue;
        const matchedString = originalText.substring(matchIndex, matchIndex + textToFind.length);
        const afterString = originalText.substring(matchIndex + textToFind.length);
        
        node.nodeValue = originalText.substring(0, matchIndex);
        
        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'ext-highlight-marker'; // Tag it so we ignore it next time
        highlightSpan.style.backgroundColor = 'rgba(255, 255, 0, 0.6)';
        highlightSpan.style.color = '#000';
        highlightSpan.style.borderRadius = '2px';
        highlightSpan.style.padding = '0 2px';
        highlightSpan.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
        highlightSpan.textContent = matchedString;
        
        const parent = node.parentNode;
        parent.insertBefore(highlightSpan, node.nextSibling);
        
        if (afterString) {
          const afterNode = document.createTextNode(afterString);
          parent.insertBefore(afterNode, highlightSpan.nextSibling);
        }
        break; 
      }
    }
  }

  function playChime() {
    if (!settings.soundEnabled) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const notes = [
        { freq: 784.0, start: 0.0, dur: 0.3 },
        { freq: 987.77, start: 0.35, dur: 0.3 },
        { freq: 1174.66, start: 0.7, dur: 0.3 },
        { freq: 1567.98, start: 1.1, dur: 1.3 },
      ];
      
      const volFactor = settings.volume !== undefined ? settings.volume : 0.5;

      notes.forEach((n) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = n.freq;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const t0 = now + n.start;
        const t1 = t0 + n.dur;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.2 * volFactor, t0 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, t1);
        osc.start(t0);
        osc.stop(t1 + 0.02);
      });
    } catch (e) {
      log('Sound error', e);
    }
  }

  function unlockAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {}
  }

  function requestFocus() {
    try { window.focus(); } catch (e) {}
    try { chrome.runtime.sendMessage({ type: 'FOCUS_TAB' }); } catch (e) {}
  }

  function requestReload(hard) {
    try { chrome.runtime.sendMessage({ type: 'RELOAD_TAB', hard: !!hard }); } catch (e) {}
  }

  function clearPending() {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  }

  function triggerRobustClick(el) {
    log('Dispatching full mouse sequence to element', el);
    const opts = { bubbles: true, cancelable: true, view: window };
    
    try { el.dispatchEvent(new MouseEvent('mouseover', opts)); } catch(e){}
    try { el.dispatchEvent(new MouseEvent('mouseenter', opts)); } catch(e){}
    try { el.dispatchEvent(new MouseEvent('mousedown', opts)); } catch(e){}
    try { el.dispatchEvent(new MouseEvent('mouseup', opts)); } catch(e){}
    try { el.dispatchEvent(new MouseEvent('click', opts)); } catch(e){}
    
    try { el.click(); } catch(e){}

    if (el.tagName === 'A' && el.href) {
      setTimeout(() => { window.location.href = el.href; }, 150);
    }
  }

  function checkNowAndScheduleNext() {
    clearPending();
    if (!settings.enabled || clickDisabled || !shouldRunOnThisPage()) return;

    const el = findTargetElement();
    if (el) {
      log('Target element found!', el);
      requestFocus();
      playChime();
      
      try {
        highlightExactText(el, settings.buttonText);
      } catch (e) {
        log('Failed to highlight text', e);
      }

      if (settings.stopOnFound) {
        log('Target found. Disabling further refreshes.');
        chrome.storage.local.set({ enabled: false });
        settings.enabled = false;
      }
      
      if (settings.autoClickEnabled !== false) {
        setTimeout(() => {
          triggerRobustClick(el);
        }, 50); 
      } else {
        log('Auto-click is disabled. Pausing monitoring to prevent page navigation.');
        clickDisabled = true;
      }

      if (settings.stopOnFound || clickDisabled) {
        return; 
      }
    }

    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      if (!settings.enabled || clickDisabled || !shouldRunOnThisPage()) return;
      requestReload(settings.refreshMode === 'hard');
    }, settings.refreshIntervalMs);
  }

  document.addEventListener(
    'click',
    (e) => {
      if (!e.isTrusted) return;

      unlockAudio();
      if (!clickDisabled) {
        clickDisabled = true;
        clearPending();
        log('Genuine user click detected on the page — pausing monitoring.');
      }
    },
    true
  );

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'TEST_SOUND') {
      unlockAudio();
      playChime();
      sendResponse && sendResponse({ ok: true });
    }
    if (msg && msg.type === 'GET_STATUS') {
      sendResponse &&
        sendResponse({
          baseEnabled: settings.enabled,
          clickDisabled,
          effectiveEnabled: settings.enabled && !clickDisabled && shouldRunOnThisPage(),
        });
    }
    if (msg && msg.type === 'SET_ENABLED') {
      settings.enabled = !!msg.value;
      clickDisabled = false;
      clearPending();
      if (settings.enabled && shouldRunOnThisPage()) {
        requestReload(settings.refreshMode === 'hard');
      }
      sendResponse && sendResponse({ ok: true });
    }
  });

  function init() {
    checkNowAndScheduleNext();
  }

  loadSettings(() => {
    if (document.body) {
      init();
    } else {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    }
  });
})();