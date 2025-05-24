// background.js
// Listens for the toolbar button click and starts the element picker
chrome.action.onClicked.addListener((tab) => {
    if (tab.id) injectAndStartPicker(tab.id);
});

async function injectAndStartPicker(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content_script.js']
    });
    chrome.tabs.sendMessage(tabId, { action: 'start-picker' }, () => {
      if (chrome.runtime.lastError) {
        // ignore
      }
    });
  } catch (e) {
    // ignore
  }
}

// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "eleshot",
    title: "!Screenshot an element",
    contexts: ["all"]
  });
});

// Listen for context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'eleshot' && tab && tab.id) {
    injectAndStartPicker(tab.id);
  }
});

// Add queue to throttle captureVisibleTab calls
let captureQueue = [];
let capturing = false;

// Modify message listener to enqueue capture requests
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'capture-element') {
        // Enqueue the sendResponse callback and process queue
        captureQueue.push(sendResponse);
        processQueue();
        return true; // Will respond asynchronously
    }
});

// Process capture queue one at a time with delay to avoid quota errors
function processQueue() {
    if (capturing || captureQueue.length === 0) return;
    capturing = true;
    const send = captureQueue.shift();
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        send({ img: dataUrl });
        // Delay next capture to respect MAX_PER_SECOND quota
        setTimeout(() => {
            capturing = false;
            processQueue();
        }, 200);
    });
}
