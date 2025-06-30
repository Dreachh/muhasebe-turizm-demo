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
import { toast } from "@/hooks/use-toast";
import { ReservationCariService, ReservationCari, ReservationCariPayment } from "@/lib/reservation-cari-service";
import { getCompanies } from "@/lib/db-firebase"; // Mevcut firmalar için
import { Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Building2, Phone, Mail, MapPin, CreditCard, FileText, Plus, Search, Filter, Printer, Edit, Trash2 } from "lucide-react";

interface ReservationCariKartlariProps {
  period: string;
}

export default function ReservationCariKartlari({ period }: ReservationCariKartlariProps) {
  const [cariList, setCariList] = useState<ReservationCari[]>([]);
  const [filteredCariList, setFilteredCariList] = useState<ReservationCari[]>([]);
  const [selectedCari, setSelectedCari] = useState<ReservationCari | null>(null);
  const [cariPayments, setCariPayments] = useState<ReservationCariPayment[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]); // Mevcut firmalar
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "debt" | "credit">("all");
  const [showNewCariDialog, setShowNewCariDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
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
  const [paymentForm, setPaymentForm] = useState({
    type: "payment" as "debt" | "payment",
    amount: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    currency: "TRY" as "TRY" | "USD" | "EUR",
    paymentMethod: "",
    receiptNumber: "",
  });

  useEffect(() => {
    loadCariList();
    loadAvailableCompanies();
  }, [period]);

  useEffect(() => {
    filterCariList();
  }, [cariList, searchTerm, filterType]);

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
      const payments = await ReservationCariService.getPaymentsByCariId(cari.id!);
      setCariPayments(payments);
      setActiveTab("overview");
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

  const handleAddPayment = async () => {
    try {
      if (!selectedCari || !paymentForm.amount || !paymentForm.description) {
        toast({
          title: "Hata",
          description: "Tüm gerekli alanları doldurun",
          variant: "destructive",
        });
        return;
      }

      const amount = parseFloat(paymentForm.amount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Hata",
          description: "Geçerli bir tutar girin",
          variant: "destructive",
        });
        return;
      }

      await ReservationCariService.addPayment({
        cariId: selectedCari.id!,
        type: paymentForm.type,
        amount,
        description: paymentForm.description,
        date: Timestamp.fromDate(new Date(paymentForm.date)),
        currency: paymentForm.currency,
        paymentMethod: paymentForm.paymentMethod,
        receiptNumber: paymentForm.receiptNumber,
        period,
      });

      toast({
        title: "Başarılı",
        description: `${paymentForm.type === "payment" ? "Ödeme" : "Borç"} başarıyla eklendi`,
      });

      setShowPaymentDialog(false);
      setPaymentForm({
        type: "payment",
        amount: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        currency: "TRY",
        paymentMethod: "",
        receiptNumber: "",
      });

      // Cari bilgilerini ve ödemeleri yeniden yükle
      const updatedCari = await ReservationCariService.getCariById(selectedCari.id!);
      if (updatedCari) {
        setSelectedCari(updatedCari);
      }
      const payments = await ReservationCariService.getPaymentsByCariId(selectedCari.id!);
      setCariPayments(payments);
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

  const formatCurrency = (amount?: number) => {
    if (!amount) return "0,00 ₺";
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (date?: string | Timestamp) => {
    if (!date) return "-";
    
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString('tr-TR');
    }
    
    if (date && typeof date === 'object' && 'toDate' in date) {
      return date.toDate().toLocaleDateString('tr-TR');
    }
    
    return "-"; // Fallback
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Panel - Cari Listesi */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Cari Listesi ({filteredCariList.length})</span>
                <Filter className="w-4 h-4" />
              </CardTitle>
              
              {/* Arama ve Filtreleme */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Cari ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={(value: "all" | "debt" | "credit") => setFilterType(value)}>
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
            <CardContent className="max-h-[600px] overflow-y-auto">
              <div className="space-y-2">
                {filteredCariList.map((cari) => (
                  <div
                    key={cari.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCari?.id === cari.id
                        ? "bg-blue-50 border-blue-200"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => handleCariSelect(cari)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{cari.companyName}</h4>
                        {cari.contactPerson && (
                          <p className="text-xs text-gray-600">{cari.contactPerson}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {getBalanceBadge(cari.balance)}
                          <span className={`text-xs font-medium ${getBalanceColor(cari.balance)}`}>
                            {formatCurrency(Math.abs(cari.balance))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredCariList.length === 0 && (
                  <div className="text-center py-8">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Cari bulunamadı</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sağ Panel - Cari Detayları */}
        <div className="lg:col-span-2">
          {selectedCari ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      {selectedCari.companyName}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2">
                      {getBalanceBadge(selectedCari.balance)}
                      <span className={`text-lg font-bold ${getBalanceColor(selectedCari.balance)}`}>
                        {formatCurrency(Math.abs(selectedCari.balance))}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintCari(selectedCari)}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Yazdır
                    </Button>
                    <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Ödeme/Borç Ekle
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ödeme/Borç Ekle</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>İşlem Tipi</Label>
                              <Select
                                value={paymentForm.type}
                                onValueChange={(value: "debt" | "payment") => setPaymentForm({...paymentForm, type: value})}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="payment">Ödeme</SelectItem>
                                  <SelectItem value="debt">Borç</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Tutar</Label>
                              <Input
                                type="number"
                                value={paymentForm.amount}
                                onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Para Birimi</Label>
                              <Select
                                value={paymentForm.currency}
                                onValueChange={(value: "TRY" | "USD" | "EUR") => setPaymentForm({...paymentForm, currency: value})}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="TRY">TRY</SelectItem>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Tarih</Label>
                              <Input
                                type="date"
                                value={paymentForm.date}
                                onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Açıklama</Label>
                            <Input
                              value={paymentForm.description}
                              onChange={(e) => setPaymentForm({...paymentForm, description: e.target.value})}
                              placeholder="İşlem açıklaması"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Ödeme Yöntemi</Label>
                              <Input
                                value={paymentForm.paymentMethod}
                                onChange={(e) => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}
                                placeholder="Nakit, Kredi Kartı, vb."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Fiş/Fatura No</Label>
                              <Input
                                value={paymentForm.receiptNumber}
                                onChange={(e) => setPaymentForm({...paymentForm, receiptNumber: e.target.value})}
                                placeholder="Fiş numarası"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                            İptal
                          </Button>
                          <Button onClick={handleAddPayment}>
                            Ekle
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Özet</TabsTrigger>
                    <TabsTrigger value="payments">Ödemeler</TabsTrigger>
                    <TabsTrigger value="details">Detaylar</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="text-sm text-red-600 font-medium">Toplam Borç</div>
                        <div className="text-xl font-bold text-red-700">
                          {formatCurrency(selectedCari.totalDebt)}
                        </div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-sm text-green-600 font-medium">Toplam Ödeme</div>
                        <div className="text-xl font-bold text-green-700">
                          {formatCurrency(selectedCari.totalPayment)}
                        </div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm text-blue-600 font-medium">Bakiye</div>
                        <div className={`text-xl font-bold ${getBalanceColor(selectedCari.balance)}`}>
                          {formatCurrency(selectedCari.balance)}
                        </div>
                      </div>
                    </div>

                    {/* Son İşlemler */}
                    <div>
                      <h4 className="font-medium mb-3">Son İşlemler</h4>
                      <div className="space-y-2">
                        {cariPayments.slice(0, 5).map((payment) => (
                          <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium">
                                {payment.type === "debt" ? "Borç" : "Ödeme"}: {payment.description}
                              </div>
                              <div className="text-sm text-gray-600">
                                {formatDate(payment.date)}
                              </div>
                            </div>
                            <div className={`font-bold ${payment.type === "debt" ? "text-red-600" : "text-green-600"}`}>
                              {payment.type === "debt" ? "+" : "-"}{formatCurrency(payment.amount)}
                            </div>
                          </div>
                        ))}
                        {cariPayments.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            Henüz işlem bulunmuyor
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="payments" className="space-y-4">
                    <div className="space-y-2">
                      {cariPayments.map((payment) => (
                        <div key={payment.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={payment.type === "debt" ? "destructive" : "default"}>
                                  {payment.type === "debt" ? "Borç" : "Ödeme"}
                                </Badge>
                                <span className="text-sm text-gray-600">
                                  {formatDate(payment.date)}
                                </span>
                              </div>
                              <p className="font-medium">{payment.description}</p>
                              {payment.paymentMethod && (
                                <p className="text-sm text-gray-600">Yöntem: {payment.paymentMethod}</p>
                              )}
                              {payment.receiptNumber && (
                                <p className="text-sm text-gray-600">Fiş No: {payment.receiptNumber}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className={`text-lg font-bold ${payment.type === "debt" ? "text-red-600" : "text-green-600"}`}>
                                {payment.type === "debt" ? "+" : "-"}{formatCurrency(payment.amount)}
                              </div>
                              <div className="text-sm text-gray-600">
                                {payment.currency}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {cariPayments.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          Henüz işlem bulunmuyor
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="details" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="text-sm text-gray-600">Şirket Adı</div>
                            <div className="font-medium">{selectedCari.companyName}</div>
                          </div>
                        </div>
                        {selectedCari.contactPerson && (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4" />
                            <div>
                              <div className="text-sm text-gray-600">İletişim Kişisi</div>
                              <div className="font-medium">{selectedCari.contactPerson}</div>
                            </div>
                          </div>
                        )}
                        {selectedCari.contactPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <div>
                              <div className="text-sm text-gray-600">Telefon</div>
                              <div className="font-medium">{selectedCari.contactPhone}</div>
                            </div>
                          </div>
                        )}
                        {selectedCari.contactEmail && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <div>
                              <div className="text-sm text-gray-600">E-posta</div>
                              <div className="font-medium">{selectedCari.contactEmail}</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {selectedCari.taxNumber && (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <div>
                              <div className="text-sm text-gray-600">Vergi Numarası</div>
                              <div className="font-medium">{selectedCari.taxNumber}</div>
                            </div>
                          </div>
                        )}
                        {selectedCari.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-500 mt-1" />
                            <div>
                              <div className="text-sm text-gray-600">Adres</div>
                              <div className="font-medium">{selectedCari.address}</div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4" />
                          <div>
                            <div className="text-sm text-gray-600">Oluşturulma Tarihi</div>
                            <div className="font-medium">{formatDate(selectedCari.createdAt)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {selectedCari.notes && (
                      <div className="pt-4 border-t">
                        <div className="text-sm text-gray-600 mb-2">Notlar</div>
                        <div className="bg-gray-50 p-3 rounded">{selectedCari.notes}</div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Cari Seçin</h3>
                  <p className="text-gray-600">Detayları görüntülemek için sol panelden bir cari seçin</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
