# Baseline Fungsional e-Surat Distan (Tahap 1)

*Catatan: Dokumen ini mengonfirmasi fungsionalitas dasar aplikasi belum berubah.*

## 1. Tes Kompilasi & Ketikan
- `next build`: **Lulus** tanpa *error*.
- `tsc` / linting: **Lulus** tanpa pesan fatal pada kode UI.

## 2. Checklist Fungsional per Peran

### Administrator
- [x] Berhasil login dan masuk ke dashboard `/dashboard`.
- [x] Menu Kelola Pengguna `/admin/pengguna` memuat tabel.
- [x] Menu Laporan Admin menampilkan data dengan tepat.

### Petugas Surat
- [x] Form penambahan Surat Masuk merender dengan struktur *field* lengkap.
- [x] Aksi penerbitan Surat Keluar dapat memicu unduhan/unggah resi.
- [x] Arsip Digital memuat seluruh entri riwayat selesai.

### Kepala Dinas
- [x] Dapat membuahkan penugasan ke Kepala Bidang di `/disposisi/[id]`.
- [x] Tanda Tangan elektronik / persetujuan Surat Keluar terbuka tanpa halangan.

### Sekretaris Dinas
- [x] Menu Disposisi Lintas Bidang dapat dilalui (mengarahkan lintas tabel).
- [x] Persetujuan konsep (paraf koordinasi) terdeteksi.

### Kepala Bidang
- [x] Sub-menu Tindak Lanjut memfilter dan merender tab: Menunggu Pemeriksaan, Sedang Dikerjakan, Perlu Perbaikan, Selesai. (Sesuai perbaikan sebelumnya).
- [x] Dapat membuka detail periksa (`/disposisi/[id]`).

### Staf Pelaksana
- [x] Sub-menu Tugas Saya `/tugas-saya` terkunci eksklusif untuk staf.
- [x] Data tabel memfilter `penugasanStafId` pengguna *login* saja.
- [x] Laporan gagal (dikembalikan) disorot dengan tanda merah.

## 3. Peta Area Rawan (Mencampur Logika & Markup)
- **Komponen**: `src/components/dashboard/StafDashboard.tsx`
  - *Penjelasan*: Logika penghitungan aktif/selesai tercampur langsung dengan kondisi rendering `<td colSpan={5}>`. Peringatan: Saat mengganti *empty state* atau tabel, jumlah *loop map()* tidak boleh digeser atau di-bypass.
- **Komponen**: `src/app/tindak-lanjut/page.tsx`
  - *Penjelasan*: *useMemo* bergantung pada struktur *state.disposisi* dan *tindakLanjut*. Catatan hooks ordering sebelumnya telah diselesaikan pada commit `3b91a71` dan seluruh halaman telah lulus kompilasi tanpa pelanggaran rules-of-hooks.

