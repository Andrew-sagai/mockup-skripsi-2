'use client';
// ============================================================
// GLOBAL STORE — React Context + useReducer
// Simulates all backend operations for demo
// Persistensi: localStorage key "surat-dinas-state" (versi 1)
// ============================================================
import React, {
  createContext, useContext, useReducer, useCallback,
  useEffect, useState, useRef, useSyncExternalStore, ReactNode,
} from 'react';
import {
  AppState, StoreAction, User, SuratMasuk, Disposisi,
  SuratKeluar, Notifikasi, RiwayatStatus, PenugasanStaf,
  TindakLanjut, PersetujuanSuratKeluar, LogAktivitas,
  StatusSuratMasuk, StatusSuratKeluar, ArsipDigital, JenisSurat,
  KategoriDataMaster, DataMasterItem, NomorSuratCounter,
  UnitKerja, KlasifikasiSurat
} from './types';
import {
  USERS, UNIT_KERJA, JENIS_SURAT, KLASIFIKASI, SURAT_MASUK, DISPOSISI,
  PENUGASAN, TINDAK_LANJUT, SURAT_KELUAR, PERSETUJUAN,
  ARSIP, NOTIFIKASI, RIWAYAT, LOG_AKTIVITAS, NOMOR_SURAT_COUNTER,
  PENGATURAN_INSTANSI, DATA_MASTER
} from './mock-data';
import { supabaseAktif, sb, rpc, GalatData } from './data/supabase';
import { muatSemuaData, type DataTermuat } from './data/loader';

// ─── Konstanta localStorage ────────────────────────────────
const STORAGE_KEY = 'surat-dinas-state-v6';
const STORAGE_VERSION = 6;

// ─── initialState (fallback saat belum ada data tersimpan) ─
const initialState: AppState = {
  currentUser: null,
  users: USERS,
  unitKerja: UNIT_KERJA,
  jenisSurat: JENIS_SURAT,
  klasifikasi: KLASIFIKASI,
  suratMasuk: SURAT_MASUK,
  disposisi: DISPOSISI,
  penugasan: PENUGASAN,
  tindakLanjut: TINDAK_LANJUT,
  suratKeluar: SURAT_KELUAR,
  persetujuan: PERSETUJUAN,
  arsip: ARSIP,
  notifikasi: NOTIFIKASI,
  riwayat: RIWAYAT,
  log: LOG_AKTIVITAS,
  nomorSuratCounter: NOMOR_SURAT_COUNTER,
  pengaturanInstansi: PENGATURAN_INSTANSI,
  dataMaster: DATA_MASTER,
  bukuEkspedisi: [],
};

// ─── kosongkan — state tanpa data (dipakai mode Supabase sebelum data dimuat) ─
function kosongkan(state: AppState): AppState {
  return {
    ...state,
    currentUser: null,
    users: [],
    unitKerja: [],
    jenisSurat: [],
    klasifikasi: [],
    dataMaster: [],
    suratMasuk: [],
    disposisi: [],
    penugasan: [],
    tindakLanjut: [],
    suratKeluar: [],
    persetujuan: [],
    arsip: [],
    notifikasi: [],
    riwayat: [],
    log: [],
    nomorSuratCounter: [],
    bukuEkspedisi: [],
  };
}

// ─── loadState — baca dari localStorage, fallback ke initialState ─
function loadState(): AppState {
  // Guard: jangan jalankan di server (Next.js SSR)
  if (typeof window === 'undefined') return initialState;
  // Mode Supabase: jangan pakai data mock — data asli dimuat dari Postgres.
  if (supabaseAktif()) return kosongkan(initialState);
  try {
    // Bersihkan cache persuratan versi lama agar reset data surat tuntas
    const oldKeys = ['surat-dinas-state', 'surat-dinas-state-v1', 'surat-dinas-state-v2', 'surat-dinas-state-v3', 'surat-dinas-state-v4', 'surat-dinas-state-v5'];
    let preservedUsers: User[] | null = null;
    let preservedUnitKerja: UnitKerja[] | null = null;
    let preservedDataMaster: DataMasterItem[] | null = null;

    for (const oldKey of oldKeys) {
      const oldVal = localStorage.getItem(oldKey);
      if (oldVal) {
        try {
          const oldObj = JSON.parse(oldVal);
          if (oldObj.users && !preservedUsers) preservedUsers = oldObj.users;
          if (oldObj.unitKerja && !preservedUnitKerja) preservedUnitKerja = oldObj.unitKerja;
          if (oldObj.dataMaster && !preservedDataMaster) preservedDataMaster = oldObj.dataMaster;
        } catch { /* ignore */ }
        localStorage.removeItem(oldKey);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    let loadedState = { ...initialState };
    if (preservedUsers && preservedUsers.length > 0) {
      // Pertahankan user kustom yang telah dibuat sebelumnya
      const mergedU = [...initialState.users];
      preservedUsers.forEach(pu => {
        if (!mergedU.some(mu => mu.id === pu.id || mu.email.toLowerCase() === pu.email.toLowerCase())) {
          mergedU.push(pu);
        }
      });
      loadedState.users = mergedU;
    }
    if (preservedUnitKerja) loadedState.unitKerja = preservedUnitKerja;
    if (preservedDataMaster) loadedState.dataMaster = preservedDataMaster;
    
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed._v === STORAGE_VERSION && parsed.users && parsed.unitKerja && parsed.klasifikasi) {
        const { _v, ...rest } = parsed;
        // Pastikan semua jenis surat default ada
        const existingJenis: JenisSurat[] = parsed.jenisSurat || [];
        const mergedJenis = [...existingJenis];
        JENIS_SURAT.forEach((defaultJs) => {
          if (!mergedJenis.some(j => j.id === defaultJs.id)) {
            mergedJenis.push(defaultJs);
          }
        });

        // Pastikan semua akun demo di USERS selalu ada dan terdaftar di state.users admin
        const existingUsers: User[] = parsed.users || [];
        const mergedUsers = [...existingUsers];
        USERS.forEach((defaultUser) => {
          const foundIndex = mergedUsers.findIndex(
            (u) => u.id === defaultUser.id || u.email.toLowerCase() === defaultUser.email.toLowerCase()
          );
          if (foundIndex === -1) {
            mergedUsers.push(defaultUser);
          } else {
            // Sinkronkan data profil dan unit kerja jika ada pembaruan
            const syncedUnitKerjaId = (defaultUser.role === 'admin' || defaultUser.role === 'kepala_dinas')
              ? null
              : (defaultUser.unitKerjaId !== undefined ? defaultUser.unitKerjaId : mergedUsers[foundIndex].unitKerjaId);

            mergedUsers[foundIndex] = {
              ...defaultUser,
              ...mergedUsers[foundIndex],
              role: defaultUser.role,
              unitKerjaId: syncedUnitKerjaId,
            };
          }
        });

        // Normalisasi role pengguna agar sesuai aturan unit kerja (Bab 4 Tabel 10-11)
        const normalizedUsers = mergedUsers.map((u) => {
          if (u.role === 'admin' || u.role === 'kepala_dinas') {
            return { ...u, unitKerjaId: null };
          }
          if ((u.role === 'sekretaris' || u.role === 'petugas_surat') && !u.unitKerjaId) {
            const sek = UNIT_KERJA.find(x => x.jenis === 'sekretariat');
            return { ...u, unitKerjaId: sek ? sek.id : null };
          }
          return u;
        });

        // Pastikan unit kerja selalu punya labelLembar, urutanLembar, dan aktif terbaru
        const existingUnitKerja = parsed.unitKerja || [];
        const mergedUnitKerja = existingUnitKerja.map((uk: any) => {
          const defaultUk = UNIT_KERJA.find(u => u.id === uk.id);
          // Backfill aktif: true jika belum ada field aktif (migrasi dari v2)
          const withAktif = uk.aktif === undefined ? { ...uk, aktif: true } : uk;
          return defaultUk ? { ...withAktif, labelLembar: defaultUk.labelLembar, urutanLembar: defaultUk.urutanLembar } : withAktif;
        });
        UNIT_KERJA.forEach((defaultUk) => {
          if (!mergedUnitKerja.some((u: any) => u.id === defaultUk.id)) {
            mergedUnitKerja.push(defaultUk);
          }
        });

        const existingSuratKeluar: SuratKeluar[] = rest.suratKeluar || [];
        const mergedSuratKeluar = [...existingSuratKeluar];
        SURAT_KELUAR.forEach((defaultSk) => {
          const idx = mergedSuratKeluar.findIndex(sk => sk.id === defaultSk.id || (defaultSk.nomorUrut && sk.nomorUrut === defaultSk.nomorUrut));
          if (idx >= 0) {
            mergedSuratKeluar[idx] = { ...mergedSuratKeluar[idx], ...defaultSk };
          } else {
            mergedSuratKeluar.push(defaultSk);
          }
        });
        const migratedSuratKeluar = mergedSuratKeluar.map((sk: SuratKeluar) => 
          sk.status === ('diajukan' as any) ? { ...sk, status: 'menunggu_paraf' } : sk
        );

        const existingSuratMasuk: SuratMasuk[] = rest.suratMasuk || [];
        const mergedSuratMasuk = [...existingSuratMasuk];
        SURAT_MASUK.forEach((defaultSm) => {
          const idx = mergedSuratMasuk.findIndex(sm => sm.id === defaultSm.id || (defaultSm.nomorUrut && sm.nomorUrut === defaultSm.nomorUrut));
          if (idx >= 0) {
            mergedSuratMasuk[idx] = { ...mergedSuratMasuk[idx], ...defaultSm };
          } else {
            mergedSuratMasuk.push(defaultSm);
          }
        });

        const existingDisposisi: Disposisi[] = rest.disposisi || [];
        const mergedDisposisi = [...existingDisposisi];
        DISPOSISI.forEach((defaultDisp) => {
          if (!mergedDisposisi.some(d => d.id === defaultDisp.id)) {
            mergedDisposisi.push(defaultDisp);
          }
        });

        const existingArsip: ArsipDigital[] = rest.arsip || [];
        const mergedArsip = [...existingArsip];
        ARSIP.forEach((defaultArsip) => {
          if (!mergedArsip.some(a => a.id === defaultArsip.id)) {
            mergedArsip.push(defaultArsip);
          }
        });

        // Pastikan seluruh entri data master default tersedia
        const existingDataMaster: DataMasterItem[] = parsed.dataMaster || [];
        const mergedDataMaster = [...existingDataMaster];
        DATA_MASTER.forEach((defaultDm) => {
          if (!mergedDataMaster.some(d => d.id === defaultDm.id)) {
            mergedDataMaster.push(defaultDm);
          }
        });
        // Pastikan counter nomor surat default terdaftar
        const existingCounters: NomorSuratCounter[] = parsed.nomorSuratCounter || [];
        const mergedCounters = [...existingCounters];
        NOMOR_SURAT_COUNTER.forEach((defaultCounter) => {
          const idx = mergedCounters.findIndex(c => c.tahun === defaultCounter.tahun && c.klasifikasiKode === defaultCounter.klasifikasiKode);
          if (idx >= 0) {
            mergedCounters[idx] = {
              ...mergedCounters[idx],
              counter: Math.max(mergedCounters[idx].counter, defaultCounter.counter)
            };
          } else {
            mergedCounters.push(defaultCounter);
          }
        });

        loadedState = {
          ...initialState,
          ...rest,
          suratMasuk: mergedSuratMasuk,
          disposisi: mergedDisposisi,
          suratKeluar: migratedSuratKeluar,
          arsip: mergedArsip,
          jenisSurat: mergedJenis,
          users: normalizedUsers,
          unitKerja: mergedUnitKerja,
          dataMaster: mergedDataMaster,
          nomorSuratCounter: mergedCounters,
          // Pengaturan instansi selalu dari initialState (Admin manage via Data Master)
          pengaturanInstansi: PENGATURAN_INSTANSI,
        };
      }
    }
    
    // Load currentUserId dari sessionStorage agar tidak tertimpa tab lain
    const sessionId = sessionStorage.getItem('surat-dinas-session');
    if (sessionId) {
      const user = loadedState.users.find(u => u.id === sessionId);
      if (user && user.aktif) {
        loadedState.currentUser = user;
      }
    }
    
    return loadedState;
  } catch {
    // JSON corrupt atau error lain → fallback
    return initialState;
  }
}

// ─── Reducer ──────────────────────────────────────────────
export type StoreActionInternal =
  | StoreAction
  | { type: 'HYDRATE_FROM_STORAGE'; payload: AppState }
  | { type: 'HYDRATE_FROM_SUPABASE'; payload: DataTermuat }
  | { type: 'SET_CURRENT_USER'; payload: User | null };

function appReducer(state: AppState, action: StoreActionInternal): AppState {
  // Muat ulang seluruh data dari Postgres (mode Supabase).
  if (action.type === 'HYDRATE_FROM_SUPABASE') {
    return { ...state, ...(action as { type: 'HYDRATE_FROM_SUPABASE'; payload: DataTermuat }).payload };
  }
  if (action.type === 'SET_CURRENT_USER') {
    return { ...state, currentUser: (action as { type: 'SET_CURRENT_USER'; payload: User | null }).payload };
  }

  // Action internal untuk sinkronisasi antar-tab
  if (action.type === 'HYDRATE_FROM_STORAGE') {
    // PENTING: Pertahankan currentUser tab saat ini, jangan tertimpa dari tab lain
    return { 
      ...(action as { type: 'HYDRATE_FROM_STORAGE'; payload: AppState }).payload,
      currentUser: state.currentUser 
    };
  }

  switch ((action as StoreAction).type) {
    case 'LOGIN':
      return { ...state, currentUser: (action as Extract<StoreAction, { type: 'LOGIN' }>).payload };
    case 'LOGOUT':
      return { ...state, currentUser: null };

    case 'ADD_SURAT_MASUK':
      return { ...state, suratMasuk: [...state.suratMasuk, (action as Extract<StoreAction, { type: 'ADD_SURAT_MASUK' }>).payload] };
    case 'UPDATE_SURAT_MASUK':
      return {
        ...state,
        suratMasuk: state.suratMasuk.map((s) =>
          s.id === (action as Extract<StoreAction, { type: 'UPDATE_SURAT_MASUK' }>).payload.id
            ? { ...s, ...(action as Extract<StoreAction, { type: 'UPDATE_SURAT_MASUK' }>).payload }
            : s
        ),
      };

    case 'ADD_DISPOSISI':
      return { ...state, disposisi: [...state.disposisi, (action as Extract<StoreAction, { type: 'ADD_DISPOSISI' }>).payload] };
    case 'UPDATE_DISPOSISI':
      return {
        ...state,
        disposisi: state.disposisi.map((d) =>
          d.id === (action as Extract<StoreAction, { type: 'UPDATE_DISPOSISI' }>).payload.id
            ? { ...d, ...(action as Extract<StoreAction, { type: 'UPDATE_DISPOSISI' }>).payload }
            : d
        ),
      };

    case 'ADD_PENUGASAN':
      return { ...state, penugasan: [...state.penugasan, (action as Extract<StoreAction, { type: 'ADD_PENUGASAN' }>).payload] };
    case 'UPDATE_PENUGASAN':
      return {
        ...state,
        penugasan: state.penugasan.map((p) =>
          p.id === (action as Extract<StoreAction, { type: 'UPDATE_PENUGASAN' }>).payload.id
            ? { ...p, ...(action as Extract<StoreAction, { type: 'UPDATE_PENUGASAN' }>).payload }
            : p
        ),
      };

    case 'ADD_TINDAK_LANJUT':
      return { ...state, tindakLanjut: [...state.tindakLanjut, (action as Extract<StoreAction, { type: 'ADD_TINDAK_LANJUT' }>).payload] };
    case 'UPDATE_TINDAK_LANJUT':
      return {
        ...state,
        tindakLanjut: state.tindakLanjut.map((t) =>
          t.id === (action as Extract<StoreAction, { type: 'UPDATE_TINDAK_LANJUT' }>).payload.id
            ? { ...t, ...(action as Extract<StoreAction, { type: 'UPDATE_TINDAK_LANJUT' }>).payload }
            : t
        ),
      };

    case 'ADD_SURAT_KELUAR':
      return { ...state, suratKeluar: [...state.suratKeluar, (action as Extract<StoreAction, { type: 'ADD_SURAT_KELUAR' }>).payload] };
    case 'UPDATE_SURAT_KELUAR':
      return {
        ...state,
        suratKeluar: state.suratKeluar.map((s) =>
          s.id === (action as Extract<StoreAction, { type: 'UPDATE_SURAT_KELUAR' }>).payload.id
            ? { ...s, ...(action as Extract<StoreAction, { type: 'UPDATE_SURAT_KELUAR' }>).payload }
            : s
        ),
      };

    case 'ADD_PERSETUJUAN':
      return { ...state, persetujuan: [...state.persetujuan, (action as Extract<StoreAction, { type: 'ADD_PERSETUJUAN' }>).payload] };

    case 'ADD_NOTIFIKASI':
      return { ...state, notifikasi: [(action as Extract<StoreAction, { type: 'ADD_NOTIFIKASI' }>).payload, ...state.notifikasi] };
    case 'UPDATE_NOTIFIKASI':
      return {
        ...state,
        notifikasi: state.notifikasi.map((n) =>
          n.id === (action as Extract<StoreAction, { type: 'UPDATE_NOTIFIKASI' }>).payload.id
            ? { ...n, ...(action as Extract<StoreAction, { type: 'UPDATE_NOTIFIKASI' }>).payload }
            : n
        ),
      };
    case 'MARK_NOTIFIKASI_READ':
      return {
        ...state,
        notifikasi: state.notifikasi.map((n) =>
          n.id === (action as Extract<StoreAction, { type: 'MARK_NOTIFIKASI_READ' }>).payload
            ? { ...n, dibaca: true }
            : n
        ),
      };

    case 'ADD_RIWAYAT':
      return { ...state, riwayat: [...state.riwayat, (action as Extract<StoreAction, { type: 'ADD_RIWAYAT' }>).payload] };

    case 'ADD_LOG':
      return { ...state, log: [(action as Extract<StoreAction, { type: 'ADD_LOG' }>).payload, ...state.log] };

    case 'ADD_USER':
      return { ...state, users: [...state.users, (action as Extract<StoreAction, { type: 'ADD_USER' }>).payload] };
    case 'UPDATE_USER': {
      const payload = (action as Extract<StoreAction, { type: 'UPDATE_USER' }>).payload;
      return {
        ...state,
        users: state.users.map((u) => (u.id === payload.id ? { ...u, ...payload } : u)),
        currentUser: state.currentUser?.id === payload.id ? { ...state.currentUser, ...payload } : state.currentUser,
      };
    }

    case 'ADD_JENIS_SURAT':
      return { ...state, jenisSurat: [...state.jenisSurat, (action as Extract<StoreAction, { type: 'ADD_JENIS_SURAT' }>).payload] };
    case 'UPDATE_JENIS_SURAT':
      return {
        ...state,
        jenisSurat: state.jenisSurat.map((j) =>
          j.id === (action as Extract<StoreAction, { type: 'UPDATE_JENIS_SURAT' }>).payload.id
            ? { ...j, ...(action as Extract<StoreAction, { type: 'UPDATE_JENIS_SURAT' }>).payload }
            : j
        ),
      };

    case 'ADD_DATA_MASTER':
      return { ...state, dataMaster: [...state.dataMaster, (action as Extract<StoreAction, { type: 'ADD_DATA_MASTER' }>).payload] };
    case 'UPDATE_DATA_MASTER':
      return {
        ...state,
        dataMaster: state.dataMaster.map((dm) =>
          dm.id === (action as Extract<StoreAction, { type: 'UPDATE_DATA_MASTER' }>).payload.id
            ? { ...dm, ...(action as Extract<StoreAction, { type: 'UPDATE_DATA_MASTER' }>).payload }
            : dm
        ),
      };
    case 'DELETE_DATA_MASTER':
      return {
        ...state,
        dataMaster: state.dataMaster.filter((dm) => dm.id !== (action as Extract<StoreAction, { type: 'DELETE_DATA_MASTER' }>).payload),
      };

    case 'ADD_KLASIFIKASI':
      return { ...state, klasifikasi: [...state.klasifikasi, (action as Extract<StoreAction, { type: 'ADD_KLASIFIKASI' }>).payload] };
    case 'UPDATE_KLASIFIKASI':
      return {
        ...state,
        klasifikasi: state.klasifikasi.map((k) =>
          k.id === (action as Extract<StoreAction, { type: 'UPDATE_KLASIFIKASI' }>).payload.id
            ? { ...k, ...(action as Extract<StoreAction, { type: 'UPDATE_KLASIFIKASI' }>).payload }
            : k
        ),
      };

    case 'ADD_UNIT_KERJA':
      return { ...state, unitKerja: [...state.unitKerja, (action as Extract<StoreAction, { type: 'ADD_UNIT_KERJA' }>).payload] };
    case 'UPDATE_UNIT_KERJA':
      return {
        ...state,
        unitKerja: state.unitKerja.map((u) =>
          u.id === (action as Extract<StoreAction, { type: 'UPDATE_UNIT_KERJA' }>).payload.id
            ? { ...u, ...(action as Extract<StoreAction, { type: 'UPDATE_UNIT_KERJA' }>).payload }
            : u
        ),
      };
    case 'DELETE_UNIT_KERJA':
      return {
        ...state,
        unitKerja: state.unitKerja.filter((u) => u.id !== (action as Extract<StoreAction, { type: 'DELETE_UNIT_KERJA' }>).payload),
      };

    case 'ADD_ARSIP':
      return { ...state, arsip: [...state.arsip, (action as Extract<StoreAction, { type: 'ADD_ARSIP' }>).payload] };

    case 'UPDATE_ARSIP': {
      const payload = (action as Extract<StoreAction, { type: 'UPDATE_ARSIP' }>).payload;
      return {
        ...state,
        arsip: state.arsip.map((a) => (a.id === payload.id ? { ...a, ...payload } : a)),
      };
    }

    case 'UPDATE_COUNTER': {
      const p = (action as Extract<StoreAction, { type: 'UPDATE_COUNTER' }>).payload;
      const exists = state.nomorSuratCounter?.find(
        c => c.tahun === p.tahun && c.klasifikasiKode === p.klasifikasiKode
      );
      if (exists) {
        return {
          ...state,
          nomorSuratCounter: state.nomorSuratCounter.map(c =>
            c.tahun === p.tahun && c.klasifikasiKode === p.klasifikasiKode
              ? { ...c, counter: p.counter }
              : c
          ),
        };
      }
      return { ...state, nomorSuratCounter: [...(state.nomorSuratCounter || []), p] };
    }

    case 'RESET_DATA_SURAT':
      return {
        ...state,
        suratMasuk: [],
        disposisi: [],
        penugasan: [],
        tindakLanjut: [],
        suratKeluar: [],
        persetujuan: [],
        arsip: [],
        riwayat: [],
        notifikasi: [],
        log: [],
        nomorSuratCounter: [
          { tahun: new Date().getFullYear(), klasifikasiKode: 'SURAT_MASUK', counter: 0 },
          { tahun: new Date().getFullYear(), klasifikasiKode: 'SURAT_KELUAR', counter: 0 },
        ],
      };

    default:
      return state;
  }
}

// ─── Context Type ─────────────────────────────────────────
interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<StoreActionInternal>;
  isHydrated: boolean;
  /** true bila Supabase terkonfigurasi — menentukan jalur data & autentikasi */
  isSupabase: boolean;
  /** sesi Supabase yang sedang aktif (null pada Mode Demo) */
  authUser: { id: string; email: string } | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  resetToInitial: () => void;
  /** muat ulang seluruh data dari Postgres (mode Supabase) */
  refresh: () => Promise<void>;
  /** C-1: verifikasi sandi per-akun — dipakai apiTandatanganSurat */
  verifyPassword: (email: string, password: string) => boolean;
  getUser: (id: string) => User | undefined;
  getUnitKerja: (id: string) => typeof UNIT_KERJA[0] | undefined;
  getJenisSurat: (id: string | undefined) => JenisSurat | undefined;
  getKlasifikasi: (id: string) => typeof KLASIFIKASI[0] | undefined;
  getDataMaster: (kategori?: KategoriDataMaster, hanyaAktif?: boolean) => DataMasterItem[];
  getMasterLabel: (kategori: KategoriDataMaster, kode: string, defaultVal?: string) => string;
  getUnreadCount: () => number;
  generateId: (prefix: string) => string;
  generateNomorSurat: (klasifikasiKode: string) => string;
  addRiwayat: (suratMasukId: string | undefined, suratKeluarId: string | undefined, status: string, catatan: string) => void;
  addNotifikasi: (userId: string, judul: string, pesan: string, tautanUrl?: string) => void;
  /**
   * Tandai notifikasi sudah dibaca.
   * - Mode Demo   : cukup ubah state lokal.
   * - Mode Supabase: harus disimpan ke Postgres lewat RPC, kalau tidak
   *  flag kembali menjadi belum dibaca setelah muat ulang data.
   * `notifikasiId` kosong = tandai semua notifikasi milik pengguna aktif.
   */
  markNotifikasiRead: (notifikasiId?: string) => Promise<void>;
  addLog: (aksi: string, detail: string) => void;
  getScopedDisposisi: () => Disposisi[];
  getScopedSuratMasuk: () => SuratMasuk[];
  getMyPenugasan: () => PenugasanStaf[];
  getSuratKeluarByRole: () => SuratKeluar[];
  getScopedArsip: () => ArsipDigital[];
}

const StoreContext = createContext<StoreContextType | null>(null);

let idCounter = 1000;

// Pembantu `useSyncExternalStore` untuk mendeteksi sisi klien.
const subscribeHidrasi = () => () => {};
const getSnapshotHidrasi = () => true;
const getServerSnapshotHidrasi = () => false;

// ─── StoreProvider ────────────────────────────────────────
export function StoreProvider({ children }: { children: ReactNode }) {
  // Lazy initializer: loadState() hanya dipanggil sekali saat mount
  const [state, dispatch] = useReducer(appReducer, undefined, loadState);

  // Flag hydration — false saat render di server, true di browser. Dipakai
  // `useSyncExternalStore` supaya tidak perlu `setState` di dalam efek.
  const isHydrated = useSyncExternalStore(
    subscribeHidrasi,
    getSnapshotHidrasi,
    getServerSnapshotHidrasi
  );

  // ── Persist state ke localStorage setiap kali state berubah ──
  //    Hanya Mode Demo. Pada mode Supabase, Postgres adalah sumber kebenaran.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (supabaseAktif()) return;
    try {
      // Exclude currentUser dari data yang dibagikan via localStorage
      const { currentUser, ...stateToSave } = state;
      const toSave = { _v: STORAGE_VERSION, ...stateToSave };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));

      // Simpan session per-tab ke sessionStorage
      if (currentUser) {
        sessionStorage.setItem('surat-dinas-session', currentUser.id);
      } else {
        sessionStorage.removeItem('surat-dinas-session');
      }
    } catch {
      // Quota exceeded atau private browsing — abaikan
    }
  }, [state]);

  // ── Sinkronisasi antar-tab: dengarkan perubahan dari tab lain ──
  // (event 'storage' TIDAK fired di tab yang menulis sendiri — aman dari infinite loop)
  //    Hanya Mode Demo — mode Supabase memakai Realtime Postgres.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (supabaseAktif()) return;
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed._v !== STORAGE_VERSION) return;
        const { _v, ...newState } = parsed;
        dispatch({ type: 'HYDRATE_FROM_STORAGE', payload: newState as AppState } as any);
      } catch {
        // JSON corrupt dari tab lain — abaikan
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // ── Sinkronisasi cookie dengan currentUser (re-set setiap login/logout/hydration) ──
  //    Hanya Mode Demo. Pada mode Supabase, cookie `userRole` justru bisa dipalsukan
  //    sehingga tidak boleh dipakai sebagai penjaga akses — RLS Postgres yang menjaga.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (supabaseAktif()) {
      document.cookie = 'userRole=; path=/; max-age=0; SameSite=Lax';
      return;
    }
    if (state.currentUser) {
      document.cookie = `userRole=${state.currentUser.role}; path=/; max-age=86400; SameSite=Lax`;
    } else {
      document.cookie = 'userRole=; path=/; max-age=0; SameSite=Lax';
    }
  }, [state.currentUser]);

  // ─── Sesi Supabase ─────────────────────────────────────
  const isSupabase = supabaseAktif();
  const [authUser, setAuthUserState] = useState<{ id: string; email: string } | null>(null);
  const authRef = useRef<{ id: string; email: string } | null>(null);

  const setAuthUser = useCallback((v: { id: string; email: string } | null) => {
    authRef.current = v;
    setAuthUserState(v);
  }, []);

  /** Muat ulang seluruh data dari Postgres dan perbarui pengguna saat ini. */
  const refresh = useCallback(async () => {
    if (!supabaseAktif()) return;
    const data = await muatSemuaData();
    dispatch({ type: 'HYDRATE_FROM_SUPABASE', payload: data });
    const id = authRef.current?.id;
    if (id) {
      dispatch({
        type: 'SET_CURRENT_USER',
        payload: data.users.find((u) => u.authId === id) ?? null,
      });
    }
  }, []);

  // ── Pulihkan sesi Supabase saat aplikasi dimuat ──
  useEffect(() => {
    if (!isSupabase) {
      return;
    }
    let batal = false;
    (async () => {
      try {
        const client = sb();
        const { data } = await client.auth.getSession();
        const sesi = data.session;
        if (!sesi) {
          return;
        }
        if (!batal) {
          setAuthUser({ id: sesi.user.id, email: sesi.user.email ?? '' });
        }
        const termuat = await muatSemuaData();
        if (batal) return;
        dispatch({ type: 'HYDRATE_FROM_SUPABASE', payload: termuat });
        dispatch({
          type: 'SET_CURRENT_USER',
          payload: termuat.users.find((u) => u.authId === sesi.user.id) ?? null,
        });
      } catch (galat) {
        console.error('[store] gagal memulihkan sesi Supabase:', galat);
      }
    })();
    return () => {
      batal = true;
    };
  }, [isSupabase, setAuthUser]);

  // ── Ikuti perubahan status autentikasi (mis. sign-out di tab lain) ──
  useEffect(() => {
    if (!isSupabase) return;
    const client = sb();
    const { data } = client.auth.onAuthStateChange((_event, sesi) => {
      if (!sesi) {
        setAuthUser(null);
        dispatch({ type: 'SET_CURRENT_USER', payload: null });
        return;
      }
      setAuthUser({ id: sesi.user.id, email: sesi.user.email ?? '' });
    });
    return () => data.subscription.unsubscribe();
  }, [isSupabase, setAuthUser]);

  // ─── Auth helpers ─────────────────────────────────────

  /**
   * verifyPassword — verifikasi kata sandi akun tertentu dari state.users.
   * Dipakai oleh login() dan apiTandatanganSurat() di api.ts.
   */
  const verifyPassword = useCallback((email: string, password: string): boolean => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    const user = state.users.find(u => u.email.toLowerCase() === cleanEmail && u.aktif);
    return user ? user.dummyPassword === cleanPass : false;
  }, [state.users]);

  const login = useCallback(async (email: string, password: string): Promise<User | null> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (supabaseAktif()) {
      const { data, error } = await sb().auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });
      if (error) {
        if (/invalid login credentials/i.test(error.message)) return null;
        throw new GalatData(
          'Gagal terhubung ke server. Periksa koneksi internet Anda dan coba lagi.'
        );
      }
      const authId = data.user.id;
      const termuat = await muatSemuaData();
      dispatch({ type: 'HYDRATE_FROM_SUPABASE', payload: termuat });
      const user = termuat.users.find((u) => u.authId === authId) ?? null;
      if (!user) {
        await sb().auth.signOut();
        throw new GalatData('Akun Anda belum terdaftar pada aplikasi. Hubungi Administrator.');
      }
      if (!user.aktif) {
        await sb().auth.signOut();
        throw new GalatData('Akun Anda telah dinonaktifkan. Hubungi Administrator.');
      }
      setAuthUser({ id: authId, email: cleanEmail });
      dispatch({ type: 'SET_CURRENT_USER', payload: user });
      return user;
    }

    const user = state.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) return null;

    if (!user.aktif) {
      throw new Error("Akun Anda telah dinonaktifkan. Hubungi Administrator.");
    }

    if (user.dummyPassword === cleanPass) {
      // Tulis cookie sekarang juga: middleware membacanya pada navigasi berikutnya,
      // sebelum useEffect sinkronisasi cookie sempat berjalan.
      document.cookie = `userRole=${user.role}; path=/; max-age=86400; SameSite=Lax`;
      sessionStorage.setItem('surat-dinas-session', user.id);
      dispatch({ type: 'LOGIN', payload: user });
      return user;
    }

    return null;
  }, [state.users, setAuthUser]);

  const logout = useCallback(async () => {
    if (supabaseAktif()) {
      try {
        await sb().auth.signOut();
      } catch {
        // abaikan — sesi lokal tetap dibersihkan
      }
      setAuthUser(null);
    }
    // Cookie di-clear oleh useEffect [state.currentUser] — tidak perlu duplikasi
    dispatch({ type: 'LOGOUT' });
  }, [setAuthUser]);

  // ── Reset seluruh data ke initialState ──
  const resetToInitial = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem('surat-dinas-session');
    document.cookie = 'userRole=; path=/; max-age=0; SameSite=Lax';
    window.location.reload();
  }, []);

  // ─── Lookup helpers ───────────────────────────────────
  const getUser = useCallback((id: string) => {
    return state.users.find((u) => u.id === id);
  }, [state.users]);

  const getUnitKerja = useCallback((id: string) => {
    return state.unitKerja.find((u) => u.id === id);
  }, [state.unitKerja]);

  const getJenisSurat = useCallback((id: string | undefined) => {
    if (!id) return undefined;
    return state.jenisSurat.find((j) => j.id === id);
  }, [state.jenisSurat]);

  const getKlasifikasi = useCallback((id: string) => {
    return state.klasifikasi.find((k) => k.id === id);
  }, [state.klasifikasi]);

  const getUnreadCount = useCallback(() => {
    if (!state.currentUser) return 0;
    return state.notifikasi.filter(
      (n) => n.userId === state.currentUser!.id && !n.dibaca
    ).length;
  }, [state.currentUser, state.notifikasi]);

  // ─── Generator helpers ────────────────────────────────
  const generateId = useCallback((prefix: string) => {
    idCounter++;
    return `${prefix}-${Date.now()}-${idCounter}`;
  }, []);

  const generateNomorSurat = useCallback((klasifikasiKode: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][now.getMonth()];
    const existing = state.suratKeluar.filter(
      (s) => s.nomorSurat && s.nomorSurat.includes(`/${year}`)
    ).length;
    const nextNum = String(existing + 90).padStart(3, '0');
    return `${klasifikasiKode}/${nextNum}/DISTAN-MS/${monthRoman}/${year}`;
  }, [state.suratKeluar]);

  // ─── Audit helpers ────────────────────────────────────
  const addRiwayat = useCallback((
    suratMasukId: string | undefined,
    suratKeluarId: string | undefined,
    status: string,
    catatan: string,
  ) => {
    if (!state.currentUser) return;
    const riwayat: RiwayatStatus = {
      id: `r-${Date.now()}`,
      suratMasukId,
      suratKeluarId,
      status,
      pelakuId: state.currentUser.id,
      waktu: new Date().toISOString(),
      catatan,
    };
    dispatch({ type: 'ADD_RIWAYAT', payload: riwayat });
  }, [state.currentUser]);

  const addNotifikasi = useCallback((userId: string, judul: string, pesan: string, tautanUrl?: string) => {
    const notif: Notifikasi = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      judul,
      pesan,
      tautanUrl,
      dibaca: false,
      createdAt: new Date().toISOString(),
      kanal: 'panel', // default saat dibuat
    };
    dispatch({ type: 'ADD_NOTIFIKASI', payload: notif });

    // R-02: Simulasi/Kirim email notifikasi secara asinkron
    const userTarget = state.users.find(u => u.id === userId);
    if (userTarget && userTarget.email) {
      fetch('/api/notifikasi/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email: userTarget.email,
          judul,
          pesan
        })
      })
      .then(res => res.json())
      .then(data => {
        dispatch({ 
          type: 'UPDATE_NOTIFIKASI', 
          payload: { 
            id: notif.id, 
            kanal: data.kanal || 'email',
            statusKirim: data.statusKirim || 'gagal',
            pesanGalat: data.pesanGalat || ''
          } 
        });
      })
      .catch(err => {
        dispatch({ 
          type: 'UPDATE_NOTIFIKASI', 
          payload: { 
            id: notif.id, 
            kanal: 'email',
            statusKirim: 'gagal',
            pesanGalat: err.message
          } 
        });
      });
    }
  }, [state.users]);

  /**
   * Tandai notifikasi sudah dibaca.
   * - Mode Supabase: flag disimpan ke Postgres lewat RPC; tanpa itu status
   *   kembali menjadi "belum dibaca" setiap kali data dimuat ulang.
   * - Mode Demo: cukup ubah state lokal.
   * `notifikasiId` kosong = tandai semua notifikasi milik pengguna aktif.
   */
  const markNotifikasiRead = useCallback(
    async (notifikasiId?: string) => {
      if (isSupabase) {
        await rpc('rpc_tandai_notifikasi_dibaca', { p_notifikasi_id: notifikasiId ?? null });
        await refresh();
        return;
      }
      if (notifikasiId) {
        dispatch({ type: 'MARK_NOTIFIKASI_READ', payload: notifikasiId });
        return;
      }
      state.notifikasi
        .filter((n) => n.userId === state.currentUser?.id && !n.dibaca)
        .forEach((n) => dispatch({ type: 'MARK_NOTIFIKASI_READ', payload: n.id }));
    },
    [isSupabase, refresh, state.notifikasi, state.currentUser]
  );

  const addLog = useCallback((aksi: string, detail: string) => {
    if (!state.currentUser) return;
    const log: LogAktivitas = {
      id: `la-${Date.now()}`,
      userId: state.currentUser.id,
      aksi,
      detail,
      waktu: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_LOG', payload: log });
  }, [state.currentUser]);

  // ─── Scoped data helpers ──────────────────────────────

  /**
   * getScopedDisposisi — filter disposisi per role:
   * - kepala_bidang  : hanya disposisi ke bidangnya (semua status, untuk monitoring)
   * - sekretaris     : disposisi lintas bidang (>1 bidang tujuan)
   * - kepala_dinas   : SEMUA disposisi (proposal 14d: dashboard menyeluruh);
   *                    badge "Butuh Aksi" ditentukan di UI via status === 'menunggu_disposisi'
   * - petugas_surat  : semua disposisi (untuk status tracking)
   * - staf_pelaksana : disposisi yang ada penugasannya ke staf bersangkutan
   */
  const getScopedDisposisi = useCallback(() => {
    if (!state.currentUser) return [];
    const role = state.currentUser.role;
    if (role === 'kepala_bidang') {
      return state.disposisi.filter(d =>
        d.bidangTujuan.some(b => b.unitKerjaId === state.currentUser!.unitKerjaId)
      );
    }
    if (role === 'sekretaris') {
      // Sekdis melihat disposisi lintas bidang (instruksi koordinasi atau >1 bidang) atau disposisi ke sekretariat
      return state.disposisi.filter(d =>
        d.bidangTujuan.length > 1 ||
        d.instruksi === 'koordinasi_konfirmasi' ||
        d.bidangTujuan.some(b => b.unitKerjaId === state.currentUser!.unitKerjaId)
      );
    }
    if (role === 'staf_pelaksana') {
      const myDispIds = state.penugasan
        .filter(p => p.stafId === state.currentUser!.id)
        .map(p => p.disposisiId);
      return state.disposisi.filter(d => myDispIds.includes(d.id));
    }
    // kepala_dinas & petugas_surat: akses penuh ke SEMUA disposisi
    // (Proposal 14d: Kadis memperoleh dashboard pimpinan yang menyeluruh)
    return state.disposisi;
  }, [state.currentUser, state.disposisi, state.penugasan]);

  /**
   * getScopedSuratMasuk — filter surat masuk berdasarkan role:
   * - kepala_bidang  : hanya surat yang ada disposisinya ke unitKerja miliknya
   * - staf_pelaksana : hanya surat yang ada penugasannya dengan stafId === user.id
   * - lainnya        : semua surat masuk (akses penuh)
   */
  const getScopedSuratMasuk = useCallback((): SuratMasuk[] => {
    if (!state.currentUser) return [];
    const role = state.currentUser.role;

    if (role === 'kepala_bidang') {
      const myDispIds = state.disposisi
        .filter(d => d.bidangTujuan.some(b => b.unitKerjaId === state.currentUser!.unitKerjaId))
        .map(d => d.suratMasukId);
      return state.suratMasuk.filter(s => myDispIds.includes(s.id));
    }

    if (role === 'staf_pelaksana') {
      const myPenugasan = state.penugasan.filter(p => p.stafId === state.currentUser!.id);
      const myDispIds = myPenugasan.map(p => p.disposisiId);
      const myDisposisi = state.disposisi.filter(d => myDispIds.includes(d.id));
      const mySMIds = myDisposisi.map(d => d.suratMasukId);
      return state.suratMasuk.filter(s => mySMIds.includes(s.id));
    }

    if (role === 'sekretaris') {
      // Sekretaris: akses surat dinas, namun surat rahasia hanya jika sekretariat menjadi tujuan disposisi
      return state.suratMasuk.filter(s => {
        if (s.sifat !== 'rahasia') return true;
        return state.disposisi.some(d => d.suratMasukId === s.id && d.bidangTujuan.some(b => b.unitKerjaId === state.currentUser!.unitKerjaId));
      });
    }

    // petugas_surat, admin, kepala_dinas: akses penuh
    return state.suratMasuk;
  }, [state.currentUser, state.suratMasuk, state.disposisi, state.penugasan]);

  const getMyPenugasan = useCallback(() => {
    if (!state.currentUser) return [];
    if (state.currentUser.role === 'staf_pelaksana') {
      return state.penugasan.filter(p => p.stafId === state.currentUser!.id);
    }
    return state.penugasan;
  }, [state.currentUser, state.penugasan]);

  const getSuratKeluarByRole = useCallback(() => {
    if (!state.currentUser) return [];
    const role = state.currentUser.role;
    if (role === 'sekretaris') {
      // Sekretaris: lihat semua surat keluar tapi aksi hanya pada menunggu_paraf
      return state.suratKeluar;
    }
    if (role === 'kepala_dinas') {
      // Kadis: lihat semua surat keluar untuk monitoring; aksi hanya pada menunggu_ttd
      return state.suratKeluar;
    }
    if (role === 'staf_pelaksana') {
      // Staf: hanya melihat surat yang ia susun
      return state.suratKeluar.filter(s => s.penyusunId === state.currentUser!.id);
    }
    // petugas_surat: akses penuh
    return state.suratKeluar;
  }, [state.currentUser, state.suratKeluar]);

  const getScopedArsip = useCallback(() => {
    if (!state.currentUser) return [];
    const role = state.currentUser.role;
    if (role === 'staf_pelaksana') {
      const myPenugasan = state.penugasan.filter(p => p.stafId === state.currentUser!.id);
      const myDispIds = myPenugasan.map(p => p.disposisiId);
      const myDisposisi = state.disposisi.filter(d => myDispIds.includes(d.id));
      const mySMIds = myDisposisi.map(d => d.suratMasukId);
      return state.arsip.filter(
        a => a.jenisSurat === 'masuk' && a.suratMasukId && mySMIds.includes(a.suratMasukId)
      );
    }
    if (role === 'kepala_bidang') {
      // Kabid: arsip surat yang pernah didisposisikan ke bidangnya
      const myDispSMIds = state.disposisi
        .filter(d => d.bidangTujuan.some(b => b.unitKerjaId === state.currentUser!.unitKerjaId))
        .map(d => d.suratMasukId);
      return state.arsip.filter(
        a => a.suratKeluarId || (a.suratMasukId && myDispSMIds.includes(a.suratMasukId))
      );
    }
    return state.arsip;
  }, [state.currentUser, state.arsip, state.penugasan, state.disposisi]);

  const getDataMaster = useCallback((kategori?: KategoriDataMaster, hanyaAktif: boolean = true) => {
    return (state.dataMaster || [])
      .filter(d => (!kategori || d.kategori === kategori) && (!hanyaAktif || d.aktif))
      .sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
  }, [state.dataMaster]);

  const getMasterLabel = useCallback((kategori: KategoriDataMaster, kode: string, defaultVal?: string) => {
    const item = (state.dataMaster || []).find(d => d.kategori === kategori && d.kode.toLowerCase() === (kode || '').toLowerCase());
    return item ? item.label : (defaultVal || kode);
  }, [state.dataMaster]);

  // ─── Provider value ───────────────────────────────────
  return (
    <StoreContext.Provider
      value={{
        state,
        dispatch,
        isHydrated,
        isSupabase,
        authUser,
        login,
        logout,
        resetToInitial,
        refresh,
        verifyPassword,
        getUser,
        getUnitKerja,
        getJenisSurat,
        getKlasifikasi,
        getDataMaster,
        getMasterLabel,
        getUnreadCount,
        markNotifikasiRead,
        generateId,
        generateNomorSurat,
        addRiwayat,
        addNotifikasi,
        addLog,
        getScopedDisposisi,
        getScopedSuratMasuk,
        getMyPenugasan,
        getSuratKeluarByRole,
        getScopedArsip,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
