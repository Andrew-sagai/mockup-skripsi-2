# Katalog Komponen e-Surat Distan (Tahap 3)

Dokumen ini memuat daftar komponen *presentasional* dasar yang ada di aplikasi e-Surat Distan. Karena proyek ini mengadopsi pendekatan penataan gaya melalui `globals.css` untuk elemen HTML dasar, sebagian besar komponen di sini berupa abstraksi CSS (*Utility Classes*), sedangkan komponen logis yang lebih kompleks (seperti Dialog) berupa komponen React (`src/components/ui/index.tsx`).

## 1. Komponen Dasar (CSS Abstraction)

### 1.1 Buttons (`.btn`)
| Varian | Kelas CSS | Kegunaan |
| --- | --- | --- |
| Primer | `.btn .btn-primary` | Aksi utama, Simpan, Tambah Data. Latar *Forest Green*. |
| Sekunder | `.btn .btn-secondary` | Aksi alternatif (Batal, Kembali). Latar abu terang bergaris tepi. |
| Tersier/Ghost | `.btn .btn-ghost` | Aksi tidak mendesak pada tabel (Lihat, Edit). Tanpa latar, warna teks sekunder. |
| Peringatan | `.btn .btn-warning` | Mengubah state penting, latar kuning. |
| Bahaya | `.btn .btn-danger` | Hapus, Tolak, Kembalikan. Latar merah. |
| Ukuran | `.btn-sm`, `.btn-lg`, `.btn-icon`| Varian ukuran tombol. |

**Penggunaan:**
```html
<button className="btn btn-primary">Simpan</button>
```

### 1.2 Form Inputs (`.form-input`, dll)
| Elemen | Kelas CSS | Deskripsi |
| --- | --- | --- |
| Pembungkus | `.form-group` | Memberi margin bawah (`20px`). |
| Label | `.form-label` | Teks tebal (600), font judul, warna teks utama. |
| Input Teks | `.form-input` | Fokus akan menampilkan cincin *Forest Green* (Outline 2px). |
| Select | `.form-select` | Sama seperti form input. |
| Textarea | `.form-textarea`| Sama seperti form input. |

**Penggunaan:**
```tsx
<div className="form-group">
  <label className="form-label">Nomor Surat <span className="required">*</span></label>
  <input type="text" className="form-input" placeholder="Masukkan nomor" />
</div>
```

### 1.3 Card (`.card`)
| Elemen | Kelas CSS | Deskripsi |
| --- | --- | --- |
| Pembungkus | `.card` | Memiliki batas (border) 1px, latar putih, bayangan *flat*. |
| Header | `.card-header` | Bagian atas kartu, garis bawah. |
| Body | `.card-body` | Konten utama. Padding seragam. |

### 1.4 Data Table (`.data-table`)
| Elemen | Kelas CSS | Deskripsi |
| --- | --- | --- |
| Pembungkus | `.table-container` | `overflow-x: auto`, bentuk ujung membulat. |
| Tabel | `.data-table` | 100% lebar, angka tabuler. |
| Baris Aksi | `tr.actionable` | Garis hijau *Forest Green* di sisi kiri. Hover state abu terang. |
| Aksi Kanan | `.table-actions` | Mengatur tombol pada sel `<td>` agar berada di ujung kanan. |

### 1.5 Empty State (`.empty-state`)
Gaya generik untuk panel tabel atau dasbor saat kosong.
**Penggunaan:**
```tsx
<div className="empty-state">
  <AlertCircle size={40} className="empty-state-icon" />
  <h3>Tidak Ada Data</h3>
  <p>Anda belum memiliki tugas.</p>
</div>
```

## 2. Komponen React (`src/components/ui/index.tsx`)

### 2.1 `<ChipStatus />`
Menampilkan status disposisi atau persuratan dalam bentuk cip kecil dengan ikon bawaan.
- **Props**: `jenis: JenisStatus`, `status: string`, `compact?: boolean`
- **Output**: Memetakan status (misal: "menunggu_pemeriksaan") ke kelas `--menunggu-tint` dengan label terjemahan ramah.

### 2.2 `<BadgeSifat />`
Sama seperti `ChipStatus`, khusus untuk sifat surat (Biasa, Penting, Segera, Rahasia). Sifat rahasia otomatis memunculkan ikon gembok `Lock`.

### 2.3 `<PenandaBatasWaktu />`
Memiliki tiga status pengembalian otomatis berdasar argumen: `normal`, `mendekati`, `terlambat`.
- **Props**: `tanggal: string | Date`, `sekarang?: Date`
- **Tampilan**: Jika "terlambat", ia menampilkan warna merah dengan awalan "Terlambat: 10 Okt".

### 2.4 `<KonfirmasiDialog />`
Membungkus `<dialog>` HTML5 dengan fokus `backdrop`.
- **Props**: `open`, `onClose`, `onConfirm`, `judul`, `pesan`, `bahaya?`

### 2.5 `<UnggahPdf />`
Formulir unggah (*drag & drop*) client-side untuk memvalidasi lampiran PDF.
- **Props**: `value` (obj-url / null), `onChange`, `maxMB` (batas ukuran).
