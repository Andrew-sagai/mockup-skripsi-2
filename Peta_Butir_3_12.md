# Peta Butir 3-12 - Audit Tahap 1
> e-Surat Distan - Dinas Pertanian Kab. Minahasa Selatan
> Dibuat: 2026-10-21 - Auditor: AI Engineer

## Baseline Build

| Pemeriksaan | Hasil |
|---|---|
| `tsc --noEmit` | LULUS (exit 0, tanpa error) |
| Perubahan kode pada tahap ini | Nihil (read-only audit) |

## P3 - Extend (Major)

| Aspek | Detail |
|---|---|
| Lokasi kode | Tidak ditemukan. Pencarian "extend", "perpanjang", "major" di src/ dan docs/ nihil. |
| Perilaku sekarang | Tidak ada fitur perpanjangan tenggat disposisi. |
| Perilaku target | DITUNDA - menunggu jawaban K-9. |
| Risiko | Rendah |
| Label | Konfirmasi K-9 |

## P4 - Opsi Lainnya pada Dropdown Petugas

### Inventaris dropdown

| Halaman / Komponen | Field | Tipe Nilai | Perlu Lainnya? |
|---|---|---|---|
| surat-masuk/baru L396-408 | Kode Klasifikasi Arsip | Kode baku (arsip) | Tidak (dikecualikan) |
| surat-masuk/baru L413-428 | Jenis Surat (jenisSuratId) | Kategori deskriptif dari master | Ya |
| surat-masuk/baru L370-387 | Sifat Surat | 4 nilai baku (enum) | Tidak (dikecualikan) |
| surat-keluar/baru | Jenis Surat (jenisSuratId) | Kategori deskriptif dari master | Ya |
| surat-keluar/baru | Kode Klasifikasi | Kode baku | Tidak |
| disposisi/buat | Instruksi | Sudah ada "lainnya" built-in | Tidak perlu diubah |

Perilaku sekarang: Dropdown Jenis Surat hanya menampilkan nilai dari state.jenisSurat tanpa opsi bebas.
Perilaku target: Tambah opsi Lainnya terakhir; bila dipilih muncul input teks wajib, dipangkas, panjang maks MAKS_LAINNYA. Nilai disimpan di jenisSuratLainnya. Buat komponen SelectDenganLainnya.
Dikecualikan: Sifat, Klasifikasi, Status, Unit Kerja, Peran.
Risiko: Perubahan tipe SuratMasuk/SuratKeluar; tampilan di semua halaman yang menampilkan jenis surat perlu memeriksa field baru.

## P5 - Urutan Terbaru di Semua Daftar

### Inventaris per halaman

| Halaman | Urutan Sekarang | Field Waktu | Sesuai? |
|---|---|---|---|
| /notifikasi | sort descending createdAt (baris 16) | createdAt | Ya |
| /pelacakan allItems | sort descending tanggal (baris 49) | createdAt | Ya |
| /arsip | Tidak di-sort lokal | createdAt | Tidak |
| /surat-masuk | Tidak di-sort lokal | createdAt | Perlu audit |
| /disposisi | Tidak di-sort lokal | createdAt | Perlu audit |
| Dashboard (semua peran) | Tidak terlihat sort eksplisit | createdAt | Perlu audit |
| /surat-keluar | Tidak di-sort lokal | createdAt | Perlu audit |
| /tugas-saya | Belum diperiksa | createdAt | Perlu audit |
| /tindak-lanjut | Belum diperiksa | createdAt | Perlu audit |
| admin/log | ADD_LOG prepend (baris 258 store.tsx) | waktu | Ya |
| admin/pengguna | Tidak di-sort lokal | createdAt | Perlu audit |

Perilaku target: Satu utilitas urutkanTerbaru(items, ambilWaktu) di src/lib/utils.ts; diterapkan sebelum render; tidak ada .sort() lokal yang tersisa.
Risiko: Rendah jika hanya mengubah urutan tampilan.

## P6 - Zona Z13 (Keputusan Tindak Lanjut)

| Aspek | Detail |
|---|---|
| Lokasi kode | src/app/disposisi/[id]/page.tsx - commit 305955c menghapus label Z13 dari judul panel |
| Konfirmasi Z13 | git log -S"Z13": penghapusan label Z13 dari UI di commit 305955c. Panel adalah aksi Kepala Bidang (Selesaikan Langsung / Teruskan ke Staf). |
| Perilaku sekarang | Panel sudah menggunakan grid responsif (partial). Perlu audit detail layout pada 3 lebar layar. |
| Perilaku target | Dua kartu pilihan setinggi rata pada layar lebar; bertumpuk di layar sempit; ringkasan baca-saja dua kolom dengan chip status, pelaku, dan waktu. |
| Risiko | Sangat rendah (hanya CSS/layout). |

## P7 - Pop-up Konsisten (ModalStandar)

### Inventaris pop-up

| Lokasi | Jenis | Komponen | Sesuai ModalStandar? |
|---|---|---|---|
| components/ui/index.tsx L126-182 | KonfirmasiDialog | dialog native terpisah | Tidak (bukan ModalStandar) |
| components/ui/index.tsx L320-381 | ModalStandar | Komponen standar | Ya |
| disposisi/[id]/page.tsx | Modal paraf, selesaikan, dll. | ModalStandar (commit efecc9f) | Ya (sebagian besar) |
| arsip/page.tsx L237-313 | Preview berkas | Overlay manual (modal-overlay + modal div) | Tidak |
| arsip/page.tsx L293-294 | Koreksi Metadata, Bukti Terima | alert() | Tidak |
| admin/laporan/page.tsx L12 | Unduh laporan | alert() | Tidak |
| surat-keluar/[id]/page.tsx | Modal paraf, TTD, dll. | Perlu audit | Perlu audit |

Sisa alert(): 3 lokasi (arsip x2, laporan x1).
Overlay manual: arsip/page.tsx.
Perilaku target: Semua pop-up pakai ModalStandar; tidak ada alert(), confirm(), prompt(), overlay manual.
Risiko: Sedang.

## P8 - Selesaikan Langsung (Guard)

| Aspek | Detail |
|---|---|
| Tombol Selesaikan Langsung | disposisi/[id]/page.tsx baris 1463 |
| Guard panel | Panel disembunyikan/diganti ringkasan saat statusProses != diterima_bidang (commit efecc9f) |
| Guard API | api.ts baris 497: penolakan penugasan duplikat. Guard spesifik Selesaikan Langsung perlu diaudit. |
| Perilaku sekarang | Panel disembunyikan pasca-keputusan. Belum jelas apakah ada guard 409 di API untuk Selesaikan Langsung. |
| Perilaku target | Tombol nonaktif saat memproses; API tolak 409 bila sudah Selesai; tidak ada notifikasi ganda; ringkasan baca-saja menampilkan keputusan, pelaku, waktu. |
| Risiko | Rendah jika guard panel sudah benar; perlu verifikasi endpoint. |

## P9 - Notifikasi di Tengah (Toast)

| Aspek | Detail |
|---|---|
| Komponen toast CSS | globals.css baris 1556-1583: .toast-container, .toast, .toast.success/warning/error |
| Implementasi di halaman | disposisi/[id]/page.tsx baris 809-835: inline fixed top 24 left 50% translateX(-50%) |
| Komponen React bersama | Belum ada komponen Toast di ui/index.tsx |
| Perilaku sekarang | Toast di disposisi/[id] sudah di tengah atas. Halaman lain belum tentu sama. |
| Perilaku target (K-10) | Satu komponen Toast di ui/index.tsx; posisi tengah atas; z-index 2000+; 4 tingkat; auto-dismiss 4-5 det sukses/info; manual dismiss galat/peringatan. Panel lonceng tetap menempel ikon. |
| Risiko | Sedang. |

## P10 dan P11 - Pelacakan

| Aspek | Detail |
|---|---|
| Lokasi | src/app/pelacakan/page.tsx |
| Daftar default | Sudah memuat semua surat tanpa pencarian wajib (baris 18-50). Ya. |
| Pencarian | Mencari nomor dan perihal (baris 54-55). Belum mencari asalSurat/tujuan. |
| Saran pencarian | Belum ada dropdown saran di bawah kotak pencarian. |
| Filter | Jenis dan Status ada; Sifat dan Periode belum ada. |
| Status di URL | Belum ada (?q=, ?id=). |
| Detail saat klik | Panel detail dihitung dari state yang sudah ada - tidak benar-benar lazy load. |
| Progres/linimasa | Menggunakan state.riwayat (baris 68-70), bukan riwayat arsip. |
| Surat rahasia | Sensor perihal di daftar (baris 177, 204) dan panel detail (baris 231-233) sudah ada. |
| Perilaku target | Tambah filter Sifat + Periode; tambah saran; URL state; sumber linimasa dari arsip (Tahap 6). |
| Risiko | Sedang. |

## P12 - Arsip Hidup

| Aspek | Detail |
|---|---|
| Waktu pembuatan arsip | api.ts baris 238-252 (apiBuatDisposisi): arsip dibuat saat kartu disposisi dibuat (diagenda -> menunggu_disposisi). SESUAI P12. |
| Idempoten | autoArchive() baris 44-46: cek existing dulu, lalu UPDATE jika sudah ada. Sesuai. |
| Status arsip | "disposisi" (Dalam Proses) saat kartu dibuat; "selesai"/"terkirim" saat selesai. Ada. |
| Riwayat arsip | TIDAK ADA. ArsipDigital tidak punya field riwayat[] atau entitas RiwayatArsip. Tidak ada catatRiwayatArsip(). |
| Penguncian | Belum ada mekanisme kunci metadata setelah status final. |
| UI Arsip | Tidak ada tab Riwayat Perubahan. Tidak ada banner "Arsip masih dalam proses". Tombol Koreksi Metadata dan Bukti Terima pakai alert(). |
| Perilaku target | Tambah entitas RiwayatArsip, fungsi catatRiwayatArsip(), tab UI, banner status, penguncian metadata. |
| Risiko | Tinggi - perubahan model data, perlu migrasi/backfill pada data seed. |

## Daftar Pertanyaan Terbuka (K-n)

| ID | Pertanyaan | Bawaan |
|---|---|---|
| K-9 | Arti "extend major" (P3) | Tunda, jangan dikerjakan |
| K-10 | Toast "di tengah" | Tengah atas viewport, teks rata tengah, panel lonceng tetap di ikon |
| K-11 | Arsip surat keluar | Tetap dibuat saat Terkirim; hanya surat masuk yang dibuat sejak kartu |

## Temuan di Luar Cakupan P3-P12

Bertentangan dengan Prompt Perbaikan Alur - tidak dikerjakan, hanya dilaporkan untuk Tahap 9:

1. Opsi Tidak Perlu Disposisi - keputusanKd ada di types, belum tampil di UI Kadis.
2. Status nomor_diterbitkan - ada di enum StatusSuratKeluar, belum jelas alurnya di UI.
3. Tenggat Staf oleh Kepala Bidang - tidak ditemukan field tenggat per-penugasan di PenugasanStaf.
4. Sekretaris tanpa jalur teruskan ke Kepala Bidang - K-8 terbuka.
5. Tombol buat surat keluar untuk Staf - getSuratKeluarByRole membatasi Staf, perlu audit akses buat.
6. Koreksi arsip oleh Administrator - admin/koreksi-arsip/page.tsx ada; perlu audit modal vs alert().

## Usulan Urutan Kerja Tahap 2-7

| Tahap | Butir | Keterangan |
|---|---|---|
| 2 | P5 Urutan terbaru | Buat utilitas urutkanTerbaru, terapkan ke semua daftar |
| 3 | P7 + P9 Modal & Toast | Buat komponen Toast di ui/index.tsx; ganti alert() di arsip dan laporan |
| 4 | P4 + P8 Opsi Lainnya + Guard | Buat SelectDenganLainnya; verifikasi guard P8 |
| 5 | P6 Zona Z13 | Hanya CSS/layout |
| 6 | P12 Arsip hidup | Tambah model RiwayatArsip, fungsi, UI |
| 7 | P10 + P11 Pelacakan | Tambah filter, saran, URL state |
| 8 | P3 | Tunda (K-9) |
