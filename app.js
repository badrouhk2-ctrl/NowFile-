/* NowFile setup: add your Supabase project URL and anon key below. */
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const BUCKET_NAME = 'nowfile';
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const $ = (id) => document.getElementById(id);
const clientReady = SUPABASE_URL.startsWith('https://') && !SUPABASE_ANON_KEY.startsWith('YOUR_');
const supabase = clientReady && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let selectedFile = null;
const formatSize = (n) => n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`;
function toast(message){const t=$('toast');t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function choose(file){if(!file)return;if(file.size>MAX_FILE_SIZE){toast('This file is larger than 100 MB.');return;}selectedFile=file;$('fileName').textContent=file.name;$('fileSize').textContent=formatSize(file.size);$('fileRow').hidden=false;$('uploadBtn').disabled=false;$('result').hidden=true;}
$('year').textContent=new Date().getFullYear();
$('chooseBtn').addEventListener('click',()=>$('fileInput').click());
$('fileInput').addEventListener('change',e=>choose(e.target.files[0]));
$('removeBtn').addEventListener('click',()=>{selectedFile=null;$('fileInput').value='';$('fileRow').hidden=true;$('uploadBtn').disabled=true;});
const drop=$('dropArea');['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('dragging')}));['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('dragging')}));drop.addEventListener('drop',e=>choose(e.dataTransfer.files[0]));
$('uploadBtn').addEventListener('click',async()=>{
 if(!selectedFile)return;
 if(!supabase){toast('Connect Supabase first. See SETUP.txt in the project.');return;}
 const btn=$('uploadBtn');btn.disabled=true;$('progressWrap').hidden=false;$('statusText').textContent='Uploading your file…';$('progressBar').style.width='25%';
 try{
  const safeName=selectedFile.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const path=`${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const {error}=await supabase.storage.from(BUCKET_NAME).upload(path,selectedFile,{cacheControl:'3600',upsert:false,contentType:selectedFile.type||'application/octet-stream'});
  if(error)throw error;
  $('progressBar').style.width='100%';$('statusText').textContent='Upload complete';
  const {data}=supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  $('shareUrl').value=data.publicUrl;$('downloadLink').href=data.publicUrl;$('result').hidden=false;toast('Your file was uploaded successfully.');
 }catch(err){console.error(err);toast(err.message||'Upload failed. Check your Supabase settings.');$('statusText').textContent='Upload failed';}
 finally{btn.disabled=false;}
});
$('copyBtn').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('shareUrl').value);toast('Link copied!')}catch{ $('shareUrl').select();document.execCommand('copy');toast('Link copied!')}});
