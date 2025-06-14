import { convertCurrency } from "./data-utils";

// Döviz kuru API servisi - Güncel veriler

// API anahtarı (gerçek uygulamada .env dosyasında saklanmalı)
const API_KEY = "demo_api_key" // Gerçek uygulamada değiştirilmeli

// Döviz kurlarını getir
export const fetchExchangeRates = async (): Promise<any> => {
  try {
    // Artık sadece kendi sunucu API route'unu kullanıyoruz
    const response = await fetch("/api/currency");
    if (!response.ok) throw new Error("Canlı döviz kurları alınamadı, sabit kurlar gösteriliyor.");
    const data = await response.json();
    if (!data.rates) throw new Error("Kur verisi alınamadı.");
    return data;
  } catch (error: any) {
    // Fallback sabit kurlar
    const fallbackRates: Record<"USD"|"EUR"|"GBP"|"SAR", number> = {
      USD: 32.85,
      EUR: 35.6,
      GBP: 41.75,
      SAR: 8.75,
    };
    const rates = [
      { code: "TRY", name: "Türk Lirası <strong>TRY ₺</strong>", buying: 1, selling: 1 },
      { code: "USD", name: "Dolar <strong>USD $</strong>", buying: fallbackRates.USD, selling: Number((fallbackRates.USD * 1.02).toFixed(2)) },
      { code: "EUR", name: "Euro <strong>EUR €</strong>", buying: fallbackRates.EUR, selling: Number((fallbackRates.EUR * 1.02).toFixed(2)) },
      { code: "GBP", name: "İngiliz Sterlini <strong>GBP £</strong>", buying: fallbackRates.GBP, selling: Number((fallbackRates.GBP * 1.02).toFixed(2)) },
      { code: "SAR", name: "Suudi Riyali <strong>SAR ﷼</strong>", buying: fallbackRates.SAR, selling: Number((fallbackRates.SAR * 1.02).toFixed(2)) },
    ];
    return {
      rates,
      lastUpdated: new Date().toISOString(),
      error: error.message || "Döviz kurları alınamadı."
    };
  }
}

