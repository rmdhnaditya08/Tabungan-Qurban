'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../storagePolyfill.js';
import { STORAGE_KEYS, DEFAULT_SETTINGS, safeGet } from '../utils';
import LoginScreen from '../components/LoginScreen';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    (async () => {
      try {
        const sessionStr = localStorage.getItem('qurban-session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (session.role === 'admin') {
            router.push('/admin');
            return;
          } else if (session.role === 'member') {
            router.push('/member');
            return;
          }
        }

        const [membersRes, settingsRes] = await Promise.all([
          fetch('/api/members').then((res) => res.json()),
          fetch('/api/settings').then((res) => res.json()),
        ]);
        if (membersRes && !membersRes.error) setMembers(membersRes);
        if (settingsRes && !settingsRes.error) setSettings(settingsRes);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function handleLogin(session) {
    localStorage.setItem('qurban-session', JSON.stringify(session));
    if (session.role === 'admin') {
      router.push('/admin');
    } else if (session.role === 'member') {
      router.push('/member');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-blue-700 text-sm">Memuat...</p>
      </div>
    );
  }

  return <LoginScreen members={members} settings={settings} onLogin={handleLogin} />;
}
