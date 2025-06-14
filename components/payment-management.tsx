"use client"

import { useState, useEffect } from "react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { CreditCard, Plus, PenSquare, Trash2, Building, Calendar, FileText } from "lucide-react"
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, Timestamp, orderBy } from "firebase/firestore"
import { getDb } from "../lib/firebase-client-module"
import { COLLECTIONS } from "../lib/db-firebase"
import { Badge } from "@/components/ui/badge"

// Ödeme için tip tanımı
interface Payment {
  id: string;
  companyId: string;
  companyName?: string; // Gösterim için eklenecek
  amount: number;
  currency: string;
  description: string;
  paymentDate: Date;
  paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'other';
  relatedDebtId?: string;
  relatedDebtDescription?: string; // Gösterim için eklenecek
  receiptNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Şirket tipi
interface Company {
  id: string;
  name: string;
}

// Borç tipi
interface Debt {
  id: string;
  companyId: string;
  description: string;
  amount: number;
  currency: string;
  paidAmount: number;
  status: string;
}

export default function PaymentManagement() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [filteredDebts, setFilteredDebts] = useState<Debt[]>([]);  const [formData, setFormData] = useState<Partial<Payment>>({
    companyId: "",
    amount: 0,
    currency: "TRY",
    description: "",
    paymentDate: new Date(),
    paymentMethod: "bank_transfer",
    relatedDebtId: "no-debt", // "" yerine "no-debt" kullanıyoruz
    receiptNumber: "",
    notes: ""
  });

  // Firebase'den tüm ödemeleri getir
  const loadData = async () => {
    try {
      setLoading(true);
      const db = getDb();
      
      // Firmaları yükle
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
      
      // Borçları yükle
      const debtsRef = collection(db, COLLECTIONS.DEBTS);
      const debtsQuery = query(debtsRef, orderBy("createdAt", "desc"));
      const debtsSnapshot = await getDocs(debtsQuery);
      const debtsList: Debt[] = [];
      
      debtsSnapshot.forEach((doc) => {
        const data = doc.data();
        debtsList.push({
          id: doc.id,
          companyId: data.companyId,
          description: data.description || "",
          amount: data.amount || 0,
          currency: data.currency || "TRY",
          paidAmount: data.paidAmount || 0,
          status: data.status || "unpaid"
        });
      });
      
      setDebts(debtsList);
      
      // Ödemeleri yükle
      const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
      const paymentsQuery = query(paymentsRef, orderBy("paymentDate", "desc"));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsList: Payment[] = [];
      
      paymentsSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // İlgili firma adını bul
        const company = companiesList.find(c => c.id === data.companyId);
        
        // İlgili borç açıklamasını bul
        const debt = data.relatedDebtId ? debtsList.find(d => d.id === data.relatedDebtId) : null;
        
        paymentsList.push({
          id: doc.id,
          companyId: data.companyId,
          companyName: company?.name || 'Bilinmeyen Firma',
          amount: data.amount || 0,
          currency: data.currency || "TRY",
          description: data.description || "",
          paymentDate: data.paymentDate?.toDate() || new Date(),
          paymentMethod: data.paymentMethod || "bank_transfer",
          relatedDebtId: data.relatedDebtId || undefined,
          relatedDebtDescription: debt?.description,
          receiptNumber: data.receiptNumber || "",
          notes: data.notes || "",
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });
      
      setPayments(paymentsList);
    } catch (error) {
      console.error("Ödemeler yüklenirken hata oluştu:", error);
      toast({
        title: "Hata!",
        description: "Ödemeler yüklenirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Component yüklendiğinde verileri getir
  useEffect(() => {
    loadData();
  }, []);

  // Şirket seçildiğinde, o şirkete ait borçları filtrele
  useEffect(() => {
    if (formData.companyId) {
      const filtered = debts.filter(debt => 
        debt.companyId === formData.companyId && 
        (debt.status === "unpaid" || debt.status === "partially_paid")
      );
      setFilteredDebts(filtered);
    } else {
      setFilteredDebts([]);
    }
  }, [formData.companyId, debts]);

  // Form alanlarının değişikliklerini izle
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? parseFloat(value) || 0 : value
    }));
  };
  
  // Select değişikliklerini izle
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    // Borç seçildiğinde ilgili borç tutarını ve para birimini otomatik doldur
    if (name === "relatedDebtId" && value) {
      const selectedDebt = debts.find(debt => debt.id === value);
      if (selectedDebt) {
        const remainingAmount = selectedDebt.amount - selectedDebt.paidAmount;
        setFormData((prev) => ({
          ...prev,
          amount: remainingAmount > 0 ? remainingAmount : 0,
          currency: selectedDebt.currency,
          description: `${selectedDebt.description} için ödeme`
        }));
      }
    }
  };
  
  // Tarih değişikliklerini izle
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value ? new Date(value) : new Date()
    }));
  };

  // Ödeme ekle veya güncelle
  const handleSavePayment = async () => {
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
          description: "Lütfen geçerli bir ödeme tutarı girin.",
          variant: "destructive"
        });
        return;
      }

      if (!formData.description || formData.description.trim() === "") {
        toast({
          title: "Hata!",
          description: "Lütfen ödeme açıklaması girin.",
          variant: "destructive"
        });
        return;
      }
      
      const db = getDb();
      const now = new Date();
      
      // relatedDebtId için temizleme işlemi
      const sanitizedData = {
        ...formData,
        relatedDebtId: formData.relatedDebtId === "no-debt" ? null : formData.relatedDebtId
      };
      
      if (formMode === 'add') {
        // Yeni ödeme ekle
        const newPaymentData = {
          ...sanitizedData, // formData yerine sanitizedData kullan
          createdAt: now,
          updatedAt: now
        };
        
        // Ödeme tarihini Timestamp'e çevir
        if (newPaymentData.paymentDate instanceof Date) {
          // @ts-ignore - Firebase'in Timestamp'i Date ile uyumsuz olabiliyor
          newPaymentData.paymentDate = Timestamp.fromDate(newPaymentData.paymentDate);
        }
        
        await addDoc(collection(db, COLLECTIONS.PAYMENTS), newPaymentData);
        
        // Eğer ilgili bir borç varsa, borç kaydını da güncelle
        if (formData.relatedDebtId) {
          const debtRef = doc(db, COLLECTIONS.DEBTS, formData.relatedDebtId);
          const debtToUpdate = debts.find(d => d.id === formData.relatedDebtId);
          
          if (debtToUpdate) {
            const newPaidAmount = (debtToUpdate.paidAmount || 0) + (formData.amount || 0);
            const newStatus = newPaidAmount >= debtToUpdate.amount ? "paid" : 
                             newPaidAmount > 0 ? "partially_paid" : "unpaid";
            
            await updateDoc(debtRef, {
              paidAmount: newPaidAmount,
              status: newStatus,
              updatedAt: now
            });
          }
        }
        
        toast({
          title: "Başarılı!",
          description: "Ödeme başarıyla kaydedildi.",
        });
      } else if (formMode === 'edit' && currentPayment) {
        // Eski ve yeni ödeme verisi arasındaki farkı hesapla
        const amountDiff = (formData.amount || 0) - (currentPayment.amount || 0);
        
        // Mevcut ödeme kaydını güncelle
        const paymentRef = doc(db, COLLECTIONS.PAYMENTS, currentPayment.id);
        
        const updateData = {
          ...sanitizedData, // formData yerine sanitizedData kullan
          updatedAt: now
        };
        
        // Ödeme tarihini Timestamp'e çevir
        if (updateData.paymentDate instanceof Date) {
          // @ts-ignore - Firebase'in Timestamp'i Date ile uyumsuz olabiliyor
          updateData.paymentDate = Timestamp.fromDate(updateData.paymentDate);
        }
        
        await updateDoc(paymentRef, updateData);
        
        // Borç ilişkisi değiştiyse veya miktar değiştiyse borç kaydını güncelle
        if (
          (formData.relatedDebtId && formData.relatedDebtId !== currentPayment.relatedDebtId) || 
          (currentPayment.relatedDebtId && formData.relatedDebtId !== currentPayment.relatedDebtId) ||
          amountDiff !== 0
        ) {          // Eski borç ilişkisini güncelle
          if (currentPayment.relatedDebtId) {
            const oldDebtRef = doc(db, COLLECTIONS.DEBTS, currentPayment.relatedDebtId);
            const oldDebt = debts.find(d => d.id === currentPayment.relatedDebtId);
            
            if (oldDebt) {
              const newPaidAmount = Math.max(0, (oldDebt.paidAmount || 0) - (currentPayment.amount || 0));
              const newStatus = newPaidAmount >= oldDebt.amount ? "paid" : 
                               newPaidAmount > 0 ? "partially_paid" : "unpaid";
              
              await updateDoc(oldDebtRef, {
                paidAmount: newPaidAmount,
                status: newStatus,
                updatedAt: now
              });
            }
          }
            // Yeni borç ilişkisini güncelle
          if (formData.relatedDebtId) {
            const newDebtRef = doc(db, COLLECTIONS.DEBTS, formData.relatedDebtId);
            const newDebt = debts.find(d => d.id === formData.relatedDebtId);
            
            if (newDebt) {
              const newPaidAmount = (newDebt.paidAmount || 0) + (formData.amount || 0);
              const newStatus = newPaidAmount >= newDebt.amount ? "paid" : 
                               newPaidAmount > 0 ? "partially_paid" : "unpaid";
              
              await updateDoc(newDebtRef, {
                paidAmount: newPaidAmount,
                status: newStatus,
                updatedAt: now
              });
            }
          }
        } else if (formData.relatedDebtId && amountDiff !== 0) {          // Aynı borç ama miktar değişti
          const debtRef = doc(db, COLLECTIONS.DEBTS, formData.relatedDebtId);
          const debtToUpdate = debts.find(d => d.id === formData.relatedDebtId);
          
          if (debtToUpdate) {
            const newPaidAmount = (debtToUpdate.paidAmount || 0) + amountDiff;
            const newStatus = newPaidAmount >= debtToUpdate.amount ? "paid" : 
                             newPaidAmount > 0 ? "partially_paid" : "unpaid";
            
            await updateDoc(debtRef, {
              paidAmount: newPaidAmount,
              status: newStatus,
              updatedAt: now
            });
          }
        }
        
        toast({
          title: "Başarılı!",
          description: "Ödeme başarıyla güncellendi.",
        });
      }
      
      // Diyaloğu kapat ve verileri yeniden yükle
      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Ödeme kaydedilirken hata oluştu:", error);
      toast({
        title: "Hata!",
        description: "Ödeme kaydedilirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  // Ödeme silme işlemi
  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm("Bu ödeme kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve ilişkili borç kayıtları da etkilenebilir.")) {
      return;
    }
    
    try {
      const db = getDb();
      
      // Silinecek ödeme bilgilerini al
      const paymentToDelete = payments.find(p => p.id === paymentId);
      
      if (!paymentToDelete) {
        toast({
          title: "Hata!",
          description: "Silinecek ödeme bulunamadı.",
          variant: "destructive"
        });
        return;
      }
      
      // Önce ödemeyi sil
      await deleteDoc(doc(db, COLLECTIONS.PAYMENTS, paymentId));
      
      // Eğer ilişkili bir borç varsa, borç kaydını güncelle
      if (paymentToDelete.relatedDebtId) {
        const debtRef = doc(db, COLLECTIONS.DEBTS, paymentToDelete.relatedDebtId);
        const debtToUpdate = debts.find(d => d.id === paymentToDelete.relatedDebtId);
        
        if (debtToUpdate) {
          const newPaidAmount = Math.max(0, (debtToUpdate.paidAmount || 0) - (paymentToDelete.amount || 0));
          const newStatus = newPaidAmount >= debtToUpdate.amount ? "paid" : 
                           newPaidAmount > 0 ? "partially_paid" : "unpaid";
          
          await updateDoc(debtRef, {
            paidAmount: newPaidAmount,
            status: newStatus,
            updatedAt: new Date()
          });
        }
      }
      
      toast({
        title: "Başarılı!",
        description: "Ödeme kaydı başarıyla silindi.",
      });
      
      // Ödeme listesini güncelle
      loadData();
    } catch (error) {
      console.error("Ödeme silinirken hata oluştu:", error);
      toast({
        title: "Hata!",
        description: "Ödeme silinirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  // Ödeme düzenle
  const handleEditPayment = (payment: Payment) => {
    setFormMode('edit');
    setCurrentPayment(payment);
    setFormData({
      companyId: payment.companyId,
      amount: payment.amount,
      currency: payment.currency,
      description: payment.description,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      relatedDebtId: payment.relatedDebtId,
      receiptNumber: payment.receiptNumber,
      notes: payment.notes
    });
    setDialogOpen(true);
  };
  // Yeni ödeme ekleme modunu aç
  const openAddDialog = () => {
    setFormMode('add');
    setCurrentPayment(null);
    setFormData({
      companyId: "",
      amount: 0,
      currency: "TRY",
      description: "",
      paymentDate: new Date(),
      paymentMethod: "bank_transfer",
      relatedDebtId: "no-debt", // "" yerine "no-debt" kullanıyoruz
      receiptNumber: "",
      notes: ""
    });
    setDialogOpen(true);
  };

  // Ödeme yöntemi türünü Türkçe metne çevir
  const paymentMethodText = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Nakit';
      case 'bank_transfer':
        return 'Banka Havalesi';
      case 'credit_card':
        return 'Kredi Kartı';
      case 'other':
        return 'Diğer';
      default:
        return method;
    }
  };

  // Para birimini formatlama
  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString('tr-TR')} ${currency}`;
  };

  // Tarihi formatlama
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('tr-TR').format(date);
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">Ödeme Yönetimi</CardTitle>
            <CardDescription>
              Tedarikçilere yapılan ödemeleri kaydedin ve takip edin
            </CardDescription>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" /> Ödeme Ekle
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p>Yükleniyor...</p>
            </div>
          ) : (
            <Table>
              <TableCaption>Toplam {payments.length} ödeme kaydı</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Ödeme Yöntemi</TableHead>
                  <TableHead>İlgili Borç</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Henüz kayıtlı ödeme bulunmamaktadır
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell className="font-medium">{payment.companyName}</TableCell>
                      <TableCell>{payment.description}</TableCell>
                      <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
                      <TableCell>{paymentMethodText(payment.paymentMethod)}</TableCell>
                      <TableCell>
                        {payment.relatedDebtDescription ? 
                          <Badge variant="outline">{payment.relatedDebtDescription}</Badge> : 
                          "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditPayment(payment)}
                        >
                          <PenSquare className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeletePayment(payment.id)}
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
              {formMode === 'add' ? 'Yeni Ödeme Ekle' : 'Ödeme Bilgilerini Düzenle'}
            </DialogTitle>
            <DialogDescription>
              Ödeme bilgilerini ekleyin veya güncelleyin
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
              <Label htmlFor="relatedDebtId" className="text-right">
                İlgili Borç
              </Label>
              <Select 
                value={formData.relatedDebtId || ""} 
                onValueChange={(value) => handleSelectChange("relatedDebtId", value)}
                disabled={!formData.companyId}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Borç seçin (opsiyonel)" />
                </SelectTrigger>                <SelectContent>
                  <SelectItem value="no-debt">Borç seçilmedi</SelectItem>
                  {filteredDebts.map((debt) => (
                    <SelectItem key={debt.id} value={debt.id}>
                      {debt.description} - {formatCurrency(debt.amount - debt.paidAmount, debt.currency)}
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
                Ödeme Tutarı
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
              <Label htmlFor="paymentDate" className="text-right">
                Ödeme Tarihi
              </Label>
              <Input
                id="paymentDate"
                name="paymentDate"
                type="date"
                value={formData.paymentDate ? new Date(formData.paymentDate.getTime() - (formData.paymentDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0] : ""}
                onChange={handleDateChange}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentMethod" className="text-right">
                Ödeme Yöntemi
              </Label>
              <Select 
                value={formData.paymentMethod} 
                onValueChange={(value) => handleSelectChange("paymentMethod", value as 'cash' | 'bank_transfer' | 'credit_card' | 'other')}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Ödeme yöntemi seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Nakit</SelectItem>
                  <SelectItem value="bank_transfer">Banka Havalesi</SelectItem>
                  <SelectItem value="credit_card">Kredi Kartı</SelectItem>
                  <SelectItem value="other">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="receiptNumber" className="text-right">
                Dekont / Fiş No
              </Label>
              <Input
                id="receiptNumber"
                name="receiptNumber"
                value={formData.receiptNumber}
                onChange={handleInputChange}
                className="col-span-3"
              />
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
            <Button type="button" onClick={handleSavePayment}>
              {formMode === 'add' ? 'Ekle' : 'Güncelle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
