// content_script.js
let pickerActive = false;
let overlay = null;
let hoveredElem = null;
let prevOutline = '';
let highlightBox = null;
let dimensionBox = null;

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

    // Create highlight box above everything
    highlightBox = document.createElement('div');
    Object.assign(highlightBox.style, {
        position: 'fixed',
        border: '2px dashed #00f',
        pointerEvents: 'none',
        zIndex: '2147483648',
        display: 'none'
    });
    overlay.appendChild(highlightBox);

    // Create dimension box for size info
    dimensionBox = document.createElement('div');
    Object.assign(dimensionBox.style, {
        position: 'fixed',
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        padding: '2px 4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        borderRadius: '2px',
        pointerEvents: 'none',
        zIndex: '2147483649',
        display: 'none'
    });
    overlay.appendChild(dimensionBox);

    overlay.addEventListener('mousemove', onMouseMove, true);
    overlay.addEventListener('click', onClick, true);
}

function onMouseMove(e) {
    e.preventDefault();
    e.stopPropagation();
    overlay.style.pointerEvents = 'none';
    const elem = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = 'auto';
    if (!elem || elem === overlay) {
        highlightBox.style.display = 'none';
        dimensionBox.style.display = 'none';
        return;
    }
    const rect = elem.getBoundingClientRect();
    // Position highlight box to match element bounds
    highlightBox.style.display = 'block';
    highlightBox.style.left = `${rect.left}px`;
    highlightBox.style.top = `${rect.top}px`;
    highlightBox.style.width = `${rect.width}px`;
    highlightBox.style.height = `${rect.height}px`;

    // Update dimension box text and position
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    dimensionBox.textContent = `${w}×${h}`;
    dimensionBox.style.display = 'block';
    const boxTop = rect.top - 24;
    dimensionBox.style.left = `${rect.left}px`;
    dimensionBox.style.top = `${boxTop > 0 ? boxTop : rect.top}px`;
}

function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
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
    // Remove overlay, highlight and dimension boxes
    if (overlay) {
        overlay.removeEventListener('mousemove', onMouseMove, true);
        overlay.removeEventListener('click', onClick, true);
        document.documentElement.removeChild(overlay);
        overlay = null;
        highlightBox = null;
        dimensionBox = null;
    }
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'start-picker') {
        startPicker();
    }
});
