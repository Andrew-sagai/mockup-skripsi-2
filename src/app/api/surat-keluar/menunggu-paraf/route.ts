import { NextResponse } from 'next/server';
import { SURAT_KELUAR } from '@/lib/mock-data';
import { SuratKeluar } from '@/lib/types';

export async function GET() {
  const data: SuratKeluar[] = SURAT_KELUAR.filter((s: SuratKeluar) => s.status === 'menunggu_paraf');
  return NextResponse.json({
    success: true,
    total: data.length,
    data,
  });
}
