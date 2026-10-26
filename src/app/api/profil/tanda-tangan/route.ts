import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, dataUrl } = body;

    if (!userId || !dataUrl) {
      return NextResponse.json(
        { success: false, message: 'Parameter userId dan dataUrl berkas tanda tangan wajib diisi.' },
        { status: 400 }
      );
    }

    // Simulasi penyimpanan berkas ke Supabase Storage (bucket: tanda-tangan/)
    const storagePath = `tanda-tangan/${userId}-${Date.now()}.png`;

    return NextResponse.json({
      success: true,
      message: 'Tanda tangan digital berhasil diunggah ke storage.',
      data: {
        userId,
        urlTandaTangan: dataUrl,
        storagePath,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan internal server.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Parameter userId wajib disertakan.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tanda tangan digital berhasil dihapus.',
      data: { userId, urlTandaTangan: null, updatedAt: new Date().toISOString() },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan internal server.' },
      { status: 500 }
    );
  }
}
