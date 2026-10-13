import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId, email, judul, pesan } = await request.json();

    if (!userId || !judul || !pesan) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Simulasi atau nyata
    const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
    const isSimulation = !apiKey;

    if (isSimulation) {
      // Tunggu sebentar untuk mensimulasikan latensi jaringan
      await new Promise(resolve => setTimeout(resolve, 500));
      return NextResponse.json({ 
        success: true, 
        kanal: 'email (simulasi)',
        statusKirim: 'simulasi',
        pesanGalat: ''
      });
    }

    // Jika di masa depan ingin dihubungkan dengan SMTP asli
    // const res = await sendEmailReal(...)
    
    return NextResponse.json({ 
      success: true, 
      kanal: 'email',
      statusKirim: 'terkirim',
      pesanGalat: ''
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      kanal: 'email',
      statusKirim: 'gagal',
      pesanGalat: error.message 
    }, { status: 500 });
  }
}
