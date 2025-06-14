import { NextResponse } from "next/server";

export async function GET() {
  try {
    // open.er-api.com üzerinden TRY bazlı kurlar çekiliyor
    const res = await fetch("https://open.er-api.com/v6/latest/TRY");
    if (!res.ok) throw new Error("open.er-api.com'dan veri alınamadı");
    const data = await res.json();
    if (!data.rates) throw new Error("Kur verisi alınamadı");

    // İlgili kurları TRY bazlı olarak al    // TRY bazlı oranlardan kesin değerler hesapla - yuvarlatma olmadan
    const usd = data.rates.USD ? 1 / data.rates.USD : null;
    const eur = data.rates.EUR ? 1 / data.rates.EUR : null;
    const gbp = data.rates.GBP ? 1 / data.rates.GBP : null;
    const sar = data.rates.SAR ? 1 / data.rates.SAR : null;
    
    if (!usd || !eur || !gbp || !sar) throw new Error("Bazı kurlar eksik");
    
    // Hassas hesaplama için ondalık değerleri 2 basamağa yuvarla
    const rates = [
      { code: "TRY", name: "Türk Lirası <strong>TRY ₺</strong>", buying: 1, selling: 1 },
      { code: "USD", name: "Dolar <strong>USD $</strong>", buying: Math.round(usd * 100) / 100, selling: Math.round(usd * 1.02 * 100) / 100 },
      { code: "EUR", name: "Euro <strong>EUR €</strong>", buying: Math.round(eur * 100) / 100, selling: Math.round(eur * 1.02 * 100) / 100 },
      { code: "GBP", name: "İngiliz Sterlini <strong>GBP £</strong>", buying: Math.round(gbp * 100) / 100, selling: Math.round(gbp * 1.02 * 100) / 100 },
      { code: "SAR", name: "Suudi Riyali <strong>SAR ﷼</strong>", buying: Math.round(sar * 100) / 100, selling: Math.round(sar * 1.02 * 100) / 100 },
    ];
    return NextResponse.json({ rates, lastUpdated: new Date().toISOString() });  } catch (error: any) {
    console.error("Döviz API Hatası:", error);
    return NextResponse.json({ error: `Canlı döviz kurları alınamadı. Hata: ${error?.message || error}` }, { status: 500 });
  }
}
