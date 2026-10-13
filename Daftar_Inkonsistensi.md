# Daftar Inkonsistensi Desain e-Surat Distan

| Kategori | Lokasi Berkas | Contoh Inkonsistensi | Usulan Token / Komponen |
| --- | --- | --- | --- |
| **Topbar & Breadcrumb** | `src/components/layout/Sidebar.tsx` / `Topbar` | Nama pengguna pada breadcrumb mencantumkan peran (isi statis), inisial avatar sering terpotong atau tumpang tindih. | Perbaiki gaya *avatar chip* dengan tambahan kelas `ellipsis` dan `title`. (Isi data breadcrumb adalah Temuan Non-Desain). |
| **Header Halaman & Toolbar** | `src/app/*/page.tsx` | Struktur elemen header (`page-header`, `page-header-left`), tombol, dan kolom pencarian di-koding *hardcoded* dan bervariasi lebarnya antar tabel. | Konsolidasikan menjadi satu pola `PageHeader` dan `TableToolbar` dengan dukungan filter dinamis. |
| **Tabel (Daftar Data)** | `src/app/disposisi/page.tsx`, dsb | Kolom Aksi belum tentu rata kanan, kolom-kolom tidak proporsional (misalnya kolom batas waktu mengambil spasi tidak wajar). Teks panjang tidak otomatis *truncate* dengan *title*. | Buat set utilitas `.data-table` yang memaksa `text-align: right` untuk kolom akhir, dan bungkus teks dengan kelas pemotong teks. |
| **Keadaan Kosong (Empty State)** | `src/components/dashboard/StafDashboard.tsx` | Beberapa pesan kosong masih berupa tag `<tr><td>` dengan *style inline padding: 48px*. | Gunakan komponen `.empty-state` dengan ikon abu-abu secara seragam di seluruh aplikasi. |
| **Gaya Tombol Logout** | `src/components/layout/Sidebar.tsx` | Teks dan tombol Keluar (`LogOut`) tampak seperti baris menu teks biasa (menyerupai *link*) alih-alih *action button*. | Beri gaya latar/border khusus atau ubah radius/padding untuk memisahkannya secara visual. |
| **Chip Status & Sifat** | `src/app/disposisi/page.tsx`, `StafDashboard.tsx` | Implementasi label status menyebar (`badge-success`, `badge-warning`), warna tidak sepenuhnya terstandar. | Petakan dalam `StatusChip` dan `SifatBadge` secara konsisten tanpa logika tambahan. |
