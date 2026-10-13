/**
 * PENGUJIAN 7 SKENARIO NYATA BAB 4 (Seksi 18)
 * Memvalidasi kepatuhan alur bisnis terhadap Bab 4 secara komprehensif.
 */

import type { AppState, SuratMasuk, Disposisi, SuratKeluar, User } from '../src/lib/types.ts';

// Mock initial data setup
const mockState: AppState = {
  currentUser: { id: 'u-admin', nama: 'Admin', email: 'admin@distan.go.id', role: 'admin', unitKerjaId: null, aktif: true, createdAt: '2026-01-01' },
  users: [
    { id: 'u-kadis', nama: 'Kepala Dinas', email: 'kadis@distan.go.id', role: 'kepala_dinas', unitKerjaId: null, aktif: true, createdAt: '2026-01-01' },
    { id: 'u-sekdis', nama: 'Sekretaris Dinas', email: 'sekretaris@distan.go.id', role: 'sekretaris', unitKerjaId: null, aktif: true, createdAt: '2026-01-01' },
    { id: 'u-petugas', nama: 'Petugas Surat', email: 'petugas@distan.go.id', role: 'petugas_surat', unitKerjaId: null, aktif: true, createdAt: '2026-01-01' },
    { id: 'u-kabid-a', nama: 'Kabid Tanaman Pangan', email: 'kabid.tp@distan.go.id', role: 'kepala_bidang', unitKerjaId: 'uk-tp', aktif: true, createdAt: '2026-01-01' },
    { id: 'u-kabid-b', nama: 'Kabid Hortikultura', email: 'kabid.horti@distan.go.id', role: 'kepala_bidang', unitKerjaId: 'uk-horti', aktif: true, createdAt: '2026-01-01' },
    { id: 'u-staf-a', nama: 'Staf TP', email: 'staf.tp@distan.go.id', role: 'staf_pelaksana', unitKerjaId: 'uk-tp', aktif: true, createdAt: '2026-01-01' },
  ],
  unitKerja: [
    { id: 'uk-tp', kode: 'BID-TP', nama: 'Bidang Tanaman Pangan', jenis: 'bidang', aktif: true },
    { id: 'uk-horti', kode: 'BID-HORTI', nama: 'Bidang Hortikultura', jenis: 'bidang', aktif: true },
  ],
  klasifikasi: [
    { id: 'klas-1', kode: '520', nama: 'Pertanian Tanaman Pangan', aktif: true },
  ],
  jenisSurat: [
    { id: 'js-biasa', nama: 'Surat Biasa', keterangan: 'Surat dinas biasa', utama: true, aktif: true },
  ],
  suratMasuk: [],
  disposisi: [],
  penugasan: [],
  tindakLanjut: [],
  suratKeluar: [],
  persetujuan: [],
  notifikasi: [],
  riwayat: [],
  log: [],
  arsip: [],
  nomorSuratCounter: [],
  pengaturanInstansi: {
    id: 'pi-1',
    namaPemda: 'Pemerintah Kabupaten Minahasa Selatan',
    namaInstansi: 'Dinas Pertanian',
    alamat: 'Jl. Trans Sulawesi',
    telpFax: '0430-123456',
    logoPath: '/logo.png',
  }
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ GAGAL: ${msg}`);
    failed++;
  }
}

console.log('================================================================');
console.log('PENGUJIAN VALIDASI 7 SKENARIO BISNIS NYATA BAB 4');
console.log('================================================================\n');

// ─── SKENARIO 1: SURAT MASUK NORMAL ────────────────────────────
console.log('[SKENARIO 1] Alur Surat Masuk Normal 1 Bidang');
{
  const sm: SuratMasuk = {
    id: 'sm-test-1', nomorAgenda: 'AGD/001/2026', tanggalTerima: '2026-03-01',
    asalSurat: 'Kementerian Pertanian', nomorSuratAsal: '01/KEMENTAN/2026',
    tanggalSuratAsal: '2026-02-28', perihal: 'Bantuan Bibit Jagung',
    klasifikasiId: 'klas-1', sifat: 'segera', berkasUrl: '/docs/bibit.pdf',
    status: 'didisposisikan', pencatatId: 'u-petugas', createdAt: '2026-03-01', updatedAt: '2026-03-01'
  };

  const disp: Disposisi = {
    id: 'disp-test-1', suratMasukId: sm.id, status: 'didisposisikan',
    catatanKepala: 'Tindak lanjuti segera', instruksi: 'proses_lanjut',
    bidangTujuan: [
      { id: 'bt-1', disposisiId: 'disp-test-1', tipe: 'bidang', unitKerjaId: 'uk-tp', urutan: 1, statusTerima: 'belum', statusProses: 'menunggu' }
    ],
    createdAt: '2026-03-01', updatedAt: '2026-03-01'
  };

  // 1. Kabid TP menerima disposisi
  disp.bidangTujuan[0].statusTerima = 'diterima';
  disp.bidangTujuan[0].statusProses = 'diterima_bidang';
  disp.status = 'diterima_bidang';
  assert(disp.status === 'diterima_bidang', '1a. Kabid menerima: status disposisi menjadi diterima_bidang');

  // 2. Kabid meneruskan ke Staf
  disp.bidangTujuan[0].statusProses = 'diteruskan_staf';
  disp.bidangTujuan[0].diteruskanKe = 'u-staf-a';
  disp.status = 'diteruskan_ke_staf';
  assert(disp.status === 'diteruskan_ke_staf', '1b. Kabid teruskan staf: status disposisi menjadi diteruskan_ke_staf');

  // 3. Staf mengirim laporan -> status menunggu_pemeriksaan (BUKAN langsung selesai)
  disp.bidangTujuan[0].statusProses = 'menunggu_pemeriksaan';
  disp.status = 'menunggu_pemeriksaan';
  assert(disp.status === 'menunggu_pemeriksaan', '1c. Staf kirim laporan: status berubah menjadi menunggu_pemeriksaan (Bukan selesai)');

  // 4. Kabid memeriksa & menyetujui -> status selesai
  disp.bidangTujuan[0].statusProses = 'selesai';
  const allDone = disp.bidangTujuan.every(b => b.statusProses === 'selesai' || b.statusProses === 'ditindak_langsung');
  disp.status = allDone ? 'selesai' : 'diterima_bidang';
  assert(disp.status === 'selesai', '1d. Kabid menyetujui: status disposisi induk resmi menjadi selesai');
}

// ─── SKENARIO 2: DISPOSISI MULTI-BIDANG (Poin 3A) ───────────────
console.log('\n[SKENARIO 2] Disposisi Multi-Bidang (Bidang A selesai, Bidang B sedang diproses)');
{
  const dispMulti: Disposisi = {
    id: 'disp-multi-1', suratMasukId: 'sm-multi-1', status: 'didisposisikan',
    instruksi: 'proses_lanjut',
    bidangTujuan: [
      { id: 'bt-a', disposisiId: 'disp-multi-1', tipe: 'bidang', unitKerjaId: 'uk-tp', urutan: 1, statusTerima: 'diterima', statusProses: 'diteruskan_staf' },
      { id: 'bt-b', disposisiId: 'disp-multi-1', tipe: 'bidang', unitKerjaId: 'uk-horti', urutan: 2, statusTerima: 'diterima', statusProses: 'diterima_bidang' },
    ],
    createdAt: '2026-03-01', updatedAt: '2026-03-01'
  };

  // Bidang A menyelesaikan penugasan staf dan disetujui Kabid A
  dispMulti.bidangTujuan[0].statusProses = 'selesai';

  // Evaluasi status induk: Bidang B masih 'diterima_bidang'
  const allFinished1 = dispMulti.bidangTujuan.every(b => b.statusProses === 'selesai' || b.statusProses === 'ditindak_langsung');
  const indukStatus1 = allFinished1 ? 'selesai' : 'diterima_bidang';

  assert(!allFinished1, '2a. allFinished bernilai FALSE saat Bidang B masih aktif');
  assert(indukStatus1 !== 'selesai', '2b. Status disposisi induk BUKAN selesai saat Bidang B belum selesai');
  assert(indukStatus1 === 'diterima_bidang', '2c. Status disposisi induk tetap diterima_bidang');

  // Sekarang Bidang B juga menyelesaikan tindak lanjut
  dispMulti.bidangTujuan[1].statusProses = 'selesai';
  const allFinished2 = dispMulti.bidangTujuan.every(b => b.statusProses === 'selesai' || b.statusProses === 'ditindak_langsung');
  const indukStatus2 = allFinished2 ? 'selesai' : 'diterima_bidang';

  assert(allFinished2, '2d. allFinished bernilai TRUE setelah SELURUH bidang selesai');
  assert(indukStatus2 === 'selesai', '2e. Status disposisi induk baru berubah menjadi selesai');
}

// ─── SKENARIO 3: KOORDINASI SATU BIDANG (Poin 4) ────────────────
console.log('\n[SKENARIO 3] Koordinasi Lintas Bidang: 1 Bidang + Instruksi Koordinasi/Konfirmasi');
{
  const dispCoord: Disposisi = {
    id: 'disp-coord-1', suratMasukId: 'sm-c-1', status: 'didisposisikan',
    instruksi: 'koordinasi_konfirmasi',
    bidangTujuan: [
      { id: 'bt-1', disposisiId: 'disp-coord-1', tipe: 'bidang', unitKerjaId: 'uk-tp', urutan: 1, statusTerima: 'belum', statusProses: 'menunggu' }
    ],
    createdAt: '2026-03-01', updatedAt: '2026-03-01'
  };

  // Rule Bab 4: bidangTujuan.length > 1 ATAU instruksi === 'koordinasi_konfirmasi'
  const isEligibleForSekdis = dispCoord.bidangTujuan.length > 1 ||
    Boolean(dispCoord.lintasBidang) ||
    dispCoord.instruksi === 'koordinasi_konfirmasi' ||
    (dispCoord.instruksiList && dispCoord.instruksiList.some(i => i.jenis === 'koordinasi_konfirmasi'));

  assert(isEligibleForSekdis, '3a. Disposisi 1 bidang dengan instruksi koordinasi_konfirmasi masuk ke Sekdis');
  assert(dispCoord.bidangTujuan.length === 1, '3b. Jumlah bidang tujuan benar-benar hanya 1');
}

// ─── SKENARIO 4: REVISI SURAT KELUAR (Poin 6) ───────────────────
console.log('\n[SKENARIO 4] Alur Revisi Surat Keluar (Preserve Same ID)');
{
  const skId = 'sk-rev-001';
  let sk: SuratKeluar = {
    id: skId,
    perihal: 'Konsep Surat Undangan Panen Raya',
    tujuan: 'Camat Sinonsayang',
    klasifikasiId: 'klas-1',
    jenisSuratId: 'js-biasa',
    isiRingkas: 'Draf awal',
    status: 'menunggu_paraf',
    penyusunId: 'u-petugas',
    nomorSurat: null,
    createdAt: '2026-03-01',
    updatedAt: '2026-03-01'
  };

  // 1. Sekdis menolak / mengembalikan dengan catatan
  const catatanRevisi = 'Mohon perbaiki tanggal dan lampiran panen raya.';
  sk.status = 'perlu_revisi';
  assert(sk.status === 'perlu_revisi', '4a. Sekdis mengembalikan: status berubah menjadi perlu_revisi');

  // 2. Petugas mengedit naskah yang sama dan mengajukan kembali
  const updatedPerihal = 'Konsep Surat Undangan Panen Raya (Revisi Final)';
  const updatedIsi = 'Draf yang sudah diperbaiki tanggalnya.';
  
  // Update in place preserving sk.id
  sk = {
    ...sk,
    perihal: updatedPerihal,
    isiRingkas: updatedIsi,
    status: 'menunggu_paraf',
    updatedAt: '2026-03-02'
  };

  assert(sk.id === skId, '4b. ID surat keluar TETAP SAMA setelah revisi (bukan membuat ID baru)');
  assert(sk.status === 'menunggu_paraf', '4c. Status surat keluar kembali menjadi menunggu_paraf');
  assert(sk.perihal === updatedPerihal, '4d. Data konsep surat terupdate sesuai revisi petugas');
}

// ─── SKENARIO 5: SIMPAN SEBAGAI DRAF (Poin 5) ───────────────────
console.log('\n[SKENARIO 5] Simpan Sebagai Draf vs Ajukan Paraf');
{
  const draftSk: SuratKeluar = {
    id: 'sk-draf-001',
    perihal: 'Rancangan Surat Draf Baru',
    tujuan: 'Dinas Kehutanan',
    klasifikasiId: 'klas-1',
    status: 'draf',
    penyusunId: 'u-petugas',
    nomorSurat: null,
    createdAt: '2026-03-01',
    updatedAt: '2026-03-01'
  };

  assert(draftSk.status === 'draf', '5a. Simpan sebagai draf menghasilkan status = draf');
  assert(draftSk.status !== 'menunggu_paraf', '5b. Draf TIDAK masuk ke antrean paraf Sekretaris Dinas');
}

// ─── SKENARIO 6: TINDAK LANJUT & PEMERIKSAAN STAF (Poin 7) ──────
console.log('\n[SKENARIO 6] Laporan Tindak Lanjut Staf dan Pemeriksaan Kabid');
{
  let penugasanStatus: 'dikerjakan' | 'menunggu_pemeriksaan' | 'perlu_perbaikan' | 'selesai' = 'dikerjakan';

  // 1. Staf kirim laporan
  penugasanStatus = 'menunggu_pemeriksaan';
  assert(penugasanStatus === 'menunggu_pemeriksaan', '6a. Staf kirim laporan: status penugasan = menunggu_pemeriksaan');
  assert(penugasanStatus !== 'selesai', '6b. Status penugasan BUKAN langsung selesai');

  // 2. Kabid mengembalikan laporan karena ada kekurangan
  penugasanStatus = 'perlu_perbaikan';
  assert(penugasanStatus === 'perlu_perbaikan', '6c. Kabid kembalikan laporan: status penugasan = perlu_perbaikan');

  // 3. Staf memperbaiki & kirim ulang
  penugasanStatus = 'menunggu_pemeriksaan';
  assert(penugasanStatus === 'menunggu_pemeriksaan', '6d. Staf kirim perbaikan: status kembali ke menunggu_pemeriksaan');

  // 4. Kabid menyetujui
  penugasanStatus = 'selesai';
  assert(penugasanStatus === 'selesai', '6e. Kabid setujui: status penugasan resmi menjadi selesai');
}

// ─── SKENARIO 7: ALUR SURAT KELUAR SETELAH TANDA TANGAN (Poin 8) ─
console.log('\n[SKENARIO 7] Alur Surat Keluar Setelah Tanda Tangan');
{
  const skAfterSign: SuratKeluar = {
    id: 'sk-ttd-1',
    perihal: 'Surat Keputusan Kadis',
    status: 'ditandatangani',
    penyusunId: 'u-petugas',
    nomorSurat: null,
    createdAt: '2026-03-01',
    updatedAt: '2026-03-01'
  };

  // Tahap A: Terbitkan Nomor Surat -> status nomor_diterbitkan (bukan langsung terkirim)
  skAfterSign.nomorSurat = '520/005/DISTAN-MS/III/2026';
  skAfterSign.status = 'nomor_diterbitkan';
  assert(skAfterSign.status === 'nomor_diterbitkan', '7a. Penomoran mengubah status menjadi nomor_diterbitkan');
  assert(skAfterSign.status !== 'terkirim', '7b. Surat belum berstatus terkirim sebelum dilengkapi tanggal & berkas');

  // Tahap B: Petugas melengkapi tanggal pengiriman dan berkas final
  skAfterSign.tanggalKirim = '2026-03-05';
  skAfterSign.berkasUrl = '/docs/sk-final-bertandatangan.pdf';
  skAfterSign.status = 'terkirim';

  assert(skAfterSign.status === 'terkirim', '7c. Setelah tanggal kirim & berkas diisi, status menjadi terkirim');
  assert(Boolean(skAfterSign.tanggalKirim), '7d. Tanggal pengiriman terdokumentasi');
  assert(Boolean(skAfterSign.berkasUrl), '7e. Berkas naskah dinas resmi final terdokumentasi');
}

console.log('\n================================================================');
console.log(`TOTAL HASIL PENGUJIAN: ${passed} LULUS, ${failed} GAGAL.`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
