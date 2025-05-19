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
