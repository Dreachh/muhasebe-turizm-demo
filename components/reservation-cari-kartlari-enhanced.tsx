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
  Settings
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
  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "debt" | "credit">("all");
  const [showNewCariDialog, setShowNewCariDialog] = useState(false);
  const [showOdemeDialog, setShowOdemeDialog] = useState(false);
  const [selectedBorcForPayment, setSelectedBorcForPayment] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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

  // Ödeme formu
  const [odemeForm, setOdemeForm] = useState({
    tutar: "",
    tarih: new Date().toISOString().split('T')[0],
    aciklama: "",
    odemeYontemi: "",
    odemeYapan: "",
    fisNumarasi: "",
  });

  useEffect(() => {
    loadCariList();
    loadAvailableCompanies();
    loadDestinations();
  }, [period]);

  useEffect(() => {
    filterCariList();
  }, [cariList, searchTerm, filterType]);

  // Otomatik güncelleme sistemi - sadece açık cari detayları için - KALDIRILDI
  // Artık sadece manuel yenileme ve yeni kayıt eklendiğinde güncelleme yapılacak

  // Ana cari listesini otomatik güncelle - SADECE BAŞLANGIÇTA
  useEffect(() => {
    // Sadece sayfa ilk yüklendiğinde çalışır, sonrasında manuel güncelleme
    const initialLoad = setTimeout(() => {
      loadCariList();
    }, 1000);

    return () => clearTimeout(initialLoad);
  }, [period]); // Sadece period değiştiğinde çalışır

  // Toplam değerleri hesapla - TÜM cari detaylarından para birimi bazında (SABİT DEĞERLER)
  const totals = useMemo(() => {
    const currencyTotals: Record<string, { totalDebt: number; totalPayment: number; totalBalance: number }> = {};
    
    // Tüm cari detaylarından borç kayıtlarını para birimi bazında topla
    Object.values(cariDetails).forEach(detail => {
      if (detail.borclar && detail.borclar.length > 0) {
        detail.borclar.forEach((borc: any) => {
          const currency = borc.paraBirimi || 'EUR';
          if (!currencyTotals[currency]) {
            currencyTotals[currency] = { totalDebt: 0, totalPayment: 0, totalBalance: 0 };
          }
          currencyTotals[currency].totalDebt += borc.tutar || 0;
          currencyTotals[currency].totalPayment += borc.odeme || 0;
        });
      }
    });
    
    // Bakiyeleri hesapla
    Object.values(currencyTotals).forEach(values => {
      values.totalBalance = values.totalDebt - values.totalPayment;
    });
    
    // Eğer hiç detay yoksa varsayılan olarak boş obje döndür
    return currencyTotals;
  }, [cariDetails]);

  // İstatistik değerleri - backend'den al
  const [statistics, setStatistics] = useState({
    totalCariCount: 0,
    totalReservations: 0,
    paidReservations: 0,
    unpaidReservations: 0,
    debtorCount: 0,
    creditorCount: 0,
  });

  const loadAvailableCompanies = async () => {
    try {
      const companies = await getCompanies();
      setAvailableCompanies(companies);
    } catch (error) {
      console.error("Firmalar yüklenirken hata:", error);
      toast({
        title: "Uyarı",
        description: "Firmalar yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const loadDestinations = async () => {
    try {
      const destinationList = await getReservationDestinations();
      setDestinations(destinationList);
    } catch (error) {
      console.error("Destinasyonlar yüklenirken hata:", error);
    }
  };

  const handleCompanySelect = (companyName: string) => {
    const selectedCompany = availableCompanies.find(
      company => (company.name || company.companyName) === companyName
    );
    
    if (selectedCompany) {
      setNewCariForm({
        ...newCariForm,
        companyName,
        contactPerson: selectedCompany.contactPerson || newCariForm.contactPerson,
        contactPhone: selectedCompany.phone || selectedCompany.contactPhone || newCariForm.contactPhone,
        contactEmail: selectedCompany.email || selectedCompany.contactEmail || newCariForm.contactEmail,
        address: selectedCompany.address || newCariForm.address,
        taxNumber: selectedCompany.taxNumber || newCariForm.taxNumber,
      });
    } else {
      setNewCariForm({...newCariForm, companyName});
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await ReservationCariService.getGeneralStatistics(period);
      setStatistics(stats);
    } catch (error) {
      console.error("İstatistik yükleme hatası:", error);
    }
  };

  const loadCariList = async () => {
    try {
      setLoading(true);
      const data = await ReservationCariService.getAllCari(period);
      setCariList(data);
      
      // Tüm cari detaylarını toplu yükle (toplam hesaplamaları için)
      setDetailsLoading(true);
      try {
        const allDetails = await Promise.all(
          data.map(async (cari) => {
            try {
              const [borclar, odemeler] = await Promise.all([
                ReservationCariService.getBorcDetaysByCariId(cari.id!),
                ReservationCariService.getOdemeDetaysByCariId(cari.id!)
              ]);
              return {
                cariId: cari.id!,
                details: { borclar, odemeler, detayliListe: [] }
              };
            } catch (error) {
              console.error(`Cari detayları yüklenirken hata (${cari.companyName}):`, error);
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

  const toggleCariExpansion = async (cari: ReservationCari) => {
    const cariId = cari.id!;
    const newExpandedIds = new Set(expandedCariIds);
    
    if (expandedCariIds.has(cariId)) {
      // Cari kapatılıyor
      newExpandedIds.delete(cariId);
    } else {
      // Cari açılıyor
      newExpandedIds.add(cariId);
      
      // Sadece detaylı liste yüklenmemişse yükle (borç ve ödeme zaten var)
      if (cariDetails[cariId] && !cariDetails[cariId].detayliListe.length) {
        try {
          const detayliListe = await ReservationCariService.getBorcDetaylarWithReservationInfo(cariId);
          
          setCariDetails(prev => ({
            ...prev,
            [cariId]: { 
              ...prev[cariId], 
              detayliListe 
            }
          }));
        } catch (error) {
          console.error("Detaylı liste yüklenirken hata:", error);
          toast({
            title: "Hata",
            description: "Rezervasyon detayları yüklenirken bir hata oluştu",
            variant: "destructive",
          });
        }
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

  const handleOdemeEkle = (borc: any) => {
    setSelectedBorcForPayment(borc);
    setOdemeForm({
      tutar: borc.kalan.toString(),
      tarih: new Date().toISOString().split('T')[0],
      aciklama: `${borc.destinasyon} - ${borc.musteri} rezervasyonu için ödeme`,
      odemeYontemi: "",
      odemeYapan: "",
      fisNumarasi: "",
    });
    setShowOdemeDialog(true);
  };

  const handleAddOdeme = async () => {
    try {
      if (!selectedBorcForPayment || !odemeForm.tutar || !odemeForm.aciklama) {
        toast({
          title: "Hata",
          description: "Gerekli alanları doldurun",
          variant: "destructive",
        });
        return;
      }

      const tutar = parseFloat(odemeForm.tutar);
      if (tutar <= 0 || tutar > selectedBorcForPayment.kalan) {
        toast({
          title: "Hata",
          description: "Geçersiz ödeme tutarı",
          variant: "destructive",
        });
        return;
      }

      await ReservationCariService.addOdeme(
        selectedBorcForPayment.id,
        tutar,
        odemeForm.tarih,
        odemeForm.aciklama,
        odemeForm.odemeYontemi,
        odemeForm.odemeYapan,
        odemeForm.fisNumarasi
      );

      toast({
        title: "Başarılı",
        description: "Ödeme eklendi",
      });

      setShowOdemeDialog(false);
      setSelectedBorcForPayment(null);
      setOdemeForm({
        tutar: "",
        tarih: new Date().toISOString().split('T')[0],
        aciklama: "",
        odemeYontemi: "",
        odemeYapan: "",
        fisNumarasi: "",
      });

      // SADECE ödeme eklenen carinin detaylarını güncelle - liste ve diğer cariler dokunulmasın
      const cariId = selectedBorcForPayment.cariId;
      try {
        const [borclar, odemeler, detayliListe] = await Promise.all([
          ReservationCariService.getBorcDetaysByCariId(cariId),
          ReservationCariService.getOdemeDetaysByCariId(cariId),
          ReservationCariService.getBorcDetaylarWithReservationInfo(cariId)
        ]);
        
        // Sadece bu carinin detaylarını güncelle
        setCariDetails(prev => ({
          ...prev,
          [cariId]: { borclar, odemeler, detayliListe }
        }));

        // Ana cari listesinde sadece bu carinin toplamlarını güncelle
        const updatedCari = await ReservationCariService.getCariById(cariId);
        if (updatedCari) {
          setCariList(prev => prev.map(c => c.id === cariId ? updatedCari : c));
        }
      } catch (error) {
        console.error("Detay güncelleme hatası:", error);
      }
    } catch (error) {
      console.error("Ödeme eklenirken hata:", error);
      toast({
        title: "Hata",
        description: "Ödeme eklenirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handlePrintCari = (cari: ReservationCari) => {
    router.push(`/print/reservation-cari/${cari.id}`);
  };

  const formatCurrency = (amount: number, currency = "EUR") => {
    // Map common currency codes if needed (e.g., TL to ISO TRY)
    const isoCode = currency === 'TL' ? 'TRY' : currency;
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: isoCode
    }).format(amount);
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
                          const balance = values.totalBalance;
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
          const upcomingReservations = details?.detayliListe ? checkUpcomingReservations(details.detayliListe) : [];
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
                            // Bu cariye ait para birimi toplamlarını hesapla
                            const cariCurrencyTotals: { [key: string]: { debt: number; payment: number; balance: number } } = {};
                            details.borclar.forEach((borc: any) => {
                              const currency = borc.paraBirimi || 'EUR';
                              if (!cariCurrencyTotals[currency]) {
                                cariCurrencyTotals[currency] = { debt: 0, payment: 0, balance: 0 };
                              }
                              cariCurrencyTotals[currency].debt += borc.tutar || 0;
                              cariCurrencyTotals[currency].payment += borc.odeme || 0;
                              cariCurrencyTotals[currency].balance += (borc.tutar || 0) - (borc.odeme || 0);
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
                      <div className="space-y-6">
                        {/* Rezervasyon Listesi Formatında Detaylı Tablo */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Rezervasyon Detayları ({details.detayliListe.length})
                            {upcomingReservations.length > 0 && (
                              <Badge variant="destructive" className="animate-pulse">
                                {upcomingReservations.length} Yaklaşan
                              </Badge>
                            )}
                          </h3>
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
                                {details.detayliListe.map((item: any) => {
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
                                        {item.kalan > 0 && (
                                          <div
                                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground px-1 py-0.5 h-5 cursor-pointer"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOdemeEkle(item);
                                            }}
                                          >
                                            <CreditCard className="w-2 h-2" />
                                          </div>
                                        )}
                                        {item.kalan <= 0 && (
                                          <Badge className="bg-green-100 text-green-800 text-[8px] px-1 py-0">
                                            ✓
                                          </Badge>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        {/* Ödemeler Özet Tablosu */}
                        {details.odemeler.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                              <CreditCard className="w-5 h-5" />
                              Son Ödemeler ({details.odemeler.length})
                            </h3>
                            <div className="rounded-md border overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-gray-50">
                                    <TableHead className="text-xs">Tarih</TableHead>
                                    <TableHead className="text-xs text-right">Tutar</TableHead>
                                    <TableHead className="text-xs">Açıklama</TableHead>
                                    <TableHead className="text-xs">Ödeme Yöntemi</TableHead>
                                    <TableHead className="text-xs">Fiş No</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {details.odemeler.slice(0, 5).map((odeme) => (
                                    <TableRow key={odeme.id} className="text-xs">
                                      <TableCell>{formatDate(odeme.tarih)}</TableCell>
                                      <TableCell className="text-right text-green-600 font-medium">
                                        {formatCurrency(odeme.tutar)}
                                      </TableCell>
                                      <TableCell className="truncate max-w-[200px]">{odeme.aciklama}</TableCell>
                                      <TableCell>{odeme.odemeYontemi || "-"}</TableCell>
                                      <TableCell>{odeme.fisNumarasi || "-"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
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

      {/* Ödeme Ekleme Dialog */}
      <Dialog open={showOdemeDialog} onOpenChange={setShowOdemeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ödeme Ekle</DialogTitle>
          </DialogHeader>
          {selectedBorcForPayment && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm"><strong>Rezervasyon:</strong> {selectedBorcForPayment.destinasyon} - {selectedBorcForPayment.musteri}</p>
                <p className="text-sm"><strong>Tur Tarihi:</strong> {formatDate(selectedBorcForPayment.turTarih)}</p>
                <p className="text-sm"><strong>Firma:</strong> {selectedBorcForPayment.firma}</p>
                <p className="text-sm"><strong>Kalan Borç:</strong> {formatCurrency(selectedBorcForPayment.kalan, selectedBorcForPayment.paraBirimi)}</p>
                {selectedBorcForPayment.alisYeriDetay && (
                  <p className="text-sm"><strong>Alış Yeri:</strong> {selectedBorcForPayment.alisYeriDetay}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ödeme Tutarı *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={odemeForm.tutar}
                    onChange={(e) => setOdemeForm({...odemeForm, tutar: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ödeme Tarihi *</Label>
                  <Input
                    type="date"
                    value={odemeForm.tarih}
                    onChange={(e) => setOdemeForm({...odemeForm, tarih: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ödeme Yöntemi</Label>
                  <Select value={odemeForm.odemeYontemi} onValueChange={(value) => setOdemeForm({...odemeForm, odemeYontemi: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ödeme yöntemi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nakit">Nakit</SelectItem>
                      <SelectItem value="Kredi Kartı">Kredi Kartı</SelectItem>
                      <SelectItem value="Banka Havalesi">Banka Havalesi</SelectItem>
                      <SelectItem value="EFT">EFT</SelectItem>
                      <SelectItem value="Çek">Çek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ödeme Yapan</Label>
                  <Input
                    value={odemeForm.odemeYapan}
                    onChange={(e) => setOdemeForm({...odemeForm, odemeYapan: e.target.value})}
                    placeholder="Ödemeyi yapan kişi"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fiş Numarası</Label>
                  <Input
                    value={odemeForm.fisNumarasi}
                    onChange={(e) => setOdemeForm({...odemeForm, fisNumarasi: e.target.value})}
                    placeholder="Fiş/Fatura numarası"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Açıklama *</Label>
                <Textarea
                  value={odemeForm.aciklama}
                  onChange={(e) => setOdemeForm({...odemeForm, aciklama: e.target.value})}
                  placeholder="Ödeme açıklaması"
                  rows={2}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowOdemeDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleAddOdeme}>
              Ödeme Ekle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
