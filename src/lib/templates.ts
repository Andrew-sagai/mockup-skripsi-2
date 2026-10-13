// ============================================================
// TEMPLATES — Kerangka Naskah Dinas Ringan
// Mengacu pada elemen formal naskah dinas di Proposal Subbab 2.4.1
// (Kop surat, nomor, lampiran, perihal, alamat penerima, isi, 
//  tanda tangan pejabat, tembusan)
// ============================================================

export interface TemplateContext {
  perihal?: string;
  tujuan?: string;
  nomorSurat?: string;
}

export function getTemplateNaskah(jenisNama: string, context?: TemplateContext): string {
  const perihal = context?.perihal || '[Perihal Surat]';
  const tujuan = context?.tujuan || '[Nama Instansi / Jabatan Penerima]';

  const namaLower = jenisNama.toLowerCase();

  // 1. Pemberitahuan (Utama)
  if (namaLower.includes('pemberitahuan')) {
    return `PEMERINTAH KABUPATEN MINAHASA SELATAN
DINAS PERTANIAN
Kompleks Perkantoran Pemerintah Kabupaten Minahasa Selatan — Amurang

Nomor       : [Nomor Surat]
Sifat       : Biasa / Penting
Lampiran    : -
Perihal     : ${perihal}

Kepada Yth.
${tujuan}
di -
    Tempat

Dengan hormat,
Dengan ini kami beritahukan bahwa dalam rangka pelaksanaan program kerja Dinas Pertanian Kabupaten Minahasa Selatan Tahun Anggaran 2026, disampaikan hal-hal sebagai berikut:

1. [Poin pemberitahuan pertama]
2. [Poin pemberitahuan kedua]
3. [Poin pemberitahuan ketiga]

Demikian surat pemberitahuan ini disampaikan untuk diketahui dan dipergunakan sebagaimana mestinya. Atas perhatian dan kerja samanya, diucapkan terima kasih.

Kepala Dinas Pertanian
Kabupaten Minahasa Selatan


[Tanda Tangan Digital Pejabat]

Tembusan:
1. Bupati Minahasa Selatan (sebagai laporan)
2. Sekretaris Daerah Kabupaten Minahasa Selatan
3. Arsip`;
  }

  // 2. Undangan (Utama)
  if (namaLower.includes('undangan')) {
    return `PEMERINTAH KABUPATEN MINAHASA SELATAN
DINAS PERTANIAN
Kompleks Perkantoran Pemerintah Kabupaten Minahasa Selatan — Amurang

Nomor       : [Nomor Surat]
Sifat       : Penting / Segera
Lampiran    : 1 (satu) Berkas Jadwal
Perihal     : ${perihal}

Kepada Yth.
${tujuan}
di -
    Tempat

Dengan hormat,
Sehubungan dengan pelaksanaan kegiatan koordinasi dan evaluasi program sektor pertanian di Kabupaten Minahasa Selatan, dengan hormat kami mengundang Bapak/Ibu/Saudara untuk menghadiri rapat pertemuan yang akan diselenggarakan pada:

    Hari / Tanggal : [Hari, Tanggal Bulan Tahun]
    Waktu          : [09.00 WITA s.d. Selesai]
    Tempat         : Ruang Rapat Dinas Pertanian Kab. Minahasa Selatan
    Agenda         : ${perihal}

Mengingat pentingnya agenda tersebut, dimohon kehadiran tepat pada waktunya.

Demikian undangan ini kami sampaikan, atas kehadiran dan kerja samanya diucapkan terima kasih.

Kepala Dinas Pertanian
Kabupaten Minahasa Selatan


[Tanda Tangan Digital Pejabat]

Tembusan:
1. Bupati Minahasa Selatan (sebagai laporan)
2. Arsip`;
  }

  // 3. Penugasan / Surat Tugas (Utama)
  if (namaLower.includes('penugasan') || namaLower.includes('tugas')) {
    return `PEMERINTAH KABUPATEN MINAHASA SELATAN
DINAS PERTANIAN
Kompleks Perkantoran Pemerintah Kabupaten Minahasa Selatan — Amurang

SURAT PERINTAH TUGAS
Nomor: [Nomor Surat]

Dasar:
1. Peraturan Daerah Kabupaten Minahasa Selatan tentang Organisasi dan Tata Kerja Dinas Pertanian;
2. DPA Dinas Pertanian Kabupaten Minahasa Selatan Tahun Anggaran 2026.

MEMERINTAHKAN:

Kepada:
1. Nama        : [Nama Pegawai]
   NIP         : [NIP Pegawai]
   Pangkat/Gol : [Pangkat / Golongan]
   Jabatan     : [Jabatan Pegawai]

Untuk:
1. Melaksanakan tugas kedinasan perihal: ${perihal};
2. Melaksanakan koordinasi dan verifikasi teknis bersama ${tujuan};
3. Melaporkan hasil pelaksanaan tugas kepada Kepala Dinas Pertanian segera setelah tugas diselesaikan.

Ditetapkan di : Amurang
Pada tanggal  : [Tanggal Bulan Tahun]

Kepala Dinas Pertanian
Kabupaten Minahasa Selatan


[Tanda Tangan Digital Pejabat]

Tembusan:
1. Bupati Minahasa Selatan
2. Kepala Badan Kepegawaian dan Pengembangan SDM Kab. Minahasa Selatan
3. Arsip`;
  }

  // 4. Keputusan (Utama)
  if (namaLower.includes('keputusan')) {
    return `PEMERINTAH KABUPATEN MINAHASA SELATAN
DINAS PERTANIAN
Kompleks Perkantoran Pemerintah Kabupaten Minahasa Selatan — Amurang

KEPUTUSAN KEPALA DINAS PERTANIAN
KABUPATEN MINAHASA SELATAN
Nomor: [Nomor Surat]

TENTANG
${perihal.toUpperCase()}

KEPALA DINAS PERTANIAN KABUPATEN MINAHASA SELATAN,

Menimbang   : a. bahwa dalam rangka optimalisasi pelaksanaan tugas kedinasan...
              b. bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a, perlu menetapkan Keputusan Kepala Dinas;
Mengingat   : 1. Undang-Undang Nomor 23 Tahun 2014 tentang Pemerintahan Daerah;
              2. Peraturan Bupati Minahasa Selatan tentang Rincian Tugas Dinas Pertanian.

MEMUTUSKAN:
Menetapkan  : KEPUTUSAN KEPALA DINAS PERTANIAN TENTANG ${perihal.toUpperCase()}.
KESATU      : [Ketentuan pertama ketetapan dinas]
KEDUA       : Menugaskan ${tujuan} untuk melaksanakan ketentuan dalam keputusan ini.
KETIGA      : Keputusan ini mulai berlaku pada tanggal ditetapkan.

Ditetapkan di : Amurang
Pada tanggal  : [Tanggal Bulan Tahun]

Kepala Dinas Pertanian
Kabupaten Minahasa Selatan


[Tanda Tangan Digital Pejabat]

Tembusan:
1. Bupati Minahasa Selatan
2. Inspektur Kabupaten Minahasa Selatan
3. Arsip`;
  }

  // 5. Kerangka Umum Formal Naskah Dinas untuk jenis lainnya (Permintaan, Sertifikat, Pengantar, Edaran, Rekomendasi, Laporan)
  return `PEMERINTAH KABUPATEN MINAHASA SELATAN
DINAS PERTANIAN
Kompleks Perkantoran Pemerintah Kabupaten Minahasa Selatan — Amurang

Nomor       : [Nomor Surat]
Sifat       : Biasa / Penting
Lampiran    : [Lampiran]
Perihal     : ${perihal}

Kepada Yth.
${tujuan}
di -
    Tempat

Dengan hormat,
Sehubungan dengan pelaksanaan tugas pokok dan fungsi Dinas Pertanian Kabupaten Minahasa Selatan, bersama ini kami sampaikan ${jenisNama.toLowerCase()} mengenai ${perihal}:

[Isi ringkas naskah dinas: uraikan pokok persoalan, data/informasi teknis, atau permintaan dukungan sesuai ketentuan yang berlaku]

Demikian surat ini kami sampaikan untuk menjadi perhatian dan dapat dipergunakan sebagaimana mestinya. Atas kerja sama yang baik, disampaikan terima kasih.

Kepala Dinas Pertanian
Kabupaten Minahasa Selatan


[Tanda Tangan Digital Pejabat]

Tembusan:
1. Bupati Minahasa Selatan (sebagai laporan)
2. Arsip`;
}
