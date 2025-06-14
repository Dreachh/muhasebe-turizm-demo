import { NextResponse } from 'next/server';
import { getSessionVersion } from '@/lib/db-firebase';

// Geçerli oturum versiyonunu döndüren API
export async function GET() {
  try {
    const version = await getSessionVersion();
    return NextResponse.json({ version });
  } catch (error) {
    console.error('Oturum versiyonu alma hatası:', error);
    return NextResponse.json({ version: 1 }, { status: 500 });
  }
}
