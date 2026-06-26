// background.js
// Content scripts can't call chrome.tabs / chrome.windows directly,
// so the content script asks us to focus its tab or reload it.

chrome.runtime.onMessage.addListener((msg, sender) => {
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
