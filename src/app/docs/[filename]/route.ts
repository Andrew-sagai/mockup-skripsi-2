import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;

  // Cek apakah berkas fisik ada di public/docs/
  const safeFilename = path.basename(filename);
  const filePath = path.join(process.cwd(), 'public', 'docs', safeFilename);

  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeFilename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Jika berkas tidak ditemukan di disk (misal pindaian surat masuk/keluar mock yang diunggah),
  // kembalikan berkas sampel resmi yang valid agar pratinjau PDF tidak 404
  const isSuratKeluar = safeFilename.toLowerCase().includes('keluar') || safeFilename.toLowerCase().startsWith('sk-');
  const fallbackFile = isSuratKeluar ? 'sample-surat-keluar.pdf' : 'sample-surat-masuk.pdf';
  const fallbackPath = path.join(process.cwd(), 'public', 'docs', fallbackFile);

  if (fs.existsSync(fallbackPath)) {
    const fallbackBuffer = fs.readFileSync(fallbackPath);
    return new NextResponse(fallbackBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeFilename}"`,
        'X-Fallback-Pdf': 'true',
      },
    });
  }

  return new NextResponse('Berkas PDF tidak ditemukan', { status: 404 });
}
