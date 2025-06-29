"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Euro
} from "lucide-react";

interface ReservationCariKartlariYeniProps {
  period: string;
}

export default function ReservationCariKartlariYeni({ period }: ReservationCariKartlariYeniProps) {
  const [cariList, setCariList] = useState<ReservationCari[]>([]);
  const [filteredCariList, setFilteredCariList] = useState<ReservationCari[]>([]);
  const [selectedCari, setSelectedCari] = useState<ReservationCari | null>(null);
  const [borcDetaylar, setBorcDetaylar] = useState<ReservationBorcDetay[]>([]);
  const [odemeDetaylar, setOdemeDetaylar] = useState<ReservationOdemeDetay[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "debt" | "credit">("all");
  const [showNewCariDialog, setShowNewCariDialog] = useState(false);
  const [showOdemeDialog, setShowOdemeDialog] = useState(false);
  const [selectedBorcForPayment, setSelectedBorcForPayment] = useState<ReservationBorcDetay | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
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

  const handleCariSelect = async (cari: ReservationCari) => {
    try {
      setSelectedCari(cari);
      const [borclar, odemeler] = await Promise.all([
        ReservationCariService.getBorcDetaysByCariId(cari.id!),
        ReservationCariService.getOdemeDetaysByCariId(cari.id!)
      ]);
      setBorcDetaylar(borclar);
      setOdemeDetaylar(odemeler);
      setActiveTab("borclar");
    } catch (error) {
      console.error("Cari seçilirken hata:", error);
      toast({
        title: "Hata",
        description: "Cari bilgileri yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    }
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
      if (selectedCari) {
        await handleCariSelect(selectedCari);
      }
      loadCariList();
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

      <div className="grid grid-cols-12 gap-6">
        {/* Sol Panel - Cari Listesi */}
        <div className="col-span-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Cari Kartları</CardTitle>
                <Badge variant="secondary">{filteredCariList.length}</Badge>
              </div>
              
              {/* Arama ve Filtreleme */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Cari ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="debt">Borçlular</SelectItem>
                    <SelectItem value="credit">Alacaklılar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {filteredCariList.map((cari) => (
                  <div
                    key={cari.id}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedCari?.id === cari.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => handleCariSelect(cari)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          <h3 className="font-medium text-sm">{cari.companyName}</h3>
                        </div>
                        {cari.contactPerson && (
                          <p className="text-xs text-gray-600 mb-1">{cari.contactPerson}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${getBalanceColor(cari.balance)}`}>
                            {formatCurrency(Math.abs(cari.balance))}
                          </span>
                          {getBalanceBadge(cari.balance)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sağ Panel - Cari Detayları */}
        <div className="col-span-8">
          {selectedCari ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      {selectedCari.companyName}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      {selectedCari.contactPerson && (
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {selectedCari.contactPerson}
                        </span>
                      )}
                      {selectedCari.contactPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {selectedCari.contactPhone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintCari(selectedCari)}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Yazdır
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="borclar">Borçlar</TabsTrigger>
                    <TabsTrigger value="odemeler">Ödemeler</TabsTrigger>
                    <TabsTrigger value="ozet">Özet</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="borclar" className="space-y-4">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>TUR TARİH</TableHead>
                            <TableHead>ÖDEME TARİH</TableHead>
                            <TableHead>FİRMA</TableHead>
                            <TableHead>TUTAR</TableHead>
                            <TableHead>ÖDEME</TableHead>
                            <TableHead>KALAN</TableHead>
                            <TableHead>DESTİNASYON</TableHead>
                            <TableHead>MÜŞTERİ</TableHead>
                            <TableHead>KİŞİ</TableHead>
                            <TableHead>ALIŞ YERİ</TableHead>
                            <TableHead>ALIŞ</TableHead>
                            <TableHead>İşlem</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {borcDetaylar.map((borc) => (
                            <TableRow key={borc.id}>
                              <TableCell>{formatDate(borc.turTarih)}</TableCell>
                              <TableCell>{borc.odemeTarih ? formatDate(borc.odemeTarih) : "-"}</TableCell>
                              <TableCell>{borc.firma}</TableCell>
                              <TableCell>{formatCurrency(borc.tutar, borc.paraBirimi)}</TableCell>
                              <TableCell>{formatCurrency(borc.odeme, borc.paraBirimi)}</TableCell>
                              <TableCell className={borc.kalan > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                                {formatCurrency(borc.kalan, borc.paraBirimi)}
                              </TableCell>
                              <TableCell>{borc.destinasyon}</TableCell>
                              <TableCell>{borc.musteri}</TableCell>
                              <TableCell>{borc.kisi}</TableCell>
                              <TableCell>{borc.alisYeri}</TableCell>
                              <TableCell>{borc.alis}</TableCell>
                              <TableCell>
                                {borc.kalan > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOdemeEkle(borc)}
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
                  </TabsContent>

                  <TabsContent value="odemeler" className="space-y-4">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>Tutar</TableHead>
                            <TableHead>Açıklama</TableHead>
                            <TableHead>Ödeme Yöntemi</TableHead>
                            <TableHead>Fiş No</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {odemeDetaylar.map((odeme) => (
                            <TableRow key={odeme.id}>
                              <TableCell>{formatDate(odeme.tarih)}</TableCell>
                              <TableCell className="text-green-600 font-medium">
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
                  </TabsContent>

                  <TabsContent value="ozet" className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-red-600">
                              {formatCurrency(selectedCari.totalDebt)}
                            </p>
                            <p className="text-sm text-gray-600">Toplam Borç</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(selectedCari.totalPayment)}
                            </p>
                            <p className="text-sm text-gray-600">Toplam Ödeme</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className={`text-2xl font-bold ${getBalanceColor(selectedCari.balance)}`}>
                              {formatCurrency(Math.abs(selectedCari.balance))}
                            </p>
                            <p className="text-sm text-gray-600">Kalan Bakiye</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* İletişim Bilgileri */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">İletişim Bilgileri</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        {selectedCari.contactEmail && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{selectedCari.contactEmail}</span>
                          </div>
                        )}
                        {selectedCari.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{selectedCari.address}</span>
                          </div>
                        )}
                        {selectedCari.taxNumber && (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">Vergi No: {selectedCari.taxNumber}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[400px]">
                <div className="text-center text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Detay görmek için bir cari seçin</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
