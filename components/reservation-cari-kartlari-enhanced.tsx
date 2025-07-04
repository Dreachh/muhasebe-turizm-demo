"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { 
  ReservationCariService, 
  ReservationCari, 
  ReservationBorcDetay, 
  ReservationOdemeDetay 
} from "@/lib/reservation-cari-service";
import { getCompanies, getDestinations, getReservationDestinations } from "@/lib/db-firebase";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Edit, 
  Trash2,
  Calendar,
  Users,
  Clock,
  Euro,
  ChevronDown,
  ChevronRight,
  Eye,
  RefreshCw,
  Loader2,
  Settings,
  X,
  Minus
} from "lucide-react";

interface ReservationCariKartlariEnhancedProps {
  period: string;
}

export default function ReservationCariKartlariEnhanced({ period }: ReservationCariKartlariEnhancedProps) {
  const [cariList, setCariList] = useState<ReservationCari[]>([]);
  const [filteredCariList, setFilteredCariList] = useState<ReservationCari[]>([]);
  const [expandedCariIds, setExpandedCariIds] = useState<Set<string>>(new Set());
  const [cariDetails, setCariDetails] = useState<Record<string, {
    borclar: any[];
    odemeler: ReservationOdemeDetay[];
    detayliListe: any[];
  }>>({});
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [statistics, setStatistics] = useState({
    totalCariCount: 0,
    totalReservations: 0,
    paidReservations: 0,
    unpaidReservations: 0
  });
  const [totals, setTotals] = useState<Record<string, { totalDebt: number; totalPayment: number; balance: number }>>({});
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "debt" | "credit">("all");
  const [showNewCariDialog, setShowNewCariDialog] = useState(false);
  const [showOdemeDialog, setShowOdemeDialog] = useState(false);
  const [selectedBorcForPayment, setSelectedBorcForPayment] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Yeni state'ler - cari kart içindeki sekme kontrolü için
  const [activeTabByCari, setActiveTabByCari] = useState<Record<string, 'details' | 'payments'>>({});
  
  // Tarih filtreleme state'leri - her cari için ayrı
  const [dateFilterByCari, setDateFilterByCari] = useState<Record<string, {
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>>({});
  const router = useRouter();

  // Yeni cari formu
  const [newCariForm, setNewCariForm] = useState({
    companyName: "",
    contactPerson: "",
    contactPhone: "",
    contactEmail: "",
    address: "",
    taxNumber: "",
    notes: "",
  });

  // Ödeme formu - geliştirilmiş
  const [odemeForm, setOdemeForm] = useState({
    tutar: "",
    tarih: new Date().toISOString().split('T')[0],
    aciklama: "",
    odemeYontemi: "",
    odemeYapan: "",
    fisNumarasi: "",
    paraBirimi: "EUR", // Yeni alan - para birimi
    odemeType: "payment", // payment (ödeme) veya refund (iade/geri ödeme)
  });

  // Seçilen para birimindeki cari bakiyeyi hesapla
  const getCurrentBalanceForCurrency = (cariId: string, currency: string): number => {
    const details = cariDetails[cariId];
    if (!details) return 0;

    let balance = 0;
    
    // Borçları topla (sadece seçilen para birimi)
    details.borclar.forEach((borc: any) => {
      if ((borc.paraBirimi || 'EUR') === currency) {
        balance += (borc.tutar || 0) - (borc.odeme || 0);
      }
    });
    
    // Genel ödemeleri çıkar (sadece seçilen para birimi)
    details.odemeler.forEach((odeme: any) => {
      const isGeneralPayment = !odeme.reservationId || odeme.reservationId.trim() === '';
      if (isGeneralPayment && (odeme.paraBirimi || 'EUR') === currency) {
        balance -= odeme.tutar || 0;
      }
    });
    
    return balance;
  };

  // Tarih filtreleme fonksiyonu - rezervasyonlar için
  const getFilteredReservations = (reservations: any[], cariId: string): any[] => {
    const filter = dateFilterByCari[cariId];
    if (!filter || !filter.isActive || !filter.startDate || !filter.endDate) {
      return reservations;
    }

    const startDate = new Date(filter.startDate);
    const endDate = new Date(filter.endDate);
    endDate.setHours(23, 59, 59, 999); // Bitiş günü dahil

    return reservations.filter((item) => {
      if (!item.turTarih) return false;
      const turDate = new Date(item.turTarih);
      return turDate >= startDate && turDate <= endDate;
    });
  };

  // Tarih filtreleme fonksiyonu - ödemeler için
  const getFilteredPayments = (payments: any[], cariId: string): any[] => {
    const filter = dateFilterByCari[cariId];
    if (!filter || !filter.isActive || !filter.startDate || !filter.endDate) {
      return payments;
    }

    const startDate = new Date(filter.startDate);
    const endDate = new Date(filter.endDate);
    endDate.setHours(23, 59, 59, 999); // Bitiş günü dahil

    return payments.filter((payment) => {
      if (!payment.tarih) return false;
      const paymentDate = new Date(payment.tarih);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
  };

  // Tarih filtresini temizle
  const clearDateFilter = (cariId: string) => {
    setDateFilterByCari(prev => ({
      ...prev,
      [cariId]: {
        startDate: '',
        endDate: '',
        isActive: false
      }
    }));
  };

  // Tarih filtresini uygula
  const applyDateFilter = (cariId: string, startDate: string, endDate: string) => {
    setDateFilterByCari(prev => ({
      ...prev,
      [cariId]: {
        startDate,
        endDate,
        isActive: true
      }
    }));
  };
  useEffect(() => {
    loadCariList();
    loadAvailableCompanies();
    loadDestinations();
  }, [period]);

  useEffect(() => {
    filterCariList();
  }, [cariList, searchTerm, filterType]);

  // Ana cari listesini yüklerken tüm detayları da yükle
  const loadCariList = async () => {
    try {
      setLoading(true);
      const data = await ReservationCariService.getAllCari(period);
      setCariList(data);
      
      // Tüm cari detaylarını toplu yükle - HEM borç/ödeme HEM DE detaylı liste
      setDetailsLoading(true);
      try {
        console.log('📊 Tüm cari detayları yükleniyor...');
        const allDetails = await Promise.all(
          data.map(async (cari) => {
            try {
              console.log(`🔄 ${cari.companyName} için detaylar yükleniyor...`);
              const [borclar, odemeler, detayliListe] = await Promise.all([
                ReservationCariService.getBorcDetaysByCariId(cari.id!),
                ReservationCariService.getOdemeDetaysByCariId(cari.id!),
                ReservationCariService.getBorcDetaylarWithReservationInfo(cari.id!) // Detaylı liste de baştan yükle
              ]);
              
              console.log(`✅ ${cari.companyName} detayları: Borçlar=${borclar.length}, Ödemeler=${odemeler.length}, Detaylı Liste=${detayliListe.length}`);
              
              // Ödeme detaylarını inceleme
              if (odemeler.length > 0) {
                console.log(`🧾 ${cari.companyName} için ödemeler:`);
                odemeler.forEach((odeme: any, index: number) => {
                  const isReservationLinked = (odeme.reservationId && odeme.reservationId.trim() !== '') || 
                                            (odeme.borcId && odeme.borcId.trim() !== '');
                  console.log(`   Ödeme #${index+1}: ID=${odeme.id}, Tutar=${odeme.tutar}, Tarih=${odeme.tarih}, ReservationID=${odeme.reservationId || 'Genel'}, BorcID=${odeme.borcId || 'Genel'}, Rezervasyon Bağlantılı: ${isReservationLinked ? 'EVET' : 'HAYIR'}`);
                });
              } else {
                console.warn(`⚠️ ${cari.companyName} için ödeme bulunamadı!`);
              }
              
              return {
                cariId: cari.id!,
                details: { borclar, odemeler, detayliListe }
              };
            } catch (error) {
              console.error(`❌ Cari detayları yüklenirken hata (${cari.companyName}):`, error);
              return {
                cariId: cari.id!,
                details: { borclar: [], odemeler: [], detayliListe: [] }
              };
            }
          })
        );

        // Tüm detayları tek seferde state'e yaz
        const newCariDetails: Record<string, any> = {};
        allDetails.forEach(({ cariId, details }) => {
          newCariDetails[cariId] = details;
        });
        
        setCariDetails(newCariDetails);
        console.log('📋 Tüm cari detayları yüklendi ve state\'e yazıldı');
      } catch (error) {
        console.error("Cari detayları toplu yükleme hatası:", error);
      } finally {
        setDetailsLoading(false);
      }
      
      // İstatistikleri de yükle
      await loadStatistics();
    } catch (error) {
      console.error("Cari listesi yüklenirken hata:", error);
      toast({
        title: "Hata",
        description: "Cari listesi yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Cari detayları artık loadCariList'te yükleniyor

  // Cari kartını sil - otomatik güncelleme ile
  const handleDeleteCari = async (cari: ReservationCari) => {
    if (!cari.id) return;
    
    const isConfirmed = window.confirm(
      `"${cari.companyName}" cari kartını ve tüm ilgili kayıtları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
    );
    
    if (!isConfirmed) return;
    
    try {
      await ReservationCariService.deleteCari(cari.id);
      
      // UI'den cari kartını kaldır
      setCariList(prevList => prevList.filter(c => c.id !== cari.id));
      
      // Cari detaylarından da kaldır
      setCariDetails(prev => {
        const updated = { ...prev };
        delete updated[cari.id!];
        return updated;
      });
      
      // Genişletilmiş cari listesinden kaldır
      setExpandedCariIds(prev => {
        const updated = new Set(prev);
        updated.delete(cari.id!);
        return updated;
      });
      
      // İstatistikleri güncelle
      await loadStatistics();
      
      toast({
        title: "Başarılı",
        description: `"${cari.companyName}" cari kartı başarıyla silindi`,
      });
    } catch (error) {
      console.error("Cari silme hatası:", error);
      toast({
        title: "Hata",
        description: "Cari kartı silinirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const filterCariList = () => {
    let filtered = cariList.filter(cari =>
      cari.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cari.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cari.contactPhone?.includes(searchTerm)
    );

    if (filterType === "debt") {
      filtered = filtered.filter(cari => cari.balance > 0);
    } else if (filterType === "credit") {
      filtered = filtered.filter(cari => cari.balance < 0);
    }

    setFilteredCariList(filtered);
  };

  // Mevcut firmaları yükle
  const loadAvailableCompanies = async () => {
    try {
      const companiesData = await getCompanies();
      setCompanies(companiesData || []);
      setAvailableCompanies(companiesData || []);
    } catch (error) {
      console.error("Firma listesi yüklenirken hata:", error);
      setCompanies([]);
      setAvailableCompanies([]);
    }
  };

  // Destinasyonları yükle
  const loadDestinations = async () => {
    try {
      const destinationsData = await getReservationDestinations();
      setDestinations(destinationsData || []);
    } catch (error) {
      console.error("Destinasyon listesi yüklenirken hata:", error);
      setDestinations([]);
    }
  };

  // İstatistikleri yükle - loadCariList içinde çağrılacak
  const loadStatistics = async () => {
    try {
      // İstatistikleri cari listesinden hesapla
      const totalCariCount = cariList.length;
      let totalReservations = 0;
      let paidReservations = 0;
      
      Object.values(cariDetails).forEach(details => {
        totalReservations += details.detayliListe.length;
        paidReservations += details.detayliListe.filter(item => item.odemeDurumu === 'Ödendi').length;
      });
      
      const unpaidReservations = totalReservations - paidReservations;

      setStatistics({
        totalCariCount,
        totalReservations,
        paidReservations,
        unpaidReservations
      });

      // Para birimi totalleri hesapla
      const newTotals: Record<string, { totalDebt: number; totalPayment: number; balance: number }> = {};
      
      cariList.forEach(cari => {
        const details = cariDetails[cari.id!];
        if (details) {
          details.borclar.forEach((borc: any) => {
            const currency = borc.paraBirimi || 'EUR';
            if (!newTotals[currency]) {
              newTotals[currency] = { totalDebt: 0, totalPayment: 0, balance: 0 };
            }
            newTotals[currency].totalDebt += borc.tutar || 0;
            newTotals[currency].totalPayment += borc.odeme || 0;
            newTotals[currency].balance += (borc.tutar || 0) - (borc.odeme || 0);
          });
        }
      });

      setTotals(newTotals);
      console.log("İstatistikler güncellendi");
    } catch (error) {
      console.error("İstatistik yükleme hatası:", error);
    }
  };

  const toggleCariExpansion = async (cari: ReservationCari) => {
    const cariId = cari.id!;
    const newExpandedIds = new Set(expandedCariIds);
    
    if (expandedCariIds.has(cariId)) {
      // Cari kapatılıyor
      newExpandedIds.delete(cariId);
    } else {
      // Cari açılıyor
      newExpandedIds.add(cariId);
      
      // Varsayılan tab'ı details olarak ayarla
      if (!activeTabByCari[cariId]) {
        setActiveTabByCari(prev => ({ ...prev, [cariId]: 'details' }));
      }
      
      // Her cari açıldığında verileri yenile (otomatik güncelleme yok artık)
      try {
        console.log(`🔄 ${cari.companyName} için detaylar yeniden yükleniyor...`);
        setDetailsLoading(true);
        
        const [borclar, odemeler, detayliListe] = await Promise.all([
          ReservationCariService.getBorcDetaysByCariId(cariId),
          ReservationCariService.getOdemeDetaysByCariId(cariId),
          ReservationCariService.getBorcDetaylarWithReservationInfo(cariId)
        ]);
        
        // Ödeme detaylarını inceleme (log)
        if (odemeler.length > 0) {
          console.log(`📋 ${cari.companyName} için ${odemeler.length} ödeme bulundu:`);
          odemeler.forEach((odeme: any, index: number) => {
            const isReservationLinked = (odeme.reservationId && odeme.reservationId.trim() !== '') || 
                                     (odeme.borcId && odeme.borcId.trim() !== '');
            console.log(`   Ödeme #${index+1}: ID=${odeme.id}, Tutar=${odeme.tutar}, Tarih=${odeme.tarih}, ReservationID=${odeme.reservationId || 'Genel'}, BorcID=${odeme.borcId || 'Genel'}, Rezervasyon Bağlantılı: ${isReservationLinked ? 'EVET' : 'HAYIR'}`);
          });
        } else {
          console.warn(`⚠️ ${cari.companyName} için ödeme bulunamadı!`);
        }
        
        setCariDetails(prev => ({
          ...prev,
          [cariId]: { borclar, odemeler, detayliListe }
        }));
        
        console.log(`✅ ${cari.companyName} detayları güncellendi:`, { borclar: borclar.length, odemeler: odemeler.length, detayliListe: detayliListe.length });
      } catch (error) {
        console.error("Detay yükleme hatası:", error);
        toast({
          title: "Hata",
          description: "Cari detayları yüklenirken bir hata oluştu",
          variant: "destructive",
        });
      } finally {
        setDetailsLoading(false);
      }
    }
    
    setExpandedCariIds(newExpandedIds);
  };

  const handleCreateCari = async () => {
    try {
      if (!newCariForm.companyName.trim()) {
        toast({
          title: "Hata",
          description: "Şirket adı gereklidir",
          variant: "destructive",
        });
        return;
      }

      await ReservationCariService.createCari({
        ...newCariForm,
        period,
      });

      toast({
        title: "Başarılı",
        description: "Yeni cari oluşturuldu",
      });

      setShowNewCariDialog(false);
      setNewCariForm({
        companyName: "",
        contactPerson: "",
        contactPhone: "",
        contactEmail: "",
        address: "",
        taxNumber: "",
        notes: "",
      });

      // Otomatik güncelleme sistemi devreye girecek
      // Manual yenileme yerine sadece bekleme yap
      setTimeout(() => {
        loadCariList();
      }, 1000);
    } catch (error) {
      console.error("Cari oluşturma hatası:", error);
      toast({
        title: "Hata",
        description: "Cari oluşturulurken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handleOdemeEkle = (borc: any, type: 'payment' | 'refund' = 'payment') => {
    setSelectedBorcForPayment(borc);
    
    // Ödeme yapan otomatik doldur
    const odemeYapan = type === 'payment' 
      ? borc.firma || "Müşteri" // Ödeme al → Cari firma
      : "Nehir Turizm"; // Geri öde → Bizim firma
    
    setOdemeForm({
      tutar: "",
      tarih: new Date().toISOString().split('T')[0],
      aciklama: "",
      odemeYontemi: "",
      odemeYapan, // Otomatik doldur
      fisNumarasi: "",
      paraBirimi: borc.paraBirimi || "EUR",
      odemeType: type,
    });
    setShowOdemeDialog(true);
  };

  const handleAddOdeme = async () => {
    try {
      if (!selectedBorcForPayment || !odemeForm.tutar || !odemeForm.aciklama) {
        toast({
          title: "Hata",
          description: "Lütfen tüm zorunlu alanları doldurun",
          variant: "destructive",
        });
        return;
      }

      const tutar = parseFloat(odemeForm.tutar);
      if (isNaN(tutar) || tutar <= 0) {
        toast({
          title: "Hata",
          description: "Geçerli bir tutar girin",
          variant: "destructive",
        });
        return;
      }

      // İade ise tutarı negatif yap
      const finalAmount = odemeForm.odemeType === 'refund' ? -tutar : tutar;

      // Cari kartın o anki genel bakiyesini (seçilen para birimi için) bul
      let currentCariBalance = 0;
      if (selectedBorcForPayment && selectedBorcForPayment.cariId) {
        // Yeni yöntem: getCurrentBalanceForCurrency fonksiyonunu kullan
        currentCariBalance = getCurrentBalanceForCurrency(
          selectedBorcForPayment.cariId, 
          odemeForm.paraBirimi || 'EUR'
        );
      }

      if (selectedBorcForPayment.editingPaymentId) {
        // Edit modu - mevcut ödemeyi güncelle
        const updateData = {
          tutar: finalAmount,
          paraBirimi: odemeForm.paraBirimi,
          tarih: new Date(odemeForm.tarih).toISOString(),
          aciklama: odemeForm.aciklama,
          odemeYontemi: odemeForm.odemeYontemi,
          odemeYapan: odemeForm.odemeYapan,
          fisNumarasi: odemeForm.fisNumarasi,
          cariBakiye: currentCariBalance // yeni alan: ödeme anındaki bakiye
        };

        await ReservationCariService.updatePayment(selectedBorcForPayment.editingPaymentId, updateData);
        
        toast({
          title: "Başarılı",
          description: "Ödeme başarıyla güncellendi"
        });
      } else {
        // Yeni ödeme ekleme - sadece genel ödemeler için 
        const odemeData = {
          cariId: selectedBorcForPayment.cariId,
          tutar: finalAmount,
          paraBirimi: odemeForm.paraBirimi,
          tarih: new Date(odemeForm.tarih).toISOString(),
          aciklama: `${odemeForm.odemeType === 'refund' ? 'İade: ' : 'Genel Ödeme: '}${odemeForm.aciklama}`,
          odemeYontemi: odemeForm.odemeYontemi,
          odemeYapan: odemeForm.odemeYapan,
          fisNumarasi: odemeForm.fisNumarasi,
          reservationId: null,
          paymentId: null,
          cariBakiye: currentCariBalance // yeni alan: ödeme anındaki bakiye
        };

        // Eğer bu bir rezervasyona bağlı ödeme ise
        if (selectedBorcForPayment.id && selectedBorcForPayment.reservationId) {
          odemeData.reservationId = selectedBorcForPayment.reservationId;
          odemeData.paymentId = selectedBorcForPayment.id;
          odemeData.aciklama = `${odemeForm.odemeType === 'refund' ? 'İade: ' : 'Rezervasyon Ödemesi: '}${odemeForm.aciklama}`;
        }

        await ReservationCariService.addGeneralOdeme(odemeData);
        
        toast({
          title: "Başarılı",
          description: odemeForm.odemeType === 'refund' 
            ? "İade başarıyla kaydedildi" 
            : "Ödeme başarıyla eklendi",
        });
      }

      setShowOdemeDialog(false);
      setSelectedBorcForPayment(null);
      setOdemeForm({
        tutar: "",
        tarih: new Date().toISOString().split('T')[0],
        aciklama: "",
        odemeYontemi: "",
        odemeYapan: "",
        fisNumarasi: "",
        paraBirimi: "EUR",
        odemeType: "payment",
      });

      // SADECE ödeme eklenen/güncellenen carinin detaylarını güncelle
      const cariId = selectedBorcForPayment.cariId || selectedBorcForPayment.id;
      try {
        console.log(`🔄 Ödeme işlemi sonrası ${cariId} için veriler yeniden yükleniyor...`);
        
        const [borclar, odemeler, detayliListe] = await Promise.all([
          ReservationCariService.getBorcDetaysByCariId(cariId),
          ReservationCariService.getOdemeDetaysByCariId(cariId),
          ReservationCariService.getBorcDetaylarWithReservationInfo(cariId)
        ]);
        
        setCariDetails(prev => ({
          ...prev,
          [cariId]: { borclar, odemeler, detayliListe }
        }));

        // Ana cari listesinde sadece bu carinin toplamlarını güncelle
        const updatedCari = await ReservationCariService.getCariById(cariId);
        if (updatedCari) {
          setCariList(prev => prev.map(c => c.id === cariId ? updatedCari : c));
        }
        
        // İstatistikleri de güncelle
        await loadStatistics();
        
        console.log(`✅ ${cariId} için veriler güncellendi. Ödemeler: ${odemeler.length}`);
      } catch (error) {
        console.error("Detay güncelleme hatası:", error);
      }
    } catch (error) {
      console.error("Ödeme işlem hatası:", error);
      toast({
        title: "Hata",
        description: "Ödeme işlemi sırasında bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handlePrintCari = (cari: ReservationCari) => {
    router.push(`/print/reservation-cari/${cari.id}`);
  };

  // Para birimi formatı
  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Firma seçimi için handler
  const handleCompanySelect = (companyName: string) => {
    setNewCariForm(prev => ({
      ...prev,
      companyName
    }));
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: tr });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "Ödendi": "bg-green-100 text-green-800",
      "Bekliyor": "bg-yellow-100 text-yellow-800", 
      "Kısmi Ödendi": "bg-blue-100 text-blue-800",
      "İptal": "bg-red-100 text-red-800"
    } as const
    
    const className = statusConfig[status as keyof typeof statusConfig] || statusConfig["Bekliyor"]
    return <Badge className={`${className} text-[8px] px-0.5 py-0 h-3 leading-none`}>{status}</Badge>
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-red-600";
    if (balance < 0) return "text-green-600";
    return "text-gray-600";
  };

  const getBalanceBadge = (balance: number) => {
    if (balance > 0) return <Badge variant="destructive">Borçlu</Badge>;
    if (balance < 0) return <Badge variant="default" className="bg-green-600">Alacaklı</Badge>;
    return <Badge variant="secondary">Kapalı</Badge>;
  };

  // Yaklaşan rezervasyonları kontrol et
  const checkUpcomingReservations = (detayliListe: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    
    return detayliListe.filter((item: any) => {
      const reservationDate = new Date(item.turTarih);
      reservationDate.setHours(0, 0, 0, 0);
      return reservationDate >= today && reservationDate < threeDaysLater && item.kalan > 0;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Rezervasyon cari kartları yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 space-y-4 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rezervasyon Cari Kartları</h1>
          <p className="text-gray-600">Dönem: {period}</p>
        </div>
        
        {/* İstatistik Kartları ve Butonlar - Tek Satırda */}
        <div className="flex items-center gap-4">
          {/* İstatistik Kartları */}
          <div className="flex gap-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 min-w-[90px] text-center" title="Toplam cari kart sayısı">
              <div className="text-blue-600 font-bold text-lg leading-tight">{statistics.totalCariCount}</div>
              <div className="text-blue-700 text-[11px] font-medium">Toplam Cari</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 min-w-[90px] text-center" title="Toplam rezervasyon sayısı">
              <div className="text-purple-600 font-bold text-lg leading-tight">{statistics.totalReservations}</div>
              <div className="text-purple-700 text-[11px] font-medium">Rezervasyon</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 min-w-[90px] text-center" title="Tamamen ödenmiş rezervasyonlar">
              <div className="text-green-600 font-bold text-lg leading-tight">{statistics.paidReservations}</div>
              <div className="text-green-700 text-[11px] font-medium">Ödenen</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 min-w-[90px] text-center" title="Bekleyen veya kısmi ödenmiş rezervasyonlar">
              <div className="text-red-600 font-bold text-lg leading-tight">{statistics.unpaidReservations}</div>
              <div className="text-red-700 text-[11px] font-medium">Bekleyen</div>
            </div>
          </div>
          
          {/* Butonlar */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setRefreshing(true);
                loadCariList().finally(() => setRefreshing(false));
              }}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
            <Dialog open={showNewCariDialog} onOpenChange={setShowNewCariDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Cari
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Yeni Cari Oluştur</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Şirket Adı *</Label>
                    <Select 
                      value={newCariForm.companyName} 
                      onValueChange={handleCompanySelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Şirket seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCompanies.map((company) => (
                          <SelectItem key={company.id} value={company.name || company.companyName}>
                            {company.name || company.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>İletişim Kişisi</Label>
                    <Input
                      value={newCariForm.contactPerson}
                      onChange={(e) => setNewCariForm({...newCariForm, contactPerson: e.target.value})}
                      placeholder="İletişim kişisi"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input
                      value={newCariForm.contactPhone}
                      onChange={(e) => setNewCariForm({...newCariForm, contactPhone: e.target.value})}
                      placeholder="Telefon numarası"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-posta</Label>
                    <Input
                      type="email"
                      value={newCariForm.contactEmail}
                      onChange={(e) => setNewCariForm({...newCariForm, contactEmail: e.target.value})}
                      placeholder="E-posta adresi"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vergi Numarası</Label>
                    <Input
                      value={newCariForm.taxNumber}
                      onChange={(e) => setNewCariForm({...newCariForm, taxNumber: e.target.value})}
                      placeholder="Vergi numarası"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Adres</Label>
                    <Textarea
                      value={newCariForm.address}
                      onChange={(e) => setNewCariForm({...newCariForm, address: e.target.value})}
                      placeholder="Adres bilgisi"
                      rows={3}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Notlar</Label>
                    <Textarea
                      value={newCariForm.notes}
                      onChange={(e) => setNewCariForm({...newCariForm, notes: e.target.value})}
                      placeholder="Ek notlar"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setShowNewCariDialog(false)}>
                    İptal
                  </Button>
                  <Button onClick={handleCreateCari}>
                    Oluştur
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Arama ve Filtreleme + İstatistik Kartları */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Taraf - Arama ve Filtreleme */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardContent className="pt-6 h-full">
              <div className="flex items-end gap-3 h-full">
                <div className="flex-1">
                  <Label>Cari Ara</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-500" />
                    <Input
                      placeholder="Firma adı, kişi veya telefon..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="w-28">
                  <Label className="text-xs">Filtre</Label>
                  <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                    <SelectTrigger className="text-xs h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü ({cariList.length})</SelectItem>
                      <SelectItem value="debt">Borçlular ({cariList.filter(c => c.balance > 0).length})</SelectItem>
                      <SelectItem value="credit">Alacaklılar ({cariList.filter(c => c.balance < 0).length})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sağ Taraf - İstatistik Kartları */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Toplam Borç */}
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-600">Toplam Borç</p>
                    {detailsLoading ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-gray-500">Yükleniyor...</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {Object.entries(totals).map(([currency, values]) => (
                          <p key={currency} className="text-lg font-bold text-red-700">
                            {formatCurrency(values.totalDebt, currency)}
                          </p>
                        ))}
                        {Object.keys(totals).length === 0 && (
                          <p className="text-2xl font-bold text-red-700">
                            {formatCurrency(0, 'EUR')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <CreditCard className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Toplam Ödeme */}
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-600">Toplam Ödeme</p>
                    {detailsLoading ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-gray-500">Yükleniyor...</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {Object.entries(totals).map(([currency, values]) => (
                          <p key={currency} className="text-lg font-bold text-green-700">
                            {formatCurrency(values.totalPayment, currency)}
                          </p>
                        ))}
                        {Object.keys(totals).length === 0 && (
                          <p className="text-2xl font-bold text-green-700">
                            {formatCurrency(0, 'EUR')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <Euro className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Net Bakiye */}
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-600">Net Bakiye</p>
                    {detailsLoading ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-gray-500">Yükleniyor...</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {Object.entries(totals).map(([currency, values]) => {
                          const balance = values.balance;
                          const isPositive = balance >= 0;
                          return (
                            <div key={currency} className="flex items-center gap-2">
                              <p className={`text-lg font-bold ${isPositive ? 'text-orange-700' : 'text-blue-700'}`}>
                                {formatCurrency(Math.abs(balance), currency)}
                              </p>
                              <p className={`text-xs ${isPositive ? 'text-orange-500' : 'text-blue-500'}`}>
                                {isPositive ? 'Alacak' : 'Borç'}
                              </p>
                            </div>
                          );
                        })}
                        {Object.keys(totals).length === 0 && (
                          <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold text-orange-700">
                              {formatCurrency(0, 'EUR')}
                            </p>
                            <p className="text-xs text-orange-500">Alacak</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Building2 className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Cari Kartları - Enhanced Style */}
      <div className="space-y-2">
        {filteredCariList.map((cari) => {
          const isExpanded = expandedCariIds.has(cari.id!);
          const details = cariDetails[cari.id!];
          
          // Filtrelenmiş rezervasyonları al
          const filteredReservations = details?.detayliListe ? getFilteredReservations(details.detayliListe, cari.id!) : [];
          const upcomingReservations = filteredReservations ? checkUpcomingReservations(filteredReservations) : [];
          const hasUpcoming = upcomingReservations.length > 0;
          
          return (
            <Card key={cari.id} className={`overflow-hidden ${hasUpcoming ? 'ring-2 ring-red-200 border-red-300' : ''}`}>
              <Collapsible>
                <div className="w-full">
                  <CardHeader className={`hover:bg-gray-50 transition-colors cursor-pointer ${hasUpcoming ? 'bg-red-50' : ''}`}>
                    <div className="flex items-center gap-4">
                      {/* Sol taraf - Silme butonu */}
                      <div className="flex items-center">
                        <div
                          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-red-300 bg-red-50 shadow-sm hover:bg-red-100 hover:text-red-900 h-8 px-3 cursor-pointer text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCari(cari);
                          }}
                          title="Cari kartını sil"
                        >
                          <Trash2 className="w-3 h-3" />
                        </div>
                      </div>

                      {/* Orta - Cari bilgileri */}
                      <CollapsibleTrigger
                        className="flex items-center gap-4 flex-1"
                        onClick={() => toggleCariExpansion(cari)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                        
                        <div className="flex items-center gap-3">
                          <Building2 className={`w-6 h-6 ${hasUpcoming ? 'text-red-600' : 'text-blue-600'}`} />
                          <div className="text-left">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {cari.companyName}
                              {hasUpcoming && (
                                <Badge variant="destructive" className="animate-pulse">
                                  🔴 {upcomingReservations.length} Yaklaşan
                                </Badge>
                              )}
                            </CardTitle>
                            {cari.contactPerson && (
                              <p className="text-sm text-gray-600">{cari.contactPerson}</p>
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      {/* Sağ taraf - Finansal bilgiler ve yazdırma */}
                      <div className="flex items-center gap-6">
                        {/* Para birimi bazında toplamları göster */}
                        {details && details.borclar.length > 0 ? (
                          (() => {
                            // Bu cariye ait para birimi toplamlarını hesapla (hem rezervasyon borçları hem genel ödemeler dahil)
                            const cariCurrencyTotals: { [key: string]: { debt: number; payment: number; balance: number } } = {};
                            
                            // 1. Rezervasyon borçları ve ödemelerini ekle
                            details.borclar.forEach((borc: any) => {
                              const currency = borc.paraBirimi || 'EUR';
                              if (!cariCurrencyTotals[currency]) {
                                cariCurrencyTotals[currency] = { debt: 0, payment: 0, balance: 0 };
                              }
                              cariCurrencyTotals[currency].debt += borc.tutar || 0;
                              cariCurrencyTotals[currency].payment += borc.odeme || 0;
                              cariCurrencyTotals[currency].balance += (borc.tutar || 0) - (borc.odeme || 0);
                            });
                            
                            // 2. Genel ödemeleri de dahil et (reservationId olmayan ödemeler)
                            details.odemeler.forEach((odeme: any) => {
                              // Sadece genel ödemeleri dahil et (rezervasyon bağlantılı olmayanlar)
                              const isGeneralPayment = !odeme.reservationId || odeme.reservationId.trim() === '';
                              
                              if (isGeneralPayment) {
                                const currency = odeme.paraBirimi || 'EUR';
                                if (!cariCurrencyTotals[currency]) {
                                  cariCurrencyTotals[currency] = { debt: 0, payment: 0, balance: 0 };
                                }
                                // Genel ödemeler bakiyeyi etkiler
                                // Pozitif tutar = tahsilat (borcu azaltır), Negatif tutar = iade (borcu artırır)
                                cariCurrencyTotals[currency].balance -= odeme.tutar || 0;
                              }
                            });
                            
                            return (
                              <div className="flex items-center gap-4">
                                {Object.entries(cariCurrencyTotals).map(([currency, totals]) => (
                                  <div key={currency} className="text-right">
                                    <div className="text-xs text-gray-600">{currency} Bakiye</div>
                                    <div className={`font-bold text-sm ${totals.balance > 0 ? 'text-red-600' : totals.balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                      {formatCurrency(Math.abs(totals.balance), currency)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()
                        ) : (
                          <>
                            <div className="text-right">
                              <div className="text-sm text-gray-600">Toplam Borç</div>
                              <div className="font-semibold text-red-600">
                                {formatCurrency(cari.totalDebt)}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-sm text-gray-600">Toplam Ödeme</div>
                              <div className="font-semibold text-green-600">
                                {formatCurrency(cari.totalPayment)}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-sm text-gray-600">Bakiye</div>
                              <div className={`font-bold text-lg ${getBalanceColor(cari.balance)}`}>
                                {formatCurrency(Math.abs(cari.balance))}
                              </div>
                            </div>
                          </>
                        )}
                        
                        <div className="flex flex-col items-center gap-2">
                          {getBalanceBadge(cari.balance)}
                          <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintCari(cari);
                            }}
                          >
                            <Printer className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </div>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {details ? (
                      <div className="space-y-4">
                        {/* Tarih Filtreleme - Cari Kart Seviyesinde */}
                        <div className="bg-gray-50 border rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-600" />
                              <span className="font-medium text-sm text-gray-700">Tarih Filtresi:</span>
                              {dateFilterByCari[cari.id!]?.isActive && (
                                <Badge variant="outline" className="text-xs">
                                  Aktif
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Input
                                type="date"
                                placeholder="Başlangıç"
                                value={dateFilterByCari[cari.id!]?.startDate || ''}
                                onChange={(e) => {
                                  const newFilter = {
                                    ...dateFilterByCari[cari.id!],
                                    startDate: e.target.value
                                  };
                                  setDateFilterByCari(prev => ({
                                    ...prev,
                                    [cari.id!]: newFilter
                                  }));
                                  if (newFilter.startDate && newFilter.endDate) {
                                    applyDateFilter(cari.id!, newFilter.startDate, newFilter.endDate);
                                  }
                                }}
                                className="w-36 h-8 text-sm"
                              />
                              <span className="text-gray-500">-</span>
                              <Input
                                type="date"
                                placeholder="Bitiş"
                                value={dateFilterByCari[cari.id!]?.endDate || ''}
                                onChange={(e) => {
                                  const newFilter = {
                                    ...dateFilterByCari[cari.id!],
                                    endDate: e.target.value
                                  };
                                  setDateFilterByCari(prev => ({
                                    ...prev,
                                    [cari.id!]: newFilter
                                  }));
                                  if (newFilter.startDate && newFilter.endDate) {
                                    applyDateFilter(cari.id!, newFilter.startDate, newFilter.endDate);
                                  }
                                }}
                                className="w-36 h-8 text-sm"
                              />
                              
                              {dateFilterByCari[cari.id!]?.isActive && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => clearDateFilter(cari.id!)}
                                  className="h-8 px-2"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Tab Butonları */}
                        <div className="flex gap-2 border-b">
                          <button
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                              (activeTabByCari[cari.id!] || 'details') === 'details'
                                ? 'border-blue-500 text-blue-600 bg-blue-50'
                                : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                            onClick={() => setActiveTabByCari(prev => ({ ...prev, [cari.id!]: 'details' }))}
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Rezervasyon Detayları ({
                                dateFilterByCari[cari.id!]?.isActive 
                                  ? getFilteredReservations(details.detayliListe, cari.id!).length
                                  : details.detayliListe.length
                              })
                              {dateFilterByCari[cari.id!]?.isActive && (
                                <Badge variant="outline" className="text-xs">
                                  Filtrelenmiş
                                </Badge>
                              )}
                            </div>
                          </button>
                          <button
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                              activeTabByCari[cari.id!] === 'payments'
                                ? 'border-green-500 text-green-600 bg-green-50'
                                : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                            onClick={() => setActiveTabByCari(prev => ({ ...prev, [cari.id!]: 'payments' }))}
                          >
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4" />
                              Son Ödemeler ({
                                dateFilterByCari[cari.id!]?.isActive 
                                  ? getFilteredPayments(details.odemeler, cari.id!).length
                                  : details.odemeler.length
                              })
                              {dateFilterByCari[cari.id!]?.isActive && (
                                <Badge variant="outline" className="text-xs">
                                  Filtrelenmiş
                                </Badge>
                              )}
                            </div>
                          </button>
                        </div>

                        {/* Tab İçerikleri */}
                        {(activeTabByCari[cari.id!] || 'details') === 'details' ? (
                          // Rezervasyon Detayları Tab
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-semibold flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Rezervasyon Detayları
                                {(() => {
                                  const filteredUpcoming = getFilteredReservations(details.detayliListe, cari.id!);
                                  const upcoming = checkUpcomingReservations(filteredUpcoming);
                                  return upcoming.length > 0 && (
                                    <Badge variant="destructive" className="animate-pulse">
                                      {upcoming.length} Yaklaşan
                                    </Badge>
                                  );
                                })()}
                              </h3>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleOdemeEkle({ cariId: cari.id, reservationId: null, id: null })}
                                  className="h-8"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Ödeme Al
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOdemeEkle({ cariId: cari.id, reservationId: null, id: null }, 'refund')}
                                  className="h-8"
                                >
                                  <Minus className="w-3 h-3 mr-1" />
                                  Geri Öde
                                </Button>
                              </div>
                            </div>
                            <div className="rounded-md border overflow-x-auto">
                              <Table className="table-auto w-full text-xs">
                                <colgroup>
                                  <col style={{width: '70px'}}/>
                                  <col style={{width: '70px'}}/>
                                  <col style={{width: '60px'}}/>
                                  <col style={{width: '65px'}}/>
                                  <col style={{width: '65px'}}/>
                                  <col style={{width: '65px'}}/>
                                  <col style={{width: '80px'}}/>
                                  <col style={{width: '90px'}}/>
                                  <col style={{width: '50px'}}/>
                                  <col style={{width: '70px'}}/>
                                  <col style={{width: '60px'}}/>
                                  <col style={{width: '40px'}}/>
                                </colgroup>
                                <TableHeader>
                                  <TableRow className="bg-gray-50">
                                    <TableHead className="text-center text-[10px] font-bold py-1 px-1">TUR TARİH</TableHead>
                                    <TableHead className="text-center text-[10px] font-bold py-1 px-1">ÖDEME TARİH</TableHead>
                                    <TableHead className="text-center text-[10px] font-bold py-1 px-1">FİRMA</TableHead>
                                    <TableHead className="text-center text-[10px] font-bold py-1 px-1">TUTAR</TableHead>
                                    <TableHead className="text-center text-[10px] font-bold py-1 px-1">ÖDEME / YAPAN</TableHead>
                                    <TableHead className="text-center text-[10px] font-bold py-1 px-1">KALAN</TableHead>
                                    <TableHead className="text-center text-[10px] font-bold py-1 px-1">DESTİNASYON</TableHead>
                                    <TableHead className="text-center text-[10px] font-bold py-1 px-1">MÜŞTERİ</TableHead>
                                    <TableHead className="text-center text-[10px] font-bold py-1 px-1">KİŞİ</TableHead>
                                    <TableHead className="text-center text-[10px] font-bold py-1 px-1">ALIŞ YERİ</TableHead>
                                    <TableHead className="text-center text-[10px] font-bold py-1 px-1">ALIŞ</TableHead>
                                    <TableHead className="text-center text-[10px] font-bold py-1 px-1">İşlem</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {getFilteredReservations(details.detayliListe, cari.id!).map((item: any) => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    
                                    const tomorrow = new Date(today);
                                    tomorrow.setDate(today.getDate() + 1);
                                    
                                    const dayAfterTomorrow = new Date(today);
                                    dayAfterTomorrow.setDate(today.getDate() + 2);
                                    
                                    const threeDaysLater = new Date(today);
                                    threeDaysLater.setDate(today.getDate() + 3);
                                    
                                    const reservationDate = new Date(item.turTarih);
                                    reservationDate.setHours(0, 0, 0, 0);
                                    
                                    // Yakınlık derecesine göre renklendirme
                                    let rowBgClass = "";
                                    
                                    if (item.kalan > 0) { // Sadece kalan borcu olanları renklendir
                                      if (reservationDate >= today && reservationDate < tomorrow) {
                                        rowBgClass = "bg-red-100 border-l-4 border-red-700";
                                      } else if (reservationDate >= tomorrow && reservationDate < dayAfterTomorrow) {
                                        rowBgClass = "bg-red-75 border-l-4 border-red-500";
                                      } else if (reservationDate >= dayAfterTomorrow && reservationDate < threeDaysLater) {
                                        rowBgClass = "bg-red-50 border-l-4 border-red-300";
                                      }
                                    }
                                    
                                    return (
                                      <TableRow key={item.id} className={`${rowBgClass} text-[10px]`}>
                                        <TableCell className="text-center font-bold truncate py-1 px-1">
                                          {formatDate(item.turTarih)}
                                        </TableCell>
                                        <TableCell className="text-center truncate py-1 px-1">
                                          {item.odemeTarih || item.odemeTarihi ? (
                                            <span className="text-green-600 font-medium text-[9px]">
                                              {formatDate(item.odemeTarih || item.odemeTarihi)}
                                            </span>
                                          ) : "-"}
                                        </TableCell>
                                        <TableCell className="text-center font-medium truncate py-1 px-1">
                                          {item.firma || "-"}
                                        </TableCell>
                                        <TableCell className="text-center font-bold truncate py-1 px-1">
                                          {formatCurrency(item.tutar, item.paraBirimi)}
                                        </TableCell>
                                        <TableCell className="text-center text-green-600 font-bold truncate py-1 px-1">
                                          <div>
                                            {formatCurrency(item.odeme, item.paraBirimi)}
                                            {/* Ödemeyi kimin yaptığını göster */}
                                            {item.odemeYapan && (
                                              <div className="text-[9px] text-gray-600 font-normal">
                                                {item.odemeYapan}
                                              </div>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className={`text-center font-bold truncate py-1 px-1 ${item.kalan > 0 ? "text-red-600" : "text-green-600"}`}>
                                          {formatCurrency(item.kalan, item.paraBirimi)}
                                        </TableCell>
                                        <TableCell className="text-center text-blue-600 font-medium truncate py-1 px-1">
                                          {item.destinasyon}
                                        </TableCell>
                                        <TableCell className="text-center truncate py-1 px-1">
                                          {item.musteri}
                                        </TableCell>
                                        <TableCell className="text-center font-medium py-1 px-1">
                                          {item.kisi}
                                        </TableCell>
                                        <TableCell className="text-center truncate py-1 px-1">
                                          {item.alisYeriDetay || item.alisYeri || "-"}
                                        </TableCell>
                                        <TableCell className="text-center py-1 px-1">
                                          {item.alisDetay || item.alis || "-"}
                                        </TableCell>
                                        <TableCell className="text-center py-1 px-1">
                                          <div className="flex gap-1">
                                            {item.kalan > 0 && (
                                              <div
                                                className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-green-300 bg-green-50 shadow-sm hover:bg-green-100 hover:text-green-900 px-1 py-0.5 h-5 cursor-pointer text-green-700"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOdemeEkle(item);
                                                }}
                                                title="Ödeme Al"
                                              >
                                                <CreditCard className="w-2 h-2" />
                                              </div>
                                            )}
                                            {item.kalan < 0 && (
                                              <div
                                                className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-blue-300 bg-blue-50 shadow-sm hover:bg-blue-100 hover:text-blue-900 px-1 py-0.5 h-5 cursor-pointer text-blue-700"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOdemeEkle(item, 'refund');
                                                }}
                                                title="Fazla Ödeme - Geri Öde"
                                              >
                                                <Plus className="w-2 h-2" />
                                              </div>
                                            )}
                                            {item.kalan === 0 && (
                                              <Badge className="bg-green-100 text-green-800 text-[8px] px-1 py-0">
                                                ✓
                                              </Badge>
                                            )}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        ) : (
                          // Ödemeler Tab - Geliştirilmiş
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-semibold flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Ödeme Geçmişi ({details.odemeler.length})
                              </h3>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // Cari kartın ana para birimini belirle (en çok kullanılan para birimi)
                                    const primaryCurrency = details.borclar.length > 0 ? 
                                      details.borclar[0]?.paraBirimi || 'EUR' : 'EUR';
                                    
                                    setSelectedBorcForPayment({ 
                                      cariId: cari.id, 
                                      firma: cari.companyName, 
                                      kalan: Math.abs(cari.balance), 
                                      paraBirimi: primaryCurrency,
                                      totalDebt: cari.totalDebt || 0
                                    });
                                    setOdemeForm({
                                      tutar: "",
                                      tarih: new Date().toISOString().split('T')[0],
                                      aciklama: `${cari.companyName} genel tahsilat`,
                                      odemeYontemi: "",
                                      odemeYapan: cari.companyName, // Ödeme al → Cari firma
                                      fisNumarasi: "",
                                      paraBirimi: primaryCurrency,
                                      odemeType: 'payment',
                                    });
                                    setShowOdemeDialog(true);
                                  }}
                                  className="text-green-600 border-green-300 hover:bg-green-50"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Ödeme Al
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // Cari kartın ana para birimini belirle
                                    const primaryCurrency = details.borclar.length > 0 ? 
                                      details.borclar[0]?.paraBirimi || 'EUR' : 'EUR';
                                    
                                    setSelectedBorcForPayment({ 
                                      cariId: cari.id, 
                                      firma: "Nehir Turizm", // Geri ödeme bizim firmamızdan 
                                      kalan: Math.abs(cari.balance), 
                                      paraBirimi: primaryCurrency,
                                      totalDebt: cari.totalDebt || 0
                                    });
                                    setOdemeForm({
                                      tutar: "",
                                      tarih: new Date().toISOString().split('T')[0],
                                      aciklama: `${cari.companyName} geri ödeme`,
                                      odemeYontemi: "",
                                      odemeYapan: "Nehir Turizm", // Geri öde → Bizim firma
                                      fisNumarasi: "",
                                      paraBirimi: primaryCurrency, // Cari kartın ana para birimini kullan
                                      odemeType: 'refund',
                                    });
                                    setShowOdemeDialog(true);
                                  }}
                                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Geri Öde
                                </Button>
                              </div>
                            </div>
                            
                            {getFilteredPayments(details.odemeler, cari.id!).length > 0 ? (
                              <div className="rounded-md border overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-gray-50">
                                      <TableHead className="text-xs">ÖDEME TARİH</TableHead>
                                      <TableHead className="text-xs">AÇIKLAMA</TableHead>
                                      <TableHead className="text-xs">TÜR</TableHead>
                                      <TableHead className="text-xs">Ö.YÖNTEMİ</TableHead>
                                      <TableHead className="text-xs">FİRMA</TableHead>
                                      <TableHead className="text-xs">CARİ</TableHead>
                                      <TableHead className="text-xs">ÖDEME</TableHead>
                                      <TableHead className="text-xs">KALAN</TableHead>
                                      <TableHead className="text-xs text-center">İŞLEMLER</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {getFilteredPayments(details.odemeler, cari.id!).map((odeme) => {
                                      console.log(`🧾 ÖDEME GÖSTERME - ID=${odeme.id}, Tutar=${odeme.tutar}, CariBakiye=${(odeme as any).cariBakiye}, ParaBirimi=${(odeme as any).paraBirimi}, Açıklama=${odeme.aciklama}`);
                                      
                                      // Rezervasyon bağlantılı ödeme mi kontrol et (hem reservationId hem de borcId kontrol et)
                                      const isReservationLinked = (odeme.reservationId && odeme.reservationId.trim() !== '') || 
                                                                 (odeme.borcId && odeme.borcId.trim() !== '');
                                      
                                      console.log(`🔍 Ödeme ${odeme.id}: Rezervasyon bağlantılı mı? ${isReservationLinked ? 'EVET ✅' : 'HAYIR ❌'}`);
                                      console.log(`📋 Ödeme ${odeme.id}: reservationId=${odeme.reservationId || 'YOK'}, borcId=${odeme.borcId || 'YOK'}`);
                                      
                                      // Eski ödemeler için özel kontrol - eğer açıklama eski formatsa silinebilecek yap
                                      const isLegacyPayment = !isReservationLinked || 
                                                            (odeme.aciklama && (
                                                              odeme.aciklama.includes('Ödeme eklendi') ||
                                                              odeme.aciklama.includes('Genel ödeme') ||
                                                              !odeme.aciklama.includes('Rezervasyon')
                                                            ));
                                      
                                      const canDelete = !isReservationLinked || isLegacyPayment;
                                      
                                      // Bu ödemeye ait rezervasyon bilgilerini bul - daha kapsamlı arama
                                      let reservationInfo = null;
                                      if (details.detayliListe && details.detayliListe.length > 0) {
                                        console.log(`🔎 Ödeme ${odeme.id} için ${details.detayliListe.length} rezervasyon arasında eşleşme aranıyor`);
                                        
                                        // 1. reservationId ile eşleştir (en güvenilir yöntem)
                                        if (odeme.reservationId && odeme.reservationId.trim() !== '') {
                                          reservationInfo = details.detayliListe.find((item: any) => 
                                            item.reservationId === odeme.reservationId || 
                                            item.id === odeme.reservationId
                                          );
                                          if (reservationInfo) {
                                            console.log(`✅ Ödeme ${odeme.id}: reservationId='${odeme.reservationId}' ile eşleşen rezervasyon bulundu`);
                                          } else {
                                            console.log(`❌ Ödeme ${odeme.id}: reservationId='${odeme.reservationId}' ile eşleşen rezervasyon bulunamadı`);
                                          }
                                        }
                                        
                                        // 2. borcId ile eşleştir
                                        if (!reservationInfo && odeme.borcId && odeme.borcId.trim() !== '') {
                                          reservationInfo = details.detayliListe.find((item: any) => 
                                            item.id === odeme.borcId ||
                                            item.borcId === odeme.borcId
                                          );
                                          if (reservationInfo) {
                                            console.log(`✅ Ödeme ${odeme.id}: borcId='${odeme.borcId}' ile eşleşen rezervasyon bulundu`);
                                          } else {
                                            console.log(`❌ Ödeme ${odeme.id}: borcId='${odeme.borcId}' ile eşleşen rezervasyon bulunamadı`);
                                          }
                                        }
                                        
                                        // 3. Tarih ve firma eşleştirmesi ile bul (son çare)
                                        if (!reservationInfo && isReservationLinked) {
                                          console.log(`⚠️ Ödeme ${odeme.id}: ID eşleşmesi yapılamadı, tarih bazlı eşleşme deneniyor`);
                                          const odemeGunu = new Date(odeme.tarih).toDateString();
                                          reservationInfo = details.detayliListe.find((item: any) => {
                                            const rezervasyonGunu = new Date(item.turTarih).toDateString();
                                            const odemeGunu2 = item.odemeTarih ? new Date(item.odemeTarih).toDateString() : null;
                                            const tarihEslesiyor = odemeGunu === rezervasyonGunu || odemeGunu === odemeGunu2;
                                            
                                            if (tarihEslesiyor) {
                                              console.log(`✅ Ödeme ${odeme.id}: tarih eşleşmesi bulundu. Ödeme=${odemeGunu}, Rezervasyon=${rezervasyonGunu}, Ödeme Tarihi=${odemeGunu2}`);
                                            }
                                            
                                            return tarihEslesiyor;
                                          });
                                        }
                                      }
                                      
                                      console.log(`📊 Ödeme ${odeme.id} için eşleşme sonucu:`, reservationInfo ? '✅ BULUNDU' : '❌ BULUNAMADI');
                                      
                                      return (
                                        <TableRow key={odeme.id} className="text-xs">
                                          {/* ÖDEME TARİH */}
                                          <TableCell className="text-center">
                                            {formatDate(odeme.tarih)}
                                          </TableCell>
                                          
                                          {/* AÇIKLAMA */}
                                          <TableCell className="truncate max-w-[200px]">
                                            {odeme.aciklama}
                                            {isReservationLinked && !reservationInfo && (
                                              <div className="text-[8px] text-blue-500 mt-1">
                                                (Rezervasyon Bağlantılı)
                                              </div>
                                            )}
                                          </TableCell>
                                          
                                          {/* TÜR */}
                                          <TableCell className="text-center">
                                            <Badge 
                                              variant={odeme.tutar > 0 ? "default" : "secondary"}
                                              className={`text-[8px] px-1 py-0 ${
                                                odeme.tutar > 0 
                                                  ? 'bg-green-100 text-green-800' 
                                                  : 'bg-blue-100 text-blue-800'
                                              }`}
                                            >
                                              {odeme.tutar > 0 ? 'Tahsilat' : 'İade'}
                                            </Badge>
                                            {isReservationLinked && (
                                              <div className="text-[8px] text-blue-600 font-medium mt-1">
                                                (Rezervasyon)
                                              </div>
                                            )}
                                          </TableCell>
                                          
                                          {/* Ö.YÖNTEMİ */}
                                          <TableCell className="text-center">
                                            {odeme.odemeYontemi || "-"}
                                          </TableCell>
                                          
                                          {/* FİRMA - Ödeme yapan firma (cari kart sahibi veya bizim firma) */}
                                          <TableCell className="text-center">
                                            <div className="font-medium">
                                              {(odeme as any).odemeYapan || 
                                               (odeme.tutar > 0 ? cari.companyName : "Nehir Turizm")}
                                            </div>
                                          </TableCell>
                                          
                                          {/* CARİ - Ödeme anındaki genel bakiye (ödeme kaydında saklanır) */}
                                          <TableCell className="text-center">
                                            <div className={`font-medium`}>
                                              {odeme.cariBakiye !== undefined
                                                ? <span className={odeme.cariBakiye > 0 ? 'text-red-600' : odeme.cariBakiye < 0 ? 'text-green-600' : 'text-gray-500'}>
                                                    {formatCurrency(Math.abs(odeme.cariBakiye), odeme.paraBirimi || 'EUR')}
                                                  </span>
                                                : "-"}
                                            </div>
                                          </TableCell>
                                          
                                          {/* ÖDEME */}
                                          <TableCell className="text-center">
                                            <div className={`font-medium ${
                                              odeme.tutar > 0 ? 'text-green-600' : 'text-blue-600'
                                            }`}>
                                              {formatCurrency(Math.abs(odeme.tutar), (odeme as any).paraBirimi || 'EUR')}
                                            </div>
                                          </TableCell>
                                          
                                          {/* KALAN - Bu ödeme yapıldıktan sonraki kalan borç tutarı (ödeme para biriminde) */}
                                          <TableCell className="text-center">
                                            <div className="font-medium text-orange-600">
                                              {odeme.cariBakiye !== undefined && odeme.tutar !== undefined
                                                ? formatCurrency(Math.abs((odeme.cariBakiye || 0) - (odeme.tutar || 0)), odeme.paraBirimi || 'EUR')
                                                : "-"}
                                            </div>
                                          </TableCell>
                                          
                                          {/* İŞLEMLER */}
                                          <TableCell className="text-center">
                                            <div className="flex gap-1 justify-center">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                  // Edit işlemi - ödeme formunu doldur
                                                  setOdemeForm({
                                                    tutar: Math.abs(odeme.tutar).toString(),
                                                    paraBirimi: (odeme as any).paraBirimi || 'EUR',
                                                    tarih: odeme.tarih.split('T')[0],
                                                    aciklama: odeme.aciklama,
                                                    odemeYontemi: odeme.odemeYontemi || '',
                                                    odemeYapan: (odeme as any).odemeYapan || '',
                                                    fisNumarasi: odeme.fisNumarasi || '',
                                                    odemeType: odeme.tutar > 0 ? 'payment' : 'refund'
                                                  });
                                                  setSelectedBorcForPayment({
                                                    cariId: cari.id,
                                                    firma: cari.companyName,
                                                    kalan: 0,
                                                    paraBirimi: (odeme as any).paraBirimi || 'EUR',
                                                    editingPaymentId: odeme.id
                                                  });
                                                  setShowOdemeDialog(true);
                                                }}
                                                disabled={!canDelete}
                                                className={`h-6 px-2 ${
                                                  canDelete 
                                                    ? 'border-blue-300 text-blue-600 hover:bg-blue-50' 
                                                    : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                                title={canDelete ? "Düzenle" : "Rezervasyon bağlantılı - düzenlenemez"}
                                              >
                                                <Edit className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={async () => {
                                                  if (!canDelete) {
                                                    toast({
                                                      title: "Silinemez",
                                                      description: "Rezervasyon bağlantılı ödemeler sadece rezervasyon sayfasından silinebilir.",
                                                      variant: "destructive"
                                                    });
                                                    return;
                                                  }
                                                  
                                                  if (confirm('Bu ödemeyi silmek istediğinizden emin misiniz?')) {
                                                    try {
                                                      if (!odeme.id) {
                                                        toast({
                                                          title: "Hata",
                                                          description: "Ödeme ID'si bulunamadı",
                                                          variant: "destructive"
                                                        });
                                                        return;
                                                                                                           }
                                                      
                                                      await ReservationCariService.deletePayment(odeme.id, !!isLegacyPayment);
                                                      toast({
                                                        title: "Başarılı",
                                                        description: "Ödeme başarıyla silindi"
                                                      });
                                                      // Detayları yeniden yükle
                                                      await toggleCariExpansion(cari);
                                                    } catch (error) {
                                                      console.error('Ödeme silme hatası:', error);
                                                      toast({
                                                        title: "Hata",
                                                        description: "Ödeme silinirken bir hata oluştu",
                                                        variant: "destructive"
                                                      });
                                                    }
                                                  }
                                                }}
                                                disabled={!canDelete}
                                                className={`h-6 px-2 ${
                                                  canDelete 
                                                    ? 'border-red-300 text-red-600 hover:bg-red-50' 
                                                    : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                                title={canDelete ? "Sil" : "Rezervasyon bağlantılı - silinemez"}
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Henüz ödeme kaydı bulunmuyor</p>
                                <p className="text-sm">Ödeme eklemek için yukarıdaki butonları kullanın</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Detaylar yükleniyor...</span>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {filteredCariList.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Cari kaydı bulunamadı</p>
              <p className="text-sm">Arama kriterlerinizi değiştirin veya yeni bir cari oluşturun</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Geliştirilmiş Ödeme Ekleme Dialog */}
      <Dialog open={showOdemeDialog} onOpenChange={setShowOdemeDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedBorcForPayment?.editingPaymentId ? (
                <>
                  <Edit className="w-5 h-5 text-orange-600" />
                  Ödeme Düzenle
                </>
              ) : odemeForm.odemeType === 'refund' ? (
                <>
                  <Plus className="w-5 h-5 text-blue-600" />
                  Geri Ödeme / İade
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 text-green-600" />
                  Ödeme Al / Tahsilat
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedBorcForPayment && (
            <div className="space-y-4">
              {/* Bilgilendirici Banner - Küçültülmüş */}
              <div className={`p-2 rounded-lg border ${
                odemeForm.odemeType === 'refund' 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {odemeForm.odemeType === 'refund' ? (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                      Geri Ödeme
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      Tahsilat
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm">
                  <strong>Firma:</strong> {selectedBorcForPayment.firma}
                </p>
                
                {selectedBorcForPayment.destinasyon && (
                  <p className="text-xs text-gray-600">
                    <strong>Rezervasyon:</strong> {selectedBorcForPayment.destinasyon} - {selectedBorcForPayment.musteri}
                  </p>
                )}
                
                {/* Para Birimi Bazında Borç Durumu */}
                {selectedBorcForPayment.cariId && cariDetails[selectedBorcForPayment.cariId] && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-1">Bu Carinin Para Birimi Durumu:</p>
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        const currencyBalances: Record<string, number> = {};
                        const details = cariDetails[selectedBorcForPayment.cariId];
                        
                        // Borçları topla
                        details.borclar.forEach((borc: any) => {
                          const currency = borc.paraBirimi || 'EUR';
                          currencyBalances[currency] = (currencyBalances[currency] || 0) + ((borc.tutar || 0) - (borc.odeme || 0));
                        });
                        
                        // Genel ödemeleri çıkar
                        details.odemeler.forEach((odeme: any) => {
                          const isGeneralPayment = !odeme.reservationId || odeme.reservationId.trim() === '';
                          if (isGeneralPayment) {
                            const currency = odeme.paraBirimi || 'EUR';
                            currencyBalances[currency] = (currencyBalances[currency] || 0) - (odeme.tutar || 0);
                          }
                        });
                        
                        return Object.entries(currencyBalances)
                          .filter(([_, balance]) => Math.abs(balance) > 0.01)
                          .map(([currency, balance]) => (
                            <Badge 
                              key={currency} 
                              variant="outline" 
                              className={`text-xs ${balance > 0 ? 'border-red-200 text-red-700' : 'border-green-200 text-green-700'}`}
                            >
                              {currency}: {balance > 0 ? 'Borç' : 'Alacak'} {formatCurrency(Math.abs(balance), currency)}
                            </Badge>
                          ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Ödeme Türü Seçimi - Kompakt */}
              <div className="space-y-2">
                <Label className="text-sm">İşlem Türü</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={odemeForm.odemeType === 'payment' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOdemeForm(prev => ({ 
                      ...prev, 
                      odemeType: 'payment',
                      odemeYapan: selectedBorcForPayment?.firma || "Müşteri" // Ödeme al → Cari firma
                    }))}
                    className="flex-1 text-xs"
                  >
                    <CreditCard className="w-3 h-3 mr-1" />
                    Ödeme Al
                  </Button>
                  <Button
                    type="button"
                    variant={odemeForm.odemeType === 'refund' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOdemeForm(prev => ({ 
                      ...prev, 
                      odemeType: 'refund',
                      odemeYapan: "Nehir Turizm" // Geri öde → Bizim firma
                    }))}
                    className="flex-1 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Geri Öde
                  </Button>
                </div>
              </div>
              
              {/* Tutar ve Para Birimi - Tek Satır */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label className="text-sm">
                    {odemeForm.odemeType === 'refund' ? 'İade Tutarı' : 'Ödeme Tutarı'} *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={odemeForm.tutar}
                    onChange={(e) => setOdemeForm({...odemeForm, tutar: e.target.value})}
                    placeholder="0.00"
                    className={`text-sm ${odemeForm.odemeType === 'refund' ? 'border-blue-300' : 'border-green-300'}`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Para Birimi</Label>
                  <Select value={odemeForm.paraBirimi} onValueChange={(value) => setOdemeForm({...odemeForm, paraBirimi: value})}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="TRY">TRY</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seçilen Para Birimindeki Cari Bakiye Bilgisi */}
              {selectedBorcForPayment?.cariId && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">
                      Seçilen Para Birimindeki ({odemeForm.paraBirimi}) Cari Bakiye:
                    </div>
                    <div className={`font-bold text-sm ${
                      (() => {
                        const currentBalance = getCurrentBalanceForCurrency(selectedBorcForPayment.cariId, odemeForm.paraBirimi);
                        return currentBalance > 0 ? 'text-red-600' : currentBalance < 0 ? 'text-green-600' : 'text-gray-600';
                      })()
                    }`}>
                      {(() => {
                        const currentBalance = getCurrentBalanceForCurrency(selectedBorcForPayment.cariId, odemeForm.paraBirimi);
                        return formatCurrency(Math.abs(currentBalance), odemeForm.paraBirimi);
                      })()}
                      {(() => {
                        const currentBalance = getCurrentBalanceForCurrency(selectedBorcForPayment.cariId, odemeForm.paraBirimi);
                        return currentBalance > 0 ? ' (Borç)' : currentBalance < 0 ? ' (Alacak)' : ' (Denge)';
                      })()}
                    </div>
                  </div>
                  {odemeForm.tutar && !isNaN(parseFloat(odemeForm.tutar)) && (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">İşlem Sonrası Kalan:</span>
                        <span className={`font-medium ${
                          (() => {
                            const currentBalance = getCurrentBalanceForCurrency(selectedBorcForPayment.cariId, odemeForm.paraBirimi);
                            const amount = parseFloat(odemeForm.tutar);
                            const finalAmount = odemeForm.odemeType === 'refund' ? -amount : amount;
                            const remaining = currentBalance - finalAmount;
                            return remaining > 0 ? 'text-red-600' : remaining < 0 ? 'text-green-600' : 'text-gray-600';
                          })()
                        }`}>
                          {(() => {
                            const currentBalance = getCurrentBalanceForCurrency(selectedBorcForPayment.cariId, odemeForm.paraBirimi);
                            const amount = parseFloat(odemeForm.tutar);
                            const finalAmount = odemeForm.odemeType === 'refund' ? -amount : amount;
                            const remaining = currentBalance - finalAmount;
                            return formatCurrency(Math.abs(remaining), odemeForm.paraBirimi);
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Tarih ve Ödeme Yöntemi */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-sm">Tarih *</Label>
                  <Input
                    type="date"
                    value={odemeForm.tarih}
                    onChange={(e) => setOdemeForm({...odemeForm, tarih: e.target.value})}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Ödeme Yöntemi</Label>
                  <Select value={odemeForm.odemeYontemi} onValueChange={(value) => setOdemeForm({...odemeForm, odemeYontemi: value})}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nakit">Nakit</SelectItem>
                      <SelectItem value="Kredi Kartı">Kredi Kartı</SelectItem>
                      <SelectItem value="Banka Havalesi">Banka Havalesi</SelectItem>
                      <SelectItem value="EFT">EFT</SelectItem>
                      <SelectItem value="POS">POS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Ödeme Yapan - Otomatik doldurulmuş */}
              <div className="space-y-1">
                <Label className="text-sm">Ödeme Yapan</Label>
                <Input
                  value={odemeForm.odemeYapan}
                  onChange={(e) => setOdemeForm({...odemeForm, odemeYapan: e.target.value})}
                  placeholder="Ödemeyi yapan firma/kişi"
                  className="text-sm"
                />
              </div>
              
              {/* Açıklama */}
              <div className="space-y-1">
                <Label className="text-sm">Açıklama *</Label>
                <Textarea
                  value={odemeForm.aciklama}
                  onChange={(e) => setOdemeForm({...odemeForm, aciklama: e.target.value})}
                  placeholder={
                    odemeForm.odemeType === 'refund' 
                      ? 'İade nedeni ve detayları' 
                      : 'Ödeme detayları ve açıklaması'
                  }
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setShowOdemeDialog(false)}>
              İptal
            </Button>
            <Button 
              size="sm"
              onClick={handleAddOdeme}
              className={`${
                odemeForm.odemeType === 'refund' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {selectedBorcForPayment?.editingPaymentId 
                ? 'Güncelle' 
                : (odemeForm.odemeType === 'refund' ? 'İade Yap' : 'Ödeme Ekle')
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
