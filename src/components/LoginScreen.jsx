import { useState } from 'react';
import { Wallet, LogIn, ShieldCheck, AlertCircle } from 'lucide-react';
import { toWaNumber, headFont, inputCls } from '../utils';
import { Field } from './Modals';

export default function LoginScreen({ members, settings, onLogin }) {
  const [tab, setTab] = useState('member');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [error, setError] = useState('');

  function handleMemberLogin() {
    const entry = Object.entries(members).find(([, m]) => m.phone === phone.trim());
    if (!entry) { setError('Nomor HP tidak ditemukan.'); return; }
    const [id, m] = entry;
    if (m.pin !== pin.trim()) { setError('PIN salah.'); return; }
    onLogin({ role: 'member', id });
  }

  function handleForgotPin() {
    if (!phone.trim()) { setError('Isi nomor HP Anda terlebih dahulu, lalu klik "Lupa PIN?" untuk menghubungi admin.'); return; }
    const wa = toWaNumber(settings.adminWhatsapp);
    if (!wa) { setError('Admin belum mengatur nomor WhatsApp. Hubungi admin secara langsung.'); return; }
    const text = `Assalamualaikum wr. wb Admin Tabungan Qurban Masjid Nurul Islam BCT\n\nSaya dengan nomor HP ${phone.trim()} lupa PIN untuk login ke aplikasi tabungan qurban. Mohon dibantu reset PIN saya. Terima kasih.`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank');
  }

  function handleAdminLogin() {
    if (adminPin.trim() !== settings.adminPin) { setError('PIN admin salah.'); return; }
    onLogin({ role: 'admin' });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-blue-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="relative inline-flex items-center justify-center w-16 h-16 mb-3">
            {!settings.logoUrl && (
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-blue-700 opacity-10" style={{ transform: 'scale(2.4)' }}>
                <rect x="20" y="20" width="60" height="60" fill="none" stroke="currentColor" strokeWidth="2" />
                <rect x="20" y="20" width="60" height="60" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(45 50 50)" />
              </svg>
            )}
            <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden ${settings.logoUrl ? 'bg-white border border-stone-200' : 'bg-blue-600 text-white'}`}>
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Wallet size={28} />
              )}
            </div>
          </div>
          <h1 className="text-xl font-semibold text-stone-900" style={headFont}>{settings.namaProgram}</h1>
          <p className="text-sm text-stone-500 mt-1">Masuk untuk melihat saldo tabungan Anda</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-1 flex mb-4">
          <button onClick={() => { setTab('member'); setError(''); }} className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${tab === 'member' ? 'bg-blue-600 text-white shadow' : 'text-stone-500'}`}>
            Shohibul Qurban
          </button>
          <button onClick={() => { setTab('admin'); setError(''); }} className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${tab === 'admin' ? 'bg-blue-600 text-white shadow' : 'text-stone-500'}`}>
            Admin
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          {tab === 'member' ? (
            <div className="space-y-4">
              <Field label="Nomor HP">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" className={inputCls} />
              </Field>
              <Field label="PIN">
                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleMemberLogin()}
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  className={inputCls}
                />
              </Field>
              <button type="button" onClick={handleForgotPin} className="text-xs text-blue-600 hover:underline -mt-2">
                Lupa PIN?
              </button>
              {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={14} />{error}</p>}
              <button onClick={handleMemberLogin} className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition">
                <LogIn size={16} /> Masuk
              </button>
              <p className="text-xs text-stone-400 text-center">Belum terdaftar? Hubungi admin program untuk didaftarkan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="PIN Admin">
                <input
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  className={inputCls}
                />
              </Field>
              {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={14} />{error}</p>}
              <button onClick={handleAdminLogin} className="w-full py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-stone-800 transition">
                <ShieldCheck size={16} /> Masuk sebagai Admin
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
