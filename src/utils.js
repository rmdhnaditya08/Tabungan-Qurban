import * as XLSX from 'xlsx';

export const STORAGE_KEYS = {
  MEMBERS: 'qurban-members',
  TRANSACTIONS: 'qurban-transactions',
  SETTINGS: 'qurban-settings',
  CONFIRMATIONS: 'qurban-confirmations',
  GROUP_OVERRIDES: 'qurban-group-overrides',
};

export const DEFAULT_SETTINGS = {
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

export const inputCls = "mt-1 w-full px-3 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";
export const headFont = { fontFamily: "'Outfit', sans-serif" };

export function formatRupiah(num) {
  return 'Rp' + Math.round(Number(num) || 0).toLocaleString('id-ID');
}

export function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function toWaNumber(phone) {
  let p = (phone || '').replace(/\D/g, '');
  if (p.startsWith('0')) return '62' + p.slice(1);
  if (p.startsWith('62')) return p;
  return p ? '62' + p : '';
}

export function animalEmoji(name = '') {
  const n = name.toLowerCase();
  if (n.includes('kambing')) return '🐐';
  if (n.includes('domba')) return '🐑';
  if (n.includes('sapi')) return '🐄';
  if (n.includes('kerbau')) return '🐃';
  if (n.includes('unta')) return '🐫';
  return '🐾';
}

export function resolveTarget(member, settings) {
  if (member.target) return member.target;
  const animal = (settings.animalTypes || []).find((a) => a.id === member.animalId);
  if (animal) return animal.price;
  return settings.targetDefault;
}

export function computeGroups(members, settings, groupOverrides = {}) {
  const types = (settings.animalTypes || []).filter((a) => (a.quota || 1) > 1);
  return types.map((type) => {
    const allForType = Object.entries(members)
      .filter(([, m]) => m.animalId === type.id)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => (a.joinDate || '').localeCompare(b.joinDate || '') || a.id.localeCompare(b.id));

    const override = groupOverrides[type.id];
    if (override && override.groups) {
      const groups = override.groups.map((grp) =>
        grp.map((id) => members[id] ? { id, ...members[id] } : null).filter(Boolean)
      ).filter((g) => g.length > 0 || override.groups.length === 1);
      const assignedIds = new Set(override.groups.flat());
      const unassigned = allForType.filter((m) => !assignedIds.has(m.id));
      return { type, groups, unassigned, isManual: true };
    }

    const quota = type.quota || 7;
    const groups = [];
    for (let i = 0; i < allForType.length; i += quota) {
      groups.push(allForType.slice(i, i + quota));
    }
    return { type, groups, unassigned: [], isManual: false };
  });
}

export async function safeGet(key, shared) {
  try { return await window.storage.get(key, shared); } catch { return null; }
}

export const thStyle = { border: '1px solid #ccc', padding: '4px 8px', textAlign: 'left', background: '#f3f3f3', fontSize: 12 };
export const tdStyle = { border: '1px solid #ccc', padding: '4px 8px', fontSize: 12 };

export function exportAdminExcel(settings, members, transactions, balanceFor) {
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

export function exportMemberExcel(settings, member, transactions, balance) {
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

export const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function formatMonthLabel(key) {
  const [y, m] = key.split('-');
  const idx = parseInt(m, 10) - 1;
  return `${MONTH_NAMES[idx] || m} ${y}`;
}

export function computeFinanceReport(members, transactions, settings, balanceFor) {
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

export function exportFinanceExcel(settings, report) {
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
