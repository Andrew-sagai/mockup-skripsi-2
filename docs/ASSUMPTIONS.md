# DOKUMEN ASUMSI DAN KEPUTUSAN DESAIN SISTEM PERSURATAN
## Replika Lembar Disposisi Digital — Dinas Pertanian Kabupaten Minahasa Selatan

Dokumen ini mencatat seluruh temuan perbedaan antara **lembar disposisi kertas asli dinas** (Lampiran 3 Proposal) dengan uraian **Bab 4 skripsi**, serta keputusan implementasi default yang diambil pada sistem. Seluruh butir di bawah ini perlu dikonfirmasikan kepada pihak Dinas Pertanian Kabupaten Minahasa Selatan saat validasi lapangan.

---

### Daftar Temuan dan Asumsi (K1 – K8)

| # | Temuan di Lapangan (Kertas Asli) | Ketentuan di Bab 4 / Proposal | Keputusan Default & Perilaku Sistem | Status Konfirmasi |
|---|---|---|---|---|
| **K1** | **Kolom Sifat hanya memiliki 3 kotak centang:** *Sangat Segera*, *Segera*, dan *Rahasia*. | Bab 4 dan wawancara menggunakan 5 kategori sifat: *biasa*, *umum/pemberitahuan*, *penting*, *segera*, *rahasia*. Istilah *Sangat Segera* tidak tercantum di Bab 4. | Sifat tetap dikelola sebagai **Data Master** oleh Admin. Sistem menyemai (seed) 5 sifat Bab 4 (aktif) dan menambahkan sifat `sangat_segera` dengan status **nonaktif** sampai dinas mengonfirmasi. Di lembar fisik ditampilkan **3 kotak persis kertas**; untuk surat bersifat *biasa/umum/penting*, sistem menampilkan teks pendamping `"Sifat: ..."` agar informasi tidak hilang. | Menunggu konfirmasi dinas |
| **K2** | Label kolom kiri atas di kertas hanya tertulis **"Surat :"** (kemungkinan maksudnya "Surat dari"). | Bab 4 dan formulir pencatatan menyebut asal pengirim surat. | Kolom diisi dengan **asal/pengirim surat**. Di UI layar menggunakan label **"Surat dari"** dengan penanda visual. | Menunggu konfirmasi dinas |
| **K3** | Lembar fisik **tidak memiliki kolom tenggat waktu**. | Bab 4 mewajibkan pencatatan tenggat penyelesaian (Gambar 21, Tabel 19, 22, 9). | Menambahkan **"Tenggat penyelesaian"** (serta "Batas waktu pada surat" jika ada) sebagai **kolom tambahan digital**. Diberi penanda kecil *"tambahan digital"* di layar, namun **tetap dicetak** sebagai bagian lembar disposisi. | Menunggu konfirmasi dinas |
| **K4** | Lembar fisik memiliki kotak **"Sekretaris"** pada bagian tujuan disposisi. | Bab 4 hanya menempatkan Sekretaris pada alur **koordinasi lintas bidang** (Tabel 22), bukan sebagai penindak lanjut tunggal. | Memilih *Sekretaris* sebagai tujuan diposisikan sebagai **disposisi koordinasi**. Jika *Sekretaris* adalah satu-satunya tujuan (misal surat kepegawaian umum kode 5.20), sistem memberikan hak *Terima dan Paraf* serta *Tindak Lanjuti Langsung* layaknya Kepala Bidang. | Usulan penyempurnaan, menunggu konfirmasi |
| **K5** | Pemicu alur koordinasi Sekretaris Dinas pada Bab 4 Tabel 22 menyebut bila disposisi ke >1 bidang *"atau menandai surat perlu dikoordinasikan"*. | Di kertas terdapat opsi instruksi *"Koordinasi / Konfirmasi"*. | Sekretaris menerima notifikasi & hak koordinasi jika: (a) kotak Sekretaris dicentang, (b) $\ge 2$ Kepala Bidang dicentang, atau (c) opsi instruksi *"Koordinasi / Konfirmasi"* dicentang bersama $\ge 1$ tujuan. | Sesuai tafsiran operasional dinas |
| **K6** | **Urutan pejabat tujuan pada lembar kertas:** 1. Sekretaris, 2. Ka. Bid. Peternakan dan Kesehatan Hewan, 3. Ka. Bid. Tanaman Pangan dan Hortikultura, 4. Ka. Bid. Prasarana dan Sarana Pertanian, 5. Ka. Bid. Perkebunan, 6. Ka. Bid. Penyuluhan Pertanian. | Mockup v2 menggunakan urutan hierarki unit kerja internal yang berbeda. | Sistem mengikuti **urutan dan teks label persis lembar kertas fisik**. Disimpan dalam atribut `urutanLembar` dan `labelLembar` pada tabel `unit_kerja`. | Sesuai lembar fisik Lampiran 3 |
| **K7** | Tabel 29 Bab 4 menyatakan aktor *Susun dan Ajukan Konsep Surat Keluar* hanya Petugas Surat, namun Gambar 7 menghubungkannya ke Kepala Bidang, dan Proposal 2.1.3 menyebut Kabid mengoordinasikan konsep balasan. | Kebutuhan alur balasan surat masuk memerlukan inisiasi dari pejabat pembina substansi teknis. | Tombol aksi **"Susun Konsep Surat Jawaban"** disediakan baik untuk **Kepala Bidang** (saat memeriksa hasil / setelah penugasan) maupun untuk **Petugas Surat**. Form surat keluar otomatis terhubung dengan nomor agenda surat masuk terkait. | Usulan penyempurnaan alur |
| **K8** | Tabel 19 Bab 4 menulis pesan kesalahan *"bidang tujuan wajib diisi"*, sementara Sekretariat juga merupakan opsi tujuan yang sah di lembar kertas. | Validasi tujuan disposisi. | Pesan validasi diselaraskan menjadi: **"Pilih minimal satu tujuan disposisi (Sekretaris atau Bidang)."** | Sesuai kaidah tata naskah dinas |
| **K9** | R-01: Jalur Penolakan oleh Kepala Dinas (TD-04). Bab 4 tidak merinci teknis pengembalian bila Kadis menolak tandatangan. | Konsep surat yang ditolak dikembalikan ke penyusun dengan status `perlu_revisi`. | Tombol **"Kembalikan / Tolak"** disediakan bagi Kadis, mengubah status jadi `perlu_revisi` dan mengirim notifikasi beserta catatan penolakan ke penyusun. | Keputusan desain UI/UX |
| **K10** | R-05: Status surat keluar `diajukan` berlebihan dan tumpang tindih dengan `menunggu_paraf`. | Di Bab 4, staf pelaksana dapat berpartisipasi, namun di UI/UX `diajukan` dihapus. | Status `diajukan` dihapus sepenuhnya dari _types_ dan UI. Setelah `draf`, konsep langsung masuk fase `menunggu_paraf` atau `menunggu_ttd` (tergantung kebutuhan). | Penyederhanaan alur sistem |
| **K11** | R-06: Penomoran agenda masuk `state.suratMasuk.length + 1` berisiko duplikat jika ada surat dihapus. | Tidak diatur detail di Bab 4. | `generateNomorAgenda` di-refaktor untuk mencari nilai angka maksimum (max) dari seluruh surat pada tahun berjalan lalu $+1$, guna menjamin idempotensi nomor. | Best practice database / integritas data |
| **K12** | R-07: Kepala Bidang tidak memiliki menu sidebar "Surat Masuk" di aplikasi. | Di Bab 4, Kabid dilibatkan dalam disposisi surat masuk. | `middleware.ts` mengizinkan akses _read-only_ Kabid ke `/surat-masuk/[id]`, dapat diakses via notifikasi masuk dari disposisi, namun tetap disembunyikan dari sidebar utama demi fokus pada menu _Tindak Lanjut_ & _Disposisi_. | Keputusan UX layout sidebar |
| **K13** | R-02 & R-03: Notifikasi via Email. Bab 4 meminta notifikasi namun tidak merinci platform. | Implementasi notifikasi dalam UI dan Email. | Menggunakan pendekatan simulasi API (mock delay 500ms) melalui file `.env.example`. Status pengiriman dicatat (`terkirim`, `gagal`, `simulasi`). Admin memiliki log & tombol _Kirim Ulang_ di _Log Aktivitas_ (R-03). | Penyesuaian demo & teknis deployment |

---

### Asumsi Teknis & Keamanan Tambahan

1. **Autentikasi Paraf Elektronik (Z9):**
   - Paraf elektronik tidak menggunakan sertifikat digital BSrE/BSSN (sesuai batasan penelitian Proposal subbab 1.5.2 butir 2).
   - Paraf dinyatakan sah berdasarkan sesi akun pengguna terautentikasi (Kepala Dinas / Kepala Bidang), dengan pencatatan otomatis atas: Nama Pejabat, Tanggal/Waktu, dan IP/User-Agent.
2. **Pembekuan Snapshot Data:**
   - Begitu Kepala Dinas membubuhkan paraf dan menekan "Kirim Disposisi", seluruh metadata surat masuk dan identitas pejabat dibekukan ke dalam snapshot `snapshotSurat` dan `ttdNamaSnapshot` / `ttdNipSnapshot`.
   - Perubahan data pejabat di kemudian hari tidak akan memengaruhi tampilan historis dan cetakan kartu lama.
3. **Pemisahan Hak Akses Administrator:**
   - Administrator sistem tidak diberikan akses melihat isi kartu disposisi digital demi menjaga kerahasiaan naskah dinas (Proposal butir 14a, 15a). Halaman kartu disposisi mengembalikan pesan penolakan 403 bagi peran Admin.
4. **Format Cetak Standar A4:**
   - `@media print` dirancang khusus untuk mereproduksi proporsi lembar disposisi kertas dinas asli pada ukuran kertas A4 potret, dengan halaman kedua opsional untuk lampiran pelacakan digital (Z11–Z16).

---

### Temuan Audit Tahap 1 — Fondasi (9 Okt 2026)

Audit dilakukan pada mockup Next.js yang sudah ada. Berikut temuan dan keputusan yang diambil:

| # | Temuan | Keputusan |
|---|--------|-----------|
| **F1** | Status chip tersebar sebagai string literal di banyak halaman tanpa kosakata terpusat. | Dibuat `src/lib/status.ts` sebagai satu-satunya sumber label, tone, dan ikon. Semua halaman akan bermigrasi ke komponen `ChipStatus` di tahap selanjutnya. |
| **F2** | Tidak ada komponen bersama untuk badge sifat surat, penanda batas waktu, dialog konfirmasi, atau kontrol unggah PDF. | Dibuat `src/components/ui/index.tsx` berisi: `ChipStatus`, `BadgeSifat`, `PenandaBatasWaktu`, `KonfirmasiDialog` (native `<dialog>`), dan `UnggahPdf` (drag-and-drop, validasi tipe/ukuran). |
| **F3** | Token desain sudah menggunakan bahasa Indonesia (pinus, tinta, segera, dll.) dan kontras lolos WCAG AA. Tidak ada perubahan token yang diperlukan. | Dipertahankan apa adanya. Ditambahkan variabel `.chip-*` dan `.btn-danger` yang konsisten dengan token yang ada. |
| **F4** | Ambang "mendekati tenggat" (2 hari) tidak terdokumentasi. | Ditetapkan 2 hari di `hitungTenggat()`. Didokumentasikan sebagai parameter yang bisa dikonfigurasi di produksi. |
| **F5** | Halaman katalog komponen (L00) belum ada. | Dibuat `/katalog` dengan semua varian chip, badge, tenggat, dialog, dan unggah. Dapat diakses tanpa login. |
| **F6** | Rute `/403` memicu redirect loop karena tidak di-bypass di middleware. | Ditambahkan `/403` ke daftar bypass middleware. |

#### Kalibrasi Antislop

| Dial | Nilai | Alasan |
|------|-------|--------|
| ENERGY | 1 | Aplikasi resmi pemerintah daerah — tenang, formal |
| RHYTHM | 1 | Layout flat, datar, tanpa ornamen |
| MOTION | 1 | Hanya transisi 150-200ms pada hover/focus |
