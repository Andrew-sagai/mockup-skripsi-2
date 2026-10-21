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

