"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Edit } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addDoc, updateDoc, deleteDoc, doc, collection, getDoc, setDoc } from "firebase/firestore"
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

export function SupplierCard({ supplier, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { toast } = useToast()
  
  const [isAddDebtDialogOpen, setIsAddDebtDialogOpen] = useState(false)
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false)
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState(null)

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
  const debtsByCurrency = {}
  const paymentsByCurrency = {}

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
  const balanceByCurrency = {}
  
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
  const totalBalance = supplier.totalDebt - supplier.totalPaid

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
      if (onUpdate) onUpdate();
      
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
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error("Ödeme eklenirken hata:", error);
      toast({
        title: "Hata",
        description: "Ödeme eklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    }  };
  // Borç silme fonksiyonu
  const handleDeleteDebt = async (debtId) => {
    if (!confirm("Bu borcu silmek istediğinizden emin misiniz?")) return;
    
    try {
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
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error("Borç silinirken hata:", error);
      toast({
        title: "Hata",
        description: "Borç silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };

  // Ödeme silme fonksiyonu
  const handleDeletePayment = async (paymentId) => {
    if (!confirm("Bu ödemeyi silmek istediğinizden emin misiniz?")) return;
    
    try {
      const db = getDb();
      await deleteDoc(doc(db, COLLECTIONS.PAYMENTS, paymentId));
      
      toast({
        title: "Ödeme silindi",
        description: "Ödeme başarıyla silindi.",
      });
      
      // Listeyi güncelle
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error("Ödeme silinirken hata:", error);
      toast({
        title: "Hata",
        description: "Ödeme silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };
  
  // Belirli bir borç için ödeme hazırlama fonksiyonu
  const preparePaymentForDebt = (debt) => {
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

  return (
    <Card className={`border ${hasPendingDebts ? "border-amber-300" : "border-green-300"}`}>
      <CardHeader className="bg-slate-50 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
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
                            <span className={`font-semibold ${debt.status === 'PAID' || debt.status === 'paid' ? "text-green-600" : "text-amber-600"}`}>
                              {formatCurrency(debt.amount, debt.currency)}
                            </span>
                            <div className="flex space-x-1">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8" 
                                onClick={() => handleDeleteDebt(debt.id)}
                              >
                                <Edit className="h-4 w-4" />
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
                                .filter(debt => debt.status !== "PAID" && debt.status !== "paid")
                                .map((debt) => (
                                  <SelectItem key={debt.id} value={debt.id}>
                                    {debt.description} ({formatCurrency(debt.amount, debt.currency)}) 
                                    {debt.paidAmount > 0 && ` (${formatCurrency(debt.paidAmount, debt.currency)} ödenmiş)`}
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
                              disabled={!!newPayment.debtId && newPayment.debtId !== "general"} // Eğer borç seçiliyse para birimi değiştirilemez
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
                      {data.items.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <div className="flex-1">
                            <p className="font-medium">{payment.description}</p>
                            <p className="text-sm text-gray-500">Tarih: {formatDate(payment.date)}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="font-semibold text-green-600">
                              {formatCurrency(payment.amount, payment.currency)}
                            </span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8" 
                              onClick={() => handleDeletePayment(payment.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {Object.keys(paymentsByCurrency).length === 0 && (
                  <p className="text-center py-4 text-gray-500">Bu tedarikçi için ödeme bulunmamaktadır.</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="summary">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Özet Bilgiler</h3>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="text-sm text-gray-500 mb-1">Toplam Borç</div>
                    <div className="text-xl font-semibold">{formatCurrency(supplier.totalDebt, "TRY")}</div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="text-sm text-gray-500 mb-1">Toplam Ödeme</div>
                    <div className="text-xl font-semibold text-green-600">{formatCurrency(supplier.totalPaid, "TRY")}</div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="text-sm text-gray-500 mb-1">Kalan Bakiye</div>
                    <div className={`text-xl font-semibold ${totalBalance > 0 ? "text-amber-600" : "text-green-600"}`}>
                      {formatCurrency(totalBalance, "TRY")}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  )
}
