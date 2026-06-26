// background.js

async function ensureAudioSandbox() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'audio.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Plays task notification chime detached from webpage lifecycle'
  }).catch(() => {});
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === 'REQUEST_CHIME') {
    ensureAudioSandbox().then(() => {
      chrome.runtime.sendMessage({ type: 'PLAY_CHIME', volume: msg.volume });
    });
    return;
  }

  if (!sender.tab || sender.tab.id == null) return;

  if (msg && msg.type === 'FOCUS_TAB') {
    chrome.tabs.update(sender.tab.id, { active: true }).catch(() => {});
    if (sender.tab.windowId != null) {
      chrome.windows.update(sender.tab.windowId, { focused: true }).catch(() => {});
    }
  }

  if (msg && msg.type === 'RELOAD_TAB') {
    chrome.tabs.reload(sender.tab.id, { bypassCache: !!msg.hard }).catch(() => {});
  }
});
