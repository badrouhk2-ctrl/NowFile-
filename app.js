/* ==========================================
   NOWFILE - FILE UPLOAD SYSTEM
   Supabase Storage Configuration
========================================== */

const SUPABASE_URL =
  'https://jxwihbvjzuqayaedaslc.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_h3dlLZDrQI6Etq0JcOUc9A_vzgis0LZ';

const BUCKET_NAME = 'NowFile';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

// ==========================================
// SUPABASE INITIALIZATION
// ==========================================

const $ = (id) => document.getElementById(id);

const supabase = window.supabase
  ? window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    )
  : null;

let selectedFile = null;
let isUploading = false;

// ==========================================
// NOTIFICATIONS
// ==========================================

function toast(message) {
  const element = $('toast');

  if (!element) {
    alert(message);
    return;
  }

  element.textContent = message;
  element.classList.add('show');

  setTimeout(() => {
    element.classList.remove('show');
  }, 3000);
}

// ==========================================
// FILE SIZE FORMAT
// ==========================================

function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }

  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

// ==========================================
// FILE SELECTION
// ==========================================

function choose(file) {
  if (!file) return;

  if (file.size > MAX_FILE_SIZE) {
    toast('Maximum file size is 50 MB.');
    return;
  }

  selectedFile = file;

  $('fileName').textContent = file.name;
  $('fileSize').textContent = formatSize(file.size);

  $('fileRow').hidden = false;
  $('uploadBtn').disabled = false;
  $('result').hidden = true;
  $('progressWrap').hidden = true;

  $('statusText').textContent = 'Ready to upload';
  $('progressBar').style.width = '0%';
}

// ==========================================
// REMOVE SELECTED FILE
// ==========================================

function removeFile() {
  selectedFile = null;

  $('fileInput').value = '';
  $('fileRow').hidden = true;
  $('uploadBtn').disabled = true;
  $('result').hidden = true;
  $('progressWrap').hidden = true;
}

// ==========================================
// UPLOAD FILE TO SUPABASE
// ==========================================

async function uploadFile() {
  if (!selectedFile || isUploading) return;

  if (!supabase) {
    toast('Supabase connection is unavailable.');
    return;
  }

  isUploading = true;

  const btn = $('uploadBtn');

  btn.disabled = true;
  $('progressWrap').hidden = false;
  $('statusText').textContent = 'Uploading your file...';
  $('progressBar').style.width = '30%';

  try {
    // Create a unique file name
    const originalName = selectedFile.name;

    const safeName = originalName
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_');

    const uniqueId =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Date.now() + '-' + Math.random().toString(36).slice(2);

    const filePath =
      Date.now() + '-' + uniqueId + '-' + safeName;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, selectedFile, {
        cacheControl: '3600',
        upsert: false,
        contentType:
          selectedFile.type || 'application/octet-stream'
      });

    if (error) {
      throw error;
    }

    // Generate public download URL
    const { data: publicData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    if (!publicData || !publicData.publicUrl) {
      throw new Error('Could not generate the file link.');
    }

    // Display successful upload
    $('progressBar').style.width = '100%';
    $('statusText').textContent = 'Upload complete!';

    $('shareUrl').value = publicData.publicUrl;
    $('downloadLink').href = publicData.publicUrl;
    $('result').hidden = false;

    toast('Your file was uploaded successfully!');

  } catch (error) {
    console.error('NowFile upload error:', error);

    $('statusText').textContent = 'Upload failed';
    $('progressBar').style.width = '0%';

    if (
      error.message &&
      (
        error.message.toLowerCase().includes('row-level security') ||
        error.message.toLowerCase().includes('policy')
      )
    ) {
      toast('Upload permission is not configured yet.');
    } else {
      toast(error.message || 'Upload failed. Please try again.');
    }

  } finally {
    isUploading = false;
    btn.disabled = !selectedFile;
  }
}

// ==========================================
// COPY SHARE LINK
// ==========================================

async function copyLink() {
  const link = $('shareUrl').value;

  if (!link) return;

  try {
    await navigator.clipboard.writeText(link);
    toast('Link copied successfully!');
  } catch (error) {
    $('shareUrl').select();
    document.execCommand('copy');
    toast('Link copied!');
  }
}

// ==========================================
// DRAG & DROP
// ==========================================

function setupDragAndDrop() {
  const dropArea = $('dropArea');

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropArea.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropArea.classList.add('dragging');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropArea.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropArea.classList.remove('dragging');
    });
  });

  dropArea.addEventListener('drop', (event) => {
    const files = event.dataTransfer.files;

    if (files.length > 1) {
      toast('Please select one file at a time.');
      return;
    }

    choose(files[0]);
  });
}

// ==========================================
// INITIALIZE NOWFILE
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

  $('year').textContent = new Date().getFullYear();

  $('chooseBtn').addEventListener('click', () => {
    $('fileInput').click();
  });

  $('fileInput').addEventListener('change', (event) => {
    choose(event.target.files[0]);
  });

  $('removeBtn').addEventListener('click', removeFile);

  $('uploadBtn').addEventListener('click', uploadFile);

  $('copyBtn').addEventListener('click', copyLink);

  setupDragAndDrop();

  console.log('NowFile initialized successfully.');

});
    
