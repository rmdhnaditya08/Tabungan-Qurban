// Polyfill untuk window.storage (API khusus Claude Artifacts)
// Di luar claude.ai, kita ganti dengan localStorage browser biasa.
// Catatan: parameter "shared" diabaikan karena tidak ada backend server di sini,
// jadi data hanya tersimpan secara lokal di browser masing-masing pengguna.

if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    async get(key) {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return { key, value: raw };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return { key, value };
    },
    async delete(key) {
      const existed = localStorage.getItem(key) !== null;
      localStorage.removeItem(key);
      return { key, deleted: existed };
    },
    async list(prefix = '') {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
      return { keys, prefix };
    },
  };
}
