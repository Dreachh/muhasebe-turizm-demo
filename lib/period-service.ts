"use client";

import { getAllData, addData, updateData, deleteData } from "./db";
import { COLLECTIONS } from "./db-firebase";

// Tur giderleri için tip tanımı
interface TourExpense {
  amount: number;
  currency: string;
  description?: string;
}

// Para birimi grubu için tip tanımı
interface CurrencyGroup {
  amount: number;
  currency: string;
}

// Dönem verisi için tip tanımı
export interface PeriodData {
  id: string;
  year: number;
  month: number;
  // Para birimi grupları olarak gelir/giderler
  financialIncomeByCurrency: CurrencyGroup[];
  tourIncomeByCurrency: CurrencyGroup[];
  companyExpensesByCurrency: CurrencyGroup[];
  tourExpensesByCurrency: CurrencyGroup[];
  // Geriye uyumluluk için eski alanlar
  financialIncome: number;
  financialIncomeCurrency: string;
  tourIncome: number;
  tourIncomeCurrency: string;
  companyExpenses: number;
  companyExpensesCurrency: string;
  tourExpenses: number;
  tourExpensesCurrency: string;
  tourCount: number;
  customerCount: number;
  status: "active" | "closed";
  createdAt?: any;
  updatedAt?: any;
  // TRY cinsinden toplam değerler (sadece karşılaştırma için)
  totalIncomeInTRY?: number;
  totalExpensesInTRY?: number;
  profitInTRY?: number;
}

// Para birimi dönüşüm oranları için arayüz
interface ExchangeRates {
  USD: number;
  EUR: number;
  GBP: number;
}

// Sabit dönüşüm oranları (gerçek projede API'den alınmalı)
const EXCHANGE_RATES: ExchangeRates = {
  USD: 28.5, // 1 USD = 28.5 TRY
  EUR: 31.2, // 1 EUR = 31.2 TRY
  GBP: 36.4  // 1 GBP = 36.4 TRY
};

// Para birimi dönüşümü için yardımcı fonksiyon
function convertToTRY(amount: number, currency: string): number {
  if (currency === 'TRY') return amount;
  const rate = EXCHANGE_RATES[currency as keyof ExchangeRates];
  if (!rate) throw new Error(`Desteklenmeyen para birimi: ${currency}`);
  return amount * rate;
}

// Para birimi grubuna miktar ekleme fonksiyonu
function addToCurrencyGroup(groups: CurrencyGroup[], amount: number, currency: string): void {
  const existingGroup = groups.find(g => g.currency === currency);
  if (existingGroup) {
    existingGroup.amount += amount;
  } else {
    groups.push({ amount, currency });
  }
}

// Para birimi gruplarının TRY toplamını hesaplama
function calculateTotalInTRY(groups: CurrencyGroup[]): number {
  return groups.reduce((total, group) => total + convertToTRY(group.amount, group.currency), 0);
}

// Dönem durumunu belirle (mevcut ay aktif, geçmiş aylar kapalı)
function determinePeriodStatus(year: number, month: number): "active" | "closed" {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  // Mevcut ay ve yıl ise aktif, yoksa kapalı
  if (year === currentYear && month === currentMonth) {
    return "active";
  } else {
    return "closed";
  }
}

// Dönem verilerini getir
export async function getPeriods() {
  try {
    return await getAllData(COLLECTIONS.periods);
  } catch (error) {
    console.error("Dönem verileri getirilirken hata:", error);
    throw error;
  }
}

// Dönem verisi ekle
export async function addPeriod(periodData: PeriodData) {
  try {
    return await addData(COLLECTIONS.periods, {
      ...periodData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Dönem verisi eklenirken hata:", error);
    throw error;
  }
}

// Dönem verisi güncelle
export async function updatePeriod(periodData: PeriodData) {
  try {
    return await updateData(COLLECTIONS.periods, {
      ...periodData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Dönem verisi güncellenirken hata:", error);
    throw error;
  }
}

// Dönem verisi sil
export async function deletePeriod(periodId: string) {
  try {
    return await deleteData(COLLECTIONS.periods, periodId);
  } catch (error) {
    console.error("Dönem verisi silinirken hata:", error);
    throw error;
  }
}

// Dönem durumunu değiştir
export async function changePeriodStatus(periodId: string, newStatus: "active" | "closed") {
  try {
    // Önce veriyi getir
    const period = await getAllData(COLLECTIONS.periods).then(
      periods => periods.find(p => p.id === periodId)
    );
    
    if (!period) {
      throw new Error(`ID'si ${periodId} olan dönem bulunamadı`);
    }
    
    // Durumu güncelle
    return await updateData(COLLECTIONS.periods, {
      ...period,
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Dönem durumu değiştirilirken hata:", error);
    throw error;
  }
}

// Dönem verilerini yeniden hesapla
export async function recalculatePeriods() {
  try {
    // Mevcut tüm dönemleri temizle
    const existingPeriods = await getPeriods();
      for (const period of existingPeriods) {
      await deletePeriod(period.id);
    }
    
    // Finansal kayıtları getir
    const financialData = await getAllData(COLLECTIONS.financials);
    
    // Tur kayıtlarını getir
    const tourData = await getAllData(COLLECTIONS.tours);
    
    // İşlenmiş dönemler için kayıtları tut
    const processedPeriods: Record<string, PeriodData> = {};
      // Finansal kayıtları işle
    financialData.forEach((financial, index) => {
      const date = new Date(financial.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const periodKey = `${year}-${month}`;
        if (!processedPeriods[periodKey]) {
        processedPeriods[periodKey] = {
          id: periodKey,
          year,
          month,
          // Yeni para birimi gruplarını başlat
          financialIncomeByCurrency: [],
          tourIncomeByCurrency: [],
          companyExpensesByCurrency: [],
          tourExpensesByCurrency: [],
          // Geriye uyumluluk için eski alanlar
          financialIncome: 0,
          financialIncomeCurrency: 'TRY',
          tourIncome: 0,
          tourIncomeCurrency: 'TRY',
          companyExpenses: 0,
          companyExpensesCurrency: 'TRY',
          tourExpenses: 0,
          tourExpensesCurrency: 'TRY',
          tourCount: 0,
          customerCount: 0,
          totalIncomeInTRY: 0,
          totalExpensesInTRY: 0,
          profitInTRY: 0,
          status: determinePeriodStatus(year, month)
        };
      }
      const amount = Number(financial.amount) || 0;
      const currency = financial.currency || 'TRY';
      const amountInTRY = convertToTRY(amount, currency);
      
      if (financial.type === "income") {
        // Para birimi grubuna ekle
        addToCurrencyGroup(processedPeriods[periodKey].financialIncomeByCurrency, amount, currency);
        // TRY toplamını güncelle
        processedPeriods[periodKey].totalIncomeInTRY = (processedPeriods[periodKey].totalIncomeInTRY || 0) + amountInTRY;
      } else if (financial.type === "expense" && !financial.tourId && !financial.relatedTourId) {
        // Para birimi grubuna ekle
        addToCurrencyGroup(processedPeriods[periodKey].companyExpensesByCurrency, amount, currency);
        // TRY toplamını güncelle
        processedPeriods[periodKey].totalExpensesInTRY = (processedPeriods[periodKey].totalExpensesInTRY || 0) + amountInTRY;
      }
    });
      // Tur kayıtlarını işle
    tourData.forEach(tour => {
      const date = new Date(tour.tourDate);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const periodKey = `${year}-${month}`;
      
      if (!processedPeriods[periodKey]) {
        processedPeriods[periodKey] = {
          id: periodKey,
          year,
          month,
          // Yeni para birimi gruplarını başlat
          financialIncomeByCurrency: [],
          tourIncomeByCurrency: [],
          companyExpensesByCurrency: [],
          tourExpensesByCurrency: [],
          // Geriye uyumluluk için eski alanlar
          financialIncome: 0,
          financialIncomeCurrency: 'TRY',
          tourIncome: 0,
          tourIncomeCurrency: 'TRY',
          companyExpenses: 0,
          companyExpensesCurrency: 'TRY',
          tourExpenses: 0,
          tourExpensesCurrency: 'TRY',
          tourCount: 0,
          customerCount: 0,
          totalIncomeInTRY: 0,
          totalExpensesInTRY: 0,
          profitInTRY: 0,
          status: determinePeriodStatus(year, month)
        };
      }

      processedPeriods[periodKey].tourCount += 1;      // Tur gelirlerini hesapla
      const tourAmount = Number(tour.totalPrice) || 0;
      const tourCurrency = tour.currency || 'TRY';
      const tourAmountInTRY = convertToTRY(tourAmount, tourCurrency);
      
      // Para birimi grubuna ekle
      addToCurrencyGroup(processedPeriods[periodKey].tourIncomeByCurrency, tourAmount, tourCurrency);
      // TRY toplamını güncelle
      processedPeriods[periodKey].totalIncomeInTRY = (processedPeriods[periodKey].totalIncomeInTRY || 0) + tourAmountInTRY;
      
      // Müşteri sayısını güncelle
      const numberOfPeople = Number(tour.numberOfPeople) || 0;
      const customerCount = numberOfPeople > 0 ? numberOfPeople : 1;
      processedPeriods[periodKey].customerCount += customerCount;
      
      // Tur giderlerini hesapla
      if (tour.expenses && Array.isArray(tour.expenses)) {
        (tour.expenses as TourExpense[]).forEach(expense => {
          const expenseAmount = Number(expense.amount) || 0;
          const expenseCurrency = expense.currency || 'TRY';
          const expenseAmountInTRY = convertToTRY(expenseAmount, expenseCurrency);

          // Para birimi grubuna ekle
          addToCurrencyGroup(processedPeriods[periodKey].tourExpensesByCurrency, expenseAmount, expenseCurrency);
          // TRY toplamını güncelle
          processedPeriods[periodKey].totalExpensesInTRY = (processedPeriods[periodKey].totalExpensesInTRY || 0) + expenseAmountInTRY;
        });
      }

      // Net karı hesapla
      processedPeriods[periodKey].profitInTRY = 
        (processedPeriods[periodKey].totalIncomeInTRY || 0) - 
        (processedPeriods[periodKey].totalExpensesInTRY || 0);
    });
    
    // Geriye uyumluluk için eski alanları güncelle
    for (const key in processedPeriods) {
      const period = processedPeriods[key];
      
      // İlk gelir para birimini eski alan olarak ayarla
      if (period.financialIncomeByCurrency.length > 0) {
        period.financialIncome = period.financialIncomeByCurrency[0].amount;
        period.financialIncomeCurrency = period.financialIncomeByCurrency[0].currency;
      }
      
      // İlk tur gelir para birimini eski alan olarak ayarla
      if (period.tourIncomeByCurrency.length > 0) {
        period.tourIncome = period.tourIncomeByCurrency[0].amount;
        period.tourIncomeCurrency = period.tourIncomeByCurrency[0].currency;
      }
      
      // İlk şirket gider para birimini eski alan olarak ayarla
      if (period.companyExpensesByCurrency.length > 0) {
        period.companyExpenses = period.companyExpensesByCurrency[0].amount;
        period.companyExpensesCurrency = period.companyExpensesByCurrency[0].currency;
      }
      
      // İlk tur gider para birimini eski alan olarak ayarla
      if (period.tourExpensesByCurrency.length > 0) {
        period.tourExpenses = period.tourExpensesByCurrency[0].amount;
        period.tourExpensesCurrency = period.tourExpensesByCurrency[0].currency;
      }
    }
      // Tüm dönem verilerini veritabanına kaydet
    for (const key in processedPeriods) {
      const periodData = processedPeriods[key];
      
      try {
        await addPeriod(periodData);
      } catch (error) {
        console.error(`Dönem eklenirken hata: ${periodData.id}`, error);
      }
    }
    
    // Güncel dönem listesini döndür
    return await getPeriods();
  } catch (error) {
    console.error("Dönem verileri yeniden hesaplanırken hata:", error);
    throw error;
  }
}

// Tek bir dönemi ID'ye göre getir
export async function getPeriodById(periodId: string) {
  try {
    const periods = await getPeriods();
    return periods.find(period => period.id === periodId);
  } catch (error) {
    console.error("Dönem getirme hatası:", error);
    throw error;
  }
}

// Belirli bir yıl ve aya ait dönemi getir
export async function getPeriodByYearMonth(year: number, month: number) {
  try {
    const periodId = `${year}-${month}`;
    return await getPeriodById(periodId);
  } catch (error) {
    console.error("Dönem getirme hatası:", error);
    throw error;
  }
}