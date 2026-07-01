import { useState } from 'react';
import { X, AlertCircle, Upload, MessageCircle, Trash2, Plus, CheckCircle2 } from 'lucide-react';
import {
  headFont,
  inputCls,
  todayStr,
  formatRupiah,
  genId,
  toWaNumber,
  formatDate,
  animalEmoji
} from '../utils';

export function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-stone-500">{label}</label>
      {children}
    </div>
  );
}

export function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-900" style={headFont}>{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 text-stone-400">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function MemberModal({ title, initial, defaultTarget, animalTypes, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [pin, setPin] = useState(initial?.pin || '');
  const [animalId, setAnimalId] = useState(initial?.animalId || '');
  const [target, setTarget] = useState(initial?.target ? String(initial.target) : '');
  const [err, setErr] = useState('');

  function handleSave() {
    if (!name.trim() || !phone.trim() || !pin.trim()) {
      setErr('Nama, No. HP, dan PIN wajib diisi.');
      return;
    }
    if (pin.trim().length < 4) {
      setErr('PIN minimal 4 digit.');
      return;
    }
    onSave({
      name: name.trim(),
      phone: phone.trim(),
      pin: pin.trim(),
      animalId: animalId || undefined,
      target: target ? Number(target) : undefined,
      joinDate: initial?.joinDate || todayStr(),
    });
  }

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nama Lengkap">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Nama Shohibul Qurban" />
        </Field>
        <Field label="Nomor HP">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="08xxxxxxxxxx" />
        </Field>
        <Field label="PIN (untuk login Shohibul Qurban)">
          <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className={inputCls} placeholder="4-6 digit" inputMode="numeric" />
        </Field>
        <Field label="Pilihan Hewan Qurban">
          <select value={animalId} onChange={(e) => setAnimalId(e.target.value)} className={inputCls}>
            <option value="">Belum dipilih</option>
            {(animalTypes || []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {formatRupiah(a.price)}{(a.quota || 1) > 1 ? `/orang (kuota ${a.quota})` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Target Custom (opsional, override harga hewan / default ${formatRupiah(defaultTarget)})`}>
          <input value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))} className={inputCls} placeholder="cth: 3000000" />
        </Field>
        {err && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={14} />{err}</p>}
        <button onClick={handleSave} className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
          Simpan
        </button>
      </div>
    </ModalShell>
  );
}

export function TransactionModal({ memberName, onClose, onSave }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [type, setType] = useState('setor');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  function handleSave() {
    const num = Number(amount);
    if (!num || num <= 0) {
      setErr('Jumlah harus lebih dari 0.');
      return;
    }
    onSave({ amount: num, date, type, note: note.trim() });
  }

  return (
    <ModalShell title={`Catat Transaksi — ${memberName}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <button onClick={() => setType('setor')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${type === 'setor' ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-500'}`}>
            Setor
          </button>
          <button onClick={() => setType('tarik')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${type === 'tarik' ? 'bg-red-500 text-white' : 'bg-stone-100 text-stone-500'}`}>
            Tarik
          </button>
        </div>
        <Field label="Jumlah (Rp)">
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} className={inputCls} placeholder="50000" inputMode="numeric" />
        </Field>
        <Field label="Tanggal">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Catatan (opsional)">
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="cth: setoran bulan Juni" />
        </Field>
        {err && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={14} />{err}</p>}
        <button onClick={handleSave} className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
          Simpan Transaksi
        </button>
      </div>
    </ModalShell>
  );
}

export function PaymentConfirmModal({ member, settings, onClose, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [proofName, setProofName] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErr('File bukti transfer harus berupa gambar.'); return; }
    if (file.size > 2 * 1024 * 1024) { setErr('Ukuran gambar maksimal 2MB.'); return; }
    setErr('');
    const reader = new FileReader();
    reader.onload = () => { setProofImage(reader.result); setProofName(file.name); };
    reader.onerror = () => setErr('Gagal membaca file.');
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    const num = Number(amount);
    if (!num || num <= 0) { setErr('Jumlah transfer harus lebih dari 0.'); return; }
    if (!proofImage) { setErr('Bukti transfer wajib diunggah.'); return; }
    setSubmitting(true);
    const confirmation = {
      id: genId(),
      memberId: member.id,
      memberName: member.name,
      amount: num,
      date,
      note: note.trim(),
      proofImage,
      status: 'pending',
      createdAt: Date.now(),
    };
    await onSubmit(confirmation);

    const text = `Halo Admin ${settings.namaProgram},\n\nSaya ${member.name} (${member.phone}) telah melakukan transfer cicilan tabungan qurban:\nJumlah: ${formatRupiah(num)}\nTanggal: ${formatDate(date)}\nCatatan: ${note.trim() || '-'}\n\nBukti transfer sudah saya unggah di aplikasi. Mohon dicek dan dikonfirmasi ya. Terima kasih.`;
    const wa = toWaNumber(settings.adminWhatsapp);
    if (wa) {
      window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      setErr('Konfirmasi tersimpan, tapi admin belum mengatur nomor WhatsApp. Hubungi admin secara manual.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onClose();
  }

  return (
    <ModalShell title="Konfirmasi Pembayaran" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-stone-500">Isi detail transfer Anda, unggah bukti transfer, lalu kirim konfirmasi ke WhatsApp admin.</p>
        <Field label="Jumlah Transfer (Rp)">
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} className={inputCls} placeholder="cth: 250000" inputMode="numeric" />
        </Field>
        <Field label="Tanggal Transfer">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Catatan (opsional)">
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="cth: transfer via BCA" />
        </Field>
        <Field label="Bukti Transfer">
          <label className="mt-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-stone-300 text-sm text-stone-500 cursor-pointer hover:bg-stone-50 transition">
            <Upload size={16} />
            {proofName || 'Pilih foto / screenshot bukti transfer'}
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
          {proofImage && (
            <img src={proofImage} alt="Pratinjau bukti transfer" className="mt-2 max-h-40 rounded-lg border border-stone-200" />
          )}
        </Field>
        {err && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={14} />{err}</p>}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition disabled:opacity-60"
        >
          <MessageCircle size={16} /> {submitting ? 'Mengirim...' : 'Kirim Konfirmasi ke WhatsApp Admin'}
        </button>
      </div>
    </ModalShell>
  );
}

export function ConfirmModal({ message, onCancel, onConfirm }) {
  return (
    <ModalShell title="Konfirmasi" onClose={onCancel}>
      <p className="text-sm text-stone-600 mb-4">{message}</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-sm font-medium hover:bg-stone-200 transition">
          Batal
        </button>
        <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition">
          Hapus
        </button>
      </div>
    </ModalShell>
  );
}

export function ResetPinModal({ memberName, onClose, onSave }) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [err, setErr] = useState('');

  function handleSave() {
    if (newPin.trim().length < 4) { setErr('PIN baru minimal 4 digit.'); return; }
    if (newPin.trim() !== confirmPin.trim()) { setErr('Konfirmasi PIN tidak cocok.'); return; }
    onSave(newPin.trim());
  }

  return (
    <ModalShell title={`Reset PIN — ${memberName}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-stone-400">PIN baru akan langsung berlaku, Shohibul Qurban bisa login menggunakan PIN ini.</p>
        <Field label="PIN Baru">
          <input
            type="password"
            inputMode="numeric"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            placeholder="4-6 digit"
            className={inputCls}
          />
        </Field>
        <Field label="Konfirmasi PIN Baru">
          <input
            type="password"
            inputMode="numeric"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            placeholder="ulangi PIN baru"
            className={inputCls}
          />
        </Field>
        {err && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={14} />{err}</p>}
        <button onClick={handleSave} className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
          Simpan PIN Baru
        </button>
      </div>
    </ModalShell>
  );
}

export function GroupEditorModal({ type, members, currentOverride, balanceFor, onClose, onSave }) {
  const allForType = Object.entries(members)
    .filter(([, m]) => m.animalId === type.id)
    .map(([id, m]) => ({ id, ...m }))
    .sort((a, b) => (a.joinDate || '').localeCompare(b.joinDate || '') || a.id.localeCompare(b.id));

  const initGroups = () => {
    if (currentOverride?.groups?.length) {
      return currentOverride.groups.map((g) => [...g]);
    }
    const quota = type.quota || 7;
    const res = [];
    const ids = allForType.map((m) => m.id);
    for (let i = 0; i < ids.length; i += quota) res.push(ids.slice(i, i + quota));
    return res.length ? res : [[]];
  };

  const [groups, setGroups] = useState(initGroups);
  const [groupNames, setGroupNames] = useState(() => {
    if (currentOverride?.names) return [...currentOverride.names];
    const auto = initGroups();
    return auto.map((_, i) => `Kelompok ${i + 1}`);
  });

  const assignedIds = new Set(groups.flat());
  const unassigned = allForType.filter((m) => !assignedIds.has(m.id));

  function addGroup() {
    setGroups((g) => [...g, []]);
    setGroupNames((n) => [...n, `Kelompok ${groups.length + 1}`]);
  }
  function removeGroup(gi) {
    const newGroups = groups.filter((_, i) => i !== gi);
    const newNames = groupNames.filter((_, i) => i !== gi);
    setGroups(newGroups.length ? newGroups : [[]]);
    setGroupNames(newNames.length ? newNames : ['Kelompok 1']);
  }
  function moveMember(memberId, toGroup) {
    setGroups((prev) => {
      const next = prev.map((g) => g.filter((id) => id !== memberId));
      if (toGroup !== null && toGroup >= 0 && toGroup < next.length) {
        next[toGroup] = [...next[toGroup], memberId];
      }
      return next;
    });
  }
  function renameGroup(gi, name) {
    setGroupNames((prev) => prev.map((n, i) => i === gi ? name : n));
  }
  function handleSave() {
    const cleaned = groups.length > 1 ? groups.filter((g) => g.length > 0) : groups;
    const cleanedNames = cleaned.map((_, i) => groupNames[i] || `Kelompok ${i + 1}`);
    onSave({ groups: cleaned, names: cleanedNames });
  }

  const chipCls = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-700 cursor-grab select-none';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100 shrink-0">
          <div>
            <h3 className="font-semibold text-stone-900" style={headFont}>
              {animalEmoji(type.name)} Edit Kelompok — {type.name}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">Atur kelompok patungan secara manual</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400"><X size={18}/></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {groups.map((grp, gi) => (
            <div key={gi} className="border border-stone-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={groupNames[gi] || ''}
                  onChange={(e) => renameGroup(gi, e.target.value)}
                  className="flex-1 text-sm font-medium text-stone-800 bg-transparent border-b border-dashed border-stone-300 focus:outline-none focus:border-blue-500 py-0.5"
                  placeholder={`Kelompok ${gi + 1}`}
                />
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${grp.length >= type.quota ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                  {grp.length}/{type.quota}
                </span>
                {groups.length > 1 && (
                  <button onClick={() => removeGroup(gi)} title="Hapus kelompok" className="p-1 rounded-lg hover:bg-red-50 text-red-400 shrink-0">
                    <Trash2 size={14}/>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[36px]">
                {grp.length === 0 && (
                  <p className="text-xs text-stone-300 italic py-1">Belum ada anggota</p>
                )}
                {grp.map((memberId) => {
                  const m = members[memberId];
                  if (!m) return null;
                  return (
                    <div key={memberId} className={chipCls}>
                      <span>{m.name}</span>
                      <span className="text-stone-400">·</span>
                      <span className="text-blue-600">{formatRupiah(balanceFor(memberId))}</span>
                      {groups.length > 1 && (
                        <div className="flex gap-0.5 ml-1">
                          {groups.map((_, ti) => ti !== gi && (
                            <button
                              key={ti}
                              onClick={() => moveMember(memberId, ti)}
                              title={`Pindah ke ${groupNames[ti] || `Kelompok ${ti + 1}`}`}
                              className="w-5 h-5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold hover:bg-blue-200 flex items-center justify-center transition"
                            >
                              {ti + 1}
                            </button>
                          ))}
                        </div>
                      )}
                      <button onClick={() => moveMember(memberId, null)} title="Keluarkan dari kelompok" className="ml-0.5 text-red-400 hover:text-red-600">
                        <X size={12}/>
                      </button>
                    </div>
                  );
                })}
              </div>

              {unassigned.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-stone-50">
                  <span className="text-[11px] text-stone-400 w-full">Tambahkan ke kelompok ini:</span>
                  {unassigned.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => moveMember(m.id, gi)}
                      className="px-2 py-1 rounded-lg border border-dashed border-blue-300 text-xs text-blue-600 hover:bg-blue-50 transition"
                    >
                      + {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {unassigned.length > 0 && (
            <div className="border border-dashed border-stone-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-medium text-stone-500">Belum dikelompokkan ({unassigned.length} orang)</p>
              <div className="flex flex-wrap gap-1.5">
                {unassigned.map((m) => (
                  <div key={m.id} className={chipCls + ' border-dashed opacity-70'}>
                    <span>{m.name}</span>
                    <div className="flex gap-0.5 ml-1">
                      {groups.map((_, gi) => (
                        <button
                          key={gi}
                          onClick={() => moveMember(m.id, gi)}
                          title={`Masukkan ke ${groupNames[gi] || `Kelompok ${gi + 1}`}`}
                          className="w-5 h-5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold hover:bg-blue-200 flex items-center justify-center transition"
                        >
                          {gi + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={addGroup} className="w-full py-2.5 rounded-xl border border-dashed border-blue-300 text-blue-600 text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-50 transition">
            <Plus size={15}/> Tambah Kelompok Baru
          </button>
        </div>

        <div className="px-5 py-4 border-t border-stone-100 flex gap-2 shrink-0">
          <button
            onClick={() => onSave(null)}
            className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-sm font-medium hover:bg-stone-200 transition"
          >
            Reset Otomatis
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-sm font-medium hover:bg-stone-200 transition">
            Batal
          </button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
            Simpan Kelompok
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChangePinModal({ member, onClose, onSave }) {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);

  function handleSave() {
    if (oldPin.trim() !== member.pin) { setErr('PIN lama salah.'); return; }
    if (newPin.trim().length < 4) { setErr('PIN baru minimal 4 digit.'); return; }
    if (newPin.trim() !== confirmPin.trim()) { setErr('Konfirmasi PIN tidak cocok.'); return; }
    onSave(newPin.trim());
    setSuccess(true);
    setErr('');
    setTimeout(onClose, 1200);
  }

  return (
    <ModalShell title="Ganti PIN" onClose={onClose}>
      {success ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <CheckCircle2 size={40} className="text-blue-500" />
          <p className="text-sm font-medium text-stone-700">PIN berhasil diganti!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="PIN Lama">
            <input type="password" inputMode="numeric" value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g,''))} placeholder="••••" className={inputCls} />
          </Field>
          <Field label="PIN Baru">
            <input type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g,''))} placeholder="4-6 digit" className={inputCls} />
          </Field>
          <Field label="Konfirmasi PIN Baru">
            <input type="password" inputMode="numeric" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g,''))} placeholder="ulangi PIN baru" className={inputCls} />
          </Field>
          {err && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={14}/>{err}</p>}
          <button onClick={handleSave} className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
            Simpan PIN Baru
          </button>
        </div>
      )}
    </ModalShell>
  );
}
