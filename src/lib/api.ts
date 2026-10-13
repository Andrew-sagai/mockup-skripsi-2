import { useStore } from './store';
import {
  SuratMasuk, Disposisi, JenisInstruksi, JENIS_INSTRUKSI_LABELS, SuratKeluar, UserRole,
  InstruksiDisposisi, DisposisiTujuan, SifatSurat, USER_ROLE_LABELS
} from './types';

export function useBusinessLogic() {
  const { state, dispatch, generateId, getUser, getKlasifikasi, verifyPassword } = useStore();

  const validateRole = (allowedRoles: string[]) => {
    if (!state.currentUser) throw new Error("Anda harus login.");
    if (!allowedRoles.includes(state.currentUser.role)) {
      throw new Error("Akses ditolak: Anda tidak memiliki wewenang untuk aksi ini.");
    }
    return state.currentUser;
  };

  const toRomawi = (month: number) => {
    const r = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
    return r[month - 1];
  };

  const autoArchive = (
    jenisSurat: 'masuk' | 'keluar',
    suratId: string,
    kodeArsip: string,
    berkasUrl: string,
    perihal: string,
    nomorSurat: string,
    klasifikasiId: string,
    tahun: number,
    jenisSuratId?: string
  ) => {
    dispatch({ type: 'ADD_ARSIP' as any, payload: {
      id: generateId('a'),
      suratMasukId: jenisSurat === 'masuk' ? suratId : undefined,
      suratKeluarId: jenisSurat === 'keluar' ? suratId : undefined,
      jenisSurat,
      jenisSuratId,
      kodeArsip,
      berkasUrl,
      perihal,
      nomorSurat,
      tahun,
      klasifikasiId,
      createdAt: new Date().toISOString()
    }});
  };

  // ─────────────────────────────────────────────────────────────
  // 1. CATAT SURAT MASUK (Tabel 13) — Petugas Surat
  // ─────────────────────────────────────────────────────────────
  const apiCatatSuratMasuk = (data: Partial<SuratMasuk>, file: File | null) => {
    const user = validateRole(['petugas_surat']);
    if (!data.asalSurat || !data.nomorSuratAsal || !data.tanggalSuratAsal || !data.tanggalTerima || !data.perihal || !data.klasifikasiId || !data.jenisSuratId) {
      throw new Error("Field asal surat, nomor, tanggal surat, tanggal diterima, perihal, jenis surat, dan kode klasifikasi arsip wajib diisi.");
    }
    
    const jenis = state.jenisSurat.find(j => j.id === data.jenisSuratId);
    if (!jenis || !jenis.aktif) {
      throw new Error("Jenis surat tidak valid atau sudah nonaktif.");
    }
    
    // Berkas dapat diunggah nyata atau disimulasikan sesuai mockup
    let berkasUrl = '/docs/mock-uploaded.pdf';
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        throw new Error("Format berkas harus PDF.");
      }
      if (file.size > 10 * 1024 * 1024) throw new Error("Ukuran berkas maksimal 10MB.");
      berkasUrl = `/docs/${file.name}`;
    }

    const today = new Date();
    const currentYearStr = today.getFullYear().toString();
    const suratTahunIni = state.suratMasuk.filter(s => s.nomorAgenda.includes(`-${currentYearStr}-`));
    
    let maxNumber = 0;
    for (const s of suratTahunIni) {
      const parts = s.nomorAgenda.split('-');
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    const nextNumber = maxNumber + 1;
    const agendaNo = `AGD-${currentYearStr}-${String(nextNumber).padStart(4, '0')}`;
    
    const suratId = generateId('sm');
    const newSurat: SuratMasuk = {
      id: suratId,
      nomorAgenda: agendaNo,
      tanggalTerima: new Date(data.tanggalTerima).toISOString(),
      asalSurat: data.asalSurat,
      nomorSuratAsal: data.nomorSuratAsal,
      tanggalSuratAsal: data.tanggalSuratAsal,
      perihal: data.perihal,
      jenisSuratId: data.jenisSuratId,
      klasifikasiId: data.klasifikasiId,
      sifat: data.sifat || 'biasa',
      berkasUrl,
      status: 'diagenda',
      pencatatId: user.id,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
    };

    dispatch({ type: 'ADD_SURAT_MASUK', payload: newSurat });
    dispatch({ type: 'ADD_RIWAYAT', payload: {
      id: generateId('r'), suratMasukId: suratId, status: 'Diagenda',
      pelakuId: user.id, waktu: today.toISOString(),
      catatan: `Surat dari ${data.asalSurat} (Jenis: ${jenis.nama}) dicatat dan diagendakan dengan nomor ${agendaNo} oleh ${user.nama}`
    }});
    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: user.id, aksi: 'Catat Surat Masuk',
      detail: `Mencatat surat masuk ${agendaNo} dari ${data.asalSurat}`, waktu: today.toISOString()
    }});
    
    return suratId;
  };

  // ─────────────────────────────────────────────────────────────
  // 2. BUAT KARTU DISPOSISI DIGITAL (Tabel 15) — Petugas Surat
  // ─────────────────────────────────────────────────────────────
  const apiBuatDisposisi = (suratMasukId: string) => {
    const user = validateRole(['petugas_surat']);
    const surat = state.suratMasuk.find(s => s.id === suratMasukId);
    if (!surat) throw new Error("Surat tidak ditemukan.");
    if (surat.status !== 'diagenda') {
      throw new Error("Kartu disposisi hanya dapat dibuat untuk surat dengan status 'Diagenda'.");
    }

    // Validasi kelengkapan data surat dari Tahap 1 sesuai Tabel 15 (Error Situation)
    if (!surat.asalSurat) throw new Error("Data surat belum lengkap: Asal Surat kosong.");
    if (!surat.nomorSuratAsal) throw new Error("Data surat belum lengkap: Nomor Surat Asal kosong.");
    if (!surat.tanggalSuratAsal) throw new Error("Data surat belum lengkap: Tanggal Surat Asal kosong.");
    if (!surat.perihal) throw new Error("Data surat belum lengkap: Perihal kosong.");
    if (!surat.jenisSuratId) throw new Error("Data surat belum lengkap: Jenis Surat belum dipilih.");

    const dispId = generateId('d');
    const today = new Date();

    // Efek bersamaan:
    // a. Status surat berubah: Diagenda -> Menunggu Disposisi
    dispatch({ type: 'UPDATE_SURAT_MASUK', payload: { id: suratMasukId, status: 'menunggu_disposisi', updatedAt: today.toISOString() }});

    // b. Kartu disposisi baru tercipta di state
    const newDisposisi: Disposisi = {
      id: dispId,
      suratMasukId,
      dibuatOleh: user.id,
      instruksi: 'proses_lanjut',
      bidangTujuan: [],
      statusPerBidang: {},
      catatanKepala: '',
      catatanKadin: '',
      tenggat: '',
      status: 'menunggu_disposisi',
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
    };
    dispatch({ type: 'ADD_DISPOSISI', payload: newDisposisi });

    // c. Riwayat status tercatat
    dispatch({ type: 'ADD_RIWAYAT', payload: {
      id: generateId('r'), suratMasukId, status: 'Menunggu Disposisi',
      pelakuId: user.id, waktu: today.toISOString(),
      catatan: `Kartu disposisi digital dibuat oleh ${user.nama}. Menunggu disposisi dan arahan Kepala Dinas.`
    }});

    // d. Log aktivitas
    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: user.id, aksi: 'Buat Kartu Disposisi',
      detail: `Membuat kartu disposisi digital untuk surat ${surat.nomorAgenda}`, waktu: today.toISOString()
    }});
    
    // e. Simulasi notifikasi ke Kepala Dinas
    const kadis = state.users.find(u => u.role === 'kepala_dinas' && u.aktif);
    if (kadis) {
      dispatch({ type: 'ADD_NOTIFIKASI', payload: {
        id: generateId('n'), userId: kadis.id,
        judul: `SURAT BARU PERLU DISPOSISI — ${surat.sifat.toUpperCase()}`,
        pesan: `Surat dari ${surat.asalSurat} perihal "${surat.perihal}" (${surat.nomorAgenda}) memerlukan disposisi Anda.`,
        tautanUrl: `/disposisi/${dispId}`, dibaca: false, createdAt: today.toISOString()
      }});
    }
    
    return dispId;
  };

  // ─────────────────────────────────────────────────────────────
  // 3. BERI DISPOSISI (Tabel 19) — Kepala Dinas
  // ─────────────────────────────────────────────────────────────
  const apiBeriDisposisi = (
    dispId: string,
    instruksi: JenisInstruksi,
    bidangTujuanIds: string[],
    catatan: string,
    tenggat: string,
    instruksiLainnya?: string,
    instruksiList?: InstruksiDisposisi[],
    sifat?: SifatSurat
  ) => {
    const user = validateRole(['kepala_dinas']);
    const disp = state.disposisi.find(d => d.id === dispId);
    if (!disp) throw new Error("Disposisi tidak ditemukan.");
    if (disp.status !== 'menunggu_disposisi') throw new Error("Status disposisi saat ini tidak mengizinkan aksi ini.");
    
    // Validasi WAJIB (Tabel 19 Error Case): minimal 1 bidang tujuan harus dicentang
    if (!bidangTujuanIds || bidangTujuanIds.length === 0) {
      throw new Error("Minimal satu bidang tujuan harus dicentang sebelum mengirim disposisi.");
    }

    // Validasi: setiap tujuan harus ada, aktif, dan (untuk bidang) punya Kabid aktif
    for (const ukId of bidangTujuanIds) {
      const uk = state.unitKerja.find(u => u.id === ukId);
      if (!uk) throw new Error(`Unit kerja dengan id "${ukId}" tidak ditemukan.`);
      if (!uk.aktif) throw new Error(`Unit kerja "${uk.nama}" sudah dinonaktifkan. Hapus pilihan tersebut sebelum mengirim.`);
      if (uk.jenis === 'bidang') {
        const kabid = state.users.find(u => u.role === 'kepala_bidang' && u.unitKerjaId === ukId && u.aktif);
        if (!kabid) throw new Error(`Bidang "${uk.nama}" belum memiliki Kepala Bidang aktif. Daftarkan Kepala Bidang terlebih dahulu.`);
      }
    }


    const today = new Date();

    // Inisialisasi status per bidang independen
    const statusPerBidang: Record<string, any> = {};
    const bidangTujuan: DisposisiTujuan[] = bidangTujuanIds.map((ukId, idx) => {
      const uk = state.unitKerja.find(u => u.id === ukId);
      statusPerBidang[ukId] = {
        status: 'menunggu',
      };
      return {
        id: generateId('db'),
        disposisiId: dispId,
        tipe: (uk?.jenis === 'sekretariat' ? 'sekretaris' : 'bidang'),
        unitKerjaId: ukId,
        urutan: uk?.urutanLembar || idx + 1,
        statusTerima: 'belum' as const,
        statusProses: 'menunggu' as const,
      };
    });

    const bidangNama = bidangTujuanIds.map(ukId => {
      const uk = state.unitKerja.find(u => u.id === ukId);
      return uk?.nama || ukId;
    }).join(', ');

    const isLintasBidang = bidangTujuanIds.length > 1;
    let catatanKoordinasi = undefined;

    // Tahap 3b (Tabel 22): Jika lintas bidang (>1 bidang) -> notifikasi ke Sekretaris Dinas
    if (isLintasBidang || instruksi === 'koordinasi_konfirmasi') {
      catatanKoordinasi = `Disposisi lintas bidang ke: ${bidangNama}. Koordinasi antar-bidang oleh Sekretaris Dinas.`;
      const sekr = state.users.find(u => u.role === 'sekretaris');
      if (sekr) {
        dispatch({ type: 'ADD_NOTIFIKASI', payload: {
          id: generateId('n'), userId: sekr.id,
          judul: '📋 Disposisi Lintas Bidang Memerlukan Koordinasi',
          pesan: `Kepala Dinas mendisposisikan surat ke beberapa bidang (${bidangNama}). Koordinasi Anda diperlukan.`,
          tautanUrl: `/disposisi/${dispId}`, dibaca: false, createdAt: today.toISOString()
        }});
      }
    }

    const instruksiText = instruksi === 'lainnya' && instruksiLainnya
      ? `Lainnya (${instruksiLainnya})`
      : (JENIS_INSTRUKSI_LABELS[instruksi] || instruksi);

    const surat = state.suratMasuk.find(s => s.id === disp.suratMasukId);
    if (sifat && surat) {
      dispatch({ type: 'UPDATE_SURAT_MASUK', payload: { id: surat.id, sifat }});
    }

    const snapshotSurat = surat ? {
      asalSurat: surat.asalSurat,
      nomorSuratAsal: surat.nomorSuratAsal,
      tanggalSuratAsal: surat.tanggalSuratAsal,
      perihal: surat.perihal,
      sifat: sifat || surat.sifat,
      nomorAgenda: surat.nomorAgenda,
      tanggalTerima: surat.tanggalTerima,
      batasWaktuSurat: surat.batasWaktuSurat,
    } : undefined;

    dispatch({ type: 'UPDATE_DISPOSISI', payload: {
      id: dispId,
      sifat,
      instruksi,
      instruksiLainnya: instruksi === 'lainnya' ? instruksiLainnya : undefined,
      instruksiList: instruksiList || (instruksi ? [{ jenis: instruksi, teks: instruksiLainnya }] : []),
      catatanKepala: catatan,
      catatanKadin: catatan,
      tenggat,
      bidangTujuan,
      statusPerBidang,
      catatanKoordinasi,
      catatanKoordinasiSekdin: catatanKoordinasi,
      status: 'didisposisikan',
      lintasBidang: isLintasBidang,
      parafKdOleh: user.nama,
      parafKdAt: today.toISOString(),
      parafKdIp: '127.0.0.1',
      parafKepalaWaktu: today.toISOString(),
      parafKadinOleh: user.nama,
      parafKadinWaktu: today.toISOString(),
      ttdNamaSnapshot: user.nama,
      ttdNipSnapshot: (user as any).nip || '',
      ttdJabatanSnapshot: 'Kepala Dinas',
      snapshotSurat,
      updatedAt: today.toISOString()
    }});

    dispatch({ type: 'UPDATE_SURAT_MASUK', payload: { id: disp.suratMasukId, status: 'didisposisikan', updatedAt: today.toISOString() }});

    // Riwayat — Tabel 19
    dispatch({ type: 'ADD_RIWAYAT', payload: {
      id: generateId('r'), suratMasukId: disp.suratMasukId, status: 'Didisposisikan',
      pelakuId: user.id, waktu: today.toISOString(),
      catatan: `Kepala Dinas (${user.nama}) mendisposisikan ke ${bidangNama} dengan instruksi: ${instruksiText}. Tenggat: ${tenggat ? new Date(tenggat).toLocaleDateString('id-ID') : '-'}.`
    }});
    
    // Notifikasi simulasi ke SEMUA Kepala Bidang / unit yang dicentang
    bidangTujuanIds.forEach(ukId => {
      const penerima = state.users.find(u => (u.role === 'kepala_bidang' || u.role === 'sekretaris') && u.unitKerjaId === ukId);
      if (penerima) {
        const unitNama = state.unitKerja.find(u => u.id === ukId)?.nama || '';
        dispatch({ type: 'ADD_NOTIFIKASI', payload: {
          id: generateId('n'), userId: penerima.id,
          judul: 'Disposisi Baru dari Kepala Dinas',
          pesan: `Surat didisposisikan ke ${unitNama}. Instruksi: ${instruksiText}.`,
          tautanUrl: `/disposisi/${dispId}`, dibaca: false, createdAt: today.toISOString()
        }});
      }
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 4. TERIMA DISPOSISI (Tabel 23 — paraf tanda terima) — Kepala Bidang
  // ─────────────────────────────────────────────────────────────
  const apiTerimaDisposisi = (dispId: string) => {
    const user = validateRole(['kepala_bidang', 'sekretaris']);
    const disp = state.disposisi.find(d => d.id === dispId);
    if (!disp) throw new Error("Disposisi tidak ditemukan.");
    if (disp.status !== 'didisposisikan' && disp.status !== 'diterima_bidang') {
      throw new Error("Disposisi belum diteruskan oleh Kepala Dinas.");
    }
    
    const bidangMatch = disp.bidangTujuan.find(b => b.unitKerjaId === user.unitKerjaId);
    if (!bidangMatch) throw new Error("Akses ditolak: Disposisi ini bukan untuk bidang Anda.");

    const today = new Date();
    const updatedBidangTujuan = disp.bidangTujuan.map(b => 
      b.unitKerjaId === user.unitKerjaId ? {
        ...b,
        statusTerima: 'diterima' as const,
        waktuTerima: today.toISOString(),
        statusProses: 'diterima_bidang' as const
      } : b
    );

    const updatedStatusPerBidang = {
      ...(disp.statusPerBidang || {}),
      [user.unitKerjaId!]: {
        status: 'diterima_bidang' as const,
        diterimaOleh: user.nama,
        diterimaWaktu: today.toISOString(),
      }
    };
    
    dispatch({ type: 'UPDATE_DISPOSISI', payload: {
      id: dispId,
      bidangTujuan: updatedBidangTujuan,
      statusPerBidang: updatedStatusPerBidang,
      status: 'diterima_bidang',
      updatedAt: today.toISOString()
    }});
    dispatch({ type: 'UPDATE_SURAT_MASUK', payload: { id: disp.suratMasukId, status: 'diterima_bidang', updatedAt: today.toISOString() }});

    // Riwayat — Tabel 23
    const unitNama = state.unitKerja.find(u => u.id === user.unitKerjaId)?.nama || '';
    dispatch({ type: 'ADD_RIWAYAT', payload: {
      id: generateId('r'), suratMasukId: disp.suratMasukId, status: 'Diterima Bidang',
      pelakuId: user.id, waktu: today.toISOString(),
      catatan: `${unitNama} (${user.nama}) memberikan paraf tanda terima disposisi.`
    }});
  };

  // ─────────────────────────────────────────────────────────────
  // 5. TERUSKAN KE STAF (Tabel 24) — Kepala Bidang
  // ─────────────────────────────────────────────────────────────
  const apiTeruskanKeStaf = (dispId: string, stafId: string, catatanPenugasan: string) => {
    const user = validateRole(['kepala_bidang']);
    const disp = state.disposisi.find(d => d.id === dispId);
    if (!disp) throw new Error("Disposisi tidak ditemukan.");
    
    const bidangMatch = disp.bidangTujuan.find(b => b.unitKerjaId === user.unitKerjaId);
    if (!bidangMatch || bidangMatch.statusTerima !== 'diterima') {
      throw new Error("Bidang Anda belum menerima disposisi ini. Berikan paraf tanda terima terlebih dahulu.");
    }
    
    // Validasi WAJIB Tabel 24: staf tujuan wajib dipilih
    if (!stafId) {
      throw new Error("Staf pelaksana tujuan wajib dipilih sebelum meneruskan penugasan.");
    }

    const staf = state.users.find(u => u.id === stafId);
    if (!staf || staf.unitKerjaId !== user.unitKerjaId) {
      throw new Error("Staf pelaksana wajib dipilih dari bidang yang sama.");
    }

    const today = new Date();

    const updatedStatusPerBidang = {
      ...(disp.statusPerBidang || {}),
      [user.unitKerjaId!]: {
        status: 'diteruskan_staf' as const,
        diterimaOleh: disp.statusPerBidang?.[user.unitKerjaId!]?.diterimaOleh || user.nama,
        diterimaWaktu: disp.statusPerBidang?.[user.unitKerjaId!]?.diterimaWaktu || today.toISOString(),
        diteruskanKe: stafId,
        catatanPenugasan,
      }
    };

    const updatedBidangTujuan = disp.bidangTujuan.map(b => 
      b.unitKerjaId === user.unitKerjaId ? {
        ...b,
        statusProses: 'diteruskan_staf' as const,
        diteruskanKe: stafId,
        catatanPenugasan,
      } : b
    );

    dispatch({ type: 'ADD_PENUGASAN', payload: {
      id: generateId('ps'), disposisiId: dispId, stafId, kepalaBidangId: user.id, catatanPenugasan,
      status: 'ditugaskan', createdAt: today.toISOString()
    }});
    dispatch({ type: 'UPDATE_DISPOSISI', payload: {
      id: dispId,
      bidangTujuan: updatedBidangTujuan,
      statusPerBidang: updatedStatusPerBidang,
      status: 'diteruskan_ke_staf',
      updatedAt: today.toISOString()
    }});
    dispatch({ type: 'UPDATE_SURAT_MASUK', payload: { id: disp.suratMasukId, status: 'diteruskan_ke_staf', updatedAt: today.toISOString() }});

    // Riwayat — Tabel 24
    dispatch({ type: 'ADD_RIWAYAT', payload: {
      id: generateId('r'), suratMasukId: disp.suratMasukId, status: 'Diteruskan ke Staf',
      pelakuId: user.id, waktu: today.toISOString(),
      catatan: `${user.nama} meneruskan penugasan kepada Staf Pelaksana: ${staf.nama}. Catatan: ${catatanPenugasan || '-'}`
    }});
    
    dispatch({ type: 'ADD_NOTIFIKASI', payload: {
      id: generateId('n'), userId: stafId, judul: 'Penugasan Baru dari Kepala Bidang',
      pesan: `${user.nama} menugaskan Anda untuk menindaklanjuti disposisi surat. Catatan: ${catatanPenugasan || '-'}`,
      tautanUrl: `/disposisi/${dispId}`, dibaca: false, createdAt: today.toISOString()
    }});
  };

  // ─────────────────────────────────────────────────────────────
  // 6. TINDAK LANJUT LANGSUNG (Tabel 21) — Kepala Bidang
  // ─────────────────────────────────────────────────────────────
  const apiTindakLanjutLangsung = (dispId: string, uraianHasil: string, file: File | null, perluSuratJawaban: boolean = false) => {
    const user = validateRole(['kepala_bidang', 'sekretaris']);
    const disp = state.disposisi.find(d => d.id === dispId);
    if (!disp) throw new Error("Disposisi tidak ditemukan.");
    
    const bidangMatch = disp.bidangTujuan.find(b => b.unitKerjaId === user.unitKerjaId);
    if (!bidangMatch || bidangMatch.statusTerima !== 'diterima') {
      throw new Error("Bidang Anda belum menerima disposisi ini.");
    }
    
    if (!uraianHasil || !uraianHasil.trim()) {
      throw new Error("Uraian hasil tindak lanjut wajib diisi.");
    }
    if (file && file.size > 10 * 1024 * 1024) throw new Error("File melebihi 10MB.");

    const today = new Date();

    const updatedStatusPerBidang = {
      ...(disp.statusPerBidang || {}),
      [user.unitKerjaId!]: {
        status: 'ditindak_langsung' as const,
        diterimaOleh: disp.statusPerBidang?.[user.unitKerjaId!]?.diterimaOleh || user.nama,
        diterimaWaktu: disp.statusPerBidang?.[user.unitKerjaId!]?.diterimaWaktu || today.toISOString(),
        uraianHasil,
      }
    };

    const updatedBidangTujuan = disp.bidangTujuan.map(b => 
      b.unitKerjaId === user.unitKerjaId ? {
        ...b,
        statusProses: 'ditindak_langsung' as const,
      } : b
    );

    // Bab 4 Poin 3A: Status disposisi induk HANYA selesai bila SELURUH bidang tujuan telah selesai
    const allFinished = updatedBidangTujuan.length > 0 && updatedBidangTujuan.every(b =>
      b.statusProses === 'ditindak_langsung' || b.statusProses === 'selesai'
    );

    dispatch({ type: 'ADD_TINDAK_LANJUT', payload: {
      id: generateId('tl'), disposisiId: dispId, pelakuId: user.id, uraianHasil,
      berkasUrl: file ? '/docs/tl-uploaded.pdf' : undefined, status: 'disetujui', createdAt: today.toISOString()
    }});
    dispatch({ type: 'UPDATE_DISPOSISI', payload: {
      id: dispId,
      bidangTujuan: updatedBidangTujuan,
      statusPerBidang: updatedStatusPerBidang,
      status: allFinished ? 'selesai' : 'diterima_bidang',
      perluSuratJawaban: perluSuratJawaban || undefined,
      updatedAt: today.toISOString()
    }});
    if (allFinished) {
      dispatch({ type: 'UPDATE_SURAT_MASUK', payload: { id: disp.suratMasukId, status: 'selesai', updatedAt: today.toISOString() }});
    }

    const sm = state.suratMasuk.find(s => s.id === disp.suratMasukId);
    const unitNama = state.unitKerja.find(u => u.id === user.unitKerjaId)?.nama || '';

    // Riwayat — Tabel 21
    dispatch({ type: 'ADD_RIWAYAT', payload: {
      id: generateId('r'), suratMasukId: disp.suratMasukId,
      status: allFinished ? 'Selesai' : 'Ditindaklanjuti Bidang',
      pelakuId: user.id, waktu: today.toISOString(),
      catatan: `${user.nama} (${unitNama}) menindaklanjuti langsung. Uraian: ${uraianHasil.slice(0, 120)}${uraianHasil.length > 120 ? '...' : ''}.${allFinished ? ' Seluruh bidang selesai, surat diarsipkan.' : ' Menunggu penyelesaian bidang lain.'}`
    }});
    
    if (allFinished && sm) {
      autoArchive('masuk', sm.id, `ARS-M-${today.getFullYear()}/${dispId}`, sm.berkasUrl, sm.perihal, sm.nomorSuratAsal, sm.klasifikasiId, today.getFullYear(), sm.jenisSuratId);

      const kadis = state.users.find(u => u.role === 'kepala_dinas');
      if (kadis) {
        dispatch({ type: 'ADD_NOTIFIKASI', payload: {
          id: generateId('n'), userId: kadis.id, judul: '✅ Disposisi Selesai',
          pesan: `Surat "${sm?.perihal.slice(0,60)}" telah selesai seluruhnya.`,
          tautanUrl: `/disposisi/${dispId}`, dibaca: false, createdAt: today.toISOString()
        }});
      }
      const petugas = state.users.filter(u => u.role === 'petugas_surat');
      petugas.forEach(p => {
        dispatch({ type: 'ADD_NOTIFIKASI', payload: {
          id: generateId('n'), userId: p.id, judul: '✅ Surat Selesai Diproses',
          pesan: `Surat "${sm?.perihal.slice(0,60)}" (${sm?.nomorAgenda}) dinyatakan selesai.`,
          tautanUrl: `/surat-masuk/${sm?.id}`, dibaca: false, createdAt: today.toISOString()
        }});
      });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 7a. SIMPAN PROGRES (Tabel 27) — Staf Pelaksana
  // ─────────────────────────────────────────────────────────────
  const apiSimpanProgres = (dispId: string, catatanProgres: string) => {
    const user = validateRole(['staf_pelaksana']);
    const penugasan = state.penugasan.find(p => p.disposisiId === dispId && p.stafId === user.id && p.status !== 'selesai');
    if (!penugasan) throw new Error("Anda tidak memiliki penugasan aktif untuk disposisi ini.");

    const today = new Date();
    dispatch({ type: 'UPDATE_PENUGASAN', payload: { id: penugasan.id, catatanProgres, status: 'dikerjakan' } });
    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: user.id, aksi: 'Simpan Progres Tugas',
      detail: `Menyimpan progres penugasan: ${catatanProgres.slice(0, 50)}`, waktu: today.toISOString()
    }});
  };

  // ─────────────────────────────────────────────────────────────
  // 7. LAPORKAN HASIL (Tabel 11) — Staf Pelaksana
  // ─────────────────────────────────────────────────────────────
  const apiLaporkanHasil = (dispId: string, uraianHasil: string, file: File | null) => {
    const user = validateRole(['staf_pelaksana']);
    const penugasan = state.penugasan.find(p => p.disposisiId === dispId && p.stafId === user.id && p.status !== 'selesai');
    if (!penugasan) throw new Error("Anda tidak memiliki penugasan aktif untuk disposisi ini.");
    if (!uraianHasil) throw new Error("Uraian hasil wajib diisi.");

    const today = new Date();
    const disp = state.disposisi.find(d => d.id === dispId);

    const updatedBidangTujuan = disp?.bidangTujuan.map(b =>
      b.diteruskanKe === user.id ? { ...b, statusProses: 'menunggu_pemeriksaan' as const } : b
    );

    dispatch({ type: 'ADD_TINDAK_LANJUT', payload: {
      id: generateId('tl'), disposisiId: dispId, penugasanStafId: penugasan.id, pelakuId: user.id,
      uraianHasil, berkasUrl: file ? '/docs/tl-staf.pdf' : undefined, status: 'dilaporkan', createdAt: today.toISOString()
    }});
    // Bab 4 Poin 7: Status penugasan menjadi 'menunggu_pemeriksaan', BUKAN 'selesai'!
    dispatch({ type: 'UPDATE_PENUGASAN', payload: { id: penugasan.id, status: 'menunggu_pemeriksaan' as any }});
    dispatch({ type: 'UPDATE_DISPOSISI', payload: { id: dispId, bidangTujuan: updatedBidangTujuan, status: 'menunggu_pemeriksaan', updatedAt: today.toISOString() }});
    dispatch({ type: 'UPDATE_SURAT_MASUK', payload: { id: disp?.suratMasukId || '', status: 'menunggu_pemeriksaan', updatedAt: today.toISOString() }});

    // Riwayat — Tabel 11 (Bab 4)
    dispatch({ type: 'ADD_RIWAYAT', payload: {
      id: generateId('r'), suratMasukId: disp?.suratMasukId, status: 'Menunggu Pemeriksaan',
      pelakuId: user.id, waktu: today.toISOString(),
      catatan: `Staf Pelaksana ${user.nama} melaporkan hasil tindak lanjut. Menunggu pemeriksaan Kepala Bidang.`
    }});
    
    dispatch({ type: 'ADD_NOTIFIKASI', payload: {
      id: generateId('n'), userId: penugasan.kepalaBidangId, judul: 'Laporan Staf Masuk',
      pesan: `${user.nama} telah mengirimkan laporan tindak lanjut. Mohon diperiksa.`,
      tautanUrl: `/disposisi/${dispId}`, dibaca: false, createdAt: today.toISOString()
    }});
  };

  // ─────────────────────────────────────────────────────────────
  // 8. PERIKSA LAPORAN STAF (Tabel 12) — Kepala Bidang
  // ─────────────────────────────────────────────────────────────
  const apiPeriksaLaporan = (tlId: string, setuju: boolean, catatan: string, perluSuratJawaban: boolean = false) => {
    const user = validateRole(['kepala_bidang']);
    const tl = state.tindakLanjut.find(t => t.id === tlId);
    if (!tl) throw new Error("Tindak lanjut tidak ditemukan.");
    if (tl.status !== 'dilaporkan') throw new Error("Status tidak valid.");
    
    const penugasan = state.penugasan.find(p => p.id === tl.penugasanStafId);
    if (!penugasan || penugasan.kepalaBidangId !== user.id) throw new Error("Laporan ini bukan dari staf Anda.");

    const today = new Date();
    const disp = state.disposisi.find(d => d.id === tl.disposisiId);
    const sm = disp ? state.suratMasuk.find(s => s.id === disp.suratMasukId) : null;
    const staf = getUser(penugasan.stafId);

    if (setuju) {
      dispatch({ type: 'UPDATE_TINDAK_LANJUT', payload: { id: tlId, status: 'disetujui' }});
      dispatch({ type: 'UPDATE_PENUGASAN', payload: { id: penugasan.id, status: 'selesai' }});

      // Update bidang ini menjadi 'selesai'
      const updatedBidangTujuan = (disp?.bidangTujuan || []).map(b =>
        b.unitKerjaId === user.unitKerjaId ? { ...b, statusProses: 'selesai' as any } : b
      );

      const allFinished = updatedBidangTujuan.length > 0 && updatedBidangTujuan.every(b =>
        b.statusProses === 'selesai' || b.statusProses === 'ditindak_langsung'
      );

      const newDispStatus = allFinished ? 'selesai' : 'diterima_bidang';

      dispatch({ type: 'UPDATE_DISPOSISI', payload: {
        id: tl.disposisiId,
        bidangTujuan: updatedBidangTujuan,
        status: newDispStatus,
        perluSuratJawaban: setuju && perluSuratJawaban ? true : undefined,
        updatedAt: today.toISOString()
      }});
      if (allFinished) {
        dispatch({ type: 'UPDATE_SURAT_MASUK', payload: { id: disp!.suratMasukId, status: 'selesai', updatedAt: today.toISOString() }});
        if (sm) autoArchive('masuk', sm.id, `ARS-M-${today.getFullYear()}/${sm.id}`, sm.berkasUrl, sm.perihal, sm.nomorSuratAsal, sm.klasifikasiId, today.getFullYear(), sm.jenisSuratId);
      }

      // Riwayat — Tabel 12 setuju (Bab 4)
      dispatch({ type: 'ADD_RIWAYAT', payload: {
        id: generateId('r'), suratMasukId: disp?.suratMasukId,
        status: allFinished ? 'Selesai' : 'Laporan Disetujui',
        pelakuId: user.id, waktu: today.toISOString(),
        catatan: `${user.nama} menyetujui laporan dari ${staf?.nama || 'staf'}.${allFinished ? ' Seluruh disposisi selesai dan diarsipkan.' : ' Menunggu penyelesaian bidang lain.'}`
      }});

      if (allFinished) {
        const kadis = state.users.find(u => u.role === 'kepala_dinas');
        if (kadis) {
          dispatch({ type: 'ADD_NOTIFIKASI', payload: {
            id: generateId('n'), userId: kadis.id, judul: '✅ Disposisi Selesai',
            pesan: `Surat "${sm?.perihal.slice(0,60)}" telah selesai seluruhnya.`,
            tautanUrl: `/disposisi/${tl.disposisiId}`, dibaca: false, createdAt: today.toISOString()
          }});
        }
        state.users.filter(u => u.role === 'petugas_surat').forEach(p => {
          dispatch({ type: 'ADD_NOTIFIKASI', payload: {
            id: generateId('n'), userId: p.id, judul: '✅ Surat Selesai Diproses',
            pesan: `Surat "${sm?.perihal.slice(0,60)}" (${sm?.nomorAgenda}) dinyatakan selesai.`,
            tautanUrl: `/surat-masuk/${sm?.id}`, dibaca: false, createdAt: today.toISOString()
          }});
        });
      } else {
        dispatch({ type: 'ADD_NOTIFIKASI', payload: {
          id: generateId('n'), userId: penugasan.stafId, judul: 'Laporan Anda Disetujui',
          pesan: `Laporan Anda untuk surat "${sm?.perihal.slice(0,60)}" telah disetujui oleh ${user.nama}.`,
          tautanUrl: `/disposisi/${tl.disposisiId}`, dibaca: false, createdAt: today.toISOString()
        }});
      }

    } else {
      if (!catatan) throw new Error("Catatan wajib diisi saat mengembalikan laporan.");
      dispatch({ type: 'UPDATE_TINDAK_LANJUT', payload: { id: tlId, status: 'dikembalikan', catatanPengembalian: catatan, uraianHasil: `[DIKEMBALIKAN: ${catatan}] ${tl.uraianHasil}` }});
      dispatch({ type: 'UPDATE_PENUGASAN', payload: { id: penugasan.id, status: 'perlu_perbaikan' as any }});

      const updatedBidangTujuan = (disp?.bidangTujuan || []).map(b =>
        b.unitKerjaId === user.unitKerjaId ? { ...b, statusProses: 'diteruskan_staf' as const } : b
      );

      dispatch({ type: 'UPDATE_DISPOSISI', payload: { id: tl.disposisiId, bidangTujuan: updatedBidangTujuan, status: 'diteruskan_ke_staf', updatedAt: today.toISOString() }});
      if (disp) dispatch({ type: 'UPDATE_SURAT_MASUK', payload: { id: disp.suratMasukId, status: 'diteruskan_ke_staf', updatedAt: today.toISOString() }});

      // Riwayat — Tabel 12 kembalikan (Bab 4)
      dispatch({ type: 'ADD_RIWAYAT', payload: {
        id: generateId('r'), suratMasukId: disp?.suratMasukId, status: 'Perlu Perbaikan',
        pelakuId: user.id, waktu: today.toISOString(),
        catatan: `${user.nama} mengembalikan laporan kepada ${staf?.nama || 'staf'}. Catatan perbaikan: ${catatan}`
      }});

      dispatch({ type: 'ADD_NOTIFIKASI', payload: {
        id: generateId('n'), userId: penugasan.stafId, judul: 'Laporan Perlu Perbaikan',
        pesan: `${user.nama} mengembalikan laporan Anda: "${catatan}". Silakan lakukan perbaikan.`,
        tautanUrl: `/disposisi/${tl.disposisiId}`, dibaca: false, createdAt: today.toISOString()
      }});
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 9. AJUKAN SURAT KELUAR (Tabel 14 & 29) — Petugas Surat / Staf
  // ─────────────────────────────────────────────────────────────
  const apiAjukanSuratKeluar = (data: Partial<SuratKeluar>, asDraft: boolean = false) => {
    const user = validateRole(['petugas_surat', 'kepala_bidang']);
    
    if (asDraft) {
      if (!data.perihal || !data.perihal.trim()) {
        throw new Error("Perihal surat wajib diisi untuk menyimpan draf.");
      }
    } else {
      const missing: string[] = [];
      if (!data.perihal || !data.perihal.trim()) missing.push("Perihal");
      if (!data.tujuan || !data.tujuan.trim()) missing.push("Tujuan");
      if (!data.klasifikasiId) missing.push("Kode Klasifikasi Arsip");
      if (!data.jenisSuratId) missing.push("Jenis Surat");

      if (missing.length > 0) {
        throw new Error(`Pengajuan gagal. Kolom wajib belum lengkap: ${missing.join(', ')}.`);
      }

      const jenis = state.jenisSurat.find(j => j.id === data.jenisSuratId);
      if (!jenis || !jenis.aktif) {
        throw new Error("Jenis surat tidak valid atau sudah nonaktif.");
      }
    }

    const today = new Date();
    let skId = data.id;
    let isBaru = false;
    const status = asDraft ? 'draf' : 'menunggu_paraf';

    if (!skId) {
      skId = generateId('sk');
      isBaru = true;
      dispatch({ type: 'ADD_SURAT_KELUAR', payload: {
        id: skId,
        perihal: data.perihal!,
        tujuan: data.tujuan || '',
        klasifikasiId: data.klasifikasiId || '',
        jenisSuratId: data.jenisSuratId,
        isiRingkas: data.isiRingkas || '',
        status,
        penyusunId: user.id,
        nomorSurat: null,
        createdAt: today.toISOString(),
        updatedAt: today.toISOString()
      }});
    } else {
      dispatch({ type: 'UPDATE_SURAT_KELUAR', payload: {
        id: skId,
        perihal: data.perihal!,
        tujuan: data.tujuan || '',
        klasifikasiId: data.klasifikasiId || '',
        jenisSuratId: data.jenisSuratId,
        isiRingkas: data.isiRingkas || '',
        status,
        updatedAt: today.toISOString()
      }});
    }

    // Riwayat — Tabel 14 (Bab 4)
    if (!asDraft) {
      const jenisObj = state.jenisSurat.find(j => j.id === data.jenisSuratId);
      dispatch({ type: 'ADD_RIWAYAT', payload: {
        id: generateId('r'), suratKeluarId: skId, status: 'Menunggu Paraf Koordinasi',
        pelakuId: user.id, waktu: today.toISOString(),
        catatan: isBaru
          ? `${user.nama} mengajukan konsep surat keluar [${jenisObj?.nama || 'Surat'}] perihal "${data.perihal}" untuk paraf koordinasi Sekretaris Dinas.`
          : `${user.nama} mengajukan ulang konsep surat setelah revisi.`
      }});

      const sekr = state.users.find(u => u.role === 'sekretaris');
      if (sekr) {
        dispatch({ type: 'ADD_NOTIFIKASI', payload: {
          id: generateId('n'), userId: sekr.id, judul: 'Surat Keluar Menunggu Paraf',
          pesan: `${user.nama} mengajukan konsep surat keluar perihal "${data.perihal}" untuk diperiksa dan diparaf.`,
          tautanUrl: `/surat-keluar/${skId}`, dibaca: false, createdAt: today.toISOString()
        }});
      }
    } else {
      dispatch({ type: 'ADD_LOG', payload: {
        id: generateId('la'), userId: user.id, aksi: 'Simpan Draf Surat Keluar',
        detail: `Menyimpan konsep draf surat keluar: ${data.perihal}`, waktu: today.toISOString()
      }});
    }

    return skId;
  };

  // ─────────────────────────────────────────────────────────────
  // 10. PARAF KOORDINASI (Tabel 15) — Sekretaris Dinas
  // ─────────────────────────────────────────────────────────────
  const apiParafKoordinasi = (skId: string, setuju: boolean, catatan: string) => {
    const user = validateRole(['sekretaris']);
    const sk = state.suratKeluar.find(s => s.id === skId);
    if (!sk || sk.status !== 'menunggu_paraf') throw new Error("Status tidak valid untuk paraf.");

    const today = new Date();
    if (setuju) {
      dispatch({ type: 'ADD_PERSETUJUAN', payload: { id: generateId('p'), suratKeluarId: skId, jenis: 'paraf_koordinasi', pelakuId: user.id, waktu: today.toISOString() }});
      dispatch({ type: 'UPDATE_SURAT_KELUAR', payload: { id: skId, status: 'menunggu_ttd', updatedAt: today.toISOString() }});

      // Riwayat — Tabel 15 setuju (Bab 4)
      dispatch({ type: 'ADD_RIWAYAT', payload: {
        id: generateId('r'), suratKeluarId: skId, status: 'Menunggu Tanda Tangan',
        pelakuId: user.id, waktu: today.toISOString(),
        catatan: `Sekretaris Dinas (${user.nama}) memberikan paraf koordinasi. Surat diteruskan ke Kepala Dinas untuk ditandatangani.`
      }});

      const kadis = state.users.find(u => u.role === 'kepala_dinas');
      if (kadis) {
        dispatch({ type: 'ADD_NOTIFIKASI', payload: {
          id: generateId('n'), userId: kadis.id, judul: 'Surat Keluar Menunggu Tanda Tangan',
          pesan: `Surat perihal "${sk.perihal}" telah diparaf Sekretaris Dinas. Menunggu tanda tangan Anda.`,
          tautanUrl: `/surat-keluar/${skId}`, dibaca: false, createdAt: today.toISOString()
        }});
      }
    } else {
      if (!catatan) throw new Error("Catatan revisi wajib diisi.");
      dispatch({ type: 'ADD_PERSETUJUAN', payload: { id: generateId('p'), suratKeluarId: skId, jenis: 'dikembalikan', pelakuId: user.id, catatan, waktu: today.toISOString() }});
      dispatch({ type: 'UPDATE_SURAT_KELUAR', payload: { id: skId, status: 'perlu_revisi', updatedAt: today.toISOString() }});

      // Riwayat — Tabel 15 kembalikan (Bab 4)
      dispatch({ type: 'ADD_RIWAYAT', payload: {
        id: generateId('r'), suratKeluarId: skId, status: 'Perlu Revisi',
        pelakuId: user.id, waktu: today.toISOString(),
        catatan: `Sekretaris Dinas (${user.nama}) mengembalikan konsep surat. Catatan revisi: ${catatan}`
      }});

      dispatch({ type: 'ADD_NOTIFIKASI', payload: {
        id: generateId('n'), userId: sk.penyusunId, judul: 'Konsep Surat Dikembalikan — Perlu Revisi',
        pesan: `Surat Anda dikembalikan oleh Sekretaris Dinas: ${catatan}`,
        tautanUrl: `/surat-keluar/${skId}`, dibaca: false, createdAt: today.toISOString()
      }});
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 11. TANDA TANGAN SURAT (Tabel 16) — Kepala Dinas
  // ─────────────────────────────────────────────────────────────
  const apiTandatanganSurat = (skId: string, passwordConfirm: string) => {
    const user = validateRole(['kepala_dinas']);
    const sk = state.suratKeluar.find(s => s.id === skId);
    if (!sk || sk.status !== 'menunggu_ttd') throw new Error("Status tidak valid untuk tanda tangan.");
    // Verifikasi menggunakan fungsi verifyPassword yang membaca dummyPassword dari state.users
    if (!user.email || !verifyPassword(user.email, passwordConfirm)) {
      throw new Error("Autentikasi gagal. Password salah.");
    }

    const today = new Date();
    dispatch({ type: 'ADD_PERSETUJUAN', payload: { id: generateId('p'), suratKeluarId: skId, jenis: 'tanda_tangan', pelakuId: user.id, waktu: today.toISOString() }});
    dispatch({ type: 'UPDATE_SURAT_KELUAR', payload: { id: skId, status: 'ditandatangani', updatedAt: today.toISOString() }});

    // Riwayat — Tabel 16 (Bab 4)
    dispatch({ type: 'ADD_RIWAYAT', payload: {
      id: generateId('r'), suratKeluarId: skId, status: 'Ditandatangani',
      pelakuId: user.id, waktu: today.toISOString(),
      catatan: `Kepala Dinas (${user.nama}) menandatangani surat. Menunggu penomoran oleh Petugas Surat.`
    }});

    dispatch({ type: 'ADD_NOTIFIKASI', payload: {
      id: generateId('n'), userId: sk.penyusunId, judul: 'Surat Telah Ditandatangani',
      pesan: `Surat "${sk.perihal}" telah ditandatangani Kepala Dinas. Silakan terbitkan nomor surat.`,
      tautanUrl: `/surat-keluar/${skId}`, dibaca: false, createdAt: today.toISOString()
    }});
  };

  // ─────────────────────────────────────────────────────────────
  // R-01: TOLAK SURAT KELUAR (Jalur Penolakan oleh Kepala Dinas)
  // ─────────────────────────────────────────────────────────────
  const apiTolakSuratKeluar = (skId: string, catatan: string) => {
    const user = validateRole(['kepala_dinas']);
    const sk = state.suratKeluar.find(s => s.id === skId);
    if (!sk || sk.status !== 'menunggu_ttd') throw new Error("Status tidak valid untuk penolakan tanda tangan.");
    if (!catatan.trim()) throw new Error("Catatan penolakan wajib diisi.");

    const today = new Date();
    // Tambah riwayat persetujuan dikembalikan
    dispatch({ type: 'ADD_PERSETUJUAN', payload: {
      id: generateId('p'), suratKeluarId: skId, jenis: 'dikembalikan',
      pelakuId: user.id, waktu: today.toISOString(), catatan
    }});

    // Kembalikan status ke perlu_revisi (paraf dianggap gugur karena harus direvisi)
    dispatch({ type: 'UPDATE_SURAT_KELUAR', payload: {
      id: skId, status: 'perlu_revisi', updatedAt: today.toISOString()
    }});

    // Riwayat status
    dispatch({ type: 'ADD_RIWAYAT', payload: {
      id: generateId('r'), suratKeluarId: skId, status: 'Perlu Revisi',
      pelakuId: user.id, waktu: today.toISOString(),
      catatan: `Kepala Dinas (${user.nama}) menolak penandatanganan dan mengembalikan konsep surat. Catatan Kadis: ${catatan}`
    }});

    // Notifikasi ke penyusun (petugas atau staf/kabid)
    dispatch({ type: 'ADD_NOTIFIKASI', payload: {
      id: generateId('n'), userId: sk.penyusunId, judul: 'Konsep Surat Ditolak Kepala Dinas',
      pesan: `Kepala Dinas menolak konsep surat Anda dengan catatan: ${catatan}`,
      tautanUrl: `/surat-keluar/${skId}`, dibaca: false, createdAt: today.toISOString()
    }});
  };

  // ─────────────────────────────────────────────────────────────
  // 12. TERBITKAN NOMOR SURAT (Tabel 17) — Petugas Surat
  // ─────────────────────────────────────────────────────────────
  const apiTerbitkanNomorSurat = (skId: string) => {
    const user = validateRole(['petugas_surat']);
    const sk = state.suratKeluar.find(s => s.id === skId);
    if (!sk) throw new Error("Surat keluar tidak ditemukan.");
    if (sk.status !== 'ditandatangani') throw new Error("Surat belum ditandatangani oleh Kepala Dinas.");
    if (sk.nomorSurat) throw new Error("Surat sudah memiliki nomor.");

    const klas = state.klasifikasi.find(k => k.id === sk.klasifikasiId);
    if (!klas) throw new Error("Klasifikasi tidak valid.");

    const today = new Date();
    const tahun = today.getFullYear();
    const bulanRomawi = toRomawi(today.getMonth() + 1);

    let currentCounter = state.nomorSuratCounter?.find(c => c.tahun === tahun && c.klasifikasiKode === klas.kode);
    let nextValue = currentCounter ? currentCounter.counter + 1 : 1;
    
    dispatch({ type: 'UPDATE_COUNTER' as any, payload: { tahun, klasifikasiKode: klas.kode, counter: nextValue }});

    const nomorSurat = `${klas.kode}/${String(nextValue).padStart(3, '0')}/DISTAN-MS/${bulanRomawi}/${tahun}`;
    
    // Status menjadi 'nomor_diterbitkan' (bukan langsung terkirim & arsip, agar petugas dapat melengkapi tanggal & berkas final)
    dispatch({ type: 'UPDATE_SURAT_KELUAR', payload: { 
      id: skId, nomorSurat, status: 'nomor_diterbitkan', updatedAt: today.toISOString() 
    }});
    
    // Riwayat — Tabel 17 (Bab 4)
    const jenisSuratObj = state.jenisSurat.find(j => j.id === sk.jenisSuratId);
    dispatch({ type: 'ADD_RIWAYAT', payload: {
      id: generateId('r'), suratKeluarId: skId, status: 'Nomor Diterbitkan',
      pelakuId: user.id, waktu: today.toISOString(),
      catatan: `Nomor surat resmi diterbitkan: ${nomorSurat}${jenisSuratObj ? ` (Jenis: ${jenisSuratObj.nama})` : ''} oleh ${user.nama}. Silakan lengkapi berkas dan tanggal pengiriman.`
    }});

    return nomorSurat;
  };

  // 12b. DOKUMENTASIKAN DAN KIRIM SURAT KELUAR (Bab 4 Poin 8) — Petugas Surat
  const apiDokumentasikanDanKirimSuratKeluar = (skId: string, tanggalKirim: string, file: File | null) => {
    const user = validateRole(['petugas_surat']);
    const sk = state.suratKeluar.find(s => s.id === skId);
    if (!sk) throw new Error("Surat tidak ditemukan.");
    if (sk.status !== 'nomor_diterbitkan') {
      throw new Error("Nomor surat harus diterbitkan terlebih dahulu sebelum pengiriman.");
    }
    if (!tanggalKirim) throw new Error("Tanggal pengiriman wajib diisi.");

    const today = new Date();
    const tahun = today.getFullYear();
    const berkasUrl = file ? `/docs/${file.name}` : (sk.berkasUrl || '/docs/final.pdf');

    dispatch({ type: 'UPDATE_SURAT_KELUAR', payload: {
      id: skId,
      status: 'terkirim',
      tanggalKirim,
      berkasUrl,
      updatedAt: today.toISOString()
    }});

    dispatch({ type: 'ADD_RIWAYAT', payload: {
      id: generateId('r'), suratKeluarId: skId, status: 'Terkirim',
      pelakuId: user.id, waktu: today.toISOString(),
      catatan: `Surat resmi nomor ${sk.nomorSurat} dikirimkan kepada ${sk.tujuan} pada ${new Date(tanggalKirim).toLocaleDateString('id-ID')} dan diarsipkan oleh ${user.nama}.`
    }});

    autoArchive('keluar', skId, `ARS-K-${tahun}/${skId}`, berkasUrl, sk.perihal, sk.nomorSurat || '-', sk.klasifikasiId, tahun, sk.jenisSuratId);

    if (sk.penyusunId !== user.id) {
      dispatch({ type: 'ADD_NOTIFIKASI', payload: {
        id: generateId('n'), userId: sk.penyusunId, judul: 'Surat Keluar Terkirim & Diarsipkan',
        pesan: `Surat keluar perihal "${sk.perihal}" telah resmi dikirim dan diarsipkan.`,
        tautanUrl: `/surat-keluar/${skId}`, dibaca: false, createdAt: today.toISOString()
      }});
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 13. TAMBAH PENGGUNA (Tabel 4) — Admin
  // ─────────────────────────────────────────────────────────────
  const apiTambahPengguna = (nama: string, email: string, role: UserRole, unitKerjaId?: string | null, dummyPassword?: string) => {
    const user = validateRole(['admin']);
    if (!nama || !email || !role) throw new Error("Nama, email, dan peran wajib diisi.");
    
    const existing = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) throw new Error("Email sudah terdaftar.");

    let effectiveUnitId: string | null = null;
    if (role === 'kepala_dinas' || role === 'admin') {
      // kepala_dinas dan admin: paksa unit = null, abaikan nilai apa pun dari input
      effectiveUnitId = null;
    } else if (role === 'sekretaris' || role === 'petugas_surat') {
      // sekretaris dan petugas_surat: paksa unit = Sekretariat
      const sekretariatUnit = state.unitKerja.find(u => u.jenis === 'sekretariat');
      if (!sekretariatUnit) throw new Error("Unit kerja Sekretariat tidak ditemukan.");
      effectiveUnitId = sekretariatUnit.id;
    } else if (role === 'kepala_bidang' || role === 'staf_pelaksana') {
      // kepala_bidang dan staf_pelaksana wajib punya unit berjenis bidang yang aktif
      if (!unitKerjaId) {
        throw new Error(`Kombinasi tidak valid: Peran ${USER_ROLE_LABELS[role]} wajib memiliki Unit Kerja / Bidang.`);
      }
      const targetUnit = state.unitKerja.find(u => u.id === unitKerjaId);
      if (!targetUnit || targetUnit.jenis !== 'bidang' || !targetUnit.aktif) {
        throw new Error("Unit kerja yang dipilih harus berupa bidang yang aktif.");
      }
      // kepala_bidang: tolak jika bidang itu sudah punya Kabid aktif
      if (role === 'kepala_bidang') {
        const activeKabid = state.users.find(u => u.role === 'kepala_bidang' && u.aktif && u.unitKerjaId === unitKerjaId);
        if (activeKabid) throw new Error("Bidang sudah memiliki Kepala Bidang aktif.");
      }
      effectiveUnitId = targetUnit.id;
    }

    const today = new Date();
    const id = generateId('u');
    dispatch({ type: 'ADD_USER', payload: {
      id, nama, email, role, unitKerjaId: effectiveUnitId, aktif: true, createdAt: today.toISOString(), dummyPassword
    }});
    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: user.id, aksi: 'Buat Akun',
      detail: `Membuat akun baru untuk ${nama} (${role})`, waktu: today.toISOString()
    }});
  };

  // ─────────────────────────────────────────────────────────────
  // 14. RESET PASSWORD — Admin
  // ─────────────────────────────────────────────────────────────
  const apiResetPassword = (targetUserId: string, newPassword?: string) => {
    const adminUser = validateRole(['admin']);
    const targetUser = state.users.find(u => u.id === targetUserId);
    if (!targetUser) throw new Error("Pengguna tidak ditemukan.");
    
    const password = newPassword || 'Password123!';
    dispatch({ type: 'UPDATE_USER', payload: { id: targetUserId, dummyPassword: password } });
    
    const today = new Date();
    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: adminUser.id, aksi: 'Reset Password',
      detail: `Administrator mereset password akun ${targetUser.nama} (${targetUser.email})`, waktu: today.toISOString()
    }});
    return password;
  };

  // ─────────────────────────────────────────────────────────────
  // 14b. UBAH PENGGUNA — Admin (Bab 4 Poin 10)
  // ─────────────────────────────────────────────────────────────
  const apiUbahPengguna = (userId: string, data: { nama: string; email: string; role: UserRole; unitKerjaId?: string | null }) => {
    const admin = validateRole(['admin']);
    const targetUser = state.users.find(u => u.id === userId);
    if (!targetUser) throw new Error("Pengguna tidak ditemukan.");
    if (!data.nama || !data.email || !data.role) throw new Error("Nama, email, dan peran wajib diisi.");

    const existing = state.users.find(u => u.email.toLowerCase() === data.email.toLowerCase() && u.id !== userId);
    if (existing) throw new Error("Email sudah digunakan pengguna lain.");

    let effectiveUnitId: string | null = null;
    if (data.role === 'kepala_dinas' || data.role === 'admin') {
      // kepala_dinas dan admin: paksa unit = null, abaikan nilai apa pun dari input
      effectiveUnitId = null;
    } else if (data.role === 'sekretaris' || data.role === 'petugas_surat') {
      // sekretaris dan petugas_surat: paksa unit = Sekretariat
      const sekretariatUnit = state.unitKerja.find(u => u.jenis === 'sekretariat');
      if (!sekretariatUnit) throw new Error("Unit kerja Sekretariat tidak ditemukan.");
      effectiveUnitId = sekretariatUnit.id;
    } else if (data.role === 'kepala_bidang' || data.role === 'staf_pelaksana') {
      // kepala_bidang dan staf_pelaksana wajib punya unit berjenis bidang yang aktif
      if (!data.unitKerjaId) {
        throw new Error(`Kombinasi tidak valid: Peran ${USER_ROLE_LABELS[data.role]} wajib memiliki Unit Kerja / Bidang.`);
      }
      const targetUnit = state.unitKerja.find(u => u.id === data.unitKerjaId);
      if (!targetUnit || targetUnit.jenis !== 'bidang' || !targetUnit.aktif) {
        throw new Error("Unit kerja yang dipilih harus berupa bidang yang aktif.");
      }
      // kepala_bidang: tolak jika bidang itu sudah punya Kabid aktif
      if (data.role === 'kepala_bidang') {
        const activeKabid = state.users.find(u => u.role === 'kepala_bidang' && u.aktif && u.unitKerjaId === data.unitKerjaId && u.id !== userId);
        if (activeKabid) throw new Error("Bidang sudah memiliki Kepala Bidang aktif.");
      }
      effectiveUnitId = targetUnit.id;
    }

    const today = new Date();
    dispatch({ type: 'UPDATE_USER', payload: {
      id: userId,
      nama: data.nama,
      email: data.email,
      role: data.role,
      unitKerjaId: effectiveUnitId,
    }});

    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: admin.id, aksi: 'Ubah Data Pengguna',
      detail: `Mengubah data akun ${data.nama} (Peran: ${data.role})`, waktu: today.toISOString()
    }});
  };

  // 14c. TOGGLE STATUS PENGGUNA (AKTIF/NONAKTIF) — Admin
  const apiTogglePengguna = (userId: string) => {
    const admin = validateRole(['admin']);
    const targetUser = state.users.find(u => u.id === userId);
    if (!targetUser) throw new Error("Pengguna tidak ditemukan.");
    if (targetUser.id === admin.id) throw new Error("Tidak dapat menonaktifkan akun sendiri.");

    const newStatus = !targetUser.aktif;

    if (newStatus && targetUser.role === 'kepala_bidang') {
      const activeKabid = state.users.find(u => u.role === 'kepala_bidang' && u.aktif && u.unitKerjaId === targetUser.unitKerjaId && u.id !== userId);
      if (activeKabid) throw new Error("Bidang sudah memiliki Kepala Bidang aktif.");
    }

    const today = new Date();
    dispatch({ type: 'UPDATE_USER', payload: { id: userId, aktif: newStatus }});
    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: admin.id, aksi: newStatus ? 'Aktifkan Akun' : 'Nonaktifkan Akun',
      detail: `${newStatus ? 'Mengaktifkan' : 'Menonaktifkan'} akun ${targetUser.nama}`, waktu: today.toISOString()
    }});
  };

  // ─────────────────────────────────────────────────────────────
  // MASTER DATA: UNIT KERJA (Bab 4 Poin 11) — Admin
  // ─────────────────────────────────────────────────────────────
  const apiTambahUnitKerja = (kode: string, nama: string, labelLembar?: string, urutanLembar?: number, jenis: 'sekretariat' | 'bidang' = 'bidang') => {
    const admin = validateRole(['admin']);
    if (!kode || !nama) throw new Error("Kode dan nama unit kerja wajib diisi.");

    const existing = state.unitKerja.find(u => u.kode.toLowerCase() === kode.toLowerCase());
    if (existing) throw new Error("Kode unit kerja sudah ada.");

    const id = generateId('uk');
    const today = new Date();
    dispatch({ type: 'ADD_UNIT_KERJA', payload: {
      id, kode: kode.toUpperCase(), nama,
      jenis,
      labelLembar: labelLembar || nama,
      urutanLembar: urutanLembar || state.unitKerja.length + 1,
      aktif: true,
    }});
    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: admin.id, aksi: 'Tambah Unit Kerja',
      detail: `Menambah unit kerja ${nama} (${kode})`, waktu: today.toISOString()
    }});
  };

  const apiUbahUnitKerja = (id: string, data: { nama: string; labelLembar?: string; urutanLembar?: number }) => {
    const admin = validateRole(['admin']);
    const uk = state.unitKerja.find(u => u.id === id);
    if (!uk) throw new Error("Unit kerja tidak ditemukan.");
    if (!data.nama) throw new Error("Nama unit kerja wajib diisi.");

    // Validasi nama unik (case-insensitive, kecuali dirinya sendiri)
    const namaDup = state.unitKerja.find(u => u.id !== id && u.nama.trim().toLowerCase() === data.nama.trim().toLowerCase());
    if (namaDup) throw new Error(`Nama unit kerja "${data.nama}" sudah terdaftar.`);

    const today = new Date();
    dispatch({ type: 'UPDATE_UNIT_KERJA', payload: {
      id,
      nama: data.nama,
      labelLembar: data.labelLembar ?? uk.labelLembar,
      urutanLembar: data.urutanLembar ?? uk.urutanLembar,
    }});
    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: admin.id, aksi: 'Ubah Unit Kerja',
      detail: `Mengubah unit kerja ${data.nama}`, waktu: today.toISOString()
    }});
  };


  const apiToggleUnitKerja = (id: string) => {
    const admin = validateRole(['admin']);
    const uk = state.unitKerja.find(u => u.id === id);
    if (!uk) throw new Error('Unit kerja tidak ditemukan.');
    // Sekretariat tidak boleh dinonaktifkan
    if (uk.jenis === 'sekretariat') throw new Error('Unit berjenis sekretariat tidak dapat dinonaktifkan.');

    const newStatus = !uk.aktif;
    const today = new Date();
    dispatch({ type: 'UPDATE_UNIT_KERJA', payload: { id, aktif: newStatus }});
    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: admin.id, aksi: newStatus ? 'Aktifkan Unit Kerja' : 'Nonaktifkan Unit Kerja',
      detail: `${newStatus ? 'Mengaktifkan' : 'Menonaktifkan'} unit kerja ${uk.nama}`, waktu: today.toISOString()
    }});
  };

  const apiHapusUnitKerja = (id: string) => {
    const admin = validateRole(['admin']);
    const uk = state.unitKerja.find(u => u.id === id);
    if (!uk) throw new Error('Unit kerja tidak ditemukan.');
    // Sekretariat tidak boleh dihapus
    if (uk.jenis === 'sekretariat') throw new Error('Unit berjenis sekretariat tidak dapat dihapus.');

    // Guard: cek referensi di pengguna
    const penggunaRef = state.users.filter(u => u.unitKerjaId === id);
    // Guard: cek referensi di disposisi
    const disposisiRef = state.disposisi.filter(d =>
      d.bidangTujuan && d.bidangTujuan.some(b => b.unitKerjaId === id)
    );
    // Guard: cek referensi di penugasan
    const penugasanRef = state.penugasan ? state.penugasan.filter((p: any) => p.unitKerjaId === id) : [];

    const totalRefs = penggunaRef.length + disposisiRef.length + penugasanRef.length;
    if (totalRefs > 0) {
      const parts: string[] = [];
      if (penggunaRef.length > 0) parts.push(`${penggunaRef.length} pengguna`);
      if (disposisiRef.length > 0) parts.push(`${disposisiRef.length} disposisi`);
      if (penugasanRef.length > 0) parts.push(`${penugasanRef.length} penugasan`);
      throw new Error(
        `Unit kerja masih digunakan oleh ${parts.join(', ')}. Nonaktifkan unit kerja sebagai gantinya.`
      );
    }

    const today = new Date();
    dispatch({ type: 'DELETE_UNIT_KERJA', payload: id });
    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: admin.id, aksi: 'Hapus Unit Kerja',
      detail: `Menghapus unit kerja ${uk.nama} (${uk.kode})`, waktu: today.toISOString()
    }});
  };

  // ─────────────────────────────────────────────────────────────
  // MASTER DATA: KLASIFIKASI SURAT (Bab 4 Poin 11) — Admin
  // ─────────────────────────────────────────────────────────────
  const apiTambahKlasifikasi = (kode: string, nama: string, uraian?: string) => {
    const admin = validateRole(['admin']);
    if (!kode || !nama) throw new Error("Kode dan nama klasifikasi wajib diisi.");

    const existing = state.klasifikasi.find(k => k.kode.toLowerCase() === kode.toLowerCase());
    if (existing) throw new Error("Kode klasifikasi sudah terdaftar.");

    const id = generateId('klas');
    const today = new Date();
    dispatch({ type: 'ADD_KLASIFIKASI', payload: {
      id, kode, nama, uraian: uraian || '', aktif: true,
    }});
    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: admin.id, aksi: 'Tambah Klasifikasi',
      detail: `Menambah klasifikasi surat ${kode} - ${nama}`, waktu: today.toISOString()
    }});
  };

  const apiUbahKlasifikasi = (id: string, data: { nama: string; uraian?: string }) => {
    const admin = validateRole(['admin']);
    const klas = state.klasifikasi.find(k => k.id === id);
    if (!klas) throw new Error("Klasifikasi tidak ditemukan.");
    if (!data.nama) throw new Error("Nama klasifikasi wajib diisi.");

    const today = new Date();
    dispatch({ type: 'UPDATE_KLASIFIKASI', payload: {
      id,
      nama: data.nama,
      uraian: data.uraian ?? klas.uraian,
    }});
    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: admin.id, aksi: 'Ubah Klasifikasi',
      detail: `Mengubah klasifikasi surat ${klas.kode} - ${data.nama}`, waktu: today.toISOString()
    }});
  };

  const apiToggleKlasifikasi = (id: string) => {
    const admin = validateRole(['admin']);
    const klas = state.klasifikasi.find(k => k.id === id);
    if (!klas) throw new Error("Klasifikasi tidak ditemukan.");

    const newStatus = !klas.aktif;
    const today = new Date();
    dispatch({ type: 'UPDATE_KLASIFIKASI', payload: { id, aktif: newStatus }});
    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: admin.id, aksi: newStatus ? 'Aktifkan Klasifikasi' : 'Nonaktifkan Klasifikasi',
      detail: `${newStatus ? 'Mengaktifkan' : 'Menonaktifkan'} klasifikasi ${klas.kode}`, waktu: today.toISOString()
    }});
  };

  // ─────────────────────────────────────────────────────────────
  // 15. CATATAN KOORDINASI SEKDIS (Tabel 22 & Bab 4 Poin 4)
  // ─────────────────────────────────────────────────────────────
  const apiBeriCatatanSekdis = (dispId: string, catatan: string) => {
    validateRole(['sekretaris']);
    const disp = state.disposisi.find(d => d.id === dispId);
    if (!disp) throw new Error("Disposisi tidak ditemukan.");

    const isLintasBidang = disp.bidangTujuan.length > 1 ||
      Boolean(disp.lintasBidang) ||
      disp.instruksi === 'koordinasi_konfirmasi' ||
      (disp.instruksiList && disp.instruksiList.some(i => i.jenis === 'koordinasi_konfirmasi'));

    if (!isLintasBidang) {
      throw new Error("Catatan koordinasi hanya berlaku untuk disposisi multi-bidang atau instruksi koordinasi/konfirmasi.");
    }
    if (!catatan.trim()) throw new Error("Catatan koordinasi tidak boleh kosong.");

    const today = new Date();
    dispatch({ type: 'UPDATE_DISPOSISI', payload: {
      id: dispId,
      catatanKoordinasi: catatan,
      catatanKoordinasiSekdin: catatan,
      updatedAt: today.toISOString()
    }});
    dispatch({ type: 'ADD_RIWAYAT', payload: {
      id: generateId('r'), suratMasukId: disp.suratMasukId, status: 'Catatan Koordinasi Sekretaris',
      catatan: `Sekretaris Dinas (${state.currentUser!.nama}) menambahkan catatan koordinasi: ${catatan}`,
      pelakuId: state.currentUser!.id, waktu: today.toISOString()
    }});

    // Notifikasi ke seluruh kepala bidang tujuan
    disp.bidangTujuan.forEach(bt => {
      const kabid = state.users.find(u => u.role === 'kepala_bidang' && u.unitKerjaId === bt.unitKerjaId);
      if (kabid) {
        dispatch({ type: 'ADD_NOTIFIKASI', payload: {
          id: generateId('n'), userId: kabid.id, judul: 'Catatan Koordinasi Sekretaris Dinas',
          pesan: `Sekretaris Dinas memberikan catatan koordinasi untuk disposisi: "${catatan.slice(0, 70)}"`,
          tautanUrl: `/disposisi/${dispId}`, dibaca: false, createdAt: today.toISOString()
        }});
      }
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 2b. BUBUHKAN PARAF ELEKTRONIK (Z9) — Kepala Dinas
  // Dipanggil sebelum apiBeriDisposisi. Mencatat user, waktu, IP.
  // ─────────────────────────────────────────────────────────────
  const apiBubuhkanParaf = (dispId: string) => {
    const user = validateRole(['kepala_dinas']);
    const disp = state.disposisi.find(d => d.id === dispId);
    if (!disp) throw new Error('Disposisi tidak ditemukan.');
    if (disp.status !== 'menunggu_disposisi') throw new Error('Kartu tidak lagi dalam status menunggu disposisi.');

    const today = new Date();
    dispatch({ type: 'UPDATE_DISPOSISI', payload: {
      id: dispId,
      parafKdOleh: user.nama,
      parafKdAt: today.toISOString(),
      parafKdIp: '127.0.0.1',
      parafKepalaWaktu: today.toISOString(),
      parafKadinOleh: user.nama,
      parafKadinWaktu: today.toISOString(),
      ttdNamaSnapshot: user.nama,
      ttdNipSnapshot: (user as any).nip || '',
      ttdJabatanSnapshot: 'Kepala Dinas',
      updatedAt: today.toISOString(),
    }});

    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: user.id,
      aksi: 'Bubuhkan Paraf Elektronik',
      detail: `${user.nama} membubuhkan paraf elektronik pada disposisi ${dispId}`,
      waktu: today.toISOString(),
    }});
  };

  // ─────────────────────────────────────────────────────────────
  // 2c. TIDAK PERLU DISPOSISI KE BIDANG (Gambar 8) — Kepala Dinas
  // ─────────────────────────────────────────────────────────────
  const apiTidakPerluDisposisi = (dispId: string, catatan: string) => {
    const user = validateRole(['kepala_dinas']);
    const disp = state.disposisi.find(d => d.id === dispId);
    if (!disp) throw new Error('Disposisi tidak ditemukan.');
    if (disp.status !== 'menunggu_disposisi') throw new Error('Status tidak mengizinkan aksi ini.');
    if (!catatan.trim()) throw new Error('Catatan alasan wajib diisi.');

    const today = new Date();
    dispatch({ type: 'UPDATE_DISPOSISI', payload: {
      id: dispId,
      keputusanKd: 'tidak_perlu',
      catatanKepala: catatan,
      catatanKadin: catatan,
      status: 'selesai',
      updatedAt: today.toISOString(),
    }});
    dispatch({ type: 'UPDATE_SURAT_MASUK', payload: { id: disp.suratMasukId, status: 'selesai', updatedAt: today.toISOString() }});
    dispatch({ type: 'ADD_RIWAYAT', payload: {
      id: generateId('r'), suratMasukId: disp.suratMasukId,
      status: 'Selesai (Tanpa Disposisi Bidang)',
      pelakuId: user.id, waktu: today.toISOString(),
      catatan: `Kepala Dinas memutuskan tidak perlu disposisi ke bidang. Catatan: ${catatan}`,
    }});
    state.users.filter(u => u.role === 'petugas_surat').forEach(p => {
      dispatch({ type: 'ADD_NOTIFIKASI', payload: {
        id: generateId('n'), userId: p.id,
        judul: 'Surat Tidak Perlu Disposisi ke Bidang',
        pesan: 'Kepala Dinas memutuskan surat tidak perlu disposisi ke bidang. Tandai selesai di sekretariat.',
        tautanUrl: `/disposisi/${dispId}`, dibaca: false, createdAt: today.toISOString(),
      }});
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 20. BUKTI TERIMA TUJUAN (L26) — Petugas Surat
  // Satu-satunya isian yang boleh dilengkapi setelah arsip (AT-13)
  // ─────────────────────────────────────────────────────────────
  const apiBuktiTerima = (skId: string, tanggalDiterima: string, namaPenerima: string) => {
    const user = validateRole(['petugas_surat', 'admin']);
    const sk = state.suratKeluar.find(s => s.id === skId);
    if (!sk) throw new Error('Surat tidak ditemukan.');
    if (sk.status !== 'terkirim') throw new Error('Bukti terima hanya dapat diisi setelah surat berstatus Terkirim.');
    if (!tanggalDiterima) throw new Error('Tanggal diterima wajib diisi.');
    if (!namaPenerima.trim()) throw new Error('Nama penerima di tujuan wajib diisi.');

    const today = new Date();
    dispatch({ type: 'UPDATE_SURAT_KELUAR', payload: {
      id: skId,
      buktiTerimaTanggal: tanggalDiterima,
      buktiTerimaNama: namaPenerima.trim(),
      updatedAt: today.toISOString(),
    }});

    dispatch({ type: 'ADD_RIWAYAT', payload: {
      id: generateId('r'), suratKeluarId: skId, status: 'Bukti Terima Dicatat',
      pelakuId: user.id, waktu: today.toISOString(),
      catatan: `Bukti terima dicatat: diterima oleh "${namaPenerima.trim()}" pada ${new Date(tanggalDiterima).toLocaleDateString('id-ID')}.`,
    }});

    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: user.id, aksi: 'Catat Bukti Terima',
      detail: `Mencatat bukti terima surat ${sk.nomorSurat || skId} kepada "${namaPenerima.trim()}"`,
      waktu: today.toISOString(),
    }});
  };

  // ─────────────────────────────────────────────────────────────
  // 21. KOREKSI METADATA ARSIP (L27) — Hanya Petugas
  // Berkas tidak dapat diganti. Riwayat koreksi dicatat.
  // ─────────────────────────────────────────────────────────────
  const apiKoreksiMetadataArsip = (
    arsipId: string,
    perihalBaru: string | null,
    klasifikasiIdBaru: string | null,
    alasan: string
  ) => {
    const user = validateRole(['petugas_surat']);
    if (!alasan.trim()) throw new Error('Alasan koreksi wajib diisi.');

    const arsip = (state as any).arsip?.find((a: any) => a.id === arsipId);
    if (!arsip) throw new Error('Arsip tidak ditemukan.');
    if (!perihalBaru && !klasifikasiIdBaru) throw new Error('Pilih minimal satu field yang akan dikoreksi.');

    const today = new Date();
    const patch: Record<string, any> = { id: arsipId, updatedAt: today.toISOString() };
    const perubahan: string[] = [];

    if (perihalBaru && perihalBaru.trim() !== arsip.perihal) {
      patch.perihal = perihalBaru.trim();
      perubahan.push(`Perihal: "${arsip.perihal}" → "${perihalBaru.trim()}"`);
    }
    if (klasifikasiIdBaru && klasifikasiIdBaru !== arsip.klasifikasiId) {
      const klas = state.klasifikasi.find(k => k.id === klasifikasiIdBaru);
      if (!klas) throw new Error('Kode klasifikasi tidak valid.');
      patch.klasifikasiId = klasifikasiIdBaru;
      patch.kodeArsip = klas.kode;
      perubahan.push(`Klasifikasi: "${arsip.kodeArsip}" → "${klas.kode} — ${klas.nama}"`);
    }

    if (perubahan.length === 0) throw new Error('Tidak ada perubahan yang terdeteksi.');

    dispatch({ type: 'UPDATE_ARSIP' as any, payload: patch as any });


    dispatch({ type: 'ADD_LOG', payload: {
      id: generateId('la'), userId: user.id, aksi: 'Koreksi Metadata Arsip',
      detail: `Arsip ${arsipId} dikoreksi. ${perubahan.join('; ')}. Alasan: ${alasan.trim()}`,
      waktu: today.toISOString(),
    }});
  };

  // ─────────────────────────────────────────────────────────────
  // 30. TRIGGER PENGINGAT & ESKALASI (Contoh AT-15)
  // ─────────────────────────────────────────────────────────────
  const apiTriggerPengingatBatasWaktu = () => {
    const today = new Date().toISOString();
    // Contoh Notifikasi Eskalasi ke Kepala Dinas
    const kadis = state.users.find(u => u.role === 'kepala_dinas');
    if (kadis) {
      dispatch({ type: 'ADD_NOTIFIKASI', payload: {
        id: generateId('n'), userId: kadis.id, judul: 'Eskalasi: Disposisi Melewati Batas Waktu',
        pesan: `Terdapat disposisi surat yang belum selesai dan melewati batas waktu 2 hari.`,
        dibaca: false, tingkat: 'bahaya', createdAt: today
      }});
    }
    // Contoh Peringatan ke Kepala Bidang
    state.users.filter(u => u.role === 'kepala_bidang').forEach(kabid => {
      dispatch({ type: 'ADD_NOTIFIKASI', payload: {
        id: generateId('n'), userId: kabid.id, judul: 'Peringatan: Tenggat Waktu Disposisi',
        pesan: `Disposisi di bidang Anda mendekati/melewati batas waktu penyelesaian.`,
        dibaca: false, tingkat: 'peringatan', createdAt: today
      }});
    });
    // Contoh Pengingat ke Staf
    state.users.filter(u => u.role === 'staf_pelaksana').forEach(staf => {
      dispatch({ type: 'ADD_NOTIFIKASI', payload: {
        id: generateId('n'), userId: staf.id, judul: 'Pengingat: Batas Waktu Penugasan',
        pesan: `Anda memiliki penugasan yang harus segera diselesaikan hari ini.`,
        dibaca: false, tingkat: 'info', createdAt: today
      }});
    });
  };

  return {
    apiCatatSuratMasuk, apiBuatDisposisi, apiBeriDisposisi, apiTerimaDisposisi,
    apiTeruskanKeStaf, apiTindakLanjutLangsung, apiSimpanProgres, apiLaporkanHasil, apiPeriksaLaporan,
    apiAjukanSuratKeluar, apiParafKoordinasi, apiTandatanganSurat, apiTolakSuratKeluar, apiTerbitkanNomorSurat,
    apiDokumentasikanDanKirimSuratKeluar,
    apiBuktiTerima, apiKoreksiMetadataArsip,
    apiTambahPengguna, apiUbahPengguna, apiTogglePengguna, apiResetPassword,
    apiTambahUnitKerja, apiUbahUnitKerja, apiToggleUnitKerja, apiHapusUnitKerja,
    apiTambahKlasifikasi, apiUbahKlasifikasi, apiToggleKlasifikasi,
    apiBeriCatatanSekdis, apiBubuhkanParaf, apiTidakPerluDisposisi,
    apiTriggerPengingatBatasWaktu,
  };
}
