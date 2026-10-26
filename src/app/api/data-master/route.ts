import { NextRequest, NextResponse } from 'next/server';
import { DATA_MASTER } from '@/lib/mock-data';
import { KategoriDataMaster, DataMasterItem } from '@/lib/types';

/**
 * API Generic Data Master (Tabel 30 Bab 4 - Tahap 6)
 * Mendukung pembacaan dan penambahan data kategori persuratan dinamis
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kategori = searchParams.get('kategori') as KategoriDataMaster | null;
    const hanyaAktif = searchParams.get('aktif') !== 'false';

    let items: DataMasterItem[] = [...DATA_MASTER];

    if (kategori) {
      items = items.filter((d) => d.kategori === kategori);
    }

    if (hanyaAktif) {
      items = items.filter((d) => d.aktif);
    }

    items.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

    return NextResponse.json({
      success: true,
      data: items,
      total: items.length,
      kategori: kategori || 'semua',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan internal server.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kategori, kode, label, keterangan, urutan, meta } = body;

    if (!kategori || !kode || !label) {
      return NextResponse.json(
        {
          success: false,
          message: 'Kolom kategori, kode, dan label wajib diisi.',
        },
        { status: 400 }
      );
    }

    const cleanKode = String(kode).trim().toLowerCase();
    const cleanLabel = String(label).trim();

    // Validasi keunikan kode dalam kategori
    const duplicate = DATA_MASTER.find(
      (d) => d.kategori === kategori && d.kode.toLowerCase() === cleanKode
    );
    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: `Kode "${cleanKode}" sudah terdaftar pada kategori ${kategori}.`,
        },
        { status: 409 }
      );
    }

    const newItem: DataMasterItem = {
      id: `dm-${Date.now()}`,
      kategori,
      kode: cleanKode,
      label: cleanLabel,
      keterangan: keterangan || '',
      aktif: true,
      urutan: Number(urutan) || 1,
      meta,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        message: `Data master [${kategori}] berhasil ditambahkan.`,
        data: newItem,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan format data request.' },
      { status: 400 }
    );
  }
}
