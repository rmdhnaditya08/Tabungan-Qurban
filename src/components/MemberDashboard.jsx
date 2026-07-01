import { useState } from 'react';
import {
  Wallet, LogOut, Printer, Download, Calendar, Inbox, Settings,
  MessageCircle, Plus, KeyRound
} from 'lucide-react';
import {
  resolveTarget,
  formatRupiah,
  animalEmoji,
  formatDate,
  headFont
} from '../utils';
import { PaymentConfirmModal, ChangePinModal } from './Modals';
import { PersonalPrintReport } from './Reports';

export default function MemberDashboard({ memberId, member, transactions, balance, settings, confirmations, onSubmitConfirmation, onChangePin, onLogout }) {
  const target = resolveTarget(member, settings);
  const animal = (settings.animalTypes || []).find((a) => a.id === member.animalId);
  const progress = target > 0 ? Math.min(100, (balance / target) * 100) : 0;
  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const myConfirmations = [...(confirmations || [])].sort((a, b) => b.createdAt - a.createdAt);

  const [menuTab, setMenuTab] = useState('home');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);

  const statusBadge = {
    pending:  { label: 'Menunggu Verifikasi', cls: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Diterima',            cls: 'bg-blue-100 text-blue-700'  },
    rejected: { label: 'Ditolak',             cls: 'bg-red-100 text-red-600'    },
  };

  const pendingCount = myConfirmations.filter((c) => c.status === 'pending').length;

  const navItems = [
    { key: 'home',        label: 'Beranda',   icon: Wallet },
    { key: 'setoran',     label: 'Setoran',   icon: Calendar },
    { key: 'konfirmasi',  label: 'Konfirmasi',icon: Inbox, badge: pendingCount },
    { key: 'akun',        label: 'Akun',      icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="no-print">
        {/* Header */}
        <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden shrink-0">
              {settings.logoUrl ? <img src={settings.logoUrl} alt="" className="w-full h-full object-cover"/> : <Wallet size={16} className="text-blue-600"/>}
            </div>
            <div>
              <p className="text-xs text-stone-400">{settings.namaProgram}</p>
              <h1 className="font-semibold text-stone-900" style={headFont}>{member.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => window.print()} title="Cetak" className="p-2 rounded-lg text-stone-500 hover:text-blue-600 hover:bg-blue-50 transition">
              <Printer size={17}/>
            </button>
            <button onClick={() => exportMemberExcel(settings, member, transactions, balance)} title="Unduh Excel" className="p-2 rounded-lg text-stone-500 hover:text-blue-600 hover:bg-blue-50 transition">
              <Download size={17}/>
            </button>
            <button onClick={onLogout} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-red-500 transition px-3 py-1.5 rounded-lg hover:bg-red-50 ml-1">
              <LogOut size={15}/> Keluar
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 pb-24 max-w-md mx-auto space-y-4">

          {/* ── BERANDA ── */}
          {menuTab === 'home' && (
            <>
              {/* Saldo card */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <p className="text-blue-100 text-xs mb-1">Saldo Tabungan Qurban</p>
                  {animal && <span className="text-xs bg-white/15 rounded-full px-2.5 py-1">{animalEmoji(animal.name)} {animal.name}</span>}
                </div>
                <p className="text-3xl font-bold tracking-tight" style={headFont}>{formatRupiah(balance)}</p>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-blue-100 mb-1">
                    <span>Target {formatRupiah(target)}</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-blue-800/40 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all" style={{width:`${progress}%`}}/>
                  </div>
                </div>
              </div>

              {/* Konfirmasi pembayaran CTA */}
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full py-3 rounded-xl bg-white border border-blue-200 text-blue-700 text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-50 transition shadow-sm"
              >
                <MessageCircle size={17}/> Konfirmasi Pembayaran ke Admin
              </button>

              {/* Ringkasan cepat 2 transaksi terakhir */}
              {sorted.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-medium text-stone-700">Setoran Terakhir</h2>
                    <button onClick={() => setMenuTab('setoran')} className="text-xs text-blue-600 hover:underline">Lihat semua</button>
                  </div>
                  <div className="bg-white rounded-xl border border-stone-100 divide-y divide-stone-50">
                    {sorted.slice(0, 2).map((t) => (
                      <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-stone-800">{formatDate(t.date)}</p>
                          {t.note && <p className="text-xs text-stone-400">{t.note}</p>}
                        </div>
                        <p className={`text-sm font-medium ${t.type === 'tarik' ? 'text-red-500' : 'text-blue-600'}`}>
                          {t.type === 'tarik' ? '-' : '+'}{formatRupiah(t.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── RIWAYAT SETORAN ── */}
          {menuTab === 'setoran' && (
            <div>
              <h2 className="text-sm font-medium text-stone-700 mb-2 flex items-center gap-1.5"><Calendar size={15}/> Riwayat Setoran</h2>
              {sorted.length === 0 ? (
                <div className="bg-white rounded-xl border border-stone-100 p-8 text-center text-sm text-stone-400">
                  Belum ada riwayat setoran.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-stone-100 divide-y divide-stone-50">
                  {sorted.map((t) => (
                    <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-stone-800">{formatDate(t.date)}</p>
                        {t.note && <p className="text-xs text-stone-400">{t.note}</p>}
                      </div>
                      <p className={`text-sm font-medium ${t.type === 'tarik' ? 'text-red-500' : 'text-blue-600'}`}>
                        {t.type === 'tarik' ? '-' : '+'}{formatRupiah(t.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── RIWAYAT KONFIRMASI ── */}
          {menuTab === 'konfirmasi' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium text-stone-700 flex items-center gap-1.5"><Inbox size={15}/> Riwayat Konfirmasi</h2>
                <button
                  onClick={() => setShowConfirm(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition"
                >
                  <Plus size={13}/> Konfirmasi Baru
                </button>
              </div>
              {myConfirmations.length === 0 ? (
                <div className="bg-white rounded-xl border border-stone-100 p-8 text-center space-y-3">
                  <p className="text-sm text-stone-400">Belum ada riwayat konfirmasi pembayaran.</p>
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="mx-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                  >
                    <MessageCircle size={15}/> Konfirmasi Sekarang
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myConfirmations.map((c) => {
                    const badge = statusBadge[c.status] || { label: c.status, cls: 'bg-stone-100 text-stone-500' };
                    return (
                      <div key={c.id} className="bg-white rounded-xl border border-stone-100 p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-stone-800">{formatRupiah(c.amount)}</p>
                            <p className="text-xs text-stone-400">{formatDate(c.date)}</p>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 font-medium ${badge.cls}`}>{badge.label}</span>
                        </div>
                        {c.proofImage && (
                          <img
                            src={c.proofImage}
                            alt="Bukti transfer"
                            onClick={() => window.open(c.proofImage, '_blank')}
                            className="max-h-40 rounded-lg border border-stone-200 cursor-zoom-in w-auto"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── AKUN ── */}
          {menuTab === 'akun' && (
            <div className="space-y-4">
              {/* Info pribadi */}
              <div className="bg-white rounded-xl border border-stone-100 p-4 space-y-2">
                <h3 className="text-sm font-medium text-stone-700 mb-3">Informasi Akun</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-400">Nama</span>
                  <span className="text-stone-800 font-medium">{member.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-400">No. HP</span>
                  <span className="text-stone-800">{member.phone}</span>
                </div>
                {animal && (
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-400">Hewan Qurban</span>
                    <span className="text-stone-800">{animalEmoji(animal.name)} {animal.name}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-stone-400">Target</span>
                  <span className="text-stone-800">{formatRupiah(target)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-400">Terdaftar</span>
                  <span className="text-stone-800">{member.joinDate ? formatDate(member.joinDate) : '-'}</span>
                </div>
              </div>

              {/* Ganti PIN */}
              <div className="bg-white rounded-xl border border-stone-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-800">Ganti PIN</p>
                    <p className="text-xs text-stone-400 mt-0.5">Ubah PIN login akun Anda</p>
                  </div>
                  <button
                    onClick={() => setShowChangePin(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                  >
                    <KeyRound size={15}/> Ganti PIN
                  </button>
                </div>
              </div>

              {/* Keluar */}
              <button
                onClick={onLogout}
                className="w-full py-3 rounded-xl bg-white border border-red-100 text-red-500 text-sm font-medium flex items-center justify-center gap-2 hover:bg-red-50 transition"
              >
                <LogOut size={16}/> Keluar dari Akun
              </button>
            </div>
          )}
        </main>

        {/* Bottom navigation */}
        <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-stone-100 flex z-20 shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setMenuTab(item.key)}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 relative transition-colors ${menuTab === item.key ? 'text-blue-600' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <div className="relative">
                <item.icon size={20}/>
                {!!item.badge && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center leading-none font-medium">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium">{item.label}</span>
              {menuTab === item.key && <span className="absolute top-0 inset-x-0 h-0.5 bg-blue-600 rounded-b-full"/>}
            </button>
          ))}
        </nav>
      </div>

      {/* Modals */}
      {showConfirm && (
        <PaymentConfirmModal
          member={{ ...member, id: memberId }}
          settings={settings}
          onClose={() => setShowConfirm(false)}
          onSubmit={onSubmitConfirmation}
        />
      )}
      {showChangePin && (
        <ChangePinModal
          member={member}
          onClose={() => setShowChangePin(false)}
          onSave={onChangePin}
        />
      )}

      <PersonalPrintReport settings={settings} member={member} transactions={transactions} balance={balance}/>
    </div>
  );
}
