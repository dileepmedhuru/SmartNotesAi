// DOM Elements
const noteInput = document.getElementById('noteInput');
const wordCount = document.getElementById('wordCount');
const summarizeBtn = document.getElementById('summarizeBtn');
const keyPointsBtn = document.getElementById('keyPointsBtn');
const clearBtn = document.getElementById('clearBtn');
const outputSection = document.getElementById('outputSection');
const summaryResult = document.getElementById('summaryResult');
const keyPointsResult = document.getElementById('keyPointsResult');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const outputStats = document.getElementById('outputStats');
const summaryType = document.getElementById('summaryType');
const maxLength = document.getElementById('maxLength');
const minLength = document.getElementById('minLength');

// File upload elements
const fileInput = document.getElementById('fileInput');
const fileDropZone = document.getElementById('fileDropZone');
const browseBtn = document.getElementById('browseBtn');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const fileType = document.getElementById('fileType');
const extractedWords = document.getElementById('extractedWords');
const removeFileBtn = document.getElementById('removeFileBtn');

// Upload tab elements
const uploadTabBtns = document.querySelectorAll('.upload-tab-btn');
const uploadTabContents = document.querySelectorAll('.upload-tab-content');

// Download elements
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const downloadTextBtn = document.getElementById('downloadTextBtn');

// New elements for enhanced features
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const targetLanguage = document.getElementById('targetLanguage');
const detectLanguageBtn = document.getElementById('detectLanguageBtn');
const languageInfo = document.getElementById('languageInfo');
const detectedLanguage = document.getElementById('detectedLanguage');
const fileLanguage = document.getElementById('fileLanguage');
const fileLanguageName = document.getElementById('fileLanguageName');
const summaryLanguage = document.getElementById('summaryLanguage');
const summaryLanguageName = document.getElementById('summaryLanguageName');

// State
let currentSummary = '';
let currentKeyPoints = [];
let currentOriginalText = '';
let currentFileMetadata = {};
let isFileUploaded = false;
let supportedLanguages = {};
let currentDetectedLanguage = 'en';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    initializeEventListeners();
    initializeTheme();
    await loadSupportedLanguages();
    updateWordCount();
    validateForm();
    loadDraft();
}

// Event Listeners
function initializeEventListeners() {
    // Input events
    noteInput.addEventListener('input', function() {
        updateWordCount();
        validateForm();
        if (!isFileUploaded) {
            autoSave();
        }
        debounceLanguageDetection();
    });
    
    noteInput.addEventListener('paste', function() {
        setTimeout(() => {
            updateWordCount();
            validateForm();
            debounceLanguageDetection();
        }, 10);
    });
    
    // Button events
    summarizeBtn.addEventListener('click', summarizeText);
    keyPointsBtn.addEventListener('click', extractKeyPoints);
    clearBtn.addEventListener('click', clearAll);
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Language detection
    detectLanguageBtn.addEventListener('click', detectTextLanguage);
    
    // Tab events
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // Upload tab events
    uploadTabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            switchUploadTab(this.dataset.tab);
        });
    });
    
    // File upload events
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    removeFileBtn.addEventListener('click', removeFile);
    
    // Drag and drop events
    fileDropZone.addEventListener('dragover', handleDragOver);
    fileDropZone.addEventListener('dragleave', handleDragLeave);
    fileDropZone.addEventListener('drop', handleFileDrop);
    fileDropZone.addEventListener('click', () => fileInput.click());
    
    // Copy button events
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            copyToClipboard(this.dataset.copy);
        });
    });
    
    // Download events
    downloadPdfBtn.addEventListener('click', downloadPdf);
    downloadTextBtn.addEventListener('click', downloadText);
    
    // Form validation
    maxLength.addEventListener('input', validateLengths);
    minLength.addEventListener('input', validateLengths);
    
    // Summary type change
    summaryType.addEventListener('change', adjustLengthsForType);
}

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('smartnotes-theme') || 'light';
    setTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('smartnotes-theme', theme);
}

// Language Management
async function loadSupportedLanguages() {
    try {
        const response = await fetch('/languages');
        const result = await response.json();
        
        if (result.success) {
            supportedLanguages = result.languages;
            populateLanguageDropdown();
        }
    } catch (error) {
        console.error('Failed to load supported languages:', error);
        // Use fallback languages
        supportedLanguages = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'zh': 'Chinese'
        };
        populateLanguageDropdown();
    }
}

function populateLanguageDropdown() {
    // Clear existing options except the first one
    while (targetLanguage.children.length > 1) {
        targetLanguage.removeChild(targetLanguage.lastChild);
    }
    
    // Add language options
    Object.entries(supportedLanguages).forEach(([code, name]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        targetLanguage.appendChild(option);
    });
}

let languageDetectionTimeout;
function debounceLanguageDetection() {
    clearTimeout(languageDetectionTimeout);
    languageDetectionTimeout = setTimeout(async () => {
        const text = noteInput.value.trim();
        if (text && text.length > 50 && !isFileUploaded) {
            await detectTextLanguage(false); // Silent detection
        }
    }, 1000);
}

async function detectTextLanguage(showToast = true) {
    const text = noteInput.value.trim();
    
    if (!text) {
        if (showToast) showToastMessage('Please enter some text for language detection', 'warning');
        return;
    }
    
    if (showToast) showLoading('Detecting language...');
    
    try {
        const response = await fetch('/detect-language', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: text })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentDetectedLanguage = result.detected_language;
            updateLanguageDisplay(result.detected_language, result.language_name);
            
            if (showToast) {
                showToastMessage(`Detected language: ${result.language_name}`, 'info');
            }
        }
    } catch (error) {
        console.error('Language detection error:', error);
        if (showToast) {
            showToastMessage('Failed to detect language', 'error');
        }
    } finally {
        if (showToast) hideLoading();
    }
}

function updateLanguageDisplay(langCode, langName) {
    detectedLanguage.textContent = `Detected: ${langName}`;
    languageInfo.style.display = 'block';
}

// Upload tab switching
function switchUploadTab(tabName) {
    uploadTabBtns.forEach(btn => {
        btn.classList.remove('active');
    });
    uploadTabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    if (tabName === 'text-input' && isFileUploaded) {
        // Clear file state when switching back to text input
        clearFileState();
    }
}

// File upload handlers
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        uploadFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    fileDropZone.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    fileDropZone.classList.remove('drag-over');
}

function handleFileDrop(event) {
    event.preventDefault();
    fileDropZone.classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        uploadFile(files[0]);
    }
}

// File upload function
async function uploadFile(file) {
    if (!validateFile(file)) {
        return;
    }
    
    showLoading('Uploading and processing file...');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update UI with extracted text
            noteInput.value = result.text;
            currentOriginalText = result.text;
            currentFileMetadata = {
                filename: result.filename,
                word_count: result.word_count,
                file_type: result.file_type,
                detected_language: result.detected_language,
                language_name: result.language_name
            };
            
            // Show file info
            displayFileInfo(result);
            
            // Update language display
            currentDetectedLanguage = result.detected_language;
            updateLanguageDisplay(result.detected_language, result.language_name);
            
            // Update state
            isFileUploaded = true;
            updateWordCount();
            validateForm();
            
            showToastMessage(`File processed successfully! Extracted ${result.word_count} words.`, 'success');
        } else {
            showToastMessage(result.error || 'File upload failed', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showToastMessage('File upload failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// File validation - Updated to include PowerPoint files
function validateFile(file) {
    const allowedTypes = [
        'application/pdf', 
        'text/plain', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'application/msword',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint'
    ];
    const maxSize = 16 * 1024 * 1024; // 16MB
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|txt|docx|doc|pptx|ppt)$/i)) {
        showToastMessage('Please upload a PDF, TXT, DOCX, or PPTX file.', 'error');
        return false;
    }
    
    if (file.size > maxSize) {
        showToastMessage('File size must be less than 16MB.', 'error');
        return false;
    }
    
    return true;
}

// Display file info with language information
function displayFileInfo(fileData) {
    fileName.textContent = fileData.filename;
    fileSize.textContent = formatFileSize(fileData.file_size || 0);
    fileType.textContent = fileData.file_type.toUpperCase();
    extractedWords.textContent = fileData.word_count;
    
    // Show language information if available
    if (fileData.detected_language && fileData.language_name) {
        fileLanguageName.textContent = fileData.language_name;
        fileLanguage.style.display = 'flex';
    } else {
        fileLanguage.style.display = 'none';
    }
    
    // Update file icon based on type
    const fileIcon = fileInfo.querySelector('.file-icon');
    fileIcon.className = `file-icon ${fileData.file_type}`;
    
    fileInfo.style.display = 'block';
}

// Remove file
function removeFile() {
    clearFileState();
    noteInput.value = '';
    currentOriginalText = '';
    currentFileMetadata = {};
    isFileUploaded = false;
    updateWordCount();
    validateForm();
    fileInput.value = '';
    languageInfo.style.display = 'none';
    showToastMessage('File removed', 'info');
}

// Clear file state
function clearFileState() {
    fileInfo.style.display = 'none';
    fileDropZone.style.display = 'block';
    fileLanguage.style.display = 'none';
}

// Text processing functions with language support
async function summarizeText() {
    const text = noteInput.value.trim();
    
    if (!text) {
        showToastMessage('Please enter some text to summarize', 'warning');
        return;
    }
    
    if (text.split(' ').length < 10) {
        showToastMessage('Text is too short to summarize effectively', 'warning');
        return;
    }
    
    showLoading('Generating AI summary...');
    
    try {
        const requestData = {
            text: text,
            max_length: parseInt(maxLength.value),
            min_length: parseInt(minLength.value),
            summary_type: summaryType.value
        };
        
        // Add target language if selected
        if (targetLanguage.value) {
            requestData.target_language = targetLanguage.value;
        }
        
        const response = await fetch('/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentSummary = result.summary;
            currentOriginalText = text;
            
            displaySummary(result);
            showOutputSection();
            switchTab('summary');
            
            showToastMessage('Summary generated successfully!', 'success');
        } else {
            showToastMessage(result.error || 'Failed to generate summary', 'error');
        }
    } catch (error) {
        console.error('Summarization error:', error);
        showToastMessage('Failed to generate summary. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function extractKeyPoints() {
    const text = noteInput.value.trim();
    
    if (!text) {
        showToastMessage('Please enter some text to extract key points', 'warning');
        return;
    }
    
    showLoading('Extracting key points...');
    
    try {
        const requestData = {
            text: text,
            num_points: 5
        };
        
        // Add target language if selected
        if (targetLanguage.value) {
            requestData.target_language = targetLanguage.value;
        }
        
        const response = await fetch('/key-points', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentKeyPoints = result.key_points;
            currentOriginalText = text;
            
            displayKeyPoints(result.key_points);
            showOutputSection();
            switchTab('keypoints');
            
            showToastMessage('Key points extracted successfully!', 'success');
        } else {
            showToastMessage(result.error || 'Failed to extract key points', 'error');
        }
    } catch (error) {
        console.error('Key points extraction error:', error);
        showToastMessage('Failed to extract key points. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Display functions with language information
function displaySummary(result) {
    summaryResult.innerHTML = `<p>${result.summary}</p>`;
    
    // Update output stats
    const compressionRatio = result.compression_ratio || 0;
    const statsText = `${result.summary_length} words • ${compressionRatio}% compression`;
    
    // Add language information if available
    if (result.detected_language && result.language_name) {
        outputStats.innerHTML = statsText + ` • Source: ${result.language_name}`;
        
        // Show target language if different
        if (result.target_language && result.target_language !== result.detected_language) {
            summaryLanguageName.textContent = result.target_language_name;
            summaryLanguage.style.display = 'block';
        } else {
            summaryLanguage.style.display = 'none';
        }
    } else {
        outputStats.innerHTML = statsText;
        summaryLanguage.style.display = 'none';
    }
}

function displayKeyPoints(keyPoints) {
    if (keyPoints && keyPoints.length > 0) {
        const listHTML = keyPoints.map(point => `<li>${point}</li>`).join('');
        keyPointsResult.innerHTML = `<ul>${listHTML}</ul>`;
    } else {
        keyPointsResult.innerHTML = '<p>No key points could be extracted.</p>';
    }
}

// UI utility functions
function showOutputSection() {
    outputSection.style.display = 'block';
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function switchTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Add active class to selected tab
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

function updateWordCount() {
    const text = noteInput.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    wordCount.textContent = words;
}

function validateForm() {
    const hasText = noteInput.value.trim().length > 0;
    summarizeBtn.disabled = !hasText;
    keyPointsBtn.disabled = !hasText;
    detectLanguageBtn.disabled = !hasText;
}

function validateLengths() {
    const maxVal = parseInt(maxLength.value);
    const minVal = parseInt(minLength.value);
    
    if (minVal >= maxVal) {
        maxLength.value = minVal + 20;
    }
}

function adjustLengthsForType() {
    const type = summaryType.value;
    
    switch(type) {
        case 'brief':
            maxLength.value = '100';
            minLength.value = '30';
            break;
        case 'detailed':
            maxLength.value = '300';
            minLength.value = '100';
            break;
        default: // balanced
            maxLength.value = '150';
            minLength.value = '50';
    }
}

// Clear all content
function clearAll() {
    noteInput.value = '';
    outputSection.style.display = 'none';
    summaryResult.innerHTML = '';
    keyPointsResult.innerHTML = '';
    languageInfo.style.display = 'none';
    summaryLanguage.style.display = 'none';
    
    currentSummary = '';
    currentKeyPoints = [];
    currentOriginalText = '';
    currentFileMetadata = {};
    currentDetectedLanguage = 'en';
    
    removeFile();
    updateWordCount();
    validateForm();
    
    showToastMessage('All content cleared', 'info');
}

// Copy to clipboard
async function copyToClipboard(type) {
    let textToCopy = '';
    
    if (type === 'summary') {
        textToCopy = currentSummary;
    } else if (type === 'keypoints') {
        textToCopy = currentKeyPoints.join('\n• ');
        if (textToCopy) textToCopy = '• ' + textToCopy;
    }
    
    if (!textToCopy) {
        showToastMessage('Nothing to copy', 'warning');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(textToCopy);
        showToastMessage('Copied to clipboard!', 'success');
    } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToastMessage('Copied to clipboard!', 'success');
    }
}

// Download functions with enhanced metadata
async function downloadPdf() {
    if (!currentSummary && currentKeyPoints.length === 0) {
        showToastMessage('No content to download', 'warning');
        return;
    }
    
    showLoading('Generating PDF...');
    
    try {
        const metadata = {
            ...currentFileMetadata,
            detected_language: currentDetectedLanguage,
            language_name: supportedLanguages[currentDetectedLanguage] || 'Unknown'
        };
        
        const response = await fetch('/download-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                original_text: currentOriginalText,
                summary: currentSummary,
                key_points: currentKeyPoints,
                metadata: metadata
            })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `smartnotes_summary_${new Date().getTime()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showToastMessage('PDF downloaded successfully!', 'success');
        } else {
            const error = await response.json();
            showToastMessage(error.error || 'Failed to generate PDF', 'error');
        }
    } catch (error) {
        console.error('PDF download error:', error);
        showToastMessage('Failed to download PDF', 'error');
    } finally {
        hideLoading();
    }
}

async function downloadText() {
    if (!currentSummary && currentKeyPoints.length === 0) {
        showToastMessage('No content to download', 'warning');
        return;
    }
    
    showLoading('Generating text file...');
    
    try {
        const metadata = {
            ...currentFileMetadata,
            detected_language: currentDetectedLanguage,
            language_name: supportedLanguages[currentDetectedLanguage] || 'Unknown'
        };
        
        const response = await fetch('/download-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                summary: currentSummary,
                key_points: currentKeyPoints,
                metadata: metadata,
                original_filename: currentFileMetadata.filename || 'Manual Input'
            })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `smartnotes_summary_${new Date().getTime()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showToastMessage('Text file downloaded successfully!', 'success');
        } else {
            const error = await response.json();
            showToastMessage(error.error || 'Failed to generate text file', 'error');
        }
    } catch (error) {
        console.error('Text download error:', error);
        showToastMessage('Failed to download text file', 'error');
    } finally {
        hideLoading();
    }
}

// Loading and toast functions
function showLoading(message = 'Processing...') {
    loadingText.textContent = message;
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function showToastMessage(message, type = 'success') {
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function autoSave() {
    // Simple auto-save to localStorage (optional)
    try {
        localStorage.setItem('smartnotes_draft', noteInput.value);
    } catch (error) {
        // Handle storage errors silently
    }
}

// Load draft on page load (optional)
function loadDraft() {
    try {
        const draft = localStorage.getItem('smartnotes_draft');
        if (draft && !noteInput.value) {
            noteInput.value = draft;
            updateWordCount();
            validateForm();
        }
    } catch (error) {
        // Handle storage errors silently
    }
}