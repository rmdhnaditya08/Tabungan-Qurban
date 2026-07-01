import { useState, useEffect } from 'react';
import {
  Wallet, ShieldCheck, Printer, Download, LogOut, TrendingUp, Users,
  Layers, BarChart3, Inbox, Settings, Search, Plus, Edit2, KeyRound,
  Trash2, CheckCircle2, XCircle, X
} from 'lucide-react';
import {
  computeGroups,
  computeFinanceReport,
  genId,
  formatRupiah,
  formatDate,
  animalEmoji,
  resolveTarget,
  exportAdminExcel,
  exportFinanceExcel,
  headFont
} from '../utils';
import { MemberModal, TransactionModal, ResetPinModal, ConfirmModal, GroupEditorModal } from './Modals';
import { PrintReport, FinanceReport, FinancePanel } from './Reports';
import SettingsPanel from './SettingsPanel';

export default function AdminDashboard({ members, transactions, settings, confirmations, groupOverrides, balanceFor, persistMembers, persistTransactions, persistSettings, persistConfirmations, persistGroupOverrides, onLogout }) {
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddTx, setShowAddTx] = useState(null);
  const [editMember, setEditMember] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [resetPinFor, setResetPinFor] = useState(null);
  const [confirmDeleteConfirmation, setConfirmDeleteConfirmation] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);
  const [editGroupFor, setEditGroupFor] = useState(null); // animalId
  const [editingGroupName, setEditingGroupName] = useState(null); // { typeId, groupIdx }
  const [editingGroupNameValue, setEditingGroupNameValue] = useState('');

  const memberList = Object.entries(members).map(([id, m]) => ({ id, ...m, balance: balanceFor(id) }));
  const filtered = memberList.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search));
  const totalSaved = memberList.reduce((s, m) => s + m.balance, 0);
  const groupData = computeGroups(members, settings, groupOverrides || {});
  const pendingConfirmations = (confirmations || []).filter((c) => c.status === 'pending');
  const sortedConfirmations = [...(confirmations || [])].sort((a, b) => b.createdAt - a.createdAt);
  const orphanConfirmations = sortedConfirmations.filter((c) => !members[c.memberId]);
  const financeReport = computeFinanceReport(members, transactions, settings, balanceFor);

  // Build override from current state (auto → manual if needed) and apply a mutation fn
  function mutateGroupOverride(animalId, mutateFn) {
    const type = (settings.animalTypes || []).find((a) => a.id === animalId);
    if (!type) return;
    const cur = groupOverrides?.[animalId];
    // If no manual override yet, build from auto layout first
    let groups, names;
    if (cur?.groups) {
      groups = cur.groups.map((g) => [...g]);
      names = [...(cur.names || groups.map((_, i) => `Kelompok ${i + 1}`))];
    } else {
      const allForType = Object.entries(members)
        .filter(([, m]) => m.animalId === animalId)
        .map(([id]) => id)
        .sort();
      const quota = type.quota || 7;
      groups = [];
      for (let i = 0; i < allForType.length; i += quota) groups.push(allForType.slice(i, i + quota));
      if (groups.length === 0) groups.push([]);
      names = groups.map((_, i) => `Kelompok ${i + 1}`);
    }
    mutateFn(groups, names);
    const next = { ...(groupOverrides || {}), [animalId]: { groups, names } };
    persistGroupOverrides(next);
  }

  function addGroupDirectly(animalId) {
    mutateGroupOverride(animalId, (groups, names) => {
      groups.push([]);
      names.push(`Kelompok ${groups.length}`);
    });
  }

  function saveGroupNameInline(typeId, groupIdx, newName) {
    mutateGroupOverride(typeId, (groups, names) => {
      while (names.length <= groupIdx) names.push(`Kelompok ${names.length + 1}`);
      names[groupIdx] = newName.trim() || `Kelompok ${groupIdx + 1}`;
    });
    setEditingGroupName(null);
  }

  function startEditGroupName(typeId, groupIdx, currentName) {
    setEditingGroupName({ typeId, groupIdx });
    setEditingGroupNameValue(currentName);
  }

  async function saveGroupOverride(animalId, data) {
    const next = { ...(groupOverrides || {}) };
    if (data === null) {
      delete next[animalId]; // reset to auto
    } else {
      next[animalId] = data;
    }
    await persistGroupOverrides(next);
    setEditGroupFor(null);
  }

  useEffect(() => {
    if (!printTarget) return;
    const timer = setTimeout(() => {
      window.print();
      setPrintTarget(null);
    }, 80);
    return () => clearTimeout(timer);
  }, [printTarget]);

  async function addMember(data) {
    const id = genId();
    await persistMembers({ ...members, [id]: data });
    setShowAddMember(false);
  }
  async function updateMember(id, data) {
    await persistMembers({ ...members, [id]: data });
    setEditMember(null);
  }
  async function resetMemberPin(id, newPin) {
    await persistMembers({ ...members, [id]: { ...members[id], pin: newPin } });
    setResetPinFor(null);
  }
  async function deleteMember(id) {
    const next = { ...members };
    delete next[id];
    await persistMembers(next);
    await persistTransactions(transactions.filter((t) => t.memberId !== id));
    await persistConfirmations((confirmations || []).filter((c) => c.memberId !== id));
    setConfirmDelete(null);
  }
  async function removeConfirmationRecord(id) {
    await persistConfirmations((confirmations || []).filter((c) => c.id !== id));
    setConfirmDeleteConfirmation(null);
  }
  async function cleanupOrphanConfirmations() {
    await persistConfirmations((confirmations || []).filter((c) => members[c.memberId]));
  }
  async function addTransaction(memberId, data) {
    const tx = { id: genId(), memberId, createdAt: Date.now(), ...data };
    await persistTransactions([...transactions, tx]);
    setShowAddTx(null);
  }
  async function approveConfirmation(id) {
    const conf = (confirmations || []).find((c) => c.id === id);
    if (!conf) return;
    const tx = {
      id: genId(),
      memberId: conf.memberId,
      createdAt: Date.now(),
      amount: conf.amount,
      date: conf.date,
      type: 'setor',
      note: conf.note ? `${conf.note} (konfirmasi WhatsApp)` : 'Konfirmasi transfer via WhatsApp',
    };
    await persistTransactions([...transactions, tx]);
    await persistConfirmations(confirmations.map((c) => (c.id === id ? { ...c, status: 'approved', proofImage: undefined } : c)));
  }
  async function rejectConfirmation(id) {
    await persistConfirmations(confirmations.map((c) => (c.id === id ? { ...c, status: 'rejected', proofImage: undefined } : c)));
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="no-print">
        <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden shrink-0">
              {settings.logoUrl ? <img src={settings.logoUrl} alt="" className="w-full h-full object-cover" /> : <Wallet size={16} className="text-blue-600" />}
            </div>
            <div>
              <p className="text-xs text-stone-400">{settings.namaProgram}</p>
              <h1 className="font-semibold text-stone-900 flex items-center gap-1.5" style={headFont}>
                <ShieldCheck size={16} className="text-stone-400" /> Panel Admin
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPrintTarget('full')} title="Cetak Laporan" className="p-2 rounded-lg text-stone-500 hover:text-blue-600 hover:bg-blue-50 transition">
              <Printer size={17} />
            </button>
            <button onClick={() => exportAdminExcel(settings, members, transactions, balanceFor)} title="Unduh Excel" className="p-2 rounded-lg text-stone-500 hover:text-blue-600 hover:bg-blue-50 transition">
              <Download size={17} />
            </button>
            <button onClick={onLogout} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-red-500 transition px-3 py-1.5 rounded-lg hover:bg-red-50 ml-1">
              <LogOut size={15} /> Keluar
            </button>
          </div>
        </header>

        <nav className="bg-white border-b border-stone-100 px-4 flex gap-1 overflow-x-auto whitespace-nowrap">
          {[
            { key: 'overview', label: 'Ringkasan', icon: TrendingUp },
            { key: 'members', label: 'Shohibul Qurban', icon: Users },
            { key: 'groups', label: 'Kelompok', icon: Layers },
            { key: 'finance', label: 'Laporan', icon: BarChart3 },
            { key: 'confirmations', label: 'Konfirmasi', icon: Inbox, badge: pendingConfirmations.length },
            { key: 'settings', label: 'Pengaturan', icon: Settings },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition ${tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
            >
              <t.icon size={15} /> {t.label}
              {!!t.badge && (
                <span className="ml-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs leading-none">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <main className="p-4 max-w-2xl mx-auto space-y-4">
          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-stone-100 p-4">
                  <p className="text-xs text-stone-400">Total Terkumpul</p>
                  <p className="text-xl font-bold text-blue-700 mt-1" style={headFont}>{formatRupiah(totalSaved)}</p>
                </div>
                <div className="bg-white rounded-xl border border-stone-100 p-4">
                  <p className="text-xs text-stone-400">Jumlah Shohibul Qurban</p>
                  <p className="text-xl font-bold text-stone-800 mt-1" style={headFont}>{memberList.length}</p>
                </div>
              </div>
              <div>
                <h2 className="text-sm font-medium text-stone-700 mb-2">Transaksi Terbaru</h2>
                <div className="bg-white rounded-xl border border-stone-100 divide-y divide-stone-50">
                  {[...transactions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8).map((t) => (
                    <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-stone-800">{members[t.memberId]?.name || 'Shohibul Qurban dihapus'}</p>
                        <p className="text-xs text-stone-400">{formatDate(t.date)}{t.note ? ` · ${t.note}` : ''}</p>
                      </div>
                      <p className={`text-sm font-medium ${t.type === 'tarik' ? 'text-red-500' : 'text-blue-600'}`}>
                        {t.type === 'tarik' ? '-' : '+'}{formatRupiah(t.amount)}
                      </p>
                    </div>
                  ))}
                  {transactions.length === 0 && <div className="px-4 py-6 text-center text-sm text-stone-400">Belum ada transaksi.</div>}
                </div>
              </div>
            </>
          )}

          {tab === 'members' && (
            <>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / no. HP" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={() => setShowAddMember(true)} className="px-3.5 py-2.5 rounded-xl bg-blue-600 text-white flex items-center gap-1.5 text-sm font-medium hover:bg-blue-700 transition">
                  <Plus size={16} /> Tambah
                </button>
              </div>

              <div className="bg-white rounded-xl border border-stone-100 divide-y divide-stone-50">
                {filtered.map((m) => {
                  const target = resolveTarget(m, settings);
                  const animal = (settings.animalTypes || []).find((a) => a.id === m.animalId);
                  const pct = target > 0 ? Math.min(100, (m.balance / target) * 100) : 0;
                  return (
                    <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{m.name}</p>
                        <p className="text-xs text-stone-400">
                          {m.phone}{animal ? ` · ${animalEmoji(animal.name)} ${animal.name}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-blue-700">{formatRupiah(m.balance)}</p>
                          <p className="text-xs text-stone-400">{pct.toFixed(0)}% target</p>
                        </div>
                        <button onClick={() => setShowAddTx(m.id)} title="Catat setoran" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                          <Plus size={15} />
                        </button>
                        <button onClick={() => setResetPinFor(m.id)} title="Reset PIN" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                          <KeyRound size={14} />
                        </button>
                        <button onClick={() => setEditMember(m.id)} title="Ubah" className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setConfirmDelete(m.id)} title="Hapus" className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && <div className="px-4 py-6 text-center text-sm text-stone-400">Belum ada Shohibul Qurban.</div>}
              </div>
            </>
          )}

          {tab === 'groups' && (
            <div className="space-y-4">
              {groupData.length === 0 && (
                <div className="bg-white rounded-xl border border-stone-100 p-6 text-center text-sm text-stone-400">
                  Belum ada jenis hewan dengan kuota patungan ({'>'} 1). Atur kuota di tab Pengaturan → Jenis Hewan Qurban.
                </div>
              )}
              {groupData.map(({ type, groups, unassigned, isManual }) => (
                <div key={type.id} className="bg-white rounded-xl border border-stone-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-stone-700 flex items-center gap-1.5">
                        <span>{animalEmoji(type.name)}</span> {type.name}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isManual ? 'bg-blue-100 text-blue-600' : 'bg-stone-100 text-stone-500'}`}>
                        {isManual ? 'Manual' : 'Otomatis'}
                      </span>
                    </div>
                    <button
                      onClick={() => setEditGroupFor(type.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition"
                    >
                      <Edit2 size={12}/> Atur Anggota
                    </button>
                  </div>

                  {groups.length === 0 ? (
                    <p className="text-sm text-stone-400">Belum ada Shohibul Qurban yang memilih hewan ini.</p>
                  ) : (
                    <div className="space-y-2">
                      {groups.map((g, idx) => {
                        const currentName = (groupOverrides?.[type.id]?.names?.[idx]) || `Kelompok ${idx + 1}`;
                        const isEditingThis = editingGroupName?.typeId === type.id && editingGroupName?.groupIdx === idx;
                        const isFull = g.length >= type.quota;
                        const totalGroupSaved = g.reduce((s, m) => s + balanceFor(m.id), 0);
                        const totalGroupTarget = type.price * type.quota;
                        return (
                          <div key={idx} className="border border-stone-100 rounded-xl overflow-hidden">
                            {/* Group header with inline name edit */}
                            <div className={`flex items-center gap-2 px-3 py-2 ${isFull ? 'bg-blue-50' : 'bg-stone-50'}`}>
                              {isEditingThis ? (
                                <form
                                  className="flex-1 flex items-center gap-1.5"
                                  onSubmit={(e) => { e.preventDefault(); saveGroupNameInline(type.id, idx, editingGroupNameValue); }}
                                >
                                  <input
                                    autoFocus
                                    value={editingGroupNameValue}
                                    onChange={(e) => setEditingGroupNameValue(e.target.value)}
                                    onBlur={() => saveGroupNameInline(type.id, idx, editingGroupNameValue)}
                                    className="flex-1 text-sm font-medium bg-white border border-blue-300 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-blue-500 text-stone-800"
                                  />
                                  <button type="submit" className="p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                                    <CheckCircle2 size={13}/>
                                  </button>
                                  <button type="button" onClick={() => setEditingGroupName(null)} className="p-1 rounded-lg hover:bg-stone-200 text-stone-400">
                                    <X size={13}/>
                                  </button>
                                </form>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditGroupName(type.id, idx, currentName)}
                                    className="flex-1 text-left flex items-center gap-1.5 group"
                                    title="Klik untuk ganti nama kelompok"
                                  >
                                    <span className="text-sm font-medium text-stone-800">{currentName}</span>
                                    <Edit2 size={11} className="text-stone-300 group-hover:text-blue-500 transition shrink-0"/>
                                  </button>
                                </>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${isFull ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                {g.length}/{type.quota}{isFull ? ' · Lengkap' : ` · Kurang ${type.quota - g.length}`}
                              </span>
                            </div>

                            {/* Members list */}
                            <div className="px-3 py-2">
                              {g.length === 0 ? (
                                <p className="text-xs text-stone-400 italic py-1">Kelompok kosong — tambahkan anggota lewat tombol "Atur Anggota".</p>
                              ) : (
                                <ul className="space-y-1">
                                  {g.map((m) => (
                                    <li key={m.id} className="text-sm text-stone-600 flex items-center justify-between py-0.5">
                                      <span>{m.name}</span>
                                      <span className="text-stone-400 text-xs">{formatRupiah(balanceFor(m.id))}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <div className="text-xs text-stone-400 pt-2 mt-1 border-t border-stone-50 flex justify-between">
                                <span>Total terkumpul</span>
                                <span>{formatRupiah(totalGroupSaved)} / {formatRupiah(totalGroupTarget)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isManual && unassigned.length > 0 && (
                    <div className="border border-dashed border-amber-200 bg-amber-50 rounded-xl p-3">
                      <p className="text-xs font-medium text-amber-700 mb-1.5">Belum dikelompokkan ({unassigned.length} orang):</p>
                      <div className="flex flex-wrap gap-1">
                        {unassigned.map((m) => (
                          <span key={m.id} className="text-xs px-2 py-0.5 rounded-full bg-white border border-amber-200 text-amber-700">{m.name}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Group + Reset buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => addGroupDirectly(type.id)}
                      className="flex-1 py-2 rounded-xl border border-dashed border-blue-300 text-blue-600 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-blue-50 transition"
                    >
                      <Plus size={13}/> Tambah Kelompok
                    </button>
                    {isManual && (
                      <button
                        onClick={() => saveGroupOverride(type.id, null)}
                        className="px-3 py-2 rounded-xl border border-stone-200 text-stone-500 text-xs font-medium hover:bg-stone-50 transition"
                      >
                        Reset Otomatis
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-stone-400">Kuota {type.quota} orang/ekor</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'finance' && (
            <FinancePanel
              report={financeReport}
              onExportExcel={() => exportFinanceExcel(settings, financeReport)}
              onPrintPdf={() => setPrintTarget('finance')}
            />
          )}

          {tab === 'confirmations' && (
            <div className="space-y-3">
              {orphanConfirmations.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-amber-700">{orphanConfirmations.length} riwayat konfirmasi milik Shohibul Qurban yang sudah dihapus.</p>
                  <button onClick={cleanupOrphanConfirmations} className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition">
                    Bersihkan
                  </button>
                </div>
              )}
              {sortedConfirmations.length === 0 ? (
                <div className="bg-white rounded-xl border border-stone-100 p-6 text-center text-sm text-stone-400">
                  Belum ada konfirmasi pembayaran dari Shohibul Qurban.
                </div>
              ) : (
                sortedConfirmations.map((c) => {
                  const badge = {
                    pending: { label: 'Menunggu', cls: 'bg-amber-100 text-amber-700' },
                    approved: { label: 'Diterima', cls: 'bg-blue-100 text-blue-700' },
                    rejected: { label: 'Ditolak', cls: 'bg-red-100 text-red-600' },
                  }[c.status] || { label: c.status, cls: 'bg-stone-100 text-stone-500' };
                  const isOrphan = !members[c.memberId];
                  return (
                    <div key={c.id} className="bg-white rounded-xl border border-stone-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-stone-800">
                            {c.memberName}{isOrphan && <span className="text-stone-400 font-normal"> (dihapus)</span>}
                          </p>
                          <p className="text-xs text-stone-400">{formatDate(c.date)} · {formatRupiah(c.amount)}</p>
                          {c.note && <p className="text-xs text-stone-400 mt-0.5">{c.note}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                          <button onClick={() => setConfirmDeleteConfirmation(c.id)} title="Hapus riwayat" className="p-1 rounded-lg hover:bg-red-50 text-red-400">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      {c.proofImage && (
                        <img
                          src={c.proofImage}
                          alt="Bukti transfer"
                          onClick={() => window.open(c.proofImage, '_blank')}
                          className="mt-3 max-h-48 rounded-lg border border-stone-200 cursor-zoom-in"
                        />
                      )}
                      {c.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => approveConfirmation(c.id)} className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-blue-700 transition">
                            <CheckCircle2 size={15} /> Terima
                          </button>
                          <button onClick={() => rejectConfirmation(c.id)} className="flex-1 py-2 rounded-xl bg-stone-100 text-stone-600 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-stone-200 transition">
                            <XCircle size={15} /> Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'settings' && <SettingsPanel settings={settings} persistSettings={persistSettings} />}
        </main>

        {showAddMember && (
          <MemberModal title="Tambah Shohibul Qurban" defaultTarget={settings.targetDefault} animalTypes={settings.animalTypes} onClose={() => setShowAddMember(false)} onSave={addMember} />
        )}
        {editMember && members[editMember] && (
          <MemberModal title="Ubah Shohibul Qurban" initial={members[editMember]} defaultTarget={settings.targetDefault} animalTypes={settings.animalTypes} onClose={() => setEditMember(null)} onSave={(data) => updateMember(editMember, data)} />
        )}
        {showAddTx && members[showAddTx] && (
          <TransactionModal memberName={members[showAddTx].name} onClose={() => setShowAddTx(null)} onSave={(data) => addTransaction(showAddTx, data)} />
        )}
        {resetPinFor && members[resetPinFor] && (
          <ResetPinModal
            memberName={members[resetPinFor].name}
            onClose={() => setResetPinFor(null)}
            onSave={(newPin) => resetMemberPin(resetPinFor, newPin)}
          />
        )}
        {confirmDeleteConfirmation && (
          <ConfirmModal
            message="Hapus riwayat konfirmasi pembayaran ini secara permanen?"
            onCancel={() => setConfirmDeleteConfirmation(null)}
            onConfirm={() => removeConfirmationRecord(confirmDeleteConfirmation)}
          />
        )}
        {confirmDelete && members[confirmDelete] && (
          <ConfirmModal
            message={`Hapus Shohibul Qurban "${members[confirmDelete].name}"? Semua riwayat transaksinya juga akan terhapus.`}
            onCancel={() => setConfirmDelete(null)}
            onConfirm={() => deleteMember(confirmDelete)}
          />
        )}
        {editGroupFor && (
          <GroupEditorModal
            type={settings.animalTypes.find((a) => a.id === editGroupFor)}
            members={members}
            currentOverride={groupOverrides[editGroupFor]}
            balanceFor={balanceFor}
            onClose={() => setEditGroupFor(null)}
            onSave={(data) => saveGroupOverride(editGroupFor, data)}
          />
        )}
      </div>

      {printTarget === 'full' && (
        <PrintReport settings={settings} members={members} transactions={transactions} balanceFor={balanceFor} />
      )}
      {printTarget === 'finance' && <FinanceReport settings={settings} report={financeReport} />}
    </div>
  );
}
