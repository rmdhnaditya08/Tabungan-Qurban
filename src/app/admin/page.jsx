'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../../storagePolyfill.js';
import { DEFAULT_SETTINGS } from '../../utils';
import AdminDashboard from '../../components/AdminDashboard';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [confirmations, setConfirmations] = useState([]);
  const [groupOverrides, setGroupOverrides] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const sessionStr = localStorage.getItem('qurban-session');
        if (!sessionStr) {
          router.push('/');
          return;
        }
        const session = JSON.parse(sessionStr);
        if (session.role !== 'admin') {
          router.push('/');
          return;
        }

        const [membersRes, transactionsRes, settingsRes, confirmationsRes, groupsRes] = await Promise.all([
          fetch('/api/members').then((res) => res.json()),
          fetch('/api/transactions').then((res) => res.json()),
          fetch('/api/settings').then((res) => res.json()),
          fetch('/api/confirmations').then((res) => res.json()),
          fetch('/api/groups').then((res) => res.json()),
        ]);

        if (membersRes && !membersRes.error) setMembers(membersRes);
        if (transactionsRes && !transactionsRes.error) setTransactions(transactionsRes);
        if (settingsRes && !settingsRes.error) setSettings(settingsRes);
        if (confirmationsRes && !confirmationsRes.error) setConfirmations(confirmationsRes);
        if (groupsRes && !groupsRes.error) setGroupOverrides(groupsRes);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function persistMembers(next) {
    const currentKeys = Object.keys(members);
    const nextKeys = Object.keys(next);
    setMembers(next);

    // Deletions
    for (const key of currentKeys) {
      if (!next[key]) {
        try {
          await fetch(`/api/members?id=${key}`, { method: 'DELETE' });
        } catch (e) {
          console.error(e);
        }
      }
    }

    // Additions or Updates
    for (const key of nextKeys) {
      const currentMember = members[key];
      const nextMember = next[key];
      if (!currentMember || JSON.stringify(currentMember) !== JSON.stringify(nextMember)) {
        try {
          await fetch('/api/members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: key, ...nextMember }),
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  async function persistTransactions(next) {
    const currentIds = new Set(transactions.map((t) => t.id));
    setTransactions(next);

    for (const tx of next) {
      if (!currentIds.has(tx.id)) {
        try {
          await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tx),
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  async function persistSettings(next) {
    setSettings(next);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function persistConfirmations(next) {
    const currentIds = new Set(confirmations.map((c) => c.id));
    const nextIds = new Set(next.map((c) => c.id));
    setConfirmations(next);

    // Deletions
    for (const c of confirmations) {
      if (!nextIds.has(c.id)) {
        try {
          await fetch(`/api/confirmations?id=${c.id}`, { method: 'DELETE' });
        } catch (e) {
          console.error(e);
        }
      }
    }

    // Updates or Additions
    for (const c of next) {
      const currentConf = confirmations.find((x) => x.id === c.id);
      if (!currentConf || JSON.stringify(currentConf) !== JSON.stringify(c)) {
        try {
          await fetch('/api/confirmations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(c),
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  async function persistGroupOverrides(next) {
    const currentKeys = Object.keys(groupOverrides);
    const nextKeys = Object.keys(next);
    setGroupOverrides(next);

    // Deletions (reset to auto)
    for (const key of currentKeys) {
      if (!next[key]) {
        try {
          await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ animalId: key, groups: null }),
          });
        } catch (e) {
          console.error(e);
        }
      }
    }

    // Updates/Additions
    for (const key of nextKeys) {
      const currentGroup = groupOverrides[key];
      const nextGroup = next[key];
      if (!currentGroup || JSON.stringify(currentGroup) !== JSON.stringify(nextGroup)) {
        try {
          await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ animalId: key, ...nextGroup }),
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  function balanceFor(memberId) {
    return transactions
      .filter((t) => t.memberId === memberId)
      .reduce((sum, t) => sum + (t.type === 'tarik' ? -t.amount : t.amount), 0);
  }

  function handleLogout() {
    localStorage.removeItem('qurban-session');
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-blue-700 text-sm">Memuat Admin...</p>
      </div>
    );
  }

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
      onLogout={handleLogout}
    />
  );
}
