"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { CalendarIcon, Check, ChevronLeft, ChevronRight, Edit, Loader2, Plus, Save, Trash2, X, ChevronsUpDown, Users } from "lucide-react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { 
  saveReservation, 
  getNextSerialNumber, 
  incrementSerialNumber,
  getReservationSettings,
  getCompanies, // getCompanies fonksiyonunu içeri aktar
  generateUUID,
  getReservationById,
  updateReservation
} from "@/lib/db"
import { getDestinations, getReservationDestinations } from "@/lib/db-firebase"
import { ReservationCariService } from "@/lib/reservation-cari-service" // Rezervasyon Cari Servisi

// Katılımcı interface'i - Sadece gerekli alanları tut
interface Katilimci {
  id: number
  ad: string
  soyad: string
}

// Component props interface'i
interface RezervasyonFormProps {
  reservationId?: string; // Düzenleme modu için rezervasyon ID'si
  onSave?: (reservationData: any) => void; // Kaydetme callback'i
  onCancel?: () => void; // İptal callback'i
  onNavigate?: (view: string) => void; // Ana sayfa navigation callback'i
  mode?: 'create' | 'edit'; // Form modu
  editData?: any; // Düzenleme verisi
  onEditComplete?: () => void; // Düzenleme tamamlama callback'i
}

// Form Data interface'i
interface RezervasyonFormData {
  kaydOlusturan: string;
  destinasyon: string;
  yetiskinSayisi: string;
  cocukSayisi: string;
  bebekSayisi: string;
  alisSaati: string;
  musteriAdiSoyadi: string;
  telefon: string;
  alisYeri: string;
  alisDetaylari: Record<string, string>;
  firma: string;
  yetkiliKisi: string;
  yetkiliTelefon: string;
  yetkiliEmail: string;
  odemeYapan: string;
  odemeYontemi: string;
  odemeDurumu: string;
  toplamTutar: string;
  odemeMiktari: string;
  tutar: string; // Geriye uyumluluk için
  paraBirimi: string;
  odemeTarihi: string;
  odemeNotlari: string;
  notlar: string;
  ozelIstekler: string;
}

// Steps
const steps = [
  { id: 1, title: "Tur Bilgileri", description: "Temel tur detayları" },
  { id: 2, title: "Müşteri & Alış Bilgileri", description: "Müşteri, alış yeri ve aracı bilgileri" },
  { id: 3, title: "Ödeme", description: "Ödeme durumu ve tutar" },
  { id: 4, title: "Ek Bilgiler", description: "Notlar ve özel istekler" },
  { id: 5, title: "Özet", description: "Bilgileri kontrol edin" },
]

// Initial form data - component dışında tanımla
const getInitialFormData = (): RezervasyonFormData => ({
  kaydOlusturan: "",
  destinasyon: "",
  yetiskinSayisi: "",
  cocukSayisi: "",
  bebekSayisi: "",
  alisSaati: "",
  musteriAdiSoyadi: "",
  telefon: "",
  alisYeri: "",
  alisDetaylari: {},
  firma: "",
  yetkiliKisi: "",
  yetkiliTelefon: "",
  yetkiliEmail: "",
  odemeYapan: "",
  odemeYontemi: "",
  odemeDurumu: "",
  toplamTutar: "",
  odemeMiktari: "",
  tutar: "", // Geriye uyumluluk için
  paraBirimi: "EUR",
  odemeTarihi: "",
  odemeNotlari: "",
  notlar: "",
  ozelIstekler: "",
});

export function RezervasyonForm({ 
  reservationId, 
  onSave, 
  onCancel, 
  onNavigate,
  mode = 'create',
  editData,
  onEditComplete
}: RezervasyonFormProps = {}) {
  const { toast } = useToast()
  
  // Form data
  const [formData, setFormData] = useState<RezervasyonFormData>(getInitialFormData)

  // State'ler
  const [currentStep, setCurrentStep] = useState(1)
  const [tarih, setTarih] = useState<Date>()
  const [turTarihi, setTurTarihi] = useState<string>("")
  const [seriNumarasi, setSeriNumarasi] = useState("")
  const [katilimcilar, setKatilimcilar] = useState<Katilimci[]>([])
  const [isEditMode, setIsEditMode] = useState(mode === 'edit')
  const [originalReservationId, setOriginalReservationId] = useState<string>("")
  // Form durumunu localStorage'da saklamak için key
  const FORM_STORAGE_KEY = isEditMode ? 
    `reservation_form_edit_${reservationId}` : 
    'reservation_form_new';  // Dinamik veriler
  const [destinasyonlar, setDestinasyonlar] = useState<any[]>([]); // Rezervasyon destinasyonları
  const [ornekFirmalar, setOrnekFirmalar] = useState<string[]>([])
  const [allFirmalar, setAllFirmalar] = useState<any[]>([]) // Tüm firmalar (aracı firma için)
  const [filteredFirmalar, setFilteredFirmalar] = useState<any[]>([]) // Kategoriye göre filtrelenmiş firmalar
  const [ornekAlisYerleri, setOrnekAlisYerleri] = useState<string[]>([])
  const [ornekUlkeler, setOrnekUlkeler] = useState<string[]>([])
  const [odemeYapanlar, setOdemeYapanlar] = useState<string[]>([])
  const [odemeYontemleri, setOdemeYontemleri] = useState<string[]>([])
  const [odemeDurumlari, setOdemeDurumlari] = useState<string[]>([])

  // Loading state'leri
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form durumunu temizleme
  const clearFormStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      const key = isEditMode ? `reservation_form_edit_${reservationId}` : 'reservation_form_new';
      console.log('Form storage temizleniyor:', key);
      localStorage.removeItem(key);
      // Güvenlik için genel anahtarları da temizle
      localStorage.removeItem('reservation_form_new'); 
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('reservation_form_edit_')) {
          localStorage.removeItem(k);
        }
      });
    }
  }, [isEditMode, reservationId]);

  // Mevcut rezervasyonu yükleme (düzenleme modu için)
  const loadExistingReservation = useCallback(async () => {
    console.log('loadExistingReservation çağırıldı:', { reservationId, isEditMode });
    if (reservationId && isEditMode) {
      setLoading(true);
      try {
        console.log('Rezervasyon yükleniyor, ID:', reservationId);
        const reservation = await getReservationById(reservationId);
        console.log('Yüklenen rezervasyon:', reservation);
        if (reservation && reservation.id) {
          setOriginalReservationId(reservation.id);          const newFormData = {
            kaydOlusturan: reservation.kaydOlusturan || "",
            destinasyon: reservation.destinasyon || "",
            yetiskinSayisi: reservation.yetiskinSayisi || "",
            cocukSayisi: reservation.cocukSayisi || "",
            bebekSayisi: reservation.bebekSayisi || "",
            alisSaati: reservation.alisSaati || "",
            musteriAdiSoyadi: reservation.musteriAdiSoyadi || "",
            telefon: reservation.telefon || "",
            alisYeri: reservation.alisYeri || "",
            alisDetaylari: reservation.alisDetaylari || {},
            firma: reservation.firma || "",
            yetkiliKisi: reservation.yetkiliKisi || "",
            yetkiliTelefon: reservation.yetkiliTelefon || "",
            yetkiliEmail: reservation.yetkiliEmail || "",
            odemeYapan: reservation.odemeYapan || "",
            odemeYontemi: reservation.odemeYontemi || "",
            odemeDurumu: reservation.odemeDurumu || "",
            toplamTutar: reservation.toplamTutar || "",
            odemeMiktari: reservation.odemeMiktari || "",
            tutar: reservation.tutar || "",
            paraBirimi: reservation.paraBirimi || "EUR",
            odemeTarihi: reservation.odemeTarihi || "",
            odemeNotlari: reservation.odemeNotlari || "",
            notlar: reservation.notlar || "",
            ozelIstekler: reservation.ozelIstekler || "",
          };
          console.log('Form data güncelleniyor:', newFormData);
          setFormData(newFormData);
          setTurTarihi(reservation.turTarihi || "");
          setSeriNumarasi(reservation.seriNumarasi || "");
          setKatilimcilar(reservation.katilimcilar || []);
          if (reservation.turTarihi) {
            try {
              const date = new Date(reservation.turTarihi);
              if (!isNaN(date.getTime())) {
                setTarih(date);
              } else {
                console.error('Geçersiz tarih formatı:', reservation.turTarihi);
              }
            } catch (e) {
              console.error('Tarih parse hatası:', e);
            }
          }
        } else {
          console.error('Rezervasyon bulunamadı veya eksik veri:', reservationId);
          setError('Rezervasyon bulunamadı veya eksik veri.');
        }
      } catch (error) {
        console.error('Rezervasyon yüklenirken hata:', error);
        setError(`Rezervasyon yüklenirken bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      } finally {
        setLoading(false);
      }
    } else {
      console.log('loadExistingReservation çağrıldı ama gerekli koşullar sağlanmıyor:', { reservationId, isEditMode });
    }
  }, [reservationId, isEditMode]);

  // Form durumunu localStorage'dan yükleme
  const loadFormFromStorage = useCallback(() => {
    if (typeof window !== 'undefined' && !isEditMode) {
      const savedState = localStorage.getItem(FORM_STORAGE_KEY);
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          console.log('Form localStorage\'dan yüklendi:', parsedState);
            setFormData(parsedState.formData || getInitialFormData());
          setCurrentStep(parsedState.currentStep || 1);
          setTurTarihi(parsedState.turTarihi || "");
          setKatilimcilar(parsedState.katilimcilar || []);
          setSeriNumarasi(parsedState.seriNumarasi || "");
          
          if (parsedState.tarih) {
            setTarih(new Date(parsedState.tarih));
          }
        } catch (error) {
          console.error('Form durumu yüklenirken hata:', error);          // Hata durumunda temiz bir form başlat
          setFormData(getInitialFormData());
        }
      }
    }
  }, [FORM_STORAGE_KEY, isEditMode]);

  // EFFECT 1: Populate form if editData is provided
  useEffect(() => {
    console.log('editData useEffect çalışıyor. Gelen editData:', editData ? 'Mevcut' : 'Yok');
    if (editData && isEditMode) {
      console.log('editData ile form dolduruluyor...');
      setLoading(true);        const newFormData = {
        kaydOlusturan: editData.kaydOlusturan || "",
        destinasyon: editData.destinasyon || "",
        yetiskinSayisi: editData.yetiskinSayisi?.toString() || "0",
        cocukSayisi: editData.cocukSayisi?.toString() || "0",
        bebekSayisi: editData.bebekSayisi?.toString() || "0",
        alisSaati: editData.alisSaati || "",
        musteriAdiSoyadi: editData.musteriAdiSoyadi || "",
        telefon: editData.telefon || "",
        alisYeri: editData.alisYeri || "",
        alisDetaylari: editData.alisDetaylari || {},
        firma: editData.firma || "",
        yetkiliKisi: editData.yetkiliKisi || "",
        yetkiliTelefon: editData.yetkiliTelefon || "",
        yetkiliEmail: editData.yetkiliEmail || "",
        odemeYapan: editData.odemeYapan || "",
        odemeYontemi: editData.odemeYontemi || "",
        odemeDurumu: editData.odemeDurumu || "",
        toplamTutar: editData.toplamTutar?.toString() || editData.tutar?.toString() || "0",
        odemeMiktari: editData.odemeMiktari?.toString() || "0",
        tutar: editData.tutar?.toString() || "0", // Geriye uyumluluk için
        paraBirimi: editData.paraBirimi || "EUR",
        odemeTarihi: editData.odemeTarihi || "",
        odemeNotlari: editData.odemeNotlari || "",
        notlar: editData.notlar || "",
        ozelIstekler: editData.ozelIstekler || "",
      };
      
      setFormData(newFormData);
      
      setTurTarihi(editData.turTarihi || "");
      setSeriNumarasi(editData.seriNumarasi || "");
      setKatilimcilar(editData.katilimcilar || []);
      setOriginalReservationId(editData.id || "");
      
      if (editData.turTarihi) {
        try {
          const date = new Date(editData.turTarihi);
          if (!isNaN(date.getTime())) {
            setTarih(date);
          }
        } catch (e) { console.error('Tarih parse hatası:', e); }
      }
      
      setIsEditMode(true);
      clearFormStorage();
      console.log('Form, editData ile dolduruldu.');
      setLoading(false);
    }
  }, [editData, isEditMode, clearFormStorage]);

  // EFFECT 2: Load from Firebase if reservationId is provided (and no editData)
  useEffect(() => {
    if (isEditMode && reservationId && !editData) {
      console.log('reservationId ile Firebase\'den yükleniyor (editData yok).');
      loadExistingReservation();
    }
  }, [isEditMode, reservationId, editData, loadExistingReservation]);

  // EFFECT 3: Load from localStorage in 'new' mode
  useEffect(() => {
    if (!isEditMode) {
      console.log('Yeni rezervasyon modu: localStorage\'dan yükleniyor.');
      loadFormFromStorage();
    }
  }, [isEditMode, loadFormFromStorage]);

  // Form durumunu localStorage'a kaydetme - Sürekli çalışır, Firebase'e kaydetmez
  const saveFormToStorage = useCallback(() => {
    if (typeof window !== 'undefined' && !isEditMode) {
      const formState = {
        formData,
        currentStep,
        turTarihi,
        katilimcilar,
        tarih: tarih?.toISOString(),
        seriNumarasi,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formState));
      console.log('Form localStorage\'a kaydedildi:', FORM_STORAGE_KEY);
    }
  }, [formData, currentStep, turTarihi, katilimcilar, tarih, seriNumarasi, FORM_STORAGE_KEY, isEditMode]);

  // Firebase verilerini yükle
  useEffect(() => {    
    const loadReservationData = async () => {
      setLoading(true)
      try {
        console.log('Rezervasyon ayarları yükleniyor...');
        
        // Import countries from static file (same as tour sales form)
        const { countries } = await import("@/lib/countries")
        setOrnekUlkeler(countries.map((c: any) => c.name))        // Firebase'den veri çek - paralel olarak
        const [destinations, companies, pickupTypes, paymentMethods, paymentStatuses] = await Promise.all([
          getReservationDestinations(), // Rezervasyon destinasyonlarını kullan
          getCompanies(), // getReservationSettings yerine getCompanies kullan
          getReservationSettings('pickupTypes'),
          getReservationSettings('paymentMethods'),
          getReservationSettings('paymentStatuses')
        ])
        
        console.log('Yüklenen veriler:', {
          destinations: destinations?.length || 0,
          companies: companies?.length || 0,
          pickupTypes: pickupTypes?.length || 0,
          paymentMethods: paymentMethods?.length || 0,
          paymentStatuses: paymentStatuses?.length || 0
        });
        
        setDestinasyonlar(destinations || []); // ID ve ad ile sakla
        setOrnekFirmalar((companies || []).map((c: any) => c.name))
        setAllFirmalar(companies || []) // Tüm firmaları sakla (aracı firma için)
        
        // Alış yerleri - fallback değerlerle
        const alisYerleriList = (pickupTypes || []).map((p: any) => p.name);
        if (alisYerleriList.length === 0) {
          console.log('pickupTypes boş, varsayılan değerler kullanılıyor');
          setOrnekAlisYerleri(['Otel', 'Havalimanı', 'Acenta', 'Adres', 'Diğer']);
        } else {
          setOrnekAlisYerleri(alisYerleriList);
        }
        
        // Ödeme yapanlar - fallback değerlerle
        const odemeYapanlarList = (paymentMethods || []).map((p: any) => p.name);
        if (odemeYapanlarList.length === 0) {
          console.log('paymentMethods boş, varsayılan değerler kullanılıyor');
          setOdemeYapanlar(['Misafir', 'Acenta', 'Firma', 'Diğer']);
        } else {
          setOdemeYapanlar(odemeYapanlarList);
        }
        
        // Ödeme yöntemleri - sabit seçenekler
        setOdemeYontemleri([
          "Nakit",
          "Havale/EFT", 
          "Kredi Kartı",
          "Link ile Ödeme",
          "Çek",
          "Kredi",
          "Karma Ödeme"
        ]);
        
        // Ödeme durumları - fallback değerlerle
        const odemeDurumlariList = (paymentStatuses || []).map((p: any) => p.name);
        if (odemeDurumlariList.length === 0) {
          console.log('paymentStatuses boş, varsayılan değerler kullanılıyor');
          setOdemeDurumlari(['Ödendi', 'Beklemede', 'Kısmi Ödeme', 'İptal']);
        } else {
          setOdemeDurumlari(odemeDurumlariList);
        }

        // Seri numarası al (sadece yeni rezervasyon modunda)
        if (!isEditMode) {
          try {
            const serialNumber = await getNextSerialNumber()
            setSeriNumarasi(serialNumber)
          } catch (err) {
            const randomNum = Math.floor(Math.random() * 1000000) + 1
            setSeriNumarasi(`REZ-${randomNum.toString().padStart(6, "0")}`)
          }
        }
      } catch (error) {
        setError('Veriler yüklenirken bir hata oluştu.')
      } finally {
        setLoading(false)
      }
    }
    loadReservationData()
  }, [isEditMode])
  // Form durumunu her değiştiğinde localStorage'a kaydet (düzenleme modunda değil)
  useEffect(() => {
    if (!isEditMode) {
      const timer = setTimeout(() => {
        saveFormToStorage();
      }, 500); // 500ms delay ile kaydet (daha hızlı)

      return () => clearTimeout(timer);    }
  }, [formData, currentStep, turTarihi, katilimcilar, tarih, saveFormToStorage, isEditMode]);

  // Alış yeri değiştiğinde firmaları filtrele
  useEffect(() => {
    if (formData.alisYeri) {
      filterFirmasByAlisYeri(formData.alisYeri);
    } else {
      setFilteredFirmalar([]);
    }
  }, [formData.alisYeri]);
  // Form verilerinin otomatik kaydedilmesi
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Sadece sayfayı tamamen kapatırken uyarı göster
      if (!saving && window.location.pathname.includes('rezervasyon')) {
        const hasUnsavedChanges = 
          formData.musteriAdiSoyadi || 
          formData.telefon || 
          turTarihi || 
          katilimcilar.length > 0;

        if (hasUnsavedChanges) {
          saveFormToStorage();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formData, turTarihi, katilimcilar, saving, saveFormToStorage]);

  // Telefon formatlaması fonksiyonu
  const formatPhoneNumber = (value: string) => {
    // Sadece rakamları al
    const digits = value.replace(/\D/g, '')

    // Türkiye formatında formatlama (+90 5XX XXX XX XX)
    if (digits.length === 0) return ''
    if (digits.length <= 2) return `+${digits}`
    if (digits.length <= 5) return `+${digits.slice(0, 2)} ${digits.slice(2)}`
    if (digits.length <= 8) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
    if (digits.length <= 10) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`
  }

  // Telefon input'u için key press handler
  const handlePhoneKeyPress = (e: React.KeyboardEvent) => {
    // Sadece rakamları, backspace, delete, tab ve arrow tuşlarına izin ver
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
    if (!allowedKeys.includes(e.key) && !/[0-9]/.test(e.key)) {
      e.preventDefault()
    }
  }  // Alış detay alanları fonksiyonu - Acenta hariç tümü manuel input
  const getAlisDetayAlanlari = () => {
    switch (formData.alisYeri) {
      case "Otel":
        return ["Otel Adı", "Oda Numarası", "Alış Saati", "Özel Talimatlar"]
      case "Acenta":
        return ["Acenta Adı", "Yetkili Kişi", "Alış Saati", "Adres"]
      case "Havalimanı":
        return ["Terminal", "Uçuş Numarası", "Varış Saati", "Kapı Numarası"]
      case "Özel Adres":
        return ["Adres", "Alış Saati", "İletişim", "Özel Talimatlar"]
      case "Buluşma Noktası":
        return ["Buluşma Yeri", "Alış Saati", "İletişim", "Özel Talimatlar"]
      default:
        return ["Adres", "Alış Saati", "İletişim", "Özel Talimatlar"]
    }
  }// Hangi alanların firma seçimi olduğunu belirleme - sadece Acenta Adı dinamik
  const isFirmaSecimAlani = (alan: string): boolean => {
    return ["Acenta Adı"].includes(alan)
  }

  // Seçilen firmaya göre ilgili alanları otomatik doldur
  const handleFirmaSecimi = (alan: string, firmaAdi: string) => {
    // Seçilen firmayı bul
    const secilenFirma = filteredFirmalar.find(f => f.name === firmaAdi)
    
    // Önce temel değeri set et
    handleAlisDetayChange(alan, firmaAdi)
    
    // Eğer firma bulunduysa ve adres bilgisi varsa, ilgili adres alanını doldur
    if (secilenFirma && secilenFirma.address) {
      // Mevcut detay alanları içinde "Adres" alanı varsa otomatik doldur
      const detayAlanlari = getAlisDetayAlanlari()
      if (detayAlanlari.includes("Adres")) {
        handleAlisDetayChange("Adres", secilenFirma.address)
      }
    }
  }
  // Aracı firma seçimi için özel handler
  const handleAraciFirmaSecimi = (firmaAdi: string) => {
    // Önce temel değeri set et
    handleInputChange("firma", firmaAdi)
    
    // Seçilen firmayı tüm firmalar listesinden bul
    const secilenFirma = allFirmalar.find(f => f.name === firmaAdi)
    
    // Her durumda tüm yetkili alanlarını güncelle (var ise doldur, yok ise temizle)
    if (secilenFirma) {
      // Firma bilgileri varsa doldur, yoksa boş string ile temizle
      handleInputChange("yetkiliKisi", secilenFirma.contactPerson || "")
      handleInputChange("yetkiliTelefon", secilenFirma.phone || "")
      handleInputChange("yetkiliEmail", secilenFirma.email || "")
    } else {
      // Firma bulunamazsa tüm alanları temizle
      handleInputChange("yetkiliKisi", "")
      handleInputChange("yetkiliTelefon", "")
      handleInputChange("yetkiliEmail", "")
    }
  }  // Alış yeri türüne göre firma kategorisi eşleştirmesi - sadece Acenta için
  const getAlisYeriKategorisi = (alisYeri: string): string => {
    switch (alisYeri) {
      case "Acenta":
        return "Acenta"
      default:
        return "" // Diğer kategoriler için firma filtrelemesi yapma
    }
  }
  // Alış yerine göre firmaları filtrele - sadece Acenta için
  const filterFirmasByAlisYeri = async (alisYeri: string) => {
    if (!alisYeri || alisYeri !== "Acenta") {
      setFilteredFirmalar([]);
      return;
    }

    try {
      const companies = await getCompanies();
      const kategori = getAlisYeriKategorisi(alisYeri);
      
      if (kategori) {
        // Sadece Acenta kategorisindeki firmaları filtrele
        const filtered = companies.filter((company: any) => 
          company.category === kategori || 
          // Eğer kategori yoksa ve alış yeri "Acenta" ise, isminde "acenta" geçen firmaları getir
          (!company.category && company.name.toLowerCase().includes("acenta"))
        );
        
        setFilteredFirmalar(filtered);
      } else {
        setFilteredFirmalar([]);
      }
    } catch (error) {
      console.error('Firmalar filtrelenirken hata:', error);
      setFilteredFirmalar([]);
    }
  }
  // Handlers
  const handleInputChange = (field: keyof RezervasyonFormData, value: string) => {    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Telefon formatlaması
      if (field === "telefon" || field === "yetkiliTelefon") {
        updated[field] = formatPhoneNumber(value);
      }
      
      // Alış yeri değiştiğinde detayları sıfla ve firmaları filtrele
      if (field === "alisYeri") {
        updated.alisDetaylari = {};
        updated.firma = ""; // Firma seçimini de sıfla
        // Firmaları filtrele
        filterFirmasByAlisYeri(value);
      }
      
      // Ödeme durumu değiştiğinde ödeme detaylarını kontrol et
      if (field === "odemeDurumu") {
        // Eğer ödeme yapılmadı durumuna geçiliyorsa, ödeme detaylarını temizle
        if (value !== "Ödendi" && value !== "Kısmi Ödendi" && value !== "Tamamlandı") {
          updated.odemeYontemi = "";
          updated.odemeTarihi = "";
        }
      }
      
      return updated;
    });
  }

  const handleAlisDetayChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      alisDetaylari: { ...prev.alisDetaylari, [field]: value },
    }))
  }
  // Katılımcı fonksiyonlarını temizle - artık sadece temel alanlar var
  const addKatilimci = () => {
    const totalParticipants = 
      (parseInt(formData.yetiskinSayisi, 10) || 0) + 
      (parseInt(formData.cocukSayisi, 10) || 0);

    if (katilimcilar.length >= totalParticipants) {
        toast({
            title: "Uyarı",
            description: "Katılımcı sayısı, belirtilen yetişkin ve çocuk sayısını aşamaz.",
            variant: "destructive",
        });
        return;
    }

    const newKatilimci: Katilimci = {
      id: Date.now(),
      ad: "",
      soyad: "",
    }
    setKatilimcilar([...katilimcilar, newKatilimci])
  }

  const removeKatilimci = (id: number) => {
    setKatilimcilar(katilimcilar.filter((k) => k.id !== id))
  }

  const updateKatilimci = (id: number, field: keyof Katilimci, value: string) => {
    setKatilimcilar(prev => 
      prev.map(k => {
        if (k.id !== id) return k;
        return { ...k, [field]: value };
      })
    );
  }  // Form validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        // Destinasyon ve temel alanlar zorunlu
        return !!(turTarihi && formData.destinasyon && formData.kaydOlusturan)
      case 2:
        return !!(formData.musteriAdiSoyadi && formData.telefon)
      case 3:
        return !!formData.alisYeri
      case 4:
        // Temel alanlar her zaman zorunlu
        const basicValid = !!(formData.odemeYapan && formData.odemeDurumu)
        
        // Ödeme yapıldıysa ek alanlar da zorunlu
        if (formData.odemeDurumu === "Ödendi" || 
            formData.odemeDurumu === "Kısmi Ödendi" || 
            formData.odemeDurumu === "Tamamlandı") {
          return basicValid && !!(formData.odemeYontemi && formData.odemeMiktari && formData.odemeTarihi)
        }
        
        return basicValid
      default:
        return true
    }
  }

  // Minimum kaydetme için gerekli alanlar
  const isMinimumDataValid = (): boolean => {
    return !!(
      formData.musteriAdiSoyadi && 
      formData.telefon && 
      turTarihi && 
      formData.destinasyon
    );
  }  // Submit handler - Sadece gerçek kaydetme işlemi yapar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (saving) return

    setSaving(true)
    setError(null)

    try {
      const kayitTarihi = format(new Date(), "yyyy-MM-dd HH:mm:ss")
      
      let success = false;
      let newReservationId = null;

      if (isEditMode && originalReservationId) {
        // Güncelleme işlemi - ID'li obje gönder
        const reservationData = {
          id: originalReservationId,
          ...formData,
          turTarihi,
          seriNumarasi,
          katilimcilar,
          updatedAt: new Date().toISOString(),
          status: 'active'
        }
        success = await updateReservation(originalReservationId, reservationData);
      } else {
        // Yeni kaydetme işlemi - ID'siz obje gönder (Firebase otomatik ID oluşturacak)
        const reservationData = {
          ...formData,
          turTarihi,
          seriNumarasi,
          kayitTarihi,
          katilimcilar,
          createdAt: new Date().toISOString(),
          status: 'active'
        }
        const result = await saveReservation(reservationData);
        if (typeof result === 'string') {
          // Yeni rezervasyon başarıyla kaydedildi ve ID döndürüldü
          success = true;
          newReservationId = result;
        } else {
          success = result;
        }
      }if (success) {
        // ÖNEMLİ: Sadece yeni rezervasyon başarıyla kaydedildikten sonra seri numarayı artır
        if (!isEditMode) {
          try {
            await incrementSerialNumber();
          } catch (err) {
            console.error("Seri numarası artırılırken hata:", err);
            // Hata olursa da devam et, çünkü rezervasyon zaten kaydedildi
          }
        }

        console.log('Rezervasyon başarıyla kaydedildi/güncellendi');

        // Rezervasyon cari oluşturma (sadece yeni rezervasyon için)
        if (!isEditMode && newReservationId && formData.firma && (formData.toplamTutar || formData.tutar)) {
          try {
            const currentYear = new Date().getFullYear().toString();
            
            // Rezervasyon verilerini hazırla
            const reservationForCari = {
              id: newReservationId, // Gerçek Firebase rezervasyon ID'si
              seriNumarasi: seriNumarasi,
              firma: formData.firma,
              telefonKisi: formData.yetkiliKisi,
              yetkiliTelefon: formData.yetkiliTelefon,
              yetkiliEmail: formData.yetkiliEmail,
              turTarihi: turTarihi,
              toplamTutar: formData.toplamTutar || formData.tutar,
              odemeMiktari: formData.odemeMiktari || "0",
              odemeTarihi: formData.odemeTarihi,
              destinasyon: formData.destinasyon,
              destinasyonId: formData.destinasyon, // Her iki alan da eklendi
              musteriAdiSoyadi: formData.musteriAdiSoyadi,
              yetiskinSayisi: formData.yetiskinSayisi,
              cocukSayisi: formData.cocukSayisi,
              bebekSayisi: formData.bebekSayisi,
              alisYeri: formData.alisYeri,
              alisSaati: formData.alisSaati,
              paraBirimi: formData.paraBirimi,
              period: currentYear,
            };

            console.log('Rezervasyon formu - Cari için hazırlanan veri:', reservationForCari);
            
            await ReservationCariService.createBorcFromReservation(reservationForCari);
            console.log('Rezervasyon cari kartı başarıyla oluşturuldu');
            
          } catch (cariError) {
            console.error("Rezervasyon cari oluşturulurken hata:", cariError);
            // Cari oluşturma hatası rezervasyon kaydını etkilemesin
          }
        } else {
          console.log('Cari oluşturma atlandı. İsEditMode:', isEditMode, 'NewReservationId:', newReservationId, 'Firma:', formData.firma, 'Tutar:', formData.toplamTutar || formData.tutar);
        }

        // Düzenleme modunda da cari güncelle (varsa)
        if (isEditMode && formData.firma && (formData.toplamTutar || formData.tutar)) {
          try {
            const currentYear = new Date().getFullYear().toString();
            
            const reservationForCari = {
              id: originalReservationId, // Düzenlenen rezervasyonun ID'si
              seriNumarasi: seriNumarasi,
              firma: formData.firma,
              telefonKisi: formData.yetkiliKisi,
              yetkiliTelefon: formData.yetkiliTelefon,
              yetkiliEmail: formData.yetkiliEmail,
              turTarihi: turTarihi,
              toplamTutar: formData.toplamTutar || formData.tutar,
              odemeMiktari: formData.odemeMiktari || "0",
              odemeTarihi: formData.odemeTarihi,
              destinasyon: formData.destinasyon,
              destinasyonId: formData.destinasyon,
              musteriAdiSoyadi: formData.musteriAdiSoyadi,
              yetiskinSayisi: formData.yetiskinSayisi,
              cocukSayisi: formData.cocukSayisi,
              bebekSayisi: formData.bebekSayisi,
              alisYeri: formData.alisYeri,
              alisSaati: formData.alisSaati,
              paraBirimi: formData.paraBirimi,
              period: currentYear,
            };

            console.log('Rezervasyon düzenlendi - Cari güncelleniyor:', reservationForCari);
            
            // Cari güncelleme için özel fonksiyon çağır
            await ReservationCariService.updateCariFromReservation(reservationForCari);
            console.log('Rezervasyon düzenlemesi cari kartına yansıtıldı');
            
          } catch (cariError) {
            console.error("Rezervasyon cari güncelleme hatası:", cariError);
          }
        }

        // ÖNEMLİ: Sadece başarılı kayıttan sonra localStorage'ı temizle
        clearFormStorage();
        
        // Toast mesajını göster
        toast({
          title: "Başarılı",
          description: isEditMode ? "Rezervasyon başarıyla güncellendi!" : "Rezervasyon başarıyla kaydedildi!",
        })
        
        // Callback verilerini hazırla
        const callbackData = {
          id: isEditMode ? originalReservationId : 'new',
          ...formData,
          turTarihi,
          seriNumarasi,
          katilimcilar
        };
        
        // Önce onSave callback'ini çağır (ana liste güncellemesi için)
        if (onSave) {
          console.log('onSave callback çağrılıyor:', callbackData);
          await onSave(callbackData);
        }
        
        // Düzenleme modu tamamlandıysa özel callback çağır
        if (isEditMode && onEditComplete) {
          console.log('onEditComplete callback çağrılıyor');
          onEditComplete();
          return; // Düzenleme modunda buradan çık
        }

        // Sadece yeni kayıt modunda formu sıfırla veya ana sayfaya yönlendir
        if (!isEditMode) {
          console.log('Yeni kayıt modu - kullanıcı tercihi sorulacak');
          
          // Kullanıcıya seçenek sun: Yeni rezervasyon mu yoksa rezervasyon listesine dön mü?
          const userChoice = confirm("Rezervasyon başarıyla kaydedildi! Yeni bir rezervasyon eklemek ister misiniz?\n\n'Tamam' = Yeni rezervasyon ekle\n'İptal' = Rezervasyon listesine dön");
          
          if (userChoice) {
            // Yeni rezervasyon eklemek istiyor - formu sıfırla
            console.log('Kullanıcı yeni rezervasyon ekleme seçti - form sıfırlanıyor');
            setFormData(getInitialFormData())
            setKatilimcilar([])
            setCurrentStep(1)
            setTarih(undefined)
            setTurTarihi("")
            setError(null)

            // Yeni seri numarası al
            try {
              const newSerial = await getNextSerialNumber()
              setSeriNumarasi(newSerial)
            } catch (err) {
              const randomNum = Math.floor(Math.random() * 1000000) + 1
              setSeriNumarasi(`REZ-${randomNum.toString().padStart(6, "0")}`)
            }
          } else {
            // Ana sayfaya dönmek istiyor
            console.log('Kullanıcı ana sayfaya dönme seçti');
            if (onNavigate) {
              console.log('onNavigate callback çağrılıyor - rezervasyon listesine yönlendiriliyor');
              onNavigate("rezervasyon-liste");
            } else if (onCancel) {
              console.log('onCancel callback çağrılıyor');
              onCancel();
            }
          }
        }

      } else {
        throw new Error(isEditMode ? 'Rezervasyon güncellenemedi' : 'Rezervasyon kaydedilemedi')
      }

    } catch (error) {
      console.error("Rezervasyon işlemi hatası:", error)
      setError(isEditMode ? 'Rezervasyon güncellenirken bir hata oluştu.' : 'Rezervasyon kaydedilirken bir hata oluştu.')
      toast({
        title: "Hata",
        description: isEditMode ? "Rezervasyon güncellenirken bir hata oluştu." : "Rezervasyon kaydedilirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }  // İptal işlemi - localStorage'ı temizle ve ana sayfaya dön
  const handleCancel = () => {
    console.log('İptal butonu tıklandı - localStorage temizleniyor ve ana sayfaya dönülüyor'); 
    try {
      // Sadece localStorage'ı temizle (Firebase'e henüz hiçbir şey kaydedilmemiş)
      clearFormStorage();
      
      console.log("Form durumu temizlendi - Firebase'e hiçbir şey kaydedilmedi");
    } catch (error) {
      console.error("Form durumu temizlenirken hata:", error);
    }
    
    // ÖNEMLİ: Ana sayfaya dönüş için doğru callback'i çağır
    if (onNavigate) {
      console.log('onNavigate callback çağırılıyor - ana dashboard\'a dönülüyor');
      onNavigate("main-dashboard"); // Ana dashboard'a dön
    } else if (onCancel) {
      console.log('onCancel callback çağırılıyor - ana sayfaya dönülüyor');
      onCancel();
    } else {      console.log('Hiçbir callback bulunamadı - formu sıfırlıyorum');      
      // Fallback: Eğer callback yoksa formu sıfla
      setFormData(getInitialFormData());
      setCurrentStep(1);
      setTarih(undefined);
      setTurTarihi("");
      setKatilimcilar([]);
      setError(null);
      
      // Seri numarayı tekrar almaya gerek yok, çünkü artık sadece kaydedildiğinde artırılıyor
      // Mevcut seri numara korunur
    }
  }// Hızlı kaydetme işlemi - GERÇEK Firebase kayıt işlemi
  const handleQuickSave = async () => {
    // Minimum gerekli alanları kontrol et
    if (!isMinimumDataValid()) {
      toast({
        title: "Eksik Bilgi",
        description: "En az müşteri adı, telefon, tur tarihi ve destinasyon alanları doldurulmalıdır.",
        variant: "destructive",
      });
      return;
    }

    // handleSubmit'i çağır - bu Firebase'e gerçek kayıt yapar
    await handleSubmit(new Event('submit') as any);  }

  // Mode değiştiğinde isEditMode'u güncelle
  useEffect(() => {
    const newEditMode = mode === 'edit' || (!!reservationId && !!editData);
    console.log('EditMode güncelleniyor:', { mode, reservationId, editData, newEditMode });
    setIsEditMode(newEditMode);
  }, [mode, reservationId, editData]);
  // EditData ile form doldurma (alternatif düzenleme modu) - En prioriteli
  useEffect(() => {
    console.log('EditData useEffect çalışıyor:', { editData, isEditMode });
    if (editData && isEditMode) {
      console.log('EditData ile form dolduruluyor:', editData);
        // Form data'yı güncelle
      const newFormData = {
        kaydOlusturan: editData.kaydOlusturan || "",
        destinasyon: editData.destinasyon || "",
        yetiskinSayisi: editData.yetiskinSayisi || "",
        cocukSayisi: editData.cocukSayisi || "",
        bebekSayisi: editData.bebekSayisi || "",
        alisSaati: editData.alisSaati || "",
        musteriAdiSoyadi: editData.musteriAdiSoyadi || "",
        telefon: editData.telefon || "",
        email: editData.email || "",
        adres: editData.adres || "",
        tcKimlikPasaport: editData.tcKimlikPasaport || "",
        vatandaslik: editData.vatandaslik || "",
        referansKaynagi: editData.referansKaynagi || "",
        alisYeri: editData.alisYeri || "",
        alisDetaylari: editData.alisDetaylari || {},
        firma: editData.firma || "",
        yetkiliKisi: editData.yetkiliKisi || "",
        yetkiliTelefon: editData.yetkiliTelefon || "",
        yetkiliEmail: editData.yetkiliEmail || "",
        odemeYapan: editData.odemeYapan || "",
        odemeYontemi: editData.odemeYontemi || "",
        odemeDurumu: editData.odemeDurumu || "",
        toplamTutar: editData.toplamTutar || editData.tutar || "",
        odemeMiktari: editData.odemeMiktari || "",
        tutar: editData.tutar || "", // Geriye uyumluluk için
        paraBirimi: editData.paraBirimi || "EUR",
        odemeTarihi: editData.odemeTarihi || "",
        odemeNotlari: editData.odemeNotlari || "",
        notlar: editData.notlar || "",
        ozelIstekler: editData.ozelIstekler || "",
      };
      
      console.log('Form data güncelleniyor:', newFormData);
      setFormData(newFormData);
      setTurTarihi(editData.turTarihi || "");
      setSeriNumarasi(editData.seriNumarasi || "");
      setKatilimcilar(editData.katilimcilar || []);
      setOriginalReservationId(editData.id || reservationId || "");
      
      if (editData.turTarihi) {
        setTarih(new Date(editData.turTarihi));
      }
      
      console.log('EditData ile form doldurma tamamlandı');
    }
  }, [editData, isEditMode, reservationId]);
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">
          {isEditMode ? "Rezervasyon verisi yükleniyor..." : "Form hazırlanıyor..."}
        </span>
      </div>
    )
  }

  return (
    <div className="p-6">
      <Card className="max-w-4xl mx-auto">        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {isEditMode ? "Rezervasyon Düzenle" : "Yeni Rezervasyon Girişi"}
            <div className="flex items-center gap-2">
              {isEditMode && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  ID: {reservationId}
                </span>
              )}
              <span className="text-sm font-normal text-gray-500">
                Seri No: {seriNumarasi}
              </span>
            </div>
          </CardTitle>
        </CardHeader><CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form>            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-2">
                {steps.map((step) => (
                  <div key={step.id} className="flex flex-col items-center flex-1 mx-1">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(step.id)}
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                        currentStep >= step.id
                          ? "bg-[#00a1c6] text-white"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                    </button>
                    <div className={`mt-2 text-xs text-center px-1 py-1 rounded ${
                      currentStep === step.id 
                        ? "bg-[#00a1c6] text-white font-medium" 
                        : "text-gray-600"
                    }`}>
                      {step.title}
                    </div>
                  </div>
                ))}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#00a1c6] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / steps.length) * 100}%` }}
                ></div>
              </div>
            </div>            {/* Step 1: Tur Bilgileri */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2">
                    <Label htmlFor="kaydOlusturan">Kaydı Oluşturan <span className="text-red-500">*</span></Label>
                    <Input
                      id="kaydOlusturan"
                      value={formData.kaydOlusturan}
                      onChange={(e) => handleInputChange("kaydOlusturan", e.target.value)}
                      placeholder="Personel adı"
                      className={!formData.kaydOlusturan ? "border-red-300" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tur Tarihi <span className="text-red-500">*</span></Label>                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${!tarih ? "border-red-300" : ""}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {tarih ? format(tarih, "PPP", { locale: tr }) : "Tarih seçin"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={tarih}
                          onSelect={(date) => {
                            setTarih(date)
                            if (date) {
                              setTurTarihi(format(date, "yyyy-MM-dd"))
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>                  <div className="space-y-2">
                    <Label htmlFor="destinasyon">Destinasyon <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.destinasyon}
                      onValueChange={(value) => handleInputChange("destinasyon", value)}
                    >
                      <SelectTrigger className={!formData.destinasyon ? "border-red-300" : ""}>
                        <SelectValue placeholder="Destinasyon seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinasyonlar.map((dest) => (
                          <SelectItem key={dest.id} value={dest.id}>
                            {dest.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="yetiskinSayisi">Yetişkin Sayısı</Label>
                    <Input
                      id="yetiskinSayisi"
                      type="number"
                      value={formData.yetiskinSayisi}
                      onChange={(e) => handleInputChange("yetiskinSayisi", e.target.value)}
                      placeholder="0"
                    />
                  </div>                <div className="space-y-2">
                    <Label htmlFor="cocukSayisi">Çocuk Sayısı</Label>
                    <Input
                      id="cocukSayisi"
                      type="number"
                      value={formData.cocukSayisi}
                      onChange={(e) => handleInputChange("cocukSayisi", e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bebekSayisi">Bebek Sayısı</Label>
                    <Input
                      id="bebekSayisi"
                      type="number"
                      value={formData.bebekSayisi}
                      onChange={(e) => handleInputChange("bebekSayisi", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            )}            {/* Step 2: Müşteri & Alış Bilgileri */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Müşteri Bilgileri Bölümü */}
                <div>
                  <h3 className="text-lg font-medium mb-4 text-[#00a1c6]">Müşteri Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="musteriAdiSoyadi">Müşteri Adı Soyadı <span className="text-red-500">*</span></Label>
                      <Input
                        id="musteriAdiSoyadi"
                        value={formData.musteriAdiSoyadi}
                        onChange={(e) => handleInputChange("musteriAdiSoyadi", e.target.value)}
                        placeholder="Müşteri adını girin"
                        className={!formData.musteriAdiSoyadi ? "border-red-300" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefon">Telefon <span className="text-red-500">*</span></Label>
                      <Input
                        id="telefon"
                        value={formData.telefon}
                        onChange={(e) => handleInputChange("telefon", e.target.value)}
                        onKeyPress={handlePhoneKeyPress}
                        placeholder="+90 532 456 12 45"
                        className={!formData.telefon ? "border-red-300" : ""}
                      />
                    </div>
                  </div>
                </div>

                {/* Müşteriyi Alacağım Yer Bölümü */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4 text-[#00a1c6]">Müşteriyi Alacağım Yer</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="alisYeri">Alış Yeri Türü <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.alisYeri}
                        onValueChange={(value) => handleInputChange("alisYeri", value)}
                      >
                        <SelectTrigger className={!formData.alisYeri ? "border-red-300" : ""}>
                          <SelectValue placeholder="Alış yeri seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {ornekAlisYerleri.map((yer) => (
                            <SelectItem key={yer} value={yer}>
                              {yer}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dinamik Alış Detayları - Sadece alış yeri seçildiğinde göster */}
                    {formData.alisYeri && 
                     formData.alisYeri.trim() !== "" && 
                     formData.alisYeri !== "default" && 
                     formData.alisYeri !== "undefined" && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border transition-all duration-300 ease-in-out">
                        <h4 className="text-md font-medium mb-3 text-gray-700">
                          {formData.alisYeri} için Detay Bilgileri
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {getAlisDetayAlanlari().map((alan) => (
                            <div key={alan} className="space-y-2">
                              <Label>{alan}</Label>
                              {alan === "Alış Saati" || alan === "Varış Saati" ? (
                                <div className="relative">
                                  <Input
                                    type="time"
                                    placeholder="HH:MM"
                                    value={formData.alisDetaylari[alan] || ""}
                                    onChange={(e) => handleAlisDetayChange(alan, e.target.value)}
                                    className="pr-10"
                                  />
                                </div>
                              ) : isFirmaSecimAlani(alan) ? (
                                <Select
                                  value={formData.alisDetaylari[alan] || ""}
                                  onValueChange={(value) => handleFirmaSecimi(alan, value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={`${alan} seçin`} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {filteredFirmalar.length > 0 ? (
                                      filteredFirmalar.map((firma) => (
                                        <SelectItem key={firma.id} value={firma.name}>
                                          {firma.name}
                                          {firma.address && (
                                            <span className="text-xs text-gray-500 ml-2">
                                              - {firma.address.slice(0, 30)}...
                                            </span>
                                          )}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="no-firms" disabled>
                                        Bu kategoride firma bulunamadı
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  placeholder={`${alan} girin`}
                                  value={formData.alisDetaylari[alan] || ""}
                                  onChange={(e) => handleAlisDetayChange(alan, e.target.value)}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Aracı Bilgileri Bölümü */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4 text-[#00a1c6]">Aracı Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firma">
                        Aracı Firma
                        <span className="text-sm text-gray-500 ml-2">
                          (Tüm firmalar)
                        </span>
                      </Label>
                      <Select
                        value={formData.firma}
                        onValueChange={handleAraciFirmaSecimi}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Aracı firma seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {allFirmalar.length > 0 ? (
                            allFirmalar.map((firma) => (
                              <SelectItem key={firma.id} value={firma.name}>
                                <div className="flex items-center space-x-2 truncate">
                                  <span className="font-medium">{firma.name}</span>
                                  {firma.category && (
                                    <span className="text-xs text-blue-600">({firma.category})</span>
                                  )}
                                  {firma.address && (
                                    <span className="text-xs text-gray-500">- {firma.address.slice(0, 25)}...</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-companies" disabled>
                              Hiç firma bulunamadı
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="yetkiliKisi">Yetkili Kişi</Label>
                      <Input
                        id="yetkiliKisi"
                        value={formData.yetkiliKisi}
                        onChange={(e) => handleInputChange("yetkiliKisi", e.target.value)}
                        placeholder="Yetkili adı soyadı"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="yetkiliTelefon">Yetkili Telefon</Label>
                      <Input
                        id="yetkiliTelefon"
                        value={formData.yetkiliTelefon}
                        onChange={(e) => handleInputChange("yetkiliTelefon", e.target.value)}
                        onKeyPress={handlePhoneKeyPress}
                        placeholder="+90 532 456 12 45"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="yetkiliEmail">Yetkili E-posta</Label>
                      <Input
                        id="yetkiliEmail"
                        type="email"
                        value={formData.yetkiliEmail}
                        onChange={(e) => handleInputChange("yetkiliEmail", e.target.value)}
                        placeholder="yetkili@firma.com"
                      />
                    </div>
                  </div>
                </div>


              </div>
            )}            {/* Step 3: Ödeme */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Toplam Tutar - Her durumda gösterilir */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-md font-medium text-blue-800 mb-3">
                    Tur Tutarı
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="toplamTutar">Toplam Tutar <span className="text-red-500">*</span></Label>
                      <Input
                        id="toplamTutar"
                        type="number"
                        value={formData.toplamTutar || formData.tutar}
                        onChange={(e) => {
                          handleInputChange("toplamTutar", e.target.value);
                          // Geriye uyumluluk için tutar alanını da güncelle
                          handleInputChange("tutar", e.target.value);
                        }}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className={!(formData.toplamTutar || formData.tutar) ? "border-red-300" : ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paraBirimi">Para Birimi</Label>
                      <Select
                        value={formData.paraBirimi}
                        onValueChange={(value) => handleInputChange("paraBirimi", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Para birimi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">Euro (€)</SelectItem>
                          <SelectItem value="USD">Dolar ($)</SelectItem>
                          <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
                          <SelectItem value="GBP">Sterlin (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Ödeme Yapan ve Ödeme Durumu */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="odemeYapan">Kim Ödeme Yapacak/Yaptı? <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.odemeYapan}
                      onValueChange={(value) => handleInputChange("odemeYapan", value)}
                    >
                      <SelectTrigger className={!formData.odemeYapan ? "border-red-300" : ""}>
                        <SelectValue placeholder="Ödeme yapacak kişi/kurum" />
                      </SelectTrigger>
                      <SelectContent>
                        {odemeYapanlar.map((odemeYapan) => (
                          <SelectItem key={odemeYapan} value={odemeYapan}>
                            {odemeYapan}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="odemeDurumu">Ödeme Durumu <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.odemeDurumu}
                      onValueChange={(value) => handleInputChange("odemeDurumu", value)}
                    >
                      <SelectTrigger className={!formData.odemeDurumu ? "border-red-300" : ""}>
                        <SelectValue placeholder="Ödeme durumu seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {odemeDurumlari.map((odemeDurumu) => (
                          <SelectItem key={odemeDurumu} value={odemeDurumu}>
                            {odemeDurumu}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Ödeme Yapıldıysa Detay Bilgileri */}
                {(formData.odemeDurumu === "Ödendi" || formData.odemeDurumu === "Kısmi Ödendi" || formData.odemeDurumu === "Tamamlandı") && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200 space-y-4">
                    <h4 className="text-md font-medium text-green-800 mb-3">
                      Ödeme Detayları
                    </h4>
                    
                    {/* Ödeme Yöntemi ve Ödeme Miktarı */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="odemeYontemi">Ödeme Yöntemi <span className="text-red-500">*</span></Label>
                        <Select
                          value={formData.odemeYontemi}
                          onValueChange={(value) => handleInputChange("odemeYontemi", value)}
                        >
                          <SelectTrigger className={!formData.odemeYontemi ? "border-red-300" : ""}>
                            <SelectValue placeholder="Ödeme yöntemi seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Nakit">Nakit</SelectItem>
                            <SelectItem value="Havale/EFT">Havale/EFT</SelectItem>
                            <SelectItem value="Kredi Kartı">Kredi Kartı</SelectItem>
                            <SelectItem value="Link ile Ödeme">Link ile Ödeme</SelectItem>
                            <SelectItem value="Çek">Çek</SelectItem>
                            <SelectItem value="Kredi">Kredi</SelectItem>
                            <SelectItem value="Karma Ödeme">Karma Ödeme</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="odemeMiktari">Ödenen Miktar <span className="text-red-500">*</span></Label>
                        <Input
                          id="odemeMiktari"
                          type="number"
                          value={formData.odemeMiktari}
                          onChange={(e) => handleInputChange("odemeMiktari", e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className={!formData.odemeMiktari ? "border-red-300" : ""}
                        />
                      </div>
                    </div>

                    {/* Kalan Tutar Gösterimi */}
                    {formData.toplamTutar && formData.odemeMiktari && (
                      <div className="p-3 bg-white rounded border border-green-300">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Kalan Tutar:</span>
                          <span className={`text-sm font-bold ${
                            (parseFloat(formData.toplamTutar || formData.tutar || "0") - parseFloat(formData.odemeMiktari || "0")) > 0 
                              ? "text-red-600" 
                              : "text-green-600"
                          }`}>
                            {(() => {
                              const kalan = parseFloat(formData.toplamTutar || formData.tutar || "0") - parseFloat(formData.odemeMiktari || "0");
                              const formatted = Math.abs(kalan).toLocaleString('tr-TR', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2
                              });
                              const currency = formData.paraBirimi === 'EUR' ? '€' : 
                                             formData.paraBirimi === 'USD' ? '$' : 
                                             formData.paraBirimi === 'GBP' ? '£' : '₺';
                              
                              if (kalan > 0) {
                                return `${formatted} ${currency} (Borç)`;
                              } else if (kalan < 0) {
                                return `${formatted} ${currency} (Fazla Ödeme)`;
                              } else {
                                return `0 ${currency} (Tam Ödendi)`;
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Ödeme Tarihi */}
                    <div className="space-y-2">
                      <Label htmlFor="odemeTarihi">Ödeme Tarihi <span className="text-red-500">*</span></Label>
                      <Input
                        id="odemeTarihi"
                        type="date"
                        value={formData.odemeTarihi}
                        onChange={(e) => handleInputChange("odemeTarihi", e.target.value)}
                        className={!formData.odemeTarihi ? "border-red-300" : ""}
                      />
                    </div>
                  </div>
                )}

                {/* Ödeme Notları - Her durumda gösterilir */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-2">
                    <Label htmlFor="odemeNotlari" className="text-gray-800 font-medium">
                      Ödeme ile İlgili Notlar
                    </Label>
                    <Textarea
                      id="odemeNotlari"
                      value={formData.odemeNotlari || ""}
                      onChange={(e) => handleInputChange("odemeNotlari", e.target.value)}
                      placeholder="Ödeme ile ilgili özel notlar, ödeme koşulları, taksit bilgileri, ödeme anlaşmaları, kimden ne kadar alınacak vb."
                      rows={3}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Ek Bilgiler */}
            {currentStep === 4 && (
              <div className="space-y-1">
                <div className="space-y-1">
                  <Textarea
                    id="notlar"
                    value={formData.notlar}
                    onChange={(e) => handleInputChange("notlar", e.target.value)}
                    placeholder="Rezervasyon ile ilgili notlar"
                    rows={2}
                    className="py-0 my-0 min-h-[24px] leading-tight text-[13px] resize-none"
                  />
                </div>
              </div>
            )}            {/* Step 5: Özet */}
            {currentStep === 5 && (
              <div className="space-y-4">
                {/* 1. Rezervasyon Bilgileri */}
                <Card>
                  <CardHeader className="pb-2 pt-2">
                    <CardTitle className="text-[#00a1c6]">Rezervasyon Bilgileri</CardTitle>
                  </CardHeader>                  <CardContent className="pt-2 pb-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <div><span className="font-medium">Seri No:</span> {seriNumarasi}</div>
                        <div><span className="font-medium">Tur Tarihi:</span> {turTarihi}</div>
                      </div>
                      <div className="space-y-1">
                        <div><span className="font-medium">Destinasyon:</span> {
                          destinasyonlar.find(dest => dest.id === formData.destinasyon)?.name || formData.destinasyon || "-"
                        }</div>
                        <div><span className="font-medium">Katılımcı Sayısı:</span> {Number(formData.yetiskinSayisi || 0) + Number(formData.cocukSayisi || 0) + Number(formData.bebekSayisi || 0)} kişi</div>
                      </div>
                      <div className="space-y-1">
                        <div><span className="font-medium">Yetişkin:</span> {formData.yetiskinSayisi || 0}</div>
                        <div><span className="font-medium">Çocuk:</span> {formData.cocukSayisi || 0}</div>
                        <div><span className="font-medium">Bebek:</span> {formData.bebekSayisi || 0}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Alış Yeri & Müşteri Bilgileri */}
                {formData.alisYeri && (
                  <Card>
                    <CardHeader className="pb-2 pt-2">
                      <CardTitle className="text-[#00a1c6]">Alış Yeri & Müşteri Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2 pb-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div><span className="font-medium">Ad Soyad:</span> {formData.musteriAdiSoyadi}</div>
                          <div><span className="font-medium">Telefon:</span> {formData.telefon}</div>
                          <div><span className="font-medium">Alış Yeri:</span> {formData.alisYeri}</div>
                        </div>
                        <div className="space-y-1">
                          <div><span className="font-medium">Aracı Firma:</span> {formData.firma || "Belirtilmedi"}</div>
                          {formData.yetkiliKisi && (
                            <div><span className="font-medium">Yetkili:</span> {formData.yetkiliKisi}</div>
                          )}
                          {formData.yetkiliTelefon && (
                            <div><span className="font-medium">Yetkili Tel:</span> {formData.yetkiliTelefon}</div>
                          )}
                        </div>
                      </div>
                      
                      {/* Alış Detayları */}
                      {Object.keys(formData.alisDetaylari).length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="font-medium mb-2">Detaylar:</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(formData.alisDetaylari).map(([key, value]) => (
                              value && (
                                <div key={key} className="text-sm">
                                  <span className="text-gray-600">{key}:</span> <span className="ml-1">{value}</span>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}


                {/* 3. Ödeme Bilgileri */}
                <Card>
                  <CardHeader className="pb-2 pt-2">
                    <CardTitle className="text-[#00a1c6]">Ödeme Bilgileri</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2 pb-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <div><span className="font-medium">Ödeme Yapan:</span> {formData.odemeYapan || "-"}</div>
                        <div><span className="font-medium">Ödeme Durumu:</span> {formData.odemeDurumu || "-"}</div>
                      </div>
                      <div className="space-y-1">
                        {(formData.odemeDurumu === "Ödendi" || formData.odemeDurumu === "Kısmi Ödendi" || formData.odemeDurumu === "Tamamlandı") && (
                          <div><span className="font-medium">Ödeme Yöntemi:</span> {formData.odemeYontemi || "-"}</div>
                        )}
                        <div><span className="font-medium">Toplam Tutar:</span> {formData.toplamTutar || formData.tutar || "-"} {formData.paraBirimi}</div>
                        {formData.odemeMiktari && (
                          <div><span className="font-medium">Ödenen Miktar:</span> {formData.odemeMiktari} {formData.paraBirimi}</div>
                        )}
                        {(formData.toplamTutar || formData.tutar) && formData.odemeMiktari && (
                          <div><span className="font-medium">Kalan Tutar:</span> 
                            <span className={
                              (parseFloat(formData.toplamTutar || formData.tutar || "0") - parseFloat(formData.odemeMiktari || "0")) > 0 
                                ? "text-red-600 font-bold" 
                                : "text-green-600 font-bold"
                            }>
                              {Math.abs(parseFloat(formData.toplamTutar || formData.tutar || "0") - parseFloat(formData.odemeMiktari || "0")).toLocaleString('tr-TR', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2
                              })} {formData.paraBirimi}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        {(formData.odemeDurumu === "Ödendi" || formData.odemeDurumu === "Kısmi Ödendi" || formData.odemeDurumu === "Tamamlandı") && formData.odemeTarihi && (
                          <div><span className="font-medium">Ödeme Tarihi:</span> {formData.odemeTarihi}</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Ödeme Notları - Varsa alt bölümde göster */}
                    {formData.odemeNotlari && (
                      <div className="mt-4 pt-3 border-t">
                        <div className="font-medium mb-2">Ödeme Notları:</div>
                        <div className="text-sm bg-gray-50 p-3 rounded border">
                          {formData.odemeNotlari}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 4. Ek Bilgiler */}
                {(formData.notlar) && (
                  <Card>
                    <CardHeader className="pb-2 pt-2">
                      <CardTitle className="text-[#00a1c6]">Ek Bilgiler</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2 pb-2">
                      {formData.notlar && (
                        <div className="mb-3">
                          <div className="font-medium mb-1">Notlar:</div>
                          <div className="text-sm bg-gray-50 p-2 rounded border whitespace-pre-line">
                            {formData.notlar}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {isEditMode && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm text-blue-700 font-medium">
                      ℹ️ Bu rezervasyon güncellenecektir.
                    </div>
                  </div>
                )}
              </div>
            )}{/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Önceki
              </Button>              <div className="flex space-x-2">
                {/* İptal Butonu */}
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={saving}
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  İptal
                </Button>

                {currentStep < steps.length ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
                    className="bg-[#00a1c6] hover:bg-[#008bb3]"
                  >
                    Sonraki
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (                  <Button
                    type="button"
                    onClick={async () => await handleSubmit(new Event('submit') as any)}
                    disabled={saving || !isMinimumDataValid()}
                    className={isEditMode ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isEditMode ? "Güncelleniyor..." : "Kaydediliyor..."}
                      </>
                    ) : (
                      <>
                        {isEditMode ? (
                          <>
                            <Edit className="w-4 h-4 mr-2" />
                            Güncelle
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Kaydet
                          </>
                        )}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
