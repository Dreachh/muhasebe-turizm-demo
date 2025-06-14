"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Form verileri için localStorage anahtarları
const TOUR_SALES_FORM_KEY = "tourSalesFormState";
const TOUR_SALES_STEP_KEY = "tourSalesCurrentStep";
const TOUR_IN_PROGRESS_KEY = "tourSalesInProgress"; // Formun işlenmekte olduğunu belirtir
const TOUR_EDITING_RECORD_KEY = "tourSalesEditingRecord"; // Düzenleme kaydını saklar
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
import { Plus, Trash2, Save, ArrowRight, ArrowLeft, Check } from "lucide-react"
import { getExpenseTypes, getCompanies, getActivities, getDestinations, getReferralSources } from "@/lib/db"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { generateUUID } from "@/lib/utils";
import { fetchExchangeRates } from "@/lib/currency-service";
import TourSummary from "@/components/tour-summary";
import { createCustomerDebtsFromTour, createSupplierDebtsFromTour } from "@/lib/debt-service"; // Güncellenmiş import
import { useRouter } from 'next/navigation';

const currencyOptions = [
  { value: "TRY", label: "Türk Lirası (₺)" },
  { value: "USD", label: "Amerikan Doları ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "İngiliz Sterlini (£)" },
  { value: "SAR", label: "Suudi Arabistan Riyali (﷼)" },
];

// Tür tanımlamaları ekleniyor
interface Customer {
  id: string;
  name: string;
  phone: string;
  idNumber: string;
  email?: string;
  address?: string;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  currency: string;
  addToDebt?: boolean;
  category: string; // Zorunlu hale getirildi
  type: string; // Zorunlu hale getirildi
  details?: string;
  companyId?: string;
  companyName?: string; // Eklendi: Tedarikçi Adı
  expenseTypeId?: string;
  isIncludedInPrice?: boolean;
}

interface Activity {
  id: string;
  name: string;
  price: number;
  currency: string;
  addToDebt?: boolean;
  participants: number; // Zorunlu hale getirildi
  participantsType: string; // Zorunlu hale getirildi
  companyId?: string;
  companyName?: string; // Eklendi: Tedarikçi Adı
  details?: string;
  date: string; // Zorunlu hale getirildi
  duration: string; // Zorunlu hale getirildi
}

interface FormData {
  id: string;
  serialNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerIdNumber: string;
  nationality: string;
  referralSource?: string; // İsteğe bağlı olarak güncellendi
  additionalCustomers?: Customer[]; // İsteğe bağlı olarak güncellendi
  tourName: string;
  tourDate: string;
  tourEndDate: string;
  numberOfPeople: number;
  numberOfChildren: number;
  pricePerPerson: string;
  totalPrice: string;
  currency: string;
  paymentStatus: string;
  paymentMethod: string;
  partialPaymentAmount: string;
  partialPaymentCurrency: string;
  notes: string;
  expenses: Expense[];
  activities: Activity[];
  destinationId: string;
  destinationName: string; // Destinasyon adını da kaydetmek için eklendi
  selectedTourId?: string; // Seçilen tur şablonunun ID'sini kaydetmek için
  selectedTourName?: string; // Seçilen tur şablonunun adını kaydetmek için
  createdAt?: string; // Eksik olan createdAt alanı eklendi
  updatedAt?: string; // Eksik olan updatedAt alanı eklendi
}

export function TourSalesForm({
  ...props
}: {
  initialData?: any | null;
  onSave: (data: any) => void;
  onCancel: () => void;
  toursData: any[];
  onUpdateData: (data: any[]) => void;
  onNavigate?: (view: string) => void;
  editingRecord: any;
  setEditingRecord: (record: any) => void;
  customersData: any[];
  setCustomersData: (data: any[]) => void;
  tempTourFormData: any | null;
  setTempTourFormData: (data: any) => void;
}) {
  const {
    initialData = null,
    onSave,
    onCancel,
    toursData = [],
    onUpdateData,
    onNavigate,
    editingRecord,
    setEditingRecord,
    customersData = [],
    setCustomersData,
    tempTourFormData = null,
    setTempTourFormData,
  } = props;
  // Router ve toast hooks
  const router = useRouter();
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [expenseTypes, setExpenseTypes] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [referralSources, setReferralSources] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true)
  const [currencyRates, setCurrencyRates] = useState<any[]>([]);
  const [currencyLastUpdated, setCurrencyLastUpdated] = useState<string | null>(null)

  // Tur verilerini destinasyona göre filtrelemek için yeni durumlar ekleyelim
  const [destinationTours, setDestinationTours] = useState<any[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string>(() => {
    // İlk yüklemede kaydedilmiş tur şablonu ID'sini kullan
    if (initialData && initialData.selectedTourId) {
      return initialData.selectedTourId;
    }
    return "";
  });
  const [isLoadingTours, setIsLoadingTours] = useState<boolean>(false);

  // Adım göstergesi için referans
  const stepsRef = useRef<HTMLDivElement | null>(null)

  // Initialize form data from tempTourFormData, editingRecord, initialData or use empty form
  const [formData, setFormData] = useState<FormData>(() => {
    // Veri öncelik sırası kontrolü ve debug
    console.log("Tour-Sales-Form Initialize - Debug bilgisi:", {
      tempTourFormDataExists: !!tempTourFormData,
      editingRecordExists: !!editingRecord,
      initialDataExists: !!initialData,
      editingRecordId: editingRecord?.id,
      initialDataId: initialData?.id,
      isNewForm: !tempTourFormData && !editingRecord && !initialData
    });
    
    // Öncelik sırası: tempTourFormData > editingRecord > initialData > boş form
    // Eğer tempTourFormData mevcutsa ve "TOUR_IN_PROGRESS_KEY" localStorage'da "true" olarak işaretlenmişse kullan
    const inProgress = typeof localStorage !== 'undefined' ? localStorage.getItem(TOUR_IN_PROGRESS_KEY) : null;
    
    if (tempTourFormData && inProgress === "true") {
      console.log("Form tempTourFormData'dan yükleniyor (devam eden işlem)");
      return tempTourFormData as FormData;
    }
    
    // Düzenleme kaydı varsa, doğrudan onu kullan
    if (editingRecord) {
      console.log("Form editingRecord'dan yükleniyor:", editingRecord);
      
      // Düzenlenen kaydı işle
      const recordToEdit = { ...editingRecord };
      
      // Giderlerde addToDebt alanını kontrol et, yoksa ekle
      if (recordToEdit.expenses && Array.isArray(recordToEdit.expenses)) {
        recordToEdit.expenses = recordToEdit.expenses.map((expense: Expense) => ({
          ...expense,
          addToDebt: expense.addToDebt !== undefined ? expense.addToDebt : false
        }));
      }
      
      // Aktivitelerde addToDebt alanını kontrol et, yoksa ekle
      if (recordToEdit.activities && Array.isArray(recordToEdit.activities)) {
        recordToEdit.activities = recordToEdit.activities.map((activity: Activity) => ({
          ...activity,
          addToDebt: activity.addToDebt !== undefined ? activity.addToDebt : false
        }));
      }
      
      // Düzenleme modunda olduğumuzda direk ikinci adıma geçiş yap
      setTimeout(() => {
        if (currentStep === 0) {
          setCurrentStep(1);
          console.log("Adım 1'e geçildi - Düzenleme modu");
        }
      }, 100);
      
      return recordToEdit as FormData;
    }
    
    // initialData varsa, onu kullan
    if (initialData) {
      console.log("Form initialData'dan yükleniyor:", initialData);
      
      // initialData'yı işle
      const initialDataToUse = { ...initialData };
      
      // Giderlerde addToDebt alanını kontrol et, yoksa ekle
      if (initialDataToUse.expenses && Array.isArray(initialDataToUse.expenses)) {
        initialDataToUse.expenses = initialDataToUse.expenses.map((expense: Expense) => ({
          ...expense,
          addToDebt: expense.addToDebt !== undefined ? expense.addToDebt : false
        }));
      }
      
      // Aktivitelerde addToDebt alanını kontrol et, yoksa ekle
      if (initialDataToUse.activities && Array.isArray(initialDataToUse.activities)) {
        initialDataToUse.activities = initialDataToUse.activities.map((activity: Activity) => ({
          ...activity,
          addToDebt: activity.addToDebt !== undefined ? activity.addToDebt : false
        }));
      }
      
      return initialDataToUse as FormData;
    }
    
    console.log("Boş form oluşturuluyor");
    // Başlangıçta boş form ile başla

    return {
      id: generateUUID(),
      serialNumber: "",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "",
      customerIdNumber: "",
      nationality: "", // Müşterinin vatandaşlık/ülke bilgisi
      referralSource: "", // Müşterinin nereden geldiği/bulduğu bilgisi
      additionalCustomers: [],
      tourName: "",
      tourDate: new Date().toISOString().split("T")[0],
      tourEndDate: "",
      numberOfPeople: 1,
      numberOfChildren: 0,
      pricePerPerson: "",
      totalPrice: "",
      currency: "TRY",
      paymentStatus: "pending",
      paymentMethod: "cash",
      partialPaymentAmount: "",
      partialPaymentCurrency: "TRY",
      notes: "",
      expenses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activities: [],
      destinationId: "",
      destinationName: "", // Varsayılan boş destinasyon adı
      selectedTourId: "", // Seçilen tur ID'si için boş değer
      selectedTourName: "", // Seçilen tur adı için boş değer
    }
  })

  // Tur katılımcı sayısı değiştiğinde "all" seçili olan aktivitelerin katılımcı sayısını güncelle
  useEffect(() => {
    // Eğer aktiviteler yoksa işlem yapma
    if (!formData.activities || formData.activities.length === 0) return;
    
    // Toplam katılımcı sayısını al
    const totalParticipants = Number(formData.numberOfPeople) || 0;
    
    // "all" seçili tüm aktiviteleri güncelle
    const updatedActivities = formData.activities.map(activity => {
      if (activity.participantsType === "all") {
        return {
          ...activity,
          participants: String(totalParticipants)
        };
      }
      return activity;
    });
    
    // Eğer değişiklik varsa formu güncelle
    const hasChanges = updatedActivities.some((activity, index) => 
      activity.participants !== formData.activities[index].participants
    );
    
    if (hasChanges) {
      console.log("Tur katılımcı sayısı değişti, 'all' seçili aktiviteler güncelleniyor:", totalParticipants);
      // Timeout kullanmadan direkt güncelleme yaparak katılımcı sayısı güncellenmelerini garantiye al
      setFormData(prev => ({
        ...prev,
        activities: updatedActivities
      }));
    }
  }, [formData.numberOfPeople]);

  // Toplam fiyatı otomatik güncelle (kişi başı fiyat * kişi sayısı + aktiviteler)
  useEffect(() => {
    // Önce kişi başı fiyat * kişi sayısı hesaplanır
    const basePrice = Number(formData.pricePerPerson || 0) * Number(formData.numberOfPeople || 1);
    
    // Aktivite toplamını hesapla (sadece aynı para biriminde olanlar)
    const activitiesTotal = calculateTotalActivitiesPrice();
    
    // Tur toplam fiyatı = kişi başı fiyat * kişi sayısı + aktiviteler toplamı
    const total = basePrice + activitiesTotal;
    
    console.log(`Tur fiyatı hesaplanıyor: Temel fiyat=${basePrice}, Aktiviteler=${activitiesTotal}, Toplam=${total} ${formData.currency}`);
    
    setFormData((prev) => ({ 
      ...prev, 
      totalPrice: total ? total.toString() : "" 
    }));
  }, [formData.pricePerPerson, formData.numberOfPeople, formData.activities, formData.currency]);

  // Aktivitelerin toplam fiyatını hesapla (para birimi ayrımı yaparak hesapla)
  const calculateTotalActivitiesPrice = () => {
    if (!formData.activities || formData.activities.length === 0) return 0;

    // Sadece ana tur para birimi ile aynı olan aktiviteleri hesapla
    return formData.activities.reduce((sum, activity) => {
      if (activity.currency === formData.currency) {
        const price = Number(activity.price) || 0;
        let participants;
        
        // Katılımcı sayısını hesapla: "all" seçiliyse turda belirtilen toplam kişi sayısını kullan
        if (activity.participantsType === "all") {
          // Her zaman formData.numberOfPeople değerini kullan, activity.participants değerini kullanma
          participants = Number(formData.numberOfPeople) || 0;
          console.log(`Aktivite ${activity.name} için "Tüm tur katılımcıları" seçildi:`, {
            katılımcıSayısı: participants,
            turKatılımcıSayısı: formData.numberOfPeople
          });
        } else {
          participants = Number(activity.participants) || 0;
          console.log(`Aktivite ${activity.name} için özel katılımcı sayısı:`, participants);
        }
        
        const activityTotal = price * (participants > 0 ? participants : 0);
        console.log(`Aktivite ${activity.name} toplam tutarı: ${price} x ${participants} = ${activityTotal} ${activity.currency}`);
        
        return sum + activityTotal;
      }
      return sum;
    }, 0);
  };

  // Adım geçiş fonksiyonları
  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  // Kayıt işlemi fonksiyonu
  async function handleSubmit() {
    if (typeof onSave === "function") {
      let customerDebtsCreated = false;
      let supplierDebtsCreated = false;

      // ÖNEMLİ: Firma bilgilerini gider ve aktiviteler için daha ayrıntılı düzenle
      const formDataWithCompanyNames = {
        ...formData,
        expenses: (formData.expenses || []).map(expense => {
          // Eğer companyId var ama companyName yoksa veya boşsa, firmayı bul ve adını ekle
          if (expense.companyId && (!expense.companyName || expense.companyName.trim() === "")) {
            const company = companies.find(c => c.id === expense.companyId);
            if (company) {
              console.log(`Gider için firma adı ekleniyor: ${company.name} (ID: ${expense.companyId})`);
              return {
                ...expense,
                companyName: company.name
              };
            } else {
              console.warn(`Dikkat: ${expense.companyId} ID'li firma bulunamadı. Gider adı: ${expense.name}`);
            }
          }
          
          // Tutarı sayısal formatta doğru dönüştürülmesini sağla
          if (typeof expense.amount === 'string') {
            expense.amount = parseFloat(expense.amount);
            if (isNaN(expense.amount)) {
              expense.amount = 0;
              console.warn(`Hatalı gider tutarı: ${expense.name} - 0 olarak ayarlandı`);
            }
          }
          
          return expense;
        }),
        activities: (formData.activities || []).map(activity => {
          // Eğer companyId var ama companyName yoksa veya boşsa, firmayı bul ve adını ekle
          if (activity.companyId && (!activity.companyName || activity.companyName.trim() === "")) {
            const company = companies.find(c => c.id === activity.companyId);
            if (company) {
              console.log(`Aktivite için firma adı ekleniyor: ${company.name} (ID: ${activity.companyId})`);
              return {
                ...activity,
                companyName: company.name
              };
            } else {
              console.warn(`Dikkat: ${activity.companyId} ID'li firma bulunamadı. Aktivite adı: ${activity.name}`);
            }
          }
          
          // Fiyatı sayısal formatta doğru dönüştürülmesini sağla
          if (typeof activity.price === 'string') {
            activity.price = parseFloat(activity.price);
            if (isNaN(activity.price)) {
              activity.price = 0;
              console.warn(`Hatalı aktivite fiyatı: ${activity.name} - 0 olarak ayarlandı`);
            }
          }
          
          return activity;
        })
      };

      // Tedarikçi borç kontrolü öncesi borç oluşturulacak öğeleri logla
      const supplierDebtExpenses = formDataWithCompanyNames.expenses.filter(e => e.addToDebt && e.companyId);
      const supplierDebtActivities = formDataWithCompanyNames.activities.filter(a => a.addToDebt && a.companyId);
      
      console.log("Borç oluşturma öncesi tedarikçi borç oluşturacak öğeler:", {
        expenses: supplierDebtExpenses.length > 0 ? supplierDebtExpenses.map(e => ({
          name: e.name,
          companyId: e.companyId,
          companyName: e.companyName,
          amount: e.amount,
          currency: e.currency
        })) : "Yok",
        activities: supplierDebtActivities.length > 0 ? supplierDebtActivities.map(a => ({
          name: a.name,
          companyId: a.companyId,
          companyName: a.companyName,
          price: a.price,
          currency: a.currency
        })) : "Yok" 
      });

      try {
        // Müşteri borçlarını oluştur (sadece companyId olmayanlar için)
        const customerDebtResults = await createCustomerDebtsFromTour(formDataWithCompanyNames);
        if (customerDebtResults && customerDebtResults.length > 0) {
          customerDebtsCreated = true;
          console.log("Müşteri borçları başarıyla oluşturuldu:", customerDebtResults);
          toast({
            title: "Müşteri Borçları Eklendi",
            description: "İşaretlenen müşteri gider ve aktiviteleri borca eklendi.",
            variant: "default"
          });
        }
      } catch (error) {
        console.error("Müşteri borçları oluşturulurken hata:", error);
        toast({
          title: "Hata",
          description: "Müşteri borçları oluşturulurken bir sorun oluştu.",
          variant: "destructive"
        });
      }

      try {
        // Tedarikçi borçlarını oluştur (sadece companyId olanlar için)
        const supplierDebtResults = await createSupplierDebtsFromTour(formDataWithCompanyNames);
        if (supplierDebtResults && supplierDebtResults.length > 0) {
          supplierDebtsCreated = true;
          console.log("Tedarikçi borçları başarıyla oluşturuldu:", supplierDebtResults);
          toast({
            title: "Tedarikçi Borçları Eklendi",
            description: "İşaretlenen tedarikçi gider ve aktiviteleri borca eklendi.",
            variant: "default"
          });
        } else {
          console.log("Hiç tedarikçi borcu oluşturulmadı. Tedarikçi borç işaretli öğe sayısı:", 
            supplierDebtExpenses.length + supplierDebtActivities.length);
        }
      } catch (error) {
        console.error("Tedarikçi borçları oluşturulurken hata:", error);
        toast({
          title: "Hata",
          description: "Tedarikçi borçları oluşturulurken bir sorun oluştu.",
          variant: "destructive"
        });
      }
      
      // Güncel verileri kullanarak form kaydet
      onSave(formDataWithCompanyNames);
      setIsConfirmDialogOpen(false);
      
      try {
        // Form durumunu temizle
        localStorage.removeItem(TOUR_SALES_FORM_KEY);
        localStorage.removeItem(TOUR_SALES_STEP_KEY);
        localStorage.removeItem(TOUR_IN_PROGRESS_KEY);
        localStorage.removeItem(TOUR_EDITING_RECORD_KEY);
        
        // tempTourFormData'yı da temizle
        if (setTempTourFormData) {
          setTempTourFormData(null);
        }
        
        // editingRecord'u da temizle
        setEditingRecord(null);
        
        console.log("Form durumu başarıyla temizlendi, işlem tamamlandı", { formId: formData.id });
        
        toast({ 
          title: initialData ? "Kaydedildi" : "Yeni Kayıt Eklendi", 
          description: initialData 
            ? "Tur kaydı başarıyla güncellendi." 
            : "Yeni tur kaydı başarıyla oluşturuldu.", 
          variant: "default" 
        });
      } catch (error) {
        console.error("Form durumu temizlenirken hata:", error);
        toast({ 
          title: "Uyarı", 
          description: "Form kaydedildi ancak önbellek temizlenirken bir sorun oluştu.", 
          variant: "default" 
        });
      }
      
      // Her durumda form verilerini sıfırla - yeni bir boş form oluştur
      const resetForm = {
        id: generateUUID(),
        serialNumber: "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        customerAddress: "",
        customerIdNumber: "",
        nationality: "",
        referralSource: "",
        additionalCustomers: [],
        tourName: "",
        tourDate: new Date().toISOString().split("T")[0],
        tourEndDate: "",
        numberOfPeople: 1,
        numberOfChildren: 0,
        pricePerPerson: "",
        totalPrice: "",
        currency: "TRY",
        paymentStatus: "pending",
        paymentMethod: "cash",
        partialPaymentAmount: "",
        partialPaymentCurrency: "TRY",
        notes: "",
        expenses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activities: [],
        destinationId: "",
        destinationName: "",
        selectedTourId: "",
        selectedTourName: "",
      };
      
      // Form verilerini sıfırla ve ilk adıma dön
      setFormData(resetForm);
      setCurrentStep(0);
      
      console.log("Form başarıyla sıfırlandı, yeni boş form oluşturuldu");
      
      // İşlem tamamlandı mesajı
      if (initialData) {
        toast({ 
          title: "Başarılı", 
          description: "Tur kaydı başarıyla güncellendi!", 
          variant: "default" 
        });
      }
      
      // Ana sayfaya yönlendirme
      if (typeof onCancel === "function") {
        setTimeout(() => {
          console.log("İşlem sonrası ana sayfaya dönülüyor...");
          onCancel(); 
        }, 500); 
      }
    } else {
      toast({ title: "Hata", description: "Kayıt fonksiyonu tanımlı değil!", variant: "destructive" });
    }
  }

  // Adım değiştiğinde sayfayı yukarı kaydır
  useEffect(() => {
    if (stepsRef.current) {
      stepsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentStep]);

  // Döviz kurlarını yükle
  useEffect(() => {
    async function loadRates() {
      try {
        const { rates, lastUpdated } = await fetchExchangeRates();
        setCurrencyRates(rates);
        setCurrencyLastUpdated(lastUpdated);
      } catch (error) {
        setCurrencyRates([]);
        setCurrencyLastUpdated(null);
      }
    }
    loadRates();
  }, []);

  // editingRecord veya initialData değişikliklerini izle
  useEffect(() => {
    // Düzenleme modunda mı kontrol et (editingRecord veya initialData)
    const editData = editingRecord || initialData;
    
    console.log("TUR DÜZENLEME KONTROLÜ:", { 
      editingRecordVar: editingRecord ? "VAR" : "YOK", 
      initialDataVar: initialData ? "VAR" : "YOK",
      step: currentStep 
    });
    
    if (editData) {
      console.log("Tour edit data received:", editData);
      console.log("Düzenlenecek tur ID:", editData.id);
      
      // Düzenlenecek tur verilerini forma yükle - bu referansını değiştirerek
      // effect'in her seferinde çalışmasını önlüyoruz
      let updatedFormData = {
        // Önce varsayılan boş değerleri belirle
        id: generateUUID(),
        tourDate: new Date().toISOString().split("T")[0],
        tourEndDate: "",
        serialNumber: "",
        tourName: "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        customerAddress: "",
        customerIdNumber: "",
        nationality: "", // Vatandaşlık/ülke bilgisi
        referralSource: "", 
        additionalCustomers: [],
        numberOfPeople: 1,
        numberOfChildren: 0,
        pricePerPerson: "",
        totalPrice: "",
        currency: "TRY",
        paymentStatus: "pending",
        paymentMethod: "cash",
        partialPaymentAmount: "",
        partialPaymentCurrency: "TRY",
        notes: "",
        expenses: [],
        activities: [],
        destinationId: "",
        destinationName: "",
        selectedTourId: "",
        selectedTourName: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        
        // Sonra editData içindeki tüm değerleri üzerine yaz
        ...editData
      };
      
      // Eğer destinationId var ama destinationName yoksa ve destinasyonlar yüklendiyse adını bul ve ekle
      if (updatedFormData.destinationId && !updatedFormData.destinationName && destinations && destinations.length > 0) {
        const selectedDestination = destinations.find((d: any) => d.id === updatedFormData.destinationId);
        if (selectedDestination) {
          updatedFormData.destinationName = selectedDestination.name;
        }
      }
      
      console.log("Form loaded with edit data:", updatedFormData);
      
      // Form verilerini güncelle
      console.log("Form verileri güncelleniyor. Eski veriler:", formData);
      console.log("Yeni veriler:", updatedFormData);
      
      // Tüm gerekli alanlar dolu mu kontrol et
      const hasRequiredFields = updatedFormData.customerName && 
                                updatedFormData.tourName && 
                                updatedFormData.tourDate;
      
      console.log("Gerekli alanlar dolu mu:", hasRequiredFields);
      
      // Eğer tüm gerekli alanlar doluysa formu güncelle
      if (hasRequiredFields) {
        console.log("Tüm gerekli alanlar dolu, form güncelleniyor");
        setFormData(updatedFormData);
        
        // Düzenleme modunda olduğumuzda direk ikinci adıma geçiş yapabilir
        // Böylece kullanıcı tüm bilgileri görebilir
        if (currentStep === 0) {
          console.log("Adım 0'dan 1'e geçiliyor");
          setTimeout(() => {
            setCurrentStep(1);
            console.log("Moved to step 1 (editing mode)");
          }, 100); // Kısa bir gecikme ekleyerek state güncellemelerinin doğru sırayla işlenmesini sağlayalım
        }
      } else {
        console.log("UYARI: Gerekli alanlar dolu değil!");
      }
    }
  }, [initialData, editingRecord, destinations]);

  // Gider türlerini, firmaları, aktiviteleri ve destinasyonları yükle
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true); // Yükleme başladığında yükleme durumunu güncelle
      
      try {
        console.log('Veri yükleme başlıyor...');

        // Veritabanından veri yüklemek için bir fonksiyon tanımlayalım
        const fetchFromDatabase = async (
          fetchFunction: () => Promise<any[]>,
          name: string,
          fallbackStorageKey: string
        ) => {
          try {
            // Önce API'den yüklemeyi dene
            console.log(`${name} veritabanından yükleniyor...`);
            const result = await fetchFunction();
            
            if (result && Array.isArray(result) && result.length > 0) {
              console.log(`${name} veritabanından başarıyla yüklendi:`, result.length, 'adet veri');
              
              // Başarılı sonuçları önbelleğe kaydet
              try {
                // Şirketler için, zaten "deleted" olmayan şirketler geliyor, dolayısıyla filtrelemeye gerek yok
                localStorage.setItem(fallbackStorageKey, JSON.stringify(result));
                console.log(`${name} önbelleğe kaydedildi`);
              } catch (storageError) {
                console.warn(`${name} önbelleğe kaydedilemedi:`, storageError);
              }
              
              return result;
            } else {
              throw new Error(`${name} verisi bulunamadı veya boş`);
            }
          } catch (apiError) {
            console.warn(`${name} veritabanından yüklenirken hata:`, apiError);
            
            // Hata durumunda önbellekten yüklemeyi dene
            try {
              const cachedData = localStorage.getItem(fallbackStorageKey);
              if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
                  console.log(`${name} önbellekten yüklendi:`, parsedData.length, 'adet veri');
                  return parsedData;
                }
              }
            } catch (cacheError) {
              console.warn(`${name} önbellekten yüklenemedi:`, cacheError);
            }
            
            // Referans kaynakları için varsayılan değerler
            if (name === 'Referans Kaynakları') {
              const defaultSources = [
                { id: "website", name: "İnternet Sitemiz", type: "online" },
                { id: "hotel", name: "Otel Yönlendirmesi", type: "partner" },
                { id: "local_guide", name: "Hanutçu / Yerel Rehber", type: "partner" },
                { id: "walk_in", name: "Kapı Önü Müşterisi", type: "direct" },
                { id: "repeat", name: "Tekrar Gelen Müşteri", type: "direct" },
                { id: "recommendation", name: "Tavsiye", type: "referral" },
                { id: "social_media", name: "Sosyal Medya", type: "online" },
                { id: "other", name: "Diğer", type: "other" }
              ];
              return defaultSources;
            }
            
            // Diğer durumlar için boş dizi döndür
            return [];
          }
        };

        // Verileri paralel olarak getir
        try {
          console.log('Tüm veriler yükleniyor...');
          
          const [types, companiesData, activitiesData, destinationsData, referralSourcesData] = await Promise.all([
            fetchFromDatabase(getExpenseTypes, 'Gider türleri', 'expenseTypes'),
            fetchFromDatabase(getCompanies, 'Firmalar', 'companies'),
            fetchFromDatabase(getActivities, 'Aktiviteler', 'activities'),
            fetchFromDatabase(getDestinations, 'Destinasyonlar', 'destinations'),
            fetchFromDatabase(getReferralSources, 'Referans Kaynakları', 'referralSources')
          ]);
          
          console.log('Yüklenen veriler:', {
            'Gider türleri': types?.length || 0,
            'Firmalar': companiesData?.length || 0,
            'Aktiviteler': activitiesData?.length || 0,
            'Destinasyonlar': destinationsData?.length || 0,
            'Referans Kaynakları': referralSourcesData?.length || 0
          });

          // Verileri state'e kaydet
          setExpenseTypes(Array.isArray(types) ? types : []);
          setCompanies(Array.isArray(companiesData) ? companiesData : []);
          setActivities(Array.isArray(activitiesData) ? activitiesData : []);
          setDestinations(Array.isArray(destinationsData) ? destinationsData : []);
          setReferralSources(Array.isArray(referralSourcesData) ? referralSourcesData : []);

        } catch (error) {
          console.error('Veri yükleme sırasında hata:', error);
          toast({
            title: "Uyarı",
            description: "Veriler yüklenirken sorun oluştu. Lütfen internet bağlantınızı kontrol edin.",
            variant: "destructive",
          });
        }

        // Gider kategorilerini oluştur
        const categories = [
          { value: "accommodation", label: "Konaklama" },
          { value: "transportation", label: "Ulaşım" },
          { value: "transfer", label: "Transfer" },
          { value: "guide", label: "Rehberlik" },
          { value: "agency", label: "Acente" },
          { value: "porter", label: "Hanutçu" },
          { value: "food", label: "Yemek" },
          { value: "activity", label: "Aktivite" },
          { value: "general", label: "Genel" },
          { value: "other", label: "Diğer" },
        ];
        setExpenseCategories(categories);
      } catch (error) {
        console.error("Veri yükleme işlemi sırasında beklenmeyen hata:", error);
      } finally {
        setIsLoading(false); // Yükleme işlemi tamamlandı
      }
    };

    loadData();
  }, [toast])

  // Aktivite sayfasında firmaların yüklenmesini ve görüntülenmesini sağlamak için geliştirme
  useEffect(() => {
    // Firma ve diğer verileri en başta önbellekten yükle
    const loadInitialCachedCompanies = () => {
      try {
        // companies verisini localStorage'dan yükle
        const cachedCompanies = localStorage.getItem('companies');
        if (cachedCompanies) {
          const parsedCompanies = JSON.parse(cachedCompanies);
          if (Array.isArray(parsedCompanies) && parsedCompanies.length > 0) {
            // "deleted" olarak işaretlenmemiş firmaları filtrele
            const filteredCompanies = parsedCompanies.filter(company => company.type !== "deleted");
            console.log("Firmalar önbellekten yüklendi:", parsedCompanies.length, "adet, filtre sonrası:", filteredCompanies.length, "adet");
            setCompanies(filteredCompanies);
          } else {
            console.log("Önbellekte firma verisi bulunamadı veya boş dizi");
            loadDefaultCompanies();
          }
        } else {
          console.log("Önbellekte companies anahtarı bulunamadı");
          loadDefaultCompanies();
        }
      } catch (error) {
        console.error("Önbellekten firma yükleme hatası:", error);
        loadDefaultCompanies();
      }
    };

    // Varsayılan firmaları yükle (önbellekte veri yoksa)
    const loadDefaultCompanies = () => {
      const defaultCompanies = [
        { id: "company-1", name: "Tura Tur", contactPerson: "Ahmet Yılmaz", category: "tur_operatörü" },
        { id: "company-2", name: "Grand Otel", contactPerson: "Ayşe Kaya", category: "konaklama" },
        { id: "company-3", name: "Akdeniz Transfer", contactPerson: "Mehmet Demir", category: "ulaşım" }
      ];
      console.log("Varsayılan firmalar yükleniyor:", defaultCompanies.length, "adet");
      setCompanies(defaultCompanies);
      
      try {
        localStorage.setItem('companies', JSON.stringify(defaultCompanies));
        console.log("Varsayılan firmalar önbelleğe kaydedildi");
      } catch (error) {
        console.error("Varsayılan firmalar önbelleğe kaydedilemedi:", error);
      }
    };

    loadInitialCachedCompanies();
  }, []);

  // Debug: Firma verisini konsola yazdır
  useEffect(() => {
    console.log("Güncel companies durumu:", companies);
  }, [companies]);

  // Aktivitelerde kullanılan firmaların güncel durumunu konsola yazdır
  useEffect(() => {
    if (currentStep === 3 && formData.activities && formData.activities.length > 0) {
      console.log("Aktivite adımında, mevcut aktiviteler:", formData.activities);
      console.log("Aktivite adımında, mevcut firmalar:", companies);
    }
  }, [currentStep, formData.activities, companies]);

  // Destinasyon değiştiğinde turları getirmek için useEffect
  useEffect(() => {
    const loadToursForDestination = async () => {
      if (formData.destinationId) {
        setIsLoadingTours(true);
        try {
          // İlgili destinasyona ait turları yükle
          const { getTourTemplatesByDestination } = await import('@/lib/db-firebase');
          const tours = await getTourTemplatesByDestination(formData.destinationId);
          console.log(`${formData.destinationId} destinasyonuna ait ${tours.length} tur şablonu yüklendi.`);
          console.log("Yüklenen tur şablonları:", tours);
          setDestinationTours(tours);
          
          // Turlar yüklendiğinde, eğer formData'da selectedTourId varsa
          // ve bu ID'ye sahip bir tur varsa, o turu tekrar seç
          if (formData.selectedTourId && tours.some(tour => tour.id === formData.selectedTourId)) {
            setSelectedTourId(formData.selectedTourId);
            
            // Seçili tur adını her zaman güncelle - formData'daki selectedTourName boşsa veya
            // veriden gelen selectedTourName'i tercih et
            const selectedTour = tours.find(tour => tour.id === formData.selectedTourId);
            if (selectedTour) {
              const tourName = selectedTour.name || selectedTour.tourName || "Adı tanımlanmamış tur";
              console.log(`Seçili tur adı güncellendi: ${tourName}`);
              
              setFormData(prev => ({
                ...prev,
                selectedTourName: tourName
              }));
            }
          }
        } catch (error) {
          console.error(`Destinasyon turları yüklenirken hata:`, error);
          setDestinationTours([]);
        } finally {
          setIsLoadingTours(false);
        }
      } else {
        setDestinationTours([]);
        setSelectedTourId("");
      }
    };

    loadToursForDestination();
  }, [formData.destinationId, formData.selectedTourId]);

  // Adımları tanımla (tüm useEffect'lerden önce tanımlanmalı)
  const steps = [
    { id: "customer", label: "Müşteri Bilgileri" },
    { id: "tour", label: "Tur Detayları" },
    { id: "expenses", label: "Tur Giderleri" },
    { id: "activities", label: "Tur Aktiviteleri" },
    { id: "payment", label: "Ödeme Bilgileri" },
    { id: "summary", label: "Özet" },
  ];

  // Formun durumunu ve adımını localStorage'da saklamak için anahtarlar
    // Form durumu değiştiğinde localStorage'a kaydet
  useEffect(() => {
    // localStorage olmadığında kaydetme
    if (typeof localStorage === 'undefined') {
      return;
    }

    // Form durumunu ve mevcut adımı localStorage'a kaydet
    try {
      // En az bir önemli alan doldurulmuşsa kaydet (boş formu kaydetmemek için)
      const hasImportantData = formData.customerName || formData.tourName || formData.destinationId ||
                            (Array.isArray(formData.activities) && formData.activities.length > 0) ||
                            (Array.isArray(formData.expenses) && formData.expenses.length > 0);
                            
      if (!hasImportantData) {
        console.log("Form boş, kaydetme işlemi atlanıyor");
        return;
      }
      
      // Form verisinin çok büyük olup olmadığını kontrol et
      const formDataString = JSON.stringify(formData);
      const formDataSize = new Blob([formDataString]).size;
      
      if (formDataSize > 4.5 * 1024 * 1024) { // ~5MB'a yaklaşıyor mu kontrol et (localStorage limit ~5MB)
        console.warn("Form verisi çok büyük olabilir:", formDataSize / (1024 * 1024), "MB");
      }
      
      localStorage.setItem(TOUR_SALES_FORM_KEY, formDataString);
      localStorage.setItem(TOUR_SALES_STEP_KEY, currentStep.toString());
      localStorage.setItem(TOUR_IN_PROGRESS_KEY, "true"); // Form işlenmekte olduğunu işaretle
      
      // Düzenleme durumunu da kaydet
      if (editingRecord) {
        localStorage.setItem(TOUR_EDITING_RECORD_KEY, JSON.stringify(editingRecord));
      }
      
      console.log("Form durumu localStorage'a kaydedildi", { 
        sizeKB: Math.round(formDataSize / 1024),
        step: currentStep,
        hasData: hasImportantData,
        isEditing: !!editingRecord
      });
      
      // tempTourFormData'yi de güncelle
      if (setTempTourFormData) {
        setTempTourFormData(formData);
      }
    } catch (error) {
      console.error("Form durumu kaydedilirken hata:", error);
      
      // Storage hatası yaşandığında kullanıcıya bildir
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        toast({
          title: "Depolama Alanı Yetersiz",
          description: "Form verisi çok büyük. Lütfen formu tamamlayıp kaydedin veya bazı alanları temizleyin.",
          variant: "destructive"
        });
      }
    }
  }, [formData, currentStep, initialData, toast, setTempTourFormData]);

  // Component mount olduğunda (oluşturulduğunda) localStorage'dan form durumunu ve adımı geri yükle
  useEffect(() => {
    // localStorage olmadığında hataları önle
    if (typeof localStorage === 'undefined') {
      console.warn("localStorage kullanılamıyor!");
      return;
    }

    try {
      // Eğer düzenleme modu (initialData) varsa, localStorage'dan yükleme yapmaz
      if (initialData) {
        console.log("Düzenleme modu, localStorage'dan yükleme yapılmıyor");
        return;
      }
      
      // Eğer tempTourFormData varsa, onu kullan ancak adımı localStorage'dan getir
      if (tempTourFormData) {
        console.log("tempTourFormData kullanılıyor:", tempTourFormData);
        // Adımı localStorage'dan kontrol et
        const savedStep = localStorage.getItem(TOUR_SALES_STEP_KEY);
        if (savedStep) {
          const parsedStep = parseInt(savedStep, 10);
          if (!isNaN(parsedStep) && parsedStep >= 0 && parsedStep < steps.length) {
            setCurrentStep(parsedStep);
            console.log("Adım durumu localStorage'dan yüklendi:", parsedStep);
          }
        }
        return;
      }

      // Form durumunu localStorage'dan yükle
      const inProgress = localStorage.getItem(TOUR_IN_PROGRESS_KEY);
      const savedFormData = localStorage.getItem(TOUR_SALES_FORM_KEY);
      const savedStep = localStorage.getItem(TOUR_SALES_STEP_KEY);
      const savedEditingRecord = localStorage.getItem(TOUR_EDITING_RECORD_KEY);
      
      // Eğer form işleme durumu yoksa veya form verisi yoksa, temizle ve çık
      if (inProgress !== "true" || !savedFormData) {
        console.log("Form işlenmekte değil veya kayıtlı form verisi yok, localStorage temizleniyor");
        localStorage.removeItem(TOUR_SALES_FORM_KEY);
        localStorage.removeItem(TOUR_SALES_STEP_KEY);
        localStorage.removeItem(TOUR_IN_PROGRESS_KEY);
        localStorage.removeItem(TOUR_EDITING_RECORD_KEY);
        return;
      }
      
      // Form verilerini yüklemeden önce, mevcut form verileri için bir kontrol yapalım
      // Eğer mevcut form verilerinde önemli bilgiler zaten doldurulduysa, kullanıcıya seçenek sunalım
      const hasFilledFormData = formData && (
        formData.customerName || 
        formData.tourName || 
        (Array.isArray(formData.activities) && formData.activities.length > 0) ||
        (Array.isArray(formData.expenses) && formData.expenses.length > 0)
      );
      
      if (hasFilledFormData) {
        // Mevcut formda veri var, localStorage'dan yükleme yapmadan önce kullanıcıya soralım
        console.log("Mevcut formda veri var, localStorage'dan yükleme yapılmıyor");
        
        // Toast mesajı ile bilgilendir
        toast({
          title: "Form Zaten Dolu",
          description: "Yeni bir form başlatmak için önce mevcut formu kaydedin veya iptal edin.",
          variant: "default"
        });
        return;
      }
      
      // Form işleniyor durumdaysa, localStorage'dan verileri yükle
      console.log("Form işleniyor, localStorage'dan veriler yükleniyor");
      
      // Form verilerini yükle
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          setFormData(parsedData);
          console.log("Form durumu localStorage'dan yüklendi", { formId: parsedData.id });
          
          // Form sürecinin devam ettiğini işaretle
          localStorage.setItem(TOUR_IN_PROGRESS_KEY, "true");
          
          // Kullanıcıya bilgilendirme mesajı göster
          toast({
            title: "Form Devam Ediyor",
            description: "Kaldığınız yerden devam edebilirsiniz.",
            variant: "default"
          });
        } catch (parseError) {
          console.error("Form verileri ayrıştırılırken hata:", parseError);
          localStorage.removeItem(TOUR_SALES_FORM_KEY);
        }
      }
      
      // Düzenleme kaydını geri yükle
      if (savedEditingRecord) {
        try {
          const parsedEditingRecord = JSON.parse(savedEditingRecord);
          setEditingRecord(parsedEditingRecord);
          console.log("Düzenleme kaydı localStorage'dan yüklendi", { recordId: parsedEditingRecord.id });
        } catch (parseError) {
          console.error("Düzenleme kaydı ayrıştırılırken hata:", parseError);
          localStorage.removeItem(TOUR_EDITING_RECORD_KEY);
        }
      }
      
      // Adım bilgisini yükle
      if (savedStep) {
        const parsedStep = parseInt(savedStep, 10);
        if (!isNaN(parsedStep) && parsedStep >= 0 && parsedStep < steps.length) {
          setCurrentStep(parsedStep);
          console.log("Adım durumu localStorage'dan yüklendi:", parsedStep);
        } else {
          console.warn("Geçersiz adım bilgisi:", savedStep);
        }
      }
    } catch (error) {
      console.error("Form durumu yüklenirken hata:", error);
    }
  }, [initialData, tempTourFormData, steps.length, toast]);

  // İptal butonuna basıldığında form durumunu sıfırla ve localStorage'ı temizle
  const handleCancel = () => {
    try {
      // LocalStorage'dan form verilerini temizle
      localStorage.removeItem(TOUR_SALES_FORM_KEY);
      localStorage.removeItem(TOUR_SALES_STEP_KEY);
      localStorage.removeItem(TOUR_IN_PROGRESS_KEY);
      localStorage.removeItem(TOUR_EDITING_RECORD_KEY);
      
      // tempTourFormData'yı da temizle
      if (setTempTourFormData) {
        setTempTourFormData(null);
      }
      
      // editingRecord'u da temizle
      setEditingRecord(null);
      
      // Form durumunu sıfırla - yeni boş form oluştur
      setFormData({
        id: generateUUID(),
        serialNumber: "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        customerAddress: "",
        customerIdNumber: "",
        nationality: "",
        referralSource: "",
        additionalCustomers: [],
        tourName: "",
        tourDate: new Date().toISOString().split("T")[0],
        tourEndDate: "",
        numberOfPeople: 1,
        numberOfChildren: 0,
        pricePerPerson: "",
        totalPrice: "",
        currency: "TRY",
        paymentStatus: "pending",
        paymentMethod: "cash",
        partialPaymentAmount: "",
        partialPaymentCurrency: "TRY",
        notes: "",
        expenses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activities: [],
        destinationId: "",
        destinationName: "",
        selectedTourId: "",
        selectedTourName: "",
      });
      setCurrentStep(0);
      
      console.log("Form durumu temizlendi, iptal edildi ve yeni boş form oluşturuldu");
    } catch (error) {
      console.error("Form durumu temizlenirken hata:", error);
    }
    
    // İptal fonksiyonunu çağır (ana menüye dönüş)
    if (onCancel) {
      onCancel();
    }
  };

  // handleChange fonksiyonu düzeltildi
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => {
      let updated = { ...prev, [name]: value };
      if (name === "pricePerPerson") {
        const totalPrice = Number.parseFloat(value) * Number.parseInt(prev.numberOfPeople?.toString() || "1");
        updated.totalPrice = totalPrice.toString();
      }
      if (name === "numberOfPeople" && prev.pricePerPerson) {
        const totalPrice = Number.parseFloat(prev.pricePerPerson?.toString() || "0") * Number.parseInt(value);
        updated.totalPrice = totalPrice.toString();
      }
      return updated;
    });
  };

  const handleSaveCustomerEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    // E-posta değerini doğrudan formData'ya kaydet, hiçbir düzenleme yapmadan
    setFormData((prev: any) => ({
      ...prev,
      customerEmail: value
    }));
    console.log("E-posta kaydediliyor:", value);
  };

  // Destinasyon seçildiğinde, adı da otomatik olarak kaydedilsin
  const handleSelectChange = (name: string, value: any) => {
    setFormData((prev: any) => {
      // Eğer destinationId değişiyorsa, destinationName'i de güncelle
      if (name === "destinationId") {
        const selectedDestination = destinations.find((d: any) => d.id === value);
        return { 
          ...prev, 
          [name]: value,
          destinationName: selectedDestination ? selectedDestination.name : ""
        };
      }
      return { ...prev, [name]: value };
    });
  };

  // Ek müşteri ekleme
  const addAdditionalCustomer = () => {
    const newCustomer = {
      id: generateUUID(),
      name: "",
      phone: "",
      idNumber: "",
      email: "", // Yeni eklenen alan
      address: "", // Yeni eklenen alan
      destinationName: formData.destinationId ? destinations.find((d: any) => d.id === formData.destinationId)?.name : "",
    }

    setFormData((prev: any) => ({
      ...prev,
      additionalCustomers: [...(prev.additionalCustomers || []), newCustomer],
    }))
  }

  // Ek müşteri silme
  const removeAdditionalCustomer = (id: string) => {
    setFormData((prev: any) => ({
      ...prev,
      additionalCustomers: (prev.additionalCustomers || []).filter((customer: any) => customer.id !== id),
    }))
  }

  // Ek müşteri güncelleme
  const updateAdditionalCustomer = (id: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      additionalCustomers: (prev.additionalCustomers || []).map((customer: any) => {
        if (customer.id === id) {
          const updatedCustomer = { ...customer, [field]: value };
          if (field === 'destinationId') {
            const destination = destinations.find((d: any) => d.id === value);
            updatedCustomer.destinationName = destination ? destination.name : '';
          }
          return updatedCustomer;
        }
        return customer;
      }),
    }));
  }

  const handleNavigateToSettings = () => {
    if (typeof onNavigate === "function") {
      // Ayarlar sayfasına gitmeden önce, verileri lokalde kaydet ve tempData olarak da sakla
      try {
        // Form verisinin kaydetmeye değer olup olmadığını kontrol et
        const hasImportantData = formData.customerName || formData.tourName || formData.destinationId ||
                            (Array.isArray(formData.activities) && formData.activities.length > 0) ||
                            (Array.isArray(formData.expenses) && formData.expenses.length > 0);
                            
        if (hasImportantData) {
          // LocalStorage'a formu kaydet
          const formDataString = JSON.stringify(formData);
          localStorage.setItem(TOUR_SALES_FORM_KEY, formDataString);
          localStorage.setItem(TOUR_SALES_STEP_KEY, currentStep.toString());
          localStorage.setItem(TOUR_IN_PROGRESS_KEY, "true");
          
          // Düzenleme durumunu da kaydet
          if (editingRecord) {
            localStorage.setItem(TOUR_EDITING_RECORD_KEY, JSON.stringify(editingRecord));
          }
          
          // tempTourFormData'ya da kaydet
          if (setTempTourFormData) {
            setTempTourFormData(formData);
            console.log("Form verileri geçici belleğe kaydedildi, ayarlar sayfasına gidiliyor");
          }
          
          // Kullanıcıya bilgi göster
          toast({
            title: "Form Verileriniz Kaydedildi",
            description: "Ayarlar sayfasından döndüğünüzde kaldığınız yerden devam edebileceksiniz.",
            variant: "default"
          });
        }
      } catch (error) {
        console.error("Ayarlar sayfasına giderken form kaydedilemedi:", error);
      }
      
      // Ayarlar sayfasına git
      onNavigate("settings");
    }
  };

  // Gider ekleme fonksiyonu
  const addExpense = () => {
    const newExpense = {
      id: generateUUID(),
      type: "",
      name: "",
      amount: "",
      currency: "TRY",
      details: "",
      isIncludedInPrice: false,
      addToDebt: false, // Müşteri borcuna ekleme özelliği eklendi
      companyId: "", // Firma seçimi için boş alan eklendi
    };
    setFormData((prev: any) => ({
      ...prev,
      expenses: [...(prev.expenses || []), newExpense],
    }));
  };

  // Gider silme fonksiyonu
  const removeExpense = (id: string) => {
    setFormData((prev: any) => ({
      ...prev,
      expenses: (prev.expenses || []).filter((expense: any) => expense.id !== id),
    }));
  };

  // Gider güncelleme fonksiyonu
  const updateExpense = (id: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      expenses: (prev.expenses || []).map((expense: any) => {
        if (expense.id === id) {
          if (field === "companyId") {
            // Firma seçildiğinde firma adını da güncelle
            const selectedCompany = companies.find(c => c.id === value);
            return {
              ...expense,
              companyId: value,
              companyName: selectedCompany ? selectedCompany.name : ""
            };
          }
          return { ...expense, [field]: value };
        }
        return expense;
      }),
    }));
  };

  // Aktivite ekleme fonksiyonu
  const addTourActivity = () => {
    const newActivity = {
      id: generateUUID(),
      activityId: "",
      name: "", // Eksik olan name özelliği eklendi
      date: "",
      duration: "",
      price: "",
      currency: "TRY",
      participants: "",
      participantsType: "all",
      companyId: "",
      details: "",
      addToDebt: false, // Müşteri borcuna ekleme özelliği eklendi
      supplierCost: "", // Tedarikçiye ödenecek maliyet tutarı
    };
    setFormData((prev: any) => ({
      ...prev,
      activities: [...(prev.activities || []), newActivity],
    }));
  };

  // Aktivite silme fonksiyonu
  const removeTourActivity = (id: string) => {
    setFormData((prev: any) => ({
      ...prev,
      activities: (prev.activities || []).filter((activity: any) => activity.id !== id),
    }));
  };

  // Aktivite güncelleme fonksiyonu
  const updateTourActivity = (id: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      activities: (prev.activities || []).map((activity: any) => {
        if (activity.id === id) {
          // Eğer activityId değişiyorsa, ilgili aktivitenin adını da güncelle
          if (field === "activityId") {
            const selected = activities.find((a: any) => a.id === value);
            return {
              ...activity,
              activityId: value,
              name: selected ? selected.name : "",
            };
          }
          
          // Eğer firma seçiliyorsa firma adını da güncelle
          if (field === "companyId") {
            const selectedCompany = companies.find(c => c.id === value);
            return {
              ...activity,
              companyId: value,
              companyName: selectedCompany ? selectedCompany.name : ""
            };
          }
          
          return { ...activity, [field]: value };
        }
        return activity;
      }),
    }));
  };

  // Tüm giderleri para birimine göre toplayan fonksiyon
  const calculateTotalExpensesByCurrency = () => {
    const totals: Record<string, number> = {};
    if (formData.expenses && Array.isArray(formData.expenses)) {
      (formData.expenses as any[]).forEach((expense) => {
        const currency = expense.currency || "TRY";
        const amount = Number.parseFloat(expense.amount) || 0;
        if (!totals[currency]) totals[currency] = 0;
        totals[currency] += amount;
      });
    }
    return totals;
  };

  return (
    <Card className="w-full max-w-screen-xl mx-auto">
      <CardHeader className="pb-0">          <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold text-teal-700">
            {initialData ? "Tur Kaydını Düzenle" : "Yeni Tur Kaydı"}
          </CardTitle>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              İptal
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => setIsConfirmDialogOpen(true)}
            >
              <Save className="mr-2 h-4 w-4" />
              Kaydet
            </Button>
          </div>
        </div>

        <div ref={stepsRef} className="mt-6 relative">
          <nav aria-label="Progress" className="mb-8">
            <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
              {steps.map((step, index) => (
                <li key={step.id} className="md:flex-1">
                  <div
                    className={`group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pl-0 md:pt-4 md:pb-0 ${currentStep === index
                      ? "border-teal-600 md:border-teal-600"
                      : currentStep > index
                        ? "border-teal-300 md:border-teal-300"
                        : "border-gray-200 md:border-gray-200"
                      }`}
                  >
                    <span
                      className={`text-sm font-medium ${currentStep === index
                        ? "text-teal-600"
                        : currentStep > index
                          ? "text-teal-500"
                          : "text-gray-500"
                        }`}
                    >
                      Adım {index + 1}
                    </span>
                    <span className="text-sm font-medium">{step.label}</span>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={(e) => e.preventDefault()}>
          {/* Adım 1: Müşteri Bilgileri */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Müşteri Adı Soyadı</Label>
                <Input
                  id="customerName"
                  name="customerName"
                  value={formData.customerName ?? ""}
                  onChange={handleChange}
                  placeholder="Müşteri adını girin"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Telefon</Label>
                  <Input
                    id="customerPhone"
                    name="customerPhone"
                    value={formData.customerPhone ?? ""}
                    onChange={handleChange}
                    placeholder="Telefon numarası"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail">E-posta</Label>
                  <Input
                    id="customerEmail"
                    name="customerEmail"
                    type="email"
                    value={formData.customerEmail ?? ""}
                    onChange={handleSaveCustomerEmail}
                    placeholder="E-posta adresi"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerAddress">Adres</Label>
                <Textarea
                  id="customerAddress"
                  name="customerAddress"
                  value={formData.customerAddress ?? ""}
                  onChange={handleChange}
                  placeholder="Adres bilgisi"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerIdNumber">T.C. Kimlik / Pasaport No</Label>
                <Input
                  id="customerIdNumber"
                  name="customerIdNumber"
                  value={formData.customerIdNumber ?? ""}
                  onChange={handleChange}
                  placeholder="Kimlik numarası"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nationality">Vatandaşlık / Ülke</Label>
                  <Select
                    value={formData.nationality}
                    onValueChange={(value) => handleSelectChange("nationality", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ülke seçin" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {/* Ülke listesini countries.ts dosyasından al */}
                      {(() => {
                        try {
                          // Dinamik olarak ülke listesini import et
                          const countriesList = require("@/lib/countries").countries as {code: string, name: string}[];
                          return countriesList.map((country: {code: string, name: string}, index: number) => (
                            <SelectItem key={country.code + '-' + index} value={country.name}>{country.name}</SelectItem>
                          ));
                        } catch (error) {
                          console.error("Ülke listesi yüklenemedi:", error);
                          // Hata durumunda en yaygın ülkeleri göster
                          return [
                            <SelectItem key="tr" value="Türkiye">Türkiye</SelectItem>,
                            <SelectItem key="us" value="Amerika Birleşik Devletleri">Amerika Birleşik Devletleri</SelectItem>,
                            <SelectItem key="de" value="Almanya">Almanya</SelectItem>,
                            <SelectItem key="fr" value="Fransa">Fransa</SelectItem>,
                            <SelectItem key="gb" value="Birleşik Krallık">Birleşik Krallık</SelectItem>,
                            <SelectItem key="ru" value="Rusya">Rusya</SelectItem>,
                            <SelectItem key="ua" value="Ukrayna">Ukrayna</SelectItem>,
                            <SelectItem key="other" value="Diğer">Diğer</SelectItem>
                          ];
                        }
                      })()}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referralSource">Müşteri Referans Kaynağı</Label>
                  <Select
                    value={formData.referralSource}
                    onValueChange={(value) => handleSelectChange("referralSource", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Müşteriyi nereden bulduk?" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoading ? (
                        <SelectItem value="loading" disabled>Yükleniyor...</SelectItem>
                      ) : referralSources && referralSources.length > 0 ? (
                        referralSources.map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            {source.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-sources">
                          Referans kaynağı bulunamadı. Lütfen ayarlardan ekleyin.
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Ek Katılımcılar */}
              <div className="space-y-2 mt-6">
                <div className="flex justify-between items-center">
                  <Label className="text-base">Ek Katılımcılar</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addAdditionalCustomer}>
                    <Plus className="h-4 w-4 mr-2" />
                    Katılımcı Ekle
                  </Button>
                </div>

                {formData.additionalCustomers?.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground border rounded-md">
                    Henüz ek katılımcı eklenmemiş
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.additionalCustomers?.map((customer, index) => (
                      <Card key={customer.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">Katılımcı {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAdditionalCustomer(customer.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Ad Soyad</Label>
                            <Input
                              value={customer.name}
                              onChange={(e) => updateAdditionalCustomer(customer.id, "name", e.target.value)}
                              placeholder="Ad soyad"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Telefon</Label>
                            <Input
                              value={customer.phone}
                              onChange={(e) => updateAdditionalCustomer(customer.id, "phone", e.target.value)}
                              placeholder="Telefon numarası"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>T.C. Kimlik / Pasaport No</Label>
                            <Input
                              value={customer.idNumber}
                              onChange={(e) => updateAdditionalCustomer(customer.id, "idNumber", e.target.value)}
                              placeholder="Kimlik numarası"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>E-posta</Label>
                            <Input
                              value={customer.email}
                              onChange={(e) => updateAdditionalCustomer(customer.id, "email", e.target.value)}
                              placeholder="E-posta adresi"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Adres</Label>
                            <Textarea
                              value={customer.address}
                              onChange={(e) => updateAdditionalCustomer(customer.id, "address", e.target.value)}
                              placeholder="Adres bilgisi"
                              rows={2}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <Button type="button" className="bg-teal-600 hover:bg-teal-700" onClick={nextStep}>
                  İleri
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Adım 2: Tur Detayları */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Seri Numarası</Label>
                  <Input
                    id="serialNumber"
                    name="serialNumber"
                    value={formData.serialNumber ?? ""}
                    onChange={handleChange}
                    placeholder="Tur seri numarası"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tourName">Tur Kaydını Oluşturan Kişi</Label>
                  <Input
                    id="tourName"
                    name="tourName"
                    value={formData.tourName ?? ""}
                    onChange={handleChange}
                    placeholder="Kaydı oluşturan kişinin adını girin"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Bu alan, tur kaydını oluşturan kişinin adını içerir ve destinasyondaki mevcut turlardan etkilenmez.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destinationId">Destinasyon</Label>
                {isLoading ? (
                  <div className="flex items-center space-x-2 p-2 border rounded-md bg-slate-50">
                    <div className="animate-spin h-4 w-4 border-2 border-teal-500 rounded-full border-t-transparent"></div>
                    <span className="text-sm text-muted-foreground">Destinasyonlar yükleniyor...</span>
                  </div>
                ) : (
                  <Select
                    value={formData.destinationId ?? ""}
                    onValueChange={(value) => handleSelectChange("destinationId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Destinasyon seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinations.length > 0 ? (
                        destinations.map((destination) => (
                          <SelectItem key={destination.id} value={destination.id}>
                            {destination.name} ({destination.country})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-destinations">
                          Destinasyon bulunamadı. Lütfen ayarlardan ekleyin.
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Destinasyona Ait Turlar - Yeni Eklenen Bölüm */}
              {formData.destinationId && (
                <div className="space-y-2 border-t border-dashed pt-4 mt-4">
                  <Label htmlFor="selectedTourId">Destinasyondaki Mevcut Tur Şablonları</Label>
                  <p className="text-xs text-muted-foreground">
                    Bir tur şablonu seçildiğinde sadece para birimi ve fiyat bilgileri alınacaktır. 
                    "Tur Kaydını Oluşturan Kişi" alanı değiştirilmeyecektir.
                  </p>
                  
                  {isLoadingTours ? (
                    <div className="flex items-center space-x-2 p-2 border rounded-md bg-slate-50">
                      <div className="animate-spin h-4 w-4 border-2 border-teal-500 rounded-full border-t-transparent"></div>
                      <span className="text-sm text-muted-foreground">Turlar yükleniyor...</span>
                    </div>
                  ) : destinationTours.length > 0 ? (
                    <Select
                      value={selectedTourId}
                      onValueChange={(value) => {
                        setSelectedTourId(value);
                        // Seçilen tur bilgilerini formda kullan
                        const selectedTour = destinationTours.find(tour => tour.id === value);
                        console.log("Seçilen tur:", selectedTour);
                        
                        if (selectedTour) {
                          // İlgili değerleri güncelle (tourName dışında)
                          setFormData(prev => {
                            const updatedForm = {
                              ...prev,
                              // tourName değerini güncelleme - bu sorunu çözer
                              currency: selectedTour.currency || prev.currency,
                              // Seçilen tur ID'sini ve adını form verisine ekle
                              selectedTourId: value,
                              selectedTourName: selectedTour.name || selectedTour.tourName || "Adı tanımlanmamış tur"
                            };
                            
                            // Fiyat bilgisini farklı olası alanlarda ara
                            let price = null;
                            
                            // Olası tüm fiyat alanlarını kontrol et
                            if (selectedTour.defaultPrice !== undefined) {
                              price = selectedTour.defaultPrice;
                              console.log("Bulunan fiyat (defaultPrice):", price);
                            } else if (selectedTour.price !== undefined) {
                              price = selectedTour.price;
                              console.log("Bulunan fiyat (price):", price);
                            } else if (selectedTour.pricePerPerson !== undefined) {
                              price = selectedTour.pricePerPerson;
                              console.log("Bulunan fiyat (pricePerPerson):", price);
                            }
                            
                            // Fiyat bulunduysa forma ekle
                            if (price !== null) {
                              // String veya number olabilir, string'e çevir
                              updatedForm.pricePerPerson = String(price);
                              
                              // Toplam fiyatı da hesapla
                              const totalPrice = Number(price) * Number(prev.numberOfPeople || 1);
                              updatedForm.totalPrice = totalPrice.toString();
                              
                              console.log(`Fiyat forma eklendi: ${price}, Toplam: ${totalPrice}`);
                            } else {
                              console.warn("Turda fiyat bilgisi bulunamadı!");
                            }
                            
                            return updatedForm;
                          });
                          
                          toast({
                            title: "Tur Şablonu Seçildi",
                            description: `"${selectedTour.name || selectedTour.tourName}" şablonu seçildi. Fiyat ve para birimi bilgileri forma yüklendi. (Tur Kaydını Oluşturan Kişi alanı değiştirilmedi.)`,
                            variant: "default"
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tur seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Tur seçmeyin</SelectItem>
                        {destinationTours.map((tour) => (
                          <SelectItem key={tour.id} value={tour.id}>
                            {tour.name || tour.tourName} ({tour.defaultPrice || tour.price || tour.pricePerPerson || "Fiyat yok"} {tour.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-muted-foreground p-2 border rounded-md">
                      Bu destinasyona ait tur kaydı bulunamadı. Ayarlar bölümünde tur ekleyebilirsiniz.
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={handleNavigateToSettings}
                      >
                        Ayarlara Git
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tourDate">Başlangıç Tarihi</Label>
                  <Input
                    id="tourDate"
                    name="tourDate"
                    type="date"
                    value={formData.tourDate ?? new Date().toISOString().split("T")[0]}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tourEndDate">Bitiş Tarihi</Label>
                  <Input
                    id="tourEndDate"
                    name="tourEndDate"
                    type="date"
                    value={formData.tourEndDate ?? ""}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numberOfPeople">Yetişkin Sayısı</Label>
                  <Input
                    id="numberOfPeople"
                    name="numberOfPeople"
                    type="number"
                    min="1"
                    value={formData.numberOfPeople ?? 1}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numberOfChildren">Çocuk Sayısı</Label>
                  <Input
                    id="numberOfChildren"
                    name="numberOfChildren"
                    type="number"
                    min="0"
                    value={formData.numberOfChildren ?? 0}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pricePerPerson">Kişi Başı Fiyat</Label>
                  <div className="flex gap-2">
                    <Input
                      id="pricePerPerson"
                      name="pricePerPerson"
                      type="number"
                      step="0.01"
                      value={formData.pricePerPerson ?? ""}
                      onChange={handleChange}
                      placeholder="0.00"
                      required
                    />
                    <Select value={formData.currency ?? "TRY"} onValueChange={(value) => handleSelectChange("currency", value)}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Para birimi" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalPrice">Toplam Fiyat</Label>
                  <Input
                    id="totalPrice"
                    name="totalPrice"
                    type="number"
                    step="0.01"
                    value={formData.totalPrice ?? ""}
                    onChange={handleChange}
                    placeholder="0.00"
                    required
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notlar</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes ?? ""}
                  onChange={handleChange}
                  placeholder="Ek notlar"
                  rows={3}
                />
              </div>

              <div className="flex justify-between mt-6">
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Geri
                </Button>

                <Button type="button" className="bg-teal-600 hover:bg-teal-700" onClick={nextStep}>
                  İleri
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Adım 3: Tur Giderleri */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-[#00a1c6]">Tur Giderleri (Muhasebe)</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleNavigateToSettings}>
                  Ayarlar
                </Button>
              </div>

              <div className="border rounded-md p-4 bg-slate-50">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Giderler Hakkında Bilgi:</strong> Bu bölümde tur için yapılacak ödemeleri (giderleri) kaydedebilirsiniz.
                  Her bir gider için önce kategori seçin (konaklama, ulaşım vb.), sonra o kategoriye ait gider türlerinden birini seçin.
                  İsterseniz gider için ilgili firmayı da belirtebilirsiniz.
                </p>
                <p className="text-sm text-muted-foreground">
                  Gider türleri ve firmalar ayarlar sayfasından eklenebilir. Eğer istediğiniz gider türü veya firma listede yoksa,
                  "Ayarlar" düğmesini kullanarak yeni ekleyebilirsiniz.
                </p>
              </div>

              {/* Gider Listesi */}
              <div className="space-y-4">
                {formData.expenses.length === 0 && (
                  <div className="border border-dashed rounded-md p-8 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="text-muted-foreground">Henüz gider eklenmemiş</div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {formData.expenses.map((expense, index) => (
                    <Card key={expense.id} className="p-4 border-l-4 border-l-[#00a1c6]">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-[#00a1c6]">Gider {index + 1}</h4>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeExpense(expense.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {/* Gider Kategorisi Seçimi */}
                        <div className="space-y-2">
                          <Label>Gider Kategorisi</Label>
                          <Select
                            value={expense.category || expense.type || ""}
                            onValueChange={(value) => {
                              // Kategori değiştiğinde hem category hem de type alanlarını güncelle
                              updateExpense(expense.id, "category", value);
                              updateExpense(expense.id, "type", value);
                              // Kategori değiştiğinde, ilgili gider türünü sıfırla
                              updateExpense(expense.id, "expenseTypeId", "");
                              updateExpense(expense.id, "name", "");
                            }}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Gider kategorisi seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {expenseCategories.map((category) => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {(!expense.category && !expense.type) && (
                            <div className="text-red-500 text-xs mt-1">Gider kategorisi seçilmelidir.</div>
                          )}
                        </div>

                        {/* Gider Türü Seçimi (Kategori seçildiyse göster) */}
                        {(expense.category || expense.type) && (
                          <div className="space-y-2">
                            <Label>Gider Türü</Label>
                            <Select
                              value={expense.expenseTypeId || ""}
                              onValueChange={(value) => {
                                // Gider türü seçildiğinde expenseTypeId ve name alanlarını güncelle
                                updateExpense(expense.id, "expenseTypeId", value);
                                
                                // Seçilen gider türünün adını otomatik olarak name alanına aktar
                                const selectedExpenseType = expenseTypes.find(et => et.id === value);
                                if (selectedExpenseType) {
                                  updateExpense(expense.id, "name", selectedExpenseType.name);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Gider türü seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                {isLoading ? (
                                  <SelectItem value="loading" disabled>Gider türleri yükleniyor...</SelectItem>
                                ) : (
                                  <>
                                    {/* İlgili kategoriye ait gider türlerini filtrele ve listele */}
                                    {expenseTypes
                                      .filter(et => et.category === expense.category || et.category === expense.type || et.type === expense.category || et.type === expense.type)
                                      .map((expenseType) => (
                                        <SelectItem key={expenseType.id} value={expenseType.id}>
                                          {expenseType.name}
                                        </SelectItem>
                                      ))}
                                    
                                    {/* Eğer hiç gider türü yoksa veya listelenecek gider türü bulunamazsa */}
                                    {expenseTypes.filter(et => et.category === expense.category || et.category === expense.type || et.type === expense.category || et.type === expense.type).length === 0 && (
                                      <SelectItem value="none" disabled>
                                        Bu kategoride gider türü bulunamadı. Lütfen ayarlardan ekleyin.
                                      </SelectItem>
                                    )}
                                    
                                    {/* Özel gider türü ekleme seçeneği */}
                                    <SelectItem value="custom">+ Özel gider ekle</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>

                            {/* Özel gider türü seçildiyse göster */}
                            {expense.expenseTypeId === "custom" && (
                              <Input
                                className="mt-2"
                                value={expense.name || ""}
                                onChange={(e) => updateExpense(expense.id, "name", e.target.value)}
                                placeholder="Özel gider adı girin"
                              />
                            )}
                          </div>
                        )}

                        {/* Sadece özel gider eklemediysek ve bir gider türü seçilmediyse açıklama alanını göster */}
                        {expense.expenseTypeId !== "custom" && !expense.expenseTypeId && (
                          <div className="space-y-2">
                            <Label>Açıklama</Label>
                            <Input
                              value={expense.name ?? ""}
                              onChange={(e) => updateExpense(expense.id, "name", e.target.value)}
                              placeholder="Gider açıklaması"
                              required
                            />
                            {(!expense.name || expense.name === "") && (
                              <div className="text-red-500 text-xs mt-1">Açıklama girilmelidir.</div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Tutar</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={expense.amount ?? ""}
                                onChange={(e) => updateExpense(expense.id, "amount", e.target.value)}
                                placeholder="0.00"
                              />
                              <Select
                                value={expense.currency || "TRY"}
                                onValueChange={(value) => updateExpense(expense.id, "currency", value)}
                              >
                                <SelectTrigger className="w-[100px]">
                                  <SelectValue placeholder="Para birimi" />
                                </SelectTrigger>
                                <SelectContent>
                                  {currencyOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.value}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Detaylar</Label>
                            <Input
                              value={expense.details ?? ""}
                              onChange={(e) => updateExpense(expense.id, "details", e.target.value)}
                              placeholder="Ek bilgiler"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Firma</Label>
                            <Select
                              value={expense.companyId ?? ""}
                              onValueChange={(value) => updateExpense(expense.id, "companyId", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Firma seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                {companies && companies.length > 0 ? (
                                  companies.map((company) => (
                                    <SelectItem key={company.id} value={company.id}>
                                      {company.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-companies">
                                    Firma bulunamadı. Lütfen ayarlardan ekleyin.
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mt-4">
                          <Checkbox
                            id={`included-${expense.id}`}
                            checked={expense.isIncludedInPrice || false}
                            onCheckedChange={(checked) =>
                              updateExpense(expense.id, "isIncludedInPrice", checked === true)
                            }
                          />
                          <label
                            htmlFor={`included-${expense.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Tur fiyatına dahil
                          </label>
                        </div>

                        <div className="flex items-center space-x-2 mt-2">
                          <Checkbox
                            id={`addToDebt-${expense.id}`}
                            checked={expense.addToDebt || false}
                            onCheckedChange={(checked) => {
                              updateExpense(expense.id, "addToDebt", checked === true);
                            }}
                          />
                          <label
                            htmlFor={`addToDebt-${expense.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Müşteri borcuna ekle
                          </label>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Gider Ekle ve İleri/Geri Butonları */}
              <div className="flex flex-col md:flex-row justify-end items-center gap-2 mt-6">
                <div className="flex-1 w-full md:w-auto flex justify-start md:justify-end mb-2 md:mb-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-dashed border-[#00a1c6] text-[#00a1c6]"
                    onClick={addExpense}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Gider Ekle
                  </Button>
                </div>
                <div className="flex gap-2 w-full md:w-auto justify-end">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Geri
                  </Button>
                  <Button type="button" className="bg-teal-600 hover:bg-teal-700" onClick={nextStep}>
                    İleri
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Adım 4: Tur Aktiviteleri */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-[#00a1c6]">Tur Aktiviteleri</h3>
              </div>

              <div className="text-sm text-muted-foreground mb-2">
                Aktiviteler ekstra ücretli hizmetlerdir ve tur fiyatına eklenir.
              </div>

              {formData.activities.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground border rounded-md">
                  Henüz aktivite eklenmemiş
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.activities.map((activity, index) => (
                    <Card key={activity.id} className="p-4 border-l-4 border-l-[#00a1c6]">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-[#00a1c6]">Aktivite {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTourActivity(activity.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Aktivite</Label>
                          {isLoading ? (
                            <div className="flex items-center space-x-2 p-2 border rounded-md bg-slate-50">
                              <div className="animate-spin h-4 w-4 border-2 border-teal-500 rounded-full border-t-transparent"></div>
                              <span className="text-sm text-muted-foreground">Aktiviteler yükleniyor...</span>
                            </div>
                          ) : (
                            <Select
                              value={activity.activityId || ""}
                              onValueChange={(value) => updateTourActivity(activity.id, "activityId", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Aktivite seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                {activities && activities.length > 0 ? (
                                  activities.map((act) => (
                                    <SelectItem key={act.id} value={act.id}>
                                      {act.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-activities">
                                    Aktivite bulunamadı. Lütfen ayarlardan ekleyin.
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Tarih</Label>
                          <Input
                            type="date"
                            value={activity.date ?? ""}
                            onChange={(e) => updateTourActivity(activity.id, "date", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label>Süre</Label>
                          <Input
                            value={activity.duration ?? ""}
                            onChange={(e) => updateTourActivity(activity.id, "duration", e.target.value)}
                            placeholder="2 saat, Tam gün vb."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Fiyat</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={activity.price ?? ""}
                              onChange={(e) => updateTourActivity(activity.id, "price", e.target.value)}
                              placeholder="0.00"
                            />
                            <Select
                              value={activity.currency ?? "TRY"}
                              onValueChange={(value) => updateTourActivity(activity.id, "currency", value)}
                            >
                              <SelectTrigger className="w-[100px]">
                                <SelectValue placeholder="Para birimi" />
                              </SelectTrigger>
                              <SelectContent>
                                {currencyOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label>Katılımcı Sayısı</Label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`all-participants-${activity.id}`}
                                checked={activity.participantsType === "all"}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    // "all" seçeneğini etkinleştir ve katılımcı sayısını tek seferde güncelle
                                    const totalParticipants = Number(formData.numberOfPeople) || 0;
                                    
                                    // İki değişikliği tek bir güncelleme ile yap
                                    setFormData((prev) => ({
                                      ...prev,
                                      activities: prev.activities.map((act) => 
                                        act.id === activity.id 
                                          ? { ...act, participantsType: "all", participants: String(totalParticipants) }
                                          : act
                                      )
                                    }));
                                  } else {
                                    updateTourActivity(activity.id, "participantsType", "custom");
                                  }
                                }}
                              />
                              <label
                                htmlFor={`all-participants-${activity.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                Tüm tur katılımcıları ({formData.numberOfPeople} kişi)
                              </label>
                            </div>

                            {activity.participantsType === "custom" && (
                              <div className="flex items-center space-x-2 mt-2">
                                <Input
                                  type="number"
                                  min="1"
                                  max={formData.numberOfPeople}
                                  value={activity.participants ?? ""}
                                  onChange={(e) => updateTourActivity(activity.id, "participants", String(e.target.value))}
                                  placeholder="Katılımcı sayısı"
                                />
                                <span className="text-sm text-muted-foreground">
                                  / {formData.numberOfPeople} kişi
                                </span>
                              </div>
                                                                         )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label>Firma</Label>
                          <Select
                            value={activity.companyId ?? ""}
                            onValueChange={(value) => updateTourActivity(activity.id, "companyId", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Firma seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {companies && companies.length > 0 ? (
                                companies.map((company) => (
                                  <SelectItem key={company.id} value={company.id}>
                                    {company.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-companies">
                                  Firma bulunamadı. Lütfen ayarlardan ekleyin.
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Detaylar</Label>
                          <Input
                            value={activity.details ?? ""}
                            onChange={(e) => updateTourActivity(activity.id, "details", e.target.value)}
                            placeholder="Ek bilgiler"
                          />
                        </div>
                      </div>

                      <div className="space-y-4 mt-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`addToDebt-${activity.id}`}
                            checked={activity.addToDebt || false}
                            onCheckedChange={(checked) => {
                              updateTourActivity(activity.id, "addToDebt", checked === true)
                            }}
                          />
                          <label
                            htmlFor={`addToDebt-${activity.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Müşteri borcuna ekle
                          </label>
                        </div>
                        
                        {/* Firma seçili ve borç ekleme aktif ise firma borç tutarını göster */}
                        {activity.addToDebt && activity.companyId && (
                          <div className="mt-2 ml-6">
                            <Label htmlFor={`supplierCost-${activity.id}`} className="text-sm text-muted-foreground">
                              Firma Borç Tutarı <span className="text-xs text-gray-400">(Firmaya ödenecek tutar)</span>
                            </Label>
                            <div className="flex gap-2 mt-1">
                              <Input
                                id={`supplierCost-${activity.id}`}
                                type="number"
                                step="0.01"
                                value={activity.supplierCost ?? ""}
                                onChange={(e) => updateTourActivity(activity.id, "supplierCost", e.target.value)}
                                placeholder="0.00"
                                className="w-full"
                              />
                              <div className="w-[100px] bg-gray-100 flex items-center justify-center rounded-md border">
                                {activity.currency}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Aktivite Ekle ve İleri/Geri Butonları */}
              <div className="flex flex-col md:flex-row justify-end items-center gap-2 mt-6">
                <div className="flex-1 w-full md:w-auto flex justify-start md:justify-end mb-2 md:mb-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-dashed border-[#00a1c6] text-[#00a1c6]"
                    onClick={addTourActivity}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Aktivite Ekle
                  </Button>
                </div>
                <div className="flex gap-2 w-full md:w-auto justify-end">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Geri
                  </Button>
                  <Button type="button" className="bg-teal-600 hover:bg-teal-700" onClick={nextStep}>
                    İleri
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Adım 5: Ödeme Bilgileri */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Ödeme Durumu</Label>
                <Select
                  value={formData.paymentStatus ?? "pending"}
                  onValueChange={(value) => handleSelectChange("paymentStatus", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ödeme durumu seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Beklemede</SelectItem>
                    <SelectItem value="partial">Kısmi Ödeme</SelectItem>
                    <SelectItem value="completed">Tamamlandı</SelectItem>
                    <SelectItem value="refunded">İade Edildi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.paymentStatus === "partial" && (
                <div className="space-y-2">
                  <Label htmlFor="partialPaymentAmount">Yapılan Ödeme Tutarı</Label>
                  <div className="flex gap-2">
                    <Input
                      id="partialPaymentAmount"
                      name="partialPaymentAmount"
                      type="number"
                      step="0.01"
                      value={formData.partialPaymentAmount ?? ""}
                      onChange={handleChange}
                      placeholder="0.00"
                      required
                    />
                    <Select
                      value={formData.partialPaymentCurrency ?? "TRY"}
                      onValueChange={(value) => handleSelectChange("partialPaymentCurrency", value)}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Para birimi" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Ödeme Yöntemi</Label>
                <Select
                  value={formData.paymentMethod ?? "cash"}
                  onValueChange={(value) => handleSelectChange("paymentMethod", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ödeme yöntemi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Nakit</SelectItem>
                    <SelectItem value="creditCard">Kredi Kartı</SelectItem>
                    <SelectItem value="bankTransfer">Banka Transferi</SelectItem>
                    <SelectItem value="other">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tur fiyat özeti */}
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tur Fiyat Özeti</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Tur Temel Fiyat:</span>
                      <span className="font-medium">
                        {(Number(formData.pricePerPerson) * Number(formData.numberOfPeople)).toLocaleString()} {formData.currency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Aktiviteler Toplamı:</span>
                      <span className="font-medium">
                        {calculateTotalActivitiesPrice().toLocaleString()} {formData.currency}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Genel Toplam:</span>
                      <span>
                        {Number(formData.totalPrice).toLocaleString()} {formData.currency}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between mt-6">
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Geri
                </Button>

                <Button type="button" className="bg-teal-600 hover:bg-teal-700" onClick={nextStep}>
                  İleri
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Adım 6: Özet */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <TourSummary
                formData={{
                  ...formData,
                  activities: formData.activities.map(a => ({
                    ...a,
                    // "all" tipindeki aktiviteler için tur katılımcı sayısını kullan
                    participants: a.participantsType === "all" ? 
                      Number(formData.numberOfPeople) : Number(a.participants),
                    price: Number(a.price)
                  }))
                }}
              />
              <div className="flex justify-between mt-6">
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                </Button>
                <Button type="button" className="bg-teal-600 hover:bg-teal-700" onClick={() => setIsConfirmDialogOpen(true)}>
                  <Check className="mr-2 h-4 w-4" /> Kaydı Onayla
                </Button>
              </div>
            </div>
          )}

        </form>
      </CardContent>

      {/* Onay Dialog */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{initialData ? 'Güncellemeyi Onayla' : 'Kaydı Onayla'}</AlertDialogTitle>
            <AlertDialogDescription>
              {initialData ? 'Tur kaydındaki değişiklikleri kaydetmek istediğinize emin misiniz?' : 'Tur kaydını kaydetmek istediğinize emin misiniz?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmDialogOpen(false)}>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-teal-600 hover:bg-teal-700" onClick={handleSubmit}>
              {initialData ? 'Güncelle' : 'Kaydet'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Tur Özeti Bileşeni - Örnek Kullanım */}

    </Card>
  )
}
