"use client"

import { useState, useEffect } from "react"
// import AppLoadSampleData from "./_app-load-sample-data" // DEVRE DIŞI BIRAKILDI - Test verileri artık yüklenmeyecek
import { MainDashboard } from "../components/main-dashboard"
import { FinancialEntryForm } from "../components/financial-entry-form"
import { TourSalesForm } from "../components/tour-sales-form"
import { DataView } from "../components/data-view"
import { SettingsView } from "../components/settings-view"
import { EnhancedAnalyticsView } from "../components/enhanced-analytics-view"
import { DashboardView } from "../components/dashboard-view"
import { CalendarView } from "../components/calendar-view"
import { BackupRestoreView } from "../components/backup-restore"
import { SplashScreen } from "../components/splash-screen"
import { Toaster } from "../components/ui/toaster"
import { useToast } from "../components/ui/use-toast"
import dynamic from "next/dynamic";
import DatabaseNavLinks from "../components/database-nav-links";
const BorclarPage = dynamic(() => import("./borclar/page"), { ssr: false });
import { exportData, importData } from "../lib/export-import"
import { getAllData, addData, updateData, initializeDB, clearStore, deleteData, getReservations } from "../lib/db"
import { CustomerView } from "../components/customer-view"
import { MainHeader } from "../components/main-header"
import { Sidebar } from "../components/sidebar"
import { useRouter } from 'next/navigation'
import { generateUUID } from "../lib/utils";
// import loadInitialData from "../data/reload-data" // DEVRE DIŞI BIRAKILDI - Test verileri kaldırıldı
import { useAuth } from "../lib/firebase-auth" // Firebase Authentication hook
import CompanyManagement from "../components/company-management" // Yeni: Firma yönetimi
import DebtManagement from "../components/debt-management" // Yeni: Borç yönetimi 
import PaymentManagement from "../components/payment-management" // Yeni: Ödeme yönetimi
import { CurrencyView } from "../components/currency-view" // Döviz görünümü
import { PeriodDataView } from "../components/period-data-view" // Yeni: Dönem Verileri görünümü
import { createCustomerDebtsFromTour } from "@/lib/debt-service";
import { RezervasyonForm } from "@/components/rezervasyon/rezervasyon-form";
import { RezervasyonListe } from "../components/rezervasyon/rezervasyon-liste" // Rezervasyon liste
import { Rezervasyon } from "@/types/rezervasyon-types";

// Uygulama verilerini tamamen sıfırlamak için fonksiyon
const resetAllData = async () => {
  try {
    // localStorage'da mevcut verileri temizle
    localStorage.removeItem('financialData');
    localStorage.removeItem('toursData');
    localStorage.removeItem('customerData');
    localStorage.removeItem('settings');
    localStorage.removeItem('destinations');
    localStorage.removeItem('activities');
    localStorage.removeItem('providers');
    localStorage.removeItem('expenses');
    localStorage.removeItem('referral_sources');
    
    // Tüm verileri silme bayrağını ekle - bu, uygulamanın bir sonraki başlatılmasında tüm verileri silecek
    localStorage.setItem('resetAllData', 'true');
    
    console.log("Tüm veriler temizlendi. Uygulama yeniden başlatılacak.");
    
    // Sayfayı yenileyerek yeni verileri yükle
    window.location.reload();
    
  } catch (error) {
    console.error("Veri sıfırlama hatası:", error);
    alert("Veriler sıfırlanırken bir hata oluştu. Lütfen tekrar deneyin.");
  }
};

interface TourActivity {
  id: string;  activityId: string;
  name: string;
  date: string;
  duration?: string;
  price: number | string;
  currency: string;
  participants: string | number;
  participantsType: string;
  companyId: string;
  details?: string;
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
  companyId?: string;   // Firma ID'si için yeni alan
  companyName?: string; // Görüntüleme için firma adı
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
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
}

export default function Home() {
  const [currentView, setCurrentView] = useState<string>("splash")
  const [financialData, setFinancialData] = useState<FinancialData[]>([])
  const [toursData, setToursData] = useState<TourData[]>([])
  const [customersData, setCustomersData] = useState<CustomerData[]>([])
  const [reservationsData, setReservationsData] = useState<Rezervasyon[]>([]) // Rezervasyon verileri için yeni state
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [editingReservation, setEditingReservation] = useState<Rezervasyon | null>(null) // Rezervasyon düzenleme
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [forceReload, setForceReload] = useState<boolean>(false)

  const [splashFinished, setSplashFinished] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const [isAIOpen, setIsAIOpen] = useState(false)
  // Add state to store temporary form data
  const [tempTourFormData, setTempTourFormData] = useState<any>(null)
  const [previousView, setPreviousView] = useState<string | null>(null)

  const loadReservations = async () => {
    setIsLoading(true);
    try {
      console.log("Firebase'den rezervasyonlar yükleniyor...");
      let data = await getReservations();

      // Firebase'den rezervasyon verilerini alıyoruz - test verisi eklenmeyecek
      
      setReservationsData(data);
      console.log("✅ Rezervasyonlar başarıyla yüklendi:", data);
    } catch (error) {
      console.error("Rezervasyonlar yüklenirken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Rezervasyonlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };  // Yedekleme ve geri yükleme işlemleri için fonksiyonlar
  const handleExportData = async () => {
    try {
      await exportData();
      toast({
        title: "Başarılı!",
        description: "Veriler başarıyla dışa aktarıldı.",
      });
    } catch (error) {
      console.error("Dışa aktarma hatası:", error);
      toast({
        title: "Hata",
        description: "Veriler dışa aktarılırken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleImportData = async () => {
    try {
      await importData();
      // Verileri yeniden yükle
      window.location.reload();
      toast({
        title: "Başarılı!",
        description: "Veriler başarıyla içe aktarıldı. Sayfa yenileniyor...",
      });
    } catch (error) {
      console.error("İçe aktarma hatası:", error);
      toast({
        title: "Hata",
        description: "Veriler içe aktarılırken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };
  useEffect(() => {
    try {
      // Firebase Authentication ile giriş kontrolü
      const isLoggedIn = localStorage.getItem('adminLoggedIn');
      if (!isLoggedIn) {
        // Oturum yoksa verileri temizle
        localStorage.removeItem('financialData');
        localStorage.removeItem('toursData');
        localStorage.removeItem('customerData');
        // Login sayfasına yönlendir (artık /admin/login yerine /login)
        router.push('/login');
      }
      // Eğer giriş yapılmışsa ana sayfada kal
    } catch (err) {
      console.error('Home redirect error:', err);
    }
  }, [router]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        if (typeof window !== 'undefined') {
          console.log("Veritabanından veriler yükleniyor...");
          await initializeDB();

          // Diğer verileri yükle (finans, turlar vb.)
          const financialDataFromDB = await getAllData("financials") as FinancialData[];
          const toursDataFromDB = await getAllData("tours") as TourData[];
          const customersDataFromDB = await getAllData("customers") as CustomerData[];

          setFinancialData(financialDataFromDB);
          setToursData(toursDataFromDB);
          setCustomersData(customersDataFromDB);

          // Sadece rezervasyonları yükle
          await loadReservations();

          console.log("Gerçek Firebase verilerine bağlanılıyor...");
        }
      } catch (error) {
        console.error("Veriler yüklenirken hata oluştu:", error);
      } finally {
        setIsLoading(false);
        setSplashFinished(true);
      }
    }

    fetchData();
  }, [forceReload]);

  const handleSplashFinish = () => {
    setCurrentView("main-dashboard")
  }
  const navigateTo = (view: string, data?: any) => {
    // Rezervasyon navigasyonu
    if (view === "rezervasyon-form") {
      setCurrentView("rezervasyon-form");
      setEditingRecord(data); // Düzenleme verisini ayarla
      return;
    }

    if (view === "rezervasyon-liste") {
      setCurrentView("rezervasyon-liste");
      return;
    }
    
    // Sidebar'dan Döviz butonuna tıklanınca yönlendirme
    if (view === "currency") {
      setCurrentView("currency");
      return;
    }

    // Tur Satışı (yeni kayıt) butonuna tıklandığında editingRecord ve tempTourFormData sıfırlanır
    if (view === "tour-sales" && !editingRecord) {
      setTempTourFormData(null);
      setCurrentView("tour-sales");
      return;
    }

    // Ana ekrandan tur düzenleme için tıklananca
    if (view.startsWith("edit-tour-")) {
      const tourId = view.replace("edit-tour-", "");
      // Turu bul
      const tourToEdit = toursData.find(tour => 
        tour.id === tourId || 
        tour.serialNumber === tourId
      );
      
      if (tourToEdit) {
        console.log("Ana sayfadan tur düzenleme:", tourToEdit);
        // Derin kopya oluştur
        const tourCopy = JSON.parse(JSON.stringify(tourToEdit));
        // Düzenlenecek kaydı ayarla
        setEditingRecord(tourCopy);
        // Tour-sales formuna git
        setCurrentView("tour-sales");
        return;
      }
    }
    
    // Ana ekrandan finans kaydı düzenleme için tıklananca
    if (view.startsWith("edit-financial-")) {
      const financialId = view.replace("edit-financial-", "");
      // Finans kaydını bul
      const financialToEdit = financialData.find(financial => financial.id === financialId);
      
      if (financialToEdit) {
        console.log("Ana sayfadan finans kaydı düzenleme:", financialToEdit);
        // Derin kopya oluştur
        const financialCopy = JSON.parse(JSON.stringify(financialToEdit));
        // Düzenlenecek kaydı ayarla
        setEditingRecord(financialCopy);
        // Financial-entry formuna git
        setCurrentView("financial-entry");
        return;
      }
    }
    
    // Store the current view before changing
    if (currentView !== view) {
      setPreviousView(currentView)

      // If navigating away from tour-sales to settings, store the form data
      if (currentView === "tour-sales" && view === "settings") {
        // We'll set a flag to indicate we need to return to tour-sales
        localStorage.setItem("returnToTourSales", "true")
      }
    }

    setCurrentView(view)

    // Düzenleme kaydı varsa ve ilgili düzenleme formlarına geçmiyorsak sıfırla
    const editForms = ["tour-sales", "financial-entry", "customers"];
    if (editingRecord && !editForms.includes(view)) {
      setEditingRecord(null)
    }
  }

  const handleDataUpdate = async (type: string, newData: any[]) => {
    try {
      if (type === "financial") {
        // Finansal verileri güncelle
        setFinancialData(newData as FinancialData[])
        
        // IndexedDB'yi güncelle
        await clearStore("financials");
        for (const item of newData) {
          await addData("financials", item);
        }
        
        // Ayrıca localStorage'a da kaydet (yedek olarak)
        localStorage.setItem("financialData", JSON.stringify(newData));
        
        console.log("Finansal veriler güncellendi:", newData);
      } else if (type === "tours") {
        // Tur verilerini güncelle
        // Aynı id'ye sahip kayıt varsa önce sil, sonra ekle
        setToursData(newData as TourData[])
        
        await clearStore("tours");
        for (const item of newData) {
          // addData hata verirse updateData ile güncelle
          try {
            await addData("tours", item);
          } catch (e: any) { // 'any' olarak belirtilen error tipi özelliklere erişim için
            // Eğer anahtar çakışması hatası ise, önce silip tekrar ekle
            if (e && typeof e === 'object' && 'name' in e && e.name === "ConstraintError") {
              await deleteData("tours", item.id);
              await addData("tours", item);
            } else {
              throw e;
            }
          }
        }
        
        localStorage.setItem("toursData", JSON.stringify(newData));
        
        console.log("Tur verileri güncellendi:", newData);
      } else if (type === "customers") {
        // Müşteri verilerini güncelle
        setCustomersData(newData as CustomerData[])
        
        // IndexedDB'yi güncelle
        await clearStore("customers");
        for (const item of newData) {
          await addData("customers", item);
        }
        
        // Ayrıca localStorage'a da kaydet (yedek olarak)
        localStorage.setItem("customerData", JSON.stringify(newData));
        
        console.log("Müşteri verileri güncellendi:", newData);
      }

      toast({
        title: "Başarılı!",
        description: "Veriler başarıyla güncellendi.",
      })
    } catch (error: any) {
      console.error("Veri güncelleme hatası:", error)
      toast({
        title: "Hata",
        description: "Veriler güncellenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  // Splash screen göster
  if (currentView === "splash") {
    return <SplashScreen onFinish={handleSplashFinish} />
  }
  // Rezervasyon düzenleme
  const handleEditReservation = (reservation: Rezervasyon) => {
    console.log('Rezervasyon düzenleniyor:', reservation);
    setEditingReservation(reservation);
    setCurrentView("rezervasyon-form");
  };
  // Rezervasyon düzenleme tamamlandığında
  const handleReservationEditComplete = () => {
    setEditingReservation(null);
    setCurrentView("rezervasyon-liste");
    // Rezervasyon listesi otomatik yenilenecek
    toast({
      title: "Başarılı",
      description: "Rezervasyon başarıyla güncellendi!",
    });
  };
  return (
    <div className="flex min-h-screen">
      <Sidebar currentView={currentView} onNavigate={navigateTo} />
      <div className="flex-1 flex flex-col min-h-screen ml-64">
        <div className="flex-1">
          <Toaster />

          {/* Ana içerik */}          {currentView === "main-dashboard" && (
            <MainDashboard
              onNavigate={navigateTo}
              financialData={financialData}
              toursData={toursData}
              customersData={customersData}
              reservationsData={reservationsData}
            />
          )}
          {currentView === "financial-entry" && (
            <FinancialEntryForm
              initialData={editingRecord}
              onSave={(newEntry: FinancialData) => {
                // Yeni finansal kaydı ekle veya düzenle
                const updatedData = editingRecord
                  ? financialData.map(item => item.id === newEntry.id ? newEntry : item)
                  : [...financialData, newEntry];
                handleDataUpdate("financial", updatedData);
                setEditingRecord(null);
              }}              onCancel={() => { 
                setEditingRecord(null);
                navigateTo("main-dashboard"); 
              }}
            />
          )}
          {currentView === "tour-sales" && (
            <TourSalesForm
              initialData={editingRecord}              onSave={(tourData: any) => {
                // Yeni tur kaydı ekle veya düzenle
                const updatedData = editingRecord
                  ? toursData.map(item => item.id === tourData.id ? tourData : item)
                  : [...toursData, tourData];
                handleDataUpdate("tours", updatedData);
                
                // 1. Müşteri kaydı oluştur veya güncelle
                if (tourData.customerName) {
                  // Müşteri kaydı için benzersiz ID oluştur (veya tur ID\'den türet)
                  const customerId = editingRecord ? 
                    // Mevcut müşteri ID\'sini bul
                    customersData.find(c => 
                      c.name === tourData.customerName && 
                      c.phone === tourData.customerPhone)?.id || 
                    `c_${tourData.id}` : 
                    `c_${tourData.id}`;
                  
                  // Yeni müşteri verisi
                  const customerData = {
                    id: customerId,
                    name: tourData.customerName,
                    phone: tourData.customerPhone,
                    email: tourData.customerEmail,
                    idNumber: tourData.customerIdNumber,
                    citizenship: tourData.nationality,
                    address: tourData.customerAddress,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  
                  // Müşteri zaten varsa güncelle, yoksa ekle
                  const existingCustomerIndex = customersData.findIndex(c => c.id === customerId);
                  
                  let newCustomersData;
                  if (existingCustomerIndex >= 0) {
                    // Müşteri zaten varsa güncelle
                    newCustomersData = [...customersData];
                    newCustomersData[existingCustomerIndex] = customerData;
                  } else {
                    // Müşteri yoksa yeni ekle
                    newCustomersData = [...customersData, customerData];
                  }
                  
                  // Müşteri verilerini güncelle
                  handleDataUpdate("customers", newCustomersData);
                }
                
                // 2. Giderleri finansal kayıtlara ekle
                if (tourData.expenses && tourData.expenses.length > 0) {
                  const newFinancialEntries = tourData.expenses.map((expense: any) => {
                    return {
                      id: `fin_${expense.id}`,
                      date: expense.date || tourData.tourDate || new Date().toISOString(),
                      type: "expense",
                      category: "Tur Gideri",
                      description: `${tourData.customerName} - ${expense.name}`,
                      amount: Number(expense.amount),
                      currency: expense.currency || tourData.currency || "TRY",
                      paymentMethod: tourData.paymentMethod || "cash",
                      relatedTourId: tourData.id,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    };
                  });
                  
                  // Mevcut finansal kayıtları al ve giderleri ekle
                  const existingFinancials = [...financialData];
                  
                  // Önce bu tura ait önceki gider kayıtlarını kaldır
                  const filteredFinancials = existingFinancials.filter(
                    (item) => !(item.relatedTourId === tourData.id && item.category === "Tur Gideri")
                  );
                  
                  // Yeni giderleri ekle
                  const updatedFinancials = [...filteredFinancials, ...newFinancialEntries];
                    // Finansal verileri güncelle
                  handleDataUpdate("financial", updatedFinancials);
                }
                
                // 3. Tur verilerinden müşteri borçlarını oluşturma mantığı buradan kaldırıldı.
                // Bu işlem artık components/tour-sales-form.tsx içinde handleSubmit tarafından yönetiliyor.
                
                setEditingRecord(null);
              }}
              onCancel={() => { 
                setEditingRecord(null);
                setTempTourFormData(null); // Geçici form verisini temizle
                navigateTo("main-dashboard"); 
              }}
              toursData={toursData}
              onUpdateData={(data: TourData[]) => handleDataUpdate("tours", data)}
              onNavigate={navigateTo}
              editingRecord={editingRecord}
              setEditingRecord={setEditingRecord}
              customersData={customersData}
              setCustomersData={setCustomersData}
              tempTourFormData={tempTourFormData}
              setTempTourFormData={setTempTourFormData}
            />
          )}
          {currentView === "data-view" && (
            <DataView
              financialData={financialData}
              toursData={toursData}
              customersData={customersData}
              onDataUpdate={handleDataUpdate}
              onEdit={(type, item) => {
                console.log(`[TUR DÜZENLEME] ${type} kaydı düzenleniyor:`, item);
                
                // Kayıt geçerliliğini kontrol et
                const isValidRecord = item && item.id;
                
                if (!isValidRecord) {
                  console.error(`[TUR DÜZENLEME HATASI] Geçersiz ${type} kaydı:`, item);
                  alert("Düzenlenecek kayıt bulunamadı veya geçersiz!");
                  return;
                }
                
                try {
                  // Derin kopya oluştur - JSON dönüşümü uygulanıyor
                  const itemCopy = JSON.parse(JSON.stringify(item));
                  
                  // Tur kayıtları için ek kontroller
                  if (type === "tours") {
                    console.log("[TUR DÜZENLEME] Tur kaydı özel işleme tabi tutuluyor");
                    
                    // Aktiviteler için addToDebt kontrolü
                    if (itemCopy.activities && Array.isArray(itemCopy.activities)) {
                      itemCopy.activities = itemCopy.activities.map((activity: any) => ({
                        ...activity,
                        addToDebt: activity.addToDebt !== undefined ? activity.addToDebt : false
                      }));
                    } else {
                      // Aktiviteler dizisi yoksa boş dizi oluştur
                      itemCopy.activities = [];
                    }
                    
                    // Giderler için addToDebt kontrolü
                    if (itemCopy.expenses && Array.isArray(itemCopy.expenses)) {
                      itemCopy.expenses = itemCopy.expenses.map((expense: any) => ({
                        ...expense,
                        addToDebt: expense.addToDebt !== undefined ? expense.addToDebt : false
                      }));
                    } else {
                      // Giderler dizisi yoksa boş dizi oluştur
                      itemCopy.expenses = [];
                    }
                  }
                  
                  // State'i güncelle
                  setEditingRecord(itemCopy);
                  console.log(`[DEBUG] Düzenleme için ayarlanan kayıt:`, itemCopy);
                  // İlgili forma yönlendir
                  if (type === "financial") navigateTo("financial-entry");
                  else if (type === "tours") navigateTo("tour-sales");
                  else if (type === "customers") navigateTo("customers");
                } catch (error) {
                  console.error(`[TUR DÜZENLEME HATASI] Veri işleme hatası:`, error);
                  alert("Düzenleme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.");
                }
              }}
              onClose={() => navigateTo("main-dashboard")}
            />
          )}
          {currentView === "calendar" && (
            <CalendarView
              toursData={toursData.map(tour => {
                // Güvenli tip dönüşümü için
                const totalPriceValue = typeof tour.totalPrice === 'string' 
                  ? parseFloat(tour.totalPrice) 
                  : (tour.totalPrice || 0);
                  
                return {
                  id: tour.id,
                  date: new Date(tour.tourDate),
                  title: `#${tour.serialNumber || '----'} | ${tour.customerName || 'İsimsiz'} (${tour.numberOfPeople || 0} Kişi)`,
                  customers: `${tour.numberOfPeople || 0} Kişi`,
                  color: '#4f46e5',
                  location: tour.tourName || 'Belirtilmemiş',
                  time: new Date(tour.tourDate).getHours() + ':00',
                  tourName: tour.tourName,
                  customerName: tour.customerName,
                  totalPrice: totalPriceValue,
                  currency: tour.currency,
                  serialNumber: tour.serialNumber
                };
              })}
              onNavigate={navigateTo}
            />
          )}
          {currentView === "customers" && (
            <CustomerView
              customersData={customersData}
              onUpdateData={(data: CustomerData[]) => handleDataUpdate("customers", data)}
              onNavigate={navigateTo}
              editingRecord={editingRecord}
              setEditingRecord={setEditingRecord}
            />
          )}
          {currentView === "analytics" && (
            <EnhancedAnalyticsView
              financialData={financialData.map(item => {
                // String tarihleri doğru formata dönüştürme
                const processedDate = typeof item.date === 'string' ? item.date : item.date.toISOString();
                return {
                  ...item,
                  date: processedDate
                };
              })}
              toursData={toursData.map(tour => {
                // String veya Date türündeki tourDate değerini uygun string formatına dönüştürme
                const processedTourDate = typeof tour.tourDate === 'string' ? tour.tourDate : tour.tourDate.toISOString();
                const processedTourEndDate = tour.tourEndDate 
                  ? (typeof tour.tourEndDate === 'string' ? tour.tourEndDate : tour.tourEndDate.toISOString())
                  : undefined;
                
                return {
                  ...tour,
                  tourDate: processedTourDate,
                  tourEndDate: processedTourEndDate
                };
              })}
              customersData={customersData}
              onNavigate={navigateTo}
            />
          )}
          {currentView === "backup-restore" && (
            <BackupRestoreView
              onClose={() => navigateTo("main-dashboard")}
              onExport={handleExportData}
              onImport={handleImportData}
            />
          )}
          {currentView === "settings" && (
            <SettingsView
              financialData={financialData}
              toursData={toursData}
              customersData={customersData}
              onUpdateData={handleDataUpdate}
              onNavigate={navigateTo}
              onClose={() => navigateTo("main-dashboard")}
            />
          )}          {currentView === "currency" && (
            <CurrencyView onClose={() => setCurrentView("dashboard")} />
          )}
            {/* Rezervasyon Sistemi */}
          {currentView === "rezervasyon-form" && (
            <RezervasyonForm
              mode={editingReservation ? 'edit' : 'create'}
              reservationId={editingReservation?.id}
              editData={editingReservation}
              onNavigate={navigateTo}
              onCancel={() => navigateTo('rezervasyon-liste')}
              onEditComplete={handleReservationEditComplete}
            />
          )}
            {currentView === "rezervasyon-liste" && (
            <RezervasyonListe 
              reservationsData={reservationsData}
              isLoading={isLoading}
              onAddNew={() => setCurrentView("rezervasyon-form")}
              onEdit={(reservation) => {
                setEditingReservation(reservation);
                setCurrentView("rezervasyon-form");
              }}
              onRefresh={loadReservations}
            />
          )}

          {/* Yeni eklenen bileşenler */}
          {currentView === "companies" && (
            <CompanyManagement />
          )}{currentView === "debts" && (
            <BorclarPage />
          )}          {currentView === "payments" && (
            <PaymentManagement />
          )}
          {currentView === "period-data" && (
            <PeriodDataView />
          )}
        </div>
        <footer className="py-4 px-6 text-center text-muted-foreground border-t bg-white">
          <p>&copy; {new Date().getFullYear()} PassionisTravel Yönetim Sistemi. Tüm hakları saklıdır.</p>
        </footer>
      </div>
    </div>
  );
}

