import { Download, Printer } from 'lucide-react';
import {
  computeGroups,
  formatDate,
  todayStr,
  thStyle,
  tdStyle,
  resolveTarget,
  formatRupiah,
  animalEmoji,
  headFont
} from '../utils';

export function PrintReport({ settings, members, transactions, balanceFor }) {
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

export function PersonalPrintReport({ settings, member, transactions, balance }) {
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

export function FinanceReport({ settings, report }) {
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

export function FinancePanel({ report, onExportExcel, onPrintPdf }) {
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
