/**
 * PPID API - Google Apps Script Integration
 * Menangani seluruh komunikasi antara frontend dan backend Google Apps Script.
 * 
 * @version 2.2.0
 * @author PPID Kemenag Kab. Lima Puluh Kota
 */

class PPIDAPI {
    constructor() {
        this.scriptUrl = CONFIG.GOOGLE_SCRIPT_URL;
    }

    /**
     * Method request generik untuk berkomunikasi dengan Google Apps Script
     * @param {string} action - Aksi yang akan dilakukan (misal: 'getDokumen', 'addDokumen')
     * @param {object} data - Payload data yang akan dikirim ke backend
     * @returns {Promise<object>} - Respon dari API berisi { success: boolean, data?: any, error?: string }
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
    
    /**
     * Mengambil daftar dokumen, bisa difilter berdasarkan kategori
     * @param {string|null} kategori - Kategori dokumen (opsional)
     * @returns {Promise<object>}
     */
    async getDokumen(kategori = null) {
        return await this.request('getDokumen', { kategori });
    }

    /**
     * Menambahkan dokumen baru ke database
     * @param {object} dokumen - Objek data dokumen
     * @returns {Promise<object>}
     */
    async addDokumen(dokumen) {
        return await this.request('addDokumen', dokumen);
    }

    /**
     * Memperbarui data dokumen yang sudah ada
     * @param {string} id - ID dokumen
     * @param {object} updates - Objek berisi field yang akan diupdate
     * @returns {Promise<object>}
     */
    async updateDokumen(id, updates) {
        return await this.request('updateDokumen', { id, ...updates });
    }

    /**
     * Menghapus dokumen berdasarkan ID
     * @param {string} id - ID dokumen
     * @returns {Promise<object>}
     */
    async deleteDokumen(id) {
        return await this.request('deleteDokumen', { id });
    }

    // ==========================================
    // PERMOHONAN OPERATIONS
    // ==========================================
    
    /**
     * Mengambil semua data permohonan informasi
     * @returns {Promise<object>}
     */
    async getPermohonan() {
        return await this.request('getPermohonan');
    }

    /**
     * Menambahkan permohonan informasi baru dari publik
     * @param {object} permohonan - Objek data permohonan
     * @returns {Promise<object>}
     */
    async addPermohonan(permohonan) {
        return await this.request('addPermohonan', permohonan);
    }

    /**
     * Memperbarui status atau balasan permohonan
     * @param {string} id - ID permohonan
     * @param {object} updates - Objek berisi field yang akan diupdate (misal: { status: 'Selesai', balasan: '...' })
     * @returns {Promise<object>}
     */
    async updatePermohonan(id, updates) {
        return await this.request('updatePermohonan', { id, ...updates });
    }

    // ==========================================
    // KEBERATAN OPERATIONS
    // ==========================================
    
    /**
     * Mengambil semua data pengajuan keberatan
     * @returns {Promise<object>}
     */
    async getKeberatan() {
        return await this.request('getKeberatan');
    }

    /**
     * Menambahkan pengajuan keberatan baru
     * @param {object} keberatan - Objek data keberatan
     * @returns {Promise<object>}
     */
    async addKeberatan(keberatan) {
        return await this.request('addKeberatan', keberatan);
    }

    /**
     * Memperbarui status atau balasan keberatan
     * @param {string} id - ID keberatan
     * @param {object} updates - Objek berisi field yang akan diupdate
     * @returns {Promise<object>}
     */
    async updateKeberatan(id, updates) {
        return await this.request('updateKeberatan', { id, ...updates });
    }

    // ==========================================
    // USER OPERATIONS
    // ==========================================
    
    /**
     * Autentikasi pengguna (Admin)
     * @param {string} username - Username admin
     * @param {string} password - Password admin
     * @returns {Promise<object>}
     */
    async login(username, password) {
        return await this.request('login', { username, password });
    }

    // ==========================================
    // PROFIL OPERATIONS
    // ==========================================
    
    /**
     * Mengambil data profil PPID
     * @returns {Promise<object>}
     */
    async getProfil() {
        return await this.request('getProfil');
    }

    /**
     * Memperbarui data profil PPID
     * @param {object} profil - Objek data profil baru
     * @returns {Promise<object>}
     */
    async updateProfil(profil) {
        return await this.request('updateProfil', profil);
    }

    // ==========================================
    // LOG & STATS OPERATIONS
    // ==========================================
    
    /**
     * Mengambil log aktivitas sistem
     * @returns {Promise<object>}
     */
    async getLogs() {
        return await this.request('getLogs');
    }

    /**
     * Mengambil statistik ringkasan dashboard
     * @returns {Promise<object>}
     */
    async getStats() {
        return await this.request('getStats');
    }

    // ==========================================
    // FILE UPLOAD OPERATIONS
    // ==========================================
    
    /**
     * Mengupload file ke Google Drive melalui Google Apps Script
     * @param {File} file - Objek File HTML5 yang akan diupload
     * @returns {Promise<object>} - Hasil upload berisi { success, fileUrl, fileName, fileId, mimeType }
     */
    async uploadFile(file) {
        return new Promise((resolve, reject) => {
            // 1. Validasi ukuran file SEBELUM dibaca untuk mencegah browser crash/hang
            if (file.size > CONFIG.MAX_FILE_SIZE) {
                reject(new Error(`Ukuran file (${CONFIG.formatFileSize(file.size)}) melebihi batas maksimal ${CONFIG.MAX_FILE_SIZE_MB}MB`));
                return;
            }

            // 2. Validasi tipe file (MIME type)
            if (!CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
                reject(new Error('Tipe file tidak diizinkan. Gunakan format PDF, DOC, XLS, PPT, ZIP, atau Image (JPG/PNG).'));
                return;
            }

            // 3. Validasi file kosong (0 bytes)
            if (file.size === 0) {
                reject(new Error('File yang dipilih kosong (0 bytes). Silakan pilih file yang valid.'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    // Hapus prefix "data:application/pdf;base64," dari string base64
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
                        // Jika backend mengembalikan error spesifik (misal: ID Folder salah)
                        reject(new Error(result.error || 'Gagal mengupload file ke server.'));
                    }
                } catch (error) {
                    reject(new Error('Gagal memproses data file: ' + error.message));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Gagal membaca file. Pastikan file tidak sedang dibuka/digunakan oleh aplikasi lain, atau file tersebut rusak.'));
            };
            
            // Baca file sebagai Data URL (Base64)
            reader.readAsDataURL(file);
        });
    }

    // ==========================================
    // HELPER FUNCTIONS (UI Utilities)
    // ==========================================
    
    /**
     * Mengembalikan class icon FontAwesome berdasarkan tipe file
     * @param {string} fileType - MIME type file
     * @returns {string} - Class icon FontAwesome
     */
    getFileIcon(fileType) {
        if (!fileType) return 'fas fa-file';
        if (fileType.includes('pdf')) return 'fas fa-file-pdf';
        if (fileType.includes('word') || fileType.includes('document')) return 'fas fa-file-word';
        if (fileType.includes('excel') || fileType.includes('sheet')) return 'fas fa-file-excel';
        if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'fas fa-file-powerpoint';
        if (fileType.includes('image')) return 'fas fa-file-image';
        if (fileType.includes('video')) return 'fas fa-file-video';
        if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return 'fas fa-file-archive';
        return 'fas fa-file';
    }

    /**
     * Mengecek apakah file adalah gambar
     * @param {string} fileType - MIME type file
     * @returns {boolean}
     */
    isImage(fileType) {
        return fileType && fileType.startsWith('image/');
    }

    /**
     * Mengembalikan class Tailwind CSS untuk badge status
     * @param {string} status - Status data
     * @returns {string} - Class Tailwind CSS
     */
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

    /**
     * Mengembalikan class Tailwind CSS untuk badge kategori
     * @param {string} category - Kategori informasi
     * @returns {string} - Class Tailwind CSS
     */
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