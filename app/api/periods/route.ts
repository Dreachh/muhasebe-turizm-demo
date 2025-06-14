import { NextResponse } from 'next/server';
import { getPeriods } from '@/lib/period-service';

export async function GET() {
  try {
    const periods = await getPeriods();
    return NextResponse.json(periods || []);
  } catch (error) {
    console.error('Periods API hatası:', error);
    return NextResponse.json({ error: 'Dönem verileri getirilemedi' }, { status: 500 });
  }
}
