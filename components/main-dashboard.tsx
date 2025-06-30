"use client"

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, Calendar, Globe, FileText, BarChart2, Settings, Save, BookOpen, MapPin, Clock, Phone, Building2 } from "lucide-react"
import { formatCurrency, formatCurrencyGroups, calculateTourExpenses, calculateTourTotals, calculateTourProfit } from "@/lib/data-utils"
import { Button } from "@/components/ui/button"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Checkbox } from "@/components/ui/checkbox"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { fetchExchangeRates } from "@/lib/currency-service"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getDestinations, getTourTemplates, getReservationDestinations } from "@/lib/db-firebase"

// Currency display style
import styles from "./money-display.module.css";

// --- Tipler (app/page.tsx'den kopyalandı) ---
interface TourActivity {
  id: string;
  activityId: string;
  name: string;
  date: string;
  duration?: string;
  price: number | string;
  currency: string;
  participants: string | number;
  participantsType: string;
  companyId: string;
  details?: string;
  partialPaymentAmount?: string | number;
  partialPaymentCurrency?: string;
}

interface TourAdditionalCustomer {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  idNumber?: string;
  address?: string;
}

interface TourExpense {
  id: string;
  type: string;
  name: string;
  amount: string | number;
  currency: string;
  details?: string;
  isIncludedInPrice: boolean;
  rehberInfo?: string;
  transferType?: string;
  transferPerson?: string;
  acentaName?: string;
  provider?: string;
  description?: string;
  date?: string | Date;
  category?: string;
  companyId?: string;
  companyName?: string;
}

interface TourData {
  id: string;
  serialNumber?: string;
  tourName?: string;
  tourDate: string | Date;
  tourEndDate?: string | Date;
  numberOfPeople: number;
  numberOfChildren: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerIdNumber?: string;
  customerTC?: string;
  customerPassport?: string;
  customerDrivingLicense?: string;
  customerAddress?: string;
  pricePerPerson: string | number;
  totalPrice: string | number;
  currency?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  partialPaymentAmount?: string | number;
  partialPaymentCurrency?: string;
  notes?: string;
  activities?: TourActivity[];
  companyName?: string;
  additionalCustomers?: TourAdditionalCustomer[];
  expenses?: TourExpense[];
  nationality?: string;
  destination?: string;
  destinationId?: string;
  destinationName?: string;
  referralSource?: string;
  createdAt?: string;
  updatedAt?: string;
  selectedTourName?: string; // Seçilen tur şablonunun adını kaydetmek için
}

interface FinancialData {
  id: string;
  date: string | Date;
  type: string;
  category?: string;
  description?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  relatedTourId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CustomerData {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  idNumber?: string;
  citizenship?: string;
  address?: string;
}

interface Rate {
  code: string;
  name: string;
  buying: number;
  selling: number;
}

interface MainDashboardProps {
  onNavigate: (view: string) => void;
  financialData?: FinancialData[];
  toursData?: TourData[];
  customersData?: CustomerData[];
  reservationsData?: any[]; // Rezervasyon verileri için yeni prop
}

// finance.amount'ın string olup olmadığını kontrol et, değilse 0 döndür
const getFinanceAmount = (amount: unknown): number => {
  if (typeof amount === "string") {
    return parseFloat(amount.replace(/[^\d.-]/g, ""));
  } else if (typeof amount === "number") {
    return amount;  }
  return 0;
};

// Helper functions for reservations table
const formatCurrencyLocal = (amount: string | number, currency: string) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return amount;
  
  const formatted = numAmount.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  
  if (currency === 'EUR') {
    return `${formatted} €`;
  } else if (currency === 'USD') {
    return `${formatted} $`;
  } else if (currency === 'TRY' || currency === 'TL') {
    return `${formatted} ₺`;
  }
  return `${formatted} ${currency}`;
}

const splitCustomerName = (fullName: string) => {
  if (!fullName) return { line1: '', line2: '' };
  
  const words = fullName.trim().split(' ');
  if (words.length <= 2) {
    return { line1: fullName, line2: '' };
  }
  
  const midpoint = Math.ceil(words.length / 2);
  const line1 = words.slice(0, midpoint).join(' ');
  const line2 = words.slice(midpoint).join(' ');
  
  return { line1, line2 };
}

const formatPhoneNumber = (phone: string) => {
  if (!phone) return { line1: '', line2: '' };
  
  // Telefon numarasını olduğu gibi tek satırda göster
  return { line1: phone || "-", line2: '' };
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "tamamlandı":
    case "completed":
      return <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1">Tamamlandı</Badge>;
    case "beklemede":
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1">Beklemede</Badge>;
    case "kısmi":
    case "partial":
      return <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-1">Kısmi</Badge>;
    case "iade":
    case "refunded":
      return <Badge className="bg-red-100 text-red-800 text-xs px-2 py-1">İade</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800 text-xs px-2 py-1">{status || "Bilinmiyor"}</Badge>;
  }
}

export function MainDashboard({ onNavigate, financialData = [], toursData = [], customersData = [], reservationsData = [] }: MainDashboardProps) {
  // Döviz kurları için state'ler
  const [rates, setRates] = useState<Rate[]>([]);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Döviz kurlarını yükle
  const loadExchangeRates = async () => {
    setIsLoadingRates(true);
    try {
      const data = await fetchExchangeRates();
      setRates(data.rates);
      setLastUpdate(new Date(data.lastUpdated || new Date()));
    } catch (error) {
      console.error("Döviz kurları yüklenemedi:", error);
    }
    setIsLoadingRates(false);
  };

  // Bileşen yüklendiğinde döviz kurlarını getir
  React.useEffect(() => {
    loadExchangeRates();
  }, []);

  // Tüm tur satışlarını dahil et (tarih filtresi yok)

  // Finansal Gelir (sadece finansal kayıtlar)
  const incomeByCurrency = financialData
    .filter((item: FinancialData) => item.type === "income")
    .reduce<Record<string, number>>((acc, item: FinancialData) => {
      const currency = item.currency || "TRY";
      const amount = Number.parseFloat(item.amount?.toString() || "0") || 0;
      acc[currency] = (acc[currency] || 0) + amount;
      return acc;
    }, {});

  // Finansal Gider (sadece finansal kayıtlar, Tur Gideri hariç)
  const expenseByCurrency = financialData
    .filter((item: FinancialData) => item.type === "expense" && item.category !== "Tur Gideri")
    .reduce<Record<string, number>>((acc, item: FinancialData) => {
      const currency = item.currency || "TRY";
      const amount = Number.parseFloat(item.amount?.toString() || "0") || 0;
      acc[currency] = (acc[currency] || 0) + amount;
      return acc;
    }, {});
  // Tur Geliri: Tüm turların gerçek toplam değeri (ödeme durumundan bağımsız)
  const tourIncomeByCurrency = toursData.reduce<Record<string, number>>((acc, tour: TourData) => {
    // Ana tur tutarını ekle
    const tourCurrency = tour.currency || 'TRY';
    const tourTotal = Number(tour.totalPrice) || 0;
    if (tourTotal > 0) {
      acc[tourCurrency] = (acc[tourCurrency] || 0) + tourTotal;
    }
    
    // Aktivitelerin toplamını da ekle (farklı para biriminde olanları ayrı ayrı göster)
    if (Array.isArray(tour.activities)) {
      tour.activities.forEach((act: TourActivity) => {
        const actCurrency = act.currency || tourCurrency;
        const actPrice = Number(act.price) || 0;
        let actParticipants = 0;
        
        // Katılımcı sayısını doğru şekilde belirle
        if (act.participantsType === 'all') {
          actParticipants = Number(tour.numberOfPeople) || 0;
        } else {
          actParticipants = Number(act.participants) || 0;
        }
        
        const activityTotal = actPrice * actParticipants;
        if (activityTotal > 0) {
          acc[actCurrency] = (acc[actCurrency] || 0) + activityTotal;
        }
      });
    }
    
    return acc;
  }, {});

  // Tur Gideri: Turların expenses dizisinden gelen tüm giderleri topla (Veri Görünümü ile tutarlı olması için)
  const tourExpenseByCurrency = (() => {
    const result: Record<string, number> = {};
    
    // Her turun expenses dizisini dolaş ve giderleri topla
    toursData.forEach((tour: TourData) => {
      if (Array.isArray(tour.expenses)) {
        tour.expenses.forEach((expense: TourExpense) => {
          if (!expense) return;
          
          const currency = expense.currency || tour.currency || "TRY";
          let amount = 0;
          
          if (typeof expense.amount === "number") {
            amount = expense.amount;
          } else if (typeof expense.amount === "string") {
            const cleanedAmount = expense.amount.replace(/[^\d.,]/g, '').replace(',', '.');
            amount = parseFloat(cleanedAmount);
          }
          
          if (!isNaN(amount) && amount > 0) {
            result[currency] = (result[currency] || 0) + amount;
          }
        });
      }
    });
    
    return result;
  })();

  // Kasa hesaplaması: Net tur karı + finansal gelir - finansal gider
  const cashBoxByCurrency = (() => {
    const result: Record<string, number> = {};
    
    // Tüm para birimlerini topla
    const allCurrencies = new Set([
      ...Object.keys(tourIncomeByCurrency),
      ...Object.keys(tourExpenseByCurrency),
      ...Object.keys(incomeByCurrency),
      ...Object.keys(expenseByCurrency)
    ]);
    
    allCurrencies.forEach(currency => {
      const tourIncome = tourIncomeByCurrency[currency] || 0;
      const tourExpense = tourExpenseByCurrency[currency] || 0;
      const financialIncome = incomeByCurrency[currency] || 0;
      const financialExpense = expenseByCurrency[currency] || 0;
      
      // Net tur karı + net finansal sonuç
      const netTourProfit = tourIncome - tourExpense;
      const netFinancialResult = financialIncome - financialExpense;
      const totalCash = netTourProfit + netFinancialResult;
      
      if (totalCash !== 0) {
        result[currency] = totalCash;
      }
    });
    
    return result;
  })();

  // Toplam müşteri sayısı
  const totalCustomers = customersData.length

  // Yaklaşan turlar (bugünden sonraki turlar, eksik veri varsa fallback)
  const today = new Date();
  const upcomingTours = toursData.filter((item: TourData) => {
    if (!item || !item.tourDate) return false;
    const tourDate = new Date(item.tourDate);
    return tourDate > today;
  });

  // Sayfalama için tek bir state
  const PAGE_SIZE = 6;
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFinancialPage, setCurrentFinancialPage] = useState(1);
    // Tur satışları için tarih filtresi
  const [tourDateRange, setTourDateRange] = useState<DateRange | undefined>();
  const [isTourDateFilterActive, setIsTourDateFilterActive] = useState(false);

  // Finansal kayıtlar için tarih filtresi
  const [financialDateRange, setFinancialDateRange] = useState<DateRange | undefined>();
  const [isFinancialDateFilterActive, setIsFinancialDateFilterActive] = useState(false);
    const [reservationDateRange, setReservationDateRange] = useState<DateRange | undefined>();
  const [isReservationDateFilterActive, setIsReservationDateFilterActive] = useState(false);
  // Data for resolving IDs to names
  const [destinations, setDestinations] = useState<any[]>([]);
  const [tourTemplates, setTourTemplates] = useState<any[]>([]);

  // Load destinations and tour templates for ID resolution
  useEffect(() => {
    const loadData = async () => {
      try {
        const [destinationsData, templatesData] = await Promise.all([
          getReservationDestinations(),
          getTourTemplates()
        ]);
        setDestinations(destinationsData);
        setTourTemplates(templatesData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  // Helper functions to resolve IDs to names
  const getDestinationName = (destinationId: string, reservation?: any) => {
    // Önce rezervasyondan destinationName'i al (eğer "Bilinmeyen" değilse)
    if (reservation?.destinationName && reservation.destinationName !== "Bilinmeyen") {
      return reservation.destinationName;
    }
    
    // Fallback: destinations prop'undan arama yap
    const destination = destinations.find(d => d.id === destinationId);
    if (destination) {
      return destination.name || destination.title || destinationId;
    }
    
    // Son fallback: ID'yi olduğu gibi döndür ama uzunsa kısalt
    return destinationId || 'Belirlenmemiş';
  };

  const getTourTemplateName = (templateId: string) => {
    const template = tourTemplates.find(t => t.id === templateId);
    return template ? (template.name || template.title || templateId) : templateId;
  };

  // Tur ve finans verilerini birleştir ve tarihe göre sırala
  const combinedTransactions = (() => {
    // Tur satışları
    const tourTransactions = toursData.map((tour: TourData) => ({
      id: tour.id,
      type: 'tour',
      date: tour.tourDate,
      serialNumber: tour.serialNumber || tour.id?.slice(-4) || "INV",
      name: tour.tourName,
      customerName: tour.customerName,
      selectedTourName: tour.selectedTourName || "", // Seçilen tur şablonu adını doğrudan ekleyelim
      destination: tour.destinationName || "", // Destinasyon adını da ekleyelim
      amount: tour.totalPrice,
      currency: tour.currency,
      status: tour.paymentStatus,
      originalData: tour
    }));
    
    // Tur giderlerini tur bazında grupla
    const tourExpenseGroups: Record<string, any> = {};
    const regularFinancialTransactions: any[] = [];
    
    // Gelir ve giderler için ayrı sayaçlar oluştur ve 1'den başlat
    let incomeCounter = 1;
    let expenseCounter = 1;
    
    // Tüm tur satışları için boş gruplar oluştur (hiç gideri olmayanları bile göstermek için)
    toursData.forEach((tour: TourData) => {
      const tourId = tour.id;
      const tourSerialNumber = tour.serialNumber || "";
      
      // Eğer tur için henüz bir gider grubu yoksa oluştur
      if (!tourExpenseGroups[tourId]) {
        tourExpenseGroups[tourId] = {
          id: `tourexp-${tourId}`,
          type: 'finance',
          date: tour.tourDate, // Tur başlangıç tarihini kullan
          serialNumber: `${tourSerialNumber}TF`, // 1501TF gibi bir format
          name: 'Tur Gider Toplamı',
          customerName: `${tour.customerName || "Müşteri"} - Tur Satışı Toplam Gideri`,
          amount: 0,
          currency: tour.currency || 'TRY',
          status: 'expense', // Gider olarak işaretle
          category: 'Tur Gideri',
          tourId: tourId,
          originalData: {
            id: `tourexp-${tourId}`,
            type: 'expense',
            category: 'Tur Gideri',
            relatedTourId: tourId,
            expenses: [] // İlgili giderleri burada toplayacağız
          }
        };
      }
    });
    
    // Turlar ve tur giderleri için basitleştirilmiş gruplama - Veri Görünümü ile aynı mantık
    toursData.forEach((tour: TourData) => {
      const tourId = tour.id;
      
      // Eğer bu tur için bir gider grubu varsa, yeni utility fonksiyonlarını kullan
      if (tourExpenseGroups[tourId]) {
        // Tur giderlerini hesapla (Veri Görünümü ile aynı mantık)
        const tourExpenses = calculateTourExpenses(tour);
        
        // Toplam gider tutarını güncelle
        const totalExpenses = Object.values(tourExpenses).reduce((sum: number, val: unknown) => sum + (typeof val === 'number' ? val : 0), 0);
        tourExpenseGroups[tourId].amount = totalExpenses;
        tourExpenseGroups[tourId].expensesByCurrency = tourExpenses;
        
        // Gider detaylarını ekle
        if (tour.expenses && Array.isArray(tour.expenses)) {
          tour.expenses.forEach((expense: TourExpense) => {
            if (expense) {
              tourExpenseGroups[tourId].originalData.expenses.push({
                ...expense,
                relatedTourId: tourId,
                type: 'expense',
                category: expense.type || 'Tur Gideri'
              });
            }
          });
        }
      }
    });
    
    // Finansal işlemleri grupla
    financialData.forEach((finance: FinancialData) => {
      // Tur giderleri için ilgili turun seri numarasını kullan
      let serialNumber;
      let displayDate = finance.date; // Varsayılan olarak işlem tarihi
      
      // Eğer tur ile ilişkili bir gider ise grupla - bu giderler zaten yukarıda eklendiği için tekrar eklemeye gerek yok
      if (finance.relatedTourId && finance.type === "expense" && finance.category === "Tur Gideri") {
        // Bu giderler zaten yukarıda eklendiği için burada bir şey yapmıyoruz
        // Böylece aynı gider iki kez eklenmemiş olur
      } else {
        // Normal finans kaydı için gelir veya gidere göre sıralı numara ata
        if (finance.type === "income") {
          serialNumber = `${incomeCounter++}F`;
        } else {
          serialNumber = `${expenseCounter++}F`;
        }
        
        // Tutarı doğru şekilde al
        const amount = getFinanceAmount(finance.amount);
        
        regularFinancialTransactions.push({
          id: finance.id,
          type: 'finance',
          date: displayDate,
          serialNumber: serialNumber,
          name: (finance.type as string) === "income" ? "Gelir Kaydı" : "Gider Kaydı",
          customerName: finance.description || '-',
          amount: amount,
          currency: finance.currency,
          status: finance.type,
          category: finance.category || 'Genel',
          originalData: finance
        });
      }
    });
    
    // Sadece gider tutarı olan (0'dan büyük) grupları filtrele
    const tourExpenseTransactions = Object.values(tourExpenseGroups).filter(
      (group: any) => group.amount > 0
    );
    
    // Tüm işlemleri birleştir - tarih filtresi yok
    return [...tourTransactions, ...tourExpenseTransactions, ...regularFinancialTransactions];
  })()
  .sort((a: { date: string | Date }, b: { date: string | Date }) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });
  
  const totalPages = Math.ceil(combinedTransactions.length / PAGE_SIZE);

  // Her para birimi için TUR TOPLAMI gösterir - artık ödenmiş tutarı değil
  const getTourTotalString = (tour: TourData) => {
    const totals: Record<string, number> = {};
    
    // Tur ana tutarını her zaman göster (ödeme durumundan bağımsız)
    const tourCurrency = tour.currency || 'TRY';
    const tourTotal = Number(tour.totalPrice) || 0;
    
    // Ana tur tutarını ekle
    if (tourTotal > 0) {
      totals[tourCurrency] = (totals[tourCurrency] || 0) + tourTotal;
    }
    
    // Tur aktivitelerinin toplamını da ekle (farklı para biriminde olanları ayrı ayrı göster)
    if (Array.isArray(tour.activities)) {
      tour.activities.forEach((act: TourActivity) => {
        const actCurrency = act.currency || tourCurrency;
        const actPrice = Number(act.price) || 0;
        let actParticipants = 0;
        
        // Katılımcı sayısını doğru şekilde belirle
        if (act.participantsType === 'all') {
          actParticipants = Number(tour.numberOfPeople) || 0;
        } else {
          actParticipants = Number(act.participants) || 0;
        }
        
        // Aktivite toplam fiyatını hesapla ve ekle
        const activityTotal = actPrice * actParticipants;
        if (activityTotal > 0) {
          // Para birimi bazında toplama ekle
          totals[actCurrency] = (totals[actCurrency] || 0) + activityTotal;
        }
      });
    }
    
    // formatCurrencyGroups fonksiyonunu kullanarak formatlı string döndür
    if (Object.keys(totals).length === 0) {
      return '-'; // Tutar yoksa - göster
    }
    
    return formatCurrencyGroups(totals);
  };  // Helper function to format phone numbers for 2-line display
  const formatPhoneNumber = (phone: string | undefined) => {
    if (!phone) return { line1: "+90", line2: "" };
    
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +90, assume it's a Turkish number
    let number = cleaned;
    if (!number.startsWith('+90')) {
      if (number.startsWith('90')) {
        number = '+' + number;
      } else if (number.startsWith('0')) {
        number = '+90' + number.substring(1);
      } else {
        number = '+90' + number;
      }
    }
    
    // Split into 2 lines: +90 545 on first line, rest on second line
    if (number.length >= 13) {
      const formatted = number.replace(/(\+90)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2|$3 $4 $5');
      const parts = formatted.split('|');
      return { line1: parts[0], line2: parts[1] || "" };
    }
    
    return { line1: number, line2: "" };
  };

  // Helper function to split customer name into 2 lines
  const splitCustomerName = (fullName: string) => {
    if (!fullName) return { line1: "", line2: "" };
    
    const words = fullName.split(' ');
    if (words.length <= 2) {
      return { line1: words[0] || "", line2: words[1] || "" };
    }
    
    const midPoint = Math.ceil(words.length / 2);
    const line1 = words.slice(0, midPoint).join(' ');
    const line2 = words.slice(midPoint).join(' ');
    
    return { line1, line2 };
  };

  // Helper function to format currency
  const formatCurrencyLocal = (amount: string | number, currency: string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return amount;
    
    const formatted = numAmount.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    
    if (currency === 'EUR') {
      return `${formatted} €`;
    } else if (currency === 'USD') {
      return `${formatted} $`;
    } else if (currency === 'TRY' || currency === 'TL') {
      return `${formatted} ₺`;
    }
    return `${formatted} ${currency}`;
  };

  // Status badge function like in rezervasyon-liste
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "Ödendi": "bg-green-100 text-green-800 text-[8px] px-1 py-0.5 h-4 text-center",
      "Bekliyor": "bg-yellow-100 text-yellow-800 text-[8px] px-1 py-0.5 h-4 text-center", 
      "Kısmi Ödendi": "bg-blue-100 text-blue-800 text-[8px] px-1 py-0.5 h-4 text-center whitespace-nowrap",
      "İptal": "bg-red-100 text-red-800 text-[8px] px-1 py-0.5 h-4 text-center"
    } as const
    
    const className = statusConfig[status as keyof typeof statusConfig] || statusConfig["Bekliyor"]
    return <Badge className={className}>{status}</Badge>
  };

  // Ana ekranda sadece göstergeler olacak, menü butonları kaldırıldı
  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-10">
      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Döviz Kurları - En sola taşındı */}
        <Card className="border-l-4 border-l-fuchsia-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("currency")}>
          <CardContent className="pt-2 pb-3 px-2 relative">
            <div className="flex flex-col items-start justify-start pt-0">
              <div className="w-full">
                <div className="flex items-center space-x-2 sm:space-x-3 mb-2 px-2">
                  <span className="bg-fuchsia-100 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                    <Globe className="h-3 w-3 sm:h-4 sm:w-4 text-fuchsia-500" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-base font-bold text-muted-foreground text-left whitespace-nowrap">Döviz Kurları</h3>
                  </div>
                </div>
                
                {isLoadingRates ? (
                  <div className="text-xs sm:text-sm text-muted-foreground px-2">Kurlar yükleniyor...</div>
                        ) : rates.length > 0 ? (
                          <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 sm:gap-x-1.5 sm:gap-y-0.5">
                            {rates.filter(rate => rate.code !== 'TRY').map((rate, index) => {
                              // Para birimi sembolünü belirle
                              let symbol = "";
                              let shortName = "";
                              if (rate.code === "USD") { symbol = "$"; shortName = "Dolar"; }
                              else if (rate.code === "EUR") { symbol = "€"; shortName = "Euro"; }
                              else if (rate.code === "GBP") { symbol = "£"; shortName = "Sterlin"; }
                              else if (rate.code === "SAR") { symbol = "﷼"; shortName = "Riyal"; }
                              
                              return (
                                <div key={rate.code} className="bg-white/50 rounded-lg p-1 sm:p-1.5 text-center">
                                  <div className="text-xs sm:text-[13px] font-semibold text-fuchsia-700 pb-0.5 border-b border-fuchsia-200 mb-0.5">
                                    {shortName} {symbol}
                                  </div>
                                  <div className="space-y-0 mt-0.5">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-green-600">Alış:</span>
                                      <span className="font-bold text-green-700">{rate.buying.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-red-600">Satış:</span>
                                      <span className="font-bold text-red-700">{rate.selling.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>                        ) : (
                          <div className="text-xs sm:text-sm text-muted-foreground px-2">Kurlar yüklenemedi</div>
                        )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Takvim Kartı */}
        <Card className="border-l-4 border-l-orange-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("calendar")}>
          <CardContent className="pt-2 pb-3 px-2 relative">
            <div className="flex flex-col items-start justify-start pt-0">
              <div className="w-full">
                <div className="flex items-center space-x-2 sm:space-x-3 mb-2 px-2">
                  <span className="bg-orange-100 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-base font-bold text-muted-foreground text-left whitespace-nowrap">
                      {format(new Date(), "MMMM yyyy", { locale: tr })}
                    </h3>
                  </div>
                </div>
                
                {/* Mini Takvim */}
                <div className="grid grid-cols-7 gap-0.5 text-[10px] px-2">
                  {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map((day) => (
                    <div key={day} className="text-center text-gray-500 font-medium py-0.5">
                      {day}
                    </div>
                  ))}
                  
                  {(() => {
                    const today = new Date();
                    const currentMonth = today.getMonth();
                    const currentYear = today.getFullYear();
                    const firstDay = new Date(currentYear, currentMonth, 1);
                    const lastDay = new Date(currentYear, currentMonth + 1, 0);
                    const startDate = new Date(firstDay);
                    startDate.setDate(startDate.getDate() - ((firstDay.getDay() + 6) % 7));
                    
                    const days = [];
                    for (let i = 0; i < 35; i++) { // 5 hafta yeterli
                      const date = new Date(startDate);
                      date.setDate(startDate.getDate() + i);
                      
                      const isCurrentMonth = date.getMonth() === currentMonth;
                      const isToday = date.toDateString() === today.toDateString();
                      
                      days.push(
                        <div
                          key={i}
                          className={`text-center py-0.5 ${
                            isCurrentMonth 
                              ? isToday 
                                ? 'bg-orange-500 text-white rounded-sm font-bold text-[9px]'
                                : 'text-gray-800 text-[9px]'
                              : 'text-gray-300 text-[9px]'
                          }`}
                        >
                          {date.getDate()}
                        </div>
                      );
                      
                      if (date > lastDay && i > 27) break; // Gereksiz satırları engelle
                    }
                    
                    return days;
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Toplam Tur Satışı - Bu kart tur verilerini kullanıyor - Yükseklik diğer kartlarla aynı seviyeye getirildi */}
        <div className="space-y-3">
          <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("data-view")}>
            <CardContent className="pt-2.5 pb-4 px-3 sm:px-4 relative">
              <div className="flex flex-col items-start justify-start pt-0">
                <div>
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className="bg-blue-100 p-1.5 sm:p-2 rounded-full flex-shrink-0"><Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" /></span>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-muted-foreground text-left whitespace-nowrap">Toplam</h3>
                      <p className="text-xs font-normal text-muted-foreground -mt-0.5 whitespace-nowrap">Tur Satışı</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl font-bold text-blue-600">{toursData.length}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Toplam Rezervasyonlar - Tur Satışı kartının hemen altına yerleştirildi */}
          <Card className="border-l-4 border-l-green-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("rezervasyon-liste")}>
            <CardContent className="pt-2.5 pb-4 px-3 sm:px-4 relative">
              <div className="flex flex-col items-start justify-start pt-0">
                <div>
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className="bg-green-100 p-1.5 sm:p-2 rounded-full flex-shrink-0"><BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" /></span>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-muted-foreground text-left whitespace-nowrap">Toplam</h3>
                      <p className="text-xs font-normal text-muted-foreground -mt-0.5 whitespace-nowrap">Rezervasyonlar</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl font-bold text-green-600">
                      {reservationsData.length}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Yaklaşan Turlar - Mevcut kart korundu */}
        <Card className="border-l-4 border-l-yellow-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("data-view")}>
          <CardContent className="pt-3 pb-4 sm:pb-6 px-3 sm:px-4 relative">
            <div className="flex flex-col items-start justify-start pt-0">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="bg-yellow-100 p-1.5 sm:p-2 rounded-full flex-shrink-0"><Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" /></span>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-muted-foreground text-left whitespace-nowrap">Yaklaşan Turlar</h3>
                    <p className="text-xs font-normal text-muted-foreground -mt-0.5 whitespace-nowrap">(Bugünden Sonra)</p>
                  </div>
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-bold text-yellow-600">{upcomingTours.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>        {/* Yaklaşan Rezervasyonlar - Bugün ve Sonraki Günler */}
        <Card 
          className={`border-l-4 border-l-red-500 bg-red-50 cursor-pointer hover:shadow-md transition-shadow ${(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            // Bugün olan rezervasyonları kontrol et (en acil)
            const hasTodayReservations = reservationsData.some((reservation: any) => {
              if (!reservation || !reservation.turTarihi) return false;
              const reservationDate = new Date(reservation.turTarihi);
              reservationDate.setHours(0, 0, 0, 0);
              // Bugün olan rezervasyonlar için yanıp sönme
              return reservationDate.getTime() === today.getTime();
            });
            
            return hasTodayReservations ? 'animate-pulse' : '';
          })()}`}
          onClick={() => onNavigate("rezervasyon-liste")}
        >
          <CardContent className="pt-2 pb-3 px-2 sm:px-3 relative">
            <div className="flex flex-col items-start justify-start pt-0">
              <div className="w-full">
                <div className="flex items-center space-x-1.5 mb-1.5">
                  <span className="bg-red-100 p-1 sm:p-1.5 rounded-full flex-shrink-0">
                    <Calendar className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-red-500" />
                  </span>
                  <div className="min-w-0 overflow-hidden flex-1">
                    <h3 className="text-xs sm:text-sm font-bold text-muted-foreground text-left leading-tight">Yaklaşan</h3>
                    <p className="text-[7px] sm:text-[9px] font-normal text-muted-foreground -mt-0.5 leading-tight">Rezervasyonlar (Bugün+)</p>
                  </div>
                </div>
                
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  // Bugünden başlayarak tüm gelecek rezervasyonları say
                  const upcomingReservations = reservationsData.filter((reservation: any) => {
                    if (!reservation || !reservation.turTarihi) return false;
                    const reservationDate = new Date(reservation.turTarihi);
                    reservationDate.setHours(0, 0, 0, 0);
                    return reservationDate >= today; // Bugün dahil
                  });
                  
                  // Bugün olan rezervasyonlar (en acil)
                  const todayReservations = reservationsData.filter((reservation: any) => {
                    if (!reservation || !reservation.turTarihi) return false;
                    const reservationDate = new Date(reservation.turTarihi);
                    reservationDate.setHours(0, 0, 0, 0);
                    return reservationDate.getTime() === today.getTime();
                  });
                  
                  
                  return (
                    <div className="space-y-1.5">
                      {/* Toplam sayı */}
                      <div className="flex items-center gap-2">
                        <p className="text-lg sm:text-xl font-bold text-red-600">
                          {upcomingReservations.length}
                        </p>
                      </div>
                      
                      {/* Günlük breakdown - Kompakt */}
                      <div className="space-y-0.5 max-h-20 overflow-y-auto">
                        {/* Bugün - En koyu kırmızı */}
                        {todayReservations.length > 0 && (
                          <div className="flex items-center justify-between bg-red-700 text-white px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] animate-pulse">
                            <span className="font-semibold">Bugün:</span>
                            <span className="font-bold">{todayReservations.length} ACİL!</span>
                          </div>
                        )}
                        
                        {/* Gelecek rezervasyonları göster */}
                        {upcomingReservations.length > todayReservations.length && (
                          <div className="flex items-center justify-between bg-red-400 text-white px-1.5 py-0.5 rounded text-[8px] sm:text-[9px]">
                            <span className="font-medium">Gelecek:</span>
                            <span className="font-semibold">{upcomingReservations.length - todayReservations.length}</span>
                          </div>
                        )}
                        
                        {/* Hiç rezervasyon yoksa */}
                        {upcomingReservations.length === 0 && (
                          <div className="text-[8px] sm:text-[9px] text-gray-500 text-center py-1">
                            Yaklaşan rezervasyon yok
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rezervasyon Cari - Ödeme Tarihi Geçenler */}
        <Card 
          className={`border-l-4 border-l-red-600 bg-red-50 cursor-pointer hover:shadow-md transition-shadow ${(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const hasOverdue = reservationsData.some((reservation: any) => {
              if (!reservation || !reservation.turTarihi) return false;
              const tourDate = new Date(reservation.turTarihi);
              tourDate.setHours(0, 0, 0, 0);
              let paymentDueDate = new Date(tourDate);
              if (reservation.odemeTarihi && reservation.odemeTarihi !== '') {
                paymentDueDate = new Date(reservation.odemeTarihi);
              } else {
                paymentDueDate.setDate(tourDate.getDate() + 1);
              }
              paymentDueDate.setHours(0, 0, 0, 0);
              const isOverdue = paymentDueDate < today;
              let kalanBorc = 0;
              if (reservation.kalan !== undefined && reservation.kalan !== null && reservation.kalan !== '') {
                kalanBorc = parseFloat(String(reservation.kalan).replace(/[^\d.-]/g, '')) || 0;
              } else {
                const toplamTutar = parseFloat(String(reservation.tutar || reservation.toplamTutar || reservation.totalPrice || reservation.totalAmount || 0).replace(/[^\d.-]/g, '')) || 0;
                const yapilanOdeme = parseFloat(String(reservation.odeme || reservation.odemeMiktari || reservation.yapilanOdeme || reservation.paidAmount || reservation.partialPaymentAmount || 0).replace(/[^\d.-]/g, '')) || 0;
                kalanBorc = toplamTutar - yapilanOdeme;
              }
              return kalanBorc > 0 && isOverdue;
            });
            return hasOverdue ? 'animate-pulse' : '';
          })()}`}
          onClick={() => onNavigate("reservation-cari")}
        >
          <CardContent className="pt-2 pb-3 px-2 sm:px-3 relative">
            <div className="flex flex-col items-start justify-start pt-0">
              <div className="w-full">
                <div className="flex items-center space-x-1.5 mb-1.5">
                  <span className="bg-red-200 p-1 sm:p-1.5 rounded-full flex-shrink-0">
                    <Building2 className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-red-700" />
                  </span>
                  <div className="min-w-0 overflow-hidden flex-1">
                    <h3 className="text-xs sm:text-sm font-bold text-red-700 text-left leading-tight">Ödeme Tarihi</h3>
                    <p className="text-[10px] sm:text-xs font-normal text-red-600 -mt-0.5 leading-tight">Geçenler</p>
                  </div>
                </div>
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  // Ödeme tarihi geçen ve gerçekten kalan borcu olan rezervasyonları filtrele
                  const overdueReservations = reservationsData.filter((reservation: any) => {
                    if (!reservation || !reservation.turTarihi) return false;
                    
                    const tourDate = new Date(reservation.turTarihi);
                    tourDate.setHours(0, 0, 0, 0);
                    
                    // Ödeme tarihini kontrol et - eğer ödeme tarihi belirtilmişse onu kullan, yoksa tur tarihinden 1 gün sonra
                    let paymentDueDate = new Date(tourDate);
                    if (reservation.odemeTarihi && reservation.odemeTarihi !== '') {
                      paymentDueDate = new Date(reservation.odemeTarihi);
                    } else {
                      // Ödeme tarihi yoksa tur tarihinden 1 gün sonra ödeme tarihidir
                      paymentDueDate.setDate(tourDate.getDate() + 1);
                    }
                    paymentDueDate.setHours(0, 0, 0, 0);
                    
                    const isOverdue = paymentDueDate < today;
                    
                    // Kalan borç hesaplama - rezervasyon cari servisindeki alanları kullan
                    let kalanBorc = 0;
                    
                    // Önce direkt kalan alanını kontrol et (rezervasyon cari'de kullanılan alan)
                    if (reservation.kalan !== undefined && reservation.kalan !== null && reservation.kalan !== '') {
                      kalanBorc = parseFloat(String(reservation.kalan).replace(/[^\d.-]/g, '')) || 0;
                    }
                    // Eğer kalan alanı yoksa tutar - ödeme hesapla
                    else {
                      const toplamTutar = parseFloat(String(reservation.tutar || reservation.toplamTutar || reservation.totalPrice || reservation.totalAmount || 0).replace(/[^\d.-]/g, '')) || 0;
                      const yapilanOdeme = parseFloat(String(reservation.odeme || reservation.odemeMiktari || reservation.yapilanOdeme || reservation.paidAmount || reservation.partialPaymentAmount || 0).replace(/[^\d.-]/g, '')) || 0;
                      kalanBorc = toplamTutar - yapilanOdeme;
                    }
                    
                    // Kalan borç 0'dan büyük ve ödeme tarihi geçmiş olanları filtrele
                    return kalanBorc > 0 && isOverdue;
                  });
                  
                  if (overdueReservations.length === 0) {
                    return (
                      <div className="text-[8px] sm:text-[9px] text-green-600 text-center py-1 bg-green-100 rounded">
                        ✅ Geciken ödeme yok
                      </div>
                    );
                  }
                  
                  // Firmalara göre borçları grupla
                  const companyDebts = overdueReservations.reduce((acc: any, reservation: any) => {
                    const companyName = reservation.firma ||
                      reservation.musteriAdiSoyadi ||
                      reservation.musteriAdi ||
                      reservation.customerName ||
                      reservation.ad ||
                      reservation.name ||
                      'Bilinmeyen Firma';
                    
                    if (!acc[companyName]) {
                      acc[companyName] = [];
                    }
                    acc[companyName].push(reservation);
                    return acc;
                  }, {});
                  
                  // En eski gecikme gününü hesapla
                  let oldestDaysDiff = 0;
                  Object.values(companyDebts).forEach((debts: any) => {
                    const oldestDebt = debts.reduce((oldest: any, current: any) => {
                      const oldestDate = new Date(oldest.turTarihi);
                      const currentDate = new Date(current.turTarihi);
                      return currentDate < oldestDate ? current : oldest;
                    });
                    
                    const tourDate = new Date(oldestDebt.turTarihi);
                    let paymentDueDate = new Date(tourDate);
                    if (oldestDebt.odemeTarihi && oldestDebt.odemeTarihi !== '') {
                      paymentDueDate = new Date(oldestDebt.odemeTarihi);
                    } else {
                      paymentDueDate.setDate(tourDate.getDate() + 1);
                    }
                    
                    const daysDiff = Math.floor((today.getTime() - paymentDueDate.getTime()) / (1000 * 60 * 60 * 24));
                    if (daysDiff > oldestDaysDiff) {
                      oldestDaysDiff = daysDiff;
                    }
                  });
                  
                  // Sadece gerçekten borcu olan firmalar (en az bir rezervasyonda kalan borç > 0)
                  const companiesSorted = Object.entries(companyDebts)
                    .map(([companyName, debts]) => {
                      const debtsArray = debts as any[]; // Type assertion
                      // En eski gecikme gününü bul
                      const oldestDebt = debtsArray.reduce((oldest: any, current: any) => {
                        const oldestDate = new Date(oldest.turTarihi);
                        const currentDate = new Date(current.turTarihi);
                        return currentDate < oldestDate ? current : oldest;
                      });
                      
                      // En eski borcun ödeme tarihini hesapla
                      const tourDate = new Date(oldestDebt.turTarihi);
                      let paymentDueDate = new Date(tourDate);
                      if (oldestDebt.odemeTarihi && oldestDebt.odemeTarihi !== '') {
                        paymentDueDate = new Date(oldestDebt.odemeTarihi);
                      } else {
                        paymentDueDate.setDate(tourDate.getDate() + 1);
                      }
                      
                      const daysDiff = Math.floor((today.getTime() - paymentDueDate.getTime()) / (1000 * 60 * 60 * 24));
                      
                      return {
                        name: companyName,
                        count: debtsArray.length,
                        daysDiff,
                      };
                    })
                    .filter(company => company.count > 0)
                    .sort((a, b) => b.count - a.count);
                  
                  const totalOverdueCount = Object.keys(companyDebts).length;
                  
                  return (
                    <div className="space-y-1.5">
                      {/* Toplam özet bilgiler */}
                      <div className="bg-red-100 border border-red-200 rounded p-1.5 mb-2">
                        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-red-800">
                          <span>Toplam {totalOverdueCount}</span>
                          <span>En Eski {oldestDaysDiff} gün</span>
                        </div>
                      </div>
                      
                      {/* Firma listesi */}
                      <div className="space-y-0.5 max-h-16 overflow-y-auto">
                        {companiesSorted.map((company, index) => (
                          <div key={index} className="text-[8px] sm:text-[9px] text-red-800 font-medium">
                            <div className="truncate break-words leading-tight">
                              {company.name}: {company.count} borç - {company.daysDiff} gün
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>      {/* Rezervasyon Listesi */}
      <Card className="mt-8">
        <CardHeader className="pb-3">
          <div className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-[#00a1c6]">Rezervasyon Listesi</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Son rezervasyonlar ve detaylar</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="date-filter-reservations"
                  checked={isReservationDateFilterActive}
                  onCheckedChange={(checked) => setIsReservationDateFilterActive(checked === true)}
                />
                <label htmlFor="date-filter-reservations" className="text-sm font-medium text-muted-foreground">
                  Tarih filtresini etkinleştir
                </label>
              </div>
              <DatePickerWithRange
                date={reservationDateRange}
                setDate={setReservationDateRange}
                className={!isReservationDateFilterActive ? "opacity-50 pointer-events-none" : ""}
              />
            </div>
          </div>
        </CardHeader>        <CardContent className="pt-0 pb-4">
          <div className="overflow-x-auto">            <Table className="border-collapse table-auto w-full">
              <colgroup>
                <col style={{width: '60px'}}/>
                <col style={{width: '50px'}}/>
                <col style={{width: '160px'}}/>
                <col style={{width: '85px'}}/>
                <col style={{width: '110px'}}/>
                <col style={{width: '100px'}}/>
                <col style={{width: '130px'}}/>
                <col style={{width: '35px'}}/>
                <col style={{width: '140px'}}/>
                <col style={{width: '100px'}}/>
              </colgroup>
              <TableHeader>
                <TableRow className="border-b-2 border-black bg-gray-100">
                  <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-1 px-1 leading-tight" style={{width: '60px'}}>SERİ</TableHead>
                  <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-1 px-1 leading-tight" style={{width: '50px'}}>TARİH</TableHead>
                  <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-1 px-1 leading-tight" style={{width: '160px'}}>FİRMA</TableHead>
                  <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-1 px-1 leading-tight" style={{width: '85px'}}>ÖDEME</TableHead>
                  <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-1 px-1 leading-tight" style={{width: '110px'}}>DESTİNASYON</TableHead>
                  <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-1 px-1 leading-tight" style={{width: '100px'}}>MÜŞTERİ</TableHead>
                  <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-1 px-1 leading-tight" style={{width: '130px'}}>İLETİŞİM</TableHead>
                  <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-1 px-1 leading-tight" style={{width: '35px'}}>KİŞİ SAYISI</TableHead>
                  <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-1 px-1 leading-tight" style={{width: '140px'}}>ALIŞ YERİ</TableHead>
                  <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-2 px-2" style={{width: '100px'}}>ALIŞ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  // Rezervasyonları tarih filtresine göre filtrele
                  let filteredReservations = [...reservationsData];
                  if (isReservationDateFilterActive && reservationDateRange?.from) {
                    filteredReservations = filteredReservations.filter(reservation => {
                      if (!reservation.turTarihi) return false;
                      
                      const tourDate = new Date(reservation.turTarihi);
                      const fromDate = reservationDateRange.from!;
                      const toDate = reservationDateRange.to || reservationDateRange.from!;
                      
                      return tourDate >= fromDate && tourDate <= toDate;
                    });
                  }
                  
                  // Bugün ve gelecek rezervasyonları filtrele - geçmiş tarihleri hariç tut
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  const futureReservations = filteredReservations.filter(reservation => {
                    const reservationDate = new Date(reservation.turTarihi);
                    reservationDate.setHours(0, 0, 0, 0);
                    return reservationDate >= today; // Bugün dahil, gelecek rezervasyonlar
                  });
                  
                  // Son 6 rezervasyonu göster - En yakın tarihli üstte (bugünden başlayarak)
                  const sortedReservations = futureReservations
                    .sort((a, b) => {
                      const dateA = new Date(a.turTarihi);
                      const dateB = new Date(b.turTarihi);
                      
                      // Tarih sırasına göre sırala (en yakın tarih üstte)
                      return dateA.getTime() - dateB.getTime();
                    })
                    .slice(0, 6); // Son 6 kayıt

                  if (sortedReservations && sortedReservations.length > 0) {
                    const rows: React.ReactElement[] = [];
                      sortedReservations.forEach((reservation, index) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      const tomorrow = new Date(today);
                      tomorrow.setDate(today.getDate() + 1);
                      
                      const dayAfterTomorrow = new Date(today);
                      dayAfterTomorrow.setDate(today.getDate() + 2);
                      
                      const threeDaysLater = new Date(today);
                      threeDaysLater.setDate(today.getDate() + 3);
                      
                      const reservationDate = new Date(reservation.turTarihi);
                      reservationDate.setHours(0, 0, 0, 0);
                      
                      // Yakınlık derecesine göre renklendirme (bugün ve sonraki günler)
                      let rowBgClass = index % 2 === 0 ? "" : "bg-gray-50"; // Varsayılan zebra
                      let borderClass = "";
                      
                      if (reservationDate.getTime() === today.getTime()) {
                        // Bugün - En koyu kırmızı, yanıp sönme efekti
                        rowBgClass = "bg-red-200 border-l-4 border-red-800 animate-pulse";
                        borderClass = "border-red-800";
                      } else if (reservationDate >= tomorrow && reservationDate < dayAfterTomorrow) {
                        // Yarın - Koyu kırmızı
                        rowBgClass = "bg-red-100 border-l-4 border-red-600";
                        borderClass = "border-red-600";
                      } else if (reservationDate >= dayAfterTomorrow && reservationDate < threeDaysLater) {
                        // Öbür gün - Açık kırmızı
                        rowBgClass = "bg-red-50 border-l-4 border-red-300";
                        borderClass = "border-red-300";
                      }

                      // Ana rezervasyon satırı
                      rows.push(
                        <TableRow 
                          key={`reservation-${reservation.id || index}`}
                          className={`${rowBgClass} relative`}
                        >                          <TableCell className="font-bold text-sm border-r border-gray-200 text-center align-top py-1 px-1 leading-tight" style={{width: '60px'}}>
                            <div className="text-xs text-gray-500 leading-tight">RZV-</div>
                            <div className="text-sm font-bold leading-tight">{reservation.seriNumarasi?.replace('RZV-', '') || '0001'}</div>
                          </TableCell>
                          <TableCell className="font-medium border-r border-gray-200 text-center align-top py-1 px-1 leading-tight" style={{width: '50px'}}>
                            <div className="font-bold text-sm leading-tight">{format(new Date(reservation.turTarihi), "dd", { locale: tr })}</div>
                            <div className="text-xs text-gray-500 leading-tight">{format(new Date(reservation.turTarihi), "MMM", { locale: tr })}</div>
                          </TableCell>                          <TableCell className="text-sm border-r border-gray-200 text-center align-top py-1 px-1 leading-tight" style={{width: '160px'}}>
                            <div className="space-y-1">
                              <div className="font-medium text-xs leading-tight">{reservation.firma}</div>
                              <div className="text-xs text-gray-500 leading-tight">{reservation.yetkiliKisi}</div>
                            </div>
                          </TableCell>                          <TableCell className="border-r border-gray-200 align-top py-1 px-1 leading-tight" style={{width: '85px'}}>
                            <div className="space-y-0.5 text-center">
                              {getStatusBadge(reservation.odemeDurumu)}
                              <div className="text-xs text-gray-500 leading-tight">
                                {(reservation.odemeYapan || reservation.odemeYontemi) && (
                                  <div className="text-xs">{reservation.odemeYapan || ''}{reservation.odemeYapan && reservation.odemeYontemi ? '/' : ''}{reservation.odemeYontemi || ''}</div>
                                )}
                                <div className="font-bold text-gray-900 text-sm">
                                  {formatCurrencyLocal(reservation.tutar, reservation.paraBirimi)}
                                </div>
                              </div>
                            </div>
                          </TableCell><TableCell className="border-r border-gray-200 text-center align-top py-1 px-1 leading-tight" style={{width: '110px'}}>
                            <div className="space-y-1">
                              <div className="font-medium text-sm leading-tight">{getDestinationName(reservation.destinasyon, reservation)}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium border-r border-gray-200 text-center align-top py-1 px-1 leading-tight" style={{width: '100px'}}>
                            <div className="space-y-1">
                              <div className="text-sm font-medium leading-tight">{splitCustomerName(reservation.musteriAdiSoyadi).line1}</div>
                              {splitCustomerName(reservation.musteriAdiSoyadi).line2 && (
                                <div className="text-sm font-medium leading-tight">{splitCustomerName(reservation.musteriAdiSoyadi).line2}</div>
                              )}
                              {reservation.katilimcilar && reservation.katilimcilar.length > 0 && (
                                <div className="text-xs text-gray-500 leading-tight">+{reservation.katilimcilar.length} katılımcı</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="border-r border-gray-200 text-center align-top py-1 px-1 leading-tight" style={{width: '130px'}}>
                            <div className="text-sm">
                              <div className="font-medium leading-tight">{reservation.telefon || "-"}</div>
                            </div>
                          </TableCell>
                          <TableCell className="border-r border-gray-200 text-center align-top py-1 px-1 leading-tight" style={{width: '35px'}}>
                            <div className="flex items-center justify-center gap-1 text-sm">
                              <Users className="h-3 w-3 flex-shrink-0" />
                              <span className="text-xs font-medium">
                                {parseInt(reservation.yetiskinSayisi?.toString() || "0")}
                                {parseInt(reservation.cocukSayisi?.toString() || "0") > 0 && `+${parseInt(reservation.cocukSayisi?.toString() || "0")}Ç`}
                              </span>
                            </div>
                          </TableCell>                          <TableCell className="border-r border-gray-200 text-center align-top py-1 px-1 leading-tight" style={{width: '140px'}}>
                            <div className="space-y-1">
                              <div className="font-medium text-sm leading-tight">{reservation.alisYeri}</div>
                              <div className="text-xs text-gray-500 leading-tight">
                                {reservation.alisYeri === "Acenta" ? (
                                  reservation.alisDetaylari?.["Acenta Adı"] || reservation.firma || ""
                                ) : reservation.alisYeri === "Otel" ? (
                                  reservation.alisDetaylari?.["Otel Adı"] || ""
                                ) : reservation.alisYeri === "Özel Adres" || reservation.alisYeri === "Buluşma Noktası" ? (
                                  reservation.alisDetaylari?.["Adres"] ? 
                                    (reservation.alisDetaylari["Adres"].length > 20 ? 
                                      reservation.alisDetaylari["Adres"].substring(0, 20) + "..." : 
                                      reservation.alisDetaylari["Adres"]) : ""
                                ) : ""}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="border-r border-gray-200 text-center align-top py-1 px-1 leading-tight" style={{width: '100px'}}>
                            <div className="text-sm space-y-1">
                              {reservation.alisDetaylari && reservation.alisDetaylari["Alış Saati"] && (
                                <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3 flex-shrink-0" />
                                  <span className="leading-tight">{reservation.alisDetaylari["Alış Saati"]}</span>
                                </div>
                              )}
                              
                              {/* Alış yeri türüne göre farklı bilgiler */}
                              {reservation.alisYeri === "Acenta" ? (
                                <div className="text-xs text-gray-500 leading-tight">
                                  {reservation.firma || "Acenta"}
                                </div>
                              ) : reservation.alisYeri === "Otel" ? (
                                // Otel durumunda oda numarasını öncelik ver
                                reservation.alisDetaylari && reservation.alisDetaylari["Oda Numarası"] ? (
                                  <div className="text-xs text-gray-500 leading-tight">
                                    Oda: {reservation.alisDetaylari["Oda Numarası"]}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500 leading-tight">
                                    {reservation.alisDetaylari?.["Otel Adı"] || "Otel"}
                                  </div>
                                )
                              ) : reservation.alisYeri === "Özel Adres" || reservation.alisYeri === "Buluşma Noktası" ? (
                                <div className="text-xs text-gray-500 leading-tight">
                                  {reservation.alisDetaylari?.["Adres"] ? 
                                    (reservation.alisDetaylari["Adres"].length > 15 ? 
                                      reservation.alisDetaylari["Adres"].substring(0, 15) + "..." :
                                      reservation.alisDetaylari["Adres"]) : "Adres belirtilmemiş"}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500 leading-tight">-</div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );

                      // Notlar ve Özel İstekler satırı (varsa)
                      const getOzelIsteklerFromAlisYeri = (reservation: any) => {
                        if (!reservation.alisYeri) return '';
                        
                        switch (reservation.alisYeri) {
                          case 'Acenta':
                            return reservation.alisDetaylari?.Adres || '';
                          case 'Otel':
                            return reservation.alisDetaylari?.['Özel Talimatlar'] || '';
                          case 'Özel Adres':
                          case 'Buluşma Noktası':
                            return [
                              reservation.alisDetaylari?.Adres && `Adres: ${reservation.alisDetaylari?.Adres}`,
                              reservation.alisDetaylari?.['İletişim'] && `İletişim: ${reservation.alisDetaylari?.['İletişim']}`,
                              reservation.alisDetaylari?.['Özel Talimatlar'] && `Talimatlar: ${reservation.alisDetaylari?.['Özel Talimatlar']}`
                            ].filter(Boolean).join(' | ') || '';
                          default:
                            return '';
                        }
                      };

                      const ozelIsteklerData = getOzelIsteklerFromAlisYeri(reservation);
                      
                      if (reservation.notlar || ozelIsteklerData) {
                        rows.push(
                          <TableRow key={`notes-${reservation.id || index}`} className="bg-gray-50 border-b border-black">
                            <TableCell colSpan={11} className="p-0">
                              <div className="flex h-1">
                                <div className="w-1/2 border-r border-gray-300 flex items-center px-1">
                                  {reservation.notlar ? (
                                    <div className="flex items-center gap-1">
                                      <div className="w-1 h-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                                      <span className="text-sm font-medium text-blue-800">Notlar:</span>
                                      <span className="text-sm text-blue-700 truncate">{reservation.notlar}</span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-400">Notlar: -</span>
                                  )}
                                </div>
                                <div className="w-1/2 flex items-center px-1">
                                  {ozelIsteklerData ? (
                                    <div className="flex items-center gap-1">
                                      <div className="w-1 h-1 bg-red-500 rounded-full flex-shrink-0"></div>
                                      <span className="text-sm font-medium text-red-800">Özel İstekler:</span>
                                      <span className="text-sm text-red-700 truncate">{ozelIsteklerData}</span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-400">Özel İstekler: -</span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      } else {
                        // Notları olmayan rezervasyonlar için ayırıcı çizgi
                        rows.push(
                          <TableRow key={`separator-${reservation.id || index}`} className="border-b border-black">
                            <TableCell colSpan={11} className="p-0 h-1"></TableCell>
                          </TableRow>
                        );
                      }
                    });

                    return rows;
                  } else {
                    return (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center">
                            <BookOpen className="w-12 h-12 text-gray-400 mb-3" />
                            <h3 className="text-lg font-medium text-gray-900 mb-1">Henüz rezervasyon yok</h3>
                            <p className="text-sm text-gray-500 mb-4">İlk rezervasyonunuzu oluşturmak için butona tıklayın</p>
                            <Button 
                              variant="default"
                              size="sm"
                              className="bg-[#00a1c6] hover:bg-[#008aa6] text-white"
                              onClick={() => onNavigate("rezervasyon-form")}
                            >
                              Yeni Rezervasyon Ekle
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                })()}
              </TableBody>
            </Table>
            {(isReservationDateFilterActive ? (reservationDateRange?.from ? [...reservationsData].filter(reservation => {
              if (!reservation.turTarihi) return false;
              const tourDate = new Date(reservation.turTarihi);
              const fromDate = reservationDateRange.from!;
              const toDate = reservationDateRange.to || reservationDateRange.from!;
              return tourDate >= fromDate && tourDate <= toDate;
            }) : []) : reservationsData).length > 0 && (
              <>
                <div className="border-t border-gray-200 w-full my-4"></div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Son 6 rezervasyon gösteriliyor (Toplam: {isReservationDateFilterActive ? (reservationDateRange?.from ? [...reservationsData].filter(reservation => {
                      if (!reservation.turTarihi) return false;
                      const tourDate = new Date(reservation.turTarihi);
                      const fromDate = reservationDateRange.from!;
                      const toDate = reservationDateRange.to || reservationDateRange.from!;
                      return tourDate >= fromDate && tourDate <= toDate;
                    }).length : 0) : reservationsData.length})
                  </span>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-[#00a1c6] text-[#00a1c6] hover:bg-[#00a1c6] hover:text-white"
                    onClick={() => onNavigate("rezervasyon-liste")}
                  >
                    Tümünü Gör
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Son Tur Satışları */}
      <Card className="mt-8">
        <CardHeader className="pb-2">
          <div className="flex flex-row items-start justify-between">              <div>
                <CardTitle className="text-2xl font-bold text-[#00a1c6]">Son Tur Satışları</CardTitle>
                <CardDescription>Tur satışları, giderleri ve kazanç analizi</CardDescription>
              </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="date-filter-tours"
                  checked={isTourDateFilterActive}
                  onCheckedChange={(checked) => setIsTourDateFilterActive(checked === true)}
                />
                <label htmlFor="date-filter-tours" className="text-sm font-medium text-muted-foreground">
                  Tarih filtresini etkinleştir
                </label>
              </div>
              <DatePickerWithRange
                date={tourDateRange}
                setDate={setTourDateRange}
                className={!isTourDateFilterActive ? "opacity-50 pointer-events-none" : ""}
              />
            </div>
          </div>
        </CardHeader>

        {/* Para birimlerini alt alta görüntülemek için direkt React bileşenleri kullanıyoruz */}
        <CardContent className="pb-2 pt-0">
          <div className="flex flex-wrap gap-2 md:gap-4">
            {/* Toplam Tur Geliri */}
            <div className="bg-green-50 border border-green-100 rounded-lg px-5 py-3 flex-grow">
              <div className="text-sm text-muted-foreground font-medium">Toplam Tur Geliri</div>
              <div className="text-lg font-bold text-green-700">
                {Object.entries(tourIncomeByCurrency).length > 0 ? (
                  Object.entries(tourIncomeByCurrency).map(([currency, amount], idx) => (
                    <div key={`tour-income-${currency}-${idx}`} className="mb-1.5">
                      <span className={styles.moneyContainer}>
                        <span className={styles.currencySymbol}>
                          {currency === "TRY" ? "₺" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency}
                        </span>
                        <span className={`${styles.amountValue} text-green-700`}>
                          {amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </span>
                    </div>
                  ))
                ) : (
                  "-"
                )}
              </div>
            </div>
            
            {/* Toplam Tur Gideri */}
            <div className="bg-red-50 border border-red-100 rounded-lg px-5 py-3 flex-grow">
              <div className="text-sm text-muted-foreground font-medium">Toplam Tur Gideri</div>
              <div className="text-lg font-bold text-red-700">
                {Object.entries(tourExpenseByCurrency).length > 0 ? (
                  Object.entries(tourExpenseByCurrency).map(([currency, amount], idx) => (
                    <div key={`tour-expense-${currency}-${idx}`} className="mb-1.5">
                      <span className={styles.moneyContainer}>
                        <span className={styles.currencySymbol}>
                          {currency === "TRY" ? "₺" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency}
                        </span>
                        <span className={styles.amountValue}>
                          {amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </span>
                    </div>
                  ))
                ) : (
                  "-"
                )}
              </div>
            </div>
            
            {/* Net Kar */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-5 py-3 flex-grow">
              <div className="text-sm text-muted-foreground font-medium">Net Kar</div>
              <div className="text-lg font-bold text-blue-700">
                {(() => {
                  const netProfit: Record<string, number> = {};
                  // Tüm para birimlerini topla
                  const allCurrencies = new Set([
                    ...Object.keys(tourIncomeByCurrency),
                    ...Object.keys(tourExpenseByCurrency)
                  ]);
                  
                  allCurrencies.forEach(currency => {
                    const income = tourIncomeByCurrency[currency] || 0;
                    const expense = tourExpenseByCurrency[currency] || 0;
                    const profit = income - expense;
                    if (profit !== 0) {
                      netProfit[currency] = profit;
                    }
                  });
                  
                  return Object.entries(netProfit).length > 0 ? (
                    Object.entries(netProfit).map(([currency, amount], idx) => (
                      <div key={`tour-profit-${currency}-${idx}`} className="mb-1.5">
                        <span className={styles.moneyContainer}>
                          <span className={styles.currencySymbol}>
                            {currency === "TRY" ? "₺" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency}
                          </span>
                          <span className={`${styles.amountValue} ${amount >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                            {amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </span>
                      </div>
                    ))
                  ) : (
                    "-"
                  );
                })()}
              </div>
            </div>
          </div>
        </CardContent>

        <CardContent className="pt-0">
          <div className="border-t border-gray-200 w-full mb-2"></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-1 sm:py-2 px-1 sm:px-3 text-left font-bold text-xs sm:text-sm">SATIŞ NO</th>
                  <th className="py-1 sm:py-2 px-1 sm:px-3 text-left font-bold text-xs sm:text-sm">TARİH</th>
                  <th className="py-1 sm:py-2 px-1 sm:px-3 text-left font-bold text-xs sm:text-sm">MÜŞTERİ</th>
                  <th className="py-1 sm:py-2 px-1 sm:px-3 text-center font-bold text-xs sm:text-sm">DURUM</th>
                  <th className="py-1 sm:py-2 px-1 sm:px-3 text-left font-bold text-xs sm:text-sm">TUTAR</th>
                  <th className="py-1 sm:py-2 px-1 sm:px-3 text-left font-bold text-xs sm:text-sm">KALAN ÖDEME</th>
                  <th className="py-1 sm:py-2 px-1 sm:px-3 text-left font-bold text-xs sm:text-sm">TUR GİDERİ</th>
                  <th className="py-1 sm:py-2 px-1 sm:px-3 text-left font-bold text-xs sm:text-sm">KAZANÇ</th>
                  <th className="py-1 sm:py-2 px-1 sm:px-3 text-center font-bold text-xs sm:text-sm">İŞLEM</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Sadece tur satışları - giderleri hariç
                  const tourOnlyTransactions = combinedTransactions
                    .filter(transaction => 
                      transaction.type === 'tour' // Sadece tur satışları
                    )
                    // Tur tarihi filtreleme
                    .filter(transaction => {
                      if (!isTourDateFilterActive || !tourDateRange || !tourDateRange.from) return true;
                      
                      // Transaction tarihini string'e çevirip tekrar Date objesine çevirerek normalize edelim
                      const transactionDateStr = new Date(transaction.date).toISOString().split('T')[0]; // YYYY-MM-DD formatı
                      const transactionDate = new Date(transactionDateStr + 'T00:00:00.000Z');
                      
                      // Filtreleme tarihlerini de aynı şekilde normalize edelim
                      const fromDateStr = new Date(tourDateRange.from).toISOString().split('T')[0];
                      const fromDate = new Date(fromDateStr + 'T00:00:00.000Z');
                      
                      // Debug bilgisi
                      console.log('Transaction date:', transaction.date, '→', transactionDate);
                      console.log('From date:', tourDateRange.from, '→', fromDate);
                      
                      // Bitiş tarihi undefined ise sadece başlangıç tarihiyle kontrol et
                      if (!tourDateRange.to) {
                        const result = transactionDate >= fromDate;
                        console.log('Comparing with from date only. Result:', result);
                        return result;
                      }
                      
                      // Bitiş tarihi var - bitiş tarihi günün sonuna ayarlı olmalı (23:59:59.999)
                      const toDateStr = new Date(tourDateRange.to).toISOString().split('T')[0];
                      const toDate = new Date(toDateStr + 'T23:59:59.999Z');
                      
                      console.log('To date:', tourDateRange.to, '→', toDate);
                      
                      // Tarih aralığı kontrolü
                      const result = transactionDate >= fromDate && transactionDate <= toDate;
                      console.log('Is in range?', result);
                      
                      return result;
                    })
                    .sort((a, b) => {
                      // Sadece tarih sıralaması
                      return new Date(b.date).getTime() - new Date(a.date).getTime();
                    });

                  const totalTourPages = Math.ceil(tourOnlyTransactions.length / PAGE_SIZE);
                  const startTourIndex = (currentPage - 1) * PAGE_SIZE;
                  const pagedTourTransactions = tourOnlyTransactions.slice(startTourIndex, startTourIndex + PAGE_SIZE);

                  if (pagedTourTransactions && pagedTourTransactions.length > 0) {
                    return pagedTourTransactions.map((transaction) => {
                      // Tur satışı veya tur gideri için farklı görünüm
                      if (transaction.type === 'tour') {
                        // Tur satışı için kalan ödeme hesaplama - Her para birimi için ayrı hesaplama
                        const tour = transaction.originalData;
                        
                        // Ödenen tutarı hesapla (para birimi dikkate alarak)
                        const paidAmounts: Record<string, number> = {};
                        if (tour.paymentStatus === "completed") {
                          // Tamamlandıysa, tüm tutar ödenmiş demektir
                          const tourCurrency = tour.currency || 'TRY';
                          paidAmounts[tourCurrency] = Number(tour.totalPrice) || 0;
                          
                          // Aktiviteleri de ekle (varsa ve para birimi farklıysa)
                          if (Array.isArray(tour.activities)) {
                            tour.activities.forEach((act: TourActivity) => {
                              const actCurrency = act.currency || tourCurrency;
                              const actPrice = Number(act.price) || 0;
                              const actParticipants = act.participantsType === 'all' ? 
                                (Number(tour.numberOfPeople) || 0) : 
                                (Number(act.participants) || 0);
                              
                              // Aktivite toplam fiyatını ekle
                              if (actPrice > 0) {
                                paidAmounts[actCurrency] = (paidAmounts[actCurrency] || 0) + actPrice * actParticipants;
                              }
                            });
                          }
                        } 
                        else if (tour.paymentStatus === "partial") {
                          // Kısmi ödemede, ödenen kısmı ekle
                          const paidCurrency = tour.partialPaymentCurrency || tour.currency || 'TRY';
                          const paidAmount = Number(tour.partialPaymentAmount) || 0;
                          if (paidAmount > 0) {
                            paidAmounts[paidCurrency] = (paidAmounts[paidCurrency] || 0) + paidAmount;
                          }
                          
                          // Aktivitelerden ödenen kısımları ekle
                          if (Array.isArray(tour.activities)) {
                            tour.activities.forEach((act: TourActivity) => {
                              if (act.partialPaymentAmount) {
                                const actCurrency = act.partialPaymentCurrency || act.currency || tour.currency || 'TRY';
                                const actPaid = Number(act.partialPaymentAmount) || 0;
                                if (actPaid > 0) {
                                  paidAmounts[actCurrency] = (paidAmounts[actCurrency] || 0) + actPaid;
                                }
                              }
                            });
                          }
                        }
                        // Pending durumunda hiç ödeme yoktur, boş bırakılır
                        
                        // Her bir satır için benzersiz key oluştur
                        const rowKey = `tour-${transaction.id}-${transaction.serialNumber}`;
                        
                        return (
                          <tr key={rowKey} className="border-b last:border-0 hover:bg-gray-100 transition bg-indigo-50">
                            {/* SATIŞ NO */}
                            <td className="py-1 sm:py-2 px-1 sm:px-3 font-mono text-sm sm:text-lg font-bold">
                              <span className="text-indigo-600">
                                {transaction.serialNumber}
                              </span>
                            </td>
                            {/* TARİH */}
                            <td className="py-1 sm:py-2 px-1 sm:px-3 text-xs sm:text-sm">{new Date(transaction.date).toLocaleDateString("tr-TR")}</td>
                            {/* MÜŞTERİ */}
                            <td className="py-1 sm:py-2 px-1 sm:px-3">
                              <div className="flex flex-col">
                                <span className="font-semibold text-xs sm:text-sm">{transaction.customerName || "İsimsiz Müşteri"}</span>
                                <span className="text-xs text-gray-500">
                                  {transaction.selectedTourName || transaction.destination || transaction.originalData.selectedTourName || "Belirtilmemiş"}
                                </span>
                              </div>
                            </td>
                            {/* DURUM */}
                            <td className="py-1 sm:py-2 px-1 sm:px-3 text-center">
                              {transaction.status === "completed" && (
                                <span className="bg-white border border-green-500 text-green-700 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold">Tamamlandı</span>
                              )}
                              {transaction.status === "pending" && (
                                <span className="bg-white border border-orange-500 text-orange-700 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold">Beklemede</span>
                              )}
                              {transaction.status === "partial" && (
                                <span className="bg-white border border-yellow-500 text-yellow-700 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold">Kısmi</span>
                              )}
                              {transaction.status === "refunded" && (
                                <span className="bg-white border border-blue-500 text-blue-700 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold">İade</span>
                              )}
                              {!transaction.status && (
                                <span className="bg-white border border-gray-500 text-gray-700 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold">Bilinmiyor</span>
                              )}
                            </td>
                            {/* TUTAR */}
                            <td className="py-1 sm:py-2 px-1 sm:px-3 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-900 text-xs sm:text-sm">Tur Toplam:</span>
                                <span className="font-medium text-xs sm:text-sm" dangerouslySetInnerHTML={{ __html: getTourTotalString(transaction.originalData) }}></span>
                                
                                {Object.keys(paidAmounts).length > 0 && (
                                  <>
                                    <span className="font-semibold text-green-600 mt-1 text-xs sm:text-sm">Ödenen:</span>
                                    <span className="text-green-600 font-medium text-xs sm:text-sm" dangerouslySetInnerHTML={{ __html: formatCurrencyGroups(paidAmounts) }}></span>
                                  </>
                                )}
                              </div>
                            </td>
                            {/* KALAN ÖDEME */}
                            <td className="py-1 sm:py-2 px-1 sm:px-3">
                              {transaction.status === "completed" ? (
                                <span className="text-green-600 font-semibold text-[10px]">Ödendi</span>
                              ) : (
                                (() => {
                                  // Toplam tutarları hesapla
                                  const tour = transaction.originalData;
                                  const totals: Record<string, number> = {};
                                  
                                  // Ana tur tutarı
                                  const tourCurrency = tour.currency || 'TRY';
                                  const tourTotal = Number(tour.totalPrice) || 0;
                                  if (tourTotal > 0) {
                                    totals[tourCurrency] = (totals[tourCurrency] || 0) + tourTotal;
                                  }
                                  
                                  // Aktivitelerin toplamı
                                  if (Array.isArray(tour.activities)) {
                                    tour.activities.forEach((act: TourActivity) => {
                                      const actCurrency = act.currency || tourCurrency;
                                      const actPrice = Number(act.price) || 0;
                                      let actParticipants = 0;
                                      
                                      // Katılımcı sayısını doğru şekilde belirle
                                      if (act.participantsType === 'all') {
                                        actParticipants = Number(tour.numberOfPeople) || 0;
                                      } else {
                                        actParticipants = Number(act.participants) || 0;
                                      }
                                      
                                      const activityTotal = actPrice * actParticipants;
                                      if (activityTotal > 0) {
                                        totals[actCurrency] = (totals[actCurrency] || 0) + activityTotal;
                                      }
                                    });
                                  }
                                  
                                  // Toplam - Ödenen = Kalan
                                  const remaining: Record<string, number> = {};
                                  
                                  // Her para birimi için kalan tutarı hesapla
                                  Object.keys(totals).forEach(currency => {
                                    const total = totals[currency] || 0;
                                    const paid = paidAmounts[currency] || 0;
                                    const left = total - paid;
                                    
                                    if (left > 0) {
                                      remaining[currency] = left;
                                    }
                                  });
                                  
                                  // Hiç kalan yoksa "Ödendi" göster (kalan bir şey yoksa ödenmişdemektir)
                                  if (Object.keys(remaining).length === 0) {
                                    return <span className="text-green-600 font-semibold text-[10px]">Ödendi</span>;
                                  }
                                  
                                  // Sonuç formatını döndür
                                  return <span className="text-orange-600 font-medium text-xs sm:text-sm" dangerouslySetInnerHTML={{ __html: formatCurrencyGroups(remaining) }}></span>;
                                })()
                              )}
                            </td>
                            <td className="py-1 sm:py-2 px-1 sm:px-3">
                              {(() => {
                                // Bu turun gider toplamını hesapla - Veri Görünümü ile tutarlı olması için sadece tour.expenses kullanılıyor
                                const tour = transaction.originalData;
                                const tourId = tour.id;
                                const expenseTotals: Record<string, number> = {};
                                
                                // Direkt olarak turun kendi giderlerini kullan (finansal kayıtlardan değil)
                                if (Array.isArray(tour.expenses)) {
                                  tour.expenses.forEach((expense: TourExpense) => {
                                    if (!expense) return;
                                    
                                    const currency = expense.currency || tour.currency || "TRY";
                                    let amount = 0;
                                    
                                    if (typeof expense.amount === "number") {
                                      amount = expense.amount;
                                    } else if (typeof expense.amount === "string") {
                                      const cleanedAmount = expense.amount.replace(/[^\d.,]/g, '').replace(',', '.');
                                      amount = parseFloat(cleanedAmount);
                                    }
                                    
                                    if (!isNaN(amount) && amount > 0) {
                                      expenseTotals[currency] = (expenseTotals[currency] || 0) + amount;
                                    }
                                  });
                                }
                                
                                if (Object.keys(expenseTotals).length === 0) {
                                  return <span className="text-gray-500 text-xs sm:text-sm">-</span>;
                                }
                                
                                // Sadece Tur Gideri sütunu için tek satır formatı
                                const expenseText = Object.entries(expenseTotals)
                                  .map(([currency, amount]) => `${formatCurrency(amount, currency)}`)
                                  .join(' + ');
                                
                                return <span className="text-red-600 font-medium text-xs sm:text-sm whitespace-nowrap">{expenseText}</span>;
                              })()}
                            </td>
                            <td className="py-1 sm:py-2 px-1 sm:px-3">
                              {(() => {
                                // Kar/Zarar hesaplama: Yeni utility fonksiyonlarını kullan (Veri Görünümü ile tutarlı)
                                const tour = transaction.originalData;
                                const profitLoss = calculateTourProfit(tour);
                                
                                if (Object.keys(profitLoss).length === 0) {
                                  return <span className="text-gray-500 text-xs sm:text-sm">-</span>;
                                }
                                
                                // Renk belirleme: pozitifse yeşil, negatifse kırmızı
                                const isProfit = Object.values(profitLoss).some(val => val > 0);
                                const isLoss = Object.values(profitLoss).some(val => val < 0);
                                const colorClass = isProfit && !isLoss ? "text-green-600" : 
                                                 isLoss && !isProfit ? "text-red-600" : 
                                                 "text-blue-600"; // Karma durumlar için mavi
                                
                                return <span className={`${colorClass} font-medium text-xs sm:text-sm`} dangerouslySetInnerHTML={{ __html: formatCurrencyGroups(profitLoss) }}></span>;
                              })()}
                            </td>
                            <td className="py-1 sm:py-2 px-1 sm:px-3 text-center">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                                onClick={() => onNavigate(`edit-tour-${transaction.id}`)}
                              >
                                Düzenle
                              </Button>
                            </td>
                          </tr>
                        );
                      }
                    });
                  } else {
                    return (
                      <tr>
                        <td colSpan={9} className="text-center py-6 text-muted-foreground">Kayıt yok</td>
                      </tr>
                    );
                  }
                })()}
              </tbody>
            </table>
            <div className="border-b border-gray-200 w-full my-2"></div>
            
            <div className="flex justify-between items-center mt-4">
              {(() => {
                // Sadece tur satışları için sayfalama bilgisi
                const tourOnlyTransactions = combinedTransactions.filter(transaction => 
                  transaction.type === 'tour' // Sadece tur satışları
                );
                const totalTourPages = Math.ceil(tourOnlyTransactions.length / PAGE_SIZE);
                
                return (
                  <>
                    <span className="text-xs text-muted-foreground">
                      Toplam {tourOnlyTransactions.length} tur satışından {Math.min(PAGE_SIZE, tourOnlyTransactions.length)} tanesi gösteriliyor
                    </span>
                    
                    {/* Sayfalama */ }
                    <div className="flex items-center">
                      {totalTourPages > 1 && (

                        <div className="flex justify-center items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={currentPage === 1} 
                            onClick={() => setCurrentPage(currentPage - 1)}
                          >
                            Önceki
                          </Button>
                          {Array.from({ length: totalTourPages }).map((_, idx) => (
                            <Button
                              key={idx}
                              variant={currentPage === idx + 1 ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(idx + 1)}
                            >
                              {idx + 1}
                            </Button>
                          ))}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={currentPage === totalTourPages} 
                            onClick={() => setCurrentPage(currentPage + 1)}
                          >
                            Sonraki
                          </Button>
                        </div>
                      )}
                      
                      <div className="ml-4">
                        <Button variant="outline" size="sm" onClick={() => onNavigate("data-view")}>Tümünü Gör</Button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Son Finansal Kayıtlar Tablosu - Sadece tur ile ilişkisiz olanlar */}
      <Card className="mt-8">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-0">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-[#00a1c6]">Son Finansal Kayıtlar</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Tur ile ilgisi olmayan gelir ve gider işlemleri</CardDescription>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="date-filter-financial"
                  checked={isFinancialDateFilterActive}
                  onCheckedChange={(checked) => setIsFinancialDateFilterActive(checked === true)}
                />
                <label htmlFor="date-filter-financial" className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Tarih filtresini etkinleştir
                </label>
              </div>
              <DatePickerWithRange
                date={financialDateRange}
                setDate={setFinancialDateRange}
                className={!isFinancialDateFilterActive ? "opacity-50 pointer-events-none" : ""}
              />
            </div>
          </div>
        </CardHeader>

        {/* Finansal Kayıtlar Özet */}
        <CardContent className="pb-2 pt-0">
          <div className="flex flex-wrap gap-2 md:gap-4">
            {/* Toplam Finansal Gelir */}
            <div className="bg-green-50 border border-green-100 rounded-lg px-3 sm:px-5 py-2 sm:py-3 flex-grow">
              <div className="text-xs sm:text-sm text-muted-foreground font-medium">Toplam Finansal Gelir</div>
              <div className="text-sm sm:text-lg font-bold text-green-700">
                {Object.entries(incomeByCurrency).length > 0 ? (
                  Object.entries(incomeByCurrency).map(([currency, amount], idx) => (
                    <div key={`finance-income-${currency}-${idx}`} className="mb-1.5">
                      <span className={styles.moneyContainer}>
                        <span className={styles.currencySymbol}>
                          {currency === "TRY" ? "₺" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency}
                        </span>
                        <span className={styles.amountValue}>
                          {amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </span>
                    </div>
                  ))
                ) : (
                  "-"
                )}
              </div>
            </div>
            
            {/* Toplam Şirket Giderleri */}
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 sm:px-5 py-2 sm:py-3 flex-grow">
              <div className="text-xs sm:text-sm text-muted-foreground font-medium">Toplam Şirket Giderleri</div>
              <div className="text-sm sm:text-lg font-bold text-red-700">
                {Object.entries(expenseByCurrency).length > 0 ? (
                  Object.entries(expenseByCurrency).map(([currency, amount], idx) => (
                    <div key={`finance-expense-${currency}-${idx}`} className="mb-1.5">
                      <span className={styles.moneyContainer}>
                        <span className={styles.currencySymbol}>
                          {currency === "TRY" ? "₺" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency}
                        </span>
                        <span className={styles.amountValue}>
                          {amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                       
                        </span>
                      </span>
                    </div>
                  ))
                ) : (
                  "-"
                )}
              </div>
            </div>
            
            {/* Net Fark */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 sm:px-5 py-2 sm:py-3 flex-grow">
              <div className="text-xs sm:text-sm text-muted-foreground font-medium">Net Fark</div>
              <div className="text-sm sm:text-lg font-bold text-blue-700">
                {(() => {
                  const netDifference: Record<string, number> = {};
                  // Tüm para birimlerini topla
                  const allCurrencies = new Set([
                    ...Object.keys(incomeByCurrency),
                    ...Object.keys(expenseByCurrency)
                  ]);
                  
                  allCurrencies.forEach(currency => {
                    const income = incomeByCurrency[currency] || 0;
                    const expense = expenseByCurrency[currency] || 0;
                    const difference = income - expense;
                    netDifference[currency] = difference; // Sıfır değerleri de göster
                  });
                  
                  return Object.entries(netDifference).length > 0 ? (
                    Object.entries(netDifference).map(([currency, amount], idx) => (
                      <div key={`finance-diff-${currency}-${idx}`} className="mb-1.5">
                        <span className={styles.moneyContainer}>
                          <span className={styles.currencySymbol}>
                            {currency === "TRY" ? "₺" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency}
                          </span>
                          <span className={styles.amountValue}>
                            {amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </span>
                      </div>
                    ))
                  ) : (
                    "-"
                  );
                })()}
              </div>
            </div>
          </div>
        </CardContent>

        <CardContent className="pt-0">
          <div className="border-t border-gray-200 w-full mb-2"></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-1 sm:py-2 px-1 sm:px-3 text-left font-bold text-xs sm:text-sm">İŞLEM NO</th>
                  <th className="py-1 sm:py-2 px-1 sm:px-3 text-left font-bold text-xs sm:text-sm">TARİH</th>
                  <th className="py-1 sm:py-2 px-1 sm:px-3 text-left font-bold text-xs sm:text-sm">İŞLEM TİPİ</th>
                  <th className="py-1 sm:py-2 px-1 sm:px-3 text-left font-bold text-xs sm:text-sm">AÇIKLAMA</th>
                  <th className="py-1 sm:py-2 px-1 sm:px-3 text-left font-bold text-xs sm:text-sm">KATEGORİ</th>
                  <th className="py-1 sm:py-2 px-1 sm:px-3 text-left font-bold text-xs sm:text-sm">TUTAR</th>
                  <th className="py-1 sm:py-2 px-1 sm:px-3 text-left font-bold text-xs sm:text-sm">İŞLEM</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Sadece tur ile ilgisi olmayan finans kayıtları
                  const financialOnlyTransactions = combinedTransactions
                    .filter(transaction => 
                      transaction.type === 'finance' && 
                      !transaction.originalData.relatedTourId  // Tur ile ilgisi olmayanlar
                    )
                    // Finansal kayıtlar için tarih filtresini uygula
                    .filter(transaction => {
                      if (!isFinancialDateFilterActive || !financialDateRange || !financialDateRange.from) return true;
                      
                      // Transaction tarihini parse et ve sadece gün/ay/yıl kısmını al (saat bilgisini sıfırla)
                      const transactionDate = new Date(transaction.date);
                      transactionDate.setHours(0, 0, 0, 0);
                      
                      // Filtreleme tarihlerini de sıfırla
                      const fromDate = new Date(financialDateRange.from);
                      fromDate.setHours(0, 0, 0, 0);
                      
                      // Bitiş tarihi undefined ise sadece başlangıç tarihiyle kontrol et
                      if (!financialDateRange.to) {
                        return transactionDate >= fromDate;
                      }
                      
                      const toDate = new Date(financialDateRange.to);
                      toDate.setHours(23, 59, 59, 999); // Bitiş tarihini günün sonuna ayarla
                      
                      // Her ikisi de tanımlı ise aralığı kontrol et
                      return transactionDate >= fromDate && transactionDate <= toDate;
                    })
                    .sort((a: { date: string | Date }, b: { date: string | Date }) => {
                      const dateA = new Date(a.date).getTime();
                      const dateB = new Date(b.date).getTime();
                      return dateB - dateA;
                    });

                  const totalFinancialPages = Math.ceil(financialOnlyTransactions.length / PAGE_SIZE);
                  const startFinancialIndex = (currentFinancialPage - 1) * PAGE_SIZE;
                  const pagedFinancialTransactions = financialOnlyTransactions.slice(startFinancialIndex, startFinancialIndex + PAGE_SIZE);

                  if (pagedFinancialTransactions && pagedFinancialTransactions.length > 0) {
                    return pagedFinancialTransactions.map((transaction) => {
                      // İşlem tipine göre arka plan rengi belirleme
                      const rowBgColor = transaction.status === 'income' ? 
                        "bg-green-50" : // Gelir için yeşil
                        "bg-red-50";    // Gider için kırmızı
                      
                      // İşlem numarası rengi
                      const serialNumberColor = transaction.status === 'income' ? 
                        "text-green-600" : // Gelir için yeşil
                        "text-red-600";    // Gider için kırmızı
                      
                      return (
                        <tr key={transaction.id} className={`border-b last:border-0 hover:bg-gray-100 transition ${rowBgColor}`}>
                          <td className="py-1 sm:py-2 px-1 sm:px-3 font-mono text-sm sm:text-lg font-bold">
                            <span className={serialNumberColor}>
                              {transaction.serialNumber}
                            </span>
                          </td>
                          <td className="py-1 sm:py-2 px-1 sm:px-3 text-xs sm:text-sm">{new Date(transaction.date).toLocaleDateString("tr-TR")}</td>
                          <td className="py-1 sm:py-2 px-1 sm:px-3">
                            {transaction.status === 'income' ? (
                              <span className="bg-white border border-green-500 text-green-700 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold">Gelir</span>
                            ) : (
                              <span className="bg-white border border-red-500 text-red-700 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold">Gider</span>
                            )}
                          </td>
                          <td className="py-1 sm:py-2 px-1 sm:px-3 text-xs sm:text-sm">{transaction.customerName}</td>
                          <td className="py-1 sm:py-2 px-1 sm:px-3">
                            <span className={`bg-white border ${transaction.status === 'income' ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'} px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap`}>
                              {transaction.category || "Genel"}
                            </span>
                          </td>
                          <td className="py-1 sm:py-2 px-1 sm:px-3 text-xs sm:text-sm whitespace-nowrap">
                            <span dangerouslySetInnerHTML={{ __html: formatCurrency(transaction.amount, transaction.currency) }}></span>
                          </td>
                          <td className="py-1 sm:py-2 px-1 sm:px-3 text-center">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                              onClick={() => onNavigate(`edit-financial-${transaction.id}`)}
                            >
                              Düzenle
                            </Button>
                          </td>
                        </tr>
                      );
                    });
                  } else {
                    return (
                      <tr>
                        <td colSpan={7} className="text-center py-4 sm:py-6 text-muted-foreground text-xs sm:text-sm">Kayıt yok</td>
                      </tr>
                    );
                  }
                })()}
              </tbody>
            </table>
            <div className="border-b border-gray-200 w-full my-2"></div>
            
            <div className="flex justify-between items-center mt-4">
              {(() => {
                // Sadece finans kayıtları için sayfalama bilgisi
                const financialOnlyTransactions = combinedTransactions.filter(transaction => 
                  transaction.type === 'finance' && !transaction.originalData.relatedTourId
                );
                const totalFinancialPages = Math.ceil(financialOnlyTransactions.length / PAGE_SIZE);
                
                return (
                  <>
                    <span className="text-xs text-muted-foreground">
                      Toplam {financialOnlyTransactions.length} finansal kayıttan {Math.min(PAGE_SIZE, financialOnlyTransactions.length)} tanesi gösteriliyor
                    </span>
                    
                    {/* Sayfalama */}
                    <div className="flex items-center">
                      {totalFinancialPages > 1 && (
                        <div className="flex justify-center items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={currentFinancialPage === 1} 
                            onClick={() => setCurrentFinancialPage(currentFinancialPage - 1)}
                          >
                            Önceki
                          </Button>
                          {Array.from({ length: totalFinancialPages }).map((_, idx) => (
                            <Button
                              key={idx}
                              variant={currentFinancialPage === idx + 1 ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentFinancialPage(idx + 1)}
                            >
                              {idx + 1}
                            </Button>
                          ))}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={currentFinancialPage === totalFinancialPages} 
                            onClick={() => setCurrentFinancialPage(currentFinancialPage + 1)}
                          >
                            Sonraki
                          </Button>
                        </div>
                      )}
                      
                      <div className="ml-4">
                        <Button variant="outline" size="sm" onClick={() => onNavigate("data-view")}>Tümünü Gör</Button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
