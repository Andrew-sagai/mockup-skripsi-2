'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';

export default function Home() {
  const { state } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (state.currentUser) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [state.currentUser, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)'
    }}>
      <div style={{ animation: 'pulse 1.5s infinite', color: 'var(--text-muted)' }}>
        Memuat...
      </div>
    </div>
  );
}
