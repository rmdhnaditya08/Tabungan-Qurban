'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../../storagePolyfill.js';
import { DEFAULT_SETTINGS } from '../../utils';
import MemberDashboard from '../../components/MemberDashboard';

export default function MemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [members, setMembers] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [confirmations, setConfirmations] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const sessionStr = localStorage.getItem('qurban-session');
        if (!sessionStr) {
          router.push('/');
          return;
        }
        const parsedSession = JSON.parse(sessionStr);
        if (parsedSession.role !== 'member') {
          router.push('/');
          return;
        }
        setSession(parsedSession);

        const [membersRes, transactionsRes, settingsRes, confirmationsRes] = await Promise.all([
          fetch('/api/members').then((res) => res.json()),
          fetch('/api/transactions').then((res) => res.json()),
          fetch('/api/settings').then((res) => res.json()),
          fetch('/api/confirmations').then((res) => res.json()),
        ]);

        if (membersRes && !membersRes.error) setMembers(membersRes);
        if (transactionsRes && !transactionsRes.error) setTransactions(transactionsRes);
        if (settingsRes && !settingsRes.error) setSettings(settingsRes);
        if (confirmationsRes && !confirmationsRes.error) setConfirmations(confirmationsRes);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function persistMembers(next) {
    setMembers(next);
    const updatedMember = next[session.id];
    if (updatedMember) {
      try {
        await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: session.id, ...updatedMember }),
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  async function addConfirmation(conf) {
    setConfirmations([...confirmations, conf]);
    try {
      await fetch('/api/confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conf),
      });
    } catch (e) {
      console.error(e);
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

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-blue-700 text-sm">Memuat...</p>
      </div>
    );
  }

  const member = members[session.id];
  if (!member) {
    localStorage.removeItem('qurban-session');
    router.push('/');
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
      onLogout={handleLogout}
    />
  );
}
