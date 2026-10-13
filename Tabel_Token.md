# Tabel Token Desain e-Surat Distan (Tahap 2)

## 1. Pemetaan Nilai Lama ke Token Baru

| Kategori | Nilai Lama / Ad-hoc | Token Baru (CSS Variable) |
| --- | --- | --- |
| **Warna Merek** | `#1D4B3A` | `--pinus` (Forest Green, kini diperbarui ke `#2A7356`) |
| **Warna Peringatan (Teks)** | `#9A4F00` | `--segera-text` (Dark Harvest Gold untuk kontras teks) |
| **Warna Peringatan (Bg)** | `#FBEBD3` | `--segera-tint` (Kini `#FCF7ED`) |
| **Warna Bahaya** | `#8C2A2A` | `--rahasia` |
| **Tipografi (H1)** | `32px` | `--text-3xl` |
| **Tipografi (Subjudul)** | `16px` | `--text-lg` |
| **Tipografi (Isi)** | `14px` | `--text-base` |
| **Tipografi (Label)** | `13px` | `--text-sm` |
| **Tipografi (Keterangan)** | `12px` / `10px` | `--text-xs` |
| **Tinggi Kontrol** | Bervariasi (`padding: 10px 20px`) | `--control-h-md` (`40px`), `--control-h-sm` (`32px`) |

## 2. Penyesuaian Kontras (Wajib Lulus AA 4.5:1)

| Elemen | Background (Luminance) | Teks / Foreground (Luminance) | Nilai Sebelum | Nilai Sesudah | Rasio Kontras Baru |
| --- | --- | --- | --- | --- | --- |
| Teks Sekunder | `--latar` (`#F3F5F4`, L: 0.90) | `--tinta-redup` (`#55625B`, L: 0.13) | `#55625B` | `#55625B` (Tetap) | **5.27 : 1** (Lulus) |
| Badge Segera (Peringatan) | `--segera-tint` (`#FCF7ED`, L: 0.93) | `--segera-text` (`#9A4F00`, L: 0.12) | `#E6B044` (Gagal 1.96:1) | `#9A4F00` | **5.7 : 1** (Lulus) |
| Badge Rahasia (Bahaya) | `--rahasia-tint` (`#F6E1E1`, L: 0.81) | `--rahasia` (`#8C2A2A`, L: 0.08) | `#8C2A2A` | `#8C2A2A` (Tetap) | **6.6 : 1** (Lulus) |
| Badge Menunggu (Info) | `--menunggu-tint` (`#E3ECF5`, L: 0.83) | `--menunggu` (`#2F5D8A`, L: 0.11) | `#2F5D8A` | `#2F5D8A` (Tetap) | **5.5 : 1** (Lulus) |
| Badge Selesai (Sukses) | `--pinus-tint` (`#E6EFEA`, L: 0.85) | `--pinus` (`#2A7356`, L: 0.16) | `#2A7356` | `#215D45` (Gelap) | **4.2:1** (Kecil) -> Diubah ke `#194634` |
| Badge Selesai (Diperbarui) | `--pinus-tint` (`#E6EFEA`, L: 0.85) | `--pinus-text` (`#194634`, L: 0.08) | `#2A7356` | `#194634` | **6.9 : 1** (Lulus) |

**Kesimpulan**: Semua badge *status* dan *sifat* dipastikan mematuhi rasio kontras 4.5:1 untuk teks normal dengan memperkenalkan varian token teks (seperti `--segera-text` dan `--pinus-text`).
