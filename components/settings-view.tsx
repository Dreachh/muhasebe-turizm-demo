"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import CompanyManagement from "@/components/company-management"
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
import { useToast } from "@/components/ui/use-toast"
// import { loadSampleData } from "@/lib/load-sample-data" // DEVRE DIŞI BIRAKILDI - Artık kullanılmıyor
import { Building, Plus, Trash2, Edit, Users, Save, MapPin, Activity, CircleSlash } from "lucide-react"
import {
  getSettings,
  saveSettings,
  getExpenseTypes,
  saveExpenseTypes,
  getProviders,
  saveProviders,
  getActivities,
  saveActivities,
  getDestinations,
  saveDestinations,  getReservationSettings,
  saveReservationSettings,
  getNextSerialNumber,
  updateSerialSettings,
} from "@/lib/db"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Simple UUID generator function to replace the uuid package
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Debug fonksiyonu - konsol çıktılarını daha net görmek için
const debugLog = (message: string, data?: any) => {
  const now = new Date();
  const timestamp = now.toLocaleTimeString();
  console.log(`[${timestamp}] 🔍 DEBUG: ${message}`);
  if (data !== undefined) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Gerekli arayüz tanımlamaları ekleniyor
interface ExpenseType {
  id: string;
  type: string;
  name: string;
  description: string;
  category: string;
}

interface Provider {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  category: string;
  taxId?: string;
}

interface Activity {
  id: string;
  name: string;
  description: string;
  defaultDuration: string;
  defaultPrice: string;
  defaultCurrency: string;
}

interface Destination {
  id: string;
  name: string;
  country: string;
  region: string;
  description: string;
}

// Tur modeli ekleniyor
interface Tour {
  id: string;
  name: string;
  description: string;
  destinationId: string;  
  price: number;  // kişi başı fiyat
  duration: string;
  currency: string;
}

// Rezervasyon sistemleri için arayüzler
interface PickupType {
  id: string;
  name: string;
  description: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
}

interface PaymentStatus {
  id: string;
  name: string;
  color: string;
}

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  website: string;
  logo: string | null;
}

// Props tanımı ekle
interface SettingsViewProps {
  onClose: () => void;
  onNavigate?: (view: string) => void;
  financialData?: any[];
  toursData?: any[];
  customersData?: any[];
  onUpdateData?: (type: string, data: any[]) => void;
}

// Event tipleri için değişiklikler
type InputChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
type FileChangeEvent = React.ChangeEvent<HTMLInputElement>;

// Tur şablonlarını doğrudan Firebase Firestore'a kaydet
const saveTourTemplatesDirectly = async (tours: Tour[]) => {  try {
    // Firebase modüllerini doğrudan import et
    const { collection, doc, setDoc, writeBatch } = await import("firebase/firestore");
    const { getDb } = await import("@/lib/firebase-client-module");
    
    // Firestore instance'ını güvenli bir şekilde al
    const db = getDb();
    if (!db) {
      throw new Error("Firestore instance'ına erişilemedi");
    }
    
    // Önce local storage'a yedek olarak kaydet
    localStorage.setItem('tourTemplates', JSON.stringify(tours));
    console.log(`${tours.length} tur şablonu localStorage'a yedeklendi`);
    
    // Batch işlemi başlat
    const batch = writeBatch(db);
    
    // Koleksiyonu işaretleyip tüm turları ekle
    const colRef = collection(db, "tourTemplates");
    tours.forEach(tour => {
      const docRef = doc(colRef, tour.id);
      batch.set(docRef, {
        ...tour,
        updatedAt: new Date(),
      });
    });
    
    // Batch işlemini tamamla
    await batch.commit();
    console.log(`${tours.length} tur şablonu başarıyla Firestore'a kaydedildi!`);
    
    return true;
  } catch (error) {
    console.error("Doğrudan Firestore kaydetme hatası:", error);
    throw error;
  }
};

// onClose fonksiyonu ana sayfaya yönlendirecek şekilde güncellendi
export function SettingsView({ 
  onClose, 
  onNavigate = () => {},
  financialData = [],
  toursData = [],
  customersData = [],
  onUpdateData = () => {}
}: SettingsViewProps) {
  const { toast } = useToast()
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "PassionisTravel",
    address: "Örnek Mahallesi, Örnek Caddesi No:123, İstanbul",
    phone: "+90 212 123 4567",
    email: "info@passionistour.com",
    taxId: "1234567890",
    website: "www.passionistour.com",
    logo: null,
  })

  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [newExpenseType, setNewExpenseType] = useState<ExpenseType>({
    id: "",
    type: "",
    name: "",
    description: "",
    category: "general", // Gider kategorisi ekledik
  })
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [isEditingExpense, setIsEditingExpense] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseType | null>(null)
  const [customExpenseType, setCustomExpenseType] = useState("")
  const [showCustomTypeInput, setShowCustomTypeInput] = useState(false)  // Sağlayıcılar için state tanımı - CompanyManagement bileşeni kullanılmasına rağmen örnek verilerin yüklenmesi için gerekli
  const [providers, setProviders] = useState<Provider[]>([])

  // Aktiviteler için state
  const [activities, setActivities] = useState<Activity[]>([])
  const [newActivity, setNewActivity] = useState<Activity>({
    id: "",
    name: "",
    description: "",
    defaultDuration: "",
    defaultPrice: "",
    defaultCurrency: "TRY",
  })
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false)
  const [isEditingActivity, setIsEditingActivity] = useState(false)
  const [isDeleteActivityDialogOpen, setIsDeleteActivityDialogOpen] = useState(false)
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null)

  // Destinasyonlar için state
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [newDestination, setNewDestination] = useState<Destination>({
    id: "",
    name: "",
    country: "",
    region: "",
    description: "",
  })
  const [isDestinationDialogOpen, setIsDestinationDialogOpen] = useState(false)
  const [isEditingDestination, setIsEditingDestination] = useState(false)
  const [isDeleteDestinationDialogOpen, setIsDeleteDestinationDialogOpen] = useState(false)
  const [destinationToDelete, setDestinationToDelete] = useState<Destination | null>(null)
  // Tur şablonları için state
  const [tourTemplates, setTourTemplates] = useState<Tour[]>([])
  const [newTourTemplate, setNewTourTemplate] = useState<Tour>({
    id: "",
    name: "",
    description: "",
    destinationId: "",
    price: 0,
    duration: "",
    currency: "EUR",
  })
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>("")
  const [isTourDialogOpen, setIsTourDialogOpen] = useState(false)
  const [isEditingTour, setIsEditingTour] = useState(false)
  const [isDeleteTourDialogOpen, setIsDeleteTourDialogOpen] = useState(false)
  const [tourToDelete, setTourToDelete] = useState<Tour | null>(null)


  // Alış yeri türleri için state
  const [pickupTypes, setPickupTypes] = useState<PickupType[]>([])
  const [newPickupType, setNewPickupType] = useState<PickupType>({
    id: "",
    name: "",
    description: "",
  })
  const [isPickupTypeDialogOpen, setIsPickupTypeDialogOpen] = useState(false)
  const [isEditingPickupType, setIsEditingPickupType] = useState(false)


  // Ödeme yöntemleri için state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod>({
    id: "",
    name: "",
    description: "",
  })
  const [isPaymentMethodDialogOpen, setIsPaymentMethodDialogOpen] = useState(false)
  const [isEditingPaymentMethod, setIsEditingPaymentMethod] = useState(false)

  // Ödeme durumları için state
  const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatus[]>([])
  const [newPaymentStatus, setNewPaymentStatus] = useState<PaymentStatus>({
    id: "",
    name: "",
    color: "#10b981",
  })
  const [isPaymentStatusDialogOpen, setIsPaymentStatusDialogOpen] = useState(false)
  const [isEditingPaymentStatus, setIsEditingPaymentStatus] = useState(false)

  const [isEditingReferenceSource, setIsEditingReferenceSource] = useState(false)

  // Seri numarası ayarları için state
  const [serialSettings, setSerialSettings] = useState({
    prefix: "REZ",
    nextNumber: 1,
    format: "REZ-{number}",
    digits: 4,
  })
  // Ayarları ve gider türlerini yükle
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSettings()
        if (settings.companyInfo) setCompanyInfo(settings.companyInfo)
        
        // Seri numarası ayarlarını yükle
        try {
          const serialData = localStorage.getItem('serialSettings');
          if (serialData) {
            const parsedSerialSettings = JSON.parse(serialData);
            setSerialSettings(prev => ({
              ...prev,
              ...parsedSerialSettings
            }));
          }
        } catch (serialError) {
          console.error("Seri numarası ayarları yüklenirken hata:", serialError);
        }
      } catch (error) {
        console.error("Ayarlar yüklenirken hata:", error)
      }

      try {
        const types = await getExpenseTypes()
        if (types && types.length > 0) {
          setExpenseTypes(types)
        } else {
          // Örnek gider türleri ekle
          const exampleExpenseTypes = [
            {
              id: generateUUID(),
              type: "konaklama",
              name: "Otel Konaklaması",
              description: "Müşteri konaklama giderleri",
              category: "accommodation"
            },
            {
              id: generateUUID(),
              type: "konaklama",
              name: "Havuz Kullanımı",
              description: "Havuz kullanım bedeli",
              category: "accommodation"
            },
            {
              id: generateUUID(),
              type: "ulaşım",
              name: "Otobüs Bileti",
              description: "Şehirlerarası otobüs ulaşımı",
              category: "transportation"
            },
            {
              id: generateUUID(),
              type: "ulaşım",
              name: "Uçak Bileti",
              description: "Yurtiçi/Yurtdışı uçak bileti",
              category: "transportation"
            },
            {
              id: generateUUID(),
              type: "yemek",
              name: "Restoran",
              description: "Restoran yemek bedeli",
              category: "food"
            },
            {
              id: generateUUID(),
              type: "rehberlik",
              name: "Rehber Ücreti",
              description: "Tur rehberi hizmet bedeli",
              category: "guide"
            },
            {
              id: generateUUID(),
              type: "aktivite",
              name: "Müze Girişi",
              description: "Müze giriş ücretleri",
              category: "activity"
            },
            {
              id: generateUUID(),              type: "genel",
              name: "Park Ücreti",
              description: "Araç park ücreti",
              category: "general"
            }
          ];
          
          setExpenseTypes(exampleExpenseTypes);
          await saveExpenseTypes(exampleExpenseTypes);
        }
      } catch (error) {
        console.error("Gider türleri yüklenirken hata:", error)
      }
    }
    
    const loadProviders = async () => {
      try {
        const providersData = await getProviders()
        if (providersData && providersData.length > 0) {
          // Firma bilgilerini state'e kaydet
          setProviders(providersData)
        } else {
          // Örnek sağlayıcılar ekle
          const exampleProviders = [
            {
              id: generateUUID(),
              name: "Tura Tur",
              contactPerson: "Ahmet Yılmaz",
              phone: "+90 212 555 1234",
              email: "ahmet@turatur.com",
              address: "İstanbul, Türkiye",
              notes: "Birçok destinasyon için tur sağlayıcısı",
              category: "tur_operatörü"
            },
            {
              id: generateUUID(),
              name: "Grand Otel",
              contactPerson: "Ayşe Kaya",
              phone: "+90 242 123 4567",
              email: "info@grandotel.com",
              address: "Antalya, Türkiye",
              notes: "5 yıldızlı otel",
              category: "konaklama"
            },
            {
              id: generateUUID(),
              name: "Akdeniz Transfer",
              contactPerson: "Mehmet Demir",
              phone: "+90 532 987 6543",
              email: "info@akdeniztransfer.com",
              address: "Muğla, Türkiye",
              notes: "Havalimanı transferleri",
              category: "ulaşım"
            },
            {
              id: generateUUID(),
              name: "Kültür Turizm",
              contactPerson: "Fatma Şahin",
              phone: "+90 216 444 3322",
              email: "iletisim@kulturturizm.com",
              address: "İzmir, Türkiye",
              notes: "Müze ve ören yeri gezileri için rehberlik",
              category: "rehberlik"
            },
            {
              id: generateUUID(),
              name: "Lezzet Restaurant",
              contactPerson: "Hasan Aydın",
              phone: "+90 232 111 2233",
              email: "info@lezzetrestaurant.com",
              address: "Bodrum, Türkiye",
              notes: "Grup yemekleri için indirimli fiyatlar",
              category: "yemek"
            }
          ];
          // Örnek verileri state'e kaydet
          setProviders(exampleProviders);
          // Veritabanına kaydet
          await saveProviders(exampleProviders);
        }
      } catch (error) {
        console.error("Sağlayıcılar yüklenirken hata:", error)
      }
    }

    const loadActivities = async () => {
      try {
        const activitiesData = await getActivities()
        if (activitiesData && activitiesData.length > 0) {
          setActivities(activitiesData)
        } else {
          // Örnek aktiviteler ekle
          const exampleActivities = [
            {
              id: generateUUID(),
              name: "Tekne Turu",
              description: "Koylar arası tekne gezisi",
              defaultDuration: "8 saat",
              defaultPrice: "750",
              defaultCurrency: "TRY"
            },
            {
              id: generateUUID(),
              name: "Jeep Safari",
              description: "Doğa içinde arazi aracı turu",
              defaultDuration: "6 saat",
              defaultPrice: "600",
              defaultCurrency: "TRY"
            },
            {
              id: generateUUID(),
              name: "Paraşüt",
              description: "Yamaç paraşütü aktivitesi",
              defaultDuration: "2 saat",
              defaultPrice: "1200",
              defaultCurrency: "TRY"
            },
            {
              id: generateUUID(),
              name: "Rafting",
              description: "Nehirde rafting aktivitesi",
              defaultDuration: "4 saat",
              defaultPrice: "500",
              defaultCurrency: "TRY"
            },
            {
              id: generateUUID(),
              name: "Dalış",
              description: "Deniz dalışı aktivitesi",
              defaultDuration: "3 saat",
              defaultPrice: "900",
              defaultCurrency: "TRY"
            }
          ];
          setActivities(exampleActivities);
          await saveActivities(exampleActivities);
        }
      } catch (error) {
        console.error("Aktiviteler yüklenirken hata:", error)
      }
    }

    const loadDestinations = async () => {
      try {
        const destinationsData = await getDestinations()
        if (destinationsData && destinationsData.length > 0) {
          setDestinations(destinationsData)
        } else {
          // Örnek destinasyonlar ekle
          const exampleDestinations = [
            {
              id: generateUUID(),
              name: "Antalya",
              country: "Türkiye",
              region: "Akdeniz",
              description: "Türkiye'nin turizm başkenti"
            },
            {
              id: generateUUID(),
              name: "Bodrum",
              country: "Türkiye",
              region: "Ege",
              description: "Lüks tatil beldesi"
            },
            {
              id: generateUUID(),
              name: "Kapadokya",
              country: "Türkiye",
              region: "İç Anadolu",
              description: "Peri bacaları ve balon turları"
            },
            {
              id: generateUUID(),
              name: "İstanbul",
              country: "Türkiye", 
              region: "Marmara",
              description: "Tarihi ve kültürel zenginlikler şehri"
            },
            {
              id: generateUUID(),
              name: "Fethiye",
              country: "Türkiye",
              region: "Akdeniz",
              description: "Doğal güzellikleriyle ünlü tatil beldesi"
            },
            {
              id: generateUUID(),
              name: "Paris",
              country: "Fransa",
              region: "Avrupa",
              description: "Aşk ve sanat şehri"
            },
            {
              id: generateUUID(),
              name: "Roma",
              country: "İtalya",
              region: "Avrupa",
              description: "Tarihi yapılarıyla ünlü İtalya'nın başkenti"
            },
            {
              id: generateUUID(),
              name: "Barselona",
              country: "İspanya",
              region: "Avrupa",
              description: "Mimari eserleri ve plajlarıyla ünlü şehir"
            },
            {
              id: generateUUID(),
              name: "Dubai",
              country: "Birleşik Arap Emirlikleri",
              region: "Orta Doğu",
              description: "Lüks alışveriş ve yüksek gökdelenler"
            },
            {
              id: generateUUID(),
              name: "Londra",
              country: "İngiltere",
              region: "Avrupa",
              description: "Birleşik Krallık'ın başkenti"
            }
          ];
          setDestinations(exampleDestinations);
          await saveDestinations(exampleDestinations);
        }
      } catch (error) {
        console.error("Destinasyonlar yüklenirken hata:", error)
      }
    }

    // Tur şablonlarını yükle
    const loadTourTemplates = async () => {
      try {
        const { getTourTemplates } = await import("@/lib/db");
        const tourTemplatesData = await getTourTemplates();
        setTourTemplates(tourTemplatesData);
      } catch (error) {
        console.error("Tur şablonları yüklenirken hata:", error);
        
        // Örnek tur şablonları (boş destinasyon gelirse örnek eklenmesin)
        if (destinations.length > 0) {
          const istanbulDestination = destinations.find(d => d.name === "İstanbul");
          const kapadokyaDestination = destinations.find(d => d.name === "Kapadokya");
          const antalyaDestination = destinations.find(d => d.name === "Antalya");
          const trabzonDestination = destinations.find(d => d.name === "Trabzon");
          
          if (istanbulDestination || kapadokyaDestination || antalyaDestination) {
            const exampleTours = [];
            
            // İstanbul turları
            if (istanbulDestination) {
              exampleTours.push({
                id: generateUUID(),
                name: "İstanbul Klasik Eski Şehir Turu",
                description: "İstanbul'un tarihi yerlerini kapsayan günübirlik tur",
                destinationId: istanbulDestination.id,
                price: 150,
                duration: "8 saat",
                currency: "EUR"
              });
              
              exampleTours.push({
                id: generateUUID(),
                name: "Boğaz'da Akşam Yemek Turu",
                description: "Boğaz'da eğlenceli akşam yemeği turu",
                destinationId: istanbulDestination.id,
                price: 60,
                duration: "3 saat",
                currency: "EUR"
              });
            }
            
            // Kapadokya turları
            if (kapadokyaDestination) {
              exampleTours.push({
                id: generateUUID(),
                name: "Sıcak Hava Balonu Turu",
                description: "Kapadokya manzarası üzerinde balon uçuşu",
                destinationId: kapadokyaDestination.id,
                price: 280,
                duration: "1 saat",
                currency: "EUR"
              });
              
              exampleTours.push({
                id: generateUUID(),
                name: "Günübirlik Kapadokya Kuzey (Kırmızı Tur)",
                description: "Kuzey Kapadokya günübirlik turu",
                destinationId: kapadokyaDestination.id,
                price: 475,
                duration: "8 saat",
                currency: "EUR"
              });
              
              exampleTours.push({
                id: generateUUID(),
                name: "2 Gün 1 Gece Sıcak Hava Balonlu Kapadokya Turu",
                description: "Sıcak hava balonu, Güllü Vadi, Kaymaklı Yeraltı Şehri, kaya oyma köyler, Göreme Açık Hava Müzesi dahil konaklama turu",
                destinationId: kapadokyaDestination.id,
                price: 850,
                duration: "2 gün, 1 gece",
                currency: "EUR"
              });
            }
            
            // Antalya turları
            if (antalyaDestination) {
              exampleTours.push({
                id: generateUUID(),
                name: "3 Gün 2 Gece Antalya Turu",
                description: "Antalya'da çok günlü tur",
                destinationId: antalyaDestination.id,
                price: 750,
                duration: "3 gün, 2 gece",
                currency: "EUR"
              });
            }
            
            // Trabzon turları
            if (trabzonDestination) {
              exampleTours.push({
                id: generateUUID(),
                name: "3 Gün 2 Gece Trabzon & Uzungöl Turu",
                description: "Trabzon ve Uzungöl'ün çok günlü turu",
                destinationId: trabzonDestination.id,
                price: 600,
                duration: "3 gün, 2 gece",
                currency: "EUR"
              });
            }
            
            if (exampleTours.length > 0) {
              setTourTemplates(exampleTours);
              
              // Tur şablonlarını veritabanına kaydet
              const { saveTourTemplates } = await import("@/lib/db");
              await saveTourTemplates(exampleTours);
            }
          }
        }
      }
    };    loadSettings()
    loadProviders()
    loadActivities()
    loadDestinations()
    loadTourTemplates()
    loadReservationSettings()
  }, [])
  
  // Rezervasyon ayarlarını yükle
  const loadReservationSettings = async () => {
    try {
      // Firebase'den mevcut ayarları yükle
      const [pickupTypesData, paymentMethodsData, paymentStatusesData] = await Promise.all([
        getReservationSettings('pickupTypes'),
        getReservationSettings('paymentMethods'),
        getReservationSettings('paymentStatuses')
      ]);

      // Alış yeri türleri
      if (pickupTypesData && pickupTypesData.length > 0) {
        setPickupTypes(pickupTypesData);
      } else {
        const defaultPickupTypes = [
          { id: generateUUID(), name: "Otel", description: "Müşteri otelinden alış" },
          { id: generateUUID(), name: "Acenta", description: "Acenta ofisinden alış" },
          { id: generateUUID(), name: "Havalimanı", description: "Havalimanından alış" },
          { id: generateUUID(), name: "Özel Adres", description: "Müşteri adresinden alış" },
          { id: generateUUID(), name: "Buluşma Noktası", description: "Belirlenen noktada buluşma" }
        ];
        setPickupTypes(defaultPickupTypes);
        await saveReservationSettings('pickupTypes', defaultPickupTypes);
      }

      // Ödeme yapanlar
      if (paymentMethodsData && paymentMethodsData.length > 0) {
        setPaymentMethods(paymentMethodsData);
      } else {
        const defaultPaymentMethods = [
          { id: generateUUID(), name: "Aracı", description: "Aracı firma tarafından ödendi" },
          { id: generateUUID(), name: "Müşteri", description: "Müşteri tarafından ödendi" },
          { id: generateUUID(), name: "Otel", description: "Otel tarafından ödendi" },
          { id: generateUUID(), name: "Nakit", description: "Nakit ödeme" }
        ];
        setPaymentMethods(defaultPaymentMethods);
        await saveReservationSettings('paymentMethods', defaultPaymentMethods);
      }

      // Ödeme durumları
      if (paymentStatusesData && paymentStatusesData.length > 0) {
        setPaymentStatuses(paymentStatusesData);
      } else {
        const defaultPaymentStatuses = [
          { id: generateUUID(), name: "Ödendi", color: "#10b981" },
          { id: generateUUID(), name: "Bekliyor", color: "#f59e0b" },
          { id: generateUUID(), name: "Kısmi Ödendi", color: "#3b82f6" },
          { id: generateUUID(), name: "İptal", color: "#ef4444" }
        ];
        setPaymentStatuses(defaultPaymentStatuses);
        await saveReservationSettings('paymentStatuses', defaultPaymentStatuses);
      }

      // Seri numarası ayarlarını yükle
      try {
        const nextNumber = await getNextSerialNumber();
        if (nextNumber) {
          // Mevcut seri numarasından ayarları çıkar
          const match = nextNumber.match(/^([A-Z]+)-(\d+)$/);
          if (match) {
            setSerialSettings(prev => ({
              ...prev,
              prefix: match[1],
              nextNumber: parseInt(match[2]),
              format: `${match[1]}-{number}`
            }));
          }
        }
      } catch (error) {
        console.error("Seri numarası ayarları yüklenirken hata:", error);
      }

    } catch (error) {
      console.error("Rezervasyon ayarları yüklenirken hata:", error);
    }
  }

  const handleCompanyInfoChange = (e: InputChangeEvent) => {
    const { name, value } = e.target
    setCompanyInfo((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogoUpload = (e: FileChangeEvent) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setCompanyInfo((prev) => ({ ...prev, logo: e.target?.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveSettings = async () => {
    try {
      // Kaydetme işlemi başladığında bir yükleniyor göstergesi
      const saveButton = document.querySelector('button[class*="bg-[#00a1c6]"]') as HTMLButtonElement | null;
      if (saveButton) {
        const originalContent = saveButton.innerHTML;
        saveButton.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Kaydediliyor...`;
        saveButton.disabled = true;

        // Ayarları kaydet
        await saveSettings({
          companyInfo,
        });

        // Başarılı animasyonu ve bildirimi göster
        saveButton.innerHTML = `<svg class="h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg> Kaydedildi!`;

        // Başarılı toast mesajı
        toast({
          title: "Şirket bilgileri kaydedildi!",
          description: "Şirket bilgileriniz başarıyla güncellendi.",
          variant: "default",
        });

        // 2 saniye sonra butonu normal haline döndür
        setTimeout(() => {
          saveButton.innerHTML = originalContent;
          saveButton.disabled = false;
        }, 2000);
      } else {
        // Buton bulunamazsa standart kaydet ve bildirimi göster
        await saveSettings({
          companyInfo,
        });
        
        toast({
          title: "Şirket bilgileri kaydedildi!",
          description: "Şirket bilgileriniz başarıyla güncellendi.",
        });
      }
    } catch (error) {
      console.error("Ayarlar kaydedilirken hata:", error);
      
      // Hata durumunda butonu sıfırla
      const saveButton = document.querySelector('button[class*="bg-[#00a1c6]"]') as HTMLButtonElement | null;
      if (saveButton) {
        saveButton.innerHTML = `<svg class="h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Şirket Bilgilerini Kaydet`;
        saveButton.disabled = false;
      }
      
      toast({
        title: "Hata",
        description: "Ayarlar kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  }

  // Gider türü ekleme/düzenleme dialog'unu aç
  const openExpenseDialog = (expense: ExpenseType | null = null) => {
    if (expense) {
      setNewExpenseType(expense)
      setIsEditingExpense(true)
    } else {
      setNewExpenseType({
        id: generateUUID(),
        type: "",
        name: "",
        description: "",
        category: "",
      })
      setIsEditingExpense(false)
    }
    setIsExpenseDialogOpen(true)
  }

  // Gider türü değişikliklerini işle
  const handleExpenseTypeChange = (e: InputChangeEvent) => {
    const { name, value } = e.target
    setNewExpenseType((prev) => ({ ...prev, [name]: value }))
  }

  // Gider kategorisi değişikliğini ele al
  const handleExpenseCategoryChange = (value: string) => {
    setNewExpenseType((prev) => ({ ...prev, category: value }));
  }

  // Gider türünü kaydet
  const handleSaveExpenseType = async () => {
    // Gerekli alanlar dolduruldu mu kontrol et
    if (!newExpenseType.name || !newExpenseType.category) {
      toast({
        title: "Hata",
        description: "Gider türü adı ve kategorisi zorunludur.",
        variant: "destructive",
      })
      return
    }

    // Gider türünü oluştur veya güncelle
    let updatedExpenseType = {
      ...newExpenseType,
      // Eğer type değeri boşsa, kategori değerinden otomatik bir değer oluştur
      type: newExpenseType.type || newExpenseType.category,
    }

    let updatedExpenseTypes = []

    if (isEditingExpense) {
      // Mevcut gider türünü güncelle
      updatedExpenseTypes = expenseTypes.map((item) => (item.id === updatedExpenseType.id ? updatedExpenseType : item))
    } else {
      // Yeni gider türü ekle
      updatedExpenseTypes = [...expenseTypes, updatedExpenseType]
    }

    setExpenseTypes(updatedExpenseTypes)
    setIsExpenseDialogOpen(false)

    // Değişiklikleri hemen kaydet
    try {
      await saveExpenseTypes(updatedExpenseTypes)
      toast({
        title: "Başarılı",
        description: isEditingExpense ? "Gider türü güncellendi." : "Yeni gider türü eklendi.",
      })
    } catch (error) {
      console.error("Gider türleri kaydedilirken hata:", error)
      toast({
        title: "Hata",
        description: "Gider türleri kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  // Gider türü silme dialog'unu aç
  const openDeleteExpenseDialog = (expense: ExpenseType) => {
    setExpenseToDelete(expense)
    setIsDeleteDialogOpen(true)
  }

  // Gider türü sil
  const handleDeleteExpenseType = async () => {
    const updatedExpenseTypes = expenseTypes.filter((item) => item.id !== expenseToDelete?.id)
    setExpenseTypes(updatedExpenseTypes)
    setIsDeleteDialogOpen(false)

    // Değişiklikleri hemen kaydet
    try {
      await saveExpenseTypes(updatedExpenseTypes)
      toast({
        title: "Başarılı",
        description: "Gider türü silindi.",
      })
    } catch (error) {
      console.error("Gider türleri kaydedilirken hata:", error)
      toast({
        title: "Hata",
        description: "Gider türleri kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }
  // Sağlayıcılar ile ilgili fonksiyonlar kaldırıldı - Firmalar yönetimi artık CompanyManagement bileşeninde

  // Aktivite ekleme/düzenleme dialog'unu aç
  const openActivityDialog = (activity: Activity | null = null) => {
    if (activity) {
      setNewActivity(activity)
      setIsEditingActivity(true)
    } else {
      setNewActivity({
        id: generateUUID(),
        name: "",
        description: "",
        defaultDuration: "",
        defaultPrice: "",
        defaultCurrency: "TRY",
      })
      setIsEditingActivity(false)
    }
    setIsActivityDialogOpen(true)
  }

  // Aktivite değişikliklerini işle
  const handleActivityChange = (e: InputChangeEvent) => {
    const { name, value } = e.target
    setNewActivity((prev) => ({ ...prev, [name]: value }))
  }

  // Aktivite kaydet
  const handleSaveActivity = async () => {
    if (!newActivity.name) {
      toast({
        title: "Hata",
        description: "Aktivite adı alanı zorunludur.",
        variant: "destructive",
      })
      return
    }

    let updatedActivities
    if (isEditingActivity) {
      // Mevcut aktiviteyi güncelle
      updatedActivities = activities.map((item) => (item.id === newActivity.id ? newActivity : item))
    } else {
      // Yeni aktivite ekle
      updatedActivities = [...activities, newActivity]
    }

    setActivities(updatedActivities)
    setIsActivityDialogOpen(false)

    // Değişiklikleri hemen kaydet
    try {
      await saveActivities(updatedActivities)
      toast({
        title: "Başarılı",
        description: isEditingActivity ? "Aktivite güncellendi." : "Yeni aktivite eklendi.",
      })
    } catch (error) {
      console.error("Aktiviteler kaydedilirken hata:", error)
      toast({
        title: "Hata",
        description: "Aktiviteler kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  // Aktivite silme dialog'unu aç
  const openDeleteActivityDialog = (activity: Activity) => {
    setActivityToDelete(activity)
    setIsDeleteActivityDialogOpen(true)
  }

  // Aktivite sil
  const handleDeleteActivity = async () => {
    const updatedActivities = activities.filter((item) => item.id !== activityToDelete?.id)
    setActivities(updatedActivities)
    setIsDeleteActivityDialogOpen(false)

    // Değişiklikleri hemen kaydet
    try {
      await saveActivities(updatedActivities)
      toast({
        title: "Başarılı",
        description: "Aktivite silindi.",
      })
    } catch (error) {
      console.error("Aktiviteler kaydedilirken hata:", error)
      toast({
        title: "Hata",
        description: "Aktiviteler kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  // Destinasyon ekleme/düzenleme dialog'unu aç
  const openDestinationDialog = (destination: Destination | null = null) => {
    if (destination) {
      setNewDestination(destination)
      setIsEditingDestination(true)
    } else {
      setNewDestination({
        id: generateUUID(),
        name: "",
        country: "",
        region: "",
        description: "",
      })
      setIsEditingDestination(false)
    }
    setIsDestinationDialogOpen(true)
  }

  // Destinasyon değişikliklerini işle
  const handleDestinationChange = (e: InputChangeEvent) => {
    const { name, value } = e.target
    setNewDestination((prev) => ({ ...prev, [name]: value }))
  }

  // Destinasyon kaydet
  const handleSaveDestination = async () => {
    if (!newDestination.name) {
      toast({
        title: "Hata",
        description: "Destinasyon adı alanı zorunludur.",
        variant: "destructive",
      })
      return
    }

    let updatedDestinations
    if (isEditingDestination) {
      // Mevcut destinasyonu güncelle
      updatedDestinations = destinations.map((item) => (item.id === newDestination.id ? newDestination : item))
    } else {
      // Yeni destinasyon ekle
      updatedDestinations = [...destinations, newDestination]
    }

    setDestinations(updatedDestinations)
    setIsDestinationDialogOpen(false)

    // Değişiklikleri hemen kaydet
    try {
      await saveDestinations(updatedDestinations)
      toast({
        title: "Başarılı",
        description: isEditingDestination ? "Destinasyon güncellendi." : "Yeni destinasyon eklendi.",
      })
    } catch (error) {
      console.error("Destinasyonlar kaydedilirken hata:", error)
      toast({
        title: "Hata",
        description: "Destinasyonlar kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  // Destinasyon silme dialog'unu aç
  const openDeleteDestinationDialog = (destination: Destination) => {
    setDestinationToDelete(destination)
    setIsDeleteDestinationDialogOpen(true)
  }

  // Destinasyon sil
  const handleDeleteDestination = async () => {
    const updatedDestinations = destinations.filter((item) => item.id !== destinationToDelete?.id)
    setDestinations(updatedDestinations)
    setIsDeleteDestinationDialogOpen(false)

    // Değişiklikleri hemen kaydet
    try {
      await saveDestinations(updatedDestinations)
      toast({
        title: "Başarılı",
        description: "Destinasyon silindi.",
      })
    } catch (error) {
      console.error("Destinasyonlar kaydedilirken hata:", error)
      toast({
        title: "Hata",
        description: "Destinasyonlar kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }
  
  // Destinasyon seçimi için handler güncellemesi
  const handleDestinationSelect = async (value: string) => {
    setSelectedDestinationId(value);
    
    console.log("Seçilen destinasyon ID:", value);
    
    if (value) {
      try {
        // Doğrudan seçili destinasyon için tur şablonlarını getir
        const { getTourTemplatesByDestination } = await import("@/lib/db-firebase");
        const destinationTours = await getTourTemplatesByDestination(value);
        
        // Eğer mevcut şablonları güncellememiz gerekiyorsa
        if (destinationTours && destinationTours.length > 0) {
          console.log(`${destinationTours.length} tur şablonu yüklendi`);
          
          // Mevcut tur şablonlarını koruyarak sadece seçili destinasyona ait turları güncelleyelim
          const updatedTourTemplates = tourTemplates.filter(tour => tour.destinationId !== value);
          setTourTemplates([...updatedTourTemplates, ...destinationTours]);
        } else {
          console.log("Seçilen destinasyon için hiç tur şablonu bulunamadı");
        }
      } catch (error) {
        console.error("Destinasyon turları yüklenirken hata:", error);
        toast({
          title: "Hata",
          description: "Turlar yüklenirken bir sorun oluştu.",
          variant: "destructive",
        });
      }
    }
  }

  // Tur şablonu dialog'unu aç
  const openTourDialog = (tour: Tour | null = null) => {
    if (tour) {
      setNewTourTemplate({...tour});
      setIsEditingTour(true);
    } else {
      setNewTourTemplate({
        id: generateUUID(),
        name: "",
        description: "",
        destinationId: selectedDestinationId,
        price: 0,
        duration: "",
        currency: "EUR",
      });
      setIsEditingTour(false);
    }
    setIsTourDialogOpen(true);
  }

  // Tur şablonu kaydetme işlemini yönet
  const handleSaveTourTemplate = async () => {
    try {
      // Validasyon
      if (!newTourTemplate.name || !newTourTemplate.duration) {
        toast({
          title: "Hata",
          description: "Lütfen tur adı ve süresini belirtin.",
          variant: "destructive",
        });
        return;
      }

      // ID olmadan kaydetme yapmayalım
      if (!newTourTemplate.id) {
        newTourTemplate.id = generateUUID();
      }
      
      debugLog("Kaydedilecek tur şablonu:", newTourTemplate);

      // State'i güncelleyelim
      let updatedTours = [...tourTemplates];
      
      if (isEditingTour) {
        // Mevcut turu güncelle
        updatedTours = tourTemplates.map(tour => 
          tour.id === newTourTemplate.id ? newTourTemplate : tour
        );
        debugLog(`Mevcut tur güncellendi: ${newTourTemplate.name}`);
      } else {
        // Yeni tur ekle
        updatedTours = [...tourTemplates, newTourTemplate];
        debugLog(`Yeni tur eklendi: ${newTourTemplate.name}`);
      }

      // Önce state'i güncelleyip UI'ı hızlı gösterelim
      setTourTemplates(updatedTours);
      
      // Dialog'u kapatalım
      setIsTourDialogOpen(false);
      
      // Başarı mesajı gösterelim
      toast({
        title: "İşlem başarılı",
        description: isEditingTour 
          ? "Tur şablonu güncellendi." 
          : "Yeni tur şablonu eklendi.",
      });
      
      // YENİ: Doğrudan Firebase Firestore'a kaydetme metodunu kullan
      try {
        await saveTourTemplatesDirectly(updatedTours);
        debugLog("Tur şablonları doğrudan Firebase'e kaydedildi!");
      } catch (directError) {
        debugLog(`Doğrudan kaydetme hatası: ${(directError as Error).message}`);
        
        // Yedek yöntem: db.ts üzerinden kaydet
        try {
          const { saveTourTemplates } = await import("@/lib/db");
          await saveTourTemplates(updatedTours);
          debugLog('Tur şablonları yedek yöntemle kaydedildi');
        } catch (fallbackError) {
          debugLog(`Yedek kaydetme hatası: ${(fallbackError as Error).message}`);
          throw fallbackError;
        }
      }
      
    } catch (error) {
      debugLog(`HATA: ${(error as Error).message}`);
      console.error("Tur şablonu kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "Tur şablonu kaydedilirken bir sorun oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    }
  }

  // Tur şablonu sil
  const handleDeleteTourTemplate = async () => {
    const updatedTourTemplates = tourTemplates.filter((item) => item.id !== tourToDelete?.id)
    setTourTemplates(updatedTourTemplates)
    setIsDeleteTourDialogOpen(false)

    // Değişiklikleri hemen kaydet
    try {
      const { saveTourTemplates } = await import("@/lib/db");
      await saveTourTemplates(updatedTourTemplates);
      toast({
        title: "Başarılı",
        description: "Tur şablonu silindi.",
      })
    } catch (error) {
      console.error("Tur şablonları kaydedilirken hata:", error)
      toast({
        title: "Hata",
        description: "Tur şablonları kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  // =============== REZERVASYON AYARLARI CRUD FONKSİYONLARI ===============

  // Alış Yeri Türü ekleme/düzenleme dialog'unu aç
  const openPickupTypeDialog = (pickupType: PickupType | null = null) => {
    if (pickupType) {
      setNewPickupType(pickupType)
      setIsEditingPickupType(true)
    } else {
      setNewPickupType({
        id: generateUUID(),
        name: "",
        description: "",
      })
      setIsEditingPickupType(false)
    }
    setIsPickupTypeDialogOpen(true)
  }

  // Alış Yeri Türü değişikliklerini işle
  const handlePickupTypeChange = (e: InputChangeEvent) => {
    const { name, value } = e.target
    setNewPickupType((prev) => ({ ...prev, [name]: value }))
  }

  // Alış Yeri Türü kaydet
  const handleSavePickupType = async () => {
    if (!newPickupType.name) {
      toast({
        title: "Hata",
        description: "Alış yeri türü adı zorunludur.",
        variant: "destructive",
      })
      return
    }

    let updatedPickupTypes
    if (isEditingPickupType) {
      updatedPickupTypes = pickupTypes.map((item) => (item.id === newPickupType.id ? newPickupType : item))
    } else {
      updatedPickupTypes = [...pickupTypes, newPickupType]
    }

    setPickupTypes(updatedPickupTypes)
    setIsPickupTypeDialogOpen(false)

    try {
      await saveReservationSettings('pickupTypes', updatedPickupTypes)
      toast({
        title: "Başarılı",
        description: isEditingPickupType ? "Alış yeri türü güncellendi." : "Yeni alış yeri türü eklendi.",
      })
    } catch (error) {
      console.error("Alış yeri türleri kaydedilirken hata:", error)
      toast({
        title: "Hata",
        description: "Alış yeri türleri kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  // Alış Yeri Türü sil
  const handleDeletePickupType = async (pickupType: PickupType) => {
    const updatedPickupTypes = pickupTypes.filter((item) => item.id !== pickupType.id)
    setPickupTypes(updatedPickupTypes)

    try {
      await saveReservationSettings('pickupTypes', updatedPickupTypes)
      toast({
        title: "Başarılı",
        description: "Alış yeri türü silindi.",
      })
    } catch (error) {
      console.error("Alış yeri türleri kaydedilirken hata:", error)
      toast({
        title: "Hata",
        description: "Alış yeri türleri kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  // Ödeme Yöntemi ekleme/düzenleme dialog'unu aç
  const openPaymentMethodDialog = (paymentMethod: PaymentMethod | null = null) => {
    if (paymentMethod) {
      setNewPaymentMethod(paymentMethod)
      setIsEditingPaymentMethod(true)
    } else {
      setNewPaymentMethod({
        id: generateUUID(),
        name: "",
        description: "",
      })
      setIsEditingPaymentMethod(false)
    }
    setIsPaymentMethodDialogOpen(true)
  }

  // Ödeme Yöntemi değişikliklerini işle
  const handlePaymentMethodChange = (e: InputChangeEvent) => {
    const { name, value } = e.target
    setNewPaymentMethod((prev) => ({ ...prev, [name]: value }))
  }

  // Ödeme Yöntemi kaydet
  const handleSavePaymentMethod = async () => {
    if (!newPaymentMethod.name) {
      toast({
        title: "Hata",
        description: "Ödeme yöntemi adı zorunludur.",
        variant: "destructive",
      })
      return
    }

    let updatedPaymentMethods
    if (isEditingPaymentMethod) {
      updatedPaymentMethods = paymentMethods.map((item) => (item.id === newPaymentMethod.id ? newPaymentMethod : item))
    } else {
      updatedPaymentMethods = [...paymentMethods, newPaymentMethod]
    }

    setPaymentMethods(updatedPaymentMethods)
    setIsPaymentMethodDialogOpen(false)

    try {
      await saveReservationSettings('paymentMethods', updatedPaymentMethods)
      toast({
        title: "Başarılı",
        description: isEditingPaymentMethod ? "Ödeme yöntemi güncellendi." : "Yeni ödeme yöntemi eklendi.",
      })
    } catch (error) {
      console.error("Ödeme yöntemleri kaydedilirken hata:", error)
      toast({
        title: "Hata",
        description: "Ödeme yöntemleri kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  // Ödeme Yöntemi sil
  const handleDeletePaymentMethod = async (paymentMethod: PaymentMethod) => {
    const updatedPaymentMethods = paymentMethods.filter((item) => item.id !== paymentMethod.id)
    setPaymentMethods(updatedPaymentMethods)

    try {
      await saveReservationSettings('paymentMethods', updatedPaymentMethods)
      toast({
        title: "Başarılı",
        description: "Ödeme yöntemi silindi.",
      })
    } catch (error) {
      console.error("Ödeme yöntemleri kaydedilirken hata:", error)
      toast({
        title: "Hata",
        description: "Ödeme yöntemleri kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  // Ödeme Durumu ekleme/düzenleme dialog'unu aç
  const openPaymentStatusDialog = (paymentStatus: PaymentStatus | null = null) => {
    if (paymentStatus) {
      setNewPaymentStatus(paymentStatus)
      setIsEditingPaymentStatus(true)
    } else {
      setNewPaymentStatus({
        id: generateUUID(),
        name: "",
        color: "#10b981",
      })
      setIsEditingPaymentStatus(false)
    }
    setIsPaymentStatusDialogOpen(true)
  }

  // Ödeme Durumu değişikliklerini işle
  const handlePaymentStatusChange = (e: InputChangeEvent) => {
    const { name, value } = e.target
    setNewPaymentStatus((prev) => ({ ...prev, [name]: value }))
  }

  // Ödeme Durumu kaydet
  const handleSavePaymentStatus = async () => {
    if (!newPaymentStatus.name) {
      toast({
        title: "Hata",
        description: "Ödeme durumu adı zorunludur.",
        variant: "destructive",
      })
      return
    }

    let updatedPaymentStatuses
    if (isEditingPaymentStatus) {
      updatedPaymentStatuses = paymentStatuses.map((item) => (item.id === newPaymentStatus.id ? newPaymentStatus : item))
    } else {
      updatedPaymentStatuses = [...paymentStatuses, newPaymentStatus]
    }

    setPaymentStatuses(updatedPaymentStatuses)
    setIsPaymentStatusDialogOpen(false)

    try {
      await saveReservationSettings('paymentStatuses', updatedPaymentStatuses)
      toast({
        title: "Başarılı",
        description: isEditingPaymentStatus ? "Ödeme durumu güncellendi." : "Yeni ödeme durumu eklendi.",
      })
    } catch (error) {
      console.error("Ödeme durumları kaydedilirken hata:", error)
      toast({
        title: "Hata",
        description: "Ödeme durumları kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  // Ödeme Durumu sil
  const handleDeletePaymentStatus = async (paymentStatus: PaymentStatus) => {
    const updatedPaymentStatuses = paymentStatuses.filter((item) => item.id !== paymentStatus.id)
    setPaymentStatuses(updatedPaymentStatuses)

    try {
      await saveReservationSettings('paymentStatuses', updatedPaymentStatuses)
      toast({
        title: "Başarılı",
        description: "Ödeme durumu silindi.",
      })
    } catch (error) {
      console.error("Ödeme durumları kaydedilirken hata:", error)
      toast({
        title: "Hata",
        description: "Ödeme durumları kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }
  // Seri Numarası Ayarları kaydet
  const handleSaveSerialSettings = async () => {
    try {
      // Firebase'de seri numarası ayarlarını kaydet - updateSerialSettings kullan
      await updateSerialSettings(serialSettings)
      
      toast({
        title: "Başarılı",
        description: "Seri numarası ayarları kaydedildi.",
      })
    } catch (error) {
      console.error("Seri numarası ayarları kaydedilirken hata:", error)
      toast({
        title: "Hata", 
        description: "Seri numarası ayarları kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  // Seri numarası ayarları değişikliklerini işle
  const handleSerialSettingsChange = (field: string, value: string | number) => {
    setSerialSettings(prev => ({
      ...prev,
      [field]: value,
      format: field === 'prefix' ? `${value}-{number}` : prev.format
    }))
  }

  // Gider türleri için dropdown verisi
  const expenseCategories = [
    { value: "accommodation", label: "Konaklama" },
    { value: "transportation", label: "Ulaşım" },
    { value: "transfer", label: "Transfer" },
    { value: "guide", label: "Rehber" },
    { value: "agency", label: "Acente" },
    { value: "porter", label: "Hanutçu" },
    { value: "meal", label: "Yemek" },
    { value: "activity", label: "Aktivite" },
    { value: "general", label: "Genel" },
    { value: "other", label: "Diğer" },
  ]

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[#00a1c6]">Ayarlar</CardTitle>
        <Button variant="outline" onClick={onClose}>
          Kapat
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full md:w-auto md:inline-flex grid-cols-7">
            <TabsTrigger value="company">Şirket</TabsTrigger>
            <TabsTrigger value="providers">Firmalar</TabsTrigger>
            <TabsTrigger value="expense-types">Gider Türleri</TabsTrigger>
            <TabsTrigger value="activities">Aktiviteler</TabsTrigger>
            <TabsTrigger value="destinations">Destinasyonlar</TabsTrigger>
            <TabsTrigger value="tours">Tur Şablonları</TabsTrigger>
            <TabsTrigger value="reservation-settings">Rezervasyon Ayarları</TabsTrigger>
          </TabsList>

          {/* Şirket Bilgileri */}
          <TabsContent value="company" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Şirket Adı</Label>
                <Input id="name" name="name" value={companyInfo.name} onChange={handleCompanyInfoChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxId">Vergi Numarası</Label>
                <Input id="taxId" name="taxId" value={companyInfo.taxId} onChange={handleCompanyInfoChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Textarea
                id="address"
                name="address"
                value={companyInfo.address}
                onChange={handleCompanyInfoChange}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" name="phone" value={companyInfo.phone} onChange={handleCompanyInfoChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={companyInfo.email}
                  onChange={handleCompanyInfoChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Web Sitesi</Label>
              <Input id="website" name="website" value={companyInfo.website} onChange={handleCompanyInfoChange} />
            </div>

            <div className="space-y-2">
              <Label>Şirket Logosu</Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 border rounded flex items-center justify-center bg-gray-100 overflow-hidden">
                  {companyInfo.logo ? (
                    <img
                      src={companyInfo.logo || "/placeholder.svg"}
                      alt="Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-muted-foreground">Logo</span>
                  )}
                </div>
                <div>
                  <Input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <Button variant="outline" onClick={() => document.getElementById("logo")?.click()}>
                    Logo Yükle                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveSettings} className="bg-[#00a1c6] hover:bg-[#00a1c6]">
                <Save className="h-4 w-4 mr-2" />
                Şirket Bilgilerini Kaydet
              </Button>
            </div>
          </TabsContent>

          {/* Firmalar */}
          <TabsContent value="providers">
            <CompanyManagement />
          </TabsContent>{/* Gider Türleri Tab */}
          <TabsContent value="expense-types" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Gider Türleri</h3>
                <p className="text-sm text-muted-foreground">
                  Tur harcamalarında kullanılacak gider türlerini yönetin
                </p>
              </div>
              <Button onClick={() => openExpenseDialog()}>
                <Plus className="mr-2 h-4 w-4" /> Gider Türü Ekle
              </Button>
            </div>

            <div className="border rounded-md p-4 bg-slate-50 mb-4">
              <h4 className="font-medium mb-2">Gider Türleri Hakkında</h4>
              <p className="text-sm text-muted-foreground">
                Gider türleri, tur kaydında harcamaları kategorize etmenizi sağlar. 
                Önce bir kategori (konaklama, ulaşım vb.) seçilir, sonra bu kategori altında tanımladığınız gider türleri listelenir.
              </p>
              <div className="mt-2 text-sm">
                <span className="font-medium">Örnek:</span> "Konaklama" kategorisi altında "Otel Konaklaması", "Apart Daire" gibi gider türleri olabilir.
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Kategori</TableHead>
                    <TableHead>Gider Adı</TableHead>
                    <TableHead className="hidden md:table-cell">Açıklama</TableHead>
                    <TableHead className="w-[100px] text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseTypes.length > 0 ? (
                    expenseTypes.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">
                          {expenseCategories.find((cat) => cat.value === expense.category)?.label ||
                            expense.category ||
                            "Genel"}
                        </TableCell>
                        <TableCell>{expense.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{expense.description}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => openExpenseDialog(expense)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteExpenseDialog(expense)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <CircleSlash className="h-8 w-8 text-muted-foreground" />
                          <div className="text-sm text-muted-foreground">Henüz gider türü eklenmemiş</div>
                          <Button variant="outline" size="sm" onClick={() => openExpenseDialog()}>
                            <Plus className="mr-2 h-4 w-4" /> Gider Türü Ekle
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Aktiviteler */}
          <TabsContent value="activities" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Aktiviteler</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => openActivityDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Aktivite Ekle
              </Button>
            </div>            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aktivite Adı</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Varsayılan Süre</TableHead>
                    <TableHead>Varsayılan Fiyat</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>                  {activities.length > 0 ? (
                    activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium">{activity.name}</TableCell>
                        <TableCell>{activity.description}</TableCell>
                        <TableCell>{activity.defaultDuration}</TableCell>
                        <TableCell>
                          {activity.defaultPrice} {activity.defaultCurrency}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openActivityDialog(activity)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openDeleteActivityDialog(activity)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        Henüz aktivite eklenmemiş
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Destinasyonlar */}
          <TabsContent value="destinations" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Destinasyonlar</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => openDestinationDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Destinasyon Ekle
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destinasyon Adı</TableHead>
                    <TableHead>Ülke</TableHead>
                    <TableHead>Bölge</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>                  {destinations.length > 0 ? (
                    destinations.map((destination) => (
                      <TableRow key={destination.id}>
                        <TableCell className="font-medium">{destination.name}</TableCell>
                        <TableCell>{destination.country}</TableCell>
                        <TableCell>{destination.region}</TableCell>
                        <TableCell>{destination.description}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openDestinationDialog(destination)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDestinationDialog(destination)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        Henüz destinasyon eklenmemiş
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>          </TabsContent>

          {/* Tur Şablonları */}
          <TabsContent value="tours" className="space-y-4">
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Tur Şablonları</h3>
                <div className="space-x-2">
                  <Select value={selectedDestinationId} onValueChange={handleDestinationSelect}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Destinasyon seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinations.map((destination) => (
                        <SelectItem key={destination.id} value={destination.id}>
                          {destination.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openTourDialog()}
                    disabled={!selectedDestinationId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Tur Şablonu Ekle
                  </Button>
                </div>
              </div>

              {selectedDestinationId ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tur Adı</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead>Süre</TableHead>
                        <TableHead>Fiyat</TableHead>
                        <TableHead>İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tourTemplates.filter(tour => tour.destinationId === selectedDestinationId).length > 0 ? (
                        tourTemplates
                          .filter(tour => tour.destinationId === selectedDestinationId)
                          .map((tour) => (
                            <TableRow key={tour.id}>
                              <TableCell className="font-medium">{tour.name}</TableCell>
                              <TableCell>{tour.description}</TableCell>
                              <TableCell>{tour.duration}</TableCell>
                              <TableCell>
                                {tour.price} {tour.currency}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openTourDialog(tour)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setTourToDelete(tour)
                                      setIsDeleteTourDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            Bu destinasyon için henüz tur şablonu eklenmemiş
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-md border p-8 text-center bg-muted/20">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">Turları görmek için lütfen bir destinasyon seçin</p>
                  </div>
                </div>
              )}
            </div>          </TabsContent>

          {/* Rezervasyon Ayarları */}
          <TabsContent value="reservation-settings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Alış Yeri Türleri */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Alış Yeri Türleri
                  </CardTitle>
                  <CardDescription>
                    Müşteri alış yeri türlerini yönetin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button                      onClick={() => {
                        setNewPickupType({
                          id: generateUUID(),
                          name: "",
                          description: ""
                        })
                        setIsEditingPickupType(false)
                        setIsPickupTypeDialogOpen(true)
                      }}
                      className="w-full bg-[#00a1c6] hover:bg-[#008bb3]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Yeni Alış Yeri Türü Ekle
                    </Button>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {pickupTypes.map((type) => (
                        <div key={type.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{type.name}</div>
                            <div className="text-sm text-gray-500">{type.description}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setNewPickupType(type)
                                setIsEditingPickupType(true)
                                setIsPickupTypeDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await handleDeletePickupType(type)
                                } catch (error) {
                                  console.error("Alış yeri türü silinirken hata:", error)
                                  toast({
                                    title: "Hata",
                                    description: "Alış yeri türü silinirken bir hata oluştu.",
                                    variant: "destructive",
                                  })
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>                  </div>
                </CardContent>
              </Card>

              {/* Ödeme Yöntemleri */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Ödeme Yapanlar
                  </CardTitle>
                  <CardDescription>
                    Ödeme yapan türlerini yönetin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button                      onClick={() => {
                        setNewPaymentMethod({
                          id: generateUUID(),
                          name: "",
                          description: ""
                        })
                        setIsEditingPaymentMethod(false)
                        setIsPaymentMethodDialogOpen(true)
                      }}
                      className="w-full bg-[#00a1c6] hover:bg-[#008bb3]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Yeni Ödeme Yapan Ekle
                    </Button>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {paymentMethods.map((method) => (
                        <div key={method.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{method.name}</div>
                            <div className="text-sm text-gray-500">{method.description}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setNewPaymentMethod(method)
                                setIsEditingPaymentMethod(true)
                                setIsPaymentMethodDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await handleDeletePaymentMethod(method)
                                } catch (error) {
                                  console.error("Ödeme yöntemi silinirken hata:", error)
                                  toast({
                                    title: "Hata",
                                    description: "Ödeme yöntemi silinirken bir hata oluştu.",
                                    variant: "destructive",
                                  })
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ödeme Durumları */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CircleSlash className="h-5 w-5" />
                    Ödeme Durumları
                  </CardTitle>
                  <CardDescription>
                    Ödeme durumlarını yönetin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button                      onClick={() => {
                        setNewPaymentStatus({
                          id: generateUUID(),
                          name: "",
                          color: "#10b981"
                        })
                        setIsEditingPaymentStatus(false)
                        setIsPaymentStatusDialogOpen(true)
                      }}
                      className="w-full bg-[#00a1c6] hover:bg-[#008bb3]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Yeni Ödeme Durumu Ekle
                    </Button>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {paymentStatuses.map((status) => (
                        <div key={status.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: status.color }}
                            />
                            <div className="font-medium">{status.name}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setNewPaymentStatus(status)
                                setIsEditingPaymentStatus(true)
                                setIsPaymentStatusDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await handleDeletePaymentStatus(status)
                                } catch (error) {
                                  console.error("Ödeme durumu silinirken hata:", error)
                                  toast({
                                    title: "Hata",
                                    description: "Ödeme durumu silinirken bir hata oluştu.",
                                    variant: "destructive",
                                  })
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Seri Numarası Ayarları */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Save className="h-5 w-5" />
                    Seri Numarası Ayarları
                  </CardTitle>
                  <CardDescription>
                    Rezervasyon seri numarası formatını ayarlayın
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="serialPrefix">Prefix</Label>                        <Input 
                          id="serialPrefix"
                          value={serialSettings.prefix}
                          onChange={(e) => handleSerialSettingsChange('prefix', e.target.value)}
                          placeholder="REZ"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="serialDigits">Basamak Sayısı</Label>                        <Input 
                          id="serialDigits"
                          type="number"
                          value={serialSettings.digits}
                          onChange={(e) => handleSerialSettingsChange('digits', parseInt(e.target.value) || 4)}
                          min={1}
                          max={10}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serialNext">Bir Sonraki Numara</Label>                        <Input 
                          id="serialNext"
                          type="number"
                          value={serialSettings.nextNumber}
                          onChange={(e) => handleSerialSettingsChange('nextNumber', parseInt(e.target.value) || 1)}
                          min={1}
                        />
                    </div>
                    <div className="space-y-2">
                      <Label>Örnek Format</Label>
                      <div className="p-3 bg-gray-100 rounded-lg font-mono">
                        {serialSettings.prefix}-{String(serialSettings.nextNumber).padStart(serialSettings.digits, '0')}
                      </div>
                    </div>                    <Button 
                      onClick={handleSaveSerialSettings}
                      className="w-full bg-[#00a1c6] hover:bg-[#008bb3]"
                    >
                      Ayarları Kaydet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Gider Türü Ekleme/Düzenleme Dialog */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingExpense ? "Gider Türünü Düzenle" : "Yeni Gider Türü Ekle"}</DialogTitle>
            <DialogDescription>
              Tur harcamaları için kullanılacak gider türünü tanımlayın. Önce kategori seçip, sonra o kategorideki gider türünü belirleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expense-category">Gider Kategorisi <span className="text-red-500">*</span></Label>
              <Select value={newExpenseType.category} onValueChange={handleExpenseCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                {expenseCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                    {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Giderin ana kategorisini seçin (örn. Konaklama, Ulaşım)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-name">Gider Adı <span className="text-red-500">*</span></Label>
              <Input
                id="expense-name"
                name="name"
                value={newExpenseType.name}
                onChange={handleExpenseTypeChange}
                placeholder="Örn. Otel Konaklaması"
              />
              <p className="text-xs text-muted-foreground">
                Gider türünün adı (örn. Otel Konaklaması, Otobüs Bileti)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-description">Açıklama</Label>
              <Textarea
                id="expense-description"
                name="description"
                value={newExpenseType.description}
                onChange={handleExpenseTypeChange}
                placeholder="Açıklama girin"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
              İptal
            </Button>
            <Button type="submit" onClick={handleSaveExpenseType}>
              {isEditingExpense ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gider Türü Silme Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gider Türünü Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu gider türünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteExpenseType}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>      {/* Sağlayıcı diyalogları kaldırıldı - Firmalar yönetimi artık CompanyManagement bileşeninde */}

      {/* Aktivite Ekleme/Düzenleme Dialog */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingActivity ? "Aktiviteyi Düzenle" : "Yeni Aktivite Ekle"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="activityName">Aktivite Adı</Label>
              <Input
                id="activityName"
                name="name"
                value={newActivity.name}
                onChange={handleActivityChange}
                placeholder="Aktivite adı"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activityDescription">Açıklama</Label>
              <Textarea
                id="activityDescription"
                name="description"
                value={newActivity.description}
                onChange={handleActivityChange}
                placeholder="Aktivite açıklaması"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultDuration">Varsayılan Süre</Label>
              <Input
                id="defaultDuration"
                name="defaultDuration"
                value={newActivity.defaultDuration}
                onChange={handleActivityChange}
                placeholder="Örn: 2 saat, Tam gün"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultPrice">Varsayılan Fiyat</Label>
                <Input
                  id="defaultPrice"
                  name="defaultPrice"
                  type="number"
                  step="0.01"
                  value={newActivity.defaultPrice}
                  onChange={handleActivityChange}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultCurrency">Para Birimi</Label>
                <select
                  id="defaultCurrency"
                  name="defaultCurrency"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newActivity.defaultCurrency}
                  onChange={handleActivityChange}
                >
                  <option value="TRY">Türk Lirası (₺)</option>
                  <option value="USD">Amerikan Doları ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">İngiliz Sterlini (£)</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActivityDialogOpen(false)}>
              İptal
            </Button>
            <Button type="submit" onClick={handleSaveActivity}>
              {isEditingActivity ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aktivite Silme Dialogu */}
      <AlertDialog open={isDeleteActivityDialogOpen} onOpenChange={setIsDeleteActivityDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aktiviteyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu aktiviteyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteActivity}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Destinasyon Ekleme/Düzenleme Dialog */}
      <Dialog open={isDestinationDialogOpen} onOpenChange={setIsDestinationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingDestination ? "Destinasyonu Düzenle" : "Yeni Destinasyon Ekle"}</DialogTitle>
            <DialogDescription>
              Turlarda kullanılacak yeni bir destinasyon ekleyin veya mevcut destinasyonu düzenleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="destinationName">Destinasyon Adı <span className="text-red-500">*</span></Label>
              <Input
                id="destinationName"
                name="name"
                value={newDestination.name}
                onChange={handleDestinationChange}
                placeholder="Örn: İstanbul, Antalya, Paris"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Ülke</Label>
              <Input
                id="country"
                name="country"
                value={newDestination.country}
                onChange={handleDestinationChange}
                placeholder="Örn: Türkiye, Fransa, İtalya"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Bölge</Label>
              <Input
                id="region"
                name="region" 
                value={newDestination.region}
                onChange={handleDestinationChange}
                placeholder="Örn: Akdeniz, Ege, Avrupa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                name="description"
                value={newDestination.description}
                onChange={handleDestinationChange}
                placeholder="Destinasyon hakkında kısa bir açıklama..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDestinationDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              className="bg-[#00a1c6] hover:bg-[#00a1c6]" 
              onClick={async () => {
                try {
                  console.log("Destinasyon kaydetme işlemi başladı...");
                  await handleSaveDestination();
                  console.log("Destinasyon kaydetme işlemi tamamlandı!");
                } catch (error) {
                  console.error("Destinasyon kaydetme hatası:", error);
                  toast({
                    title: "Hata",
                    description: "Destinasyon kaydedilirken bir hata oluştu: " + (error as Error).message,
                    variant: "destructive",
                  });
                }
              }}
            >
              {isEditingDestination ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Destinasyon Silme Dialog */}
      <AlertDialog open={isDeleteDestinationDialogOpen} onOpenChange={setIsDeleteDestinationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Destinasyonu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu destinasyonu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteDestination}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tur Şablonu Ekleme/Düzenleme Dialog */}
      <Dialog open={isTourDialogOpen} onOpenChange={setIsTourDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingTour ? "Tur Şablonunu Düzenle" : "Yeni Tur Şablonu Ekle"}</DialogTitle>
            <DialogDescription>
              {destinations.find(d => d.id === selectedDestinationId)?.name || "Seçili destinasyon"} için tur şablonu ekleyin
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tourName">Tur Adı</Label>
              <Input
                id="tourName"
                name="name"
                value={newTourTemplate.name}
                onChange={(e) => setNewTourTemplate({...newTourTemplate, name: e.target.value})}
                placeholder="Tur adı"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tourDescription">Açıklama</Label>
              <Textarea
                id="tourDescription"
                name="description"
                value={newTourTemplate.description}
                onChange={(e) => setNewTourTemplate({...newTourTemplate, description: e.target.value})}
                placeholder="Tur açıklaması"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tourDuration">Süre</Label>
              <Input
                id="tourDuration"
                name="duration"
                value={newTourTemplate.duration}
                onChange={(e) => setNewTourTemplate({...newTourTemplate, duration: e.target.value})}
                placeholder="Örn: 2 saat, 1 gün, 3 gün 2 gece"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tourPrice">Kişi Başı Fiyat</Label>
                <Input
                  id="tourPrice"
                  name="price"
                  type="number"
                  step="0.01"
                  value={newTourTemplate.price}
                  onChange={(e) => setNewTourTemplate({...newTourTemplate, price: parseFloat(e.target.value)})}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tourCurrency">Para Birimi</Label>
                <Select
                  value={newTourTemplate.currency}
                  onValueChange={(value) => setNewTourTemplate({...newTourTemplate, currency: value})}
                >
                  <SelectTrigger id="tourCurrency">
                    <SelectValue placeholder="Para birimi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
                    <SelectItem value="USD">Amerikan Doları ($)</SelectItem>
                    <SelectItem value="EUR">Euro (€)</SelectItem>
                    <SelectItem value="GBP">İngiliz Sterlini (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTourDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              className="bg-[#00a1c6] hover:bg-[#00a1c6]" 
              onClick={handleSaveTourTemplate}
            >
              {isEditingTour ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>      {/* Tur Şablonu Silme Dialog */}
      <AlertDialog open={isDeleteTourDialogOpen} onOpenChange={setIsDeleteTourDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tur Şablonunu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu tur şablonunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteTourTemplate}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============= REZERVASYON AYARLARI DİYALOGLARI ============= */}

      {/* Alış Yeri Türü Ekleme/Düzenleme Dialog */}
      <Dialog open={isPickupTypeDialogOpen} onOpenChange={setIsPickupTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingPickupType ? "Alış Yeri Türünü Düzenle" : "Yeni Alış Yeri Türü Ekle"}</DialogTitle>
            <DialogDescription>
              Rezervasyonlarda kullanılacak alış yeri türünü tanımlayın.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pickupTypeName">Alış Yeri Türü Adı <span className="text-red-500">*</span></Label>
              <Input
                id="pickupTypeName"
                name="name"
                value={newPickupType.name}
                onChange={handlePickupTypeChange}
                placeholder="Örn: Otel, Acenta, Havalimanı"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickupTypeDescription">Açıklama</Label>
              <Textarea
                id="pickupTypeDescription"
                name="description"
                value={newPickupType.description}
                onChange={handlePickupTypeChange}
                placeholder="Alış yeri türü açıklaması"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPickupTypeDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSavePickupType} className="bg-[#00a1c6] hover:bg-[#008bb3]">
              {isEditingPickupType ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ödeme Yöntemi Ekleme/Düzenleme Dialog */}
      <Dialog open={isPaymentMethodDialogOpen} onOpenChange={setIsPaymentMethodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingPaymentMethod ? "Ödeme Yapanı Düzenle" : "Yeni Ödeme Yapan Ekle"}</DialogTitle>
            <DialogDescription>
              Rezervasyonlarda kullanılacak ödeme yapan türünü tanımlayın.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethodName">Ödeme Yapan Adı <span className="text-red-500">*</span></Label>
              <Input
                id="paymentMethodName"
                name="name"
                value={newPaymentMethod.name}
                onChange={handlePaymentMethodChange}
                placeholder="Örn: Aracı, Müşteri, Otel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethodDescription">Açıklama</Label>
              <Textarea
                id="paymentMethodDescription"
                name="description"
                value={newPaymentMethod.description}
                onChange={handlePaymentMethodChange}
                placeholder="Ödeme yapan açıklaması"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentMethodDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSavePaymentMethod} className="bg-[#00a1c6] hover:bg-[#008bb3]">
              {isEditingPaymentMethod ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ödeme Durumu Ekleme/Düzenleme Dialog */}
      <Dialog open={isPaymentStatusDialogOpen} onOpenChange={setIsPaymentStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingPaymentStatus ? "Ödeme Durumunu Düzenle" : "Yeni Ödeme Durumu Ekle"}</DialogTitle>
            <DialogDescription>
              Rezervasyonlarda kullanılacak ödeme durumunu tanımlayın.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentStatusName">Ödeme Durumu Adı <span className="text-red-500">*</span></Label>
              <Input
                id="paymentStatusName"
                name="name"
                value={newPaymentStatus.name}
                onChange={handlePaymentStatusChange}
                placeholder="Örn: Ödendi, Bekliyor, İptal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentStatusColor">Renk</Label>
              <Input
                id="paymentStatusColor"
                name="color"
                type="color"
                value={newPaymentStatus.color}
                onChange={handlePaymentStatusChange}
                className="w-full h-10"
              />
              <p className="text-xs text-muted-foreground">
                Bu ödeme durumu için kullanılacak renk
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentStatusDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSavePaymentStatus} className="bg-[#00a1c6] hover:bg-[#008bb3]">
              {isEditingPaymentStatus ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
  )
}

