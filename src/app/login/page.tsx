'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { USER_ROLE_LABELS, UserRole } from '@/lib/types';
import DEMO_AKUN from '@/lib/demo-akun.json';
import { Mail, Lock, AlertCircle, RotateCcw, Users, WifiOff, Database } from 'lucide-react';

// Hanya untuk prototipe — produksi memakai Supabase Auth
const SHOW_DEMO = true;
const STORAGE_KEY = 'surat-dinas-state-v6';

type DemoAkun = {
  id: string;
  nama: string;
  email: string;
  password: string;
  role: UserRole;
  unitKerjaId: string | null;
  unitKerjaNama?: string;
};

const AKUN_DEMO = DEMO_AKUN as DemoAkun[];

type ErrorKind = 'kredensial' | 'nonaktif' | 'koneksi' | null;

export default function LoginPage() {
  const { login, state, isSupabase } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorKind(null);
    setLoading(true);

    // Simulasi latensi jaringan (hanya Mode Demo)
    if (!isSupabase) {
      await new Promise((r) => setTimeout(r, 600));

      // Cek akun nonaktif lebih dulu agar pesan galat lebih spesifik
      const matchUser = state.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (matchUser && !matchUser.aktif) {
        setErrorKind('nonaktif');
        setLoading(false);
        return;
      }
    }

    try {
      const user = await login(email, password);
      if (user) {
        router.push('/dashboard');
      } else {
        setErrorKind('kredensial');
      }
    } catch (galat: any) {
      const pesan = String(galat?.message || '');
      if (/dinonaktifkan/i.test(pesan)) {
        setErrorKind('nonaktif');
      } else if (/belum terdaftar/i.test(pesan)) {
        setErrorKind('kredensial');
      } else {
        setErrorKind('koneksi');
      }
    }

    setLoading(false);
  };

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorKind(null);
  };

  const handleResetDemo = () => {
    if (
      window.confirm(
        'Reset semua data demo?\n\nSeluruh surat masuk, disposisi, dan transaksi akan dihapus. Akun pengguna dan data master tetap ada.'
      )
    ) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  // Kelompokkan akun demo per peran untuk panel demo
  const groupedUsers = AKUN_DEMO.reduce((acc, u) => {
    let group = USER_ROLE_LABELS[u.role];
    if ((u.role === 'kepala_bidang' || u.role === 'staf_pelaksana') && u.unitKerjaNama) {
      group = `${USER_ROLE_LABELS[u.role]} — ${u.unitKerjaNama.replace('Bidang ', '')}`;
    }
    if (!acc[group]) acc[group] = [];
    acc[group].push(u);
    return acc;
  }, {} as Record<string, DemoAkun[]>);

  return (
    <div className="login-page">
      {/* Panel kiri — identitas instansi */}
      <div className="login-left">
        <div className="login-kop">
          <div style={{ margin: '0 auto 16px', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: 84, height: 84, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: '#ffffff', borderRadius: '50%',
              padding: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
            }}>
              <img
                src="/logo.png"
                alt="Logo Minahasa Selatan"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          </div>
          <div className="login-kop-subtitle">Pemerintah Kabupaten Minahasa Selatan</div>
          <div className="login-kop-title">Dinas Pertanian</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
            Sistem Informasi Manajemen Persuratan
          </div>
        </div>
      </div>

      {/* Panel kanan — form masuk */}
      <div className="login-right">
        <div className="login-right-content">
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Masuk</h1>
            <p style={{ color: 'var(--tinta-redup)', fontSize: 14 }}>
              Masukkan email dan kata sandi Anda.
            </p>
          </div>

          {/* Galat — kredensial salah */}
          {errorKind === 'kredensial' && (
            <div className="login-error" role="alert" id="login-error-kredensial">
              <AlertCircle size={16} aria-hidden="true" />
              <span>Email atau kata sandi tidak sesuai. Silakan coba lagi.</span>
            </div>
          )}

          {/* Galat — akun nonaktif */}
          {errorKind === 'nonaktif' && (
            <div className="login-error login-error-warning" role="alert" id="login-error-nonaktif">
              <AlertCircle size={16} aria-hidden="true" />
              <span>
                Akun ini dinonaktifkan. Hubungi Administrator Sistem untuk mengaktifkan kembali.
              </span>
            </div>
          )}

          {/* Galat — koneksi */}
          {errorKind === 'koneksi' && (
            <div className="login-error" role="alert" id="login-error-koneksi">
              <WifiOff size={16} aria-hidden="true" />
              <span>Gagal terhubung ke server. Periksa koneksi internet Anda dan coba lagi.</span>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} aria-hidden="true" style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--tinta-redup)', pointerEvents: 'none'
                }} />
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: 42 }}
                  placeholder="email@distan.go.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Kata Sandi</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} aria-hidden="true" style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--tinta-redup)', pointerEvents: 'none'
                }} />
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: 42 }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {/* Catatan reset — tidak ada tautan lupa kata sandi */}
            <p style={{ fontSize: 12, color: 'var(--tinta-redup)', marginBottom: 8 }}>
              Lupa kata sandi? Hubungi Administrator Sistem untuk mengatur ulang.
            </p>

            <button
              id="btn-login-submit"
              type="submit"
              className="btn btn-primary login-btn"
              disabled={loading}
            >
              {loading ? 'Memproses…' : 'Masuk'}
            </button>
          </form>

          {/* Panel demo (prototipe) */}
          {SHOW_DEMO && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--garis)' }}>
              <button
                id="btn-toggle-demo"
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={() => setShowDemo(!showDemo)}
                aria-expanded={showDemo}
              >
                <Users size={16} aria-hidden="true" />
                {showDemo ? 'Sembunyikan Akun Demo' : 'Gunakan Akun Demo'}
              </button>

              {showDemo && (
                <div
                  id="demo-accounts-panel"
                  className="login-demo"
                  style={{ marginTop: 14, maxHeight: 260, overflowY: 'auto' }}
                >
                  {Object.entries(groupedUsers).map(([groupName, users]) => (
                    <div key={groupName} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--tinta-redup)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {groupName}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {users.map((u) => (
                          <button
                            key={u.id}
                            id={`demo-login-${u.id}`}
                            type="button"
                            style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '8px 12px', background: 'var(--latar)',
                              border: '1px solid var(--garis)', borderRadius: 4,
                              cursor: 'pointer', textAlign: 'left', width: '100%',
                              transition: 'background var(--transition-fast)',
                            }}
                            onClick={() => handleDemoLogin(u.email, u.password)}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--pinus-tint)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--latar)')}
                          >
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tinta)' }}>{u.nama}</span>
                            <span style={{ fontSize: 11, color: 'var(--tinta-redup)' }}>{u.email}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reset data demo — hanya bermakna pada Mode Demo */}
          {!isSupabase && (
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button
                id="btn-reset-demo"
                type="button"
                onClick={handleResetDemo}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', background: 'transparent',
                  border: '1px solid var(--garis)', borderRadius: 4,
                  fontSize: 12, color: 'var(--tinta-redup)', cursor: 'pointer'
                }}
              >
                <RotateCcw size={13} aria-hidden="true" />
                Reset Data Demo
              </button>
            </div>
          )}

          {/* Penanda mode data yang sedang dipakai */}
          <div
            style={{
              marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, fontSize: 11, color: 'var(--tinta-redup)'
            }}
          >
            <Database size={12} aria-hidden="true" />
            {isSupabase
              ? 'Mode Supabase — data tersimpan di server PostgreSQL.'
              : 'Mode Demo — data tersimpan di peramban (localStorage).'}
          </div>
        </div>
      </div>
    </div>
  );
}
