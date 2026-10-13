# Rencana Tahap 2–8: Perbaikan Konsistensi Desain

**Tahap 2 — Token dan Gaya Global**
Fokus: Penyelarasan variabel CSS di `globals.css`. Karena saya telah melakukan penyesuaian sebagian token warna di pekerjaan sebelumnya (UI Polish), tahap ini akan memastikan *semua* token skala, tipografi, dan spasi difinalisasi serta rasio kontras warna sekunder dipastikan lulus AA (4,5:1).

**Tahap 3 — Komponen Dasar**
Fokus: Ekstraksi elemen berulang (Button, StatusChip, SifatBadge) yang selama ini masih menggunakan HTML murni dan kelas *inline*. Kita akan memanfaatkan komponen yang ada atau memperbarui utilitas di lapisan terluar (presentasional).

**Tahap 4 — Shell: Sidebar & Topbar**
Fokus: Memodifikasi *layout* utama untuk menyeragamkan gaya avatar *chip* (memecahkan masalah teks nama pengguna terpotong), membenahi struktur breadcrumb, dan mendesain ulang tombol 'Keluar' agar menyerupai tindakan *(action button)* alih-alih tautan teks. Navigasi telah disatukan dari prompt sebelumnya.

**Tahap 5 — Halaman Daftar & Tabel**
Fokus: Membungkus semua tabel menggunakan utilitas kelas `.data-table` yang memaksa pemotongan teks dengan `text-overflow: ellipsis`, serta memaksa gaya aksi *rata kanan* agar selaras di semua daftar.

**Tahap 6 — Dashboard**
Fokus: Menyempurnakan dasbor. Dashboard Staf sebagian telah dihaluskan. Dasbor lainnya (Petugas, Kadis) akan ditinjau agar memiliki tata letak metrik (4->2->1 kolom) yang seragam dan menggunakan komponen semantik baru.

**Tahap 7 — Form & Dialog**
Fokus: Melakukan inspeksi pada formulir entri arsip dan pembuatan disposisi. Kita akan memastikan label, masukan teks (*input*), serta tombol aksi "Simpan" sejajar di sisi kanan bawah (pola aksi positif standar).

**Tahap 8 — Audit Akhir & Aksesibilitas**
Fokus: *Accessibility check*, menguji seluruh `aria-label` pada tombol ikon (seperti aksi edit dan hapus), mengonfirmasi batas fokus `outline`, dan merangkum dalam laporan serah terima akhir tanpa regresi kode logika.
