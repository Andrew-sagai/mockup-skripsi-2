# Usulan Perubahan Bab 4

Dokumen ini berisi usulan pembaruan terhadap dokumen analisis (Bab 4) untuk menyesuaikan dengan logika *mockup* aplikasi yang telah berjalan secara end-to-end tanpa jalan buntu.

1. **Penghapusan Sifat "Sangat Segera":**
   **Kondisi Saat Ini:** Terdapat "Sangat Segera" dan "Segera" yang berpotensi membingungkan.
   **Usulan:** Bab 4 perlu direvisi untuk mencoret Sifat "Sangat Segera". Sifat Surat yang valid dan digunakan di seluruh sistem adalah: Segera, Penting, Biasa, dan Rahasia (K-3).

2. **Otomatisasi Penomoran Surat Keluar (K-5):**
   **Kondisi Saat Ini:** Seolah-olah Unit Pemrakarsa mengetik nomor secara manual.
   **Usulan:** Ditambahkan penjelasan pada Bab 4 (khususnya untuk *use case* pembuatan surat keluar) bahwa Nomor Surat Keluar akan digenerasi otomatis saat Petugas Surat melakukan "Penerbitan/Terkirim". Pemrakarsa hanya perlu mengisi metadata tanpa perlu mengambil nomor urut.

3. **Status "Dua Tingkat" pada Surat Masuk:**
   **Kondisi Saat Ini:** Penjelasan status hanya di tingkat "Surat Masuk" secara mendatar.
   **Usulan:** Menyebutkan bahwa "Selesai" pada sebuah Surat Masuk (terutama bila disebar ke berbagai Bidang paralel) adalah hasil kompilasi. Sistem melacak progres masing-masing Bidang Tujuan secara independen, dan Surat baru berstatus 100% "Selesai" jika *seluruh* disposisi paralel telah selesai.

4. **Tindakan Sekretaris pada Lintas Bidang (K-8):**
   **Kondisi Saat Ini:** Sekretaris seakan harus mengawasi atau menekan "Selesai" untuk disposisi koordinasi.
   **Usulan:** Bab 4 disesuaikan agar Sekretaris hanya berfungsi memberikan "Catatan Koordinasi" yang diteruskan ke Kepala Bidang, tanpa kewajiban menutup/menyelesaikan disposisinya (yang menjadi ranah Kepala Bidang terkait).

5. **Spesifikasi Relasi `<<extend>>` dan Titik Perluasan (Extension Points) pada Use Case Diagram:**
   **Kondisi Saat Ini:** Diagram use case Bab 4 belum merinci hubungan variasi alur (*exceptional / conditional branches*).
   **Usulan:** Menambahkan relasi `<<extend>>` eksplisit pada narasi dan diagram Bab 4:
   - *Koordinasi Lintas Bidang* `<<extend>>` *Beri Disposisi* [titik perluasan: bidang tujuan > 1 atau instruksi koordinasi/konfirmasi dipilih].
   - *Tidak Perlu Disposisi* `<<extend>>` *Beri Disposisi* [titik perluasan: Kepala Dinas menetapkan surat hanya berupa tembusan/edaran].
   - *Teruskan Penugasan ke Staf* `<<extend>>` *Tindak Lanjuti Disposisi* [titik perluasan: delegasi teknis ke staf].
   - *Selesaikan Langsung* `<<extend>>` *Tindak Lanjuti Disposisi* [titik perluasan: penanganan mandiri oleh Kepala Bidang].
   - *Periksa Hasil Tindak Lanjut Staf* `<<extend>>` *Teruskan Penugasan ke Staf* [titik perluasan: staf mengirim laporan hasil; berulang bila dikembalikan].
   - *Kembalikan Laporan* `<<extend>>` *Periksa Hasil Tindak Lanjut Staf* [titik perluasan: laporan staf belum sesuai].
   - *Susun Surat Jawaban* `<<extend>>` *Tindak Lanjuti Langsung / Periksa Hasil* [titik perluasan: opsi perlu surat jawaban = Ya].
   - *Tolak Tanda Tangan* `<<extend>>` *Tandatangani Surat Keluar* [titik perluasan: Kepala Dinas menolak pengesahan draf].

6. **Siklus Hidup Kearsipan Dinamis ("Arsip Hidup" / Dynamic Archive):**
   **Kondisi Saat Ini:** Pengarsipan surat masuk seolah-olah baru dibuat di akhir setelah semua urusan tuntas secara statis.
   **Usulan:** Ditegaskan pada Bab 4 bahwa entri `ArsipDigital` dibentuk otomatis sejak kartu disposisi diterbitkan (`statusArsip: 'disposisi'`), dan secara reaktif dimutakhirkan menjadi `statusArsip: 'selesai'` saat Kepala Bidang menyetujui laporan staf (`apiPeriksaLaporan`) atau saat diselesaikan langsung, menyematkan ringkasan hasil dan tanggal penyelesaian riil.

7. **Guard Transisi Status & Independensi Multi-Bidang:**
   **Kondisi Saat Ini:** Belum ada penegasan penanganan kondisi aksi ganda (*error situation / duplicate prevention*).
   **Usulan:** Menambahkan aturan integritas bisnis:
   - Pendelegasian ke staf atau eksekusi langsung hanya dapat diproses satu kali saat bidang berstatus `diterima_bidang`, kemudian tombol aksi terkunci menjadi ringkasan baca-saja.
   - Pada disposisi yang ditujukan ke beberapa bidang paralel, progres satu bidang (misal: pendelegasian staf di Bidang A) tidak boleh mengubah atau mengunci status Bidang B yang belum memaraf terima.

8. **Penyempurnaan Layar Pelacakan Status Master-Detail:**
   **Kondisi Saat Ini:** Penjelasan use case pelacakan mengasumsikan pencarian kata kunci yang mengembalikan hasil tunggal atau tampilan statis.
   **Usulan:** Narasi dan mock-up diperbarui ke pola *master-detail*: sistem menampilkan seluruh surat yang dapat diakses pengguna secara bawaan, dilengkapi filter multi-kriteria (jenis surat, status, dan pencarian teks), serta panel riwayat kronologis interaktif yang menampilkan linimasa status, stempel pelaku, dan berkas terkait.

9. **Preview Langsung Berkas PDF (Surat Masuk, Konsep Surat Keluar, dan Surat Keluar Final):**
   **Kondisi Saat Ini:** Berkas PDF surat masuk (Tabel 14) dan berkas final surat keluar (Tabel 16) hanya dicatat sebagai lampiran yang diunggah dan ditautkan, tanpa kejelasan mekanisme pratinjau langsung di dalam sistem. Pengguna (Kepala Dinas, Sekretaris, Kepala Bidang, maupun Staf) harus mengunduh berkas ke penyimpanan lokal terlebih dahulu untuk membaca isinya sebelum memberi disposisi, paraf, atau tanda tangan. Konsep surat keluar juga hanya ditampilkan dalam bentuk field isian mentah tanpa format tata naskah dinas siap cetak.
   
   **Usulan Perbaikan dan Dampak pada Dokumen Bab 4:**
   - **Tabel 15 (Deskripsi Use Case Pembuatan Kartu Disposisi):**
     Pada bagian *Post-Condition*, ditambahkan ketentuan: *"Kartu Disposisi Digital tersimpan, status berubah menjadi 'Menunggu Disposisi', dan berkas PDF surat masuk siap di-preview langsung oleh Kepala Dinas tanpa harus mengunduh terlebih dahulu."*
   - **Tabel 19 (Deskripsi Use Case Pemberian Disposisi - Kepala Dinas):**
     Pada bagian *Standard Process*, ditambahkan langkah eksplisit: *"Kepala Dinas membuka kartu disposisi dan melihat preview berkas PDF surat masuk melalui komponen penampil tersemat (embedded viewer) untuk mempelajari isi surat sebelum menentukan instruksi disposisi."*
   - **Tabel 20 (Deskripsi Use Case Penandatanganan Surat Keluar - Kepala Dinas):**
     Pada bagian *Standard Process*, ditambahkan langkah eksplisit: *"Kepala Dinas meninjau preview naskah surat keluar secara utuh (tata naskah dinas ber-kop resmi, isi, dan format tanda tangan) sebelum membubuhkan tanda tangan digital."*
   - **Tabel 21 (Deskripsi Use Case Verifikasi Konsep Surat Keluar - Sekretaris Dinas):**
     Pada bagian *Standard Process*, ditambahkan langkah eksplisit: *"Sekretaris Dinas meninjau preview naskah surat keluar secara utuh (termasuk kop dinas, nomor klasifikasi sementara, isi, dan stempel paraf) sebelum membubuhkan paraf verifikasi."*
   - **Tabel 23 (Deskripsi Use Case Penerimaan Disposisi - Kepala Bidang):**
     Pada bagian *Standard Process*, ditambahkan langkah eksplisit: *"Kepala Bidang membuka lembar disposisi dan melihat preview berkas surat masuk untuk memahami konteks penugasan sebelum melakukan tindak lanjut atau meneruskan ke staf."*
   - **Tabel 27 (Deskripsi Use Case Pelaksanaan Tugas - Staf Pelaksana):**
     Pada bagian *Standard Process*, ditambahkan langkah eksplisit: *"Staf Pelaksana membuka rincian penugasan dan melihat preview berkas surat masuk sebagai referensi dalam melaksanakan tugas atau menyusun laporan hasil."*
   - **Spesifikasi Wireframe dan Antarmuka (Gambar 20, 21, 22, 23, 24):**
     - *Gambar 20 (Detail Surat Masuk):* Ditambahkan tombol "Lihat Berkas Asli (PDF)" yang memunculkan jendela semat (*modal viewer*) pembaca PDF dengan kendali baca-saja dan tombol unduh.
     - *Gambar 21 (Kartu Disposisi Digital):* Ditambahkan tombol "Lihat Berkas Surat (PDF)" pada toolbar atas, tabel identitas surat (Z3/Z4), dan panel samping instruksi disposisi sehingga Kepala Dinas dapat membaca naskah asli sembari merumuskan instruksi.
     - *Gambar 22 (Detail Surat Keluar):* Disediakan tabulasi ganda: penampil konsep naskah dinas resmi (*live sheet preview*) bagi Sekretaris dan Kepala Dinas sebelum pengesahan, serta penampil berkas PDF final bertandatangan setelah diunggah oleh Petugas Surat.
     - *Gambar 23 (Pelacakan Status Surat):* Ditambahkan aksi "Lihat Berkas (PDF)" pada panel rincian master-detail untuk surat masuk maupun surat keluar.
     - *Gambar 24 (Arsip Digital):* Disediakan aksi "Lihat Berkas" pada setiap baris tabel arsip yang membuka *modal viewer* PDF terintegrasi.
   - **Subbab 4.8 (Spesifikasi Antarmuka & Arsitektur API):**
     Ditambahkan sub-bagian arsitektur penampil berkas:
     - Sistem menyediakan komponen *Embedded PDF Viewer* berbasis *iframe/PDF.js* dengan sifat *read-only* (mencegah modifikasi isi di penampil).
     - Disediakan penanganan kondisi galat terstruktur: indikator pemuatan (*loading spinner*) untuk berkas besar serta penanganan galat eksplisit bertuliskan *"Berkas tidak dapat dimuat, silakan unduh berkas secara manual atau hubungi administrator"* jika berkas rusak atau URL tidak ditemukan.
     - Endpoint API pendukung yang didokumentasikan:
       - `GET /api/surat-masuk/{id}/berkas`: Mengembalikan berkas biner naskah surat masuk dengan MIME type `application/pdf`.
       - `GET /api/surat-keluar/{id}/berkas`: Mengembalikan berkas biner final surat keluar bertandatangan dengan MIME type `application/pdf`.
       - `GET /api/arsip/{id}/berkas`: Mengembalikan berkas dokumen arsip digital untuk keperluan audit dan pembacaan naskah.

10. **Penyediaan Modul/Menu Khusus "Paraf & Tanda Tangan" untuk Akses Persetujuan Konsep Surat Keluar:**
    **Kondisi Saat Ini:** Berdasarkan Tabel 21 (Beri Paraf Koordinasi Surat Keluar) dan Tabel 20 (Penandatanganan Surat Keluar), proses verifikasi oleh Sekretaris Dinas dan tanda tangan digital oleh Kepala Dinas sudah dijelaskan dalam skenario use case. Akan tetapi, pada rancangan antarmuka (Gambar 22), belum ada menu atau layar terdedikasi yang menghimpun antrean konsep surat yang sedang menunggu persetujuan dari pejabat yang bersangkutan. Pejabat harus mencari secara manual di daftar umum surat keluar yang bercampur dengan status draf, terkirim, dan penomoran petugas.

    **Usulan Perbaikan dan Dampak pada Dokumen Bab 4:**
    - **Subbab Baru 4.7.5.1 Halaman Paraf dan Tanda Tangan (Antrean Persetujuan Konsep Surat Keluar):**
      Menambahkan subbab rancangan antarmuka terdedikasi beserta spesifikasi wireframe baru:
      - Ditambahkan menu navigasi samping (sidebar) baru bernama **"Paraf & Tanda Tangan"** yang secara otomatis muncul khusus untuk peran Sekretaris Dinas dan Kepala Dinas.
      - Dilengkapi indikator angka (*badge counter*) dinamis (contoh: *"Paraf & Tanda Tangan (3)"*) yang langsung menginformasikan jumlah beban naskah yang menunggu tindakan, selaras dengan fungsi notifikasi pada Tabel 9.
      - Untuk Sekretaris Dinas: menampilkan daftar terurut kronologis terbaru seluruh konsep surat keluar berstatus `menunggu_paraf`.
      - Untuk Kepala Dinas: menampilkan daftar terurut kronologis terbaru seluruh naskah surat keluar berstatus `menunggu_ttd`.
      - Fasilitas aksi langsung (*in-place actions*) dari antarmuka antrean tanpa harus berpindah ke modul surat keluar umum:
        1. *Pratinjau Konsep Langsung:* Membuka naskah dinas resmi siap cetak ber-kop resmi Pemerintah Kabupaten Minahasa Selatan / Dinas Pertanian (terintegrasi dengan implementasi Tahap 1).
        2. *Aksi Sekretaris:* Tombol "Setujui & Beri Paraf" (disertai catatan koordinasi opsional) dan tombol "Kembalikan" (dengan kewajiban mengisi catatan revisi).
        3. *Aksi Kepala Dinas:* Tombol "Tandatangani" (dilengkapi otentikasi kata sandi pengesahan digital) dan tombol "Tolak / Kembalikan".
      - Penegasan perbedaan dengan menu Surat Keluar umum: Layar Surat Keluar (Gambar 22) tetap menyajikan seluruh surat dari segala status untuk keperluan administratif Petugas Surat, sedangkan layar "Paraf & Tanda Tangan" merupakan tampilan tersaring (*filtered to-do queue*) yang berfokus pada eksekusi persetujuan pimpinan.
    - **Tabel 20 (Deskripsi Use Case Penandatanganan Surat Keluar - Kepala Dinas):**
      Pada bagian *Trigger*, ditambahkan alternatif: *"Kepala Dinas membuka menu 'Paraf & Tanda Tangan' melalui navigasi samping atau mengklik notifikasi sistem saat terdapat surat keluar berstatus Menunggu Tanda Tangan."*
    - **Tabel 21 (Deskripsi Use Case Beri Paraf Koordinasi Surat Keluar - Sekretaris Dinas):**
      Pada bagian *Trigger*, ditambahkan alternatif: *"Sekretaris Dinas membuka menu 'Paraf & Tanda Tangan' melalui navigasi samping atau mengklik notifikasi sistem saat terdapat konsep surat berstatus Menunggu Paraf."*
    - **Tabel 9 (Fungsi Notifikasi & Indikator Kerja):**
      Ditambahkan spesifikasi *badge counter* dinamis pada item menu "Paraf & Tanda Tangan" di sidebar yang secara reaktif menghitung konsep berstatus `menunggu_paraf` bagi Sekretaris Dinas dan `menunggu_ttd` bagi Kepala Dinas.
    - **Tabel 30 (Rancangan API / Endpoint Backend):**
      Ditambahkan spesifikasi endpoint antrean kerja pimpinan:
      - `GET /api/surat-keluar/menunggu-paraf` (atau query filter `GET /api/surat-keluar?status=menunggu_paraf`): Mengembalikan daftar surat keluar yang menunggu paraf koordinasi Sekretaris Dinas.
      - `GET /api/surat-keluar/menunggu-ttd` (atau query filter `GET /api/surat-keluar?status=menunggu_ttd`): Mengembalikan daftar surat keluar yang menunggu pengesahan tanda tangan digital Kepala Dinas.
      - `POST /api/surat-keluar/{id}/paraf`: Endpoint eksekusi paraf koordinasi atau pengembalian revisi oleh Sekretaris Dinas.
      - `POST /api/surat-keluar/{id}/tanda-tangan`: Endpoint otorisasi tanda tangan digital Kepala Dinas dengan validasi kata sandi.

11. **Pengelolaan Tanda Tangan Digital Pengguna & Penyisipan Otomatis Berbasis Snapshot:**
    **Kondisi Saat Ini:** Berdasarkan Tabel 20 dan Gambar 13 (Sequence Diagram Surat Keluar), tanda tangan saat ini hanya disahkan melalui verifikasi kata sandi akun tanpa representasi visual tanda tangan asli pada naskah dinas. Akibatnya, naskah dinas yang dicetak atau diunduh belum memuat tanda tangan atau paraf pejabat yang bersangkutan. Selain itu, belum ada ketentuan mengenai tempat penyimpanan berkas gambar tanda tangan, validasi pra-penandatanganan jika pejabat belum mengunggah tanda tangan, serta perlindungan integritas riwayat naskah dinas lama.

    **Usulan Perbaikan dan Dampak pada Dokumen Bab 4:**
    - **Tabel 10 (Kelola Akun Pengguna) & Use Case Baru "Kelola Tanda Tangan Pribadi":**
      - Ditambahkan atribut data `url_tanda_tangan` pada data pengguna yang dikelola.
      - Disepakati model pengelolaan ganda: setiap pejabat/pengguna dapat mengunggah dan memperbarui tanda tangannya secara mandiri melalui layar **Profil Saya**, sementara Administrator tetap memiliki wewenang untuk meninjau, mengunggah atas nama pejabat, atau me-reset tanda tangan melalui menu Kelola Akun Pengguna (Tabel 10).
      - Format berkas yang didukung: gambar PNG dengan latar belakang transparan (disarankan agar menyatu rapi dengan kertas dinas) atau goresan digital langsung pada canvas pad, dengan batas ukuran berkas maksimal 1.5 MB.
      - Berkas disimpan pada penyimpanan awan Supabase Storage pada bucket terisolasi (`tanda-tangan/`) dengan penamaan berbasis ID pengguna.
    - **Tabel 20 (Penandatanganan Surat Keluar - Kepala Dinas) & Tabel 21 (Beri Paraf Koordinasi - Sekretaris Dinas):**
      - **Penyisipan Otomatis Berbasis Snapshot:** Pada *Standard Process*, ditambahkan ketentuan bahwa saat Sekretaris Dinas memberikan paraf atau Kepala Dinas menandatangani surat, sistem secara otomatis menyisipkan berkas gambar tanda tangan milik pengguna yang sedang aktif ke posisi tanda tangan/paraf naskah dinas. Gambar tanda tangan disimpan sebagai tangkapan statis (*immutable snapshot*) bersama metadata audit (nama pejabat, NIP, tanggal, dan waktu pengesahan), sehingga pembaruan tanda tangan profil di masa mendatang tidak akan mengubah tampilan naskah dinas historis yang telah disahkan sebelumnya.
      - **Error Situation Baru:** Ditambahkan kondisi galat pada kedua use case: *"Jika pengguna yang berwenang (Sekretaris Dinas atau Kepala Dinas) belum mengunggah gambar tanda tangan digital pada profilnya, sistem menolak eksekusi persetujuan dan menampilkan pesan peringatan: 'Anda belum mengunggah tanda tangan. Silakan unggah melalui halaman Profil terlebih dahulu.'"*
    - **Gambar 10 (Class Diagram):**
      - Menambahkan atribut `url_tanda_tangan: String` pada kelas `Pengguna`.
      - Menambahkan atribut snapshot pada kelas `SuratKeluar` (`ttd_image_url`, `paraf_image_url`, `ttd_nama_snapshot`, `paraf_nama_snapshot`, `ttd_nip_snapshot`, `ttd_waktu_snapshot`, `paraf_waktu_snapshot`) serta pada kelas `PersetujuanSuratKeluar` (`url_tanda_tangan_snapshot`, `nama_pelaku_snapshot`, `nip_pelaku_snapshot`, `jabatan_pelaku_snapshot`).
    - **Gambar 14 (Entity Relationship Diagram / ERD):**
      - Menambahkan kolom `url_tanda_tangan VARCHAR(255)` pada tabel `pengguna`.
      - Menambahkan kolom penampung snapshot `ttd_image_url VARCHAR(255)` dan `paraf_image_url VARCHAR(255)` pada tabel `surat_keluar` dan tabel `persetujuan_surat_keluar`.
    - **Subbab 4.7 (Rancangan Antarmuka):**
      - Menambahkan spesifikasi wireframe **Halaman Profil Pengguna**: memuat rincian identitas pegawai, area status tanda tangan aktif, opsi unggah berkas PNG transparan, serta fasilitas goresan canvas tanda tangan interaktif (*drawing pad*) bagi pengguna layar sentuh atau kursor.
      - Memperbarui spesifikasi wireframe **Kelola Akun Pengguna (Gambar Administrator)**: mencantumkan kolom status tanda tangan pada tabel dan jendela modal pratinjau/unggah/reset tanda tangan oleh Administrator.
    - **Tabel 30 (Rancangan API / Endpoint Backend):**
      - Ditambahkan endpoint:
        - `POST /api/profil/tanda-tangan`: Mengunggah berkas gambar tanda tangan digital pengguna ke bucket `tanda-tangan/` dan memperbarui profil pengguna.
        - `DELETE /api/profil/tanda-tangan`: Menghapus atau mereset gambar tanda tangan digital pengguna.

12. **Dukungan Pengiriman Surat Balasan Lebih dari Satu Kali (Relasi 1:N) dan Riwayat Multi-Tindak Lanjut Bertingkat (Revisi ke-N):**
    **Kondisi Saat Ini:**
    Berdasarkan Tabel 29 (Susun dan Ajukan Konsep Surat Keluar) dan alur tindak lanjut (Tabel 25, 27), sistem sebelumnya belum secara eksplisit mengakomodasi skenario di mana surat balasan atau konsep surat keluar dikirim lebih dari satu kali untuk merespons satu surat masuk yang sama (misalnya: balasan pertama belum lengkap, sehingga perlu dikirim balasan susulan atau tambahan). Demikian pula pada proses tindak lanjut surat masuk, belum ada mekanisme penanda riwayat yang memberi tahu bahwa sudah ada laporan tindak lanjut sebelumnya sebelum Staf atau Kepala Bidang mengirimkan laporan baru (misalnya pasca laporan dikembalikan dengan catatan perbaikan sesuai Tabel 26).

    **Usulan Perbaikan dan Dampak pada Dokumen Bab 4:**
    - **Tabel 29 (Deskripsi Use Case Susun dan Ajukan Konsep Surat Keluar):**
      - *Pre-Condition Baru (Opsional):* Ditambahkan butir: *"Konsep surat keluar dapat merujuk pada satu surat masuk yang sama meskipun surat masuk tersebut telah memiliki surat balasan sebelumnya (mendukung balasan susulan/tambahan)."*
      - *Standard Process:* Ditambahkan langkah eksplisit: *"Saat Petugas membuka formulir penyusunan konsep surat keluar dengan rujukan surat masuk tertentu yang telah memiliki balasan sebelumnya, sistem secara otomatis menampilkan notifikasi peringatan di awal formulir berisi jumlah surat balasan yang sudah ada, daftar ringkas (nomor surat, tanggal kirim, perihal, status), serta tautan/tombol pratinjau naskah balasan terdahulu."*
    - **Tabel 27 (Deskripsi Use Case Tindak Lanjuti dan Perbarui Status Disposisi) & Tabel 28 (Deskripsi Use Case Laporkan Hasil Tindak Lanjut):**
      - *Standard Process:* Ditambahkan langkah: *"Saat Staf Pelaksana atau Kepala Bidang hendak menyampaikan laporan tindak lanjut baru pada disposisi yang sudah memiliki riwayat laporan sebelumnya (misalnya akibat pengembalian laporan perbaikan), sistem menampilkan notifikasi riwayat laporan sebelumnya beserta status terakhirnya ('Perlu Perbaikan'), dan secara otomatis menandai laporan baru sebagai 'Revisi ke-2', 'Revisi ke-3', dst."*
    - **Gambar 14 (Entity Relationship Diagram / ERD):**
      - Menambahkan relasi satu ke banyak (*one-to-many*) antara entitas `surat_masuk` dan `surat_keluar` melalui kolom foreign key `ref_surat_masuk_id VARCHAR(50) NULL` pada tabel `surat_keluar` (satu surat masuk dapat memiliki 0, 1, atau banyak surat keluar balasan).
      - Menambahkan kolom `nomor_revisi INT DEFAULT 1` pada entitas `tindak_lanjut` untuk melacak urutan versi laporan pada satu disposisi secara kronologis dan berurutan.
    - **Gambar 10 (Class Diagram):**
      - Memperbarui relasi antara kelas `SuratMasuk` dan `SuratKeluar` menjadi kardinalitas `1` ke `0..*` (asosiasi `memiliki balasan`), dengan atribut `refSuratMasukId: String` pada kelas `SuratKeluar`.
      - Menambahkan atribut `nomorRevisi: Integer` pada kelas `TindakLanjut` untuk merepresentasikan nomor revisi tindak lanjut.
    - **Spesifikasi Wireframe dan Antarmuka (Gambar 20 & 21):**
      - *Gambar 20 (Detail Surat Masuk):* Ditambahkan badge status dinamis `"Sudah Dibalas (Nx)"` pada jajaran badge atas, tombol aksi `"Buat Balasan Tambahan"`, serta kartu khusus *"Riwayat Surat Balasan"* di bagian bawah rincian surat masuk yang mencantumkan tabel daftar seluruh surat keluar balasan lengkap dengan status dan tombol pratinjau langsung.
      - *Gambar 21 (Kartu Disposisi Digital):* Ditambahkan badge status `"Sudah Dibalas (Nx)"` pada toolbar kartu disposisi, panel ringkasan balasan keluar terkait, kotak notifikasi peringatan riwayat pada area pelaporan tindak lanjut staf (Z14), serta badge versi `"Laporan Pertama"` / `"Revisi ke-N"` pada setiap entri riwayat laporan staf dan panel pemeriksaan Kepala Bidang (Z15).
    - **Tabel 30 (Rancangan API / Endpoint Backend):**
      - Memperbarui `POST /api/surat-keluar`: menerima `ref_surat_masuk_id` untuk menghubungkan surat keluar dengan surat masuk rujukan tanpa membatasi jumlah balasan.
      - Memperbarui `POST /api/disposisi/{id}/tindak-lanjut`: secara otomatis mengkalkulasi `nomor_revisi = jumlah_laporan_sebelumnya + 1` saat entri laporan baru didaftarkan.

13. **Pengelolaan Seluruh Kategori dan Jenis Data Master Persuratan secara Dinamis melalui Administrator:**
    **Kondisi Saat Ini:**
    Berdasarkan Tabel 12 (Kelola Data Master Persuratan), data master yang dikelola Administrator baru mencakup unit kerja/bidang, klasifikasi surat, dan format kode penomoran surat. Sementara itu, terdapat sejumlah jenis dan kategori persuratan lain yang disebutkan dalam Bab 4 (seperti 5 sifat surat pada Tabel 14, jenis instruksi disposisi pada Tabel 19, serta daftar instansi pengirim surat) yang sebelumnya masih tertanam langsung di kode program (*hardcoded*). Hal ini membatasi fleksibilitas instansi apabila terdapat kebutuhan penambahan sifat surat baru, penyesuaian instruksi disposisi pimpinan, maupun standarisasi instansi pengirim yang sering berulang.

    **Usulan Perbaikan dan Dampak pada Dokumen Bab 4:**
    - **Tabel 12 (Kelola Data Master Persuratan):**
      - *Description:* Diperluas dari pengelolaan unit kerja dan klasifikasi menjadi pengelolaan seluruh data master persuratan terpadu, mencakup: Unit Kerja, Klasifikasi Surat, Format Kode Penomoran, Sifat Surat, Jenis Instruksi Disposisi, dan Asal Instansi Pengirim Terdaftar.
      - *Standard Process:*
        - Administrator dapat menambah entri baru, mengubah label/keterangan/urutan tampilan, serta menonaktifkan (*toggle active/inactive*) item data master pada kategori apa pun.
        - Diterapkan mekanisme perlindungan data historis (*soft deactivation*): item data master tidak dihapus permanen dari basis data, melainkan dinonaktifkan sehingga tidak muncul pada formulir transaksi baru. Surat dan lembar disposisi lama yang sudah menggunakan item tersebut tetap valid dan tidak rusak referensinya.
      - *Error Situation (Situasi Kesalahan):*
        - Menstandarkan dan memperluas aturan keunikan: sistem memeriksa bahwa `kode` dan `label` baru tidak boleh menduplikasi entri yang sudah ada dalam kategori yang sama. Jika terdeteksi duplikasi, sistem membatalkan penyimpanan dengan pesan: *"Kode atau label yang dimasukkan sudah digunakan pada kategori ini (duplikat). Gunakan nilai yang unik."*
    - **Tabel 14 (Deskripsi Use Case Catat Surat Masuk):**
      - *Standard Process:*
        - Mengubah redaksi: dari *"Petugas menetapkan sifat surat: biasa, umum/pemberitahuan, penting, segera, atau rahasia"* menjadi *"Petugas memilih sifat surat dari daftar yang dikelola secara dinamis melalui Data Master Administrator"*.
        - Pada isian Asal Surat: Petugas dapat memilih instansi terdaftar dari daftar rekomendasi (*datalist/autocomplete*) yang bersumber dari Data Master Instansi Pengirim, atau mengetikkan instansi baru secara bebas bila instansi belum terdaftar (selaras dengan fleksibilitas opsi "Lainnya" pada Tahap 4).
    - **Tabel 19 (Deskripsi Use Case Beri Disposisi oleh Kepala Dinas):**
      - *Standard Process:*
        - Mengubah redaksi: dari pilihan instruksi pimpinan bernilai tetap menjadi *"Kepala Dinas memilih satu atau lebih jenis instruksi arahan dari daftar yang dikelola secara dinamis melalui Data Master Administrator, serta dapat mengisi instruksi khusus pada opsi Lainnya"*.
    - **Gambar 10 (Class Diagram):**
      - Menambahkan kelas entitas generik baru `DataMaster` dengan atribut: `id: String`, `kategori: KategoriDataMaster` (`sifat_surat`, `jenis_instruksi`, `instansi_asal`), `kode: String`, `label: String`, `keterangan: String`, `aktif: Boolean`, `urutan: Integer`, dan `meta: Map<String, Any>`.
      - Memperbarui relasi kelas: `SuratMasuk` dan `Disposisi` berelasi merujuk ke entitas `DataMaster` sesuai kategorinya masing-masing menggantikan nilai enumerasi statis.
    - **Gambar 14 (Entity Relationship Diagram / ERD):**
      - Menambahkan tabel generik terpusat `data_master` dengan skema kolom:
        - `id VARCHAR(36) PRIMARY KEY`
        - `kategori VARCHAR(50) NOT NULL` (diindeks untuk kueri cepat)
        - `kode VARCHAR(100) NOT NULL`
        - `label VARCHAR(255) NOT NULL`
        - `keterangan TEXT`
        - `aktif BOOLEAN NOT NULL DEFAULT TRUE`
        - `urutan INT DEFAULT 1`
        - `meta JSONB`
        - `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
        - `updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
        - *Constraint:* `UNIQUE(kategori, kode)` dan `UNIQUE(kategori, label)` untuk menjamin integritas data tanpa redundansi.
      - Pendekatan tabel generik terpadu dipilih secara arsitektural agar penambahan kategori master baru di masa depan dapat dilakukan langsung tanpa memerlukan migrasi skema tabel database berulang.
    - **Subbab 4.7 (Rancangan Antarmuka / Wireframe Administrator):**
      - *Gambar 24 (Wireframe Halaman Data Master Administrator):*
        - Menambahkan navigasi tab/sub-menu kategori: Unit Kerja, Klasifikasi Surat, Kode Penomoran, Sifat Surat, Instruksi Disposisi, dan Instansi Pengirim.
        - Menyajikan tabel seragam per kategori yang menampilkan: Urutan, Kode Sistem, Label Tampilan, Keterangan/Panduan Perlakuan, Status Keaktifan (chip Aktif/Nonaktif), serta tombol Aksi (Ubah dan Nonaktifkan/Aktifkan).
        - Menyediakan modal dialog Tambah/Ubah Data Master terpadu dengan formulir input kode, label tampilan, nomor urut, keterangan, serta validasi instan terhadap duplikasi nilai.
    - **Tabel 30 (Rancangan API / Endpoint Backend):**
      - Menambahkan endpoint RESTful terpadu:
        - `GET /api/data-master?kategori={kategori}&aktif={true/false}`: Mengambil daftar item data master dinamis berdasarkan kategori yang diminta dan filter keaktifan.
        - `POST /api/data-master`: Mendaftarkan item master baru (khusus Administrator) dengan validasi kelengkapan data dan keunikan kode/label.
        - `PUT /api/data-master/{id}`: Memperbarui label tampilan, urutan, atau keterangan item data master.
        - `PATCH /api/data-master/{id}/toggle`: Mengaktifkan atau menonaktifkan status item data master untuk menjamin keutuhan relasi data historis.








