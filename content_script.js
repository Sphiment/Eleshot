// content_script.js
let pickerActive = false;
let overlay = null;
let hoveredElem = null;
let prevOutline = '';
let highlightBox = null;
let dimensionBox = null;
let screenshotPreviewModal = null;
let capturedImage = null;

// Added formats for saving
const imageFormats = [
    { value: 'png', label: 'PNG', mimeType: 'image/png' },
    { value: 'jpeg', label: 'JPEG', mimeType: 'image/jpeg' },
    { value: 'webp', label: 'WebP', mimeType: 'image/webp' },
    { value: 'bmp', label: 'BMP', mimeType: 'image/bmp' }
];

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
        boxSizing: 'border-box',            // ensure borders/outlines align inside the dims
        outline: '2px dashed #00f',         // use outline instead of border to avoid half-pixel centering
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
    const scale = window.devicePixelRatio || 1;
    const left   = Math.round(rect.left   * scale) / scale;
    const top    = Math.round(rect.top    * scale) / scale;
    const width  = Math.round(rect.width  * scale) / scale;
    const height = Math.round(rect.height * scale) / scale;
    highlightBox.style.left   = `${left}px`;
    highlightBox.style.top    = `${top}px`;
    highlightBox.style.width  = `${width}px`;
    highlightBox.style.height = `${height}px`;

    // Update dimension box text and position
    const w = Math.round(rect.width * scale);
    const h = Math.round(rect.height * scale);
    dimensionBox.textContent = `${w}×${h}`;
    dimensionBox.style.display = 'block';
    const boxTop = rect.top + rect.height + 10;
    dimensionBox.style.left = `${rect.left}px`;
    dimensionBox.style.top = `${boxTop > 0 ? boxTop : rect.top}px`;
}

function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    // Find clicked element and bounds
    overlay.style.pointerEvents = 'none';
    const elem = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = 'auto';
    if (!elem || elem === overlay) return;
    const rect = elem.getBoundingClientRect();

    // Hide highlight (but keep overlay active to block hover/click)
    highlightBox.style.display = 'none';
    dimensionBox.style.display = 'none';

    // Delay capture slightly to ensure DOM updates
    setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'capture-element' }, (response) => {
            if (!response || !response.img) return;
            const img = new Image();
            img.onload = () => {
                const scale = window.devicePixelRatio || 1;
                // Use consistent rounding via Math.round to avoid one-pixel drift
                const sx = Math.round(rect.left * scale);
                const sy = Math.round(rect.top * scale);
                const sw = Math.round(rect.width * scale);
                const sh = Math.round(rect.height * scale);
                const canvas = document.createElement('canvas');
                canvas.width = sw;
                canvas.height = sh;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
                
                // Store element information for the filename when saving
                const tag = elem.tagName.toLowerCase();
                const id = elem.id ? `#${elem.id}` : '';
                const cls = elem.classList.length ? `.${[...elem.classList].join('.')}` : '';
                const filenameBase = `${tag}${id}${cls}`;
                
                // Create preview popup instead of immediately downloading
                showScreenshotPreview(canvas, filenameBase);
            };
            img.src = response.img;
        });
    }, 10);
}

// New function to show screenshot preview with options
function showScreenshotPreview(canvas, filenameBase) {
    // Remove the overlay
    if (overlay) {
        overlay.removeEventListener('mousemove', onMouseMove, true);
        overlay.removeEventListener('click', onClick, true);
        document.documentElement.removeChild(overlay);
        overlay = null;
        highlightBox = null;
        dimensionBox = null;
    }
    pickerActive = false;
    
    // Store canvas reference
    capturedImage = {
        canvas: canvas,
        filenameBase: filenameBase
    };
    
    // Create modal container
    createPreviewModal();
}

// Create the preview modal with options
function createPreviewModal() {    // Create modal backdrop
    screenshotPreviewModal = document.createElement('div');
    Object.assign(screenshotPreviewModal.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '2147483647',
        fontFamily: 'Arial, sans-serif'
    });      // Create modal content
    const modalContent = document.createElement('div');
    Object.assign(modalContent.style, {
        backgroundColor: '#111',
        color: '#fff',
        borderRadius: '8px',
        padding: '20px',
        width: '300px',
        height: '300px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
    });
    
    // Add header
    const modalHeader = document.createElement('div');
    Object.assign(modalHeader.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
    });
      const modalTitle = document.createElement('h3');
    modalTitle.textContent = 'Screenshot Preview';
    Object.assign(modalTitle.style, {
        margin: '0',
        color: '#fff',
        fontSize: '18px'
    });
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    Object.assign(closeButton.style, {
        background: 'none',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        color: '#fff',
        padding: '0 5px'
    });
    closeButton.addEventListener('click', closePreviewModal);
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);    // Add preview container
    const previewContainer = document.createElement('div');
    Object.assign(previewContainer.style, {
        textAlign: 'center',
        marginBottom: '15px',
        overflow: 'auto',
        height: '350px',
        padding: '10px',
        backgroundColor: '#111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    });
      // Add image to preview
    const previewImg = document.createElement('img');
    previewImg.src = capturedImage.canvas.toDataURL('image/png');
    Object.assign(previewImg.style, {
        maxWidth: '100%',
        maxHeight: '100%',
        width: 'auto',
        height: 'auto',
        display: 'block',
        margin: '0 auto',
        objectFit: 'contain'
    });
    previewContainer.appendChild(previewImg);
    
    // Add options container
    const optionsContainer = document.createElement('div');
    Object.assign(optionsContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    });

    // Filename input
    const filenameContainer = document.createElement('div');
    Object.assign(filenameContainer.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    });

    const filenameLabel = document.createElement('label');
    filenameLabel.textContent = 'Filename:';
    Object.assign(filenameLabel.style, {
        fontWeight: 'bold',
        minWidth: '80px', // Keep consistent with format label
        color: '#fff'
    });

    const filenameInput = document.createElement('input');
    filenameInput.type = 'text';
    filenameInput.value = capturedImage.filenameBase; // Default value
    filenameInput.id = 'eleshot-filename-input'; // ID to retrieve value later
    Object.assign(filenameInput.style, {
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #333',
        backgroundColor: '#222',
        color: '#fff',
        flexGrow: '1' // Allow input to take available space
    });

    filenameContainer.appendChild(filenameLabel);
    filenameContainer.appendChild(filenameInput);
    
    // Format selection
    const formatContainer = document.createElement('div');
    Object.assign(formatContainer.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    });
      const formatLabel = document.createElement('label');
    formatLabel.textContent = 'Format:';
    Object.assign(formatLabel.style, {
        fontWeight: 'bold',
        minWidth: '80px',
        color: '#fff'
    });
      const formatSelect = document.createElement('select');
    Object.assign(formatSelect.style, {
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #333',
        backgroundColor: '#222',
        color: '#fff'
    });
    
    // Add format options
    imageFormats.forEach(format => {
        const option = document.createElement('option');
        option.value = format.value;
        option.textContent = format.label;
        formatSelect.appendChild(option);
    });
    
    formatContainer.appendChild(formatLabel);
    formatContainer.appendChild(formatSelect);
    
    // Add buttons container
    const buttonsContainer = document.createElement('div');
    Object.assign(buttonsContainer.style, {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '15px'
    });    // Copy to clipboard button
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy to Clipboard';
    Object.assign(copyButton.style, {
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: '#28783c',
        color: 'white',
        cursor: 'pointer'
    });
    copyButton.addEventListener('click', copyToClipboard);
    
    // Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Image';
    Object.assign(saveButton.style, {
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: '#28783c',
        color: 'white',
        cursor: 'pointer'
    });
    saveButton.addEventListener('click', () => saveImage(formatSelect.value));
    
    buttonsContainer.appendChild(copyButton);
    buttonsContainer.appendChild(saveButton);
    
    // Assemble all parts
    optionsContainer.appendChild(filenameContainer); // Add filename input first
    optionsContainer.appendChild(formatContainer);
    optionsContainer.appendChild(buttonsContainer);
    
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(previewContainer);
    modalContent.appendChild(optionsContainer);
    
    screenshotPreviewModal.appendChild(modalContent);
    document.body.appendChild(screenshotPreviewModal);
}

// Save the image with the selected format
function saveImage(format) {
    if (!capturedImage) return;
    
    const filenameInputElement = document.getElementById('eleshot-filename-input');
    let customFilenameBase = capturedImage.filenameBase; // Default
    if (filenameInputElement && filenameInputElement.value.trim() !== '') {
        customFilenameBase = filenameInputElement.value.trim();
    }

    const selectedFormat = imageFormats.find(fmt => fmt.value === format) || imageFormats[0];
    const dataUrl = capturedImage.canvas.toDataURL(selectedFormat.mimeType);
    
    // Trigger download
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${customFilenameBase}.${format}`; // Use custom or default filename base
    document.body.appendChild(a);
    a.click();
    a.remove();
    
    // Close modal after saving
    closePreviewModal();
}

// Copy the image to clipboard
function copyToClipboard() {
    if (!capturedImage) return;
    
    capturedImage.canvas.toBlob(blob => {
        try {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(() => {
                // Show success message
                showToast('Image copied to clipboard');
            }).catch(err => {
                console.error('Could not copy image: ', err);
                showToast('Failed to copy to clipboard', true);
            });
        } catch (e) {
            console.error('Clipboard API not supported: ', e);
            showToast('Clipboard feature not supported in this browser', true);
        }
    });
}

// Show toast notification
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: isError ? '#f44336' : '#28783c',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '4px',
        zIndex: '2147483647',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px'
    });
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => document.body.removeChild(toast), 500);
    }, 3000);
}

// Close the preview modal
function closePreviewModal() {
    if (screenshotPreviewModal) {
        document.body.removeChild(screenshotPreviewModal);
        screenshotPreviewModal = null;
    }
    capturedImage = null;
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
