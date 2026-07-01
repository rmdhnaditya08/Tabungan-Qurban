import { useState } from 'react';
import { Wallet, Plus, Trash2, AlertCircle } from 'lucide-react';
import { genId, animalEmoji, inputCls } from '../utils';
import { Field } from './Modals';

export default function SettingsPanel({ settings, persistSettings }) {
  const [namaProgram, setNamaProgram] = useState(settings.namaProgram);
  const [targetDefault, setTargetDefault] = useState(String(settings.targetDefault));
  const [adminWhatsapp, setAdminWhatsapp] = useState(settings.adminWhatsapp || '');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [animalTypes, setAnimalTypes] = useState((settings.animalTypes || []).map((a) => ({ ...a, quota: a.quota || 1 })));
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [logoError, setLogoError] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('ok');

  function flash(text, type = 'ok') {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 2500);
  }

  function handleLogoFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setLogoError('File harus berupa gambar.'); return; }
    if (file.size > 1.5 * 1024 * 1024) { setLogoError('Ukuran gambar maksimal 1.5MB.'); return; }
    setLogoError('');
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result);
    reader.onerror = () => setLogoError('Gagal membaca file.');
    reader.readAsDataURL(file);
  }

  async function saveLogo() {
    await persistSettings({ ...settings, logoUrl: logoUrl || undefined });
    flash('Logo disimpan.');
  }

  async function removeLogo() {
    setLogoUrl('');
    setLogoError('');
    await persistSettings({ ...settings, logoUrl: undefined });
    flash('Logo dikembalikan ke ikon default.');
  }

  async function saveGeneral() {
    await persistSettings({ ...settings, namaProgram: namaProgram.trim() || 'Tabungan Qurban', targetDefault: Number(targetDefault) || 0, adminWhatsapp: adminWhatsapp.replace(/\D/g, '') });
    flash('Pengaturan umum disimpan.');
  }

  async function changePin() {
    if (oldPin !== settings.adminPin) { flash('PIN lama salah.', 'err'); return; }
    if (newPin.length < 4) { flash('PIN baru minimal 4 digit.', 'err'); return; }
    await persistSettings({ ...settings, adminPin: newPin });
    setOldPin(''); setNewPin('');
    flash('PIN admin berhasil diubah.');
  }

  function updateAnimalRow(idx, field, value) {
    setAnimalTypes((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
  }
  function addAnimalRow() {
    setAnimalTypes((prev) => [...prev, { id: genId(), name: '', price: '', quota: 1 }]);
  }
  function removeAnimalRow(idx) {
    setAnimalTypes((prev) => prev.filter((_, i) => i !== idx));
  }
  async function saveAnimalTypes() {
    const cleaned = animalTypes.filter((a) => a.name.trim()).map((a) => ({ id: a.id, name: a.name.trim(), price: Number(a.price) || 0, quota: Number(a.quota) || 1 }));
    setAnimalTypes(cleaned);
    await persistSettings({ ...settings, animalTypes: cleaned });
    flash('Jenis hewan qurban disimpan.');
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-stone-100 p-4 space-y-3">
        <h3 className="text-sm font-medium text-stone-700">Umum</h3>
        <Field label="Nama Program">
          <input value={namaProgram} onChange={(e) => setNamaProgram(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Target Tabungan Default (Rp)">
          <input value={targetDefault} onChange={(e) => setTargetDefault(e.target.value.replace(/\D/g, ''))} className={inputCls} />
        </Field>
        <Field label="Nomor WhatsApp Admin (untuk konfirmasi pembayaran)">
          <input value={adminWhatsapp} onChange={(e) => setAdminWhatsapp(e.target.value.replace(/[^\d+]/g, ''))} className={inputCls} placeholder="08xxxxxxxxxx" />
        </Field>
        <button onClick={saveGeneral} className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition">
          Simpan
        </button>
      </div>

      <div className="bg-white rounded-xl border border-stone-100 p-4 space-y-3">
        <h3 className="text-sm font-medium text-stone-700">Logo & Tampilan</h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <Wallet size={26} className="text-stone-400" />}
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-3">
              <label className="inline-block px-3 py-2 rounded-xl bg-stone-100 text-stone-700 text-sm font-medium cursor-pointer hover:bg-stone-200 transition">
                Pilih Gambar
                <input type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
              </label>
              {logoUrl && (
                <button onClick={removeLogo} className="text-sm text-red-500 hover:underline">Hapus Logo</button>
              )}
            </div>
            <p className="text-xs text-stone-400">Gambar persegi, maksimal 1.5MB, untuk hasil terbaik.</p>
          </div>
        </div>
        {logoError && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={14} />{logoError}</p>}
        <button onClick={saveLogo} className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition">
          Simpan Logo
        </button>
      </div>

      <div className="bg-white rounded-xl border border-stone-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-stone-700">Jenis Hewan Qurban</h3>
          <button onClick={addAnimalRow} title="Tambah jenis hewan" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
            <Plus size={15} />
          </button>
        </div>
        <div className="space-y-2">
          {animalTypes.map((a, idx) => (
            <div key={a.id} className="flex gap-2 items-center">
              <span className="text-base">{animalEmoji(a.name)}</span>
              <input value={a.name} onChange={(e) => updateAnimalRow(idx, 'name', e.target.value)} placeholder="Nama hewan" className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={a.price} onChange={(e) => updateAnimalRow(idx, 'price', e.target.value.replace(/\D/g, ''))} placeholder="Harga" className="w-24 px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" inputMode="numeric" />
              <input value={a.quota} onChange={(e) => updateAnimalRow(idx, 'quota', e.target.value.replace(/\D/g, ''))} placeholder="Kuota" title="Kuota orang per ekor (1 = tidak patungan)" className="w-16 px-2 py-2 rounded-lg border border-stone-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" inputMode="numeric" />
              <button onClick={() => removeAnimalRow(idx)} title="Hapus" className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {animalTypes.length === 0 && <p className="text-xs text-stone-400">Belum ada jenis hewan. Tambahkan dengan tombol + di atas.</p>}
        </div>
        <p className="text-xs text-stone-400">Kolom "Kuota" = jumlah orang patungan per ekor. Isi 7 untuk Sapi/Kerbau patungan, 1 untuk hewan individu (Kambing/Domba). Shohibul Qurban akan otomatis dikelompokkan per kuota di tab Kelompok.</p>
        <button onClick={saveAnimalTypes} className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition">
          Simpan Jenis Hewan
        </button>
      </div>

      <div className="bg-white rounded-xl border border-stone-100 p-4 space-y-3">
        <h3 className="text-sm font-medium text-stone-700">Ubah PIN Admin</h3>
        <Field label="PIN Lama">
          <input type="password" value={oldPin} onChange={(e) => setOldPin(e.target.value)} className={inputCls} inputMode="numeric" />
        </Field>
        <Field label="PIN Baru">
          <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} className={inputCls} inputMode="numeric" />
        </Field>
        <button onClick={changePin} className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition">
          Ubah PIN
        </button>
      </div>
      {msg && <p className={`text-sm ${msgType === 'err' ? 'text-red-500' : 'text-blue-600'}`}>{msg}</p>}
    </div>
  );
}
