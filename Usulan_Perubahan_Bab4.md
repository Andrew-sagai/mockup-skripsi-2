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
