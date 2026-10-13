import React from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)',
      padding: 24, textAlign: 'center'
    }}>
      <AlertTriangle size={64} style={{ color: 'var(--warning)', marginBottom: 24 }} />
      <h1 style={{ fontSize: 32, marginBottom: 16 }}>403 - Akses Ditolak</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32, maxWidth: 500 }}>
        Maaf, Anda tidak memiliki izin (role) yang diperlukan untuk mengakses halaman ini.
      </p>
      <Link href="/dashboard" className="btn btn-primary">
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
