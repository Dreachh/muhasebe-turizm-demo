import { NextResponse } from 'next/server';
import { getAllData } from '@/lib/db';
import { COLLECTIONS } from '@/lib/db-firebase';

export async function GET() {
  try {
    const financial = await getAllData(COLLECTIONS.financials);
    return NextResponse.json(financial || []);
  } catch (error) {
    console.error('Financial API hatası:', error);
    return NextResponse.json({ error: 'Finansal veriler getirilemedi' }, { status: 500 });
  }
}
