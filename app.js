
// =====================================
// NOWFILE - File Upload Application
// =====================================

// Supabase Configuration
const SUPABASE_URL = 'https://jxwihbvjzuqayaedaslc.supabase.co';

const SUPABASE_ANON_KEY = 'sb_publishable_h3dlLZDrQI6Etq0JcOUc9A_vzgis0LZ';

// اسم Bucket في Supabase
const BUCKET_NAME = 'nowfile';

// الحد الأقصى لحجم الملف: 50 MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// =====================================
// Initialize Supabase
// =====================================

if (!window.supabase || !window.supabase.createClient) {
    alert('Supabase library not loaded. Check index.html.');
    throw new Error('Supabase library missing');
}

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// =====================================
// HTML Elements
// =====================================

const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const fileRow = document.getElementById('fileRow');

const uploadBtn = document.getElementById('uploadBtn');
const chooseBtn = document.getElementById('chooseBtn');
const removeBtn = document.getElementById('removeBtn');

const dropArea = document.getElementById('dropArea');

const result = document.getElementById('result');
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progressBar');
const statusText = document.getElementById('statusText');

const shareUrl = document.getElementById('shareUrl');
const downloadLink = document.getElementById('downloadLink');
const copyBtn = document.getElementById('copyBtn');

const toast = document.getElementById('toast');
const year = document.getElementById('year');

if (year) {
    year.textContent = new Date().getFullYear();
}

// =====================================
// Variables
// =====================================

let selectedFile = null;
let isUploading = false;

// =====================================
// Helper Functions
// =====================================

function showMessage(message) {
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    } else {
        alert(message);
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function setProgress(percent, message) {
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }

    if (statusText) {
        statusText.textContent = message;
    }
}

// =====================================
// Select File
// =====================================

function selectFile(file) {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
        showMessage('File is too large. Maximum size is 50 MB.');
        return;
    }

    selectedFile = file;

    if (fileName) {
        fileName.textContent = file.name;
    }

    if (fileSize) {
        fileSize.textContent = formatSize(file.size);
    }

    if (fileRow) {
        fileRow.hidden = false;
        fileRow.style.display = '';
    }

    if (result) result.hidden = true;

    if (uploadBtn) {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload File';
    }

    if (progressWrap) progressWrap.hidden = true;

    setProgress(0, 'Ready to upload');
}

if (fileInput) {
    fileInput.addEventListener('change', function () {
        selectFile(this.files[0]);
    });
}

if (chooseBtn && fileInput) {
    chooseBtn.addEventListener('click', () => {
        fileInput.click();
    });
}

if (removeBtn) {
    removeBtn.addEventListener('click', () => {
        selectedFile = null;

        if (fileInput) fileInput.value = '';
        if (fileRow) fileRow.hidden = true;
        if (result) result.hidden = true;

        if (uploadBtn) uploadBtn.disabled = true;

        setProgress(0, 'Ready to upload');
    });
}

// =====================================
// Drag and Drop
// =====================================

if (dropArea) {
    dropArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropArea.classList.add('dragover');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('dragover');
    });

    dropArea.addEventListener('drop', (event) => {
        event.preventDefault();
        dropArea.classList.remove('dragover');

        const file = event.dataTransfer.files[0];

        if (file) selectFile(file);
    });
}

// =====================================
// Upload File
// =====================================

async function uploadFile() {
    if (!selectedFile || isUploading) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
        showMessage('Maximum file size is 50 MB.');
        return;
    }

    isUploading = true;

    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
    }

    if (progressWrap) progressWrap.hidden = false;
    if (result) result.hidden = true;

    setProgress(10, 'Preparing your file...');

    try {
        const originalName = selectedFile.name.replace(/[\/\\]/g, '_');

        const uniqueId = (
            window.crypto && crypto.randomUUID
                ? crypto.randomUUID()
                : Date.now().toString(36) + Math.random().toString(36).slice(2)
        );

        const filePath = 'uploads/' + uniqueId + '-' + originalName;

        setProgress(25, 'Uploading your file...');

        const { data, error } = await supabaseClient.storage
            .from(BUCKET_NAME)
            .upload(filePath, selectedFile, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            throw error;
        }

        setProgress(85, 'Creating your download link...');

        const { data: publicData } = supabaseClient.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path);

        if (!publicData || !publicData.publicUrl) {
            throw new Error('Could not create public download link.');
        }

        const publicUrl = publicData.publicUrl;

        if (shareUrl) {
            if ('value' in shareUrl) {
                shareUrl.value = publicUrl;
            } else {
                shareUrl.textContent = publicUrl;
            }
        }

        if (downloadLink) {
            downloadLink.href = publicUrl;
            downloadLink.textContent = 'Download File';
            downloadLink.target = '_blank';
            downloadLink.rel = 'noopener noreferrer';
        }

        setProgress(100, 'Upload completed successfully!');

        if (result) {
            result.hidden = false;
            result.style.display = '';
        }

        showMessage('Your file was uploaded successfully!');

    } catch (error) {
        console.error('NowFile upload error:', error);

        setProgress(0, 'Upload failed');

        showMessage(
            error.message || 'Upload failed. Please try again.'
        );

    } finally {
        isUploading = false;

        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload File';
        }
    }
}

if (uploadBtn) {
    uploadBtn.addEventListener('click', uploadFile);
}

// =====================================
// Copy Share Link
// =====================================

if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
        let link = '';

        if (shareUrl) {
            link = 'value' in shareUrl
                ? shareUrl.value
                : shareUrl.textContent;
        }

        if (!link && downloadLink) {
            link = downloadLink.href;
        }

        if (!link) {
            showMessage('No download link available.');
            return;
        }

        try {
            await navigator.clipboard.writeText(link);
            showMessage('Link copied successfully!');
        } catch (error) {
            showMessage('Could not copy the link. Please copy it manually.');
        }
    });
}

// =====================================
// NOWFILE READY
// =====================================

console.log('NowFile initialized successfully.');
      
