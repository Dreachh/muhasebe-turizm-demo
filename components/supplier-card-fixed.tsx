"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addDoc, updateDoc, deleteDoc, doc, collection } from "firebase/firestore"
import { getDb } from "@/lib/firebase-client-module"
import { COLLECTIONS } from "@/lib/db-firebase"
import { useToast } from "@/components/ui/use-toast"

// Yardımcı fonksiyonlar
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date))
}

// Supplier tipi tanımları için import
import { Supplier, Debt, Payment, CurrencyDataRecord } from "@/types/supplier-types"

export function SupplierCard({ 
  supplier, 
  onUpdate 
}: { 
  supplier: Supplier; 
  onUpdate: (updatedSupplier: Supplier) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { toast } = useToast()
  
  const [isAddDebtDialogOpen, setIsAddDebtDialogOpen] = useState(false)
  const [isEditDebtDialogOpen, setIsEditDebtDialogOpen] = useState(false)
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false)
  const [isEditPaymentDialogOpen, setIsEditPaymentDialogOpen] = useState(false)
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | null>(null)
  const [selectedDebtForEdit, setSelectedDebtForEdit] = useState<Debt | null>(null)
  const [selectedPaymentForEdit, setSelectedPaymentForEdit] = useState<Payment | null>(null)
  
  // Düzenlenecek borç ve ödeme için geçici formlar
  const [editDebt, setEditDebt] = useState({
    id: "",
    amount: "",
    currency: "TRY",
    description: "",
    date: "",
    status: "unpaid"
  })
  
  const [editPayment, setEditPayment] = useState({
    id: "",
    debtId: "",
    amount: "",
    currency: "TRY",
    description: "",
    date: ""
  })
  
  // Silme işlemleri için onay dialog durumları
  const [isDeleteDebtDialogOpen, setIsDeleteDebtDialogOpen] = useState(false)
  const [isDeletePaymentDialogOpen, setIsDeletePaymentDialogOpen] = useState(false)
  const [isDeleteSupplierDialogOpen, setIsDeleteSupplierDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)

  const [newDebt, setNewDebt] = useState({
    amount: "",
    currency: "TRY",
    description: "",
    date: new Date().toISOString().split("T")[0],
  })
  
  const [newPayment, setNewPayment] = useState({
    debtId: "general",
    amount: "",
    currency: "TRY",
    description: "",
    date: new Date().toISOString().split("T")[0],
  })

  // Para birimine göre borç ve ödemeleri grupla
  const debtsByCurrency: CurrencyDataRecord = {}
  const paymentsByCurrency: CurrencyDataRecord = {}

  supplier.debts.forEach((debt) => {
    if (!debtsByCurrency[debt.currency]) {
      debtsByCurrency[debt.currency] = { total: 0, items: [] }
    }
    debtsByCurrency[debt.currency].total += debt.amount
    debtsByCurrency[debt.currency].items.push(debt)
  })

  supplier.payments.forEach((payment) => {
    if (!paymentsByCurrency[payment.currency]) {
      paymentsByCurrency[payment.currency] = { total: 0, items: [] }
    }
    paymentsByCurrency[payment.currency].total += payment.amount
    paymentsByCurrency[payment.currency].items.push(payment)
  })
  
  // Her para birimi için kalan bakiyeyi hesapla
  const balanceByCurrency: {[key: string]: number} = {}
  
  // Önce tüm borç para birimlerini ekle
  Object.keys(debtsByCurrency).forEach((currency) => {
    balanceByCurrency[currency] = debtsByCurrency[currency].total
  })
  
  // Sonra ödemeleri çıkar
  Object.keys(paymentsByCurrency).forEach((currency) => {
    if (balanceByCurrency[currency]) {
      balanceByCurrency[currency] -= paymentsByCurrency[currency].total
    } else {
      balanceByCurrency[currency] = -paymentsByCurrency[currency].total
    }
  })

  // Toplam bakiye ve ödenmiş tutarlar
  const totalBalance = (supplier.totalDebt || 0) - (supplier.totalPaid || 0)

  // Borç durumu
  const hasPendingDebts = totalBalance > 0
  
  // Borç ekleme fonksiyonu
  const handleAddDebt = async () => {
    try {
      const db = getDb();
      const newDebtData = {
        companyId: supplier.id,
        amount: parseFloat(newDebt.amount),
        currency: newDebt.currency,
        description: newDebt.description,
        dueDate: new Date(newDebt.date),
        status: "unpaid",
        paidAmount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await addDoc(collection(db, COLLECTIONS.DEBTS), newDebtData);
      
      setNewDebt({
        amount: "",
        currency: "TRY",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      
      setIsAddDebtDialogOpen(false);
      
      toast({
        title: "Borç eklendi",
        description: "Yeni borç başarıyla eklendi.",
      });
      
      // Listeyi güncelle
      if (onUpdate) onUpdate(supplier);
      
    } catch (error) {
      console.error("Borç eklenirken hata:", error);
      toast({
        title: "Hata",
        description: "Borç eklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };
  
  // Ödeme ekleme fonksiyonu
  const handleAddPayment = async () => {
    try {
      // Form doğrulama
      if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
        toast({
          title: "Hata",
          description: "Geçerli bir ödeme tutarı girin.",
          variant: "destructive"
        });
        return;
      }
      
      if (!newPayment.description || newPayment.description.trim() === "") {
        toast({
          title: "Hata", 
          description: "Lütfen ödeme açıklaması girin.",
          variant: "destructive"
        });
        return;
      }
      
      if (!newPayment.date) {
        toast({
          title: "Hata",
          description: "Lütfen ödeme tarihi seçin.",
          variant: "destructive"
        });
        return;
      }
      
      const db = getDb();
      
      // Ödeme nesnesini oluştur ve debtId değerini kontrol et
      const newPaymentData = {
        companyId: supplier.id,
        debtId: newPayment.debtId === "general" ? null : newPayment.debtId, // null veya geçerli bir ID olduğundan emin ol
        amount: parseFloat(newPayment.amount),
        currency: newPayment.currency,
        description: newPayment.description,
        paymentDate: new Date(newPayment.date),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Debug için çıktı
      console.log("Eklenen ödeme verisi:", newPaymentData);
      await addDoc(collection(db, COLLECTIONS.PAYMENTS), newPaymentData);
      
      // İlgili borcu güncelle
      if (newPayment.debtId && newPayment.debtId !== "general") {
        console.log("Borç güncellemesi yapılıyor:", newPayment.debtId);
        
        const debtRef = doc(db, COLLECTIONS.DEBTS, newPayment.debtId);
        const debtToUpdate = supplier.debts.find(d => d.id === newPayment.debtId);
        
        if (debtToUpdate) {
          console.log("Güncellenecek borç bulundu:", debtToUpdate);
          
          const currentPaidAmount = debtToUpdate.paidAmount || 0;
          const newPaidAmount = currentPaidAmount + parseFloat(newPayment.amount);
          const totalAmount = debtToUpdate.amount;
          
          console.log("Önceki ödenen:", currentPaidAmount, "Yeni ödenen:", newPaidAmount, "Toplam borç:", totalAmount);
          
          // Borç durumunu güncelle
          let newStatus = "unpaid";
          if (newPaidAmount >= totalAmount) {
            newStatus = "paid";
          } else if (newPaidAmount > 0) {
            newStatus = "partially_paid";
          }
          
          console.log("Yeni borç durumu:", newStatus);
          
          await updateDoc(debtRef, {
            paidAmount: newPaidAmount,
            status: newStatus,
            updatedAt: new Date()
          });
        }
      }
      
      setNewPayment({
        debtId: "general",
        amount: "",
        currency: "TRY",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      
      setIsAddPaymentDialogOpen(false);
      
      toast({
        title: "Ödeme eklendi",
        description: "Yeni ödeme başarıyla kaydedildi.",
      });
      
      // Listeyi güncelle
      if (onUpdate) onUpdate(supplier);
      
    } catch (error) {
      console.error("Ödeme eklenirken hata:", error);
      toast({
        title: "Hata",
        description: "Ödeme eklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };
  
  // Borç silme için onay dialogu açma
  const confirmDeleteDebt = (debtId: string) => {
    setItemToDelete(debtId);
    setIsDeleteDebtDialogOpen(true);
  };  // Borç silme fonksiyonu
  const handleDeleteDebt = async () => {
    if (!itemToDelete) return;
    
    try {
      const debtId = itemToDelete;
      const db = getDb();
      
      // Silmeden önce tedarikçi ID'sini hatırla
      const debtToDelete = supplier.debts.find(d => d.id === debtId);
      const companyId = debtToDelete?.companyId || supplier.id;
      
      // Sadece borcu sil, firmalara dokunma
      await deleteDoc(doc(db, COLLECTIONS.DEBTS, debtId));
      
      // Güvenlik kontrolü - tedarikçi hala var mı kontrol et
      const companyRef = doc(db, COLLECTIONS.COMPANIES, companyId);
      const companySnap = await getDoc(companyRef);
      
      // Eğer tedarikçi silindiyse, tekrar oluştur
      if (!companySnap.exists()) {
        console.log("Tedarikçi firma kaydı silinmiş, tekrar oluşturuluyor:", supplier.name);
        await setDoc(companyRef, {
          name: supplier.name,
          type: "supplier",
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      toast({
        title: "Borç silindi",
        description: "Borç başarıyla silindi.",
      });
      
      // Listeyi güncelle
      if (onUpdate) onUpdate(supplier);
      
    } catch (error) {
      console.error("Borç silinirken hata:", error);
      toast({
        title: "Hata",
        description: "Borç silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setItemToDelete(null);
      setIsDeleteDebtDialogOpen(false);
    }
  };
  
  // Ödeme silme için onay dialogu açma
  const confirmDeletePayment = (paymentId: string) => {
    setItemToDelete(paymentId);
    setIsDeletePaymentDialogOpen(true);
  };

  // Ödeme silme fonksiyonu
  const handleDeletePayment = async () => {
    if (!itemToDelete) return;
    
    try {
      const paymentId = itemToDelete;
      const db = getDb();
      await deleteDoc(doc(db, COLLECTIONS.PAYMENTS, paymentId));
      
      toast({
        title: "Ödeme silindi",
        description: "Ödeme başarıyla silindi.",
      });
      
      // Listeyi güncelle
      if (onUpdate) onUpdate(supplier);
    } catch (error) {
      console.error("Ödeme silinirken hata:", error);
      toast({
        title: "Hata",
        description: "Ödeme silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setItemToDelete(null);
      setIsDeletePaymentDialogOpen(false);
    }
  };
  
  // Tedarikçi silme için onay dialogu açma
  const confirmDeleteSupplier = () => {
    setIsDeleteSupplierDialogOpen(true);
  };
    // Tedarikçi silme fonksiyonu
  const handleDeleteSupplier = async () => {
    try {
      const db = getDb();
      
      // Önce tedarikçiye ait borçları sil
      for (const debt of supplier.debts) {
        await deleteDoc(doc(db, COLLECTIONS.DEBTS, debt.id));
      }
      
      // Sonra tedarikçiye ait ödemeleri sil
      for (const payment of supplier.payments) {
        await deleteDoc(doc(db, COLLECTIONS.PAYMENTS, payment.id));
      }
      
      // NOT: Artık tedarikçi firma kaydını silmiyoruz, sadece type özelliğini güncelleyerek tedarikçi olmaktan çıkarıyoruz
      const companyRef = doc(db, COLLECTIONS.COMPANIES, supplier.id);
      await updateDoc(companyRef, {
        type: "company", // supplier yerine normal company olarak güncelle
        updatedAt: new Date()
      });
      
      toast({
        title: "Tedarikçi silindi",
        description: "Tedarikçi borç listesinden çıkarıldı ve tüm borç/ödemeleri silindi.",
      });
      
      // Listeyi güncelle
      if (onUpdate) onUpdate(supplier);
      
    } catch (error) {
      console.error("Tedarikçi silinirken hata:", error);
      toast({
        title: "Hata",
        description: "Tedarikçi silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteSupplierDialogOpen(false);
    }
  };
  
  const preparePaymentForDebt = (debt: Debt) => {
    try {
      // Debug için bilgileri konsola yazdır
      console.log("Borç için ödeme hazırlanıyor:", debt);
      
      setSelectedDebtForPayment(debt);
      
      // Borç durumunu kontrol et
      // paidAmount undefined olabilir, bu yüzden kontrol edelim
      const currentPaidAmount = debt.paidAmount || 0;
      const remainingAmount = debt.amount - currentPaidAmount;
      
      console.log("Borç tutarı:", debt.amount, "Ödenmiş tutar:", currentPaidAmount, "Kalan:", remainingAmount);
      
      setNewPayment({
        debtId: debt.id,
        amount: remainingAmount > 0 ? remainingAmount.toString() : debt.amount.toString(),
        currency: debt.currency,
        description: `${debt.description} için ödeme`,
        date: new Date().toISOString().split("T")[0],
      });
      
      // Dialog açmadan önce yeni ödeme nesnesini logla
      console.log("Yeni ödeme bilgileri:", {
        debtId: debt.id,
        amount: remainingAmount > 0 ? remainingAmount.toString() : debt.amount.toString(),
        currency: debt.currency
      });
      
      // Dialog'u açıyoruz
      setIsAddPaymentDialogOpen(true);
      
    } catch (error) {
      console.error("Ödeme hazırlanırken hata:", error);
      toast({
        title: "Hata",
        description: "Ödeme hazırlanırken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };
  
  // Borç düzenleme için form hazırlama
  const prepareEditDebt = (debt: any) => {
    setSelectedDebtForEdit(debt);
    setEditDebt({
      id: debt.id,
      amount: debt.amount.toString(),
      currency: debt.currency,
      description: debt.description,
      date: debt.date,
      status: debt.status
    });
    setIsEditDebtDialogOpen(true);
  };
  
  // Borç düzenleme fonksiyonu
  const handleEditDebt = async () => {
    if (!editDebt.id || !editDebt.amount || !editDebt.description || !editDebt.date) {
      toast({
        title: "Hata",
        description: "Lütfen tüm zorunlu alanları doldurun.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const db = getDb();
      
      // Borç durumu ile ilgili kontrol yapalım
      const status = editDebt.status;
      let paidAmount = 0;
      
      if (selectedDebtForEdit) {
        paidAmount = selectedDebtForEdit.paidAmount || 0;
      }
      
      // Eğer tam ödeme yapılmışsa borç durumu da "paid" olmalı
      if (status === 'paid') {
        paidAmount = parseFloat(editDebt.amount);
      }
      
      await updateDoc(doc(db, COLLECTIONS.DEBTS, editDebt.id), {
        amount: parseFloat(editDebt.amount),
        currency: editDebt.currency,
        description: editDebt.description,
        dueDate: new Date(editDebt.date),
        status: editDebt.status,
        paidAmount: paidAmount,
        updatedAt: new Date()
      });
      
      toast({
        title: "Borç güncellendi",
        description: "Borç bilgileri başarıyla güncellendi.",
      });
      
      setIsEditDebtDialogOpen(false);
      setSelectedDebtForEdit(null);
      
      // Listeyi güncelle
      if (onUpdate) onUpdate(supplier);
      
    } catch (error) {
      console.error("Borç güncellenirken hata:", error);
      toast({
        title: "Hata",
        description: "Borç güncellenirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };
  
  // Ödeme düzenleme için form hazırlama
  const prepareEditPayment = (payment: any) => {
    // İlgili borcu bulmak için
    const relatedDebt = supplier.debts.find((d: any) => d.id === payment.debtId);
    
    setSelectedPaymentForEdit(payment);
    setEditPayment({
      id: payment.id,
      debtId: payment.debtId || "general",
      amount: payment.amount.toString(),
      currency: payment.currency,
      description: payment.description,
      date: payment.date
    });
    setIsEditPaymentDialogOpen(true);
  };
  
  // Ödeme düzenleme fonksiyonu
  const handleEditPayment = async () => {
    if (!editPayment.amount || !editPayment.description || !editPayment.date) {
      toast({
        title: "Hata",
        description: "Lütfen tüm zorunlu alanları doldurun.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const db = getDb();
      if (!selectedPaymentForEdit) return;
      
      const oldPayment = selectedPaymentForEdit;
      const newAmount = parseFloat(editPayment.amount);
      
      // Ödeme nesnesini güncelle
      await updateDoc(doc(db, COLLECTIONS.PAYMENTS, editPayment.id), {
        amount: newAmount,
        currency: editPayment.currency,
        description: editPayment.description,
        paymentDate: new Date(editPayment.date),
        debtId: editPayment.debtId === "general" ? null : editPayment.debtId,
        updatedAt: new Date()
      });
      
      // Eğer ödeme bir borca bağlıysa ilgili borcu da güncelle
      if (oldPayment.debtId && oldPayment.debtId !== "general") {
        // Eski borçtan ödemeyi çıkar
        const oldDebt = supplier.debts.find((d: any) => d.id === oldPayment.debtId);
        if (oldDebt) {
          const oldPaidAmount = oldDebt.paidAmount || 0;
          const updatedPaidAmount = oldPaidAmount - oldPayment.amount;
          
          await updateDoc(doc(db, COLLECTIONS.DEBTS, oldDebt.id), {
            paidAmount: Math.max(0, updatedPaidAmount),
            status: updatedPaidAmount <= 0 ? "unpaid" : (updatedPaidAmount >= oldDebt.amount ? "paid" : "partially_paid"),
            updatedAt: new Date()
          });
        }
      }
      
      // Eğer yeni ödeme bir borca bağlanıyorsa o borcu güncelle
      if (editPayment.debtId && editPayment.debtId !== "general") {
        const newDebt = supplier.debts.find((d: any) => d.id === editPayment.debtId);
        if (newDebt) {
          const currentPaidAmount = newDebt.paidAmount || 0;
          const newPaidAmount = currentPaidAmount + newAmount;
          
          await updateDoc(doc(db, COLLECTIONS.DEBTS, newDebt.id), {
            paidAmount: newPaidAmount,
            status: newPaidAmount >= newDebt.amount ? "paid" : "partially_paid",
            updatedAt: new Date()
          });
        }
      }
      
      toast({
        title: "Ödeme güncellendi",
        description: "Ödeme bilgileri başarıyla güncellendi.",
      });
      
      setIsEditPaymentDialogOpen(false);
      setSelectedPaymentForEdit(null);
      
      // Listeyi güncelle
      if (onUpdate) onUpdate(supplier);
      
    } catch (error) {
      console.error("Ödeme güncellenirken hata:", error);
      toast({
        title: "Hata",
        description: "Ödeme güncellenirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card className={`border ${hasPendingDebts ? "border-amber-300" : "border-green-300"}`}>
      {/* Borç Silme Onay Dialogu */}
      <AlertDialog open={isDeleteDebtDialogOpen} onOpenChange={setIsDeleteDebtDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Borç Silinecek</AlertDialogTitle>
            <AlertDialogDescription>
              Bu borcu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDebt} className="bg-red-600 hover:bg-red-700">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Ödeme Silme Onay Dialogu */}
      <AlertDialog open={isDeletePaymentDialogOpen} onOpenChange={setIsDeletePaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ödeme Silinecek</AlertDialogTitle>
            <AlertDialogDescription>
              Bu ödemeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment} className="bg-red-600 hover:bg-red-700">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Tedarikçi Silme Onay Dialogu */}
      <AlertDialog open={isDeleteSupplierDialogOpen} onOpenChange={setIsDeleteSupplierDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tedarikçi Silinecek</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{supplier.name}</strong> tedarikçisini ve ona ait tüm borç ve ödemeleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSupplier} className="bg-red-600 hover:bg-red-700">
              Tedarikçiyi Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Borç Düzenleme Dialogu */}
      <Dialog open={isEditDebtDialogOpen} onOpenChange={setIsEditDebtDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borç Düzenle: {supplier.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="editAmount" className="text-sm font-medium leading-none">
                  Miktar
                </label>
                <Input
                  id="editAmount"
                  placeholder="0.00"
                  type="number"
                  value={editDebt.amount}
                  onChange={(e) => setEditDebt({ ...editDebt, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="editCurrency" className="text-sm font-medium leading-none">
                  Para Birimi
                </label>
                <Select 
                  value={editDebt.currency} 
                  onValueChange={(value) => setEditDebt({ ...editDebt, currency: value })}
                >
                  <SelectTrigger id="editCurrency">
                    <SelectValue placeholder="Para birimi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">Türk Lirası</SelectItem>
                    <SelectItem value="USD">Amerikan Doları</SelectItem>
                    <SelectItem value="EUR">Euro</SelectItem>
                    <SelectItem value="GBP">İngiliz Sterlini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="editDescription" className="text-sm font-medium leading-none">
                Açıklama
              </label>
              <Input
                id="editDescription"
                placeholder="Borç açıklaması"
                value={editDebt.description}
                onChange={(e) => setEditDebt({ ...editDebt, description: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="editDate" className="text-sm font-medium leading-none">
                Vade Tarihi
              </label>
              <Input
                id="editDate"
                type="date"
                value={editDebt.date}
                onChange={(e) => setEditDebt({ ...editDebt, date: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="editStatus" className="text-sm font-medium leading-none">
                Durum
              </label>
              <Select 
                value={editDebt.status} 
                onValueChange={(value) => setEditDebt({ ...editDebt, status: value })}
              >
                <SelectTrigger id="editStatus">
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Ödenmedi</SelectItem>
                  <SelectItem value="partially_paid">Kısmen Ödendi</SelectItem>
                  <SelectItem value="paid">Ödendi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDebtDialogOpen(false)}>İptal</Button>
            <Button onClick={handleEditDebt}>Güncelle</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Ödeme Düzenleme Dialogu */}
      <Dialog open={isEditPaymentDialogOpen} onOpenChange={setIsEditPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ödeme Düzenle: {supplier.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="editDebtId" className="text-sm font-medium leading-none">
                İlgili Borç
              </label>
              <Select 
                value={editPayment.debtId} 
                onValueChange={(value) => setEditPayment({ ...editPayment, debtId: value })}
              >
                <SelectTrigger id="editDebtId">
                  <SelectValue placeholder="Borç seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Genel Ödeme (Borç seçilmedi)</SelectItem>
                  {supplier.debts.map((debt) => (
                    <SelectItem key={debt.id} value={debt.id}>
                      {debt.description} ({formatCurrency(debt.amount, debt.currency)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="editPaymentAmount" className="text-sm font-medium leading-none">
                  Miktar
                </label>
                <Input
                  id="editPaymentAmount"
                  placeholder="0.00"
                  type="number"
                  value={editPayment.amount}
                  onChange={(e) => setEditPayment({ ...editPayment, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="editPaymentCurrency" className="text-sm font-medium leading-none">
                  Para Birimi
                </label>
                <Select 
                  value={editPayment.currency} 
                  onValueChange={(value) => setEditPayment({ ...editPayment, currency: value })}
                >
                  <SelectTrigger id="editPaymentCurrency">
                    <SelectValue placeholder="Para birimi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">Türk Lirası</SelectItem>
                    <SelectItem value="USD">Amerikan Doları</SelectItem>
                    <SelectItem value="EUR">Euro</SelectItem>
                    <SelectItem value="GBP">İngiliz Sterlini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="editPaymentDescription" className="text-sm font-medium leading-none">
                Açıklama
              </label>
              <Input
                id="editPaymentDescription"
                placeholder="Ödeme açıklaması"
                value={editPayment.description}
                onChange={(e) => setEditPayment({ ...editPayment, description: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="editPaymentDate" className="text-sm font-medium leading-none">
                Ödeme Tarihi
              </label>
              <Input
                id="editPaymentDate"
                type="date"
                value={editPayment.date}
                onChange={(e) => setEditPayment({ ...editPayment, date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditPaymentDialogOpen(false)}>İptal</Button>
            <Button onClick={handleEditPayment}>Güncelle</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <CardHeader className="bg-slate-50">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer flex-1" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <h3 className="text-lg font-semibold">{supplier.name}</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${hasPendingDebts ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
              {hasPendingDebts ? "Aktif Borç" : "Tüm Ödemeler Tamam"}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            {Object.entries(balanceByCurrency).map(([currency, balance]) => (
              balance !== 0 && (
                <span 
                  key={currency}
                  className={`font-semibold ${balance > 0 ? "text-red-600" : balance < 0 ? "text-green-600" : "text-gray-600"}`}
                >
                  {formatCurrency(Math.abs(balance as number), currency)}
                  {balance > 0 ? " borç" : " fazla ödeme"}
                </span>
              )
            ))}
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" 
              onClick={(e) => {
                e.stopPropagation();
                confirmDeleteSupplier();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-6">
          <Tabs defaultValue="debts">
            <TabsList className="mb-4">
              <TabsTrigger value="debts">Borçlar</TabsTrigger>
              <TabsTrigger value="payments">Ödemeler</TabsTrigger>
              <TabsTrigger value="summary">Özet</TabsTrigger>
            </TabsList>
            
            <TabsContent value="debts">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Borçlar</h3>
                  <Dialog open={isAddDebtDialogOpen} onOpenChange={setIsAddDebtDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">Borç Ekle</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Borç Ekle: {supplier.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label htmlFor="amount" className="text-sm font-medium leading-none">
                              Miktar
                            </label>
                            <Input
                              id="amount"
                              placeholder="0.00"
                              type="number"
                              value={newDebt.amount}
                              onChange={(e) => setNewDebt({ ...newDebt, amount: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="currency" className="text-sm font-medium leading-none">
                              Para Birimi
                            </label>
                            <Select 
                              value={newDebt.currency} 
                              onValueChange={(value) => setNewDebt({ ...newDebt, currency: value })}
                            >
                              <SelectTrigger id="currency">
                                <SelectValue placeholder="Para birimi seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TRY">Türk Lirası</SelectItem>
                                <SelectItem value="USD">Amerikan Doları</SelectItem>
                                <SelectItem value="EUR">Euro</SelectItem>
                                <SelectItem value="GBP">İngiliz Sterlini</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="description" className="text-sm font-medium leading-none">
                            Açıklama
                          </label>
                          <Input
                            id="description"
                            placeholder="Borç açıklaması"
                            value={newDebt.description}
                            onChange={(e) => setNewDebt({ ...newDebt, description: e.target.value })}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="date" className="text-sm font-medium leading-none">
                            Vade Tarihi
                          </label>
                          <Input
                            id="date"
                            type="date"
                            value={newDebt.date}
                            onChange={(e) => setNewDebt({ ...newDebt, date: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={handleAddDebt}>Borç Ekle</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {Object.entries(debtsByCurrency).map(([currency, data]) => (
                  <div key={`debts-${currency}`} className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{currency} Cinsinden Borçlar</span>
                      <span>{formatCurrency(data.total, currency)}</span>
                    </div>
                    
                    <div className="space-y-2">
                      {data.items.map((debt) => (
                        <div key={debt.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <div className="flex-1">
                            <p className="font-medium">{debt.description}</p>
                            <p className="text-sm text-gray-500">Vade: {formatDate(debt.date)}</p>
                          </div>
                          <div className="flex items-center space-x-4">                            
                            <div className="flex flex-col items-end">
                              <span className={`font-semibold ${debt.status === 'paid' ? "text-green-600" : debt.status === 'partially_paid' ? "text-blue-600" : "text-amber-600"}`}>
                                {formatCurrency(debt.amount, debt.currency)}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                debt.status === 'paid' 
                                  ? "bg-green-100 text-green-800" 
                                  : debt.status === 'partially_paid' 
                                    ? "bg-blue-100 text-blue-800" 
                                    : "bg-amber-100 text-amber-800"
                              }`}>
                                {debt.status === 'paid' 
                                  ? "Ödendi" 
                                  : debt.status === 'partially_paid' 
                                    ? "Kısmen Ödendi" 
                                    : "Ödenmedi"}
                              </span>
                            </div>
                            <div className="flex space-x-1">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                title="Borcu Düzenle"
                                onClick={() => prepareEditDebt(debt)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Borcu Sil"
                                onClick={() => confirmDeleteDebt(debt.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => preparePaymentForDebt(debt)}
                              >
                                Ödeme Ekle
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {Object.keys(debtsByCurrency).length === 0 && (
                  <p className="text-center py-4 text-gray-500">Bu tedarikçi için borç bulunmamaktadır.</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="payments">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Ödemeler</h3>
                  <Dialog open={isAddPaymentDialogOpen} onOpenChange={setIsAddPaymentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">Ödeme Ekle</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ödeme Ekle: {supplier.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label htmlFor="debtId" className="text-sm font-medium leading-none">
                            İlgili Borç
                          </label>
                          <Select 
                            value={newPayment.debtId} 
                            onValueChange={(value) => {
                              console.log("Borç seçildi:", value);
                              const selectedDebt = supplier.debts.find(d => d.id === value);
                              console.log("Seçilen borç:", selectedDebt);
                              
                              setNewPayment({ 
                                ...newPayment, 
                                debtId: value,
                                currency: selectedDebt ? selectedDebt.currency : "TRY",
                                amount: selectedDebt ? (
                                  selectedDebt.paidAmount ? 
                                    (selectedDebt.amount - selectedDebt.paidAmount).toString() : 
                                    selectedDebt.amount.toString()
                                ) : ""
                              });
                            }}
                          >
                            <SelectTrigger id="debtId">
                              <SelectValue placeholder="Borç seçin (opsiyonel)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">Genel Ödeme (Borç seçilmedi)</SelectItem>
                              {supplier.debts
                                .filter(debt => debt.status !== "paid")
                                .map((debt) => (
                                  <SelectItem key={debt.id} value={debt.id}>
                                    {debt.description} ({formatCurrency(debt.amount, debt.currency)}) 
                                    {(debt.paidAmount || 0) > 0 && ` (${formatCurrency(debt.paidAmount || 0, debt.currency)} ödenmiş)`}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label htmlFor="paymentAmount" className="text-sm font-medium leading-none">
                              Miktar
                            </label>
                            <Input
                              id="paymentAmount"
                              placeholder="0.00"
                              type="number"
                              value={newPayment.amount}
                              onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="paymentCurrency" className="text-sm font-medium leading-none">
                              Para Birimi
                            </label>
                            <Select 
                              value={newPayment.currency} 
                              onValueChange={(value) => setNewPayment({ ...newPayment, currency: value })}
                              disabled={newPayment.debtId !== "general"} // Eğer borç seçiliyse para birimi değiştirilemez
                            >
                              <SelectTrigger id="paymentCurrency">
                                <SelectValue placeholder="Para birimi" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TRY">Türk Lirası</SelectItem>
                                <SelectItem value="USD">Amerikan Doları</SelectItem>
                                <SelectItem value="EUR">Euro</SelectItem>
                                <SelectItem value="GBP">İngiliz Sterlini</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="paymentDescription" className="text-sm font-medium leading-none">
                            Açıklama
                          </label>
                          <Input
                            id="paymentDescription"
                            placeholder="Ödeme açıklaması"
                            value={newPayment.description}
                            onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="paymentDate" className="text-sm font-medium leading-none">
                            Ödeme Tarihi
                          </label>
                          <Input
                            id="paymentDate"
                            type="date"
                            value={newPayment.date}
                            onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={handleAddPayment}>Ödeme Ekle</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {Object.entries(paymentsByCurrency).map(([currency, data]) => (
                  <div key={`payments-${currency}`} className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{currency} Cinsinden Ödemeler</span>
                      <span>{formatCurrency(data.total, currency)}</span>
                    </div>
                    
                    <div className="space-y-2">
                      {data.items.map((payment) => {
                        // İlgili borç bilgisini bul
                        const relatedDebt = supplier.debts.find(d => d.id === payment.debtId);
                        
                        return (
                          <div key={payment.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                            <div className="flex-1">
                              <p className="font-medium">{payment.description}</p>
                              <p className="text-sm text-gray-500">
                                {formatDate(payment.date)}
                                {relatedDebt && ` • ${relatedDebt.description} için ödeme`}
                              </p>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="font-semibold text-green-600">
                                {formatCurrency(payment.amount, payment.currency)}
                              </span>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50" 
                                title="Ödemeyi Düzenle"
                                onClick={() => prepareEditPayment(payment)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" 
                                title="Ödemeyi Sil"
                                onClick={() => confirmDeletePayment(payment.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                {Object.keys(paymentsByCurrency).length === 0 && (
                  <p className="text-center py-4 text-gray-500">Bu tedarikçi için ödeme bulunmamaktadır.</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="summary">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Bakiye Özeti</h3>
                
                {Object.entries(debtsByCurrency).map(([currency, data]) => {
                  const paymentsInCurrency = paymentsByCurrency[currency] || { total: 0 };
                  const balance = data.total - paymentsInCurrency.total;
                  
                  return (
                    <div key={`summary-${currency}`} className="space-y-2">
                      <div className="text-sm font-medium">{currency}</div>
                      <div className="bg-white rounded-lg border overflow-hidden">
                        <div className="grid grid-cols-3 gap-4 p-4">
                          <div>
                            <p className="text-sm text-gray-500">Toplam Borç</p>
                            <p className="text-lg font-semibold">{formatCurrency(data.total, currency)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Ödenen</p>
                            <p className="text-lg font-semibold text-green-600">
                              {formatCurrency(paymentsInCurrency.total, currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Kalan</p>
                            <p className={`text-lg font-semibold ${balance > 0 ? "text-red-600" : balance < 0 ? "text-green-600" : "text-gray-600"}`}>
                              {formatCurrency(balance, currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {Object.keys(paymentsByCurrency)
                  .filter(currency => !debtsByCurrency[currency])
                  .map((currency) => {
                    const payments = paymentsByCurrency[currency];
                    
                    return (
                      <div key={`summary-excess-${currency}`} className="space-y-2">
                        <div className="text-sm font-medium">{currency} (Fazla Ödeme)</div>
                        <div className="bg-white rounded-lg border overflow-hidden">
                          <div className="grid grid-cols-3 gap-4 p-4">
                            <div>
                              <p className="text-sm text-gray-500">Toplam Borç</p>
                              <p className="text-lg font-semibold">0.00</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Ödenen</p>
                              <p className="text-lg font-semibold text-green-600">
                                {formatCurrency(payments.total, currency)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Fazla Ödeme</p>
                              <p className="text-lg font-semibold text-green-600">
                                {formatCurrency(payments.total, currency)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  )
}
