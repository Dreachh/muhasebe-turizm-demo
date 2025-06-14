"use client"

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, LineChart, RadarChart } from "@/components/ui/charts";

// Firebase bağlantıları
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { getDb } from "@/lib/firebase-client-module";
import { COLLECTIONS } from "@/lib/db-firebase";

// Renk skalası için tip tanımı
type ColorKey = 'blue' | 'blueAlpha' | 'red' | 'redAlpha' | 'green' | 'greenAlpha' | 'yellow' | 'yellowAlpha' | 'purple' | 'purpleAlpha' | 'orange' | 'orangeAlpha';

const colors: Record<ColorKey, string> = {
  blue: 'rgba(53, 162, 235, 0.5)',
  blueAlpha: 'rgba(53, 162, 235, 0.8)',
  red: 'rgba(255, 99, 132, 0.5)',
  redAlpha: 'rgba(255, 99, 132, 0.8)',
  green: 'rgba(75, 192, 192, 0.5)',
  greenAlpha: 'rgba(75, 192, 192, 0.8)',
  yellow: 'rgba(255, 206, 86, 0.5)',
  yellowAlpha: 'rgba(255, 206, 86, 0.8)',
  purple: 'rgba(153, 102, 255, 0.5)',
  purpleAlpha: 'rgba(153, 102, 255, 0.8)',
  orange: 'rgba(255, 159, 64, 0.5)',
  orangeAlpha: 'rgba(255, 159, 64, 0.8)',
};

// Veri tipleri
interface Debt {
  id: string;
  companyId: string;
  amount: number;
  currency: string;
  description: string;
  dueDate: Date | { toDate: () => Date } | any;
  status: 'unpaid' | 'partially_paid' | 'paid';
  paidAmount: number;
  notes?: string;
  createdAt: Date | { toDate: () => Date } | any;
  updatedAt: Date | { toDate: () => Date } | any;
}

interface Payment {
  id: string;
  companyId: string;
  debtId?: string;
  amount: number;
  currency: string;
  description: string;
  paymentDate: Date | { toDate: () => Date } | any;
  createdAt: Date | { toDate: () => Date } | any;
  updatedAt: Date | { toDate: () => Date } | any;
}

interface Supplier {
  id: string;
  name: string;
  type?: string;
  contactPerson?: string;
}

interface SupplierDebtAnalysisProps {
  selectedCurrency?: string;
  dateRange?: { from?: Date, to?: Date };
}

export function SupplierDebtAnalysis({ selectedCurrency = "all", dateRange }: SupplierDebtAnalysisProps) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState("summary");

  // Borç durumu için renk ataması
  const statusColors = {
    unpaid: colors.red,
    partially_paid: colors.yellow,
    paid: colors.green,
  };

  // Firebase'den veri çekme işlevi
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const db = getDb();

        // Tedarikçileri getir
        const suppliersQuery = query(collection(db, COLLECTIONS.COMPANIES));
        const suppliersSnapshot = await getDocs(suppliersQuery);
        const suppliersData = suppliersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Supplier[];
        setSuppliers(suppliersData);

        // Borçları getir
        const debtsQuery = query(collection(db, COLLECTIONS.DEBTS));
        const debtsSnapshot = await getDocs(debtsQuery);
        const debtsData = debtsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            dueDate: data.dueDate?.toDate?.() || new Date(),
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
          };
        }) as Debt[];
        setDebts(debtsData);

        // Ödemeleri getir
        const paymentsQuery = query(collection(db, COLLECTIONS.PAYMENTS));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const paymentsData = paymentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            paymentDate: data.paymentDate?.toDate?.() || new Date(),
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
          };
        }) as Payment[];
        setPayments(paymentsData);

        setLoading(false);
      } catch (err) {
        console.error("Veri çekme hatası:", err);
        setError("Veri yüklenirken bir hata oluştu.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtrelenmiş veri
  const filteredDebts = debts.filter(debt => {
    // Para birimi filtresi
    if (selectedCurrency !== "all" && debt.currency !== selectedCurrency) {
      return false;
    }

    // Tarih aralığı filtresi
    if (dateRange?.from && dateRange?.to) {
      const debtDate = debt.dueDate instanceof Date ? debt.dueDate : new Date(debt.dueDate);
      if (debtDate < dateRange.from || debtDate > dateRange.to) {
        return false;
      }
    }

    return true;
  });

  const filteredPayments = payments.filter(payment => {
    // Para birimi filtresi
    if (selectedCurrency !== "all" && payment.currency !== selectedCurrency) {
      return false;
    }

    // Tarih aralığı filtresi
    if (dateRange?.from && dateRange?.to) {
      const paymentDate = payment.paymentDate instanceof Date ? payment.paymentDate : new Date(payment.paymentDate);
      if (paymentDate < dateRange.from || paymentDate > dateRange.to) {
        return false;
      }
    }

    return true;
  });  // Borç durumu özeti
  const calculateDebtSummary = () => {
    // Para birimi bazında ayrı toplamlar tutuyoruz
    const debtsByCurrency: Record<string, number> = {};
    const paidByCurrency: Record<string, number> = {};
    const unpaidByCurrency: Record<string, number> = {};
    const partiallyPaidByCurrency: Record<string, number> = {};
    const fullyPaidByCurrency: Record<string, number> = {};
    
    // Özet bilgileri
    const summary = {
      unpaid: 0,
      partiallyPaid: 0,
      paid: 0,
      totalDebt: 0,
      totalPaid: 0,
      remainingDebt: 0,
      // Para birimi bazında toplamlar
      totalsByCurrency: {} as Record<string, {
        totalDebt: number,
        totalPaid: number,
        remaining: number,
        unpaid: number,
        partiallyPaid: number,
        paid: number
      }>,
    };

    // Borç hesaplamalarını yap - para birimi bazında
    filteredDebts.forEach(debt => {
      const amount = Number(debt.amount) || 0;
      const paidAmount = Number(debt.paidAmount) || 0;
      const currency = debt.currency || 'TRY';

      // Para birimi bazında borç toplamları
      if (!debtsByCurrency[currency]) {
        debtsByCurrency[currency] = 0;
        unpaidByCurrency[currency] = 0;
        partiallyPaidByCurrency[currency] = 0;
        fullyPaidByCurrency[currency] = 0;
        paidByCurrency[currency] = 0;
      }
      
      debtsByCurrency[currency] += amount;
      
      // Ödenen borç miktarını ekle
      paidByCurrency[currency] += paidAmount;
      
      // Para birimi ve duruma göre borç dağılımı
      if (debt.status === 'unpaid') {
        unpaidByCurrency[currency] += amount;
      } else if (debt.status === 'partially_paid') {
        partiallyPaidByCurrency[currency] += amount;
      } else if (debt.status === 'paid') {
        fullyPaidByCurrency[currency] += amount;
      }
    });
    
    // Ödemeleri ekle - borçlarla doğrudan ilişkilendirilmemiş ödemeler
    filteredPayments.forEach(payment => {
      // Eğer ödeme bir borçla ilişkilendirilmemişse, sadece genel ödemelere ekle
      if (!payment.debtId) {
        const amount = Number(payment.amount) || 0;
        const currency = payment.currency || 'TRY';
        
        if (!paidByCurrency[currency]) paidByCurrency[currency] = 0;
        paidByCurrency[currency] += amount;
      }
      // Borçla ilişkilendirilen ödemeler zaten borç üzerinde paidAmount olarak kaydedilmiştir
    });
    
    // Para birimi bazında özet hesapla
    const currencies = [...new Set([
      ...Object.keys(debtsByCurrency),
      ...Object.keys(paidByCurrency)
    ])];
    
    currencies.forEach(currency => {
      const totalDebtInCurrency = debtsByCurrency[currency] || 0;
      const totalPaidInCurrency = paidByCurrency[currency] || 0;
      const remainingInCurrency = Math.max(0, totalDebtInCurrency - totalPaidInCurrency);
      
      // Para birimi bazında özet bilgileri
      summary.totalsByCurrency[currency] = {
        totalDebt: totalDebtInCurrency,
        totalPaid: totalPaidInCurrency,
        remaining: remainingInCurrency,
        unpaid: unpaidByCurrency[currency] || 0,
        partiallyPaid: partiallyPaidByCurrency[currency] || 0,
        paid: fullyPaidByCurrency[currency] || 0
      };
      
      // Genel toplamlar (tek para birimi seçiliyse veya hepsi gösteriliyorsa)
      if (selectedCurrency === 'all' || selectedCurrency === currency) {
        summary.totalDebt += totalDebtInCurrency;
        summary.totalPaid += totalPaidInCurrency;
        summary.unpaid += unpaidByCurrency[currency] || 0;
        summary.partiallyPaid += partiallyPaidByCurrency[currency] || 0;
        summary.paid += fullyPaidByCurrency[currency] || 0;
      }
    });

    // Kalan borç hesabı
    summary.remainingDebt = Math.max(0, summary.totalDebt - summary.totalPaid);
    
    return summary;
  };  // Tedarikçi bazlı borç dağılımı
  const calculateSupplierDebtDistribution = () => {
    const distribution: Record<string, { 
      totalDebt: number, 
      supplierName: string,
      debtsByCurrency: Record<string, number>,
      paidByCurrency: Record<string, number>,
      remainingByCurrency: Record<string, number> 
    }> = {};
    
    // Önce borçları hesaplayalım
    filteredDebts.forEach(debt => {
      const companyId = debt.companyId;
      const amount = Number(debt.amount) || 0;
      const paidAmount = Number(debt.paidAmount) || 0;
      const currency = debt.currency || 'TRY';
      
      // Sadece veri tabanındaki aktif tedarikçileri al
      const supplier = suppliers.find(s => s.id === companyId);
      if (!supplier) return; // Tedarikçi bulunamazsa atla (silinmiş tedarikçileri dahil etmemek için)
      
      const supplierName = supplier.name || 'Bilinmeyen Tedarikçi';

      if (!distribution[companyId]) {
        distribution[companyId] = { 
          totalDebt: 0, 
          supplierName,
          debtsByCurrency: {},
          paidByCurrency: {},
          remainingByCurrency: {}
        };
      }
      
      // Para birimi bazında borçları ekle
      if (!distribution[companyId].debtsByCurrency[currency]) {
        distribution[companyId].debtsByCurrency[currency] = 0;
        distribution[companyId].paidByCurrency[currency] = 0;
        distribution[companyId].remainingByCurrency[currency] = 0;
      }
      
      distribution[companyId].debtsByCurrency[currency] += amount;
      distribution[companyId].paidByCurrency[currency] += paidAmount;
      
      // Kalan borç hesabı
      const remaining = amount - paidAmount;
      if (remaining > 0) {
        distribution[companyId].remainingByCurrency[currency] += remaining;
      }
      
      // Seçilen para birimine göre toplam borcu güncelle
      if (selectedCurrency === 'all' || selectedCurrency === currency) {
        // Kalan borcu kullan, toplam değil (ödenmiş borçları toplama)
        distribution[companyId].totalDebt += Math.max(0, remaining);
      }
    });
    
    // Ödemeleri ekle - borçlarla ilişkilendirilmemiş ödemeler için
    filteredPayments.forEach(payment => {
      if (!payment.debtId) {
        // Borçla ilişkilendirilmemiş ödemeleri, ilgili tedarikçiye ait bir borç varsa hesaba kat
        const companyId = payment.companyId;
        if (!companyId || !distribution[companyId]) return;
        
        const currency = payment.currency || 'TRY';
        const amount = Number(payment.amount) || 0;
        
        // Para birimi kontrolü yap
        if (!distribution[companyId].paidByCurrency[currency]) {
          distribution[companyId].paidByCurrency[currency] = 0;
        }
        
        // Ödemeyi ekle
        distribution[companyId].paidByCurrency[currency] += amount;
        
        // Kalan borçları güncelle
        if (distribution[companyId].remainingByCurrency[currency]) {
          distribution[companyId].remainingByCurrency[currency] = Math.max(
            0,
            distribution[companyId].debtsByCurrency[currency] - distribution[companyId].paidByCurrency[currency]
          );
        }
      }
    });
    
    // Sadece aktif kalan borcu olan tedarikçileri al
    const activeSuppliers = Object.values(distribution).filter(supplier => {
      // Her para birimi için kalan borçları hesapla
      let hasRemainingDebt = false;
      
      Object.entries(supplier.debtsByCurrency).forEach(([currency, amount]) => {
        const paid = supplier.paidByCurrency[currency] || 0;
        const remaining = Math.max(0, amount - paid);
        
        if (remaining > 0) {
          hasRemainingDebt = true;
          // Kalan borç değerlerini doğru şekilde güncelle
          supplier.remainingByCurrency[currency] = remaining;
        } else {
          supplier.remainingByCurrency[currency] = 0;
        }
      });
      
      return hasRemainingDebt;
    });
    
    // Toplam kalan borç değerlerini güncelle
    activeSuppliers.forEach(supplier => {
      let totalRemaining = 0;
      
      // Seçili para birimi veya tüm para birimleri için hesaplama yap
      Object.entries(supplier.remainingByCurrency).forEach(([currency, amount]) => {
        if (selectedCurrency === 'all' || selectedCurrency === currency) {
          totalRemaining += amount;
        }
      });
      
      supplier.totalDebt = totalRemaining;
    });
    
    console.log("Tedarikçi dağılımı", activeSuppliers);
    
    // En yüksek kalan borçtan en düşüğe sırala 
    // ve tüm aktif borçlu tedarikçileri göster (10'a kısıtlama)
    return activeSuppliers
      .sort((a, b) => b.totalDebt - a.totalDebt);
  };
  // Aktif borcu olan tedarikçi sayısını hesapla
  const calculateActiveSupplierCount = () => {
    // Para birimi bazında borç dağılımlarını hesapla
    const supplierDebtByIds: Record<string, Record<string, { debt: number, paid: number, remaining: number }>> = {};
    
    // Borçları hesapla
    filteredDebts.forEach(debt => {
      if (debt && debt.companyId) {
        const companyId = debt.companyId;
        const currency = debt.currency || 'TRY';
        const amount = Number(debt.amount) || 0;
        const paidAmount = Number(debt.paidAmount) || 0;
        
        // Tedarikçinin varlığını kontrol et
        if (!suppliers.some(s => s.id === companyId)) return;
        
        // Tedarikçi için kayıt oluştur
        if (!supplierDebtByIds[companyId]) {
          supplierDebtByIds[companyId] = {};
        }
        
        // Para birimi kaydı oluştur
        if (!supplierDebtByIds[companyId][currency]) {
          supplierDebtByIds[companyId][currency] = {
            debt: 0,
            paid: 0,
            remaining: 0
          };
        }
        
        // Borç değerlerini topla
        supplierDebtByIds[companyId][currency].debt += amount;
        supplierDebtByIds[companyId][currency].paid += paidAmount;
      }
    });
    
    // Borç ile ilişkilendirilmemiş ödemeleri ekle
    filteredPayments.forEach(payment => {
      if (!payment.debtId && payment.companyId) {
        const companyId = payment.companyId;
        const currency = payment.currency || 'TRY';
        const amount = Number(payment.amount) || 0;
        
        // Tedarikçinin borç kaydı yoksa atla
        if (!supplierDebtByIds[companyId]) return;
        
        // Para birimi kaydı yoksa oluştur
        if (!supplierDebtByIds[companyId][currency]) {
          supplierDebtByIds[companyId][currency] = {
            debt: 0,
            paid: 0,
            remaining: 0
          };
        }
        
        // Ödeme değerini ekle
        supplierDebtByIds[companyId][currency].paid += amount;
      }
    });
    
    // Kalan borçları hesapla ve borçlu tedarikçi sayısını bul
    let activeSupplierCount = 0;
    
    Object.keys(supplierDebtByIds).forEach(companyId => {
      let hasRemainingDebt = false;
      
      // Para birimi bazında kalan borçları hesapla
      Object.keys(supplierDebtByIds[companyId]).forEach(currency => {
        const record = supplierDebtByIds[companyId][currency];
        record.remaining = Math.max(0, record.debt - record.paid);
        
        // Seçili para birimi filtresi
        if ((selectedCurrency === 'all' || selectedCurrency === currency) && record.remaining > 0) {
          hasRemainingDebt = true;
        }
      });
      
      if (hasRemainingDebt) {
        activeSupplierCount++;
      }
    });
    
    return activeSupplierCount;
  };  // Aylık borç ve ödeme trendi
  const calculateMonthlyTrend = () => {
    // Para birimi bazında ayları takip etmek için
    interface MonthlyDataItem {
      month: string;
      debts: Record<string, number>;
      payments: Record<string, number>;
      remaining: Record<string, number>;
    }
    
    const monthlyData: Record<string, MonthlyDataItem> = {};
    
    // Son 12 ayı hazırla
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = new Intl.DateTimeFormat('tr-TR', { month: 'short' }).format(date);
      monthlyData[monthKey] = { 
        month: monthName, 
        debts: {}, // Para birimi bazında borçlar 
        payments: {}, // Para birimi bazında ödemeler
        remaining: {} // Para birimi bazında kalan borçlar
      };
    }

    // Her ay için birikimli veri hesapla
    const cumulativeDebts: Record<string, Record<string, number>> = {}; // Para birimi bazında birikimli borçlar
    const cumulativePayments: Record<string, Record<string, number>> = {}; // Para birimi bazında birikimli ödemeler
    
    // Borçları aylara ve para birimlerine göre topla
    filteredDebts.forEach(debt => {
      const currency = debt.currency || 'TRY';
      
      // Sadece seçili para birimi veya tüm para birimleri için işlem yap
      if (selectedCurrency !== "all" && currency !== selectedCurrency) return;
      
      const date = debt.createdAt instanceof Date ? debt.createdAt : new Date(debt.createdAt);
      
      // Tarih geçerliliğini kontrol et
      if (!date || isNaN(date.getTime())) {
        console.warn("Geçersiz borç tarihi bulundu:", debt);
        return;
      }
      
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = Number(debt.amount) || 0;
      
      // O aydan itibaren tüm aylarda birikimli olarak borçları ekle
      Object.keys(monthlyData).forEach(key => {
        if (key >= monthKey) {
          // Birikimli borç kaydı oluştur
          if (!cumulativeDebts[key]) cumulativeDebts[key] = {};
          if (!cumulativeDebts[key][currency]) cumulativeDebts[key][currency] = 0;
          
          cumulativeDebts[key][currency] += amount;
          
          // Birikimli değeri aylık veriye ekle
          if (!monthlyData[key].debts[currency]) monthlyData[key].debts[currency] = 0;
          monthlyData[key].debts[currency] = cumulativeDebts[key][currency];
        }
      });
    });

    // Ödemeleri aylara ve para birimlerine göre topla
    filteredPayments.forEach(payment => {
      const currency = payment.currency || 'TRY';
      
      // Sadece seçili para birimi veya tüm para birimleri için işlem yap
      if (selectedCurrency !== "all" && currency !== selectedCurrency) return;
      
      const date = payment.paymentDate instanceof Date ? payment.paymentDate : new Date(payment.paymentDate);
      
      // Tarih geçerliliğini kontrol et
      if (!date || isNaN(date.getTime())) {
        console.warn("Geçersiz ödeme tarihi bulundu:", payment);
        return;
      }
      
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = Number(payment.amount) || 0;
      
      // O aydan itibaren tüm aylarda birikimli olarak ödemeleri ekle
      Object.keys(monthlyData).forEach(key => {
        if (key >= monthKey) {
          // Birikimli ödeme kaydı oluştur
          if (!cumulativePayments[key]) cumulativePayments[key] = {};
          if (!cumulativePayments[key][currency]) cumulativePayments[key][currency] = 0;
          
          cumulativePayments[key][currency] += amount;
          
          // Birikimli değeri aylık veriye ekle
          if (!monthlyData[key].payments[currency]) monthlyData[key].payments[currency] = 0;
          monthlyData[key].payments[currency] = cumulativePayments[key][currency];
        }
      });
    });
    
    // Kalan borçları hesapla
    Object.keys(monthlyData).forEach(monthKey => {
      const monthData = monthlyData[monthKey];
      
      // Tüm para birimleri için kalan borcu hesapla
      const allCurrencies = [...new Set([
        ...Object.keys(monthData.debts),
        ...Object.keys(monthData.payments)
      ])];
      
      allCurrencies.forEach(currency => {
        const totalDebt = monthData.debts[currency] || 0;
        const totalPaid = monthData.payments[currency] || 0;
        const remaining = Math.max(0, totalDebt - totalPaid);
        
        if (!monthData.remaining[currency]) {
          monthData.remaining[currency] = 0;
        }
        
        monthData.remaining[currency] = remaining;
      });
    });
    
    // Para birimi bazında verileri genel grafiğe uygun formata dönüştür
    const result = Object.values(monthlyData).map(data => {
      let totalDebts = 0;
      let totalPayments = 0;
      let totalRemaining = 0;
      
      // Seçili para birimine göre toplama yap
      if (selectedCurrency !== "all") {
        totalDebts = data.debts[selectedCurrency] || 0;
        totalPayments = data.payments[selectedCurrency] || 0;
        totalRemaining = data.remaining[selectedCurrency] || 0;
      } else {
        // Tüm para birimlerini topla (burada parasaldeğer hesabı sadeleştirmek için)
        Object.keys(data.debts).forEach(currency => {
          const debt = data.debts[currency] || 0;
          const paid = data.payments[currency] || 0;
          const remaining = Math.max(0, debt - paid);
          
          totalDebts += debt;
          totalPayments += paid;
          totalRemaining += remaining;
        });
      }
      
      return {
        month: data.month,
        debts: totalDebts,
        payments: totalPayments,
        remaining: totalRemaining
      };
    });
      console.log("Aylık trend verileri:", result);

    return result;
  };

  // Tedarikçi bazlı borç dağılımı için bar grafik verileri
  const supplierDistributionData = () => {
    const supplierData = calculateSupplierDebtDistribution();
    
    // Veri yoksa boş grafik gösterme
    if (!supplierData.length) {
      return {
        labels: ['Veri Bulunamadı'],
        datasets: [
          {
            label: 'Kalan Borç',
            data: [0],
            backgroundColor: colors.red,
            borderColor: colors.redAlpha,
            borderWidth: 1,
          }
        ]
      };
    }
    
    if (selectedCurrency !== "all") {
      // Seçili para birimi varsa sadece o para birimindeki kalan borçları göster
      return {
        labels: supplierData.map(item => item.supplierName),
        datasets: [
          {
            label: `Kalan Borç (${selectedCurrency})`,
            data: supplierData.map(item => {
              // Doğrudan kalan borcu kullan
              return item.remainingByCurrency[selectedCurrency] || 0;
            }),
            backgroundColor: colors.red,
            borderColor: colors.redAlpha,
            borderWidth: 1,
          }
        ],
      };
    } else {
      // Tüm para birimleri için sadece kalan borçları gösteren ayrı grafikler oluştur
      const currencies = Array.from(new Set(
        supplierData.flatMap(item => Object.keys(item.remainingByCurrency))
      )).filter(currency => {
        // Sadece kalan borcu olan para birimlerini göster
        return supplierData.some(item => (item.remainingByCurrency[currency] || 0) > 0);
      });
      
      // Her para birimi için ayrı bir dataset oluştur
      return {
        labels: supplierData.map(item => item.supplierName),
        datasets: currencies.map((currency, index) => {          // Para birimi başına renk seçimi - daha ayırt edici renkler için
          const colorOptions = [
            'red', 'blue', 'green', 'yellow', 'purple', 'orange'
          ] as const;
          const colorKey = colorOptions[index % colorOptions.length];
          // Alpha versiyonunu alacak şekilde renk seçimi yap
          const alphaKey = (colorKey + 'Alpha') as ColorKey;
          
          return {
            label: `Kalan Borç (${currency})`,
            data: supplierData.map(item => {
              // Doğrudan hesaplanmış kalan borç değerini kullan
              return item.remainingByCurrency[currency] || 0;
            }),
            backgroundColor: colors[colorKey as ColorKey],
            borderColor: colors[alphaKey] || colors[colorKey as ColorKey],
            borderWidth: 1,
          };
        })
      };
    }
  };  // Aylık trend için çizgi grafik verileri
  const monthlyTrendData = () => {
    const trendData = calculateMonthlyTrend();
    
    return {
      labels: trendData.map(item => item.month),
      datasets: [
        {
          label: 'Toplam Borç' + (selectedCurrency !== "all" ? ` (${selectedCurrency})` : ''),
          data: trendData.map(item => item.debts),
          backgroundColor: colors.red,
          borderColor: colors.redAlpha,
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: 'Toplam Ödeme' + (selectedCurrency !== "all" ? ` (${selectedCurrency})` : ''),
          data: trendData.map(item => item.payments),
          backgroundColor: colors.green,
          borderColor: colors.greenAlpha,
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: 'Kalan Borç' + (selectedCurrency !== "all" ? ` (${selectedCurrency})` : ''),
          data: trendData.map(item => item.remaining),
          backgroundColor: colors.yellow,
          borderColor: colors.yellowAlpha,
          borderWidth: 2,
          tension: 0.3,
          fill: false,
          pointRadius: 4,
          pointBorderColor: colors.yellowAlpha,
        },
      ],
    };
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Tedarikçi Borç Analizi</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-sm text-gray-500">Veriler yükleniyor...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Tedarikçi Borç Analizi</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  // Özet verileri
  const summary = calculateDebtSummary();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-[#00a1c6]">Tedarikçi Borç Analizi</CardTitle>
      </CardHeader>
      <CardContent>        {/* Özet Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white border-l-4 border-blue-500">
            <CardContent className="py-4">
              <div className="text-sm text-gray-500">Toplam Borç</div>
              {selectedCurrency !== "all" ? (
                <div className="text-2xl font-bold mt-1">{summary.totalDebt.toLocaleString()} {selectedCurrency}</div>
              ) : (
                <div>
                  {Object.entries(summary.totalsByCurrency).map(([currency, data]) => (
                    <div key={currency} className="text-lg font-bold">
                      {data.totalDebt.toLocaleString()} {currency}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4 border-green-500">
            <CardContent className="py-4">
              <div className="text-sm text-gray-500">Ödenen Miktar</div>
              {selectedCurrency !== "all" ? (
                <div className="text-2xl font-bold mt-1">{summary.totalPaid.toLocaleString()} {selectedCurrency}</div>
              ) : (
                <div>
                  {Object.entries(summary.totalsByCurrency).map(([currency, data]) => (
                    <div key={currency} className="text-lg font-bold">
                      {data.totalPaid.toLocaleString()} {currency}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4 border-red-500">
            <CardContent className="py-4">
              <div className="text-sm text-gray-500">Kalan Borç</div>
              {selectedCurrency !== "all" ? (
                <div className="text-2xl font-bold mt-1">{summary.remainingDebt.toLocaleString()} {selectedCurrency}</div>
              ) : (
                <div>
                  {Object.entries(summary.totalsByCurrency).map(([currency, data]) => (
                    data.remaining > 0 && (
                      <div key={currency} className="text-lg font-bold">
                        {data.remaining.toLocaleString()} {currency}
                      </div>
                    )
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4 border-yellow-500">
            <CardContent className="py-4">
              <div className="text-sm text-gray-500">Borçlu Tedarikçi</div>
              <div className="text-2xl font-bold mt-1">{calculateActiveSupplierCount()}</div>
              <div className="text-xs text-gray-500">Toplam: {suppliers.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Grafik Sekmeleri */}
        <Tabs defaultValue="summary" value={activeChart} onValueChange={setActiveChart} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="summary">Durum Özeti</TabsTrigger>
            <TabsTrigger value="distribution">Tedarikçi Dağılımı</TabsTrigger>
            <TabsTrigger value="trend">Aylık Trend</TabsTrigger>
          </TabsList>          <TabsContent value="summary" className="h-80">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Durum Özeti</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCurrency !== "all" ? (
                  // Tek para birimi seçilmiş durumda
                  <table className="min-w-full divide-y divide-gray-200">
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="py-2 text-sm text-gray-500">Toplam Borç</td>
                        <td className="py-2 text-sm font-medium text-right">{summary.totalDebt.toLocaleString()} {selectedCurrency}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-sm text-gray-500">Ödenen Miktar</td>
                        <td className="py-2 text-sm font-medium text-right">{summary.totalPaid.toLocaleString()} {selectedCurrency}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-sm text-gray-500">Kalan Borç</td>
                        <td className="py-2 text-sm font-medium text-right">{summary.remainingDebt.toLocaleString()} {selectedCurrency}</td>
                      </tr>
                      <tr className="bg-gray-100">
                        <td colSpan={2} className="py-2 text-sm font-semibold">Borç Durumu</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-sm text-gray-500">Ödenmemiş Borç</td>
                        <td className="py-2 text-sm font-medium text-right">{summary.unpaid.toLocaleString()} {selectedCurrency}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-sm text-gray-500">Kısmi Ödenmiş Borç</td>
                        <td className="py-2 text-sm font-medium text-right">{summary.partiallyPaid.toLocaleString()} {selectedCurrency}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-sm text-gray-500">Ödenmiş Borç</td>
                        <td className="py-2 text-sm font-medium text-right">{summary.paid.toLocaleString()} {selectedCurrency}</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="py-2 text-sm font-medium">Ödeme Oranı</td>
                        <td className="py-2 text-sm font-medium text-right">
                          {summary.totalDebt ? Math.round((summary.totalPaid / summary.totalDebt) * 100) : 0}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  // Tüm para birimleri yan yana görüntüleniyor
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(summary.totalsByCurrency).map(([currency, data]) => (
                      <div key={currency} className="flex-1 min-w-[250px] border rounded-md p-3">
                        <div className="bg-gray-100 py-2 px-3 rounded mb-2 text-sm font-semibold">
                          {currency} Borç Durumu
                        </div>
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-gray-200">
                            <tr>
                              <td className="py-1 text-gray-500">Toplam Borç</td>
                              <td className="py-1 font-medium text-right">{data.totalDebt.toLocaleString()} {currency}</td>
                            </tr>
                            <tr>
                              <td className="py-1 text-gray-500">Ödenen Miktar</td>
                              <td className="py-1 font-medium text-right">{data.totalPaid.toLocaleString()} {currency}</td>
                            </tr>
                            <tr>
                              <td className="py-1 text-gray-500">Kalan Borç</td>
                              <td className="py-1 font-medium text-right">{data.remaining.toLocaleString()} {currency}</td>
                            </tr>
                            <tr>
                              <td className="py-1 text-gray-500">Ödeme Oranı</td>
                              <td className="py-1 font-medium text-right">
                                {data.totalDebt ? Math.round((data.totalPaid / data.totalDebt) * 100) : 0}%
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1 text-gray-500">Ödenmemiş</td>
                              <td className="py-1 font-medium text-right">{data.unpaid.toLocaleString()} {currency}</td>
                            </tr>
                            <tr>
                              <td className="py-1 text-gray-500">Kısmi Ödenmiş</td>
                              <td className="py-1 font-medium text-right">{data.partiallyPaid.toLocaleString()} {currency}</td>
                            </tr>
                            <tr>
                              <td className="py-1 text-gray-500">Ödenmiş</td>
                              <td className="py-1 font-medium text-right">{data.paid.toLocaleString()} {currency}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution" className="h-80">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">En Yüksek Borç Sahibi Tedarikçiler (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>                <div className="w-full h-64">
                  <BarChart data={supplierDistributionData()} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trend" className="h-80">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Son 12 Ay Borç-Ödeme Trendi</CardTitle>
              </CardHeader>
              <CardContent>                <div className="w-full h-64">
                  <LineChart data={monthlyTrendData()} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
