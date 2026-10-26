'use client';
import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import {
  STATUS_SURAT_MASUK_LABELS, STATUS_SURAT_KELUAR_LABELS,
  SIFAT_SURAT_LABELS, USER_ROLE_LABELS, SuratMasuk, SuratKeluar
} from '@/lib/types';
import { BUKU_EKSPEDISI_DATA } from '@/lib/mock-data';
import {
  BookOpen, Printer, Download, Search, MailOpen, Send,
  FileCheck, Calendar, Filter, RotateCcw, Clock, ShieldAlert,
  ArrowRight, Users, CheckCircle2, ChevronDown
} from 'lucide-react';
import { BadgeSifat, ChipStatus } from '@/components/ui';

// ─── Utility Format Tanggal Sesuai Lampiran Proposal ───────────────────────────
function formatHariTanggal(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = days[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dayName} ${dd}/${mm}/${yy}`;
}

function formatTanggalBiasa(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatTanggalRingkasDinas(dateStr?: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const yy = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${yy}`;
}

function formatTanggalKeluarDinas(dateStr?: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('-') && dateStr.includes('/')) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const yy = String(d.getFullYear()).slice(-2);
  return `${day}/${month}-${yy}`;
}

export default function LaporanPage() {
  const { state } = useStore();
  const user = state.currentUser;

  // Filter state
  const [tab, setTab] = useState<string>('');
  const [periode, setPeriode] = useState<'semua' | 'harian' | 'bulanan' | 'tahunan'>('semua');
  const [filterBulan, setFilterBulan] = useState<number>(new Date().getMonth() + 1);
  const [filterTahun, setFilterTahun] = useState<number>(new Date().getFullYear());
  const [search, setSearch] = useState<string>('');

  if (!user) return null;
  const role = user.role;

  // ─── Definisi Tab Berdasarkan RBAC ──────────────────────────────────────────
  const allowedTabs = useMemo(() => {
    if (role === 'admin') {
      return [
        { key: 'akun', label: 'Akun & Pengguna', icon: Users },
        { key: 'log', label: 'Log Aktivitas Sistem', icon: Clock },
      ];
    }
    if (role === 'petugas_surat' || role === 'kepala_dinas') {
      return [
        { key: 'surat_masuk', label: 'Buku Agenda Masuk', icon: MailOpen },
        { key: 'surat_keluar', label: 'Buku Agenda Keluar', icon: Send },
        { key: 'ekspedisi', label: 'Buku Ekspedisi Persuratan', icon: BookOpen },
        { key: 'rekapitulasi', label: 'Ringkasan & Kinerja', icon: FileCheck },
      ];
    }
    if (role === 'sekretaris') {
      return [
        { key: 'surat_keluar', label: 'Buku Agenda Keluar', icon: Send },
        { key: 'ekspedisi', label: 'Buku Ekspedisi Persuratan', icon: BookOpen },
        { key: 'disposisi', label: 'Disposisi Lintas Bidang', icon: FileCheck },
      ];
    }
    if (role === 'kepala_bidang') {
      return [
        { key: 'surat_masuk', label: 'Buku Surat Masuk (Bidang)', icon: MailOpen },
        { key: 'ekspedisi', label: 'Buku Ekspedisi (Bidang)', icon: BookOpen },
        { key: 'disposisi', label: 'Disposisi & Kinerja Staf', icon: FileCheck },
      ];
    }
    if (role === 'staf_pelaksana') {
      return [
        { key: 'ekspedisi', label: 'Buku Ekspedisi Penugasan', icon: BookOpen },
        { key: 'penugasan', label: 'Riwayat Tugas Saya', icon: FileCheck },
      ];
    }
    return [{ key: 'surat_masuk', label: 'Buku Agenda Masuk', icon: MailOpen }];
  }, [role]);

  // Set default tab bila belum dipilih atau tab saat ini tidak ada di daftar hak akses
  const activeTab = useMemo(() => {
    if (tab && allowedTabs.some((t) => t.key === tab)) return tab;
    return allowedTabs[0]?.key || 'surat_masuk';
  }, [tab, allowedTabs]);

  // ─── Helper Scoping Data per Role ────────────────────────────────────────────
  const scopedSM = useMemo(() => {
    let list = state.suratMasuk || [];
    if (role === 'kepala_bidang') {
      list = list.filter((s) =>
        state.disposisi.some(
          (d) =>
            d.suratMasukId === s.id &&
            d.bidangTujuan?.some((b) => b.unitKerjaId === user.unitKerjaId)
        )
      );
    } else if (role === 'staf_pelaksana') {
      list = list.filter((s) =>
        state.penugasan.some((p) => {
          if (p.stafId !== user.id) return false;
          const disp = state.disposisi.find((d) => d.id === p.disposisiId);
          return disp?.suratMasukId === s.id;
        })
      );
    }
    return list;
  }, [state.suratMasuk, state.disposisi, state.penugasan, role, user]);

  const scopedSK = useMemo(() => {
    return state.suratKeluar || [];
  }, [state.suratKeluar]);

  // ─── Filter Periode Helper ──────────────────────────────────────────────────
  const matchPeriode = (dateString?: string) => {
    if (periode === 'semua' || !dateString) return true;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return true;
    if (periode === 'harian') {
      const now = new Date();
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }
    if (periode === 'bulanan') {
      return d.getMonth() + 1 === filterBulan && d.getFullYear() === filterTahun;
    }
    if (periode === 'tahunan') {
      return d.getFullYear() === filterTahun;
    }
    return true;
  };

  // ─── Data Terfilter: Buku Agenda Surat Masuk ─────────────────────────────────
  const dataBukuSuratMasuk = useMemo(() => {
    return scopedSM
      .filter((s) => matchPeriode(s.tanggalTerima || s.createdAt))
      .filter((s) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          (s.nomorAgenda || '').toLowerCase().includes(q) ||
          String(s.nomorUrut || '').toLowerCase().includes(q) ||
          s.perihal.toLowerCase().includes(q) ||
          s.asalSurat.toLowerCase().includes(q) ||
          s.nomorSuratAsal.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const urutA = a.nomorUrut !== undefined ? a.nomorUrut : 9999;
        const urutB = b.nomorUrut !== undefined ? b.nomorUrut : 9999;
        return urutA - urutB;
      });
  }, [scopedSM, periode, filterBulan, filterTahun, search]);

  // ─── Data Terfilter: Buku Agenda Surat Keluar ────────────────────────────────
  const dataBukuSuratKeluar = useMemo(() => {
    return scopedSK
      .filter((s) => matchPeriode(s.tanggalKirim || s.createdAt))
      .filter((s) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          s.perihal.toLowerCase().includes(q) ||
          s.tujuan.toLowerCase().includes(q) ||
          String(s.nomorUrut || '').toLowerCase().includes(q) ||
          (s.nomorSurat || '').toLowerCase().includes(q) ||
          (s.nomorBerkas || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.nomorUrut || 0) - (b.nomorUrut || 0));
  }, [scopedSK, periode, filterBulan, filterTahun, search]);

  // ─── Data Terfilter: Buku Ekspedisi Persuratan (Lampiran 1 hlm. 92) ───────────
  const dataBukuEkspedisi = useMemo(() => {
    // 1. Data utama seed wajib dari buku fisik ekspedisi (Lampiran 1)
    const seedRows = BUKU_EKSPEDISI_DATA.map((item) => ({
      id: item.id,
      hariTanggal: item.hariTanggal,
      tanggal: item.tanggal,
      dokumen: item.dokumen,
      tujuanTtdList: item.tujuanTtdList,
    }));

    // 2. Transaksi dinamis tambahan dari surat masuk yang didisposisikan
    const additionalRows: typeof seedRows = [];
    scopedSM.forEach((sm) => {
      if (seedRows.some((sr) => sr.dokumen.toLowerCase().trim() === sm.perihal.toLowerCase().trim())) {
        return;
      }
      const disp = state.disposisi.find((d) => d.suratMasukId === sm.id);
      if (!disp || !disp.bidangTujuan || disp.bidangTujuan.length === 0) return;
      const listTujuan: Array<{ tujuan: string; penerimaParaf: string; tanggalTerima: string }> = [];
      disp.bidangTujuan.forEach((bt) => {
        const uk = state.unitKerja.find((u) => u.id === bt.unitKerjaId);
        const shortName = uk
          ? uk.nama
              .replace('Bidang Tanaman Pangan dan Hortikultura', 'Bid TPH')
              .replace('Bidang Peternakan dan Kesehatan Hewan', 'Bid Peternakan')
              .replace('Bidang Prasarana dan Sarana Pertanian', 'Bid Sarpras')
              .replace('Bidang Perkebunan', 'Bid Perkebunan')
              .replace('Bidang Penyuluhan Pertanian', 'Bid Penyuluhan')
              .replace('Sekretariat', 'Sekretariat')
          : 'Bidang';
        const parafOrName = bt.namaPenerimaSnapshot || (bt.statusTerima === 'diterima' ? '(Paraf ✓)' : '(Menunggu Paraf)');
        const tglTerima = bt.waktuTerima ? formatTanggalKeluarDinas(bt.waktuTerima) : formatTanggalKeluarDinas(sm.tanggalTerima);
        listTujuan.push({
          tujuan: shortName,
          penerimaParaf: parafOrName,
          tanggalTerima: tglTerima,
        });
      });
      additionalRows.push({
        id: `exp-sm-${sm.id}`,
        hariTanggal: formatHariTanggal(sm.tanggalTerima),
        tanggal: sm.tanggalTerima,
        dokumen: sm.perihal,
        tujuanTtdList: listTujuan,
      });
    });

    const allRows = [...seedRows, ...additionalRows];
    return allRows
      .filter((r) => matchPeriode(r.tanggal))
      .filter((r) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          r.dokumen.toLowerCase().includes(q) ||
          r.hariTanggal.toLowerCase().includes(q) ||
          r.tujuanTtdList.some(
            (t) =>
              t.tujuan.toLowerCase().includes(q) ||
              t.penerimaParaf.toLowerCase().includes(q)
          )
        );
      });
  }, [scopedSM, state.disposisi, state.unitKerja, periode, filterBulan, filterTahun, search]);

  // ─── Handler Cetak & Ekspor ─────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    let csvContent = '';
    let filename = '';

    if (activeTab === 'surat_masuk') {
      filename = `Buku_Agenda_Surat_Masuk_${periode}_${Date.now()}.csv`;
      csvContent = 'Nomor Urut,Nomor Berkas,Alamat Pengirim,Tanggal Surat,Nomor Surat,P E R I H A L,Nomor Petunjuk,Nomor Paket\n';
      dataBukuSuratMasuk.forEach((s) => {
        const noUrut = s.nomorUrut || s.nomorAgenda || '';
        const noBerkas = s.nomorBerkas || '';
        const pengirim = s.asalSurat || '';
        const tglSurat = formatTanggalRingkasDinas(s.tanggalSuratAsal);
        const noSurat = s.nomorSuratAsal || '';
        const perihal = s.perihal || '';
        const noPetunjuk = s.nomorPetunjuk || formatTanggalRingkasDinas(s.tanggalTerima);
        const noPaket = s.nomorPaket || '';
        csvContent += `"${noUrut}","${noBerkas}","${pengirim}","${tglSurat}","${noSurat}","${perihal}","${noPetunjuk}","${noPaket}"\n`;
      });
    } else if (activeTab === 'surat_keluar') {
      filename = `Buku_Agenda_Surat_Keluar_${periode}_${Date.now()}.csv`;
      csvContent = 'No. urut,Nomor berkas,ALAMAT TUJUAN,Tanggal,P E R I H A L,Nomor petunjuk,Nomor\n';
      dataBukuSuratKeluar.forEach((s) => {
        const noUrut = s.nomorUrut || '';
        const noBerkas = s.nomorBerkas || '';
        const tujuan = s.tujuan || '';
        const tglKirim = s.tanggalKirim ? formatTanggalKeluarDinas(s.tanggalKirim) : '';
        const perihal = s.perihal || '';
        const noPetunjuk = s.nomorPetunjuk || '';
        const nomor = s.nomorSurat || '';
        csvContent += `"${noUrut}","${noBerkas}","${tujuan}","${tglKirim}","${perihal}","${noPetunjuk}","${nomor}"\n`;
      });
    } else if (activeTab === 'ekspedisi') {
      filename = `Buku_Ekspedisi_Persuratan_${periode}_${Date.now()}.csv`;
      csvContent = 'Hari / Tanggal,Dokumen,Tujuan / TTD\n';
      dataBukuEkspedisi.forEach((r) => {
        const ttdStr = r.tujuanTtdList
          .map((t) => `${t.tujuan} / ${t.penerimaParaf} ${t.tanggalTerima ? `(${t.tanggalTerima})` : ''}`)
          .join(' | ');
        csvContent += `"${r.hariTanggal}","${r.dokumen}","${ttdStr}"\n`;
      });
    }

    if (!csvContent) return;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getLabelPeriode = () => {
    if (periode === 'semua') return 'Semua Periode Transaksi';
    if (periode === 'harian') return `Hari Ini (${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })})`;
    if (periode === 'bulanan') {
      const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      return `Bulan ${namaBulan[filterBulan - 1]} ${filterTahun}`;
    }
    return `Tahun Anggaran ${filterTahun}`;
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn" style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
        
        {/* ── Header Halaman (Screen Only) ─────────────────────────────────── */}
        <div className="page-header no-print" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div className="page-header-left">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BookOpen size={24} style={{ color: 'var(--pinus)' }} />
              Menu Laporan & Buku Agenda Digital
            </h1>
            <p>
              Format buku agenda dan ekspedisi resmi Dinas Pertanian Kabupaten Minahasa Selatan (identik fisik Lampiran 1 & 2)
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              id="btn-print-laporan"
              type="button"
              className="btn btn-primary"
              onClick={handlePrint}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40 }}
            >
              <Printer size={16} /> Cetak Buku Digital
            </button>
            <button
              id="btn-export-laporan"
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCsv}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40 }}
            >
              <Download size={16} /> Ekspor CSV / Excel
            </button>
          </div>
        </div>

        {/* ── Tab Navigasi Buku Persuratan (Screen Only) ─────────────────────── */}
        <div className="tabs no-print" style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {allowedTabs.map((t) => {
            const IconComp = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                id={`tab-${t.key}`}
                type="button"
                className={`tab ${isActive ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13,
                  borderRadius: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <IconComp size={16} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Filter Periode & Search Bar (Screen Only) ────────────────────── */}
        <div className="card no-print" style={{ marginBottom: 24 }}>
          <div className="card-body" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
              
              {/* Filter Periode */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tinta-redup)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={15} /> Periode:
                </span>
                
                <select
                  id="select-periode"
                  className="form-input"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
                  value={periode}
                  onChange={(e) => setPeriode(e.target.value as any)}
                >
                  <option value="semua">Semua Periode</option>
                  <option value="harian">Harian (Hari Ini)</option>
                  <option value="bulanan">Bulanan</option>
                  <option value="tahunan">Tahunan</option>
                </select>

                {periode === 'bulanan' && (
                  <select
                    id="select-bulan"
                    className="form-input"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
                    value={filterBulan}
                    onChange={(e) => setFilterBulan(Number(e.target.value))}
                  >
                    {[
                      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                    ].map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                )}

                {(periode === 'bulanan' || periode === 'tahunan') && (
                  <select
                    id="select-tahun"
                    className="form-input"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
                    value={filterTahun}
                    onChange={(e) => setFilterTahun(Number(e.target.value))}
                  >
                    {[2024, 2025, 2026, 2027].map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                )}

                {periode !== 'semua' && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPeriode('semua')}
                    title="Reset Periode"
                    style={{ fontSize: 12, padding: '4px 8px' }}
                  >
                    <RotateCcw size={13} /> Reset
                  </button>
                )}
              </div>

              {/* Input Pencarian */}
              <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
                <Search
                  size={15}
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tinta-redup)' }}
                />
                <input
                  id="input-search-laporan"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: 32, fontSize: 13, height: 36 }}
                  placeholder="Cari perihal, nomor, tujuan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* ── KONTEN LAPORAN & FORMAT BUKU CETAK (Screen & Print) ──────────────── */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        <div className="buku-cetak-wrapper card" style={{ padding: '24px 28px', background: '#fff' }}>
          
          {/* KOP RESMI DINAS PERTANIAN KABUPATEN MINAHASA SELATAN */}
          <div className="kop-surat-dinas" style={{ textAlign: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '0.05em', color: '#111' }}>
              PEMERINTAH KABUPATEN MINAHASA SELATAN
            </h3>
            <h2 style={{ margin: '2px 0 0', fontSize: 19, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--pinus, #1b4d3e)' }}>
              DINAS PERTANIAN
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: '#444' }}>
              Jl. Trans Sulawesi Kel. Pondang Kecamatan Amurang Timur — Telp/Fax: (0430) 22589
            </p>
            <div style={{ borderBottom: '2.5px solid #111', marginTop: 8, marginBottom: 2 }} />
            <div style={{ borderBottom: '1px solid #111', marginBottom: 14 }} />
          </div>

          {/* ────────────────────────────────────────────────────────────────────── */}
          {/* TAB 1: BUKU AGENDA SURAT MASUK (Gambar 1 hlm. 8: KIKY No. 83 s.d. 89) ── */}
          {/* ────────────────────────────────────────────────────────────────────── */}
          {activeTab === 'surat_masuk' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h2
                  className="judul-buku-agenda"
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: '0.15em',
                    textDecoration: 'underline',
                    margin: 0,
                    color: '#111',
                  }}
                >
                  SURAT SURAT MASUK
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--tinta-redup)' }}>
                  {getLabelPeriode()} · Sesuai Format Cetakan Register Buku Agenda Fisik KIKY
                </p>
              </div>

              <div className="table-responsive">
                <table className="buku-agenda-table">
                  <thead>
                    <tr>
                      <th rowSpan={2} style={{ width: 75, textAlign: 'center', verticalAlign: 'middle' }}>
                        Nomor<br />Urut
                      </th>
                      <th rowSpan={2} style={{ width: 85, textAlign: 'center', verticalAlign: 'middle' }}>
                        Nomor<br />Berkas
                      </th>
                      <th rowSpan={2} style={{ width: 175, textAlign: 'center', verticalAlign: 'middle' }}>
                        Alamat<br />Pengirim
                      </th>
                      <th colSpan={3} style={{ textAlign: 'center', letterSpacing: '0.15em' }}>
                        D A R I &nbsp; S U R A T &nbsp; M A S U K
                      </th>
                      <th rowSpan={2} style={{ width: 95, textAlign: 'center', verticalAlign: 'middle' }}>
                        Nomor<br />Petunjuk
                      </th>
                      <th rowSpan={2} style={{ width: 80, textAlign: 'center', verticalAlign: 'middle' }}>
                        Nomor<br />Paket
                      </th>
                    </tr>
                    <tr>
                      <th style={{ width: 85, textAlign: 'center' }}>Tanggal</th>
                      <th style={{ width: 185, textAlign: 'center' }}>Nomor</th>
                      <th style={{ textAlign: 'center', letterSpacing: '0.15em' }}>P E R I H A L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataBukuSuratMasuk.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--tinta-redup)' }}>
                          Tidak ada catatan surat masuk untuk kriteria dan periode yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      dataBukuSuratMasuk.map((s) => {
                        const noUrut = s.nomorUrut || s.nomorAgenda;
                        const noBerkas = s.nomorBerkas || '';
                        const pengirim = s.asalSurat;
                        const tglSurat = formatTanggalRingkasDinas(s.tanggalSuratAsal);
                        const noSurat = s.nomorSuratAsal;
                        const perihal = s.perihal;
                        const noPetunjuk = s.nomorPetunjuk || formatTanggalRingkasDinas(s.tanggalTerima);
                        const noPaket = s.nomorPaket || '';

                        return (
                          <tr key={s.id}>
                            <td style={{ textAlign: 'center', fontWeight: 800, fontFamily: 'monospace', fontSize: 13 }}>
                              {noUrut}
                            </td>
                            <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 12 }}>
                              {noBerkas}
                            </td>
                            <td style={{ fontWeight: 600, fontSize: 12 }}>
                              {pengirim}
                            </td>
                            <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 12 }}>
                              {tglSurat}
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                              {noSurat}
                            </td>
                            <td style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                              <strong style={{ color: 'var(--tinta)' }}>{perihal}</strong>
                            </td>
                            <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>
                              {noPetunjuk}
                            </td>
                            <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 12 }}>
                              {noPaket}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────────── */}
          {/* TAB 2: BUKU AGENDA SURAT KELUAR (Lampiran 2 hlm. 93: TiTi 239 s.d. 250) ── */}
          {/* ────────────────────────────────────────────────────────────────────── */}
          {activeTab === 'surat_keluar' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h2
                  className="judul-buku-agenda"
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    textDecoration: 'underline',
                    margin: 0,
                    color: '#111',
                  }}
                >
                  SURAT - SURAT KELUAR
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--tinta-redup)' }}>
                  {getLabelPeriode()} · Sesuai Cetakan Register TiTi Lampiran 2 (No. Urut 239 s.d. 250)
                </p>
              </div>

              <div className="table-responsive">
                <table className="buku-agenda-table">
                  <thead>
                    <tr>
                      <th style={{ width: 70, textAlign: 'center' }}>No. urut</th>
                      <th style={{ width: 95, textAlign: 'center' }}>Nomor berkas</th>
                      <th style={{ width: 190 }}>ALAMAT TUJUAN</th>
                      <th style={{ width: 90, textAlign: 'center' }}>Tanggal</th>
                      <th style={{ letterSpacing: '0.15em' }}>P E R I H A L</th>
                      <th style={{ width: 130 }}>Nomor petunjuk</th>
                      <th style={{ width: 130 }}>Nomor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataBukuSuratKeluar.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--tinta-redup)' }}>
                          Tidak ada catatan surat keluar untuk kriteria dan periode yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      dataBukuSuratKeluar.map((s) => {
                        const noUrut = s.nomorUrut;
                        const noBerkas = s.nomorBerkas || '';
                        const tujuan = s.tujuan || '';
                        const tglKirim = s.tanggalKirim ? formatTanggalKeluarDinas(s.tanggalKirim) : '';
                        const perihal = s.perihal || '';
                        const noPetunjuk = s.nomorPetunjuk || '';
                        const nomor = s.nomorSurat || '';

                        return (
                          <tr key={s.id}>
                            <td style={{ textAlign: 'center', fontWeight: 800, fontSize: 13, fontFamily: 'monospace' }}>
                              {noUrut}
                            </td>
                            <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 12 }}>
                              {noBerkas}
                            </td>
                            <td style={{ fontWeight: 600, fontSize: 12 }}>
                              {tujuan}
                            </td>
                            <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 12 }}>
                              {tglKirim}
                            </td>
                            <td style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                              {perihal}
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--tinta-redup)' }}>
                              {noPetunjuk}
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                              {nomor}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────────── */}
          {/* TAB 3: BUKU EKSPEDISI PERSURATAN (Lampiran 1 hlm. 92: PAPERLINE Spiral) ── */}
          {/* ────────────────────────────────────────────────────────────────────── */}
          {activeTab === 'ekspedisi' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h2
                  className="judul-buku-agenda"
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    textDecoration: 'underline',
                    margin: 0,
                    color: '#111',
                  }}
                >
                  BUKU EKSPEDISI PERSURATAN
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--tinta-redup)' }}>
                  {getLabelPeriode()} · Rekapitulasi Tanda Terima Pengantaran Intern (Bidang) & Ekstern (Instansi Luar)
                </p>
              </div>

              <div className="table-responsive">
                <table className="buku-agenda-table">
                  <thead>
                    <tr>
                      <th style={{ width: 160, textAlign: 'center' }}>Hari / Tanggal</th>
                      <th>Dokumen</th>
                      <th style={{ width: 360 }}>Tujuan / TTD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataBukuEkspedisi.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--tinta-redup)' }}>
                          Tidak ada catatan ekspedisi persuratan untuk kriteria dan periode yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      dataBukuEkspedisi.map((r) => (
                        <tr key={r.id}>
                          <td style={{ textAlign: 'center', fontWeight: 600, fontSize: 12 }}>
                            {r.hariTanggal}
                          </td>
                          <td style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                            <strong style={{ color: 'var(--tinta)' }}>{r.dokumen}</strong>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            {/* Aturan Khusus: Multitujuan bersusun ke bawah dalam 1 sel */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {r.tujuanTtdList.map((t, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: 3,
                                    background: '#F8FAF9',
                                    border: '1px solid #D1D5DB',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: 8,
                                  }}
                                >
                                  <div>
                                    <strong style={{ color: 'var(--pinus)' }}>{t.tujuan}</strong>
                                    {t.penerimaParaf ? ` / ${t.penerimaParaf}` : ''}
                                  </div>
                                  {t.tanggalTerima && (
                                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#555', flexShrink: 0 }}>
                                      {t.tanggalTerima}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────────── */}
          {/* TAB 4: REKAPITULASI KINERJA & DISPOSISI (Role Tertentu) ─────────────── */}
          {/* ────────────────────────────────────────────────────────────────────── */}
          {(activeTab === 'rekapitulasi' || activeTab === 'disposisi' || activeTab === 'penugasan') && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#111' }}>
                  REKAPITULASI DISPOSISI & KINERJA TINDAK LANJUT
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--tinta-redup)' }}>
                  {getLabelPeriode()} · Rekam Jejak Penyelesaian Instruksi Pimpinan
                </p>
              </div>

              <div className="table-responsive">
                <table className="buku-agenda-table">
                  <thead>
                    <tr>
                      <th style={{ width: 110, textAlign: 'center' }}>No. Agenda</th>
                      <th>Perihal Surat</th>
                      <th style={{ width: 160 }}>Instruksi Pimpinan</th>
                      <th style={{ width: 170 }}>Bidang Pelaksana</th>
                      <th style={{ width: 100, textAlign: 'center' }}>Tenggat</th>
                      <th style={{ width: 120, textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.disposisi.map((d) => {
                      const sm = state.suratMasuk.find((s) => s.id === d.suratMasukId);
                      const bidangNames = d.bidangTujuan
                        .map((b) => state.unitKerja.find((u) => u.id === b.unitKerjaId)?.nama.replace('Bidang ', '') || '')
                        .filter(Boolean)
                        .join(', ');

                      return (
                        <tr key={d.id}>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>
                            {sm?.nomorAgenda || '—'}
                          </td>
                          <td style={{ fontSize: 12.5 }}>
                            <strong>{sm?.perihal || 'Disposisi'}</strong>
                            {d.catatanKepala && (
                              <div style={{ fontSize: 11, color: 'var(--tinta-redup)', fontStyle: 'italic', marginTop: 2 }}>
                                Catatan: &quot;{d.catatanKepala}&quot;
                              </div>
                            )}
                          </td>
                          <td style={{ fontSize: 12 }}>
                            {d.instruksi.replace(/_/g, ' ')}
                          </td>
                          <td style={{ fontSize: 12, fontWeight: 500 }}>
                            {bidangNames || '—'}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: 12 }}>
                            {d.tenggat ? formatTanggalBiasa(d.tenggat) : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`chip ${d.status === 'selesai' ? 'chip-sukses' : 'chip-info'}`} style={{ fontSize: 11 }}>
                              {d.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────────── */}
          {/* TAB ADMIN: AKUN & LOG AKTIVITAS ─────────────────────────────────────── */}
          {/* ────────────────────────────────────────────────────────────────────── */}
          {role === 'admin' && activeTab === 'akun' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Laporan Akun Pengguna Terdaftar</h2>
              <table className="buku-agenda-table">
                <thead>
                  <tr>
                    <th>Nama Lengkap</th>
                    <th>Email Pengguna</th>
                    <th>Peran / Jabatan</th>
                    <th>Unit Kerja</th>
                    <th style={{ textAlign: 'center' }}>Status Akun</th>
                  </tr>
                </thead>
                <tbody>
                  {state.users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.nama}</td>
                      <td>{u.email}</td>
                      <td>{USER_ROLE_LABELS[u.role] || u.role}</td>
                      <td>{state.unitKerja.find((uk) => uk.id === u.unitKerjaId)?.nama || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`chip ${u.aktif ? 'chip-sukses' : 'chip-netral'}`}>
                          {u.aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {role === 'admin' && activeTab === 'log' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Log Audit & Aktivitas Sistem</h2>
              <table className="buku-agenda-table">
                <thead>
                  <tr>
                    <th style={{ width: 150 }}>Waktu Transaksi</th>
                    <th style={{ width: 180 }}>Pengguna</th>
                    <th style={{ width: 140 }}>Aksi</th>
                    <th>Detail Aktivitas</th>
                  </tr>
                </thead>
                <tbody>
                  {state.log.slice(0, 50).map((l) => {
                    const pel = state.users.find((u) => u.id === l.userId);
                    return (
                      <tr key={l.id}>
                        <td style={{ fontSize: 11.5, fontFamily: 'monospace' }}>
                          {new Date(l.waktu).toLocaleString('id-ID')}
                        </td>
                        <td style={{ fontWeight: 500, fontSize: 12 }}>{pel?.nama || l.userId}</td>
                        <td><span className="badge badge-info" style={{ fontSize: 11 }}>{l.aksi}</span></td>
                        <td style={{ fontSize: 12 }}>{l.detail}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Kolom Tanda Tangan Pengesahan (Muncul Saat Cetak & Di Bawah Tabel) ── */}
          <div
            className="pengesahan-buku-cetak"
            style={{
              marginTop: 36,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              pageBreakInside: 'avoid',
              paddingTop: 16,
              fontSize: 12,
            }}
          >
            <div style={{ textAlign: 'center', width: 280 }}>
              <p style={{ margin: 0 }}>Petugas Pengelola Persuratan,</p>
              <div style={{ height: 60 }} />
              <p style={{ margin: 0, fontWeight: 700, textDecoration: 'underline' }}>
                Johan Tumewu
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#444' }}>
                NIP. 19850614 201001 1 008
              </p>
            </div>

            <div style={{ textAlign: 'center', width: 320 }}>
              <p style={{ margin: 0 }}>
                Amurang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p style={{ margin: '2px 0 0' }}>Mengetahui,</p>
              <p style={{ margin: '2px 0 0', fontWeight: 600 }}>Kepala Dinas Pertanian Kabupaten Minahasa Selatan</p>
              <div style={{ height: 50 }} />
              <p style={{ margin: 0, fontWeight: 700, textDecoration: 'underline' }}>
                Feybie F. Pusung, S.Pt, M.Si
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#444' }}>
                NIP. 19740226 200003 2 002
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* ── CSS Khusus untuk Cetak Buku Agenda Resmi (@media print) ─────────── */}
      <style jsx global>{`
        /* Tabel bergaya buku register fisik */
        .buku-agenda-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          color: #111;
          margin-top: 10px;
          border: 1.5px solid #111;
        }
        .buku-agenda-table th {
          background: #f1f5f3;
          border: 1.5px solid #222;
          padding: 8px 10px;
          font-weight: 700;
          text-align: left;
          color: #111;
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .buku-agenda-table td {
          border: 1px solid #222;
          padding: 8px 10px;
          vertical-align: middle;
        }
        .buku-agenda-table tbody tr:nth-child(even) {
          background-color: #fafbfc;
        }

        /* Tampilan saat Print (Ctrl+P / Tombol Cetak) */
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
            font-size: 11pt !important;
          }
          .app-layout {
            display: block !important;
          }
          .sidebar,
          .navbar,
          .no-print,
          .sidebar-mobile-toggle {
            display: none !important;
          }
          .main-content,
          .page-content {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .buku-cetak-wrapper {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .buku-agenda-table th {
            background: #e5e7eb !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: A4 landscape;
            margin: 15mm 10mm;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
