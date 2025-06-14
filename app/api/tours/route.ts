import { NextResponse } from 'next/server';
import { getAllData } from '@/lib/db';
import { COLLECTIONS } from '@/lib/db-firebase';

export async function GET() {
  try {
    const tours = await getAllData(COLLECTIONS.tours);
    return NextResponse.json(tours || []);
  } catch (error) {
    console.error('Tours API hatası:', error);
    return NextResponse.json({ error: 'Tur verileri getirilemedi' }, { status: 500 });
  }
}
