// ============ KONFIGURASI ============
const API_URL = "https://script.google.com/macros/s/AKfycbxEjtvbMpVXq6r9QsfS1Gk5SILNN215UpmeIneXLUVYV9ElnVIxkippYBiww52XQnCQCQ/exec";
let allData = [];
let filteredAdminData = [];
const user = JSON.parse(localStorage.getItem('ppid_user'));

const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let selectedItems = [];
let uploadedFiles = { gambar: null, dokumen: null };
let currentUploadMode = 'computer';

// ============ THEME TOGGLE ============
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    const btn = document.querySelector('.btn-theme-toggle i');
    if (btn) btn.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}
if (localStorage.getItem('theme') === 'dark') toggleTheme();

// ============ EYE TOGGLE PASSWORD ============
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (!input || !icon) return;
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
        icon.style.color = 'var(--primary)';
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
        icon.style.color = '';
    }
}

// ============ ACTION MODAL ============
function showActionModal({ title = 'Info', message = '', type = 'info', btnText = 'OK', onClose = null, autoClose = 0 }) {
    const icons = { success: 'fa-check', error: 'fa-times', warning: 'fa-exclamation-triangle', info: 'fa-info' };
    const modalEl = document.getElementById('actionModal');
    if (!modalEl) { alert(`${title}\n\n${message}`); if (onClose) onClose(); return; }
    
    document.getElementById('actionTitle').innerText = title;
    document.getElementById('actionMessage').innerText = message;
    document.getElementById('actionIcon').className = `fas ${icons[type]}`;
    document.getElementById('actionIconWrap').className = `action-icon-wrap ${type}`;
    const okBtn = document.getElementById('actionOkBtn');
    okBtn.innerText = btnText;
    okBtn.className = type === 'error' ? 'btn btn-danger-modern w-100' : 'btn btn-modern w-100';
    
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    const newBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newBtn, okBtn);
    newBtn.addEventListener('click', () => { modal.hide(); if (onClose) onClose(); });
    
    if (autoClose > 0) {
        setTimeout(() => { modal.hide(); if (onClose) onClose(); }, autoClose);
    }
}

// ============ CONFIRM MODAL ============
function showConfirmModal({ title = 'Konfirmasi', message = 'Apakah Anda yakin?', confirmText = 'Ya, Lanjutkan', cancelText = 'Batal', type = 'warning', onConfirm = null }) {
    const icons = { warning: 'fa-exclamation-triangle', error: 'fa-trash-alt', info: 'fa-question-circle' };
    const modalEl = document.getElementById('confirmModal');
    if (!modalEl) { if (confirm(`${title}\n\n${message}`)) { if (onConfirm) onConfirm(); } return; }
    
    document.getElementById('confirmTitle').innerText = title;
    document.getElementById('confirmMessage').innerText = message;
    document.getElementById('confirmOkBtn').innerText = confirmText;
    document.getElementById('confirmCancelBtn').innerText = cancelText;
    
    const iconWrap = modalEl.querySelector('.action-icon-wrap');
    iconWrap.className = `action-icon-wrap ${type}`;
    iconWrap.querySelector('i').className = `fas ${icons[type]}`;
    
    const okBtn = document.getElementById('confirmOkBtn');
    okBtn.className = type === 'error' ? 'btn btn-danger-modern flex-fill' : 'btn btn-warning flex-fill text-white';
    
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    newOkBtn.addEventListener('click', () => { modal.hide(); if (onConfirm) onConfirm(); });
}

// ============ URL PREVIEW SYSTEM ============
function detectFileType(url) {
    if (!url) return { type: 'unknown', ext: '' };
    url = url.toLowerCase().split('?')[0];
    const ext = url.split('.').pop() || '';
    if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return { type: 'image', ext };
    if (ext === 'pdf') return { type: 'pdf', ext };
    if (['doc','docx','xls','xlsx','ppt','pptx','txt','csv'].includes(ext)) return { type: 'document', ext };
    if (['mp4','webm','ogg','mov'].includes(ext)) return { type: 'video', ext };
    if (['mp3','wav','m4a'].includes(ext)) return { type: 'audio', ext };
    if (url.includes('youtube.com') || url.includes('youtu.be')) return { type: 'youtube', ext: 'youtube' };
    if (url.includes('drive.google.com')) return { type: 'gdrive', ext: 'gdrive' };
    return { type: 'unknown', ext };
}

function convertGDriveUrl(url) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
        return {
            id: match[1],
            preview: `https://drive.google.com/file/d/${match[1]}/preview`,
            download: `https://drive.google.com/uc?export=download&id=${match[1]}`
        };
    }
    return null;
}

function convertYouTubeUrl(url) {
    let videoId = '';
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) videoId = shortMatch[1];
    const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (longMatch) videoId = longMatch[1];
    const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) videoId = embedMatch[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

function getFileTypeBadge(fileInfo) {
    const icons = { 'image':'fa-image', 'pdf':'fa-file-pdf', 'document':'fa-file-word', 'video':'fa-video', 'audio':'fa-music', 'youtube':'fa-youtube', 'gdrive':'fa-cloud', 'unknown':'fa-file' };
    const labels = { 'image':'Gambar', 'pdf':'PDF', 'document':fileInfo.ext.toUpperCase(), 'video':'Video', 'audio':'Audio', 'youtube':'YouTube', 'gdrive':'Drive', 'unknown':'File' };
    return `<i class="fas ${icons[fileInfo.type] || 'fa-file'}"></i> ${labels[fileInfo.type] || 'File'}`;
}

function previewURL(url, title = 'Preview File') {
    if (!url) {
        showActionModal({ title: 'URL Kosong', message: 'Tidak ada URL yang dapat dipreview.', type: 'warning' });
        return;
    }
    const modalEl = document.getElementById('urlPreviewModal');
    if (!modalEl) { window.open(url, '_blank'); return; }
    
    const modal = new bootstrap.Modal(modalEl);
    const loader = document.getElementById('urlPreviewLoader');
    const content = document.getElementById('urlPreviewContent');
    const error = document.getElementById('urlPreviewError');
    const titleEl = document.getElementById('urlPreviewTitle');
    const infoEl = document.getElementById('urlPreviewInfo');
    const downloadBtn = document.getElementById('urlPreviewDownload');
    const fallbackBtn = document.getElementById('urlPreviewFallback');
    const errorMsg = document.getElementById('urlPreviewErrorMsg');
    
    loader.style.display = 'block';
    content.style.display = 'none';
    error.style.display = 'none';
    content.innerHTML = '';
    titleEl.innerText = title;
    downloadBtn.href = url;
    fallbackBtn.href = url;
    modal.show();
    
    const fileInfo = detectFileType(url);
    infoEl.innerText = `Tipe: ${fileInfo.type.toUpperCase()} | Ekstensi: ${fileInfo.ext || '-'}`;
    
    setTimeout(() => {
        try {
            let html = '';
            if (fileInfo.type === 'image') {
                html = `<img src="${url}" class="url-preview-image" alt="${title}" onerror="showPreviewError('Gambar tidak dapat dimuat')">`;
            } else if (fileInfo.type === 'pdf') {
                html = `<iframe src="${url}" class="url-preview-frame"></iframe>`;
            } else if (fileInfo.type === 'document') {
                const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
                html = `<iframe src="${viewerUrl}" class="url-preview-frame"></iframe>`;
            } else if (fileInfo.type === 'video') {
                html = `<video controls class="url-preview-video" autoplay><source src="${url}" type="video/${fileInfo.ext}"></video>`;
            } else if (fileInfo.type === 'audio') {
                html = `<div class="p-5 text-center"><i class="fas fa-music fa-4x text-white mb-3"></i><audio controls class="w-100 mt-3"><source src="${url}" type="audio/${fileInfo.ext}"></audio></div>`;
            } else if (fileInfo.type === 'youtube') {
                const embedUrl = convertYouTubeUrl(url);
                if (embedUrl) html = `<iframe src="${embedUrl}" class="url-preview-frame" allowfullscreen></iframe>`;
                else { showPreviewError('URL YouTube tidak valid'); return; }
            } else if (fileInfo.type === 'gdrive') {
                const gdrive = convertGDriveUrl(url);
                if (gdrive) {
                    html = `<iframe src="${gdrive.preview}" class="url-preview-frame" allowfullscreen></iframe>`;
                    downloadBtn.href = gdrive.download;
                } else { showPreviewError('URL Google Drive tidak valid'); return; }
            } else {
                html = `<iframe src="${url}" class="url-preview-frame"></iframe>`;
            }
            loader.style.display = 'none';
            content.style.display = 'block';
            content.innerHTML = html;
        } catch(err) {
            showPreviewError('Terjadi kesalahan: ' + err.message);
        }
    }, 500);
}

function showPreviewError(message) {
    const loader = document.getElementById('urlPreviewLoader');
    const content = document.getElementById('urlPreviewContent');
    const error = document.getElementById('urlPreviewError');
    const errorMsg = document.getElementById('urlPreviewErrorMsg');
    if (!loader || !content || !error) return;
    loader.style.display = 'none';
    content.style.display = 'none';
    error.style.display = 'block';
    errorMsg.innerText = message;
}

function previewEditImage() {
    const url = document.getElementById('editGambar')?.value;
    const preview = document.getElementById('editImagePreview');
    const img = document.getElementById('editPreviewImg');
    if (!preview || !img) return;
    if (url) {
        img.src = url;
        preview.style.display = 'block';
        img.onerror = () => { preview.style.display = 'none'; };
    } else {
        preview.style.display = 'none';
    }
}

function previewEditLink() {
    const url = document.getElementById('editLinkFile')?.value;
    if (url) previewURL(url, 'Preview File Dokumen');
    else showActionModal({ title: 'URL Kosong', message: 'Masukkan URL file terlebih dahulu.', type: 'warning' });
}

function previewUploadLink() {
    const url = document.getElementById('linkFile')?.value;
    if (url) previewURL(url, 'Preview File Dokumen');
    else showActionModal({ title: 'URL Kosong', message: 'Masukkan URL file terlebih dahulu.', type: 'warning' });
}

// ============ FILE UPLOAD SYSTEM (FIXED dengan Polling) ============
function switchUploadMode(mode) {
    const computerMode = document.getElementById('uploadModeComputer');
    const urlMode = document.getElementById('uploadModeUrl');
    const btnComputer = document.getElementById('btnModeComputer');
    const btnUrl = document.getElementById('btnModeUrl');
    if (!computerMode || !urlMode) return;
    
    currentUploadMode = mode;
    if (mode === 'computer') {
        computerMode.style.display = 'block';
        urlMode.style.display = 'none';
        if (btnComputer) { btnComputer.classList.add('btn-primary'); btnComputer.classList.remove('btn-outline-primary'); btnComputer.classList.add('active'); }
        if (btnUrl) { btnUrl.classList.remove('btn-primary'); btnUrl.classList.add('btn-outline-primary'); btnUrl.classList.remove('active'); }
    } else {
        computerMode.style.display = 'none';
        urlMode.style.display = 'block';
        if (btnComputer) { btnComputer.classList.remove('btn-primary'); btnComputer.classList.add('btn-outline-primary'); btnComputer.classList.remove('active'); }
        if (btnUrl) { btnUrl.classList.add('btn-primary'); btnUrl.classList.remove('btn-outline-primary'); btnUrl.classList.add('active'); }
    }
}

function handleFileSelect(input, type) {
    const file = input.files[0];
    if (!file) return;
    const maxSize = type === 'gambar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showActionModal({ title: 'File Terlalu Besar ❌', message: `Maksimal ${maxSize/1024/1024}MB. File Anda: ${(file.size/1024/1024).toFixed(2)}MB`, type: 'error' });
        input.value = '';
        return;
    }
    if (type === 'gambar' && !file.type.startsWith('image/')) {
        showActionModal({ title: 'Format Tidak Valid ❌', message: 'File harus berupa gambar.', type: 'error' });
        input.value = '';
        return;
    }
    uploadedFiles[type] = file;
    showFilePreview(file, type);
}

function showFilePreview(file, type) {
    const preview = document.getElementById(`preview${capitalize(type)}`);
    const fileName = document.getElementById(`fileName${capitalize(type)}`);
    const fileSize = document.getElementById(`fileSize${capitalize(type)}`);
    if (!preview) return;
    if (fileName) fileName.innerText = file.name;
    if (fileSize) fileSize.innerText = formatFileSize(file.size);
    if (type === 'gambar') {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('previewImgGambar');
            if (img) img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    preview.style.display = 'block';
}

function clearUploadedFile(type) {
    uploadedFiles[type] = null;
    const preview = document.getElementById(`preview${capitalize(type)}`);
    const input = document.getElementById(`file${capitalize(type)}`);
    if (preview) preview.style.display = 'none';
    if (input) input.value = '';
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * Upload file ke Google Drive dengan mekanisme polling
 * 1. Generate unique upload ID
 * 2. Kirim base64 ke Apps Script
 * 3. Poll endpoint untuk cek status & dapatkan URL
 */
async function uploadFileToDrive(file, type, progressCallback) {
    const uploadId = 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    try {
        if (progressCallback) progressCallback(10, 'Membaca file...');
        const base64Data = await fileToBase64(file);
        const base64Content = base64Data.split(',')[1];
        
        if (progressCallback) progressCallback(30, 'Mengupload ke server...');
        
        // Kirim ke Apps Script
        const payload = {
            action: 'upload',
            uploadId: uploadId,
            fileData: base64Content,
            fileName: file.name,
            mimeType: file.type
        };
        
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        
        if (progressCallback) progressCallback(60, 'Memproses file di Google Drive...');
        
        // Poll untuk dapatkan URL
        const result = await pollUploadStatus(uploadId, progressCallback);
        
        if (progressCallback) progressCallback(100, 'Upload selesai!');
        
        return result;
        
    } catch(err) {
        console.error('Upload error:', err);
        throw new Error('Gagal upload: ' + err.message);
    }
}

/**
 * Poll endpoint untuk cek status upload
 */
async function pollUploadStatus(uploadId, progressCallback, maxAttempts = 30) {
    let attempts = 0;
    const pollInterval = 1500; // 1.5 detik
    
    return new Promise((resolve, reject) => {
        const poll = async () => {
            attempts++;
            try {
                const res = await fetch(`${API_URL}?action=getUpload&id=${uploadId}`);
                const result = await res.json();
                
                if (result.status === 'success' && result.uploadStatus === 'success') {
                    resolve({
                        status: 'success',
                        url: result.url,
                        preview: result.preview,
                        download: result.download,
                        fileName: result.fileName,
                        size: result.fileSize
                    });
                    return;
                }
                
                if (result.uploadStatus === 'error') {
                    reject(new Error(result.errorMessage || 'Upload gagal di server'));
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    reject(new Error('Upload timeout. Silakan coba lagi.'));
                    return;
                }
                
                // Update progress
                const progress = 60 + Math.min(30, attempts * 2);
                if (progressCallback) progressCallback(progress, `Menunggu server... (${attempts}/${maxAttempts})`);
                
                setTimeout(poll, pollInterval);
                
            } catch(err) {
                if (attempts >= maxAttempts) {
                    reject(new Error('Gagal cek status upload'));
                    return;
                }
                setTimeout(poll, pollInterval);
            }
        };
        
        // Delay sedikit sebelum poll pertama (biar Apps Script proses)
        setTimeout(poll, 2000);
    });
}

function setupDragAndDrop() {
    const dropzones = document.querySelectorAll('.upload-dropzone');
    dropzones.forEach(dropzone => {
        const input = dropzone.querySelector('input[type="file"]');
        if (!input) return;
        const type = input.id === 'fileGambar' ? 'gambar' : 'dokumen';
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
        });
        
        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const dt = new DataTransfer();
                dt.items.add(files[0]);
                input.files = dt.files;
                handleFileSelect(input, type);
            }
        }, false);
    });
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function resetUploadForm() {
    const form = document.getElementById('uploadForm');
    if (form) form.reset();
    clearUploadedFile('gambar');
    clearUploadedFile('dokumen');
    const charCount = document.getElementById('charCount');
    const wordCount = document.getElementById('wordCount');
    const readTime = document.getElementById('readTime');
    if (charCount) charCount.innerText = '0';
    if (wordCount) wordCount.innerText = '0';
    if (readTime) readTime.innerText = '0';
    clearImagePreview();
    switchUploadMode('computer');
}

// ============ LOAD DATA ============
async function loadData() {
    try {
        const res = await fetch(API_URL);
        const result = await res.json();
        if (Array.isArray(result)) {
            allData = result.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
            renderAll();
        }
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

function renderAll() {
    renderTicker();
    renderHeroSwiper();
    renderBerita();
    renderPengumuman();
    renderInformasi();
    updateStats();
    populateFilters();
}

function renderTicker() {
    const tickerEl = document.getElementById('tickerContent');
    if (!tickerEl) return;
    const pengumuman = allData.filter(d => d.tipe === 'pengumuman').slice(0, 5);
    tickerEl.innerText = pengumuman.map(p => `📢 ${p.judul}`).join('  •  ') || 'Selamat datang di PPID Kemenag Tanah Datar';
}

function renderHeroSwiper() {
    const featured = allData.filter(d => d.gambar_url).slice(0, 5);
    const wrapper = document.getElementById('heroSwiperWrapper');
    if (!wrapper) return;
    
    if (featured.length === 0) {
        wrapper.innerHTML = `<div class="swiper-slide"><div style="height:400px;background:linear-gradient(135deg,#006838,#F4A900);display:flex;align-items:center;justify-content:center;color:white;text-align:center;padding:2rem;"><div><i class="fas fa-mosque" style="font-size:4rem;margin-bottom:1rem;"></i><h3>Portal Informasi Publik</h3><p>Kemenag Kabupaten Tanah Datar</p></div></div></div>`;
    } else {
        wrapper.innerHTML = featured.map(item => `
            <div class="swiper-slide" onclick="showDetail('${item.timestamp}')" style="cursor:pointer;position:relative;">
                <img src="${item.gambar_url}" alt="${item.judul}" style="width:100%;height:400px;object-fit:cover;">
                <div style="position:absolute;bottom:0;left:0;right:0;padding:1.5rem;background:linear-gradient(transparent,rgba(0,0,0,0.8));color:white;">
                    <span class="badge bg-warning text-dark mb-2">${item.tipe}</span>
                    <h5>${item.judul}</h5>
                </div>
            </div>
        `).join('');
    }
    
    if (window.heroSwiperInstance) window.heroSwiperInstance.destroy(true, true);
    window.heroSwiperInstance = new Swiper('.heroSwiper', {
        loop: featured.length > 1,
        autoplay: { delay: 4000, disableOnInteraction: false },
        pagination: { el: '.swiper-pagination', clickable: true },
        effect: 'fade',
        fadeEffect: { crossFade: true }
    });
}

function renderBerita() {
    const berita = allData.filter(d => d.tipe === 'berita').slice(0, 6);
    const grid = document.getElementById('beritaGrid');
    if (!grid) return;
    grid.innerHTML = berita.length === 0 ? 
        '<div class="col-12 text-center py-5"><i class="fas fa-newspaper fa-3x text-muted mb-3 d-block"></i><p class="text-muted">Belum ada berita</p></div>' :
        berita.map((item, i) => `
            <div class="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="${i*100}">
                <div class="content-card" onclick="showDetail('${item.timestamp}')">
                    <div class="card-image" style="background-image:url('${item.gambar_url || 'https://via.placeholder.com/400x200/006838/fff?text=Kemenag'}')">
                        <span class="card-type-badge">📰 Berita</span>
                    </div>
                    <div class="card-body-content">
                        <div class="card-meta">
                            <span><i class="far fa-calendar me-1"></i>${formatDate(item.timestamp)}</span>
                            <span><i class="far fa-eye me-1"></i>${item.views || 0}</span>
                        </div>
                        <h5 class="card-title-content">${item.judul}</h5>
                        <p class="card-desc">${item.ringkasan || ''}</p>
                        <div class="mt-3"><small class="text-muted"><i class="far fa-building me-1"></i>${item.unit_penginput}</small></div>
                    </div>
                </div>
            </div>
        `).join('');
}

function renderPengumuman() {
    const pengumuman = allData.filter(d => d.tipe === 'pengumuman').slice(0, 6);
    const grid = document.getElementById('pengumumanGrid');
    if (!grid) return;
    grid.innerHTML = pengumuman.length === 0 ?
        '<div class="col-12 text-center py-5"><i class="fas fa-bullhorn fa-3x text-muted mb-3 d-block"></i><p class="text-muted">Belum ada pengumuman</p></div>' :
        pengumuman.map((item, i) => `
            <div class="col-md-6" data-aos="fade-up" data-aos-delay="${i*100}">
                <div class="pengumuman-card" onclick="showDetail('${item.timestamp}')">
                    <div class="d-flex gap-3">
                        <div class="pengumuman-icon"><i class="fas fa-bullhorn"></i></div>
                        <div class="flex-grow-1">
                            <small class="text-muted">${formatDate(item.timestamp)} • ${item.unit_penginput}</small>
                            <h5 class="mt-1 mb-2">${item.judul}</h5>
                            <p class="mb-0 text-muted">${item.ringkasan || ''}</p>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
}

function renderInformasi() {
    const tbody = document.getElementById('infoTableBody');
    if (!tbody) return;
    const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const unit = document.getElementById('filterUnit')?.value || '';
    const kategori = document.getElementById('filterKategori')?.value || '';
    
    let filtered = allData.filter(d => d.tipe === 'informasi');
    if (search) filtered = filtered.filter(d => d.judul.toLowerCase().includes(search) || (d.ringkasan && d.ringkasan.toLowerCase().includes(search)));
    if (unit) filtered = filtered.filter(d => d.unit_penginput === unit);
    if (kategori) filtered = filtered.filter(d => d.kategori === kategori);
    
    tbody.innerHTML = filtered.length === 0 ?
        '<tr><td colspan="6" class="text-center py-5"><i class="fas fa-inbox fa-2x text-muted mb-2 d-block"></i><p class="text-muted mb-0">Tidak ada data</p></td></tr>' :
        filtered.map(item => {
            const fileInfo = detectFileType(item.link_file);
            const fileBadge = getFileTypeBadge(fileInfo);
            const safeLink = (item.link_file || '').replace(/'/g, "\\'");
            const safeJudul = (item.judul || '').replace(/'/g, "\\'");
            return `
                <tr>
                    <td><small>${formatDate(item.timestamp)}</small></td>
                    <td><strong>${item.judul}</strong><br><small class="text-muted">${item.ringkasan || ''}</small></td>
                    <td><span class="badge bg-info">${item.kategori || '-'}</span></td>
                    <td><small>${item.unit_penginput}</small></td>
                    <td>${item.link_file ? 
                        `<button class="file-type-badge ${fileInfo.type}" onclick="previewURL('${safeLink}', '${safeJudul}')">${fileBadge}</button>` : 
                        '<span class="text-muted">-</span>'}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-modern" onclick="showDetail('${item.timestamp}')" title="Detail"><i class="fas fa-eye"></i></button>
                            ${item.link_file ? `<button class="btn btn-success" onclick="previewURL('${safeLink}', '${safeJudul}')" title="Preview"><i class="fas fa-file-alt"></i></button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
}

function updateStats() {
    const animate = (id, target) => {
        const el = document.getElementById(id);
        if (!el) return;
        let current = 0;
        const step = Math.max(1, Math.ceil(target / 30));
        const interval = setInterval(() => {
            current += step;
            if (current >= target) { current = target; clearInterval(interval); }
            el.innerText = current;
        }, 30);
    };
    animate('statBerita', allData.filter(d => d.tipe === 'berita').length);
    animate('statPengumuman', allData.filter(d => d.tipe === 'pengumuman').length);
    animate('statInfo', allData.filter(d => d.tipe === 'informasi').length);
    if (document.getElementById('countBerita')) updateAdminStats(allData);
}

function updateAdminStats(data) {
    const currentUser = JSON.parse(localStorage.getItem('ppid_user'));
    if (!currentUser) return;
    const myData = currentUser.role === 'superadmin' ? data : data.filter(d => d.unit_penginput === currentUser.unit_kerja);
    const countBerita = document.getElementById('countBerita');
    const countPengumuman = document.getElementById('countPengumuman');
    const countInfo = document.getElementById('countInfo');
    const totalContent = document.getElementById('totalContent');
    if (countBerita) countBerita.innerText = myData.filter(d => d.tipe === 'berita').length;
    if (countPengumuman) countPengumuman.innerText = myData.filter(d => d.tipe === 'pengumuman').length;
    if (countInfo) countInfo.innerText = myData.filter(d => d.tipe === 'informasi').length;
    if (totalContent) totalContent.innerText = myData.length;
}

function populateFilters() {
    const units = [...new Set(allData.map(d => d.unit_penginput).filter(Boolean))];
    const kategoris = [...new Set(allData.map(d => d.kategori).filter(Boolean))];
    const unitSelect = document.getElementById('filterUnit');
    if (unitSelect && unitSelect.options.length <= 1) {
        units.forEach(u => { const opt = document.createElement('option'); opt.value = u; opt.text = u; unitSelect.add(opt); });
    }
    const katSelect = document.getElementById('filterKategori');
    if (katSelect && katSelect.id === 'filterKategori' && katSelect.options.length <= 1 && !document.getElementById('tabManage')) {
        kategoris.forEach(k => { const opt = document.createElement('option'); opt.value = k; opt.text = k; katSelect.add(opt); });
    }
}

async function showDetail(timestamp) {
    const item = allData.find(d => d.timestamp.toString() === timestamp.toString());
    if (!item) return;
    
    const detailTipe = document.getElementById('detailTipe');
    const detailJudul = document.getElementById('detailJudul');
    const detailTanggal = document.getElementById('detailTanggal');
    const detailUnit = document.getElementById('detailUnit');
    const detailViews = document.getElementById('detailViews');
    const detailKonten = document.getElementById('detailKonten');
    const detailImage = document.getElementById('detailImage');
    const detailLinkFile = document.getElementById('detailLinkFile');
    
    if (detailTipe) detailTipe.innerText = item.tipe.toUpperCase();
    if (detailJudul) detailJudul.innerText = item.judul;
    if (detailTanggal) detailTanggal.innerText = formatDate(item.timestamp);
    if (detailUnit) detailUnit.innerText = item.unit_penginput;
    if (detailViews) detailViews.innerText = (item.views || 0) + 1;
    if (detailKonten) detailKonten.innerText = item.konten;
    
    if (detailImage) {
        if (item.gambar_url) { detailImage.src = item.gambar_url; detailImage.style.display = 'block'; }
        else { detailImage.style.display = 'none'; }
    }
    
    if (detailLinkFile) {
        if (item.link_file) {
            const fileInfo = detectFileType(item.link_file);
            const fileBadge = getFileTypeBadge(fileInfo);
            const safeLink = item.link_file.replace(/'/g, "\\'");
            const safeJudul = item.judul.replace(/'/g, "\\'");
            detailLinkFile.innerHTML = `
                <div class="d-flex gap-2 flex-wrap align-items-center">
                    <button class="btn btn-modern" onclick="previewURL('${safeLink}', '${safeJudul}')"><i class="fas fa-eye me-2"></i>Preview File</button>
                    <a href="${item.link_file}" target="_blank" class="btn btn-outline-primary"><i class="fas fa-download me-2"></i>Download</a>
                    <span class="file-type-badge ${fileInfo.type}">${fileBadge}</span>
                </div>
            `;
        } else {
            detailLinkFile.innerHTML = '';
        }
    }
    
    const modalEl = document.getElementById('detailModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
    
    try {
        await fetch(API_URL, {
            method: 'POST', mode: 'no-cors',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({action:'view', timestamp: item.timestamp})
        });
    } catch(err) { console.error('Error incrementing view:', err); }
}

function previewContent(timestamp) {
    const item = allData.find(d => d.timestamp.toString() === timestamp.toString());
    if (!item) return;
    const previewJudul = document.getElementById('previewJudul');
    const previewTanggal = document.getElementById('previewTanggal');
    const previewTipe = document.getElementById('previewTipe');
    const previewRingkasan = document.getElementById('previewRingkasan');
    const previewKonten = document.getElementById('previewKonten');
    const previewImage = document.getElementById('previewImage');
    const previewLinkFile = document.getElementById('previewLinkFile');
    const previewViews = document.getElementById('previewViews');
    
    if (previewJudul) previewJudul.innerText = item.judul;
    if (previewTanggal) previewTanggal.innerText = formatDate(item.timestamp);
    if (previewTipe) previewTipe.innerText = item.tipe;
    if (previewRingkasan) previewRingkasan.innerText = item.ringkasan || '-';
    if (previewKonten) previewKonten.innerText = item.konten;
    if (previewViews) previewViews.innerText = item.views || 0;
    
    if (previewImage) {
        if (item.gambar_url) { previewImage.src = item.gambar_url; previewImage.style.display = 'block'; }
        else { previewImage.style.display = 'none'; }
    }
    
    if (previewLinkFile) {
        if (item.link_file) {
            const safeLink = item.link_file.replace(/'/g, "\\'");
            const safeJudul = item.judul.replace(/'/g, "\\'");
            previewLinkFile.innerHTML = `
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-modern" onclick="previewURL('${safeLink}', '${safeJudul}')"><i class="fas fa-eye me-2"></i>Preview File</button>
                    <a href="${item.link_file}" target="_blank" class="btn btn-outline-primary"><i class="fas fa-download me-2"></i>Download</a>
                </div>
            `;
        } else { previewLinkFile.innerHTML = ''; }
    }
    
    const modalEl = document.getElementById('previewModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

// ============ LOGIN ============
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    const btn = this.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Memverifikasi...';
    btn.disabled = true;
    
    try {
        const res = await fetch(`${API_URL}?sheet=Users`);
        const users = await res.json();
        const valid = users.find(x => x.username === u && x.password === p);
        if (valid) {
            localStorage.setItem('ppid_user', JSON.stringify(valid));
            showActionModal({
                title: 'Login Berhasil! 🎉',
                message: `Selamat datang, ${valid.nama_lengkap || valid.username}.`,
                type: 'success',
                autoClose: 1500,
                onClose: () => window.location.href = 'admin.html'
            });
        } else {
            showActionModal({ title: 'Login Gagal ❌', message: 'Username atau password salah.', type: 'error', btnText: 'Coba Lagi' });
        }
    } catch(err) {
        showActionModal({ title: 'Error Koneksi', message: 'Tidak dapat terhubung ke server.', type: 'error' });
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// ============ ADMIN UPLOAD ============
document.getElementById('uploadForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const currentUser = JSON.parse(localStorage.getItem('ppid_user'));
    const btn = document.getElementById('btnPublish');
    const originalText = btn ? btn.innerHTML : '';
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Memproses...';
        btn.disabled = true;
        
        let gambarUrl = '';
        let linkFileUrl = '';
        
        if (currentUploadMode === 'computer') {
            if (uploadedFiles.gambar) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading gambar...';
                const result = await uploadFileToDrive(uploadedFiles.gambar, 'gambar', (p, m) => {
                    btn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>Gambar ${p}% - ${m}`;
                });
                gambarUrl = result.url;
            }
            if (uploadedFiles.dokumen) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading dokumen...';
                const result = await uploadFileToDrive(uploadedFiles.dokumen, 'dokumen', (p, m) => {
                    btn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>Dokumen ${p}% - ${m}`;
                });
                linkFileUrl = result.url;
            }
        } else {
            gambarUrl = document.getElementById('gambar').value;
            linkFileUrl = document.getElementById('linkFile').value;
        }
        
        const data = {
            action: 'create',
            judul: document.getElementById('judul').value,
            tipe: document.getElementById('tipe').value,
            kategori: document.getElementById('kategori').value || 'Umum',
            ringkasan: document.getElementById('ringkasan').value,
            konten: document.getElementById('konten').value,
            gambar: gambarUrl,
            link: linkFileUrl,
            unit: currentUser.unit_kerja
        };
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Menyimpan ke database...';
        await fetch(API_URL, {
            method: 'POST', mode: 'no-cors',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(data)
        });
        
        showActionModal({
            title: 'Berhasil Dipublish! 🚀',
            message: 'Konten berhasil diupload dan akan tampil di halaman publik.',
            type: 'success',
            btnText: 'Upload Lagi',
            onClose: () => { resetUploadForm(); loadAdminData(); }
        });
    } catch(err) {
        showActionModal({ title: 'Upload Gagal ❌', message: 'Terjadi kesalahan: ' + err.message, type: 'error' });
    } finally {
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    }
});

// ============ ADMIN MANAGE ============
async function loadAdminData() {
    const currentUser = JSON.parse(localStorage.getItem('ppid_user'));
    if (!currentUser) return;
    const tbody = document.getElementById('adminTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-muted"></i><p class="mt-2 text-muted">Memuat data...</p></td></tr>`;
    
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        let myData = currentUser.role === 'superadmin' ? data : data.filter(d => d.unit_penginput === currentUser.unit_kerja);
        
        const search = (document.getElementById('searchAdmin')?.value || '').toLowerCase();
        if (search) myData = myData.filter(d => d.judul.toLowerCase().includes(search) || (d.kategori && d.kategori.toLowerCase().includes(search)));
        
        const tipe = document.getElementById('filterTipe')?.value || '';
        if (tipe) myData = myData.filter(d => d.tipe === tipe);
        
        const sortBy = document.getElementById('sortBy')?.value || 'newest';
        if (sortBy === 'newest') myData.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        else if (sortBy === 'oldest') myData.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
        else if (sortBy === 'views') myData.sort((a,b) => (b.views || 0) - (a.views || 0));
        
        filteredAdminData = myData;
        updateAdminStats(data);
        
        const totalItems = myData.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        if (currentPage > totalPages) currentPage = 1;
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
        const pageData = myData.slice(startIndex, endIndex);
        
        if (totalItems === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5"><i class="fas fa-inbox fa-3x text-muted mb-3 d-block"></i><p class="text-muted">Belum ada konten</p></td></tr>`;
        } else {
            tbody.innerHTML = pageData.map(item => {
                const fileInfo = detectFileType(item.link_file);
                const fileBadge = getFileTypeBadge(fileInfo);
                const safeLink = (item.link_file || '').replace(/'/g, "\\'");
                const safeJudul = (item.judul || '').replace(/'/g, "\\'");
                return `
                    <tr>
                        <td><small>${formatDate(item.timestamp)}</small></td>
                        <td><strong>${item.judul}</strong><br><small class="text-muted">${item.ringkasan || '-'}</small></td>
                        <td><span class="badge bg-primary">${item.tipe}</span></td>
                        <td>${item.link_file ? 
                            `<button class="file-type-badge ${fileInfo.type}" onclick="previewURL('${safeLink}', '${safeJudul}')">${fileBadge}</button>` : 
                            '<span class="text-muted">-</span>'}</td>
                        <td><span class="badge bg-info">${item.views || 0}</span></td>
                        <td class="text-center">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="previewContent('${item.timestamp}')" title="Preview"><i class="fas fa-eye"></i></button>
                                <button class="btn btn-outline-warning" onclick="editContent('${item.timestamp}')" title="Edit"><i class="fas fa-edit"></i></button>
                                ${item.link_file ? `<button class="btn btn-outline-success" onclick="previewURL('${safeLink}', '${safeJudul}')" title="File"><i class="fas fa-file-alt"></i></button>` : ''}
                                <button class="btn btn-outline-danger" onclick="deleteContent('${item.timestamp}')" title="Hapus"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch(err) {
        console.error('Error:', err);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-danger"><i class="fas fa-exclamation-triangle fa-2x mb-2 d-block"></i><p>Gagal memuat data</p></td></tr>`;
    }
}

function editContent(timestamp) {
    const item = allData.find(d => d.timestamp.toString() === timestamp.toString());
    if (!item) { showActionModal({ title: 'Data Tidak Ditemukan', message: 'Konten tidak ditemukan.', type: 'error' }); return; }
    document.getElementById('editTimestamp').value = item.timestamp;
    document.getElementById('editJudul').value = item.judul || '';
    document.getElementById('editTipe').value = item.tipe || 'berita';
    document.getElementById('editKategori').value = item.kategori || '';
    document.getElementById('editRingkasan').value = item.ringkasan || '';
    document.getElementById('editKonten').value = item.konten || '';
    document.getElementById('editGambar').value = item.gambar_url || '';
    document.getElementById('editLinkFile').value = item.link_file || '';
    const charCount = document.getElementById('editCharCount');
    if (charCount) charCount.innerText = (item.ringkasan || '').length;
    previewEditImage();
    new bootstrap.Modal(document.getElementById('editModal')).show();
}

async function saveEdit() {
    const timestamp = document.getElementById('editTimestamp').value;
    const data = {
        action: 'update', timestamp: timestamp,
        judul: document.getElementById('editJudul').value,
        tipe: document.getElementById('editTipe').value,
        kategori: document.getElementById('editKategori').value,
        ringkasan: document.getElementById('editRingkasan').value,
        konten: document.getElementById('editKonten').value,
        gambar: document.getElementById('editGambar').value,
        link: document.getElementById('editLinkFile').value
    };
    if (!data.judul || !data.konten || !data.ringkasan) {
        showActionModal({ title: 'Data Tidak Lengkap', message: 'Judul, ringkasan, dan konten wajib diisi.', type: 'warning' });
        return;
    }
    try {
        await fetch(API_URL, {
            method: 'POST', mode: 'no-cors',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(data)
        });
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        showActionModal({
            title: 'Konten Diperbarui! ✅', message: 'Perubahan berhasil disimpan.',
            type: 'success', autoClose: 1500,
            onClose: () => { loadData(); loadAdminData(); }
        });
    } catch(err) {
        showActionModal({ title: 'Gagal Memperbarui ❌', message: err.message, type: 'error' });
    }
}

function deleteContent(timestamp) {
    showConfirmModal({
        title: 'Hapus Konten? 🗑️', message: 'Konten yang dihapus tidak dapat dikembalikan.',
        confirmText: 'Ya, Hapus', type: 'error',
        onConfirm: async () => {
            try {
                await fetch(API_URL, {
                    method: 'POST', mode: 'no-cors',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({action:'delete', timestamp})
                });
                showActionModal({
                    title: 'Berhasil Dihapus! ✅', message: 'Konten telah dihapus.',
                    type: 'success', autoClose: 1500,
                    onClose: () => { loadData(); loadAdminData(); }
                });
            } catch(err) {
                showActionModal({ title: 'Gagal Menghapus ❌', message: err.message, type: 'error' });
            }
        }
    });
}

function exportData() {
    if (!filteredAdminData || filteredAdminData.length === 0) {
        showActionModal({ title: 'Tidak Ada Data', message: 'Belum ada data.', type: 'warning' });
        return;
    }
    const ws_data = [
        ["Tanggal","Judul","Tipe","Kategori","Ringkasan","Konten","Views","Unit"],
        ...filteredAdminData.map(i => [formatDate(i.timestamp), i.judul, i.tipe, i.kategori || '-', i.ringkasan || '', i.konten || '', i.views || 0, i.unit_penginput])
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Admin");
    const filename = `Admin_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    showActionModal({ title: 'Export Berhasil! 📥', message: `File "${filename}" berhasil didownload.`, type: 'success', autoClose: 2000 });
}

// ============ DRAFT MANAGEMENT ============
function saveDraft() {
    const draft = {
        judul: document.getElementById('judul').value,
        tipe: document.getElementById('tipe').value,
        kategori: document.getElementById('kategori').value,
        ringkasan: document.getElementById('ringkasan').value,
        konten: document.getElementById('konten').value,
        gambar: document.getElementById('gambar')?.value || '',
        link: document.getElementById('linkFile')?.value || '',
        timestamp: new Date().toISOString()
    };
    if (!draft.judul.trim()) {
        showActionModal({ title: 'Draft Tidak Tersimpan', message: 'Judul wajib diisi.', type: 'warning' });
        return;
    }
    let drafts = JSON.parse(localStorage.getItem('ppid_drafts') || '[]');
    drafts.push(draft);
    localStorage.setItem('ppid_drafts', JSON.stringify(drafts));
    showActionModal({ title: 'Draft Tersimpan! 💾', message: 'Draft berhasil disimpan.', type: 'success', autoClose: 2000 });
    loadDrafts();
}

function loadDrafts() {
    const draftsList = document.getElementById('draftsList');
    const draftCount = document.getElementById('draftCount');
    if (!draftsList) return;
    const drafts = JSON.parse(localStorage.getItem('ppid_drafts') || '[]');
    if (draftCount) draftCount.innerText = drafts.length;
    if (drafts.length === 0) {
        draftsList.innerHTML = `<div class="text-center py-5"><i class="fas fa-inbox fa-3x text-muted mb-3 d-block"></i><p class="text-muted">Belum ada draft tersimpan</p></div>`;
        return;
    }
    draftsList.innerHTML = drafts.map((draft, i) => `
        <div class="pengumuman-card mb-2">
            <div class="d-flex justify-content-between align-items-start gap-2">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${draft.judul}</h6>
                    <small class="text-muted"><i class="fas fa-tag me-1"></i>${draft.tipe} • <i class="far fa-clock me-1"></i>${formatDate(draft.timestamp)}</small>
                    <p class="mb-0 mt-2 text-muted small">${draft.ringkasan || 'Tidak ada ringkasan'}</p>
                </div>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="loadDraft(${i})"><i class="fas fa-upload"></i></button>
                    <button class="btn btn-outline-danger" onclick="deleteDraft(${i})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

function loadDraft(index) {
    const drafts = JSON.parse(localStorage.getItem('ppid_drafts') || '[]');
    const draft = drafts[index];
    if (!draft) return;
    document.getElementById('judul').value = draft.judul;
    document.getElementById('tipe').value = draft.tipe;
    document.getElementById('kategori').value = draft.kategori;
    document.getElementById('ringkasan').value = draft.ringkasan;
    document.getElementById('konten').value = draft.konten;
    const gambarInput = document.getElementById('gambar');
    const linkInput = document.getElementById('linkFile');
    if (gambarInput) gambarInput.value = draft.gambar || '';
    if (linkInput) linkInput.value = draft.link || '';
    const charCount = document.getElementById('charCount');
    if (charCount) charCount.innerText = draft.ringkasan.length;
    const uploadTab = document.querySelector('[data-bs-target="#tabUpload"]');
    if (uploadTab) new bootstrap.Tab(uploadTab).show();
    showActionModal({ title: 'Draft Dimuat! 📂', message: 'Draft berhasil dimuat.', type: 'success', autoClose: 1500 });
}

function deleteDraft(index) {
    showConfirmModal({
        title: 'Hapus Draft?', message: 'Draft tidak dapat dikembalikan.', type: 'warning',
        onConfirm: () => {
            let drafts = JSON.parse(localStorage.getItem('ppid_drafts') || '[]');
            drafts.splice(index, 1);
            localStorage.setItem('ppid_drafts', JSON.stringify(drafts));
            loadDrafts();
            showActionModal({ title: 'Draft Dihapus! 🗑️', message: 'Draft berhasil dihapus.', type: 'success', autoClose: 1500 });
        }
    });
}

function previewImage() {
    const url = document.getElementById('gambar')?.value;
    const preview = document.getElementById('imagePreview');
    const img = document.getElementById('previewImg');
    if (!preview || !img) return;
    if (url) {
        img.src = url;
        preview.style.display = 'block';
        img.onerror = () => { preview.style.display = 'none'; };
    } else {
        preview.style.display = 'none';
    }
}

function clearImagePreview() {
    const gambar = document.getElementById('gambar');
    const preview = document.getElementById('imagePreview');
    if (gambar) gambar.value = '';
    if (preview) preview.style.display = 'none';
}

// ============ UTILITIES ============
function formatDate(ts) {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function printData() { window.print(); }

function downloadData() {
    if (!allData.length) {
        showActionModal({ title: 'Tidak Ada Data', message: 'Belum ada data.', type: 'warning' });
        return;
    }
    const ws_data = [
        ["Tanggal","Judul","Tipe","Kategori","Ringkasan","Unit"],
        ...allData.map(i => [formatDate(i.timestamp), i.judul, i.tipe, i.kategori || '-', i.ringkasan || '', i.unit_penginput])
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data PPID");
    const filename = `PPID_Kemenag_TanahDatar_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    showActionModal({ title: 'Download Berhasil! 📥', message: `File "${filename}" berhasil didownload.`, type: 'success', autoClose: 2000 });
}

function logout() {
    showConfirmModal({
        title: 'Logout? 👋', message: 'Anda akan keluar dari dashboard.',
        type: 'warning',
        onConfirm: () => {
            localStorage.removeItem('ppid_user');
            window.location.href = 'index.html';
        }
    });
}

function showMore(type) {
    const target = document.getElementById(type === 'berita' ? 'berita' : 'informasi');
    if (target) target.scrollIntoView({behavior:'smooth'});
}

// ============ INIT ============
loadData();
document.addEventListener('DOMContentLoaded', () => {
    setupDragAndDrop();
    switchUploadMode('computer');
});