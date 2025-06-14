"use client";

import { useState, useEffect } from "react";
import { getPeriods, recalculatePeriods } from "@/lib/period-service";
import { getAllData } from "@/lib/db";
import { COLLECTIONS } from "@/lib/db-firebase";

export default function TestPeriodsPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [tours, setTours] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("Firebase gerçek verilerini yüklüyor...");
        
        // Dönem verilerini getir
        const periodsData = await getPeriods();
        console.log("Firebase'den alınan dönem verileri:", periodsData);
        setPeriods(periodsData || []);
        
        // Tur verilerini de getir
        const toursData = await getAllData(COLLECTIONS.tours);
        console.log("Firebase'den alınan tur verileri:", toursData);
        setTours(toursData || []);
        
        // Finansal verilerini de kontrol et
        const financialsData = await getAllData(COLLECTIONS.financials);
        console.log("Firebase'den alınan finansal veriler:", financialsData);
        setFinancials(financialsData || []);
        
      } catch (error) {
        console.error("Veri yükleme hatası:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);
  const handleRecalculate = async () => {
    try {
      console.log("Dönem verileri yeniden hesaplanıyor...");
      const result = await recalculatePeriods();
      console.log("Yeniden hesaplanan veriler:", result);
      setPeriods(result || []);
    } catch (error) {
      console.error("Yeniden hesaplama hatası:", error);
    }
  };
  const debugCompanyExpenses = () => {
    console.log("=== ŞİRKET GİDERLERİ DEBUG ===");
    
    // Şirket gideri olan finansal kayıtları filtrele (type = expense ve tourId yok)
    const companyExpenses = financials.filter(f => 
      f.type === "expense" && !f.tourId && !f.relatedTourId
    );
    
    console.log("Şirket gideri kayıtları:", companyExpenses);
    
    // Dönem bazında grupla
    const expensesByPeriod: { [key: string]: any[] } = {};
    companyExpenses.forEach(expense => {
      const date = new Date(expense.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const periodKey = `${year}-${month}`;
      
      if (!expensesByPeriod[periodKey]) {
        expensesByPeriod[periodKey] = [];
      }
      expensesByPeriod[periodKey].push(expense);
    });
    
    console.log("Dönem bazında şirket giderleri:", expensesByPeriod);
    
    // Her dönem için toplam hesapla
    Object.keys(expensesByPeriod).forEach(periodKey => {
      const periodExpenses = expensesByPeriod[periodKey];
      const total = periodExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
      console.log(`${periodKey} dönemi şirket giderleri:`, {
        items: periodExpenses,
        total: total,
        formattedTotal: total.toLocaleString('tr-TR') + '₺'
      });
    });
  };

  const callDebugAPI = async () => {
    try {
      const response = await fetch('/api/debug-periods');
      const data = await response.json();
      console.log("=== API DEBUG SONUÇLARI ===", data);
      alert("Debug sonuçları konsola yazdırıldı. F12 ile konsolu açarak detayları görebilirsiniz.");
    } catch (error) {
      console.error("API debug hatası:", error);
      alert("API debug hatası: " + error);
    }
  };

  // Test: Müşteri sayısı hesaplama
  const testCustomerCalculation = async () => {
    try {
      console.log("=== MÜŞTERİ SAYISI HESAPLAMA TESTİ ===");
      
      const toursResponse = await fetch('/api/tours');
      const toursData = await toursResponse.json();
      
      console.log("Toplam tur sayısı:", toursData.length);
      
      let totalCustomers = 0;
      let tourDetails = [];
      
      toursData.forEach((tour: any, index: number) => {
        // Müşteri sayısını doğru hesapla: Ana müşteri + ek katılımcılar
        let customerCount = 1; // Ana müşteri
        
        // Ek katılımcıları say
        if (tour.additionalCustomers && Array.isArray(tour.additionalCustomers)) {
          customerCount += tour.additionalCustomers.length;
        }
        
        // Alternatif olarak numberOfPeople alanını da kontrol et
        const numberOfPeople = Number(tour.numberOfPeople) || 0;
        if (numberOfPeople > customerCount) {
          customerCount = numberOfPeople; // numberOfPeople daha büyükse onu kullan
        }
        
        totalCustomers += customerCount;
        
        const detail = {
          turIndex: index + 1,
          tourName: tour.tourName || tour.customerName,
          numberOfPeople: tour.numberOfPeople,
          additionalCustomersCount: tour.additionalCustomers?.length || 0,
          calculatedCustomerCount: customerCount,
          tourDate: tour.tourDate
        };
        
        tourDetails.push(detail);
        
        console.log(`Tur ${index + 1}:`, detail);
      });
      
      console.log("=== ÖZET ===");
      console.log("Toplam hesaplanan müşteri sayısı:", totalCustomers);
      
      // Dönem verilerini de kontrol edelim
      console.log("\n=== DÖNEM VERİLERİ KARŞILAŞTIRMASI ===");
      const periodsResponse = await fetch('/api/periods');
      const periodsData = await periodsResponse.json();
      
      let totalPeriodCustomers = 0;
      periodsData.forEach((period: any) => {
        totalPeriodCustomers += period.customerCount || 0;
        console.log(`${period.year}-${period.month} dönemi müşteri sayısı:`, period.customerCount);
      });
      
      console.log("Dönemlerdeki toplam müşteri sayısı:", totalPeriodCustomers);
      
      if (totalCustomers !== totalPeriodCustomers) {
        console.warn("⚠️ UYARI: Hesaplanan müşteri sayısı ile dönemlerdeki toplam eşleşmiyor!");
        console.log("Fark:", Math.abs(totalCustomers - totalPeriodCustomers));
      } else {
        console.log("✅ Müşteri sayıları eşleşiyor!");
      }
      
    } catch (error) {
      console.error("Müşteri hesaplama testi hatası:", error);
    }
  };

  // Test: Tarih bazlı veri analizi
  const testDateBasedData = async () => {
    try {
      console.log("=== TARİH BAZLI VERİ ANALİZİ ===");
      console.log("Bugünün tarihi:", new Date().toLocaleDateString('tr-TR'));
      
      // Finansal verileri getir
      const financialResponse = await fetch('/api/financial');
      const financialData = await financialResponse.json();
      
      console.log("Toplam finansal kayıt:", financialData.length);
      
      // Tur verilerini getir
      const toursResponse = await fetch('/api/tours');
      const toursData = await toursResponse.json();
      
      console.log("Toplam tur kaydı:", toursData.length);
      
      // Tarih gruplamalarını yap
      const financialByPeriod: { [key: string]: any[] } = {};
      const toursByPeriod: { [key: string]: any[] } = {};
      
      // Finansal verileri dönem bazında grupla
      financialData.forEach((financial: any) => {
        if (!financial.date) return;
        
        const date = new Date(financial.date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const periodKey = `${year}-${String(month).padStart(2, '0')}`;
        
        if (!financialByPeriod[periodKey]) {
          financialByPeriod[periodKey] = [];
        }
        financialByPeriod[periodKey].push(financial);
      });
      
      // Tur verilerini dönem bazında grupla
      toursData.forEach((tour: any) => {
        if (!tour.tourDate) return;
        
        const date = new Date(tour.tourDate);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const periodKey = `${year}-${String(month).padStart(2, '0')}`;
        
        if (!toursByPeriod[periodKey]) {
          toursByPeriod[periodKey] = [];
        }
        toursByPeriod[periodKey].push(tour);
      });
      
      // Son 6 ayın verilerini göster
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;
        const periodKey = `${year}-${String(month).padStart(2, '0')}`;
        
        console.log(`\n=== ${year}/${String(month).padStart(2, '0')} DÖNEMİ ===`);
        
        const financials = financialByPeriod[periodKey] || [];
        const tours = toursByPeriod[periodKey] || [];
        
        console.log(`Finansal kayıt sayısı: ${financials.length}`);
        console.log(`Tur kayıt sayısı: ${tours.length}`);
        
        if (financials.length > 0) {
          console.log("Finansal kayıtlar:");
          financials.forEach((f, idx) => {
            console.log(`  ${idx + 1}. ${f.description} - ${f.amount}₺ (${f.type}) - ${f.date}`);
          });
          
          const income = financials.filter(f => f.type === 'income').reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
          const expenses = financials.filter(f => f.type === 'expense').reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
          console.log(`  Toplam gelir: ${income}₺`);
          console.log(`  Toplam gider: ${expenses}₺`);
        }
        
        if (tours.length > 0) {
          console.log("Tur kayıtları:");
          tours.forEach((t, idx) => {
            console.log(`  ${idx + 1}. ${t.tourName || t.customerName} - ${t.totalPrice}₺ - ${t.tourDate}`);
          });
          
          const tourIncome = tours.reduce((sum, t) => sum + (Number(t.totalPrice) || 0), 0);
          console.log(`  Toplam tur geliri: ${tourIncome}₺`);
        }
      }
      
    } catch (error) {
      console.error("Tarih bazlı analiz hatası:", error);
    }
  };

  if (loading) {
    return <div className="p-8">Veriler yükleniyor...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Firebase Dönem Verileri Test</h1>      <div className="space-y-4">
        <button 
          onClick={handleRecalculate}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Dönem Verilerini Yeniden Hesapla
        </button>
        
        <button 
          onClick={debugCompanyExpenses}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 ml-2"
        >
          Şirket Giderlerini Debug Et
        </button>
          <button 
          onClick={callDebugAPI}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ml-2"
        >
          API ile Debug Et
        </button>
        
        <button 
          onClick={testCustomerCalculation}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 ml-2"
        >
          Müşteri Sayısı Testi
        </button>

        <button 
          onClick={testCustomerCalculation}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 ml-2"
        >
          Müşteri Sayısı Testi
        </button>

        <button 
          onClick={testDateBasedData}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 ml-2"
        >
          Tarih Bazlı Analiz
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dönem Verileri */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Dönem Verileri ({periods.length} adet)</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {periods.map((period, index) => (
              <div key={period.id || index} className="bg-gray-50 p-3 rounded border">
                <div className="text-sm">
                  <strong>{period.year}/{period.month}</strong>
                </div>
                <div className="text-xs space-y-1 mt-2">
                  <div>Finansal Gelir: {period.financialIncome?.toLocaleString('tr-TR')}₺</div>
                  <div>Tur Geliri: {period.tourIncome?.toLocaleString('tr-TR')}₺</div>
                  <div className="text-red-600 font-semibold">
                    Şirket Giderleri: {period.companyExpenses?.toLocaleString('tr-TR')}₺
                  </div>
                  <div>Tur Giderleri: {period.tourExpenses?.toLocaleString('tr-TR')}₺</div>
                  <div>Tur Sayısı: {period.tourCount}</div>
                  <div>Müşteri Sayısı: {period.customerCount}</div>
                  <div>Durum: {period.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>        {/* Finansal Veriler */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Finansal Veriler ({financials.length} adet)</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {financials.map((financial, index) => (
              <div key={financial.id || index} className="bg-gray-50 p-3 rounded border">
                <div className="text-sm">
                  <strong>{financial.description}</strong>
                </div>
                <div className="text-xs space-y-1 mt-2">
                  <div>Tarih: {financial.date}</div>
                  <div className={financial.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                    Tutar: {financial.amount?.toLocaleString('tr-TR')}₺
                  </div>
                  <div>Tür: {financial.type === 'income' ? 'Gelir' : 'Gider'}</div>
                  <div>Kategori: {financial.category}</div>
                  {financial.tourId && <div className="text-blue-600">Tur ID: {financial.tourId}</div>}
                  {financial.relatedTourId && <div className="text-blue-600">İlgili Tur ID: {financial.relatedTourId}</div>}
                  {financial.type === 'expense' && !financial.tourId && !financial.relatedTourId && (
                    <div className="text-red-700 font-bold">→ ŞİRKET GİDERİ</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
