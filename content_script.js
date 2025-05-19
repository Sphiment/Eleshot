// content_script.js
let pickerActive = false;
let overlay = null;
let hoveredElem = null;
let prevOutline = '';

function startPicker() {
    if (pickerActive) return;
    pickerActive = true;

    // Create overlay to intercept events
    overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        zIndex: '2147483647',
        background: 'transparent',
        cursor: 'crosshair',
        pointerEvents: 'auto'
    });
    document.documentElement.appendChild(overlay);

    overlay.addEventListener('mousemove', onMouseMove, true);
    overlay.addEventListener('click', onClick, true);
}

function onMouseMove(e) {
    e.preventDefault();
    e.stopPropagation();
    // Temporarily allow events to reach underlying element
    overlay.style.pointerEvents = 'none';
    const elem = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = 'auto';
    if (!elem || elem === overlay) return;
    if (hoveredElem === elem) return;
    // Remove previous outline
    if (hoveredElem) {
        hoveredElem.style.outline = prevOutline;
    }
    // Save and set new outline
    prevOutline = elem.style.outline;
    elem.style.outline = '2px dashed #00f';
    hoveredElem = elem;
}

function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    // Temporarily allow click to determine element
    overlay.style.pointerEvents = 'none';
    const elem = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = 'auto';
    if (!elem || elem === overlay) return;
    // Display element name
    const tag = elem.tagName.toLowerCase();
    const id = elem.id ? `#${elem.id}` : '';
    const cls = elem.classList.length ? `.${[...elem.classList].join('.')}` : '';
    alert(`Element: ${tag}${id}${cls}`);
    stopPicker();
}

function stopPicker() {
    if (!pickerActive) return;
    pickerActive = false;
    if (hoveredElem) {
        hoveredElem.style.outline = prevOutline;
        hoveredElem = null;
    }
    if (overlay) {
        overlay.removeEventListener('mousemove', onMouseMove, true);
        overlay.removeEventListener('click', onClick, true);
        document.documentElement.removeChild(overlay);
        overlay = null;
    }
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'start-picker') {
        startPicker();
    }
});
