// Polyfill untuk window.storage (API khusus Claude Artifacts)
// Versi ini terhubung ke Supabase, jadi data benar-benar tersinkron
// untuk semua pengguna (admin & shohibul qurban), bukan hanya tersimpan
// lokal di satu browser.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    'VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum diatur. ' +
    'Tambahkan di file .env (lokal) atau Environment Variables (Vercel).'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    async get(key) {
      const { data, error } = await supabase
        .from('kv_store')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { key, value: data.value };
    },
    async set(key, value) {
      const { error } = await supabase
        .from('kv_store')
        .upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw error;
      return { key, value };
    },
    async delete(key) {
      const { error } = await supabase.from('kv_store').delete().eq('key', key);
      if (error) throw error;
      return { key, deleted: true };
    },
    async list(prefix = '') {
      const { data, error } = await supabase
        .from('kv_store')
        .select('key')
        .like('key', `${prefix}%`);
      if (error) throw error;
      return { keys: (data || []).map((row) => row.key), prefix };
    },
  };
}

