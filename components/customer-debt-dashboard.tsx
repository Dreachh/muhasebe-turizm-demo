"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { Search, User, CreditCard, Calendar, Clock, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { collection, getDocs, query, orderBy, where, updateDoc, doc, deleteDoc, addDoc, Timestamp } from "firebase/firestore"
import { getDb } from "@/lib/firebase-client-module"
import { COLLECTIONS } from "@/lib/db-firebase"
import { useToast } from "@/components/ui/use-toast"

// Müşteri borcu için arayüz
interface CustomerDebt {
  id: string;
  customerId: string;
  customerName: string;
  tourId?: string;
  amount: number;
  currency: string;
  description: string;
  dueDate?: Date;
  status: 'unpaid' | 'partially_paid' | 'paid';
  paidAmount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  sourceType: 'expense' | 'activity';
  sourceId: string;
}

// Ödeme arayüzü
interface Payment {
  id: string;
  debtId: string;
  amount: number;
  currency: string;
  description: string;
  paymentDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Form veri türü
interface FormData {
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  description: string;
  dueDate: string;
  notes: string;
}

export const CustomerDebtDashboardContext = createContext({
  triggerRefresh: () => {},
});

export function CustomerDebtDashboard() {
  const { toast } = useToast();
  const [debts, setDebts] = useState<CustomerDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "unpaid" | "partially_paid" | "paid">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<CustomerDebt | null>(null);
  const [formData, setFormData] = useState<FormData>({
    customerId: "",
    customerName: "",
    amount: 0,
    currency: "TRY",
    description: "",
    dueDate: new Date().toISOString().split('T')[0],
    notes: "",
  });
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDescription, setPaymentDescription] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState(false);

  // Firebase'den müşteri borçlarını çek
  const fetchCustomerDebts = async () => {
    setLoading(true);
    try {
      const db = getDb();
      
      // Müşteri borçlarını çek
      const debtsQuery = query(
        collection(db, COLLECTIONS.CUSTOMER_DEBTS),
        filterStatus !== "all" ? where("status", "==", filterStatus) : orderBy("createdAt", "desc")
      );
      
      const debtsSnapshot = await getDocs(debtsQuery);
      
      const debtsData = debtsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          customerId: data.customerId || "",
          customerName: data.customerName || "İsimsiz Müşteri",
          amount: Number(data.amount || 0),
          paidAmount: Number(data.paidAmount || 0),
          dueDate: data.dueDate?.toDate() || null,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          sourceType: data.sourceType || 'expense',
          sourceId: data.sourceId || '',
        } as CustomerDebt;
      });
      
      console.log("Müşteri borçları:", debtsData);
      setDebts(debtsData);
    } catch (error) {
      console.error("Müşteri borçları çekilirken hata:", error);
      setDebts([]);
    } finally {
      setLoading(false);
    }
  };

  // Sayfa yüklendiğinde borçları çek
  useEffect(() => {
    fetchCustomerDebts();
  }, [filterStatus, refreshTrigger]);

  // Arama ve filtreleme işlemleri
  const filteredDebts = debts.filter(debt => {
    if (searchTerm === "") return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      debt.customerName.toLowerCase().includes(searchLower) ||
      debt.description.toLowerCase().includes(searchLower) ||
      debt.amount.toString().includes(searchLower) ||
      debt.currency.toLowerCase().includes(searchLower)
    );
  });

  // Ödeme yap
  const handleMakePayment = async () => {
    if (!selectedDebt) return;
    
    if (paymentAmount <= 0) {
      toast({
        title: "Hata",
        description: "Ödeme tutarı 0'dan büyük olmalıdır",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const db = getDb();
      const now = new Date();
      
      // Yeni ödeme ekle
      const paymentData = {
        debtId: selectedDebt.id,
        amount: paymentAmount,
        currency: selectedDebt.currency,
        description: paymentDescription || `${selectedDebt.customerName} için ödeme`,
        paymentDate: now,
        createdAt: now,
        updatedAt: now,
      };
      
      await addDoc(collection(db, "customer_payments"), paymentData);
      
      // Borç durumunu güncelle
      const debtRef = doc(db, COLLECTIONS.CUSTOMER_DEBTS, selectedDebt.id);
      const newPaidAmount = selectedDebt.paidAmount + paymentAmount;
      let newStatus: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';
      
      if (newPaidAmount >= selectedDebt.amount) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partially_paid';
      }
      
      await updateDoc(debtRef, {
        paidAmount: newPaidAmount,
        status: newStatus,
        updatedAt: now,
      });
      
      toast({
        title: "Başarılı",
        description: "Ödeme başarıyla kaydedildi",
        variant: "default",
      });
      
      // Formu kapat ve verileri yenile
      setShowPaymentForm(false);
      setSelectedDebt(null);
      setPaymentAmount(0);
      setPaymentDescription("");
      fetchCustomerDebts();
    } catch (error) {
      console.error("Ödeme yapılırken hata:", error);
      toast({
        title: "Hata",
        description: "Ödeme kaydedilirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  // Borç durumuna göre renk ve etiket
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Ödenmiş</Badge>;
      case 'partially_paid':
        return <Badge className="bg-orange-500">Kısmi Ödeme</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-500">Ödenmemiş</Badge>;
      default:
        return <Badge>Bilinmeyen</Badge>;
    }
  };

  // Borç ödeme durumu ilerlemesi
  const getPaymentProgress = (amount: number, paidAmount: number) => {
    if (amount <= 0) return 0;
    const progress = (paidAmount / amount) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  // Tarih formatla
  const formatDate = (date: Date | undefined | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const triggerRefresh = () => setRefreshTrigger(!refreshTrigger);

  return (
    <CustomerDebtDashboardContext.Provider value={{ triggerRefresh }}>
      <div className="space-y-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Müşteri Borç Yönetimi</CardTitle>
            <CardDescription>
              Müşteri borçlarını görüntüleyin, yönetin ve ödeme kabul edin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Müşteri adı, açıklama..."
                    className="w-full md:w-[300px] pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={filterStatus} onValueChange={(value: "all" | "unpaid" | "partially_paid" | "paid") => setFilterStatus(value)}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Durum Filtresi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="unpaid">Ödenmemiş</SelectItem>
                    <SelectItem value="partially_paid">Kısmi Ödeme</SelectItem>
                    <SelectItem value="paid">Ödenmiş</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-10">Yükleniyor...</div>
            ) : filteredDebts.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                {searchTerm || filterStatus !== "all" 
                  ? "Arama kriterlerine uygun borç bulunamadı" 
                  : "Henüz müşteri borcu kaydedilmemiş"}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Müşteri</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead>Tutar</TableHead>
                      <TableHead>Son Ödeme</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Ödeme Durumu</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDebts.map((debt) => (
                      <TableRow key={debt.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {debt.customerName}
                          </div>
                        </TableCell>
                        <TableCell>{debt.description}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-4 w-4" />
                            <span>
                              {debt.amount.toLocaleString('tr-TR')} {debt.currency}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(debt.dueDate)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(debt.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs">
                              <span>{debt.paidAmount.toLocaleString('tr-TR')} {debt.currency}</span>
                              <span>{debt.amount.toLocaleString('tr-TR')} {debt.currency}</span>
                            </div>
                            <Progress value={getPaymentProgress(debt.amount, debt.paidAmount)} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDebt(debt);
                                setShowPaymentForm(true);
                                setPaymentAmount(debt.amount - debt.paidAmount);
                              }}
                              disabled={debt.status === 'paid'}
                            >
                              Ödeme Al
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ödeme Formu Dialogu */}
        <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ödeme Al</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedDebt && (
                <>
                  <div className="flex flex-col gap-1">
                    <Label className="text-muted-foreground">Müşteri:</Label>
                    <div className="font-medium">{selectedDebt.customerName}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-muted-foreground">Açıklama:</Label>
                    <div>{selectedDebt.description}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <Label className="text-muted-foreground">Toplam Borç:</Label>
                      <div className="font-medium">{selectedDebt.amount.toLocaleString('tr-TR')} {selectedDebt.currency}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-muted-foreground">Ödenmiş Tutar:</Label>
                      <div>{selectedDebt.paidAmount.toLocaleString('tr-TR')} {selectedDebt.currency}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-muted-foreground">Kalan Borç:</Label>
                    <div className="font-bold text-lg">{(selectedDebt.amount - selectedDebt.paidAmount).toLocaleString('tr-TR')} {selectedDebt.currency}</div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentAmount">Ödeme Tutarı</Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={selectedDebt.amount - selectedDebt.paidAmount}
                      value={paymentAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentDescription">Açıklama</Label>
                    <Textarea
                      id="paymentDescription"
                      value={paymentDescription}
                      onChange={(e) => setPaymentDescription(e.target.value)}
                      placeholder="Ödeme ile ilgili ek bilgiler"
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentForm(false)}>
                İptal
              </Button>
              <Button onClick={handleMakePayment}>
                Ödeme Al
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </CustomerDebtDashboardContext.Provider>
  );
}
