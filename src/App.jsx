import { useState, useEffect } from 'react';
import {
  Wallet, LogIn, LogOut, Users, Plus, Search, X, Settings,
  TrendingUp, Calendar, ShieldCheck, AlertCircle, Trash2, Edit2, Layers,
  Printer, Download, Upload, MessageCircle, Inbox, CheckCircle2, XCircle, KeyRound,
  BarChart3,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const STORAGE_KEYS = {
  MEMBERS: 'qurban-members',
  TRANSACTIONS: 'qurban-transactions',
  SETTINGS: 'qurban-settings',
  CONFIRMATIONS: 'qurban-confirmations',
  GROUP_OVERRIDES: 'qurban-group-overrides',
};

const DEFAULT_SETTINGS = {
  adminPin: '1234',
  targetDefault: 3000000,
  namaProgram: 'Tabungan Qurban',
  adminWhatsapp: '',
  animalTypes: [
    { id: 'kambing', name: 'Kambing', price: 3000000, quota: 1 },
    { id: 'domba', name: 'Domba', price: 2800000, quota: 1 },
    { id: 'sapi', name: 'Sapi (1/7 bagian)', price: 2500000, quota: 7 },
    { id: 'kerbau', name: 'Kerbau (1/7 bagian)', price: 2500000, quota: 7 },
  ],
};

const inputCls = "mt-1 w-full px-3 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";
const headFont = { fontFamily: "'Outfit', sans-serif" };

function formatRupiah(num) {
  return 'Rp' + Math.round(Number(num) || 0).toLocaleString('id-ID');
}
function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function toWaNumber(phone) {
  let p = (phone || '').replace(/\D/g, '');
  if (p.startsWith('0')) return '62' + p.slice(1);
  if (p.startsWith('62')) return p;
  return p ? '62' + p : '';
}
function animalEmoji(name = '') {
  const n = name.toLowerCase();
  if (n.includes('kambing')) return '🐐';
  if (n.includes('domba')) return '🐑';
  if (n.includes('sapi')) return '🐄';
  if (n.includes('kerbau')) return '🐃';
  if (n.includes('unta')) return '🐫';
  return '🐾';
}
function resolveTarget(member, settings) {
  if (member.target) return member.target;
  const animal = (settings.animalTypes || []).find((a) => a.id === member.animalId);
  if (animal) return animal.price;
  return settings.targetDefault;
}
function computeGroups(members, settings, groupOverrides = {}) {
  const types = (settings.animalTypes || []).filter((a) => (a.quota || 1) > 1);
  return types.map((type) => {
    const allForType = Object.entries(members)
      .filter(([, m]) => m.animalId === type.id)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => (a.joinDate || '').localeCompare(b.joinDate || '') || a.id.localeCompare(b.id));

    const override = groupOverrides[type.id];
    if (override && override.groups) {
      // Manual mode — resolve member IDs → objects, filter deleted
      const groups = override.groups.map((grp) =>
        grp.map((id) => members[id] ? { id, ...members[id] } : null).filter(Boolean)
      ).filter((g) => g.length > 0 || override.groups.length === 1);
      // Unassigned = in allForType but not in any group
      const assignedIds = new Set(override.groups.flat());
      const unassigned = allForType.filter((m) => !assignedIds.has(m.id));
      return { type, groups, unassigned, isManual: true };
    }

    // Auto mode
    const quota = type.quota || 7;
    const groups = [];
    for (let i = 0; i < allForType.length; i += quota) {
      groups.push(allForType.slice(i, i + quota));
    }
    return { type, groups, unassigned: [], isManual: false };
  });
}
async function safeGet(key, shared) {
  try { return await window.storage.get(key, shared); } catch { return null; }
}

function FontImport() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&display=swap');
      .print-only { display: none; }
      @media print {
        .no-print { display: none !important; }
        .print-only { display: block !important; }
        body { background: white; }
      }
    `}</style>
  );
}

const thStyle = { border: '1px solid #ccc', padding: '4px 8px', textAlign: 'left', background: '#f3f3f3', fontSize: 12 };
const tdStyle = { border: '1px solid #ccc', padding: '4px 8px', fontSize: 12 };

function exportAdminExcel(settings, members, transactions, balanceFor) {
  const memberRows = Object.entries(members).map(([id, m], i) => {
    const animal = (settings.animalTypes || []).find((a) => a.id === m.animalId);
    const target = resolveTarget(m, settings);
    const balance = balanceFor(id);
    return {
      No: i + 1,
      Nama: m.name,
      'No. HP': m.phone,
      'Hewan Qurban': animal ? animal.name : '-',
      Target: target,
      Saldo: balance,
      'Progress (%)': target > 0 ? Math.round((balance / target) * 100) : 0,
      'Tanggal Daftar': m.joinDate || '-',
    };
  });

  const txRows = [...transactions]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((t) => ({
      Tanggal: t.date,
      Nama: members[t.memberId]?.name || '(dihapus)',
      Jenis: t.type === 'tarik' ? 'Tarik' : 'Setor',
      Jumlah: t.amount,
      Catatan: t.note || '-',
    }));

  const groupRows = [];
  computeGroups(members, settings).forEach(({ type, groups }) => {
    groups.forEach((g, idx) => {
      g.forEach((m) => {
        groupRows.push({
          Hewan: type.name,
          Kelompok: `Kelompok ${idx + 1}`,
          Nama: m.name,
          'No. HP': m.phone,
          Saldo: balanceFor(m.id),
        });
      });
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(memberRows), 'Shohibul Qurban');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows), 'Transaksi');
  if (groupRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(groupRows), 'Kelompok');
  XLSX.writeFile(wb, `${(settings.namaProgram || 'Tabungan Qurban').replace(/\s+/g, '_')}_${todayStr()}.xlsx`);
}

function exportMemberExcel(settings, member, transactions, balance) {
  const rows = [...transactions]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((t) => ({
      Tanggal: t.date,
      Jenis: t.type === 'tarik' ? 'Tarik' : 'Setor',
      Jumlah: t.amount,
      Catatan: t.note || '-',
    }));
  rows.push({ Tanggal: '', Jenis: '', Jumlah: '', Catatan: '' });
  rows.push({ Tanggal: 'Saldo Saat Ini', Jenis: '', Jumlah: balance, Catatan: '' });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Riwayat');
  XLSX.writeFile(wb, `Tabungan_Qurban_${(member.name || 'Shohibul_Qurban').replace(/\s+/g, '_')}.xlsx`);
}

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function formatMonthLabel(key) {
  const [y, m] = key.split('-');
  const idx = parseInt(m, 10) - 1;
  return `${MONTH_NAMES[idx] || m} ${y}`;
}

function computeFinanceReport(members, transactions, settings, balanceFor) {
  const totalSetor = transactions.filter((t) => t.type !== 'tarik').reduce((s, t) => s + t.amount, 0);
  const totalTarik = transactions.filter((t) => t.type === 'tarik').reduce((s, t) => s + t.amount, 0);
  const saldoBersih = totalSetor - totalTarik;

  const monthlyMap = {};
  transactions.forEach((t) => {
    const key = (t.date || '').slice(0, 7) || 'tanpa-tanggal';
    if (!monthlyMap[key]) monthlyMap[key] = { setor: 0, tarik: 0 };
    if (t.type === 'tarik') monthlyMap[key].tarik += t.amount;
    else monthlyMap[key].setor += t.amount;
  });
  const monthly = Object.entries(monthlyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({ key, label: key === 'tanpa-tanggal' ? 'Tanpa tanggal' : formatMonthLabel(key), setor: v.setor, tarik: v.tarik, net: v.setor - v.tarik }));

  const memberIdsByAnimal = {};
  const noAnimalIds = [];
  Object.entries(members).forEach(([id, m]) => {
    const hasAnimal = m.animalId && (settings.animalTypes || []).some((a) => a.id === m.animalId);
    if (hasAnimal) {
      memberIdsByAnimal[m.animalId] = memberIdsByAnimal[m.animalId] || [];
      memberIdsByAnimal[m.animalId].push(id);
    } else {
      noAnimalIds.push(id);
    }
  });
  const byAnimal = (settings.animalTypes || [])
    .map((a) => {
      const ids = memberIdsByAnimal[a.id] || [];
      const totalBalance = ids.reduce((s, id) => s + balanceFor(id), 0);
      const totalTarget = ids.reduce((s, id) => s + resolveTarget(members[id], settings), 0);
      return { animal: a, count: ids.length, totalBalance, totalTarget };
    })
    .filter((x) => x.count > 0);

  let noAnimal = null;
  if (noAnimalIds.length) {
    const totalBalance = noAnimalIds.reduce((s, id) => s + balanceFor(id), 0);
    const totalTarget = noAnimalIds.reduce((s, id) => s + resolveTarget(members[id], settings), 0);
    noAnimal = { count: noAnimalIds.length, totalBalance, totalTarget };
  }

  return {
    totalSetor,
    totalTarik,
    saldoBersih,
    monthly,
    byAnimal,
    noAnimal,
    totalMembers: Object.keys(members).length,
    totalTransactions: transactions.length,
  };
}

function exportFinanceExcel(settings, report) {
  const summaryRows = [
    { Keterangan: 'Total Setoran', Jumlah: report.totalSetor },
    { Keterangan: 'Total Penarikan', Jumlah: report.totalTarik },
    { Keterangan: 'Saldo Bersih', Jumlah: report.saldoBersih },
    { Keterangan: 'Jumlah Transaksi', Jumlah: report.totalTransactions },
    { Keterangan: 'Jumlah Shohibul Qurban', Jumlah: report.totalMembers },
  ];
  const monthlyRows = report.monthly.map((m) => ({ Bulan: m.label, Setoran: m.setor, Penarikan: m.tarik, Net: m.net }));
  const animalRows = report.byAnimal.map(({ animal, count, totalBalance, totalTarget }) => ({
    'Jenis Hewan': animal.name,
    'Jumlah Orang': count,
    'Total Terkumpul': totalBalance,
    'Total Target': totalTarget,
  }));
  if (report.noAnimal) {
    animalRows.push({
      'Jenis Hewan': 'Belum pilih hewan',
      'Jumlah Orang': report.noAnimal.count,
      'Total Terkumpul': report.noAnimal.totalBalance,
      'Total Target': report.noAnimal.totalTarget,
    });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Ringkasan');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlyRows), 'Per Bulan');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(animalRows), 'Per Hewan');
  XLSX.writeFile(wb, `Laporan_Keuangan_${(settings.namaProgram || 'Tabungan_Qurban').replace(/\s+/g, '_')}_${todayStr()}.xlsx`);
}

function PrintReport({ settings, members, transactions, balanceFor }) {
  const memberList = Object.entries(members).map(([id, m]) => ({ id, ...m, balance: balanceFor(id) }));
  const groupData = computeGroups(members, settings);

  return (
    <div className="print-only" style={{ padding: 24, color: '#111', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: 20, marginBottom: 2 }}>{settings.namaProgram}</h1>
      <p style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>Laporan dicetak pada {formatDate(todayStr())}</p>

      <h2 style={{ fontSize: 14, marginBottom: 8 }}>Daftar Shohibul Qurban</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <thead>
          <tr>
            <th style={thStyle}>No</th>
            <th style={thStyle}>Nama</th>
            <th style={thStyle}>No. HP</th>
            <th style={thStyle}>Hewan</th>
            <th style={thStyle}>Target</th>
            <th style={thStyle}>Saldo</th>
            <th style={thStyle}>Progress</th>
          </tr>
        </thead>
        <tbody>
          {memberList.map((m, i) => {
            const animal = (settings.animalTypes || []).find((a) => a.id === m.animalId);
            const target = resolveTarget(m, settings);
            const pct = target > 0 ? Math.min(100, (m.balance / target) * 100) : 0;
            return (
              <tr key={m.id}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>{m.name}</td>
                <td style={tdStyle}>{m.phone}</td>
                <td style={tdStyle}>{animal ? animal.name : '-'}</td>
                <td style={tdStyle}>{formatRupiah(target)}</td>
                <td style={tdStyle}>{formatRupiah(m.balance)}</td>
                <td style={tdStyle}>{pct.toFixed(0)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 style={{ fontSize: 14, marginBottom: 8 }}>Riwayat Transaksi</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <thead>
          <tr>
            <th style={thStyle}>Tanggal</th>
            <th style={thStyle}>Nama</th>
            <th style={thStyle}>Jenis</th>
            <th style={thStyle}>Jumlah</th>
            <th style={thStyle}>Catatan</th>
          </tr>
        </thead>
        <tbody>
          {[...transactions].sort((a, b) => new Date(a.date) - new Date(b.date)).map((t) => (
            <tr key={t.id}>
              <td style={tdStyle}>{formatDate(t.date)}</td>
              <td style={tdStyle}>{members[t.memberId]?.name || '(dihapus)'}</td>
              <td style={tdStyle}>{t.type === 'tarik' ? 'Tarik' : 'Setor'}</td>
              <td style={tdStyle}>{formatRupiah(t.amount)}</td>
              <td style={tdStyle}>{t.note || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {groupData.length > 0 && (
        <>
          <h2 style={{ fontSize: 14, marginBottom: 8 }}>Pengelompokan Hewan Patungan</h2>
          {groupData.map(({ type, groups }) => (
            <div key={type.id} style={{ marginBottom: 10 }}>
              <p style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 2 }}>{type.name}</p>
              {groups.map((g, idx) => (
                <p key={idx} style={{ fontSize: 12, margin: '2px 0' }}>
                  Kelompok {idx + 1}: {g.map((m) => m.name).join(', ')} ({g.length}/{type.quota})
                </p>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function PersonalPrintReport({ settings, member, transactions, balance }) {
  const animal = (settings.animalTypes || []).find((a) => a.id === member.animalId);
  const target = resolveTarget(member, settings);

  return (
    <div className="print-only" style={{ padding: 24, color: '#111', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: 20, marginBottom: 2 }}>{settings.namaProgram}</h1>
      <p style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>Bukti Tabungan Qurban — dicetak {formatDate(todayStr())}</p>

      <table style={{ fontSize: 12, marginBottom: 16 }}>
        <tbody>
          <tr><td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold' }}>Nama</td><td>{member.name}</td></tr>
          <tr><td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold' }}>No. HP</td><td>{member.phone}</td></tr>
          <tr><td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold' }}>Hewan Qurban</td><td>{animal ? animal.name : '-'}</td></tr>
          <tr><td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold' }}>Target</td><td>{formatRupiah(target)}</td></tr>
          <tr><td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold' }}>Saldo Saat Ini</td><td>{formatRupiah(balance)}</td></tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: 14, marginBottom: 8 }}>Riwayat Setoran</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Tanggal</th>
            <th style={thStyle}>Jenis</th>
            <th style={thStyle}>Jumlah</th>
            <th style={thStyle}>Catatan</th>
          </tr>
        </thead>
        <tbody>
          {[...transactions].sort((a, b) => new Date(a.date) - new Date(b.date)).map((t) => (
            <tr key={t.id}>
              <td style={tdStyle}>{formatDate(t.date)}</td>
              <td style={tdStyle}>{t.type === 'tarik' ? 'Tarik' : 'Setor'}</td>
              <td style={tdStyle}>{formatRupiah(t.amount)}</td>
              <td style={tdStyle}>{t.note || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FinanceReport({ settings, report }) {
  return (
    <div className="print-only" style={{ padding: 24, color: '#111', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: 20, marginBottom: 2 }}>{settings.namaProgram}</h1>
      <p style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>Laporan Keuangan — dicetak {formatDate(todayStr())}</p>

      <table style={{ fontSize: 12, marginBottom: 20 }}>
        <tbody>
          <tr><td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold' }}>Total Setoran</td><td>{formatRupiah(report.totalSetor)}</td></tr>
          <tr><td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold' }}>Total Penarikan</td><td>{formatRupiah(report.totalTarik)}</td></tr>
          <tr><td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold' }}>Saldo Bersih</td><td>{formatRupiah(report.saldoBersih)}</td></tr>
          <tr><td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold' }}>Jumlah Transaksi</td><td>{report.totalTransactions}</td></tr>
          <tr><td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold' }}>Jumlah Shohibul Qurban</td><td>{report.totalMembers}</td></tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: 14, marginBottom: 8 }}>Rekap per Bulan</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <thead>
          <tr>
            <th style={thStyle}>Bulan</th>
            <th style={thStyle}>Setoran</th>
            <th style={thStyle}>Penarikan</th>
            <th style={thStyle}>Net</th>
          </tr>
        </thead>
        <tbody>
          {report.monthly.map((m) => (
            <tr key={m.key}>
              <td style={tdStyle}>{m.label}</td>
              <td style={tdStyle}>{formatRupiah(m.setor)}</td>
              <td style={tdStyle}>{formatRupiah(m.tarik)}</td>
              <td style={tdStyle}>{formatRupiah(m.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: 14, marginBottom: 8 }}>Rekap per Jenis Hewan</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Jenis Hewan</th>
            <th style={thStyle}>Jumlah Orang</th>
            <th style={thStyle}>Total Terkumpul</th>
            <th style={thStyle}>Total Target</th>
          </tr>
        </thead>
        <tbody>
          {report.byAnimal.map(({ animal, count, totalBalance, totalTarget }) => (
            <tr key={animal.id}>
              <td style={tdStyle}>{animal.name}</td>
              <td style={tdStyle}>{count}</td>
              <td style={tdStyle}>{formatRupiah(totalBalance)}</td>
              <td style={tdStyle}>{formatRupiah(totalTarget)}</td>
            </tr>
          ))}
          {report.noAnimal && (
            <tr>
              <td style={tdStyle}>Belum pilih hewan</td>
              <td style={tdStyle}>{report.noAnimal.count}</td>
              <td style={tdStyle}>{formatRupiah(report.noAnimal.totalBalance)}</td>
              <td style={tdStyle}>{formatRupiah(report.noAnimal.totalTarget)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FinancePanel({ report, onExportExcel, onPrintPdf }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={onExportExcel} className="flex-1 px-3 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-stone-800 transition">
          <Download size={15} /> Unduh Excel
        </button>
        <button onClick={onPrintPdf} className="flex-1 px-3 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition">
          <Printer size={15} /> Unduh PDF
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-stone-100 p-4">
          <p className="text-xs text-stone-400">Total Setoran</p>
          <p className="text-lg font-bold text-blue-700 mt-1" style={headFont}>{formatRupiah(report.totalSetor)}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-100 p-4">
          <p className="text-xs text-stone-400">Total Penarikan</p>
          <p className="text-lg font-bold text-red-500 mt-1" style={headFont}>{formatRupiah(report.totalTarik)}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-100 p-4">
          <p className="text-xs text-stone-400">Saldo Bersih</p>
          <p className="text-lg font-bold text-stone-800 mt-1" style={headFont}>{formatRupiah(report.saldoBersih)}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-100 p-4">
          <p className="text-xs text-stone-400">Jumlah Transaksi</p>
          <p className="text-lg font-bold text-stone-800 mt-1" style={headFont}>{report.totalTransactions}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-stone-700 mb-2">Rekap per Bulan</h3>
        {report.monthly.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-100 p-4 text-center text-sm text-stone-400">Belum ada data transaksi.</div>
        ) : (
          <div className="bg-white rounded-xl border border-stone-100 divide-y divide-stone-50">
            {report.monthly.map((m) => (
              <div key={m.key} className="px-4 py-3 flex items-center justify-between">
                <p className="text-sm text-stone-800">{m.label}</p>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-600">+{formatRupiah(m.setor)}</p>
                  {m.tarik > 0 && <p className="text-xs text-red-500">-{formatRupiah(m.tarik)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-stone-700 mb-2">Rekap per Jenis Hewan</h3>
        {report.byAnimal.length === 0 && !report.noAnimal ? (
          <div className="bg-white rounded-xl border border-stone-100 p-4 text-center text-sm text-stone-400">Belum ada data.</div>
        ) : (
          <div className="bg-white rounded-xl border border-stone-100 divide-y divide-stone-50">
            {report.byAnimal.map(({ animal, count, totalBalance, totalTarget }) => (
              <div key={animal.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-800">{animalEmoji(animal.name)} {animal.name}</p>
                  <p className="text-xs text-stone-400">{count} orang</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-700">{formatRupiah(totalBalance)}</p>
                  <p className="text-xs text-stone-400">dari target {formatRupiah(totalTarget)}</p>
                </div>
              </div>
            ))}
            {report.noAnimal && (
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-800">🐾 Belum pilih hewan</p>
                  <p className="text-xs text-stone-400">{report.noAnimal.count} orang</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-700">{formatRupiah(report.noAnimal.totalBalance)}</p>
                  <p className="text-xs text-stone-400">dari target {formatRupiah(report.noAnimal.totalTarget)}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-stone-500">{label}</label>
      {children}
    </div>
  );
}

function ModalShell({ title, onClose, children }) {
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

function MemberModal({ title, initial, defaultTarget, animalTypes, onClose, onSave }) {
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

function TransactionModal({ memberName, onClose, onSave }) {
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

function PaymentConfirmModal({ member, settings, onClose, onSubmit }) {
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

function ConfirmModal({ message, onCancel, onConfirm }) {
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

function ResetPinModal({ memberName, onClose, onSave }) {
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

function GroupEditorModal({ type, members, currentOverride, balanceFor, onClose, onSave }) {
  // Local editable state: array of arrays of member IDs
  const allForType = Object.entries(members)
    .filter(([, m]) => m.animalId === type.id)
    .map(([id, m]) => ({ id, ...m }))
    .sort((a, b) => (a.joinDate || '').localeCompare(b.joinDate || '') || a.id.localeCompare(b.id));

  const initGroups = () => {
    if (currentOverride?.groups?.length) {
      return currentOverride.groups.map((g) => [...g]);
    }
    // Auto-seed from quota
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
  const [dragInfo, setDragInfo] = useState(null); // { memberId }

  const assignedIds = new Set(groups.flat());
  const unassigned = allForType.filter((m) => !assignedIds.has(m.id));

  function addGroup() {
    setGroups((g) => [...g, []]);
    setGroupNames((n) => [...n, `Kelompok ${groups.length + 1}`]);
  }
  function removeGroup(gi) {
    // Move members back to unassigned (effectively)
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
    // Filter empty groups unless there's only one
    const cleaned = groups.length > 1 ? groups.filter((g) => g.length > 0) : groups;
    const cleanedNames = cleaned.map((_, i) => groupNames[i] || `Kelompok ${i + 1}`);
    onSave({ groups: cleaned, names: cleanedNames });
  }

  const chipCls = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-700 cursor-grab select-none';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100 shrink-0">
          <div>
            <h3 className="font-semibold text-stone-900" style={headFont}>
              {animalEmoji(type.name)} Edit Kelompok — {type.name}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">Atur kelompok patungan secara manual</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400"><X size={18}/></button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Groups */}
          {groups.map((grp, gi) => (
            <div key={gi} className="border border-stone-200 rounded-xl p-3 space-y-2">
              {/* Group header */}
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

              {/* Members in this group */}
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
                      {/* Move buttons */}
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

              {/* Add unassigned to this group */}
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

          {/* Unassigned members */}
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

          {/* Add group button */}
          <button onClick={addGroup} className="w-full py-2.5 rounded-xl border border-dashed border-blue-300 text-blue-600 text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-50 transition">
            <Plus size={15}/> Tambah Kelompok Baru
          </button>
        </div>

        {/* Footer actions */}
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

function LoginScreen({ members, settings, onLogin }) {
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
      <FontImport />
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

function ChangePinModal({ member, onClose, onSave }) {
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

function MemberDashboard({ memberId, member, transactions, balance, settings, confirmations, onSubmitConfirmation, onChangePin, onLogout }) {
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
      <FontImport />
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

function SettingsPanel({ settings, persistSettings }) {
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

function AdminDashboard({ members, transactions, settings, confirmations, groupOverrides, balanceFor, persistMembers, persistTransactions, persistSettings, persistConfirmations, persistGroupOverrides, onLogout }) {
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

  const memberList = Object.entries(members).map(([id, m]) => ({ id, ...m, balance: balanceFor(id) }));
  const filtered = memberList.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search));
  const totalSaved = memberList.reduce((s, m) => s + m.balance, 0);
  const groupData = computeGroups(members, settings, groupOverrides || {});
  const pendingConfirmations = (confirmations || []).filter((c) => c.status === 'pending');
  const sortedConfirmations = [...(confirmations || [])].sort((a, b) => b.createdAt - a.createdAt);
  const orphanConfirmations = sortedConfirmations.filter((c) => !members[c.memberId]);
  const financeReport = computeFinanceReport(members, transactions, settings, balanceFor);

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
      <FontImport />
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

      <nav className="bg-white border-b border-stone-100 px-4 flex gap-1">
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
                    <Edit2 size={12}/> Edit Kelompok
                  </button>
                </div>

                {groups.length === 0 ? (
                  <p className="text-sm text-stone-400">Belum ada Shohibul Qurban yang memilih hewan ini.</p>
                ) : (
                  <div className="space-y-3">
                    {groups.map((g, idx) => {
                      const name = (groupOverrides?.[type.id]?.names?.[idx]) || `Kelompok ${idx + 1}`;
                      const isFull = g.length >= type.quota;
                      const totalGroupSaved = g.reduce((s, m) => s + balanceFor(m.id), 0);
                      const totalGroupTarget = type.price * type.quota;
                      return (
                        <div key={idx} className="border border-stone-100 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-stone-800">{name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isFull ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                              {g.length}/{type.quota} orang{isFull ? ' · Lengkap' : ` · Kurang ${type.quota - g.length}`}
                            </span>
                          </div>
                          <ul className="space-y-1 mb-2">
                            {g.map((m) => (
                              <li key={m.id} className="text-sm text-stone-600 flex items-center justify-between">
                                <span>{m.name}</span>
                                <span className="text-stone-400">{formatRupiah(balanceFor(m.id))}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="text-xs text-stone-400 pt-1 border-t border-stone-50">
                            Total terkumpul: {formatRupiah(totalGroupSaved)} / {formatRupiah(totalGroupTarget)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Unassigned members in manual mode */}
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

                <div className="text-xs text-stone-400">Kuota {type.quota} orang/ekor</div>
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
      </div>

      {printTarget === 'full' && (
        <PrintReport settings={settings} members={members} transactions={transactions} balanceFor={balanceFor} />
      )}
      {printTarget === 'finance' && <FinanceReport settings={settings} report={financeReport} />}
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [confirmations, setConfirmations] = useState([]);
  const [groupOverrides, setGroupOverrides] = useState({});
  const [session, setSession] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [m, t, s, c, g] = await Promise.all([
          safeGet(STORAGE_KEYS.MEMBERS, true),
          safeGet(STORAGE_KEYS.TRANSACTIONS, true),
          safeGet(STORAGE_KEYS.SETTINGS, true),
          safeGet(STORAGE_KEYS.CONFIRMATIONS, true),
          safeGet(STORAGE_KEYS.GROUP_OVERRIDES, true),
        ]);
        if (m) setMembers(JSON.parse(m.value));
        if (t) setTransactions(JSON.parse(t.value));
        if (s) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s.value) });
        else {
          try { await window.storage.set(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS), true); } catch {}
        }
        if (c) setConfirmations(JSON.parse(c.value));
        if (g) setGroupOverrides(JSON.parse(g.value));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persistMembers(next) {
    setMembers(next);
    try { await window.storage.set(STORAGE_KEYS.MEMBERS, JSON.stringify(next), true); } catch (e) { console.error(e); }
  }
  async function persistTransactions(next) {
    setTransactions(next);
    try { await window.storage.set(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(next), true); } catch (e) { console.error(e); }
  }
  async function persistSettings(next) {
    setSettings(next);
    try { await window.storage.set(STORAGE_KEYS.SETTINGS, JSON.stringify(next), true); } catch (e) { console.error(e); }
  }
  async function persistConfirmations(next) {
    setConfirmations(next);
    try { await window.storage.set(STORAGE_KEYS.CONFIRMATIONS, JSON.stringify(next), true); } catch (e) { console.error(e); }
  }
  async function persistGroupOverrides(next) {
    setGroupOverrides(next);
    try { await window.storage.set(STORAGE_KEYS.GROUP_OVERRIDES, JSON.stringify(next), true); } catch (e) { console.error(e); }
  }
  async function addConfirmation(conf) {
    await persistConfirmations([...confirmations, conf]);
  }

  function balanceFor(memberId) {
    return transactions
      .filter((t) => t.memberId === memberId)
      .reduce((sum, t) => sum + (t.type === 'tarik' ? -t.amount : t.amount), 0);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-blue-700 text-sm">Memuat...</p>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen members={members} settings={settings} onLogin={setSession} />;
  }

  if (session.role === 'admin') {
    return (
      <AdminDashboard
        members={members}
        transactions={transactions}
        settings={settings}
        confirmations={confirmations}
        groupOverrides={groupOverrides}
        balanceFor={balanceFor}
        persistMembers={persistMembers}
        persistTransactions={persistTransactions}
        persistSettings={persistSettings}
        persistConfirmations={persistConfirmations}
        persistGroupOverrides={persistGroupOverrides}
        onLogout={() => setSession(null)}
      />
    );
  }

  const member = members[session.id];
  if (!member) {
    setSession(null);
    return null;
  }

  return (
    <MemberDashboard
      memberId={session.id}
      member={member}
      transactions={transactions.filter((t) => t.memberId === session.id)}
      balance={balanceFor(session.id)}
      settings={settings}
      confirmations={confirmations.filter((c) => c.memberId === session.id)}
      onSubmitConfirmation={addConfirmation}
      onChangePin={async (newPin) => {
        await persistMembers({ ...members, [session.id]: { ...members[session.id], pin: newPin } });
      }}
      onLogout={() => setSession(null)}
    />
  );
}
