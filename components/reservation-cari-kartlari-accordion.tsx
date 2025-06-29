"use client";

import React, { useState, useEffect } from "react";
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
import { getCompanies } from "@/lib/db-firebase";
import { useRouter } from "next/navigation";
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
  MapIcon,
  Clock,
  Euro,
  ChevronDown,
  ChevronRight,
  Eye
} from "lucide-react";

interface ReservationCariKartlariAccordionProps {
  period: string;
}

export default function ReservationCariKartlariAccordion({ period }: ReservationCariKartlariAccordionProps) {
  const [cariList, setCariList] = useState<ReservationCari[]>([]);
  const [filteredCariList, setFilteredCariList] = useState<ReservationCari[]>([]);
  const [expandedCariIds, setExpandedCariIds] = useState<Set<string>>(new Set());
  const [cariDetails, setCariDetails] = useState<{[key: string]: {
    borclar: ReservationBorcDetay[];
    odemeler: ReservationOdemeDetay[];
  }}>({});
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "debt" | "credit">("all");
  const [showNewCariDialog, setShowNewCariDialog] = useState(false);
  const [showOdemeDialog, setShowOdemeDialog] = useState(false);
  const [selectedBorcForPayment, setSelectedBorcForPayment] = useState<ReservationBorcDetay | null>(null);
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
    fisNumarasi: "",
  });

  useEffect(() => {
    loadCariList();
    loadAvailableCompanies();
  }, [period]);

  useEffect(() => {
    filterCariList();
  }, [cariList, searchTerm, filterType]);

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

  const loadCariList = async () => {
    try {
      setLoading(true);
      const data = await ReservationCariService.getAllCari(period);
      setCariList(data);
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
      newExpandedIds.delete(cariId);
    } else {
      newExpandedIds.add(cariId);
      
      // Veriler henüz yüklenmemişse yükle
      if (!cariDetails[cariId]) {
        try {
          const [borclar, odemeler] = await Promise.all([
            ReservationCariService.getBorcDetaysByCariId(cariId),
            ReservationCariService.getOdemeDetaysByCariId(cariId)
          ]);
          
          setCariDetails(prev => ({
            ...prev,
            [cariId]: { borclar, odemeler }
          }));
        } catch (error) {
          console.error("Cari detayları yüklenirken hata:", error);
          toast({
            title: "Hata",
            description: "Cari detayları yüklenirken bir hata oluştu",
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
          description: "Şirket adı zorunludur",
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
        description: "Yeni cari başarıyla oluşturuldu",
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
      loadCariList();
    } catch (error) {
      console.error("Cari oluşturulurken hata:", error);
      toast({
        title: "Hata",
        description: "Cari oluşturulurken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handleOdemeEkle = (borc: ReservationBorcDetay) => {
    setSelectedBorcForPayment(borc);
    setOdemeForm({
      ...odemeForm,
      tutar: "",
      aciklama: `${borc.destinasyon} - ${borc.musteri} için ödeme`,
    });
    setShowOdemeDialog(true);
  };

  const handleAddOdeme = async () => {
    try {
      if (!selectedBorcForPayment || !odemeForm.tutar || !odemeForm.aciklama) {
        toast({
          title: "Hata",
          description: "Tüm gerekli alanları doldurun",
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

      if (tutar > selectedBorcForPayment.kalan) {
        toast({
          title: "Hata",
          description: "Ödeme tutarı kalan borçtan fazla olamaz",
          variant: "destructive",
        });
        return;
      }

      await ReservationCariService.addOdeme(
        selectedBorcForPayment.id!,
        tutar,
        odemeForm.tarih,
        odemeForm.aciklama,
        odemeForm.odemeYontemi,
        odemeForm.fisNumarasi
      );

      toast({
        title: "Başarılı",
        description: "Ödeme başarıyla eklendi",
      });

      setShowOdemeDialog(false);
      setSelectedBorcForPayment(null);
      setOdemeForm({
        tutar: "",
        tarih: new Date().toISOString().split('T')[0],
        aciklama: "",
        odemeYontemi: "",
        fisNumarasi: "",
      });

      // Verileri yeniden yükle
      loadCariList();
      // Detayları da yeniden yükle
      const cariId = selectedBorcForPayment.cariId;
      const [borclar, odemeler] = await Promise.all([
        ReservationCariService.getBorcDetaysByCariId(cariId),
        ReservationCariService.getOdemeDetaysByCariId(cariId)
      ]);
      
      setCariDetails(prev => ({
        ...prev,
        [cariId]: { borclar, odemeler }
      }));
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
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rezervasyon Cari Kartları</h1>
          <p className="text-gray-600">Dönem: {period}</p>
        </div>
        <div className="flex gap-2">
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

      {/* Arama ve Filtreleme */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
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
            <div className="w-48">
              <Label>Filtre</Label>
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger>
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

      {/* Cari Kartları - Accordion Style */}
      <div className="space-y-3">
        {filteredCariList.map((cari) => {
          const isExpanded = expandedCariIds.has(cari.id!);
          const details = cariDetails[cari.id!];
          
          return (
            <Card key={cari.id} className="overflow-hidden">
              <Collapsible>
                <CollapsibleTrigger
                  className="w-full"
                  onClick={() => toggleCariExpansion(cari)}
                >
                  <CardHeader className="hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                        
                        <div className="flex items-center gap-3">
                          <Building2 className="w-6 h-6 text-blue-600" />
                          <div className="text-left">
                            <CardTitle className="text-lg">{cari.companyName}</CardTitle>
                            {cari.contactPerson && (
                              <p className="text-sm text-gray-600">{cari.contactPerson}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
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
                        
                        <div className="flex flex-col items-center gap-2">
                          {getBalanceBadge(cari.balance)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintCari(cari);
                            }}
                          >
                            <Printer className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {details ? (
                      <div className="space-y-6">
                        {/* Borçlar Tablosu */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Borçlar ({details.borclar.length})
                          </h3>
                          <div className="rounded-md border overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50">
                                  <TableHead className="text-xs">TUR TARİH</TableHead>
                                  <TableHead className="text-xs">ÖDEME TARİH</TableHead>
                                  <TableHead className="text-xs">FİRMA</TableHead>
                                  <TableHead className="text-xs text-right">TUTAR</TableHead>
                                  <TableHead className="text-xs text-right">ÖDEME</TableHead>
                                  <TableHead className="text-xs text-right">KALAN</TableHead>
                                  <TableHead className="text-xs">DESTİNASYON</TableHead>
                                  <TableHead className="text-xs">MÜŞTERİ</TableHead>
                                  <TableHead className="text-xs text-center">KİŞİ</TableHead>
                                  <TableHead className="text-xs">ALIŞ YERİ</TableHead>
                                  <TableHead className="text-xs text-center">ALIŞ</TableHead>
                                  <TableHead className="text-xs text-center">İşlem</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {details.borclar.map((borc) => (
                                  <TableRow key={borc.id} className="text-sm">
                                    <TableCell>{formatDate(borc.turTarih)}</TableCell>
                                    <TableCell>{borc.odemeTarih ? formatDate(borc.odemeTarih) : "-"}</TableCell>
                                    <TableCell className="font-medium">{borc.firma}</TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(borc.tutar, borc.paraBirimi)}
                                    </TableCell>
                                    <TableCell className="text-right text-green-600 font-medium">
                                      {formatCurrency(borc.odeme, borc.paraBirimi)}
                                    </TableCell>
                                    <TableCell className={`text-right font-bold ${borc.kalan > 0 ? "text-red-600" : "text-green-600"}`}>
                                      {formatCurrency(borc.kalan, borc.paraBirimi)}
                                    </TableCell>
                                    <TableCell className="font-medium text-blue-600">{borc.destinasyon}</TableCell>
                                    <TableCell>{borc.musteri}</TableCell>
                                    <TableCell className="text-center font-medium">{borc.kisi}</TableCell>
                                    <TableCell>{borc.alisYeri}</TableCell>
                                    <TableCell className="text-center">{borc.alis}</TableCell>
                                    <TableCell className="text-center">
                                      {borc.kalan > 0 && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleOdemeEkle(borc)}
                                          className="text-xs px-2 py-1"
                                        >
                                          <CreditCard className="w-3 h-3 mr-1" />
                                          Ödeme
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        {/* Ödemeler Tablosu */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            Ödemeler ({details.odemeler.length})
                          </h3>
                          <div className="rounded-md border overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50">
                                  <TableHead>Tarih</TableHead>
                                  <TableHead className="text-right">Tutar</TableHead>
                                  <TableHead>Açıklama</TableHead>
                                  <TableHead>Ödeme Yöntemi</TableHead>
                                  <TableHead>Fiş No</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {details.odemeler.map((odeme) => (
                                  <TableRow key={odeme.id}>
                                    <TableCell>{formatDate(odeme.tarih)}</TableCell>
                                    <TableCell className="text-right text-green-600 font-medium">
                                      {formatCurrency(odeme.tutar)}
                                    </TableCell>
                                    <TableCell>{odeme.aciklama}</TableCell>
                                    <TableCell>{odeme.odemeYontemi || "-"}</TableCell>
                                    <TableCell>{odeme.fisNumarasi || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
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
                <p className="text-sm"><strong>Kalan Borç:</strong> {formatCurrency(selectedBorcForPayment.kalan, selectedBorcForPayment.paraBirimi)}</p>
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
