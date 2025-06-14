"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DateRange } from "react-day-picker"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Search, Edit, Trash2, Eye, Printer } from "lucide-react"
import { formatCurrency, formatDate, formatCurrencyGroups } from "@/lib/data-utils"
import { deleteData } from "@/lib/db"
import { getDb, initializeFirebaseClient } from "@/lib/firebase-client-module"
import { COLLECTIONS } from "@/lib/db-firebase"
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore"
import { useToast } from "@/components/ui/use-toast"

// Type definitions
interface TourActivity {
  name: string
  date?: string | Date
  duration?: string
  price: number | string
  currency?: string
  participants?: string | number
  participantsType?: string
}

interface TourAdditionalCustomer {
  name?: string
  phone?: string
  email?: string
  idNumber?: string
}

interface TourExpense {
  id: string;
  type: string;
  name: string;
  amount: string | number;
  currency: string;
  details?: string;
  isIncludedInPrice?: boolean;
  rehberInfo?: string;
  transferType?: string;
  transferPerson?: string;
  acentaName?: string;
  provider?: string;
  description?: string;
  date?: string | Date;
  category?: string;
}

export interface TourData {
  destination?: string // EKLENDİ: Tur destinasyonu
  nationality?: string // EKLENDİ: Müşteri vatandaşlık bilgisi
  destinationName?: string // EKLENDİ: Destinasyon adı

  id: string
  serialNumber?: string
  tourName?: string
  tourDate: string | Date
  tourEndDate?: string | Date
  numberOfPeople?: number
  numberOfChildren?: number
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  customerIdNumber?: string
  customerTC?: string
  customerPassport?: string
  customerDrivingLicense?: string
  pricePerPerson?: number | string
  totalPrice?: number | string
  currency?: string
  paymentStatus?: string
  paymentMethod?: string
  partialPaymentAmount?: number | string
  partialPaymentCurrency?: string
  notes?: string
  activities?: TourActivity[]
  companyName?: string
  additionalCustomers?: TourAdditionalCustomer[]
  expenses?: TourExpense[]
}

export interface FinancialData {
  id: string
  date: string | Date
  type: string
  category?: string
  description?: string
  amount?: number
  currency?: string
  paymentMethod?: string
  relatedTourId?: string // EKLENDİ: Tur ile ilişkilendirme
  serialNumber?: string // EKLENDİ: Seri numarası özelliği
  _serialNumber?: string // EKLENDİ: İç işleyişte kullanılan seri numarası özelliği
}

export interface CustomerData {
  id: string
  name?: string
  phone?: string
  email?: string
  idNumber?: string
  citizenship?: string // Vatandaşlık/Ülke alanı eklenmiştir
  address?: string // EKLENDİ: Adres alanı
}

interface DataViewProps {
  financialData: FinancialData[]
  toursData: TourData[]
  customersData: CustomerData[]
  onClose: () => void
  onDataUpdate: (type: string, data: any) => void
  onEdit: (type: string, item: any) => void
}

interface DeleteItem {
  type: string
  id: string
}

export function DataView({ 
  financialData = [], 
  toursData = [], 
  customersData = [], 
  onClose, 
  onDataUpdate, 
  onEdit 
}: DataViewProps) {
  const { toast } = useToast();

  // Firebase başlatma - Komponent yüklendiğinde Firebase'i başlat
  useEffect(() => {
    // Firebase'i başlatmayı dene
    try {
      const result = initializeFirebaseClient();
      if (!result.success) {
        console.error("Firebase başlatılamadı:", result.error);
        toast({
          title: "Firebase Hatası",
          description: "Firebase bağlantısı kurulamadı, bazı özellikler çalışmayabilir.",
          variant: "destructive"
        });
      } else {
        console.log("Firebase başarıyla başlatıldı");
      }
    } catch (error) {
      console.error("Firebase başlatılırken beklenmeyen hata:", error);
    }
  }, [toast]);
  
  // Para birimi seçimi için state
  const [selectedCurrency, setSelectedCurrency] = useState<string>("all");
  // Diğer özet veriler için state'ler (boş başlatılıyor)
  const [nationalityData, setNationalityData] = useState<any[]>([]);
  const [referralSourceData, setReferralSourceData] = useState<any[]>([]);
  const [toursByDestination, setToursByDestination] = useState<any[]>([]);
  const [toursByMonth, setToursByMonth] = useState<any[]>([]);
  const [currencySummaries, setCurrencySummaries] = useState<any>({});
  const [activeTab, setActiveTab] = useState("tours")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTour, setSelectedTour] = useState<TourData | null>(null)
  const [selectedFinancial, setSelectedFinancial] = useState<FinancialData | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<DeleteItem>({ type: "", id: "" })
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [destinations, setDestinations] = useState<any[]>([]);
  // Tarih filtresinin aktif olup olmadığını kontrol eden state
  const [dateFilterEnabled, setDateFilterEnabled] = useState(false);
  // Sıralama için eklenen state değişkenleri
  const [sortField, setSortField] = useState<string>("date"); // Varsayılan olarak tarihe göre sıralama
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc"); // Varsayılan olarak son tarihten ilke

  // Sıralama için kullanılan fonksiyon
  const handleSortChange = (field: string) => {
    // Eğer zaten aynı alan üzerinde sıralama yapılıyorsa, sıralama yönünü değiştir
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Farklı bir alan seçilmişse, yeni alanı ayarla ve sıralama yönünü varsayılan olarak desc yap
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Her para birimi için TUR TOPLAMI gösterir - tüm aktiviteleri içerir
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
  };

  // Komponent yüklendiğinde destinasyon verilerini al
  useEffect(() => {
    // Önce localStorage'dan destinasyon verilerini almayı dene
    try {
      const savedDestinations = localStorage.getItem('destinations');
      if (savedDestinations) {
        setDestinations(JSON.parse(savedDestinations));
      } else {
        // localStorage'da yok ise, sample-destinations.json dosyasını yükle
        fetch('/data/sample-destinations.json')
          .then(response => response.json())
          .then(data => {
            setDestinations(data);
            // Aynı zamanda gelecekte kullanmak için localStorage'a kaydet
            localStorage.setItem('destinations', JSON.stringify(data));
          })
          .catch(error => {
            console.error('Destinasyon verisi yüklenemedi:', error);
          });
      }
    } catch (error) {
      console.error('Destinasyon verisi alınırken hata oluştu:', error);
    }
  }, []);

  // Tabloları sıralamak için kullanılan fonksiyon artık yukarıda tanımlandı

  const handleDelete = async () => {
    try {
      if (itemToDelete.type === "financial") {
        // First delete from IndexedDB
        await deleteData("financials", itemToDelete.id);
        console.log("Financial data deleted from IndexedDB:", itemToDelete.id);
        
        // Then update UI state
        const updatedData = financialData.filter((item: FinancialData) => item.id !== itemToDelete.id);
        console.log("Remaining financial data count:", updatedData.length);
        
        // Update both state and localStorage
        onDataUpdate("financial", updatedData);
      } else if (itemToDelete.type === "tours") {
        const tourId = itemToDelete.id;
        const db = getDb();

        try {
          // 1. İlgili tura ait finansal kayıtları (giderler) bul ve sil
          console.log("Tur ile ilişkili finansal verileri silme işlemi başlatılıyor...");
          
          // Hem local finansal veri hem de Firestore sorgusu ile kontrol ediyoruz
          const financialToDelete = financialData.filter(item => item.relatedTourId === tourId);
          
          // Finansal kayıtları önce Firestore'dan sorgulayalım (lokalde olmayan kayıtlar olabilir)
          try {
            const financialsRef = collection(db, COLLECTIONS.financials);
            const financialsQuery = query(financialsRef, where("relatedTourId", "==", tourId));
            const financialsSnapshot = await getDocs(financialsQuery);
            
            if (!financialsSnapshot.empty) {
              console.log(`Firestore'da ${financialsSnapshot.size} adet ilişkili finansal kayıt bulundu.`);
              
              const firebaseDeletePromises = financialsSnapshot.docs.map(doc => {
                console.log(`Firestore'daki finansal kayıt siliniyor: ${doc.id}`);
                return deleteDoc(doc.ref);
              });
              
              await Promise.all(firebaseDeletePromises);
              console.log("Firestore'daki tüm ilişkili finansal kayıtlar silindi.");
            }
          } catch (error) {
            console.error("Firestore finansal kayıtları silinirken hata:", error);
          }
          
          // Sonra local kayıtları kontrol et ve sil
          if (financialToDelete.length > 0) {
            console.log(`Yerel olarak ${financialToDelete.length} adet ilişkili finansal kayıt bulundu.`);
            
            for (const item of financialToDelete) {
              await deleteData("financials", item.id);
              console.log(`İlişkili finansal kayıt silindi: ${item.id}`);
            }
            
            const updatedFinancialData = financialData.filter(item => item.relatedTourId !== tourId);
            onDataUpdate("financial", updatedFinancialData);
          } else {
            console.log("Yerel olarak tur için ilişkili finansal kayıt bulunamadı.");
          }
          
          // 2. Tura ait müşteri borçlarını bul ve sil
          console.log("Tur ile ilişkili müşteri borçlarını silme işlemi başlatılıyor...");
          try {
            const customerDebtsRef = collection(db, COLLECTIONS.CUSTOMER_DEBTS);
            const customerDebtsQuery = query(customerDebtsRef, where("tourId", "==", tourId));
            const customerDebtsSnapshot = await getDocs(customerDebtsQuery);
            
            if (!customerDebtsSnapshot.empty) {
              console.log(`${customerDebtsSnapshot.size} adet ilişkili müşteri borcu bulundu.`);
              
              const deletePromises = customerDebtsSnapshot.docs.map(doc => {
                console.log(`Müşteri borcu siliniyor: ${doc.id}`);
                return deleteDoc(doc.ref);
              });
              
              await Promise.all(deletePromises);
              console.log("Tüm ilişkili müşteri borçları silindi.");
            } else {
              console.log("Tur için ilişkili müşteri borcu bulunamadı.");
            }
          } catch (error) {
            console.error("Müşteri borçları silinirken hata:", error);
          }
          
          // 3. Tura ait tedarikçi borçlarını bul ve sil (ödenmemiş olanlar)
          console.log("Tur ile ilişkili tedarikçi borçlarını silme işlemi başlatılıyor...");
          try {
            const debtsRef = collection(db, COLLECTIONS.DEBTS);
            
            // Notlar alanında tur ID'sini içeren borçları arayalım
            // Birden fazla sorgu kullanarak indeks sorunlarını aşalım
            
            // 1. TourId alanı eşleşen borçları getiren sorgu
            const debtsQuery1 = query(debtsRef, where("tourId", "==", tourId));
            const debtsSnapshot1 = await getDocs(debtsQuery1);
            
            // 2. Notlar içinde tur ID'yi içeren borçları alın
            // İndeks gerektiren sorgu kullanmamak için önce hepsini getirip filtreleme yapalım
            const allDebtsQuery = query(debtsRef);
            const allDebtsSnapshot = await getDocs(allDebtsQuery);
            
            // Tekrar eden dokümanları önlemek için bir Set kullanın
            const uniqueDocIds = new Set<string>();
            const deletePromises: Promise<void>[] = [];
            
            // İlk sorgudan gelen dokümanları işle - TourId eşleşmeleri
            if (!debtsSnapshot1.empty) {
              console.log(`TourId alanı ile ${debtsSnapshot1.size} adet ilişkili tedarikçi borcu bulundu.`);
              
              debtsSnapshot1.docs.forEach(doc => {
                const data = doc.data();
                // Sadece unpaid veya partially_paid olanları sil
                if ((data.status === "unpaid" || data.status === "partially_paid") && !uniqueDocIds.has(doc.id)) {
                  uniqueDocIds.add(doc.id);
                  console.log(`Tedarikçi borcu siliniyor: ${doc.id}`);
                  deletePromises.push(deleteDoc(doc.ref));
                }
              });
            }
            
            // Tüm borçları gözden geçir ve notes alanında tur ID'si içerenleri filtrele
            let notesMatchCount = 0;
            allDebtsSnapshot.docs.forEach(doc => {
              const data = doc.data();
              if (data.notes && 
                  typeof data.notes === 'string' && 
                  data.notes.includes(`Tur ID: ${tourId}`) &&
                  (data.status === "unpaid" || data.status === "partially_paid") && 
                  !uniqueDocIds.has(doc.id)) {
                uniqueDocIds.add(doc.id);
                notesMatchCount++;
                console.log(`Notlarda tur ID'si bulunan tedarikçi borcu siliniyor: ${doc.id}`);
                deletePromises.push(deleteDoc(doc.ref));
              }
            });
            
            if (notesMatchCount > 0) {
              console.log(`Notlar alanında ${notesMatchCount} adet ilişkili tedarikçi borcu bulundu.`);
            }
            
            if (deletePromises.length > 0) {
              await Promise.all(deletePromises);
              console.log(`${deletePromises.length} adet silinebilir tedarikçi borcu silindi.`);
            } else {
              console.log("Tur için ilişkili silinebilir tedarikçi borcu bulunamadı.");
            }
          } catch (error) {
            console.error("Tedarikçi borçları silinirken hata:", error);
          }
          
          // 4. Tura ait müşteri kaydını sil
          console.log("Tur için ilişkili müşteri kaydını silme işlemi başlatılıyor...");
          const tour = toursData.find(t => t.id === tourId);
          
          if (tour) {
            console.log("Tur bulundu, müşteri bilgileri kontrol ediliyor:", tour);
            
            // Olası müşteri tanımlayıcıları
            const customerIds = [
              tour.customerIdNumber,
              tour.customerTC,
              tour.customerPassport,
              tour.customerDrivingLicense
            ].filter(Boolean); // null veya undefined olanları filtrele
            
            // Müşteri adı ve telefon bilgisi ile eşleşenleri de kontrol edelim
            const customerName = tour.customerName;
            const customerPhone = tour.customerPhone;
            
            console.log("Müşteri tanımlayıcı bilgileri:", customerIds);
            console.log("Müşteri adı ve telefon:", customerName, customerPhone);
            
            // Müşteriyi birden fazla yöntemle bulmaya çalışalım
            let customer = null;
            
            // 1. ID'ye göre bulma
            if (customerIds.length > 0) {
              customer = customersData.find(c => 
                customerIds.includes(c.id) || 
                customerIds.includes(c.idNumber)
              );
            }
            
            // 2. Müşteri bulunamazsa, ad ve telefon numarasına göre bulma
            if (!customer && customerName && customerPhone) {
              customer = customersData.find(c => 
                c.name === customerName && c.phone === customerPhone
              );
            }
            
            // 3. Sadece ada göre bulma (son çare)
            if (!customer && customerName) {
              customer = customersData.find(c => c.name === customerName);
            }
            
            // Müşteri bulunduysa, silelim
            if (customer) {
              console.log(`Müşteri bulundu: ${customer.id} - ${customer.name}`);
              try {
                // Önce Firestore'dan silelim
                try {
                  const db = getDb();
                  const customerRef = doc(db, COLLECTIONS.customers, customer.id);
                  await deleteDoc(customerRef);
                  console.log(`Firestore'dan müşteri kaydı silindi: ${customer.id}`);
                } catch(error) {
                  console.error("Firestore'dan müşteri silinirken hata:", error);
                }
                
                // Sonra yerel veritabanından silelim
                await deleteData("customers", customer.id);
                console.log(`İlişkili müşteri kaydı başarıyla silindi: ${customer.id}`);
                
                // UI'ı güncelle
                const updatedCustomersData = customersData.filter(c => c.id !== customer.id);
                onDataUpdate("customers", updatedCustomersData);
                
                toast({
                  title: "Müşteri Silindi",
                  description: `${customer.name} müşteri kaydı başarıyla silindi.`,
                  variant: "default"
                });
              } catch(error) {
                console.error("Müşteri silinirken hata:", error);
                toast({
                  title: "Hata",
                  description: "Müşteri kaydı silinirken bir hata oluştu.",
                  variant: "destructive"
                });
              }
            } else {
              console.log("İlişkili müşteri kaydı bulunamadı.");
              toast({
                title: "Bilgi",
                description: "Bu tura ait müşteri kaydı bulunamadı veya zaten silinmiş.",
                variant: "default"
              });
            }
          } else {
            console.log("Tur verisi bulunamadı veya silinmiş olabilir.");
          }
        } catch (err) {
          console.error("İlişkili verileri silerken hata:", err);
          alert("Tur silinirken bir hata oluştu. Lütfen tekrar deneyin.");
          setIsDeleteDialogOpen(false);
          return;
        }
        
        // Son olarak asıl turu sil
        try {
          await deleteData("tours", tourId);
          console.log("Tur silindi:", tourId);
          
          // Then update UI state
          const updatedData = toursData.filter((item: TourData) => item.id !== tourId);
          console.log("Remaining tour data count:", updatedData.length);
          
          // Update both state and localStorage
          onDataUpdate("tours", updatedData);
        } catch (err) {
          console.error("Tur silinirken hata:", err);
          alert("Tur silinirken bir hata oluştu. Lütfen tekrar deneyin.");
        }
      } else if (itemToDelete.type === "customers") {
        // First delete from IndexedDB
        await deleteData("customers", itemToDelete.id);
        console.log("Customer data deleted from IndexedDB:", itemToDelete.id);
        
        // Then update UI state
        const updatedData = customersData.filter((item: CustomerData) => item.id !== itemToDelete.id);
        console.log("Remaining customer count:", updatedData.length);
        
        // Update both state and localStorage
        onDataUpdate("customers", updatedData);
      }
      
      // Deletion completed
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error during deletion:", error);
      alert("An error occurred while deleting the record! Please try again.");
      setIsDeleteDialogOpen(false);
    }
  }

  const openDeleteDialog = (type: string, id: string) => {
    setItemToDelete({ type, id })
    setIsDeleteDialogOpen(true)
  }

  const handleEdit = (type: string, item: any) => {
    console.log(`[DATA-VIEW] ${type} düzenleme başlatılıyor:`, item);
    
    // Derin kopya oluştur ve böylece referans yoluyla değişiklikleri önle
    const itemCopy = JSON.parse(JSON.stringify(item));
    
    // Aktiviteler ve giderlerde addToDebt alanını kontrol et
    if (type === "tours" && itemCopy) {
      if (itemCopy.expenses && Array.isArray(itemCopy.expenses)) {
        itemCopy.expenses = itemCopy.expenses.map((expense: any) => ({
          ...expense,
          addToDebt: expense.addToDebt !== undefined ? expense.addToDebt : false
        }));
      }
      
      if (itemCopy.activities && Array.isArray(itemCopy.activities)) {
        itemCopy.activities = itemCopy.activities.map((activity: any) => ({
          ...activity,
          addToDebt: activity.addToDebt !== undefined ? activity.addToDebt : false
        }));
      }
    }
    
    console.log(`[DATA-VIEW] ${type} düzenlemeye hazır:`, itemCopy);
    onEdit(type, itemCopy);
  }

  // Function for printing tour details
  const handlePrint = (tour: TourData) => {
    try {
      // Save tour data to localStorage
      try {
        localStorage.removeItem('printTourData'); // Clear old data first
        localStorage.setItem('printTourData', JSON.stringify(tour));
        console.log('Data to be printed saved:', tour);
      } catch (error) {
        console.error('Error saving data to localStorage:', error);
        alert('An error occurred while saving data for printing. Please try again.');
        return;
      }
      
      // Open a new window and redirect to print page
      const printWindow = window.open(`/print/tour/${tour.id}`, '_blank');
      
      if (!printWindow) {
        alert('Could not open print window. Please check your popup blocker.');
      }
    } catch (error) {
      console.error('Error during print operation:', error);
      alert('An error occurred during the print operation. Please try again.');
    }
  }
  
  // Print fonksiyonu aktif olarak çalışmakta
  // Yazdır butonu TourPreview bileşeni içine eklendi
  
  // Tarih kontrolü yardımcı fonksiyonu - tarih, belirtilen aralıkta mı?
  const isDateInRange = (date: string | Date | undefined, range: DateRange | undefined): boolean => {
    if (!range || !date) return true; // Tarih aralığı belirtilmemişse veya tarih yoksa filtreleme yapma
    
    const checkDate = new Date(date);
    
    // Başlangıç tarihi kontrolü
    if (range.from) {
      const fromDate = new Date(range.from);
      fromDate.setHours(0, 0, 0, 0);
      if (checkDate < fromDate) return false;
    }
    
    // Bitiş tarihi kontrolü
    if (range.to) {
      const toDate = new Date(range.to);
      toDate.setHours(23, 59, 59, 999);
      if (checkDate > toDate) return false;
    }
    
    return true;
  };
  
  // Her para birimi için TUR TOPLAMI göster fonksiyonu yukarıda zaten tanımlandığı için buradaki tanımlama kaldırıldı
  
  // Seri numarasından sayısal değeri çıkaran yardımcı fonksiyon
  const getNumericPartFromSerialNumber = (serialNumber: string): { numericValue: number, prefix: string } => {
    // Önce, başlangıçtaki tüm sayısal karakterleri çıkar (örn: "01TF", "4F")
    const numericMatch = serialNumber.match(/^(\d+)/);
    
    // Sayısal kısım tespit edildi ise
    if (numericMatch && numericMatch[1]) {
      const numericValue = parseInt(numericMatch[1], 10);
      // Sayısal olmayan ön ek (varsa)
      const prefix = serialNumber.substring(0, serialNumber.indexOf(numericMatch[1]));
      return { numericValue, prefix };
    }
    
    // Sayısal bir kısım yoksa, varsayılan değerler
    return { numericValue: -1, prefix: serialNumber };
  };
  
  // Tours verilerini sıralayan yardımcı fonksiyon
  const sortToursData = (data: TourData[]) => {
    return [...data].sort((a, b) => {
      if (sortField === "serialNumber") {
        const aNum = a.serialNumber || "";
        const bNum = b.serialNumber || "";
        
        // Seri numaralarındaki sayısal kısımları çıkar
        const aNumInfo = getNumericPartFromSerialNumber(aNum);
        const bNumInfo = getNumericPartFromSerialNumber(bNum);
        
        // Hem sayısal kısımları var, hem de aynı ön eke sahip ise 
        // (örn: ikisi de "TF" ile bitiyorsa veya "F" ile)
        const aNumberPart = aNumInfo.numericValue;
        const bNumberPart = bNumInfo.numericValue;
        
        // Her iki tarafta da sayısal kısım varsa, sayısal olarak karşılaştır
        if (aNumberPart >= 0 && bNumberPart >= 0) {
          return sortDirection === "asc" ? aNumberPart - bNumberPart : bNumberPart - aNumberPart;
        }
        
        // Sayısal karşılaştırma yapılamazsa, metinsel karşılaştırmaya geri dön
        return sortDirection === "asc" ? aNum.localeCompare(bNum) : bNum.localeCompare(aNum);
      } else if (sortField === "customerName") {
        const aName = a.customerName || "";
        const bName = b.customerName || "";
        return sortDirection === "asc" ? aName.localeCompare(bName) : bName.localeCompare(aName);
      } else if (sortField === "date") {
        const aDate = new Date(a.tourDate).getTime();
        const bDate = new Date(b.tourDate).getTime();
        return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
      }
      // Varsayılan sıralama (tarih)
      const aDate = new Date(a.tourDate).getTime();
      const bDate = new Date(b.tourDate).getTime();
      return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
    });
  };
  
  const filteredToursData = sortToursData(toursData.filter(
    (item: TourData) => {
      // Tarih aralığı kontrolü - sadece tarih filtresi etkinleştirilmişse çalıştır
      if (dateFilterEnabled && dateRange && !isDateInRange(item.tourDate, dateRange)) {
        return false;
      }
      
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      
      // Tur adı yerine müşteri adı olarak değiştiriliyor
      return (
        (item.customerName?.toLowerCase().includes(searchLower) || '') ||
        (item.tourName?.toLowerCase().includes(searchLower) || '') || // Tur adı da aranabilsin
        (item.serialNumber?.toLowerCase().includes(searchLower) || '') ||
        // "F" olmadan seri numarasını arama
        (item.serialNumber && searchLower.startsWith("f") && 
          item.serialNumber.toLowerCase().includes(searchLower.substring(1)))
      );
    }
  ))

  const filteredFinancialData = (() => {
    // Önce tüm işlem numaralarını sabit bir şekilde oluştur (filtrelemeden önce)
    let incomeCounter = 1;
    let expenseCounter = 1;
    
    // Tüm finansal kayıtların işlem numaralarını önceden hesapla
    const financialWithSerialNumbers = financialData.map(item => {
      let serialNumber = "";
      let displayDate = item.date;
      let displayDescription = item.description || '-';
      let tourCustomerName = "";
      
      if (item.relatedTourId && item.category === "Tur Gideri") {
        const tourInfo = toursData.find(t => t.id === item.relatedTourId);
        if (tourInfo) {
          serialNumber = `${tourInfo.serialNumber || tourInfo.id?.slice(-4) || ""}TF`;
          tourCustomerName = tourInfo.customerName || "";
          
          const expenseType = item.description?.split(' - ')[1] || "Gider";
          displayDescription = `${tourInfo.customerName || "Müşteri"} - ${expenseType}`;
        } else {
          serialNumber = `${expenseCounter++}TF`;
        }
      } else {
        // Normal finans kaydı için gelir veya gidere göre sıralı numara ata
        if (item.type === 'income') {
          serialNumber = `${incomeCounter++}F`;
        } else {
          serialNumber = `${expenseCounter++}F`;
        }
      }
      
      return {
        ...item,
        _serialNumber: serialNumber,  // Önceden hesaplanmış işlem numarası
        _displayDate: displayDate,
        _displayDescription: displayDescription,
        _tourCustomerName: tourCustomerName
      };
    });

    // Verileri sıralayan yardımcı fonksiyon
    const sortFinancialData = (data: any[]) => {
      return [...data].sort((a, b) => {
        if (sortField === "serialNumber" || sortField === "işlem no") {
          // İşlem numarasına göre sıralama
          const aNum = a._serialNumber || "";
          const bNum = b._serialNumber || "";
          
          // İlişkili tur bilgilerini kullanarak önceliklendirme yap
          const aTourId = a.relatedTourId || "";
          const bTourId = b.relatedTourId || "";
          
          // İşlem numarası formatlarını belirle (TF, F gibi)
          const getTourFormat = (serialNum: string) => {
            if (serialNum.endsWith('TF')) return 'TF';
            if (serialNum.endsWith('F')) return 'F';
            return '';
          };
          
          const aTourFormat = getTourFormat(aNum);
          const bTourFormat = getTourFormat(bNum);
          
          // Sayısal kısmı ve formatı çıkar
          const parseSerialNumber = (serialNum: string) => {
            // Sayısal kısım için regex ("01TF", "4F" gibi)
            const numericMatch = serialNum.match(/^(\d+)/);
            let numericValue = -1;
            
            if (numericMatch && numericMatch[1]) {
              numericValue = parseInt(numericMatch[1], 10);
            }
            
            return { 
              numericValue, 
              format: getTourFormat(serialNum),
              originalValue: serialNum
            };
          };
          
          const aParsed = parseSerialNumber(aNum);
          const bParsed = parseSerialNumber(bNum);
          
          // Aynı format tipindeyse sayısal karşılaştırma yap
          if (aParsed.format === bParsed.format) {
            // Hem sayısal değer varsa
            if (!isNaN(aParsed.numericValue) && !isNaN(bParsed.numericValue)) {
              return sortDirection === "asc" 
                ? aParsed.numericValue - bParsed.numericValue 
                : bParsed.numericValue - aParsed.numericValue;
            }
          }
          
          // Format farklıysa, önce TF formatını göster
          if (aParsed.format !== bParsed.format) {
            return sortDirection === "asc"
              ? aParsed.format.localeCompare(bParsed.format)
              : bParsed.format.localeCompare(aParsed.format);
          }
          
          // Sayısal karşılaştırma yapılamazsa, metinsel karşılaştırmaya geri dön
          return sortDirection === "asc" ? aNum.localeCompare(bNum) : bNum.localeCompare(aNum);
        } else if (sortField === "date" || sortField === "tarih") {
          // Tarihe göre sıralama
          const aDate = new Date(a._displayDate || a.date).getTime();
          const bDate = new Date(b._displayDate || b.date).getTime();
          return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
        } else if (sortField === "type" || sortField === "işlem tipi") {
          // İşlem tipine göre sıralama
          const aType = a.type || "";
          const bType = b.type || "";
          return sortDirection === "asc" 
            ? aType.localeCompare(bType) 
            : bType.localeCompare(aType);
        } else if (sortField === "category" || sortField === "kategori") {
          // Kategoriye göre sıralama
          const aCategory = a.category || "";
          const bCategory = b.category || "";
          return sortDirection === "asc" 
            ? aCategory.localeCompare(bCategory) 
            : bCategory.localeCompare(aCategory);
        } else if (sortField === "description" || sortField === "açıklama") {
          // Açıklamaya göre sıralama
          const aDesc = a._displayDescription || a.description || "";
          const bDesc = b._displayDescription || b.description || "";
          return sortDirection === "asc" 
            ? aDesc.localeCompare(bDesc) 
            : bDesc.localeCompare(aDesc);
        } else if (sortField === "amount" || sortField === "tutar") {
          // Tutara göre sıralama
          const aAmount = Number(a.amount) || 0;
          const bAmount = Number(b.amount) || 0;
          return sortDirection === "asc" ? aAmount - bAmount : bAmount - aAmount;
        }
        
        // Varsayılan sıralama (tarih)
        const aDate = new Date(a._displayDate || a.date).getTime();
        const bDate = new Date(b._displayDate || b.date).getTime();
        return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
      });
    };

    // Tarih aralığına göre filtrele - sadece tarih filtresi etkinleştirilmişse
    const dateFiltered = financialWithSerialNumbers.filter(item => {
      // Tarih filtresi etkin değilse tüm kayıtları göster
      if (!dateFilterEnabled) return true;
      // Filtre etkinse ve tarih aralığı seçiliyse, tarihi kontrol et
      return isDateInRange(item.date, dateRange);
    });

    // Arama terimine göre filtrele    
    if (!searchTerm) {
      // Sıralanmış veriyi döndür
      return sortFinancialData(dateFiltered);
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    return dateFiltered.filter(item => {
      // Sabit numarayı kullan
      const serialNumber = item._serialNumber;
      
      // Farklı formatlarda aranabilen işlem numarası kontrolü
      // F3 veya 3 gibi aramalarda hem tam metin hem de sayı olarak kontrolü yap
      const searchWithoutF = searchLower.startsWith("f") ? searchLower.substring(1) : searchLower;
      const serialWithoutF = serialNumber.toLowerCase().substring(1);
      
      // F olmadan doğrudan sayı karşılaştırması
      const searchNumberOnly = searchLower.replace(/\D/g, ''); // Sadece sayılar
      const serialNumberOnly = serialNumber.replace(/\D/g, ''); // Sadece sayılar
      
      const isSerialMatch = 
        serialNumber.toLowerCase() === searchLower || // Tam eşleşme (F1)
        serialWithoutF === searchWithoutF || // F hariç eşleşme (1)
        serialNumber.toLowerCase().includes(searchLower) || // İşlem no içinde arama
        serialWithoutF === searchNumberOnly || // Sayı olarak eşleşme
        serialNumberOnly === searchNumberOnly; // Sadece sayı karşılaştırması
      
      // Tanımların ayrılması
      let expenseType = "";
      if (item.description && item.description.includes(" - ")) {
        const parts = item.description.split(" - ");
        expenseType = parts[1] || "";
      }
      
      return (
        isSerialMatch || // İşlem numarası eşleşmesi
        (item.description?.toLowerCase().includes(searchLower) || '') || // Açıklama eşleşmesi
        (item.category?.toLowerCase().includes(searchLower) || '') || // Kategori eşleşmesi
        (item.type.toLowerCase().includes(searchLower)) || // Tür eşleşmesi
        (item._tourCustomerName.toLowerCase().includes(searchLower)) || // Müşteri adı eşleşmesi
        (expenseType.toLowerCase().includes(searchLower)) // Gider türü eşleşmesi
      );
    });
    
    // Filtrelenmiş sonuçları sırala
    return sortFinancialData(dateFiltered.filter(item => {
      // Arama terimi yoksa tüm kayıtları göster
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase().trim();
      
      // İşlem numarası kontrolü ve diğer alanlar
      return (
        (item._serialNumber?.toLowerCase().includes(searchLower)) ||
        (item.description?.toLowerCase().includes(searchLower) || '') ||
        (item.category?.toLowerCase().includes(searchLower) || '') ||
        (item.type.toLowerCase().includes(searchLower))
      );
    }));
  })();

  const filteredCustomersData = customersData
    .filter((item: CustomerData) => {
      // Not: Müşteri kayıtlarında doğrudan tarih alanı olmayabilir,
      // Bu nedenle müşterilerin bu tarih filtrelerinden etkilenmeyebilir
      // veya burada başka bir tarih alanı kullanılabilir

      // Eğer arama terimi yoksa tüm müşterileri göster
      if (!searchTerm) return true;
      
      // Arama terimine göre filtrele
      const searchLower = searchTerm.toLowerCase();
      return (
        (item.name?.toLowerCase().includes(searchLower) || '') ||
        (item.phone?.toLowerCase().includes(searchLower) || '') ||
        (item.email?.toLowerCase().includes(searchLower) || '') ||
        (item.citizenship?.toLowerCase().includes(searchLower) || '') ||
        (item.idNumber?.toLowerCase().includes(searchLower) || '')
      );
    });

  // Tour Preview Component
  const TourPreview = ({ tour }: { tour: TourData | null }) => {
    if (!tour) return null;

    // TourSummary ile aynı alanları ve kart yapısını kullan
    // Alanları normalize et
    const additionalCustomers = tour.additionalCustomers || [];
    const expenses = tour.expenses || [];
    const activities = tour.activities || [];
    const numberOfPeople = tour.numberOfPeople || 0;
    const numberOfChildren = tour.numberOfChildren || 0;
    const pricePerPerson = tour.pricePerPerson || 0;
    const currency = tour.currency || "";
    const totalPrice = tour.totalPrice || (Number(pricePerPerson) * Number(numberOfPeople));
    const paymentStatus = tour.paymentStatus || "";
    const paymentMethod = tour.paymentMethod || "";
    const partialPaymentAmount = tour.partialPaymentAmount || "";
    const partialPaymentCurrency = tour.partialPaymentCurrency || "";
    const notes = tour.notes || "";
    const destinationName = tour.destinationName || tour.destination || "-";
    // Fallback: selectedTourName -> tourName -> description -> notes -> "-"
    const selectedTourName = (tour as any).selectedTourName || tour.tourName || (tour as any).description || (tour as any).notes || "-";
    // Fallback: customerAddress -> "adres" -> "-"
    const customerAddress = (tour as any).customerAddress || (tour as any).adres || "-";
    // Fallback: referralSource -> "nereden" -> "-"
    const referralSource = (tour as any).referralSource || (tour as any).nereden || "-";

    // Ödeme durumları ve yöntemleri
    const paymentStatusMap: Record<string, string> = {
      pending: "Beklemede",
      partial: "Kısmi Ödeme",
      completed: "Tamamlandı",
      refunded: "İade Edildi",
    };
    const paymentMethodMap: Record<string, string> = {
      cash: "Nakit",
      creditCard: "Kredi Kartı",
      bankTransfer: "Banka Transferi",
      online_payment: "Online Ödeme",
      other: "Diğer",
    };

    // Gider kategori türleri için dönüşüm haritası
    const expenseTypeMap: Record<string, string> = {
      accommodation: "Konaklama",
      transportation: "Ulaşım",
      transfer: "Transfer",
      guide: "Rehberlik",
      agency: "Acente",
      porter: "Hanutçu",
      food: "Yemek",
      meal: "Yemek",
      activity: "Aktivite",
      general: "Genel",
      other: "Diğer"
    };

    // Aktivite adı eksikse, activityId ile bul
    const getActivityName = (activity: any) => {
      if (activity.name && activity.name !== "") return activity.name;
      if (activity.activityId && Array.isArray(activities)) {
        const found = activities.find((a: any) => a.id === activity.activityId);
        if (found && found.name) return found.name;
      }
      return "-";
    };

    // Tur fiyatı (kişi başı fiyat * kişi sayısı) kendi para biriminde
    const tourTotals: Record<string, number> = {};
    if (currency && Number(pricePerPerson) && Number(numberOfPeople)) {
      tourTotals[currency] = (Number(pricePerPerson) || 0) * (Number(numberOfPeople) || 0);
    }
    // Aktivite toplamları (her biri kendi para biriminde)
    const activityTotals: Record<string, number> = {};
    activities.forEach((activity) => {
      const cur = activity.currency || currency || "TRY";
      let participantCount = 0;
      if (activity.participantsType === 'all') {
        participantCount = Number(numberOfPeople) + Number(numberOfChildren);
      } else if (activity.participants && Number(activity.participants) > 0) {
        participantCount = Number(activity.participants);
      }
      const toplam = (Number(activity.price) || 0) * participantCount;
      if (!activityTotals[cur]) activityTotals[cur] = 0;
      activityTotals[cur] += toplam;
    });
    // Tüm toplamları birleştir
    const allTotals: Record<string, number> = { ...tourTotals };
    for (const cur in activityTotals) {
      allTotals[cur] = (allTotals[cur] || 0) + activityTotals[cur];
    }
    // Toplamları string olarak hazırla
    const totalString = Object.entries(allTotals)
      .filter(([_, val]) => val > 0)
      .map(([cur, val]) => `${val} ${cur}`)
      .join(" + ") || "-";

    // Referans kaynakları için harita (step 6 ile uyumlu)
    const referralSourceMap: Record<string, string> = {
      website: "İnternet Sitesi",
      hotel: "Otel Yönlendirmesi",
      local_guide: "Hanutçu / Yerel Rehber",
      walk_in: "Kapı Önü Müşterisi",
      repeat: "Tekrar Gelen Müşteri",
      recommendation: "Tavsiye",
      social_media: "Sosyal Medya",
      other: "Diğer",
    };

    return (
      <div className="space-y-4 max-h-[80vh] overflow-y-auto p-2 min-w-[700px]">
        {/* Print Butonu */}
        <div className="flex justify-end mb-2">
          <Button 
            onClick={() => handlePrint(tour)} 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
          >
            <Printer className="h-4 w-4" />
            Yazdır
          </Button>
        </div>
        
        {/* 1. Müşteri Bilgileri */}
        <Card>
          <CardHeader className="pb-2 pt-2 mb-0 mt-0"><CardTitle>Müşteri Bilgileri</CardTitle></CardHeader>
          <CardContent className="pt-2 pb-2 mb-0 mt-0">
            <Table>
              <TableBody>
                <TableRow><TableHead>Ad Soyad</TableHead><TableCell>{tour.customerName || '-'}</TableCell></TableRow>
                <TableRow><TableHead>Telefon</TableHead><TableCell>{tour.customerPhone || '-'}</TableCell></TableRow>
                <TableRow><TableHead>E-posta</TableHead><TableCell>{tour.customerEmail || '-'}</TableCell></TableRow>
                <TableRow><TableHead>T.C./Pasaport No</TableHead><TableCell>{tour.customerIdNumber || '-'}</TableCell></TableRow>
                <TableRow><TableHead>Adres</TableHead><TableCell>{customerAddress}</TableCell></TableRow>
                <TableRow><TableHead>Uyruk</TableHead><TableCell>{tour.nationality || '-'}</TableCell></TableRow>
                <TableRow><TableHead>Referans Kaynağı</TableHead><TableCell>{referralSourceMap[referralSource] || referralSource || '-'}</TableCell></TableRow>
              </TableBody>
            </Table>
            {additionalCustomers.length > 0 && (
              <div className="mt-2 mb-0">
                <span className="font-semibold">Ek Katılımcılar:</span>
                <Table className="mt-1 mb-0">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ad Soyad</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>E-posta</TableHead>
                      <TableHead>T.C./Pasaport No</TableHead>
                      <TableHead>Adres</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {additionalCustomers.map((c: any, idx: number) => (
                      <TableRow key={idx} className="h-8">
                        <TableCell className="py-1 px-2">{c.name || '-'}</TableCell>
                        <TableCell className="py-1 px-2">{c.phone || '-'}</TableCell>
                        <TableCell className="py-1 px-2">{c.email || '-'}</TableCell>
                        <TableCell className="py-1 px-2">{c.idNumber || '-'}</TableCell>
                        <TableCell className="py-1 px-2">{c.address || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Tur Detayları */}
        <Card>
          <CardHeader className="pb-2 pt-2 mb-0 mt-0"><CardTitle>Tur Detayları</CardTitle></CardHeader>
          <CardContent className="pt-2 pb-2 mb-0 mt-0">
            <Table>
              <TableBody>
                <TableRow><TableHead>Seri No</TableHead><TableCell>{tour.serialNumber || '-'}</TableCell></TableRow>
                <TableRow><TableHead>Tur Kaydını Oluşturan Kişi</TableHead><TableCell className="font-medium">{tour.tourName || '-'}</TableCell></TableRow>
                <TableRow><TableHead>Başlangıç Tarihi</TableHead><TableCell>{formatDate(tour.tourDate)}</TableCell></TableRow>
                <TableRow><TableHead>Bitiş Tarihi</TableHead><TableCell>{formatDate(tour.tourEndDate)}</TableCell></TableRow>
                <TableRow><TableHead>Kişi Sayısı</TableHead><TableCell>{numberOfPeople}</TableCell></TableRow>
                <TableRow><TableHead>Çocuk Sayısı</TableHead><TableCell>{numberOfChildren}</TableCell></TableRow>
                <TableRow><TableHead>Destinasyon</TableHead><TableCell className="font-medium">{destinationName}</TableCell></TableRow>
                <TableRow><TableHead>Tur Bilgisi</TableHead><TableCell className="font-medium">{selectedTourName}</TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 3. Giderler */}
        <Card>
          <CardHeader className="pb-2 pt-2 mb-0 mt-0"><CardTitle>Giderler</CardTitle></CardHeader>
          <CardContent className="pt-2 pb-2 mb-0 mt-0">
            {expenses.length === 0 ? (
              <div className="text-muted-foreground">Gider eklenmemiş.</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="h-8">
                      <TableHead className="py-1 px-2">Gider Tipi</TableHead>
                      <TableHead className="py-1 px-2">Açıklama</TableHead>
                      <TableHead className="py-1 px-2">Tutar</TableHead>
                      <TableHead className="py-1 px-2">Para Birimi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense, idx) => (
                      <TableRow key={idx} className="h-8">
                        <TableCell className="py-1 px-2">{expenseTypeMap[expense.type] || expense.type}</TableCell>
                        <TableCell className="py-1 px-2">{expense.name}</TableCell>
                        <TableCell className="py-1 px-2">{expense.amount}</TableCell>
                        <TableCell className="py-1 px-2">{expense.currency}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>

        {/* 4. Aktiviteler */}
        <Card>
          <CardHeader className="pb-2 pt-2 mb-0 mt-0"><CardTitle>Aktiviteler</CardTitle></CardHeader>
          <CardContent className="pt-2 pb-2 mb-0 mt-0">
            {activities.length === 0 ? (
              <div className="text-muted-foreground">Aktivite eklenmemiş.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="py-1 px-2">Aktivite Adı</TableHead>
                    <TableHead className="py-1 px-2">Tarih</TableHead>
                    <TableHead className="py-1 px-2">Süre</TableHead>
                    <TableHead className="py-1 px-2">Katılımcı Sayısı</TableHead>
                    <TableHead className="py-1 px-2">Birim Ücret</TableHead>
                    <TableHead className="py-1 px-2">Toplam Ücret</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity, idx) => {
                    const price = activity.price ? Number(activity.price) : 0;
                    const currency = activity.currency || tour.currency || '';
                    let participants = '-';
                    let totalPrice = '-';
                    let participantCount = 0;
                    if (activity.participantsType === 'all') {
                      participantCount = Number(numberOfPeople) + Number(numberOfChildren);
                    } else if (activity.participants && Number(activity.participants) > 0) {
                      participantCount = Number(activity.participants);
                    }
                    if (participantCount > 0) {
                      participants = String(participantCount);
                      totalPrice = (price * participantCount).toLocaleString() + ' ' + currency;
                    } else {
                      totalPrice = price ? price.toLocaleString() + ' ' + currency : '-';
                    }
                    return (
                      <TableRow key={idx} className="h-8">
                        <TableCell className="py-1 px-2">{getActivityName(activity)}</TableCell>
                        <TableCell className="py-1 px-2">{formatDate(activity.date)}</TableCell>
                        <TableCell className="py-1 px-2">{activity.duration || '-'}</TableCell>
                        <TableCell className="py-1 px-2">{participants}</TableCell>
                        <TableCell className="py-1 px-2">{activity.price ? `${activity.price} ${currency}` : '-'}</TableCell>
                        <TableCell className="py-1 px-2">{totalPrice}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 5. Ödeme Bilgileri */}
        <Card>
          <CardHeader className="pb-2 pt-2 mb-0 mt-0"><CardTitle>Ödeme Bilgileri</CardTitle></CardHeader>
          <CardContent className="pt-2 pb-2 mb-0 mt-0">
            <Table>
              <TableBody>
                <TableRow><TableHead>Tur Fiyatı</TableHead><TableCell>{numberOfPeople && pricePerPerson ? Number(pricePerPerson) * Number(numberOfPeople) : '-'} {currency || ''}</TableCell></TableRow>
                {activities.length > 0 && (
                  <TableRow>
                    <TableHead>Aktiviteler</TableHead>
                    <TableCell>
                      {(() => {
                        // Aktivite toplamlarını doğru hesapla
                        const activityTotals: Record<string, number> = {};
                        activities.forEach((activity) => {
                          const cur = activity.currency || currency || 'TRY';
                          let participantCount = 0;
                          if (activity.participantsType === 'all') {
                            participantCount = Number(numberOfPeople) + Number(numberOfChildren);
                          } else if (activity.participants && Number(activity.participants) > 0) {
                            participantCount = Number(activity.participants);
                          }
                          const toplam = (Number(activity.price) || 0) * participantCount;
                          if (!activityTotals[cur]) activityTotals[cur] = 0;
                          activityTotals[cur] += toplam;
                        });
                        return Object.entries(activityTotals)
                          .filter(([_, val]) => val > 0)
                          .map(([cur, val]) => `${val} ${cur}`)
                          .join(' + ') || '-';
                      })()}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow><TableHead>Toplam Fiyat</TableHead><TableCell>{(() => {
                  // Tur ve aktivitelerin toplamı
                  const tourTotals: Record<string, number> = {};
                  if (currency && Number(pricePerPerson) && Number(numberOfPeople)) {
                    tourTotals[currency] = (Number(pricePerPerson) || 0) * (Number(numberOfPeople) || 0);
                  }
                  const activityTotals: Record<string, number> = {};
                  activities.forEach((activity) => {
                    const cur = activity.currency || currency || 'TRY';
                    let participantCount = 0;
                    if (activity.participantsType === 'all') {
                      participantCount = Number(numberOfPeople) + Number(numberOfChildren);
                    } else if (activity.participants && Number(activity.participants) > 0) {
                      participantCount = Number(activity.participants);
                    }
                    const toplam = (Number(activity.price) || 0) * participantCount;
                    if (!activityTotals[cur]) activityTotals[cur] = 0;
                    activityTotals[cur] += toplam;
                  });
                  const allTotals: Record<string, number> = { ...tourTotals };
                  for (const cur in activityTotals) {
                    allTotals[cur] = (allTotals[cur] || 0) + activityTotals[cur];
                  }
                  return Object.entries(allTotals)
                    .filter(([_, val]) => val > 0)
                    .map(([cur, val]) => `${val} ${cur}`)
                    .join(' + ') || '-';
                })()}</TableCell></TableRow>
                <TableRow><TableHead>Ödeme Durumu</TableHead><TableCell>{paymentStatusMap[paymentStatus] || paymentStatus || '-'}</TableCell></TableRow>
                <TableRow><TableHead>Ödeme Yöntemi</TableHead><TableCell>{paymentMethodMap[paymentMethod] || paymentMethod || '-'}</TableCell></TableRow>
                <TableRow><TableHead>Kısmi Ödeme</TableHead><TableCell>{partialPaymentAmount || '-'} {partialPaymentCurrency || ''}</TableCell></TableRow>
              </TableBody>
            </Table>
            {notes && (
              <div className="mt-1">
                <span className="font-semibold">Notlar:</span>
                <div className="whitespace-pre-line">{notes}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Financial Record Preview Component
  const FinancialPreview = ({ financial }: { financial: FinancialData | null }) => {
    if (!financial) return null;

    // İlgili turu bul
    const tourInfo = financial.relatedTourId ? toursData.find(t => t.id === financial.relatedTourId) : null;
    
    // Gerçek müşteri adını bul
    const customerName = tourInfo?.customerName || "-";
    
    // Gider açıklaması - sadece gider türünü al
    let expenseDesc = "-";
    if (financial.description) {
      const parts = financial.description.split(" - ");
      expenseDesc = parts.length > 1 ? parts[1].split("(")[0].trim() : financial.description;
    }
    
    // Seri numarası
    const serialNumber = tourInfo?.serialNumber || "-";

    // Destinasyon bilgisini bul
    const destinationName = tourInfo ? (tourInfo.destinationName || tourInfo.destination || "-") : "-";

    // Tur tarihi formatı: "başlangıç / bitiş" (eğer bitiş varsa)
    let tourDateFormatted = "-";
    if (tourInfo) {
      const startDate = formatDate(tourInfo.tourDate);
      
      if (tourInfo.tourEndDate) {
        const endDate = formatDate(tourInfo.tourEndDate);
        tourDateFormatted = `${startDate} / ${endDate}`;
      } else {
        tourDateFormatted = startDate;
      }
    }

    // Finansal kaydın türüne göre başlık belirle
    const getTitle = () => {
      if (financial.relatedTourId && financial.category === "Tur Gideri") {
        return "Finansal Kayıt Tur Gider Detayları";
      } else if (financial.type === "income") {
        return "Finansal Kayıt Gelir Detayları";
      } else {
        return "Finansal Kayıt Gider Detayları";
      }
    };

    return (
      <div className="space-y-6 max-h-[70vh] overflow-y-auto p-2">
        <table className="w-full border-collapse border border-gray-300">
          <tbody>
            <tr className="bg-gray-50">
              <td className="border border-gray-300 px-4 py-2 font-semibold w-1/4">Müşteri:</td>
              <td className="border border-gray-300 px-4 py-2">{customerName}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-semibold">Destinasyon:</td>
              <td className="border border-gray-300 px-4 py-2">{destinationName}</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="border border-gray-300 px-4 py-2 font-semibold">İşlem Tarihi:</td>
              <td className="border border-gray-300 px-4 py-2">{formatDate(financial.date)}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-semibold">Tur Tarihi:</td>
              <td className="border border-gray-300 px-4 py-2">{tourDateFormatted}</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="border border-gray-300 px-4 py-2 font-semibold">Kategori:</td>
              <td className="border border-gray-300 px-4 py-2">{financial.category || "-"}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-semibold">Açıklama:</td>
              <td className="border border-gray-300 px-4 py-2">{expenseDesc}</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="border border-gray-300 px-4 py-2 font-semibold">Nakit:</td>
              <td className="border border-gray-300 px-4 py-2">{financial.currency} {financial.amount?.toLocaleString() || "-"}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-semibold">Seri No:</td>
              <td className="border border-gray-300 px-4 py-2">{serialNumber}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Customer Preview Component
  const CustomerPreview = ({ customer }: { customer: CustomerData | null }) => {
    if (!customer) return null

    return (
      <div className="space-y-6 max-h-[70vh] overflow-y-auto p-2">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Müşteri Bilgileri</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Ad Soyad:</span>
                <p>{customer.name || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Telefon:</span>
                <p>{customer.phone || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">E-posta:</span>
                <p>{customer.email || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">TC/Pasaport No:</span>
                <p>{customer.idNumber || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Vatandaşlık / Ülke:</span>
                <p>{customer.citizenship || '-'}</p>
              </div>
              {customer.address && (
                <div>
                  <span className="text-sm text-muted-foreground">Adres:</span>
                  <p>{customer.address}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Tur giderlerini hesaplayan yardımcı fonksiyon
  const calculateTourExpenses = (tour: TourData) => {
    if (!tour || !tour.expenses || !Array.isArray(tour.expenses)) {
      return 0;
    }
    
    return tour.expenses.reduce((sum, expense) => {
      return sum + (Number(expense.amount) || 0);
    }, 0);
  };

  // Tur için kalan bakiyeyi hesaplayan fonksiyon
  const calculateTourBalance = (tour: TourData) => {
    const totalPrice = Number(tour.totalPrice) || 0;
    const expenses = calculateTourExpenses(tour);
    return totalPrice - expenses;
  };

  // Tur için kazançı (kârı) hesaplayan fonksiyon - para birimi bazında
  const calculateTourProfit = (tour: TourData) => {
    const profit: Record<string, number> = {};
    if (!tour) return profit;

    // 1. Gelirleri (tur toplamları) hesaplama - para birimi bazında
    const totals: Record<string, number> = {};
    
    // Ana tur tutarını ekle
    const tourCurrency = tour.currency || 'TRY';
    const tourTotal = Number(tour.totalPrice) || 0;
    if (tourTotal > 0) {
      totals[tourCurrency] = (totals[tourCurrency] || 0) + tourTotal;
    }
    
    // Aktivitelerin toplamlarını ekle
    if (Array.isArray(tour.activities)) {
      tour.activities.forEach((act: TourActivity) => {
        const actCurrency = act.currency || tourCurrency;
        const actPrice = Number(act.price) || 0;
        let actParticipants = 0;
        
        // Katılımcı sayısını belirle
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
    
    // 2. Giderleri hesaplama - para birimi bazında
    const expenses: Record<string, number> = {};
    if (Array.isArray(tour.expenses) && tour.expenses.length > 0) {
      tour.expenses.forEach((expense: TourExpense) => {
        const currency = expense.currency || tourCurrency;
        const amount = typeof expense.amount === "string" 
          ? parseFloat(expense.amount.replace(/[^\d.,]/g, '').replace(',', '.'))
          : Number(expense.amount) || 0;
        
        if (!isNaN(amount)) {
          expenses[currency] = (expenses[currency] || 0) + amount;
        }
      });
    }
    
    // 3. Her para birimi için ayrı ayrı kar hesapla
    const allCurrencies = new Set([...Object.keys(totals), ...Object.keys(expenses)]);
    allCurrencies.forEach(currency => {
      const total = totals[currency] || 0;
      const expense = expenses[currency] || 0;
      profit[currency] = total - expense;
    });
    
    return profit;
  };

  return (
    <Card className="w-full">
      <CardHeader className="border-b pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <CardTitle className="text-xl">Veri Görünümü</CardTitle>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Ara..."
                  className="w-[200px] pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Müşteriler sekmesi hariç tarih filtresi göster */}
              {activeTab !== "customers" && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="dateFilterToggle"
                      checked={dateFilterEnabled}
                      onChange={(e) => setDateFilterEnabled(e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="dateFilterToggle" className="text-sm whitespace-nowrap">
                      Tarih Filtresini Etkinleştir
                    </label>
                  </div>
                  
                  <DatePickerWithRange 
                    date={dateRange} 
                    setDate={setDateRange} 
                    className="w-[180px]"
                    placeholder="Tarih Aralığı Seçin"
                    disabled={!dateFilterEnabled}
                  />
                </div>
              )}
            </div>
          </div>
          
          <Button variant="outline" size="sm" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tours" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tours">Turlar</TabsTrigger>
            <TabsTrigger value="financial">Finansal Kayıtlar</TabsTrigger>
            <TabsTrigger value="customers">Tur Müşterileri</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tours">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="font-bold whitespace-nowrap cursor-pointer hover:bg-gray-100 bg-gray-200"
                      onClick={() => handleSortChange("serialNumber")}
                    >
                      Seri No {sortField === "serialNumber" && (sortDirection === "asc" ? <span className="text-blue-600">▲</span> : <span className="text-blue-600">▼</span>)}
                    </TableHead>
                    <TableHead>Tur Kaydını Oluşturan Kişi</TableHead>
                    <TableHead 
                      className="font-bold cursor-pointer hover:bg-gray-100 bg-gray-200"
                      onClick={() => handleSortChange("customerName")}
                    >
                      Müşteri {sortField === "customerName" && (sortDirection === "asc" ? <span className="text-blue-600">▲</span> : <span className="text-blue-600">▼</span>)}
                    </TableHead>
                    <TableHead>Destinasyon</TableHead>
                    <TableHead 
                      className="font-bold cursor-pointer hover:bg-gray-100 bg-gray-200"
                      onClick={() => handleSortChange("date")}
                    >
                      Tarih {sortField === "date" && (sortDirection === "asc" ? <span className="text-blue-600">▲</span> : <span className="text-blue-600">▼</span>)}
                    </TableHead>
                    <TableHead className="text-right">Toplam</TableHead>
                    <TableHead className="text-right">Tur Gideri</TableHead>
                    <TableHead className="text-right">Toplam Kalan</TableHead>
                    <TableHead className="text-right">Kazanç</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredToursData.length > 0 ? (
                    filteredToursData.map((tour) => (
                      <TableRow key={tour.id}>
                        <TableCell>{tour.serialNumber || '-'}</TableCell>
                        <TableCell>{tour.tourName || '-'}</TableCell>
                        <TableCell>{tour.customerName || '-'}</TableCell>
                        <TableCell>
                          {tour.destinationName || tour.destination || '-'}
                        </TableCell>
                        <TableCell>{formatDate(tour.tourDate)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {/* Tour ana tutarı ve aktiviteler dahil totalPrice */}
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">Tur Toplam:</span>
                            <span 
                              className="font-medium" 
                              dangerouslySetInnerHTML={{ 
                                __html: getTourTotalString(tour) || formatCurrency(tour.totalPrice, tour.currency) 
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {/* Giderleri para birimi bazında göster */}
                          {tour.expenses && tour.expenses.length > 0 ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900">Giderler:</span>
                              <span 
                                className="font-medium" 
                                dangerouslySetInnerHTML={{ 
                                  __html: formatCurrencyGroups(
                                    tour.expenses.reduce((acc: Record<string, number>, expense: TourExpense) => {
                                      const currency = expense.currency || tour.currency || "TRY";
                                      const amount = typeof expense.amount === "string" 
                                        ? parseFloat(expense.amount.replace(/[^\d.,]/g, '').replace(',', '.'))
                                        : Number(expense.amount) || 0;
                                      
                                      if (!isNaN(amount)) {
                                        acc[currency] = (acc[currency] || 0) + amount;
                                      }
                                      return acc;
                                    }, {})
                                  )
                                }}
                              />
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {/* Tür satışı tamamen ödenmişse göster */}
                          {tour.paymentStatus === "completed" ? (
                            <span className="text-green-600 font-semibold">Ödendi</span>
                          ) : (
                            (() => {
                              // Toplam tutarları hesapla
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
                              
                              // Ödenen tutarları hesapla
                              const paidAmounts: Record<string, number> = {};
                              if (tour.paymentStatus === "partial") {
                                const paidCurrency = tour.partialPaymentCurrency || tourCurrency;
                                const paidAmount = Number(tour.partialPaymentAmount) || 0;
                                if (paidAmount > 0) {
                                  paidAmounts[paidCurrency] = (paidAmounts[paidCurrency] || 0) + paidAmount;
                                }
                                
                                // Aktivitelerden ödenen kısımları ekle
                                if (Array.isArray(tour.activities)) {
                                  tour.activities.forEach((act: any) => {
                                    if (act.partialPaymentAmount) {
                                      const actCurrency = act.partialPaymentCurrency || act.currency || tourCurrency;
                                      const actPaid = Number(act.partialPaymentAmount) || 0;
                                      if (actPaid > 0) {
                                        paidAmounts[actCurrency] = (paidAmounts[actCurrency] || 0) + actPaid;
                                      }
                                    }
                                  });
                                }
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
                              
                              // Kısmi ödemede bilgileri göster
                              if (tour.paymentStatus === "partial") {
                                return (
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-orange-600">Kalan:</span>
                                    <span 
                                      className="text-orange-600 font-medium" 
                                      dangerouslySetInnerHTML={{ 
                                        __html: formatCurrencyGroups(remaining) 
                                      }}
                                    />
                                    <span className="font-semibold text-green-600 mt-1">Ödenen:</span>
                                    <span 
                                      className="text-green-600 font-medium" 
                                      dangerouslySetInnerHTML={{ 
                                        __html: formatCurrencyGroups(paidAmounts) 
                                      }}
                                    />
                                  </div>
                                );
                              } else {
                                // Bekleyen durumlarda toplam tutarı kırmızı renkle göster
                                return (
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-red-600">Beklemede:</span>
                                    <span 
                                      className="text-red-600 font-medium" 
                                      dangerouslySetInnerHTML={{ 
                                        __html: formatCurrencyGroups(totals) 
                                      }}
                                    />
                                  </div>
                                );
                              }
                            })()
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {(() => {
                            // Kazanç hesaplaması 
                            const profit = calculateTourProfit(tour);
                            
                            return (
                              <div className="flex flex-col">
                                {Object.entries(profit).length > 0 ? (
                                  <>
                                    <span className="font-semibold text-green-600">Kar:</span>
                                    {Object.entries(profit).map(([currency, amount], idx) => (
                                      <span 
                                        key={`profit-${idx}`} 
                                        className={amount >= 0 ? "text-green-600" : "text-red-600"}
                                        dangerouslySetInnerHTML={{ 
                                          __html: formatCurrency(amount, currency) 
                                        }}
                                      />
                                    ))}
                                  </>
                                ) : (
                                  '-'
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedTour(tour)
                                setIsPreviewOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit("tours", tour)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog("tours", tour.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        Kayıt bulunamadı.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="financial">
            {/* Alt kategoriler için içerideki Tabs bileşeni */}
            <Tabs defaultValue="income" className="mb-4">              <TabsList className="mb-2 bg-gray-100">
                <TabsTrigger value="income">Finansal Gelir</TabsTrigger>
                <TabsTrigger value="expense">Şirket Giderleri</TabsTrigger>
                <TabsTrigger value="tourExpense">Tur Giderleri</TabsTrigger>
              </TabsList>
              
              {/* Tüm Kayıtlar Sekmesi */}              {/* Finansal Gelir Sekmesi */}
              <TabsContent value="income">
                <div className="rounded-md border">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-green-50">
                        <TableHead 
                          className="w-[100px] font-bold whitespace-nowrap cursor-pointer hover:bg-green-100"
                          onClick={() => handleSortChange("serialNumber")}
                        >
                          Tur Seri No {sortField === "serialNumber" && (sortDirection === "asc" ? "▲" : "▼")}
                        </TableHead>
                        <TableHead 
                          className="w-[100px] font-bold cursor-pointer hover:bg-green-100"
                          onClick={() => handleSortChange("date")}
                        >
                          Tarih {sortField === "date" && (sortDirection === "asc" ? "▲" : "▼")}
                        </TableHead>
                        <TableHead 
                          className="w-[120px] font-bold cursor-pointer hover:bg-green-100"
                          onClick={() => handleSortChange("category")}
                        >
                          Kategori {sortField === "category" && (sortDirection === "asc" ? "▲" : "▼")}
                        </TableHead>
                        <TableHead 
                          className="pl-4 font-bold cursor-pointer hover:bg-green-100"
                          onClick={() => handleSortChange("description")}
                        >
                          Açıklama {sortField === "description" && (sortDirection === "asc" ? "▲" : "▼")}
                        </TableHead>
                        <TableHead 
                          className="w-[100px] text-right font-bold cursor-pointer hover:bg-green-100"
                          onClick={() => handleSortChange("amount")}
                        >
                          Tutar {sortField === "amount" && (sortDirection === "asc" ? "▲" : "▼")}
                        </TableHead>
                        <TableHead className="w-[100px] text-right font-bold">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFinancialData.filter(item => item.type === 'income').length > 0 ? (
                        (() => {
                          return filteredFinancialData.filter(item => item.type === 'income').map((financial) => {
                            // Kayıtla birlikte gelmiş olan ön-hesaplanmış seri numarasını kullan
                            const serialNumber = financial._serialNumber || `?F`;
                            const displayDate = financial.date;
                            const displayDescription = financial.description || '-';
                            const displayCategory = financial.category || 'Gelir';
                            const displayAmount = financial.amount ? `${financial.amount.toLocaleString()} ${financial.currency || ''}` : '-';
                            
                            return (
                              <TableRow key={financial.id} className="border-b last:border-0 hover:bg-green-50 transition bg-white">
                                <TableCell className="py-2 px-3 text-sm whitespace-nowrap font-mono font-bold">
                                  <span className="text-green-600">{serialNumber}</span>
                                </TableCell>
                                <TableCell className="py-2 px-3 text-sm whitespace-nowrap">{formatDate(displayDate)}</TableCell>
                                <TableCell className="py-2 px-3 text-sm whitespace-nowrap">{displayCategory}</TableCell>
                                <TableCell className="py-2 px-3 text-sm">{displayDescription}</TableCell>
                                <TableCell className="py-2 px-3 text-sm text-right whitespace-nowrap">{displayAmount}</TableCell>
                                <TableCell className="py-2 px-1 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setSelectedFinancial(financial)
                                        setIsPreviewOpen(true)
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEdit("financial", financial)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openDeleteDialog("financial", financial.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            Finansal gelir kaydı bulunamadı.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              {/* Şirket Giderleri Sekmesi */}
              <TabsContent value="expense">
                <div className="rounded-md border">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-red-50">
                        <TableHead 
                          className="w-[100px] font-bold whitespace-nowrap cursor-pointer hover:bg-red-100"
                          onClick={() => handleSortChange("serialNumber")}
                        >
                          Tur Seri No {sortField === "serialNumber" && (sortDirection === "asc" ? "▲" : "▼")}
                        </TableHead>
                        <TableHead 
                          className="w-[100px] font-bold cursor-pointer hover:bg-red-100"
                          onClick={() => handleSortChange("date")}
                        >
                          Tarih {sortField === "date" && (sortDirection === "asc" ? "▲" : "▼")}
                        </TableHead>
                        <TableHead 
                          className="w-[120px] font-bold cursor-pointer hover:bg-red-100"
                          onClick={() => handleSortChange("category")}
                        >
                          Kategori {sortField === "category" && (sortDirection === "asc" ? "▲" : "▼")}
                        </TableHead>
                        <TableHead 
                          className="pl-4 font-bold cursor-pointer hover:bg-red-100"
                          onClick={() => handleSortChange("description")}
                        >
                          Açıklama {sortField === "description" && (sortDirection === "asc" ? "▲" : "▼")}
                        </TableHead>
                        <TableHead 
                          className="w-[100px] text-right font-bold cursor-pointer hover:bg-red-100"
                          onClick={() => handleSortChange("amount")}
                        >
                          Tutar {sortField === "amount" && (sortDirection === "asc" ? "▲" : "▼")}
                        </TableHead>
                        <TableHead className="w-[100px] text-right font-bold">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>                    <TableBody>                      {filteredFinancialData.filter(item => item.type === 'expense' && !item.relatedTourId).length > 0 ? (
                        (() => {
                          return filteredFinancialData
                            .filter(item => item.type === 'expense' && !item.relatedTourId)
                            .map((financial) => {
                              // Kayıtla birlikte gelmiş olan ön-hesaplanmış seri numarasını kullan
                              const serialNumber = financial._serialNumber || `?F`;
                              const displayDate = financial.date;
                              const displayDescription = financial.description || '-';
                              const displayCategory = financial.category || 'Gider';
                              const displayAmount = financial.amount ? `${financial.amount.toLocaleString()} ${financial.currency || ''}` : '-';
                              
                              return (
                                <TableRow key={financial.id} className="border-b last:border-0 hover:bg-red-50 transition bg-white">
                                  <TableCell className="py-2 px-3 text-sm whitespace-nowrap font-mono font-bold">
                                    <span className="text-red-600">{serialNumber}</span>
                                  </TableCell>
                                  <TableCell className="py-2 px-3 text-sm whitespace-nowrap">{formatDate(displayDate)}</TableCell>
                                  <TableCell className="py-2 px-3 text-sm whitespace-nowrap">{displayCategory}</TableCell>
                                  <TableCell className="py-2 px-3 text-sm">{displayDescription}</TableCell>
                                  <TableCell className="py-2 px-3 text-sm text-right whitespace-nowrap">{displayAmount}</TableCell>
                                  <TableCell className="py-2 px-1 text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setSelectedFinancial(financial)
                                          setIsPreviewOpen(true)
                                        }}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit("financial", financial)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openDeleteDialog("financial", financial.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            });
                        })()
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            Şirket gider kaydı bulunamadı.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              {/* Tur Giderleri Sekmesi */}
              <TabsContent value="tourExpense">
                <div className="rounded-md border">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-indigo-50">                        <TableHead 
                          className={`w-[100px] font-bold whitespace-nowrap cursor-pointer hover:bg-indigo-100 ${sortField === "serialNumber" ? "bg-indigo-300" : "bg-indigo-200"}`}
                          onClick={() => handleSortChange("serialNumber")}
                        >
                          Tur Seri No {sortField === "serialNumber" && (sortDirection === "asc" ? <span className="text-blue-800">▲</span> : <span className="text-blue-800">▼</span>)}
                        </TableHead>
                        <TableHead 
                          className={`w-[100px] font-bold cursor-pointer hover:bg-indigo-100 ${sortField === "date" ? "bg-indigo-300" : "bg-indigo-200"}`}
                          onClick={() => handleSortChange("date")}
                        >
                          Tarih {sortField === "date" && (sortDirection === "asc" ? <span className="text-blue-800">▲</span> : <span className="text-blue-800">▼</span>)}
                        </TableHead>
                        <TableHead className="w-[150px] font-bold">Tur Kaydını Oluşturan Kişi</TableHead>
                        <TableHead className="w-[150px] font-bold">Destinasyon</TableHead>
                        <TableHead 
                          className={`pl-4 font-bold cursor-pointer hover:bg-indigo-100 ${sortField === "description" ? "bg-indigo-300" : ""}`}
                          onClick={() => handleSortChange("description")}
                        >
                          Açıklama {sortField === "description" && (sortDirection === "asc" ? <span className="text-blue-800">▲</span> : <span className="text-blue-800">▼</span>)}
                        </TableHead>
                        <TableHead 
                          className={`w-[100px] text-right font-bold cursor-pointer hover:bg-indigo-100 ${sortField === "amount" ? "bg-indigo-300" : ""}`}
                          onClick={() => handleSortChange("amount")}
                        >
                          Tutar {sortField === "amount" && (sortDirection === "asc" ? <span className="text-blue-800">▲</span> : <span className="text-blue-800">▼</span>)}
                        </TableHead>
                        <TableHead className="w-[100px] text-right font-bold">İşlemler</TableHead>                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {                        // Sadece turların kendi içindeki giderleri kullanalım (tek veri kaynağı)
                        // Mükerrer gider sorunundan kaçınmak için ilişkili tour.expenses dizisinden giderleri alalım
                        const allTourExpenses = toursData.reduce((acc: any[], tour) => {
                          // Her turun giderleri olup olmadığını kontrol edelim
                          if (Array.isArray(tour.expenses) && tour.expenses.length > 0) {
                            // Her gider kaydını FinancialData formatına dönüştürelim
                            const expenses = tour.expenses.map((expense: TourExpense) => ({
                              id: expense.id || `${tour.id}-${expense.name}-${Math.random()}`, // Benzersiz ID
                              type: "expense", 
                              date: expense.date || tour.tourDate, // Gider tarihi yoksa tur tarihi
                              category: "Tur Gideri",
                              relatedTourId: tour.id, // Tur ile ilişkilendirme
                              description: expense.name, // Gider açıklaması
                              amount: typeof expense.amount === "string"
                                ? parseFloat(expense.amount.replace(/[^\d.,]/g, '').replace(',', '.'))
                                : Number(expense.amount) || 0, // Tutarı sayıya çevir
                              currency: expense.currency || tour.currency || "TRY", // Para birimi
                              _serialNumber: `${tour.serialNumber || tour.id?.slice(-4) || ""}TF`, // İşlem no
                              _tourInfo: tour, // Tur bilgisini de ekleyelim - kolay erişim için
                              provider: expense.provider || "", // Sağlayıcı bilgisi
                              details: expense.details || "", // Ek detaylar
                              // Sıralama için gerekli özel alanlar
                              _displayDate: expense.date || tour.tourDate,
                              _displayDescription: expense.name || "Gider",
                              _displayAmount: Number(expense.amount) || 0,
                            }));
                            
                            // Giderleri ana listeye ekleyelim
                            acc.push(...expenses);
                          }
                          return acc;
                        }, []);if (allTourExpenses.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={7} className="h-24 text-center">Tur gideri kaydı bulunamadı.</TableCell>
                            </TableRow>
                          );
                        }
                            // Önce ana sıralama kriterlerine göre tüm giderleri sıralayalım
                        // Bu, sayfalar arası tutarlı bir sıralama sağlar
                        const sortedAllExpenses = [...allTourExpenses].sort((a, b) => {
                          if (sortField === "serialNumber") {
                            const aNum = a._serialNumber || "";
                            const bNum = b._serialNumber || "";
                            return sortDirection === "asc" ? aNum.localeCompare(bNum) : bNum.localeCompare(aNum);
                          } else if (sortField === "date") {
                            const aDate = new Date(a._displayDate || a.date).getTime();
                            const bDate = new Date(b._displayDate || b.date).getTime();
                            return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
                          } else if (sortField === "description") {
                            const aDesc = a._displayDescription || a.description || "";
                            const bDesc = b._displayDescription || b.description || "";
                            return sortDirection === "asc" ? aDesc.localeCompare(bDesc) : bDesc.localeCompare(aDesc);  
                          } else if (sortField === "amount") {
                            const aAmount = Number(a._displayAmount || a.amount) || 0;
                            const bAmount = Number(b._displayAmount || b.amount) || 0;
                            return sortDirection === "asc" ? aAmount - bAmount : bAmount - aAmount;
                          } 
                          // Varsayılan olarak seri numarasına göre sırala
                          const aNum = a._serialNumber || "";
                          const bNum = b._serialNumber || "";
                          return aNum.localeCompare(bNum);
                        });

                        // Tur ID'sine göre grupla
                        const groupedByTourId: Record<string, any[]> = {};
                        
                        // Önce tüm giderleri gruplara ayıralım
                        sortedAllExpenses.forEach(expense => {
                          const tourId = expense.relatedTourId || "";
                          if (!groupedByTourId[tourId]) {
                            groupedByTourId[tourId] = [];
                          }
                          groupedByTourId[tourId].push(expense);
                        });
                        
                        // Sonra her grubun içindeki giderleri tutarlarına göre sıralayalım (büyükten küçüğe)                        // Herbir turun içindeki giderleri de ayrıca sıralayalım
                        // (Üstteki sıralama genel düzeni belirlerken, bu sıralama grup içi düzeni belirler)
                        Object.keys(groupedByTourId).forEach(tourId => {
                          groupedByTourId[tourId].sort((a, b) => {
                            if (sortField === "serialNumber") {
                              // Seri numarası zaten aynı turdaki giderler için aynı olacağından
                              // İkincil sıralama kriteri olarak tutarı kullanalım
                              return Number(b.amount) - Number(a.amount);
                            } else if (sortField === "date") {
                              const aDate = new Date(a._displayDate || a.date).getTime();
                              const bDate = new Date(b._displayDate || b.date).getTime();
                              return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
                            } else if (sortField === "description") {
                              const aDesc = a._displayDescription || a.description || "";
                              const bDesc = b._displayDescription || b.description || "";
                              return sortDirection === "asc" ? aDesc.localeCompare(bDesc) : bDesc.localeCompare(aDesc);  
                            } else if (sortField === "amount") {
                              const aAmount = Number(a.amount) || 0;
                              const bAmount = Number(b.amount) || 0;
                              return sortDirection === "asc" ? aAmount - bAmount : bAmount - aAmount;
                            } 
                            // Varsayılan olarak tutara göre sıralayalım (büyükten küçüğe)
                            return Number(b.amount) - Number(a.amount);
                          });
                        });
                          
                        // Her bir grup için ayrı bir JSX bloğu oluştur
                        const tourGroups = Object.entries(groupedByTourId).map(([tourId, expenses], groupIndex) => {
                          // Gruplar için alternatif arka plan rengi
                          const isOddGroup = groupIndex % 2 === 1;
                          const groupBackgroundClass = isOddGroup ? "bg-gray-100" : "bg-white";
                            
                          // Gruptaki her bir gider için satır oluştur
                          return expenses.map((financial, itemIndex) => {
                            // İlk ve son elemanlar için özel border sınıfları
                            const isFirstInGroup = itemIndex === 0;
                            const isLastInGroup = itemIndex === expenses.length - 1;
                                // Eğer _tourInfo özelliği varsa, bunu kullan (daha etkili)
                            const tourInfo = financial._tourInfo || toursData.find(t => t.id === financial.relatedTourId);
                            let displayDate = tourInfo ? tourInfo.tourDate : financial.date;
                              
                            // Kayıtla birlikte gelmiş olan ön-hesaplanmış seri numarasını kullan
                            const serialNumber = financial._serialNumber || `?TF`;
                              
                            // Müşteri bilgisi ve açıklama
                            let customerName = tourInfo ? tourInfo.customerName || "Müşteri" : "-";
                            
                            // Gider açıklaması artık tour.expense'deki name özelliğinde
                            let expenseType = "";
                            
                            if (financial.description) {
                              // Finansal kayıt formatından açıklamayı al
                              expenseType = financial.description?.split(' - ')[1] || financial.description;
                            } else if (financial.provider) {
                              // Sağlayıcı bilgisi varsa kullan
                              expenseType = `${financial.provider}: ${financial.description || "Gider"}`;
                            } else {
                              // Sadece açıklamayı kullan
                              expenseType = financial.description || "Gider";
                            }
                            
                            // Tur müşteri adı - gider açıklaması formatı
                            let displayDescription = `${customerName} - ${expenseType}`;
                              
                            // Tutar
                            const displayAmount = financial.amount ? `${financial.amount.toLocaleString()} ${financial.currency || ''}` : '-';
                              
                            return (
                              <TableRow 
                                key={financial.id} 
                                className={`
                                  ${groupBackgroundClass}
                                  ${isFirstInGroup ? "border-t-2 border-gray-400" : "border-t border-gray-200"}
                                  ${isLastInGroup ? "border-b-2 border-gray-400" : ""}
                                  hover:bg-indigo-50 transition
                                `}
                              >
                                <TableCell className="py-2 px-3 text-sm whitespace-nowrap font-mono font-bold">
                                  <span className="text-indigo-600">{serialNumber}</span>
                                </TableCell>
                                <TableCell className="py-2 px-3 text-sm whitespace-nowrap">{formatDate(displayDate)}</TableCell>
                                <TableCell className="py-2 px-3 text-sm whitespace-nowrap">
                                  {tourInfo ? 
                                    <span className="font-medium">{customerName}</span>
                                    : "Silinmiş Tur"}
                                </TableCell>
                                <TableCell className="py-2 px-3 text-sm whitespace-nowrap">
                                  {tourInfo ? 
                                    <span className="font-medium">{tourInfo.destination || tourInfo.destinationName || "-"}</span> 
                                    : "-"}
                                </TableCell>
                                <TableCell className="py-2 px-3 text-sm">{displayDescription}</TableCell>
                                <TableCell className="py-2 px-3 text-sm text-right whitespace-nowrap">{displayAmount}</TableCell>
                                <TableCell className="py-2 px-1 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setSelectedFinancial(financial)
                                        setIsPreviewOpen(true)
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEdit("financial", financial)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openDeleteDialog("financial", financial.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          });
                        });
                          
                        return tourGroups;
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="customers">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>E-posta</TableHead>
                    <TableHead>TC/Pasaport No</TableHead>
                    <TableHead>Vatandaşlık / Ülke</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomersData.length > 0 ? (
                    filteredCustomersData.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>{customer.name || '-'}</TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
                        <TableCell>{customer.email || '-'}</TableCell>
                        <TableCell>{customer.idNumber || '-'}</TableCell>
                        <TableCell>{customer.citizenship || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCustomer(customer)
                                setIsPreviewOpen(true)
                              }}
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit("customers", customer)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog("customers", customer.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        Kayıt bulunamadı.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {activeTab === "tours" && selectedTour
                ? `Tur Detayları: ${selectedTour.tourName || 'İsimsiz Tur'}`
                : activeTab === "financial" && selectedFinancial
                ? selectedFinancial.relatedTourId && selectedFinancial.category === "Tur Gideri" 
                  ? "Finansal Kayıt Tur Gider Detayları"
                  : selectedFinancial.type === "income"
                    ? "Finansal Kayıt Gelir Detayları" 
                    : "Finansal Kayıt Gider Detayları"
                : activeTab === "customers" && selectedCustomer
                ? `Müşteri Detayları: ${selectedCustomer.name || 'İsimsiz Müşteri'}`
                : "Detaylar"}
            </DialogTitle>
          </DialogHeader>
          {activeTab === "tours" && <TourPreview tour={selectedTour} />}
          {activeTab === "financial" && <FinancialPreview financial={selectedFinancial} />}
          {activeTab === "customers" && <CustomerPreview customer={selectedCustomer} />}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {itemToDelete.type === "tours" 
                ? "Turu ve ilişkili tüm verileri silmek istediğinizden emin misiniz?" 
                : "Bu kaydı silmek istediğinizden emin misiniz?"}
            </AlertDialogTitle>
            {itemToDelete.type === "tours" ? (
              <>
                <AlertDialogDescription>
                  Bu işlem geri alınamaz. Tur ile birlikte ilişkili tüm veriler de kalıcı olarak silinecektir.
                </AlertDialogDescription>
                <div className="mt-4 space-y-2">
                  <div className="font-medium text-red-500">Aşağıdaki veriler silinecektir:</div>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Tura ait tüm finansal kayıtlar (giderler, ödemeler)</li>
                    <li>Tura ait müşteri borçları</li>
                    <li>Tura ait ödenmemiş tedarikçi borçları</li>
                    <li>Tur için oluşturulan müşteri kaydı (aynı müşteri başka turlarda kullanılmıyorsa)</li>
                  </ul>
                  <div className="text-sm mt-2 italic">
                    Bunun sonucunda tur ile ilgili oluşturduğunuz finansal kayıtlar ve borç takibi bilgileri de kaybolacaktır. Emin değilseniz, silmek yerine başka bir yöntem kullanmanızı öneririz.
                  </div>
                </div>
              </>
            ) : (
              <AlertDialogDescription>
                Bu işlem geri alınamaz. Bu kayıt kalıcı olarak silinecektir.
              </AlertDialogDescription>
            )}
            
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className={itemToDelete.type === "tours" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {itemToDelete.type === "tours" ? "Turu ve Tüm İlişkili Verileri Sil" : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
