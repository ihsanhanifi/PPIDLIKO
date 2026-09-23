/**
 * PPID API - Google Apps Script Integration
 * Menangani seluruh komunikasi antara frontend dan backend Google Apps Script.
 */

class PPIDAPI {
    constructor() {
        this.scriptUrl = CONFIG.GOOGLE_SCRIPT_URL;
    }

    /**
     * Method request generik untuk berkomunikasi dengan Google Apps Script
     * @param {string} action - Aksi yang akan dilakukan
     * @param {object} data - Payload data yang akan dikirim
     * @returns {Promise<object>} - Respon dari API
     */
    async request(action, data = {}) {
        try {
            return await CONFIG.apiRequest(action, data);
        } catch (error) {
            console.error(`API Request Failed [${action}]:`, error);
            return { 
                success: false, 
                error: error.message || 'Terjadi kesalahan pada koneksi jaringan. Periksa koneksi internet Anda.' 
            };
        }
    }

    // ==========================================
    // DOKUMEN OPERATIONS
    // ==========================================
    
    async getDokumen(kategori = null) {
        return await this.request('getDokumen', { kategori });
    }

    async addDokumen(dokumen) {
        return await this.request('addDokumen', dokumen);
    }

    async updateDokumen(id, updates) {
        return await this.request('updateDokumen', { id, ...updates });
    }

    async deleteDokumen(id) {
        return await this.request('deleteDokumen', { id });
    }

    // ==========================================
    // PERMOHONAN OPERATIONS
    // ==========================================
    
    async getPermohonan() {
        return await this.request('getPermohonan');
    }

    async addPermohonan(permohonan) {
        return await this.request('addPermohonan', permohonan);
    }

    async updatePermohonan(id, updates) {
        return await this.request('updatePermohonan', { id, ...updates });
    }

    // ==========================================
    // KEBERATAN OPERATIONS
    // ==========================================
    
    async getKeberatan() {
        return await this.request('getKeberatan');
    }

    async addKeberatan(keberatan) {
        return await this.request('addKeberatan', keberatan);
    }

    async updateKeberatan(id, updates) {
        return await this.request('updateKeberatan', { id, ...updates });
    }

    // ==========================================
    // USER OPERATIONS
    // ==========================================
    
    async login(username, password) {
        return await this.request('login', { username, password });
    }

    // ==========================================
    // PROFIL OPERATIONS
    // ==========================================
    
    async getProfil() {
        return await this.request('getProfil');
    }

    async updateProfil(profil) {
        return await this.request('updateProfil', profil);
    }

    // ==========================================
    // LOG & STATS OPERATIONS
    // ==========================================
    
    async getLogs() {
        return await this.request('getLogs');
    }

    async getStats() {
        return await this.request('getStats');
    }

    // ==========================================
    // FILE UPLOAD OPERATIONS
    // ==========================================
    
    /**
     * Mengupload file ke Google Drive melalui Google Apps Script
     * @param {File} file - Objek file yang akan diupload
     * @returns {Promise<object>} - Hasil upload berisi fileUrl, fileName, dll.
     */
    async uploadFile(file) {
        return new Promise((resolve, reject) => {
            // 1. Validasi ukuran file SEBELUM dibaca untuk mencegah browser crash
            if (file.size > CONFIG.MAX_FILE_SIZE) {
                reject(new Error(`Ukuran file melebihi batas maksimal ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`));
                return;
            }

            // 2. Validasi tipe file
            if (!CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
                reject(new Error('Tipe file tidak diizinkan. Gunakan PDF, DOC, XLS, atau Image.'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const base64Data = e.target.result.split(',')[1];
                    const fileData = {
                        fileName: file.name,
                        contentType: file.type,
                        data: base64Data
                    };
                    
                    const result = await this.request('uploadFile', fileData);
                    
                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result.error || 'Gagal mengupload file ke server.'));
                    }
                } catch (error) {
                    reject(new Error('Gagal memproses file: ' + error.message));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Gagal membaca file. Silakan coba file lain.'));
            };
            
            // Baca file sebagai Data URL (Base64)
            reader.readAsDataURL(file);
        });
    }

    // ==========================================
    // HELPER FUNCTIONS (UI Utilities)
    // ==========================================
    
    getFileIcon(fileType) {
        if (!fileType) return 'fas fa-file';
        if (fileType.includes('pdf')) return 'fas fa-file-pdf';
        if (fileType.includes('word') || fileType.includes('document')) return 'fas fa-file-word';
        if (fileType.includes('excel') || fileType.includes('sheet')) return 'fas fa-file-excel';
        if (fileType.includes('image')) return 'fas fa-file-image';
        if (fileType.includes('video')) return 'fas fa-file-video';
        if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return 'fas fa-file-archive';
        return 'fas fa-file';
    }

    isImage(fileType) {
        return fileType && fileType.startsWith('image/');
    }

    getStatusColor(status) {
        const colors = {
            'Menunggu': 'bg-yellow-100 text-yellow-700 border border-yellow-200',
            'Diproses': 'bg-blue-100 text-blue-700 border border-blue-200',
            'Selesai': 'bg-green-100 text-green-700 border border-green-200',
            'Ditolak': 'bg-red-100 text-red-700 border border-red-200',
            'Ditinjau': 'bg-orange-100 text-orange-700 border border-orange-200',
            'Aktif': 'bg-green-100 text-green-700 border border-green-200',
            'Arsip': 'bg-gray-100 text-gray-700 border border-gray-200',
            'Draft': 'bg-yellow-100 text-yellow-700 border border-yellow-200'
        };
        return colors[status] || 'bg-gray-100 text-gray-700 border border-gray-200';
    }

    getCategoryColor(category) {
        const colors = {
            'Informasi Berkala': 'bg-blue-100 text-blue-700',
            'Informasi Serta Merta': 'bg-yellow-100 text-yellow-700',
            'Informasi Setiap Saat': 'bg-green-100 text-green-700',
            'Informasi Dikecualikan': 'bg-red-100 text-red-700'
        };
        return colors[category] || 'bg-gray-100 text-gray-700';
    }
}

// Initialize API Singleton
const api = new PPIDAPI();

// Export for module systems (jika dijalankan di environment Node.js, meski utamanya untuk browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PPIDAPI, api };
}