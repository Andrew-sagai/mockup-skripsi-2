/**
 * Test Suite: Matriks Akses Zona hitungIzinZona
 * Menguji seluruh sel matriks Bagian 3 dan Skenario Uji Bagian 10
 */

import { hitungIzinZona } from '../src/lib/disposisi/izin.ts';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passCount++;
    console.log(`  ✓ ${msg}`);
  } else {
    failCount++;
    console.error(`  ✗ GAGAL: ${msg}`);
  }
}

console.log('================================================================');
console.log('PENGUJIAN MATRIKS AKSES ZONA (hitungIzinZona)');
console.log('================================================================\n');

// ─── 1. PENGUJIAN ADMIN: SEMUA ZONA HARUS 'sembunyi' (403) ───
console.log('[TEST 1] Admin: Tidak boleh melihat kartu disposisi (Semua zona sembunyi)');
const izinAdmin = hitungIzinZona({
  peran: 'admin',
  unitKerjaId: 'uk-1',
  statusKartu: 'didisposisikan',
  adalahKoordinasi: true,
  bidangIniAdalahTujuan: true,
  punyaPenugasan: false,
});
const allHiddenAdmin = Object.values(izinAdmin).every(v => v === 'sembunyi');
assert(allHiddenAdmin, 'Semua 16 zona tersembunyi bagi Admin (Hak Akses Dibatasi/403)');

// ─── 2. PENGUJIAN PETUGAS SURAT PADA STATUS DRAF (menunggu_disposisi) ───
console.log('\n[TEST 2] Petugas Surat: Status Menunggu Disposisi (Draf)');
const izinPetugasDraf = hitungIzinZona({
  peran: 'petugas_surat',
  unitKerjaId: 'uk-1',
  statusKartu: 'menunggu_disposisi',
  adalahKoordinasi: false,
  bidangIniAdalahTujuan: false,
  punyaPenugasan: false,
});
assert(izinPetugasDraf.Z1 === 'baca', 'Z1 (Kop) = baca');
assert(izinPetugasDraf.Z2 === 'baca', 'Z2 (Judul) = baca');
assert(izinPetugasDraf.Z3 === 'isi', 'Z3 (Surat dari) = isi');
assert(izinPetugasDraf.Z4 === 'isi', 'Z4 (Diterima tgl/Agenda/Sifat) = isi');
assert(izinPetugasDraf.Z5 === 'isi', 'Z5 (Perihal) = isi');
assert(izinPetugasDraf.Z6 === 'sembunyi', 'Z6 (Tujuan Disposisi) = sembunyi (Larangan Petugas menyentuh Z6-Z9)');
assert(izinPetugasDraf.Z7 === 'sembunyi', 'Z7 (Instruksi) = sembunyi');
assert(izinPetugasDraf.Z8 === 'sembunyi', 'Z8 (Catatan Kadis) = sembunyi');
assert(izinPetugasDraf.Z9 === 'sembunyi', 'Z9 (Paraf Kadis) = sembunyi');
assert(izinPetugasDraf.Z10 === 'baca', 'Z10 (Blok Kepala Dinas) = baca');

// ─── 3. PENGUJIAN KEPALA DINAS PADA STATUS DRAF (menunggu_disposisi) ───
console.log('\n[TEST 3] Kepala Dinas: Memberi Disposisi pada Status Menunggu Disposisi');
const izinKadisDraf = hitungIzinZona({
  peran: 'kepala_dinas',
  unitKerjaId: null,
  statusKartu: 'menunggu_disposisi',
  adalahKoordinasi: false,
  bidangIniAdalahTujuan: false,
  punyaPenugasan: false,
});
assert(izinKadisDraf.Z3 === 'baca', 'Z3 (Surat dari) = baca (Identitas surat beku bagi Kadis)');
assert(izinKadisDraf.Z4 === 'baca', 'Z4 (No. Agenda/Sifat) = baca');
assert(izinKadisDraf.Z5 === 'baca', 'Z5 (Perihal) = baca');
assert(izinKadisDraf.Z6 === 'isi', 'Z6 (Tujuan Disposisi) = isi');
assert(izinKadisDraf.Z7 === 'isi', 'Z7 (Instruksi + Tenggat) = isi');
assert(izinKadisDraf.Z8 === 'isi', 'Z8 (Catatan Kadis) = isi');
assert(izinKadisDraf.Z9 === 'isi', 'Z9 (Paraf Kadis) = isi');
assert(izinKadisDraf.Z10 === 'baca', 'Z10 (Blok TTD Kadis) = baca');

// ─── 4. PENGUJIAN KEPALA DINAS SETELAH DIDISPOSISIKAN (Snapshot Beku) ───
console.log('\n[TEST 4] Kepala Dinas: Status Didisposisikan (Isi Terkunci/Beku)');
const izinKadisSelesai = hitungIzinZona({
  peran: 'kepala_dinas',
  unitKerjaId: null,
  statusKartu: 'didisposisikan',
  adalahKoordinasi: true,
  bidangIniAdalahTujuan: false,
  punyaPenugasan: false,
});
assert(izinKadisSelesai.Z6 === 'baca', 'Z6 (Tujuan) terkunci menjadi baca');
assert(izinKadisSelesai.Z7 === 'baca', 'Z7 (Instruksi) terkunci menjadi baca');
assert(izinKadisSelesai.Z8 === 'baca', 'Z8 (Catatan) terkunci menjadi baca');
assert(izinKadisSelesai.Z9 === 'baca', 'Z9 (Paraf) terkunci menjadi baca');

// ─── 5. PENGUJIAN SEKRETARIS DINAS (Z11 Catatan Koordinasi) ───
console.log('\n[TEST 5] Sekretaris Dinas: Catatan Koordinasi (Z11)');
const izinSekdisKoordinasi = hitungIzinZona({
  peran: 'sekretaris',
  unitKerjaId: 'uk-1',
  statusKartu: 'didisposisikan',
  adalahKoordinasi: true,
  bidangIniAdalahTujuan: false,
  punyaPenugasan: false,
});
assert(izinSekdisKoordinasi.Z11 === 'isi', 'Z11 = isi saat status didisposisikan dan adalahKoordinasi=true');

const izinSekdisTanpaKoordinasi = hitungIzinZona({
  peran: 'sekretaris',
  unitKerjaId: 'uk-1',
  statusKartu: 'didisposisikan',
  adalahKoordinasi: false,
  bidangIniAdalahTujuan: false,
  punyaPenugasan: false,
});
assert(izinSekdisTanpaKoordinasi.Z11 === 'sembunyi', 'Z11 = sembunyi bila BUKAN koordinasi lintas bidang');

// ─── 6. PENGUJIAN KEPALA BIDANG (Z12 Tanda Terima & Z13 Penugasan) ───
console.log('\n[TEST 6] Kepala Bidang: Tanda Terima (Z12) dan Penugasan Staf (Z13)');
// Saat didisposisikan: boleh paraf terima (Z12)
const izinKabidTerima = hitungIzinZona({
  peran: 'kepala_bidang',
  unitKerjaId: 'uk-2',
  statusKartu: 'didisposisikan',
  adalahKoordinasi: false,
  bidangIniAdalahTujuan: true,
  punyaPenugasan: false,
});
assert(izinKabidTerima.Z12 === 'isi', 'Z12 (Tanda Terima) = isi untuk bidang tujuan');
assert(izinKabidTerima.Z13 === 'sembunyi', 'Z13 belum aktif sebelum diterima bidang');

// Saat sudah diterima bidang: boleh isi Z13 (teruskan / tindak lanjut)
const izinKabidPenugasan = hitungIzinZona({
  peran: 'kepala_bidang',
  unitKerjaId: 'uk-2',
  statusKartu: 'diterima_bidang',
  adalahKoordinasi: false,
  bidangIniAdalahTujuan: true,
  punyaPenugasan: false,
});
assert(izinKabidPenugasan.Z13 === 'isi', 'Z13 (Keputusan Tindak Lanjut / Penugasan) = isi setelah diterima');

// Kepala bidang non-tujuan
const izinKabidBukanTujuan = hitungIzinZona({
  peran: 'kepala_bidang',
  unitKerjaId: 'uk-3',
  statusKartu: 'didisposisikan',
  adalahKoordinasi: false,
  bidangIniAdalahTujuan: false,
  punyaPenugasan: false,
});
assert(izinKabidBukanTujuan.Z12 === 'baca', 'Z12 = baca bagi bidang lain (tidak boleh klik terima)');
assert(izinKabidBukanTujuan.Z13 === 'sembunyi', 'Z13 = sembunyi bagi bidang non-tujuan');

// ─── 7. PENGUJIAN STAF PELAKSANA (Z14 Laporan Tindak Lanjut) ───
console.log('\n[TEST 7] Staf Pelaksana: Pengisian Laporan (Z14)');
const izinStaf = hitungIzinZona({
  peran: 'staf_pelaksana',
  unitKerjaId: 'uk-2',
  statusKartu: 'diteruskan_ke_staf',
  adalahKoordinasi: false,
  bidangIniAdalahTujuan: true,
  punyaPenugasan: true,
});
assert(izinStaf.Z13 === 'baca', 'Z13 (Penugasan) = baca bagi staf');
assert(izinStaf.Z14 === 'isi', 'Z14 (Laporan Tindak Lanjut) = isi bagi staf yang ditugaskan');
assert(izinStaf.Z15 === 'sembunyi', 'Z15 (Pemeriksaan) = sembunyi bagi staf');

// ─── 8. PENGUJIAN PEMERIKSAAN HASIL OLEH KABID (Z15) ───
console.log('\n[TEST 8] Kepala Bidang: Pemeriksaan Hasil Laporan Staf (Z15)');
const izinKabidPeriksa = hitungIzinZona({
  peran: 'kepala_bidang',
  unitKerjaId: 'uk-2',
  statusKartu: 'menunggu_pemeriksaan',
  adalahKoordinasi: false,
  bidangIniAdalahTujuan: true,
  punyaPenugasan: false,
});
assert(izinKabidPeriksa.Z15 === 'isi', 'Z15 (Pemeriksaan Hasil) = isi untuk Kepala Bidang saat Menunggu Pemeriksaan');

const izinStafPeriksa = hitungIzinZona({
  peran: 'staf_pelaksana',
  unitKerjaId: 'uk-2',
  statusKartu: 'menunggu_pemeriksaan',
  adalahKoordinasi: false,
  bidangIniAdalahTujuan: true,
  punyaPenugasan: true,
});
assert(izinStafPeriksa.Z15 === 'baca', 'Z15 (Pemeriksaan Hasil) = baca untuk staf (melihat catatan perbaikan/persetujuan)');

// ─── 9. PENGUJIAN RIWAYAT STATUS (Z16) ───
console.log('\n[TEST 9] Riwayat Status Kartu (Z16)');
assert(izinPetugasDraf.Z16 === 'baca', 'Z16 = baca bagi Petugas');
assert(izinKadisDraf.Z16 === 'baca', 'Z16 = baca bagi Kepala Dinas');
assert(izinSekdisKoordinasi.Z16 === 'baca', 'Z16 = baca bagi Sekretaris');
assert(izinKabidPenugasan.Z16 === 'baca', 'Z16 = baca bagi Kabid terkait');
assert(izinStaf.Z16 === 'baca', 'Z16 = baca bagi Staf yang ditugaskan');

console.log('\n================================================================');
console.log(`HASIL: ${passCount} lulus, ${failCount} gagal.`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('SEMUA PENGUJIAN MATRIKS AKSES ZONA BERHASIL DILALUI 100%!');
}
