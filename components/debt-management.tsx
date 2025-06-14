"use client"

import { useState } from "react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SupplierDebtDashboard } from "@/components/supplier-debt-dashboard"
import { CustomerDebtDashboard } from "@/components/customer-debt-dashboard"

export default function DebtManagement() {
  // Aktif sekmeyi izle
  const [activeTab, setActiveTab] = useState<"supplier" | "customer">("supplier");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Borç Yönetimi</h2>
      </div>
      
      <Tabs defaultValue="supplier" value={activeTab} onValueChange={(value) => setActiveTab(value as "supplier" | "customer")}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="supplier">Tedarikçi Borçları</TabsTrigger>
          <TabsTrigger value="customer">Müşteri Borçları</TabsTrigger>
        </TabsList>
        
        <TabsContent value="supplier">
          <SupplierDebtDashboard />
        </TabsContent>
        
        <TabsContent value="customer">
          <CustomerDebtDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Eski borç yönetimi işlevselliği (Artık kullanılmıyor)
function LegacyDebtManagement() {
  const { toast } = useToast();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentDebt, setCurrentDebt] = useState<Debt | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");  const [formData, setFormData] = useState<Partial<Debt>>({
    companyId: "",
    amount: 0,
    currency: "TRY", // Varsayılan değer
    description: "",
    dueDate: null,
    status: "unpaid",
    paidAmount: 0,
    relatedTourId: "no-tour", // Boş string yerine "no-tour" kullanıyoruz
    notes: ""
  });

  // Firebase'den tüm borçları getir
  const loadDebts = async () => {
    try {
      setLoading(true);
      const db = getDb();
      
      // Firmaları yükle (firma adlarını borçlar ile birleştirmek için)
      const companiesRef = collection(db, COLLECTIONS.COMPANIES);
      const companiesSnapshot = await getDocs(companiesRef);
      const companiesList: Company[] = [];
      
      companiesSnapshot.forEach((doc) => {
        const data = doc.data();
        companiesList.push({
          id: doc.id,
          name: data.name,
        });
      });
      
      setCompanies(companiesList);
      
      // Turları yükle (tur adlarını borçlar ile birleştirmek için)
      const toursRef = collection(db, COLLECTIONS.tours);
      const toursSnapshot = await getDocs(toursRef);
      const toursList: Tour[] = [];
      
      toursSnapshot.forEach((doc) => {
        const data = doc.data();
        toursList.push({
          id: doc.id,
          tourName: data.tourName || 'İsimsiz Tur',
        });
      });
      
      setTours(toursList);
        // Borçları yükle
      const debtsRef = collection(db, COLLECTIONS.DEBTS);
      let debtsQuery;
      
      // Filtre uygula - Bileşik sorgu için dizin gerekiyor, geçici çözüm için:
      if (filterStatus !== "all") {
        // Sadece durum filtresini uygulayalım, sıralama işlemini JavaScript tarafında yapalım
        debtsQuery = query(debtsRef, where("status", "==", filterStatus));
      } else {
        // Filtre yoksa sadece createdAt'e göre sıralayalım
        debtsQuery = query(debtsRef, orderBy("createdAt", "desc"));
      }
      
      const debtsSnapshot = await getDocs(debtsQuery);
      const debtsList: Debt[] = [];
      
      debtsSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // İlgili firma adını bul
        const company = companiesList.find(c => c.id === data.companyId);
        
        // İlgili tur adını bul
        const tour = data.relatedTourId ? toursList.find(t => t.id === data.relatedTourId) : null;
        
        debtsList.push({
          id: doc.id,
          companyId: data.companyId,
          companyName: company?.name || 'Bilinmeyen Firma',
          amount: data.amount || 0,
          currency: data.currency || "TRY",
          description: data.description || "",
          dueDate: data.dueDate ? data.dueDate.toDate() : null,
          status: data.status || "unpaid",
          paidAmount: data.paidAmount || 0,
          relatedTourId: data.relatedTourId || undefined,
          relatedTourName: tour?.tourName,
          notes: data.notes || "",
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()        });
      });
      
      // JavaScript tarafında createdAt'e göre azalan sıralama yapalım (en yeniden en eskiye)
      debtsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setDebts(debtsList);
    } catch (error) {
      console.error("Borçlar yüklenirken hata oluştu:", error);
      toast({
        title: "Hata!",
        description: "Borçlar yüklenirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Component yüklendiğinde borçları getir
  useEffect(() => {
    loadDebts();
  }, [filterStatus]);

  // Form alanlarının değişikliklerini izle
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" || name === "paidAmount" ? parseFloat(value) || 0 : value
    }));
  };
  
  // Select değişikliklerini izle
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Tarih değişikliklerini izle
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value ? new Date(value) : null
    }));
  };

  // Borç ekle veya güncelle
  const handleSaveDebt = async () => {
    try {
      // Form doğrulama
      if (!formData.companyId) {
        toast({
          title: "Hata!",
          description: "Lütfen bir firma seçin.",
          variant: "destructive"
        });
        return;
      }
      
      if (!formData.amount || formData.amount <= 0) {
        toast({
          title: "Hata!",
          description: "Lütfen geçerli bir borç tutarı girin.",
          variant: "destructive"
        });
        return;
      }

      if (!formData.description || formData.description.trim() === "") {
        toast({
          title: "Hata!",
          description: "Lütfen borç açıklaması girin.",
          variant: "destructive"
        });
        return;
      }
      
      const db = getDb();
      const now = new Date();

      // Otomatik durum kontrolü
      let status = formData.status || "unpaid";
      const amount = formData.amount || 0;
      const paidAmount = formData.paidAmount || 0;
      
      if (paidAmount >= amount) {
        status = "paid";
      } else if (paidAmount > 0) {
        status = "partially_paid";
      } else {
        status = "unpaid";
      }
      
      // relatedTourId değeri "no-tour" ise null olarak kaydedelim
      const sanitizedData = {
        ...formData,
        relatedTourId: formData.relatedTourId === "no-tour" ? null : formData.relatedTourId
      };
      
      if (formMode === 'add') {
        // Yeni borç ekle
        const newDebtData = {
          ...sanitizedData,  // formData yerine sanitizedData kullan
          status,
          createdAt: now,
          updatedAt: now
        };
          // Eğer dueDate tarih formatında geliyorsa Timestamp'e çevir
        if (newDebtData.dueDate instanceof Date) {
          // @ts-ignore - Firebase'in Timestamp'i Date ile uyumsuz olabiliyor
          newDebtData.dueDate = Timestamp.fromDate(newDebtData.dueDate);
        }
        
        await addDoc(collection(db, COLLECTIONS.DEBTS), newDebtData);
        
        toast({
          title: "Başarılı!",
          description: "Borç kaydı başarıyla eklendi.",
        });
      } else if (formMode === 'edit' && currentDebt) {
        // Mevcut borç kaydını güncelle
        const debtRef = doc(db, COLLECTIONS.DEBTS, currentDebt.id);
        
        const updateData = {
          ...sanitizedData,  // formData yerine sanitizedData kullan
          status,
          updatedAt: now
        };
          // Eğer dueDate tarih formatında geliyorsa Timestamp'e çevir
        if (updateData.dueDate instanceof Date) {
          // @ts-ignore - Firebase'in Timestamp'i Date ile uyumsuz olabiliyor
          updateData.dueDate = Timestamp.fromDate(updateData.dueDate);
        }
        
        await updateDoc(debtRef, updateData);
        
        toast({
          title: "Başarılı!",
          description: "Borç kaydı başarıyla güncellendi.",
        });
      }
      
      // Diyaloğu kapat ve borçları yeniden yükle
      setDialogOpen(false);
      loadDebts();
    } catch (error) {
      console.error("Borç kaydedilirken hata oluştu:", error);
      toast({
        title: "Hata!",
        description: "Borç kaydedilirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };  // Borç silme işlemi
  const handleDeleteDebt = async (debtId: string) => {
    if (!window.confirm("Bu borç kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
      return;
    }
    
    try {
      const db = getDb();
      
      // Silmeden önce borç bilgilerini ve ilgili tedarikçi ID'sini al
      const debtRef = doc(db, COLLECTIONS.DEBTS, debtId);
      const debtSnap = await getDoc(debtRef);
      
      if (!debtSnap.exists()) {
        toast({
          title: "Hata!",
          description: "Borç kaydı bulunamadı.",
          variant: "destructive"
        });
        return;
      }
      
      const debtData = debtSnap.data();
      const companyId = debtData.companyId;
      
      if (!companyId) {
        toast({
          title: "Hata!",
          description: "Borç kaydında tedarikçi bilgisi bulunamadı.",
          variant: "destructive"
        });
        return;
      }
      
      // Sadece borcu sil, firmalara dokunma
      await deleteDoc(doc(db, COLLECTIONS.DEBTS, debtId));
      
      // Güvenlik kontrolü - tedarikçi hala var mı kontrol et
      const companyRef = doc(db, COLLECTIONS.COMPANIES, companyId);
      const companySnap = await getDoc(companyRef);
      
      // Eğer tedarikçi silindiyse, tekrar oluştur
      if (!companySnap.exists()) {
        console.log("Tedarikçi firma kaydı silinmiş, tekrar oluşturuluyor");
        
        // En son bilinen firma adını almaya çalış
        const companyName = debts.find(debt => debt.companyId === companyId)?.companyName || "Yeniden Oluşturulan Firma";
        
        await setDoc(companyRef, {
          name: companyName,
          type: "supplier",
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log(`Firma yeniden oluşturuldu: ${companyName}`);
      }
      
      toast({
        title: "Başarılı!",
        description: "Borç kaydı başarıyla silindi.",
      });
      
      // Borç listesini güncelle
      loadDebts();
    } catch (error) {
      console.error("Borç silinirken hata oluştu:", error);
      toast({
        title: "Hata!",
        description: "Borç silinirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  // Borç düzenle
  const handleEditDebt = (debt: Debt) => {
    setFormMode('edit');
    setCurrentDebt(debt);
    setFormData({
      companyId: debt.companyId,
      amount: debt.amount,
      currency: debt.currency,
      description: debt.description,
      dueDate: debt.dueDate,
      status: debt.status,
      paidAmount: debt.paidAmount,
      relatedTourId: debt.relatedTourId,
      notes: debt.notes
    });
    setDialogOpen(true);
  };

  // Yeni borç ekleme modunu aç
  const openAddDialog = () => {
    setFormMode('add');
    setCurrentDebt(null);
    setFormData({
      companyId: "",
      amount: 0,
      currency: "TRY",
      description: "",
      dueDate: null,
      status: "unpaid",
      paidAmount: 0,
      relatedTourId: "",
      notes: ""
    });
    setDialogOpen(true);
  };

  // Ödeme durumuna göre stil belirle
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Ödendi</Badge>;
      case 'partially_paid':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Kısmen Ödendi</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Ödenmedi</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Bilinmiyor</Badge>;
    }
  };
  
  // Vade tarihi uyarısı - vadeye kaç gün kaldı?
  const getDueDateStatus = (dueDate: Date | null) => {
    if (!dueDate) return null;
    
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      // Vade geçmiş
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge className="bg-red-100 text-red-800">
                <AlertCircle className="h-3 w-3 mr-1" />
                {Math.abs(diffDays)} gün gecikmiş
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Vade tarihi geçmiş</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else if (diffDays <= 7) {
      // Vadeye 7 gün veya daha az kalmış
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge className="bg-yellow-100 text-yellow-800">
                <Clock className="h-3 w-3 mr-1" />
                {diffDays} gün kaldı
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Vade tarihi yaklaşıyor</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return null;
  };
  
  // Ödeme yüzdesini göster
  const getPaymentProgress = (debt: Debt) => {
    const percentage = debt.amount > 0 ? (debt.paidAmount / debt.amount) * 100 : 0;
    return (
      <div className="flex flex-col gap-1">
        <Progress value={percentage} className="h-2" />
        <div className="text-xs text-gray-500">
          {debt.paidAmount.toLocaleString('tr-TR')} / {debt.amount.toLocaleString('tr-TR')} {debt.currency} ({percentage.toFixed(0)}%)
        </div>
      </div>
    );
  };

  // Para birimini formatlama
  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString('tr-TR')} ${currency}`;
  };

  // Tarihi formatlama
  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat('tr-TR').format(date);
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">Borç Yönetimi</CardTitle>
            <CardDescription>
              Tedarikçilere olan borçlarınızı takip edin ve ödeme durumlarını güncelleyin
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select
              value={filterStatus}
              onValueChange={(value) => setFilterStatus(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Borçlar</SelectItem>
                <SelectItem value="unpaid">Ödenmemiş</SelectItem>
                <SelectItem value="partially_paid">Kısmen Ödenmiş</SelectItem>
                <SelectItem value="paid">Ödenmiş</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" /> Borç Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p>Yükleniyor...</p>
            </div>
          ) : (
            <Table>
              <TableCaption>Toplam {debts.length} borç kaydı</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Firma</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Vade Tarihi</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Ödeme</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Henüz kayıtlı borç bulunmamaktadır
                    </TableCell>
                  </TableRow>
                ) : (
                  debts.map((debt) => (
                    <TableRow key={debt.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{debt.companyName}</span>
                          {debt.relatedTourName && (
                            <span className="text-xs text-muted-foreground">
                              Tur: {debt.relatedTourName}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{debt.description}</TableCell>
                      <TableCell>{formatCurrency(debt.amount, debt.currency)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span>{formatDate(debt.dueDate)}</span>
                          {debt.dueDate && debt.status !== 'paid' && getDueDateStatus(debt.dueDate)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(debt.status)}</TableCell>
                      <TableCell>
                        {getPaymentProgress(debt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditDebt(debt)}
                        >
                          <PenSquare className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteDebt(debt.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'add' ? 'Yeni Borç Ekle' : 'Borç Bilgilerini Düzenle'}
            </DialogTitle>
            <DialogDescription>
              Borç bilgilerini ekleyin veya güncelleyin
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="companyId" className="text-right">
                Firma
              </Label>
              <Select 
                value={formData.companyId} 
                onValueChange={(value) => handleSelectChange("companyId", value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Firma seçin" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Açıklama
              </Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Borç Tutarı
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={handleInputChange}
                className="col-span-2"
                required
              />
              <Select 
                value={formData.currency} 
                onValueChange={(value) => handleSelectChange("currency", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Para Birimi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paidAmount" className="text-right">
                Ödenen Tutar
              </Label>
              <Input
                id="paidAmount"
                name="paidAmount"
                type="number"
                step="0.01"
                value={formData.paidAmount}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                Vade Tarihi
              </Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                value={formData.dueDate ? new Date(formData.dueDate.getTime() - (formData.dueDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0] : ""}
                onChange={handleDateChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="relatedTourId" className="text-right">
                İlgili Tur
              </Label>
              <Select 
                value={formData.relatedTourId || ""} 
                onValueChange={(value) => handleSelectChange("relatedTourId", value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Tur seçin (opsiyonel)" />
                </SelectTrigger>                <SelectContent>
                  <SelectItem value="no-tour">Tur seçilmedi</SelectItem>
                  {tours.map((tour) => (
                    <SelectItem key={tour.id} value={tour.id}>
                      {tour.tourName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notlar
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">İptal</Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveDebt}>
              {formMode === 'add' ? 'Ekle' : 'Güncelle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
