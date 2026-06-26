// popup.js
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

function getActiveTargetTab(cb) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.url || !tab.url.startsWith('http')) {
      cb(null);
      return;
    }
    cb(tab);
  });
}

document.addEventListener('DOMContentLoaded', init);

function init() {
  const els = {
    enabled: document.getElementById('enabled'),
    interval: document.getElementById('interval'),
    refreshMode: document.getElementById('refreshMode'),
    buttonText: document.getElementById('buttonText'),
    matchMode: document.getElementById('matchMode'),
    urlFilterMode: document.getElementById('urlFilterMode'),
    urlFilterValue: document.getElementById('urlFilterValue'),
    soundEnabled: document.getElementById('soundEnabled'),
    volume: document.getElementById('volume'),
    autoClickEnabled: document.getElementById('autoClickEnabled'),
    stopOnFound: document.getElementById('stopOnFound'),
    save: document.getElementById('save'),
    testSound: document.getElementById('testSound'),
    status: document.getElementById('status'),
    tipLink: document.getElementById('tipLink'),
  };

  chrome.storage.local.get(null, (stored) => {
    els.enabled.checked = stored.enabled !== undefined ? !!stored.enabled : DEFAULTS.enabled;
    els.interval.value = Math.round((stored.refreshIntervalMs || DEFAULTS.refreshIntervalMs) / 1000);
    els.refreshMode.value = stored.refreshMode || DEFAULTS.refreshMode;
    els.buttonText.value = stored.buttonText !== undefined ? stored.buttonText : DEFAULTS.buttonText;
    els.matchMode.value = stored.matchMode || DEFAULTS.matchMode;
    els.urlFilterMode.value = stored.urlFilterMode || DEFAULTS.urlFilterMode;
    els.urlFilterValue.value = stored.urlFilterValue !== undefined ? stored.urlFilterValue : DEFAULTS.urlFilterValue;
    els.soundEnabled.checked = stored.soundEnabled !== undefined ? !!stored.soundEnabled : DEFAULTS.soundEnabled;
    els.volume.value = stored.volume !== undefined ? stored.volume : DEFAULTS.volume;
    els.autoClickEnabled.checked = stored.autoClickEnabled !== undefined ? !!stored.autoClickEnabled : DEFAULTS.autoClickEnabled;
    els.stopOnFound.checked = stored.stopOnFound !== undefined ? !!stored.stopOnFound : DEFAULTS.stopOnFound;

    getActiveTargetTab((tab) => {
      if (!tab) return;
      chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' }, (resp) => {
        if (chrome.runtime.lastError || !resp) return; 
        if (resp.baseEnabled && resp.clickDisabled) {
          els.status.textContent = 'Paused (click detected)';
        } else if (resp.baseEnabled && resp.sessionStopped) {
          els.status.textContent = 'Target found (Paused)'; // <-- Tells user it did its job!
        } else if (resp.baseEnabled && !resp.effectiveEnabled) {
          els.status.textContent = 'Enabled (URL filtered)';
        }
      });
    });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.enabled !== undefined) {
      els.enabled.checked = changes.enabled.newValue;
      if (!changes.enabled.newValue && els.status.textContent === '') {
        els.status.textContent = 'Target found. Disabled.';
        setTimeout(() => (els.status.textContent = ''), 2500);
      }
    }
  });

  els.enabled.addEventListener('change', () => {
    const checked = els.enabled.checked;
    chrome.storage.local.set({ enabled: checked }, () => {
      els.status.textContent = checked ? 'Enabled.' : 'Disabled.';
      setTimeout(() => (els.status.textContent = ''), 1200);
    });
    getActiveTargetTab((tab) => {
      if (!tab) return;
      chrome.tabs.sendMessage(tab.id, { type: 'SET_ENABLED', value: checked }, () => {
        if (chrome.runtime.lastError) return;
      });
    });
  });

  els.save.addEventListener('click', () => {
    const newSettings = {
      enabled: els.enabled.checked,
      refreshIntervalMs: Math.max(1, parseFloat(els.interval.value || '5')) * 1000,
      refreshMode: els.refreshMode.value,
      buttonText: els.buttonText.value.trim(),
      matchMode: els.matchMode.value,
      urlFilterMode: els.urlFilterMode.value,
      urlFilterValue: els.urlFilterValue.value.trim(),
      soundEnabled: els.soundEnabled.checked,
      volume: parseFloat(els.volume.value),
      autoClickEnabled: els.autoClickEnabled.checked,
      stopOnFound: els.stopOnFound.checked,
    };
    chrome.storage.local.set(newSettings, () => {
      els.status.textContent = 'Saved.';
      setTimeout(() => (els.status.textContent = ''), 1500);
    });
  });

  els.testSound.addEventListener('click', () => {
    getActiveTargetTab((tab) => {
      if (!tab) {
        els.status.textContent = 'Open a web page first.';
        setTimeout(() => (els.status.textContent = ''), 2000);
        return;
      }
      chrome.tabs.sendMessage(tab.id, { type: 'TEST_SOUND' }, () => {
        if (chrome.runtime.lastError) {
          els.status.textContent = 'Refresh page first.';
          setTimeout(() => (els.status.textContent = ''), 2000);
          return;
        }
        els.status.textContent = 'Sound test sent.';
        setTimeout(() => (els.status.textContent = ''), 2000);
      });
    });
  });

  // Reliably open the bundled tips.html page in a fresh browser tab
  els.tipLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'tips.html' });
  });
}
