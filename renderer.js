const { ipcRenderer } = require('electron');

// Global Variables
let currentPage = 'landing';
let selectedType = null;
let selectedAlgorithm = 'fernet';
let selectedFilePath = null;
let currentEncryptedCacheKey = null; // Changed from file path to cache key
let currentDecryptedCacheKey = null; // Changed from file path to cache key
let isProcessing = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    showMatrixLoadingOverlay();
});

function showMatrixLoadingOverlay() {
    const overlay = document.getElementById('matrix-loading-overlay');
    const canvas = document.getElementById('matrix-loading-canvas');
    const textDiv = document.getElementById('matrix-loading-text');
    if (!overlay || !canvas || !textDiv) {
        finishMatrixLoadingOverlay();
        return;
    }
    // Matrix binary rain animation
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    const chars = '01';
    const fontSize = 22;
    let columns = Math.floor(window.innerWidth / fontSize);
    let drops = [];
    for (let x = 0; x < columns; x++) drops[x] = Math.random() * -50;
    function drawMatrix() {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(10, 20, 20, 0.18)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `bold ${fontSize}px monospace`;
        for (let i = 0; i < drops.length; i++) {
            const text = chars.charAt(Math.floor(Math.random() * chars.length));
            ctx.shadowColor = '#00ff41';
            ctx.shadowBlur = 16;
            ctx.fillStyle = '#00ff41';
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            ctx.shadowBlur = 0;
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i] += 1 + Math.random() * 0.5;
        }
    }
    let matrixInterval = setInterval(drawMatrix, 50);
    // Typewriter effect
    const loadingMsg = 'Initializing SecureZip...\nMilitary-grade encryption engine loading...';
    let idx = 0;
    textDiv.textContent = '';
    function typeWriter() {
        if (idx < loadingMsg.length) {
            textDiv.textContent += loadingMsg[idx] === '\n' ? '\n' : loadingMsg[idx];
            idx++;
            setTimeout(typeWriter, loadingMsg[idx-1] === '\n' ? 400 : 50);
        }
    }
    typeWriter();
    // Hide overlay after 5 seconds
    setTimeout(() => {
        clearInterval(matrixInterval);
        finishMatrixLoadingOverlay();
    }, 5000);
}

function finishMatrixLoadingOverlay() {
    const overlay = document.getElementById('matrix-loading-overlay');
    if (overlay) overlay.style.display = 'none';
    initializeEventListeners();
    initializeMatrixCanvas();
    initializeKeyboardShortcuts();
    showPage('landingPage');
}

// Initialize keyboard shortcuts
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+R or F5 for reset
        if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
            e.preventDefault();
            performReset();
        }
        
        // Escape key for reset
        if (e.key === 'Escape') {
            e.preventDefault();
            performReset();
        }
        
        // Ctrl+Shift+R for emergency reset
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            emergencyReset();
        }
    });
}

// Initialize all event listeners
function initializeEventListeners() {
    // Landing page buttons
    document.getElementById('encryptBtn').addEventListener('click', () => {
        showPage('encryptPage');
        currentPage = 'encrypt';
    });

    document.getElementById('decryptBtn').addEventListener('click', () => {
        showPage('decryptPage');
        currentPage = 'decrypt';
    });

    // Reset buttons
    document.getElementById('resetBtn').addEventListener('click', performReset);
    document.getElementById('resetBtn2').addEventListener('click', performReset);

    // Encryption type selection
    document.querySelectorAll('#typeSelection .type-card').forEach(card => {
        card.addEventListener('click', () => selectEncryptionType(card.dataset.type));
    });

    // Decryption type selection
    document.querySelectorAll('#decryptTypeSelection .type-card').forEach(card => {
        card.addEventListener('click', () => selectDecryptionType(card.dataset.type));
    });

    // Algorithm selection
    document.querySelectorAll('.algorithm-card').forEach(card => {
        card.addEventListener('click', () => selectAlgorithm(card.dataset.algorithm));
    });

    // Text input handling
    document.getElementById('inputText').addEventListener('input', validateTextInput);
    document.getElementById('decryptionKey').addEventListener('input', validateDecryptionInputs);
    document.getElementById('encryptedTextArea').addEventListener('input', validateDecryptionInputs);

    // Encryption buttons
    document.getElementById('startEncryption').addEventListener('click', startTextEncryption);
    document.getElementById('startFileEncryption').addEventListener('click', startFileEncryption);
    document.getElementById('startDecryption').addEventListener('click', startTextDecryption);
    document.getElementById('startFileDecryption').addEventListener('click', startFileDecryption);

    // File upload areas
    setupFileUpload('uploadArea', 'fileInfo', false);
    setupFileUpload('encryptedUploadArea', 'encryptedFileInfo', true);

    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => copyToClipboard(e.target.dataset.copy));
    });

    // File action buttons
    document.getElementById('showInFolder')?.addEventListener('click', showEncryptedInFolder);
    document.getElementById('downloadFile')?.addEventListener('click', downloadEncryptedFile);
    document.getElementById('showDecryptedInFolder')?.addEventListener('click', showDecryptedInFolder);
    document.getElementById('downloadDecryptedFile')?.addEventListener('click', downloadDecryptedFile);
}


// Matrix Canvas Animation (Cyberpunk Matrix Rain)
function initializeMatrixCanvas() {
    const canvas = document.getElementById('matrix-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Matrix characters
    const matrixChars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズヅブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
    const fontSize = 22;
    const columns = Math.floor(window.innerWidth / fontSize);
    let drops = [];
    for (let x = 0; x < columns; x++) {
        drops[x] = Math.random() * -50;
    }

    function drawMatrix() {
        // Cyberpunk glow background
        ctx.fillStyle = 'rgba(10, 20, 20, 0.18)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = `bold ${fontSize}px monospace`;
        for (let i = 0; i < drops.length; i++) {
            // Pick a random character
            const text = matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
            // Neon green with glow
            ctx.shadowColor = '#00ff41';
            ctx.shadowBlur = 16;
            ctx.fillStyle = '#00ff41';
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            ctx.shadowBlur = 0;

            // Randomize speed and reset
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i] += 1 + Math.random() * 0.5;
        }
    }

    setInterval(drawMatrix, 50);
    //rhrhytryhtt
}

// Page navigation functions
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    setTimeout(() => {
        const page = document.getElementById(pageId);
        page.classList.add('active');

        // Animate type cards when showing encrypt or decrypt page
        if (pageId === 'encryptPage' || pageId === 'decryptPage') {
            let typeCards;
            if (pageId === 'encryptPage') {
                typeCards = document.querySelectorAll('#typeSelection .type-card');
            } else {
                typeCards = document.querySelectorAll('#decryptTypeSelection .type-card');
            }
            typeCards.forEach(card => {
                card.classList.remove('animated');
            });
            typeCards.forEach((card, i) => {
                setTimeout(() => {
                    card.classList.add('animated');
                }, 180 * i);
            });
        }
    }, 100);
}

// Enhanced reset function with visual feedback
function performReset() {
    // Show loading briefly to give user feedback
    showLoading('Resetting application...');
    
    // Perform reset after short delay for better UX
    setTimeout(() => {
        resetToLanding();
        hideLoading();
    }, 800);
}

// Emergency reset function (can be called programmatically)
function emergencyReset() {
    console.log('Performing emergency reset...');
    
    // Force stop any ongoing operations
    isProcessing = false;
    selectedType = null;
    selectedAlgorithm = 'fernet';
    selectedFilePath = null;
    currentPage = 'landing';
    
    // Hide all overlays and notifications immediately
    document.getElementById('loadingOverlay').classList.add('hidden');
    document.getElementById('toast').classList.add('hidden');
    
    // Reset all forms
    resetForms();
    
    // Force return to landing page
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById('landingPage').classList.add('active');
    
    console.log('Emergency reset completed');
}

async function resetToLanding() {
    // Stop any ongoing processes
    setProcessingState(false);
    
    // Hide loading overlay if visible
    hideLoading();
    
    // Hide any toast notifications
    const toast = document.getElementById('toast');
    toast.classList.remove('show');
    toast.classList.add('hidden');
    
    // Reset all global variables
    currentPage = 'landing';
    selectedType = null;
    selectedAlgorithm = 'fernet';
    selectedFilePath = null;
    isProcessing = false;
    currentEncryptedCacheKey = null; // Clear cache keys
    currentDecryptedCacheKey = null;
    
    // Clear memory cache on backend
    try {
        await ipcRenderer.invoke('clear-cache');
    } catch (error) {
        console.log('Cache clear error (non-critical):', error);
    }
    
    // Reset all form states
    resetForms();
    
    // Navigate back to landing page with animation
    showPage('landingPage');
    
    // Show success toast
    setTimeout(() => {
        showToast('Application reset successfully!', 'success');
    }, 300);
}

function resetForms() {
    // Hide all conditional sections
    const sectionsToHide = [
        'textInput',
        'fileUpload',
        'encryptionResults',
        'decryptKeyInput',
        'encryptedTextInput',
        'encryptedFileUpload',
        'decryptionResults',
        'encryptedTextSection',
        'downloadSection',
        'decryptedTextSection',
        'downloadDecryptedSection',
        'filePathSection',
        'decryptedFilePathSection'
    ];
    
    sectionsToHide.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.classList.add('hidden');
        }
    });
    
    // Show initial sections for each page
    const typeSelection = document.getElementById('typeSelection');
    const decryptTypeSelection = document.getElementById('decryptTypeSelection');
    if (typeSelection) typeSelection.classList.remove('hidden');
    if (decryptTypeSelection) decryptTypeSelection.classList.remove('hidden');
    
    // Reset all selections
    document.querySelectorAll('.type-card.selected').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Reset default algorithm selection (always Fernet)
    selectedAlgorithm = 'fernet';
    
    // Clear all input fields
    const inputFields = [
        'inputText',
        'decryptionKey',
        'encryptedTextArea'
    ];
    
    inputFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = '';
        }
    });
    
    // Clear file info displays
    const fileInfoFields = [
        'fileInfo',
        'encryptedFileInfo'
    ];
    
    fileInfoFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.textContent = '';
        }
    });
    
    // Clear result displays
    const resultFields = [
        'algorithmUsed',
        'encryptedText',
        'encryptionKey',
        'decryptedText'
    ];
    
    resultFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.textContent = '';
        }
    });
    
    // Reset upload areas to default state
    const uploadAreas = document.querySelectorAll('.upload-area');
    uploadAreas.forEach(area => {
        area.classList.remove('dragover');
    });
    
    // Reset upload area content to defaults
    const uploadArea = document.getElementById('uploadArea');
    const encryptedUploadArea = document.getElementById('encryptedUploadArea');
    
    if (uploadArea) {
        const icon = uploadArea.querySelector('i');
        const text = uploadArea.querySelector('p');
        if (icon) icon.className = 'fas fa-cloud-upload-alt';
        if (text) text.textContent = 'Click to select file or drag & drop';
    }
    
    if (encryptedUploadArea) {
        const icon = encryptedUploadArea.querySelector('i');
        const text = encryptedUploadArea.querySelector('p');
        if (icon) icon.className = 'fas fa-file-upload';
        if (text) text.textContent = 'Click to select encrypted file';
    }
    
    // Reset upload title
    const uploadTitle = document.getElementById('uploadTitle');
    if (uploadTitle) {
        uploadTitle.innerHTML = '<i class="fas fa-file"></i> Select File to Encrypt';
    }
    
    // Disable all action buttons
    const actionButtons = [
        'startEncryption',
        'startFileEncryption',
        'startDecryption',
        'startFileDecryption'
    ];
    
    actionButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = true;
        }
    });
    
    // Remove any active states from buttons
    document.querySelectorAll('.main-btn').forEach(btn => {
        btn.style.transform = '';
        btn.style.boxShadow = '';
    });
    
    console.log('All forms and states have been reset');
}

// Selection functions
function selectEncryptionType(type) {
    selectedType = type;
    
    // Update UI
    document.querySelectorAll('#typeSelection .type-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.type === type);
    });
    
    // Always use Fernet algorithm
    selectedAlgorithm = 'fernet';
    
    // Skip algorithm selection and go directly to input
    if (type === 'text') {
        showTextInput();
        hideElement('fileUpload');
    } else if (type === 'file') {
        showFileUpload(type);
        hideElement('textInput');
    } else if (type === 'folder') {
        showFileUpload(type);
        hideElement('textInput');
    }
}

function selectDecryptionType(type) {
    selectedType = type;
    
    // Update UI
    document.querySelectorAll('#decryptTypeSelection .type-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.type === type);
    });
    
    // Show key input first
    showElement('decryptKeyInput');
    
    if (type === 'text') {
        showElement('encryptedTextInput');
        hideElement('encryptedFileUpload');
    } else {
        showElement('encryptedFileUpload');
        hideElement('encryptedTextInput');
    }
    
    validateDecryptionInputs();
}

// Show/Hide functions
function showElement(id) {
    document.getElementById(id).classList.remove('hidden');
}

function hideElement(id) {
    document.getElementById(id).classList.add('hidden');
}

function showTextInput() {
    showElement('textInput');
    validateTextInput();
}

function showFileUpload(type) {
    showElement('fileUpload');
    
    const uploadTitle = document.getElementById('uploadTitle');
    const uploadArea = document.getElementById('uploadArea');
    const uploadIcon = uploadArea.querySelector('i');
    const uploadText = uploadArea.querySelector('p');
    
    if (type === 'folder') {
        uploadTitle.innerHTML = '<i class="fas fa-folder"></i> Select Folder to Encrypt';
        uploadIcon.className = 'fas fa-folder-open';
        uploadText.textContent = 'Click to select folder';
    } else {
        uploadTitle.innerHTML = '<i class="fas fa-file"></i> Select File to Encrypt';
        uploadIcon.className = 'fas fa-cloud-upload-alt';
        uploadText.textContent = 'Click to select file or drag & drop';
    }
}

// Validation functions
function validateTextInput() {
    const text = document.getElementById('inputText').value.trim();
    const button = document.getElementById('startEncryption');
    button.disabled = !text || isProcessing;
}

function validateDecryptionInputs() {
    const key = document.getElementById('decryptionKey').value.trim();
    const encrypted = document.getElementById('encryptedTextArea').value.trim();
    const button = document.getElementById('startDecryption');
    
    button.disabled = !key || !encrypted || isProcessing;
}

// File upload setup
function setupFileUpload(areaId, infoId, isEncrypted = false) {
    const area = document.getElementById(areaId);
    const info = document.getElementById(infoId);
    
    area.addEventListener('click', () => {
        if (selectedType === 'folder' && !isEncrypted) {
            selectFolder(infoId);
        } else {
            selectFile(infoId, isEncrypted);
        }
    });
    
    // Drag and drop functionality
    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.classList.add('dragover');
    });
    
    area.addEventListener('dragleave', () => {
        area.classList.remove('dragover');
    });
    
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelection(files[0], infoId, isEncrypted);
        }
    });
}

async function selectFile(infoId, isEncrypted = false) {
    try {
        const filePath = await ipcRenderer.invoke('select-file');
        if (filePath) {
            handleFileSelection({ path: filePath }, infoId, isEncrypted);
        }
    } catch (error) {
        showToast('Error selecting file: ' + error.message, 'error');
    }
}

async function selectFolder(infoId) {
    try {
        const folderPath = await ipcRenderer.invoke('select-folder');
        if (folderPath) {
            handleFileSelection({ path: folderPath, isFolder: true }, infoId, false);
        }
    } catch (error) {
        showToast('Error selecting folder: ' + error.message, 'error');
    }
}

function handleFileSelection(file, infoId, isEncrypted = false) {
    const info = document.getElementById(infoId);
    const filePath = file.path || file.name;
    
    selectedFilePath = filePath;
    info.textContent = `Selected: ${filePath.split('\\').pop() || filePath.split('/').pop()}`;
    
    // Enable corresponding button
    if (isEncrypted) {
        document.getElementById('startFileDecryption').disabled = false;
    } else {
        document.getElementById('startFileEncryption').disabled = false;
    }
}

// Encryption functions
async function startTextEncryption() {
    if (isProcessing) return;
    const text = document.getElementById('inputText').value.trim();
    if (!text) return;
    setProcessingState(true);
    showLoading('Encrypting your text...');
    try {
        const result = await ipcRenderer.invoke('encrypt-text', text, selectedAlgorithm);
        hideLoading();
        if (result.success) {
            showEncryptionResults(result);
        } else {
            showToast('Encryption failed: ' + getFriendlyError(result.error), 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Encryption error: ' + getFriendlyError(error.message), 'error');
    }
    setProcessingState(false);
}

async function startFileEncryption() {
    if (isProcessing || !selectedFilePath) return;
    setProcessingState(true);
    let fileToEncrypt = selectedFilePath;
    try {
        // If it's a folder, compress it first
        if (selectedType === 'folder') {
            showLoading('Compressing folder to ZIP...');
            const compressionResult = await ipcRenderer.invoke('compress-folder', selectedFilePath);
            if (!compressionResult.success) {
                throw new Error('Failed to compress folder: ' + getFriendlyError(compressionResult.error));
            }
            fileToEncrypt = compressionResult.zipPath;
            showLoading('Encrypting compressed folder...');
            window.tempZipPath = compressionResult.zipPath;
        } else {
            showLoading('Encrypting your file...');
        }
        const result = await ipcRenderer.invoke('encrypt-file', fileToEncrypt, selectedAlgorithm);
        hideLoading();
        if (result.success) {
            showFileEncryptionResults(result);
            if (selectedType === 'folder' && window.tempZipPath) {
                try {
                    await ipcRenderer.invoke('cleanup-temp-file', window.tempZipPath);
                    window.tempZipPath = null;
                } catch (error) {
                    console.log('Temp file cleanup error (non-critical):', error);
                }
            }
        } else {
            showToast('File encryption failed: ' + getFriendlyError(result.error), 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('File encryption error: ' + getFriendlyError(error.message), 'error');
    }
    setProcessingState(false);
}

async function startTextDecryption() {
    if (isProcessing) return;
    const key = document.getElementById('decryptionKey').value.trim();
    const encrypted = document.getElementById('encryptedTextArea').value.trim();
    if (!key || !encrypted) return;
    setProcessingState(true);
    showLoading('Decrypting your text...');
    try {
        // Always use Fernet algorithm
        const result = await ipcRenderer.invoke('decrypt-text', encrypted, key, 'fernet');
        hideLoading();
        if (result.success) {
            showDecryptionResults(result);
        } else {
            showToast('Decryption failed: ' + getFriendlyError(result.error, 'text'), 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Decryption error: ' + getFriendlyError(error.message), 'error');
    }
    setProcessingState(false);
}

async function startFileDecryption() {
    if (isProcessing || !selectedFilePath) return;
    const key = document.getElementById('decryptionKey').value.trim();
    if (!key) return;
    setProcessingState(true);
    showLoading('Decrypting your file...');
    try {
        // Always use Fernet algorithm
        const result = await ipcRenderer.invoke('decrypt-file', selectedFilePath, key, 'fernet');
        hideLoading();
        if (result.success) {
            showFileDecryptionResults(result);
        } else {
            showToast('File decryption failed: ' + getFriendlyError(result.error, 'file'), 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('File decryption error: ' + getFriendlyError(error.message), 'error');
    }
    setProcessingState(false);
}
// Map technical errors to user-friendly messages
function getFriendlyError(error, type) {
    if (!error) return 'Unknown error.';
    const msg = error.toString().toLowerCase();
    if (msg.includes('invalid key')) return type === 'file' ? 'Invalid encryption key or invalid file.' : 'Invalid encryption key or invalid data.';
    if (msg.includes('invalid token')) return type === 'file' ? 'Invalid encryption key or invalid file.' : 'Invalid encryption key or invalid data.';
    if (msg.includes('wrong_final_block_length') || msg.includes('bad decrypt') || msg.includes('cipher') || msg.includes('openssl')) return type === 'file' ? 'Invalid encryption key or invalid file.' : 'Invalid encryption key or invalid data.';
    if (msg.includes('not found')) return 'File or data not found.';
    if (msg.includes('permission')) return 'Permission denied. Please check your file access rights.';
    if (msg.includes('no such file')) return 'The selected file does not exist.';
    if (msg.includes('unsupported')) return 'Unsupported file type or operation.';
    if (msg.includes('corrupt')) return type === 'file' ? 'The file appears to be corrupted.' : 'The data appears to be corrupted.';
    if (msg.includes('too large')) return 'The file is too large to process.';
    if (msg.includes('empty')) return 'Input is empty. Please provide valid data.';
    if (msg.includes('decrypt')) return type === 'file' ? 'Decryption failed. Please check your key and file.' : 'Decryption failed. Please check your key and data.';
    if (msg.includes('encrypt')) return 'Encryption failed. Please check your input.';
    if (msg.includes('zip')) return 'Error compressing or decompressing the folder.';
    if (msg.includes('timeout')) return 'Operation timed out. Please try again.';
    if (msg.includes('format')) return 'Invalid file or data format.';
    // Add more mappings as needed
    return error;
}

// Results display functions
function showEncryptionResults(result) {
    document.getElementById('algorithmUsed').textContent = `Algorithm Used: ${result.algorithm}`;
    document.getElementById('encryptedText').textContent = result.encryptedText;
    document.getElementById('encryptionKey').textContent = result.key;
    
    // Show encrypted text section for text encryption
    showElement('encryptedTextSection');
    hideElement('downloadSection');
    hideElement('filePathSection');
    
    hideElement('typeSelection');
    hideElement('algorithmSelection');
    hideElement('textInput');
    showElement('encryptionResults');
}

function showFileEncryptionResults(result) {
    document.getElementById('algorithmUsed').textContent = `Algorithm Used: ${result.algorithm}`;
    document.getElementById('encryptionKey').textContent = result.key;
    
    // Hide the encrypted text section for files
    hideElement('encryptedTextSection');
    
    // Store cache key for download functionality
    currentEncryptedCacheKey = result.cacheKey;
    
    // Hide file path section for security
    hideElement('filePathSection');
    
    // Show download section for files
    showElement('downloadSection');
    
    hideElement('typeSelection');
    hideElement('algorithmSelection');
    hideElement('fileUpload');
    showElement('encryptionResults');
}

function showDecryptionResults(result) {
    document.getElementById('decryptedText').textContent = result.decryptedText;
    
    // Show decrypted text section for text decryption
    showElement('decryptedTextSection');
    hideElement('downloadDecryptedSection');
    hideElement('decryptedFilePathSection');
    
    hideElement('decryptTypeSelection');
    hideElement('decryptKeyInput');
    hideElement('encryptedTextInput');
    hideElement('encryptedFileUpload');
    showElement('decryptionResults');
}

function showFileDecryptionResults(result) {
    // Hide the decrypted text section for files
    hideElement('decryptedTextSection');
    
    // Store cache key for download functionality
    currentDecryptedCacheKey = result.cacheKey;
    
    // Hide decrypted file path section for security
    hideElement('decryptedFilePathSection');
    
    // Show download section for files
    showElement('downloadDecryptedSection');
    
    hideElement('decryptTypeSelection');
    hideElement('decryptKeyInput');
    hideElement('encryptedFileUpload');
    showElement('decryptionResults');
}

// Utility functions
function setProcessingState(processing) {
    isProcessing = processing;
    
    // Update all action buttons
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
        if (processing) {
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.style.cursor = 'not-allowed';
        } else {
            btn.style.opacity = '';
            btn.style.cursor = '';
            // Re-validate based on current state
            if (btn.id === 'startEncryption') {
                validateTextInput();
            } else if (btn.id === 'startDecryption') {
                validateDecryptionInputs();
            } else if (btn.id === 'startFileEncryption') {
                btn.disabled = !selectedFilePath;
            } else if (btn.id === 'startFileDecryption') {
                btn.disabled = !selectedFilePath || !document.getElementById('decryptionKey').value.trim();
            }
        }
    });
    
    // Disable/enable reset buttons during processing
    const resetButtons = document.querySelectorAll('.reset-btn');
    resetButtons.forEach(btn => {
        btn.disabled = processing;
        if (processing) {
            btn.style.opacity = '0.6';
            btn.style.cursor = 'not-allowed';
        } else {
            btn.style.opacity = '';
            btn.style.cursor = '';
        }
    });
    
    // Disable/enable type and algorithm selection during processing
    const selectableCards = document.querySelectorAll('.type-card, .algorithm-card');
    selectableCards.forEach(card => {
        if (processing) {
            card.style.pointerEvents = 'none';
            card.style.opacity = '0.6';
        } else {
            card.style.pointerEvents = '';
            card.style.opacity = '';
        }
    });
}

function showLoading(message) {
    document.getElementById('loadingText').textContent = message;
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const icon = toast.querySelector('i');
    
    toastMessage.textContent = message;
    
    if (type === 'error') {
        icon.className = 'fas fa-exclamation-circle';
        toast.style.background = 'linear-gradient(145deg, #ff4444, #cc3333)';
    } else {
        icon.className = 'fas fa-check-circle';
        toast.style.background = 'linear-gradient(145deg, #00ff41, #00cc33)';
    }
    
    toast.classList.remove('hidden');
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 3000);
}

function copyToClipboard(type) {
    let textToCopy = '';
    
    if (type === 'encrypted') {
        textToCopy = document.getElementById('encryptedText').textContent;
    } else if (type === 'key') {
        textToCopy = document.getElementById('encryptionKey').textContent;
    } else if (type === 'decrypted') {
        textToCopy = document.getElementById('decryptedText').textContent;
    }
    
    if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast('Copied to clipboard!');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('Copied to clipboard!');
        });
    }
}

// Add some visual effects for better UX
function addButtonClickEffect(button) {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
}

// Add ripple effect to all buttons
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('button').forEach(addButtonClickEffect);
});

// Add CSS for ripple effect
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
    
    button {
        position: relative;
        overflow: hidden;
    }
`;
document.head.appendChild(rippleStyle);

// Utility functions
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showError(message) {
    console.error(message);
    showToast('Error: ' + message, 'error');
}

// Download functions
async function downloadEncryptedFile() {
    if (!currentEncryptedCacheKey) {
        showToast('No encrypted file available for download', 'error');
        return;
    }
    
    try {
        const result = await ipcRenderer.invoke('download-file', currentEncryptedCacheKey);
        if (result.success) {
            showToast('File saved successfully!', 'success');
            
            // Clean up any temporary ZIP file
            if (window.tempZipPath) {
                try {
                    await ipcRenderer.invoke('cleanup-temp-file', window.tempZipPath);
                    window.tempZipPath = null;
                } catch (error) {
                    console.log('Temp file cleanup error (non-critical):', error);
                }
            }
            
            // Clear cache key after successful download
            currentEncryptedCacheKey = null;
        } else {
            showToast('Save failed: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Save error: ' + error.message, 'error');
    }
}

async function downloadDecryptedFile() {
    if (!currentDecryptedCacheKey) {
        showToast('No decrypted file available for download', 'error');
        return;
    }
    
    try {
        const result = await ipcRenderer.invoke('download-file', currentDecryptedCacheKey);
        if (result.success) {
            showToast('File saved successfully!', 'success');
            // Clear cache key after successful download
            currentDecryptedCacheKey = null;
        } else {
            showToast('Save failed: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Save error: ' + error.message, 'error');
    }
}