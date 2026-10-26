import { NextRequest, NextResponse } from 'next/server';
import { SURAT_KELUAR } from '@/lib/mock-data';
import { SuratKeluar } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');

  let data: SuratKeluar[] = SURAT_KELUAR;
  if (status) {
    data = data.filter((s: SuratKeluar) => s.status === status);
  }

  return NextResponse.json({
    success: true,
    total: data.length,
    data,
  });
}
