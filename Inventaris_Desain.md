# Inventaris Desain e-Surat Distan

## 1. Peta Halaman per Peran
- **Administrator**: `/dashboard`, `/admin/pengguna`, `/admin/data-master`, `/admin/log`, `/admin/laporan`
- **Petugas Surat**: `/dashboard`, `/surat-masuk`, `/surat-keluar`, `/disposisi`, `/arsip`, `/pelacakan`, `/notifikasi`, `/laporan`
- **Kepala Dinas**: `/dashboard`, `/disposisi`, `/surat-keluar`, `/pelacakan`, `/arsip`, `/notifikasi`, `/laporan`
- **Sekretaris**: `/dashboard`, `/surat-keluar`, `/disposisi`, `/pelacakan`, `/arsip`, `/notifikasi`, `/laporan`
- **Kepala Bidang**: `/dashboard`, `/disposisi`, `/tindak-lanjut`, `/pelacakan`, `/arsip`, `/notifikasi`, `/laporan`
- **Staf Pelaksana**: `/dashboard`, `/tugas-saya`, `/pelacakan`, `/arsip`, `/notifikasi`, `/laporan`

## 2. Pustaka UI dan Komponen
- **Pustaka Utama**: React, Next.js (App Router), Tailwind CSS (hanya terinstal, namun proyek banyak menggunakan CSS murni di `globals.css`).
- **Ikon**: `lucide-react`.
- **Komponen Presentasional yang Ditemukan**: `Sidebar`, `DashboardLayout`, `SidebarNavItem`, elemen HTML dengan kelas murni seperti `.card`, `.btn`, `.badge`.

## 3. Ekstraksi Token Aktual (berdasarkan `globals.css` dan sekitarnya)
- **Warna Merek & Aksi**:
  - Forest Green (`--pinus`: `#2A7356`, `--pinus-dark`: `#215D45`, `--pinus-tint`: `#E6EFEA`)
  - Harvest Gold (`--segera`: `#E6B044`, `--segera-dark`: `#CF9932`, `--segera-tint`: `#FCF7ED`)
- **Semantik Status**:
  - Rahasia/Bahaya (`--rahasia`: `#8C2A2A`, `--rahasia-tint`: `#F6E1E1`)
  - Menunggu/Info (`--menunggu`: `#2F5D8A`, `--menunggu-tint`: `#E3ECF5`)
  - Sukses (menggunakan `--pinus`)
- **Latar & Tinta**:
  - Permukaan (`--permukaan`: `#FFFFFF`), Latar belakang (`--latar`: `#F3F5F4`), Garis (`--garis`: `#D8DEDA`)
  - Teks Utama (`--tinta`: `#18211D`), Teks Sekunder (`--tinta-redup`: `#55625B`)
- **Radius**:
  - Kotak Kontrol: `4px` (`--border-radius`)
  - Panel/Card: `6px` (`--border-radius-lg`)
  - Tombol: `8px` (`--border-radius-xl`)
- **Ad-hoc & Inkonsistensi Warna**:
  - Terdapat beberapa atribut *inline style* di halaman seperti `padding: 48px`, `width: 250px`, `background: var(--gray-50)` yang harusnya menggunakan kelas konvensi atau token CSS.
