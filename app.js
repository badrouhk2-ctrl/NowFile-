
const SUPABASE_URL = 'https://jxwihbvjzuqayaedaslc.supabase.co';

const SUPABASE_ANON_KEY = 'sb_publishable_h3dlLZDrQI6Etq0JcOUc9A_vzgis0LZ';

const BUCKET_NAME = 'nowfile';

const MAX_FILE_SIZE = 50 * 1024 * 1024;


// INITIALIZATION
const $ = (id) => document.getElementById(id);

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let selectedFile = null;
let isUploading = false;

// NOTIFICATIONS
function toast(message) {
  const element = $('toast');

  element.textContent = message;
  element.classList.add('show');

  clearTimeout(window.nowFileToastTimer);

  window.nowFileToastTimer = setTimeout(() => {
    element.classList.remove('show');
  }, 3000);
}

// FILE SIZE
function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }

  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

// SELECT FILE
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

// REMOVE FILE
function removeFile() {
  selectedFile = null;

  $('fileInput').value = '';
  $('fileRow').hidden = true;
  $('uploadBtn').disabled = true;
  $('result').hidden = true;
  $('progressWrap').hidden = true;
}

// UPLOAD FILE
async function uploadFile() {
  if (!selectedFile || isUploading) return;

  isUploading = true;

  const button = $('uploadBtn');

  button.disabled = true;
  $('progressWrap').hidden = false;
  $('result').hidden = true;
  $('statusText').textContent = 'Uploading...';
  $('progressBar').style.width = '20%';

  try {
    const file = selectedFile;

    const safeName = file.name
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    const uniqueId = crypto.randomUUID();

    const filePath =
      Date.now() + '-' + uniqueId + '-' + safeName;

    $('progressBar').style.width = '45%';

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType:
          file.type || 'application/octet-stream'
      });

    if (error) throw error;

    $('progressBar').style.width = '85%';

    const { data: publicData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    if (!publicData.publicUrl) {
      throw new Error('Could not create download link.');
    }

    $('shareUrl').value = publicData.publicUrl;
    $('downloadLink').href = publicData.publicUrl;

    $('progressBar').style.width = '100%';
    $('statusText').textContent = 'Upload complete!';

    $('result').hidden = false;

    toast('File uploaded successfully!');

    selectedFile = null;
    $('fileInput').value = '';
    $('fileRow').hidden = true;

  } catch (error) {
    console.error('NowFile error:', error);

    $('statusText').textContent = 'Upload failed';

    if (
      error.message &&
      error.message.toLowerCase().includes('policy')
    ) {
      toast('Upload permission error. Check Storage Policies.');
    } else {
      toast(error.message || 'Upload failed. Try again.');
    }

  } finally {
    isUploading = false;
    button.disabled = !selectedFile;
  }
}

// COPY SHARE LINK
async function copyLink() {
  const link = $('shareUrl').value;

  if (!link) {
    toast('No download link available.');
    return;
  }

  try {
    await navigator.clipboard.writeText(link);
    toast('Link copied successfully!');
  } catch (error) {
    $('shareUrl').select();
    document.execCommand('copy');
    toast('Link copied!');
  }
}

// DRAG AND DROP
function setupDragAndDrop() {
  const dropArea = $('dropArea');

  ['dragenter', 'dragover'].forEach((event) => {
    dropArea.addEventListener(event, (e) => {
      e.preventDefault();
      dropArea.classList.add('dragging');
    });
  });

  ['dragleave', 'drop'].forEach((event) => {
    dropArea.addEventListener(event, (e) => {
      e.preventDefault();
      dropArea.classList.remove('dragging');
    });
  });

  dropArea.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;

    if (files.length > 1) {
      toast('Please select one file at a time.');
      return;
    }

    choose(files[0]);
  });
}

// START NOWFILE
document.addEventListener('DOMContentLoaded', () => {

  $('year').textContent = new Date().getFullYear();

  $('chooseBtn').addEventListener('click', () => {
    $('fileInput').click();
  });

  $('fileInput').addEventListener('change', (e) => {
    choose(e.target.files[0]);
  });

  $('removeBtn').addEventListener('click', removeFile);

  $('uploadBtn').addEventListener('click', uploadFile);

  $('copyBtn').addEventListener('click', copyLink);

  setupDragAndDrop();

  console.log('NowFile is ready!');

});
   
