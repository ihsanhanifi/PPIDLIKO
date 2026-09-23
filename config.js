/**
 * PPID Configuration & Utility Module
 * Berisi konfigurasi aplikasi dan helper functions untuk PPID Kemenag Liko
 * 
 * @version 2.3.0
 * @author PPID Kemenag Kab. Lima Puluh Kota
 */

const CONFIG = {
    // ========================================
    // KONFIGURASI UTAMA
    // ========================================
    
    // URL Google Apps Script Web App (WAJIB DIISI)
    // PASTIKAN: Deploy sebagai "Web App", Execute as: "Me", Who has access: "Anyone" (Siapa saja)
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzTLPJfpMgX8vjE2klklh5bh7uH86MR1np5A1qoQpjuugMrhuUQwWswjTSwTC95RLb6rA/exec',
    
    // Informasi Aplikasi
    APP_NAME: 'PPID Kemenag Kab. Lima Puluh Kota',
    APP_VERSION: '2.3.0',
    APP_ENV: 'production', // 'development' atau 'production'
    DEBUG_MODE: false, // Set true untuk melihat log API detail di console browser
    
    // ========================================
    // KONFIGURASI FILE UPLOAD
    // ========================================
    
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB dalam bytes
    MAX_FILE_SIZE_MB: 10, // Untuk tampilan UI
    
    ALLOWED_IMAGE_TYPES: [
        'image/jpeg', 
        'image/jpg', 
        'image/png', 
        'image/gif', 
        'image/webp'
    ],
    
    ALLOWED_FILE_TYPES: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/zip',
        'application/x-zip-compressed',
        'application/x-rar-compressed'
    ],
    
    // ========================================
    // KONFIGURASI API
    // ========================================
    
    API_TIMEOUT: 30000, // 30 detik
    API_RETRY_COUNT: 2, // Retry 2x jika gagal (total 3x percobaan)
    API_RETRY_DELAY: 1500, // Delay 1.5 detik antar retry
    
    // ========================================
    // KONFIGURASI DATA
    // ========================================
    
    STATUS_PERMOHONAN: ['Menunggu', 'Diproses', 'Selesai', 'Ditolak'],
    STATUS_KEBERATAN: ['Ditinjau', 'Diproses', 'Selesai', 'Ditolak'],
    STATUS_DOKUMEN: ['Aktif', 'Arsip', 'Draft'],
    
    KATEGORI: [
        'Informasi Berkala',
        'Informasi Serta Merta',
        'Informasi Setiap Saat',
        'Informasi Dikecualikan'
    ],
    
    // ========================================
    // API REQUEST METHOD (dengan timeout & retry)
    // ========================================
    
    async apiRequest(action, data = {}, retryCount = 0) {
        // 1. Validasi URL
        if (!this.GOOGLE_SCRIPT_URL || 
            this.GOOGLE_SCRIPT_URL.includes('YOUR_DEPLOYMENT_ID') ||
            !this.GOOGLE_SCRIPT_URL.startsWith('https://script.google.com/')) {
            this.log('error', 'Google Apps Script URL belum dikonfigurasi dengan benar!');
            return { 
                success: false, 
                error: 'URL Google Apps Script belum dikonfigurasi. Silakan edit config.js dan isi GOOGLE_SCRIPT_URL dengan URL deployment Anda.' 
            };
        }

        this.log('info', `API Request: ${action}`, data);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT);

            // Catatan: 'text/plain' digunakan untuk mencegah CORS preflight (OPTIONS request) 
            // yang sering bermasalah/tidak didukung dengan baik oleh Google Apps Script.
            const response = await fetch(this.GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'text/plain;charset=utf-8',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    action, 
                    data, 
                    timestamp: new Date().toISOString(),
                    appVersion: this.APP_VERSION
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // 2. Safe JSON Parsing (GAS kadang mengembalikan HTML error page jika script crash)
            const textResponse = await response.text();
            let result;
            try {
                result = JSON.parse(textResponse);
            } catch (parseError) {
                this.log('error', 'Failed to parse JSON response:', textResponse.substring(0, 200));
                throw new Error('Server mengembalikan respon yang tidak valid (bukan JSON). Periksa log Google Apps Script.');
            }
            
            this.log('info', `API Response: ${action}`, result);
            return result;
            
        } catch (error) {
            this.log('error', `API Error [${action}]:`, error);
            
            // Retry mechanism
            if (retryCount < this.API_RETRY_COUNT) {
                this.log('warn', `Retrying ${action}... (${retryCount + 1}/${this.API_RETRY_COUNT})`);
                await this.delay(this.API_RETRY_DELAY * (retryCount + 1));
                return this.apiRequest(action, data, retryCount + 1);
            }

            // Handle specific error types
            let errorMessage = 'Terjadi kesalahan tidak diketahui';
            
            if (error.name === 'AbortError') {
                errorMessage = 'Request timeout. Server Google Apps Script tidak merespon dalam 30 detik.';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage = 'Gagal terhubung ke server. Periksa koneksi internet Anda atau pastikan URL deployment benar.';
            } else {
                errorMessage = error.message;
            }

            return { 
                success: false, 
                error: errorMessage,
                action: action
            };
        }
    },
    
    // ========================================
    // AUTHENTICATION HELPERS
    // ========================================
    
    isAdmin() {
        try {
            const session = localStorage.getItem('ppid_session');
            if (!session) return false;
            const user = JSON.parse(session);
            return user.role === 'admin';
        } catch (error) {
            this.log('error', 'Error checking admin status:', error);
            localStorage.removeItem('ppid_session'); // Clear corrupt session
            return false;
        }
    },
    
    getCurrentUser() {
        try {
            const session = localStorage.getItem('ppid_session');
            return session ? JSON.parse(session) : null;
        } catch (error) {
            this.log('error', 'Error getting current user:', error);
            localStorage.removeItem('ppid_session');
            return null;
        }
    },
    
    logout() {
        localStorage.removeItem('ppid_session');
        window.location.href = 'login.html';
    },
    
    checkAuth() {
        if (!this.isAdmin()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },
    
    // ========================================
    // DATE, TIME & CURRENCY FORMATTING
    // ========================================
    
    formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleDateString('id-ID', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        } catch (error) {
            return '-';
        }
    },
    
    formatDateTime(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleString('id-ID', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return '-';
        }
    },
    
    formatRelativeTime(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (seconds < 60) return 'Baru saja';
            if (minutes < 60) return `${minutes} menit yang lalu`;
            if (hours < 24) return `${hours} jam yang lalu`;
            if (days < 7) return `${days} hari yang lalu`;
            return this.formatDate(dateString);
        } catch (error) {
            return '-';
        }
    },

    formatRupiah(angka) {
        if (angka === null || angka === undefined || angka === '') return 'Rp 0';
        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });
        return formatter.format(angka);
    },
    
    // ========================================
    // FILE & SIZE HELPERS
    // ========================================
    
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },
    
    isFileSizeValid(file) {
        return file.size <= this.MAX_FILE_SIZE;
    },
    
    isFileTypeAllowed(file) {
        return this.ALLOWED_FILE_TYPES.includes(file.type);
    },
    
    // ========================================
    // VALIDATION HELPERS
    // ========================================
    
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).trim().toLowerCase());
    },
    
    validatePhone(phone) {
        const re = /^(\+62|62|0)[0-9]{9,13}$/;
        return re.test(String(phone).trim().replace(/[\s-]/g, ''));
    },
    
    validateNIK(nik) {
        const re = /^[0-9]{16}$/;
        return re.test(String(nik).trim());
    },
    
    // ========================================
    // UTILITY HELPERS
    // ========================================
    
    sanitize(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    truncate(text, maxLength = 100) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },
    
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    generateId(prefix = 'ID') {
        // Gunakan crypto.randomUUID() jika tersedia (lebih aman dan unik), fallback ke metode lama
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return `${prefix}-${crypto.randomUUID()}`;
        }
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },
    
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        // Fallback untuk browser lama
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        } finally {
            document.body.removeChild(textarea);
        }
    },
    
    // ========================================
    // LOGGING HELPERS
    // ========================================
    
    log(level, ...args) {
        if (!this.DEBUG_MODE) return;
        
        const timestamp = new Date().toLocaleTimeString('id-ID');
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        const style = level === 'error' ? 'color: #ef4444; font-weight: bold;' : 
                      level === 'warn' ? 'color: #f59e0b; font-weight: bold;' : 
                      'color: #3b82f6;';
        
        console.log(`%c${prefix}`, style, ...args);
    },
    
    // ========================================
    // CONNECTION TEST
    // ========================================
    
    async testConnection() {
        try {
            const result = await this.apiRequest('getProfil');
            return result.success;
        } catch (error) {
            return false;
        }
    }
};

// Export untuk module systems (jika dijalankan di environment Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}