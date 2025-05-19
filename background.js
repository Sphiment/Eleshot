// background.js
// Listens for the toolbar button click and starts the element picker
chrome.action.onClicked.addListener((tab) => {
    if (!tab.id) return;
    chrome.tabs.sendMessage(tab.id, { action: "start-picker" }, () => {
        if (chrome.runtime.lastError) {
            // Content script not available on this page; ignore
        }
    });
});
