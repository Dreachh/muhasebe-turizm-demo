"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { SupplierCard } from "@/components/supplier-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { collection, getDocs, query, orderBy, updateDoc, doc, getDoc, setDoc } from "firebase/firestore"
import { getDb } from "@/lib/firebase-client-module"
import { COLLECTIONS } from "@/lib/db-firebase"
import { useToast } from "@/components/ui/use-toast"
import { Supplier, Debt, Payment } from "@/types/supplier-types"

export function SupplierDebtDashboard() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"name" | "debt">("name");
  const [isAddSupplierDialogOpen, setIsAddSupplierDialogOpen] = useState(false);
  const [availableCompanies, setAvailableCompanies] = useState<{id: string, name: string}[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  // Firebase'den veri çekme fonksiyonu
  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const db = getDb();
      
      // Tedarikçileri çek
      const suppliersQuery = query(
        collection(db, COLLECTIONS.COMPANIES),
        orderBy("name")
      );
      const supplierSnapshot = await getDocs(suppliersQuery);      const suppliersData = supplierSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          name: data.name || "İsimsiz Tedarikçi",
          type: data.type || "",  // Tedarikçi tipini doğru şekilde aldığımızdan emin olalım
        };
      });      // Borçları çek
      const debtsQuery = query(collection(db, COLLECTIONS.DEBTS));
      const debtsSnapshot = await getDocs(debtsQuery);
      const debtsData = debtsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,          supplierId: data.companyId, // Ana uygulama-uyum için
          companyId: data.companyId, // companyId alanını ekliyoruz
          amount: Number(data.amount || 0),
          paidAmount: Number(data.paidAmount || 0), // Ödenmiş tutarı da ekliyoruz
          currency: data.currency || "TRY", // Para birimi bilgisini ekle
          date: data.dueDate?.toDate ? data.dueDate.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0] as string,
          status: (data.status === 'paid') ? 'paid' : (data.status === 'partially_paid') ? 'partially_paid' : 'unpaid'
        };
      });

      // Ödemeleri çek
      const paymentsQuery = query(collection(db, COLLECTIONS.PAYMENTS));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsData = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        supplierId: doc.data().companyId, // Ana uygulama-uyum için        debtId: doc.data().debtId || "",
        amount: Number(doc.data().amount || 0),
        currency: doc.data().currency || "TRY", // Para birimi bilgisini ekle
        date: doc.data().paymentDate?.toDate ? doc.data().paymentDate.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0] as string,}));      // Supplier nesnelerini oluştur
      const enrichedSuppliers = suppliersData.map(supplier => {
        const supplierDebts = debtsData.filter(debt => debt.supplierId === supplier.id);
        const supplierPayments = paymentsData.filter(payment => payment.supplierId === supplier.id);
          // TÜM borçları hesapla (ödenmiş olanlar dahil)
        const totalDebt = supplierDebts.reduce((sum, debt) => sum + (debt.amount), 0);
        
        // Toplam ödeme - TÜM ödeme kayıtlarının toplamı
        const totalPaidFromPayments = supplierPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        
        return {
          ...supplier,
          debts: supplierDebts, // Tüm borçları sakla (görünüm için)
          payments: supplierPayments,
          totalDebt,
          totalPaid: totalPaidFromPayments
        };
      });
      
      // Önemli değişiklik: Sadece supplier tipi olanları filtrelemek YERİNE,
      // firmanın borcu varsa veya firma tipi supplier ise listeye dahil et
      const suppliersWithDebtsOrSupplierType = enrichedSuppliers.filter(supplier => 
        supplier.type === "supplier" || supplier.debts.length > 0
      );
      
      console.log("Tüm firmalar:", enrichedSuppliers.length);
      console.log("Borcu olan veya tedarikçi olan firmalar:", suppliersWithDebtsOrSupplierType.length);
      
      // Hem tedarikçi tipinde olan hem de borcu olan firmaları göster
      setSuppliers(suppliersWithDebtsOrSupplierType as Supplier[]);
    } catch (error) {
      console.error("Tedarikçi verileri alınırken hata:", error);
      // Hata durumunda örnek veri göster
      setSuppliers(mockSuppliers);
    } finally {
      setLoading(false);
    }
  };  
  
  // Ayarlarda kayıtlı olan şirketleri çekme fonksiyonu  
  const fetchAvailableCompanies = async () => {
    try {
      const db = getDb();
      const companiesRef = collection(db, COLLECTIONS.COMPANIES);
      const querySnapshot = await getDocs(companiesRef);
      
      const companiesList: {id: string, name: string}[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // "deleted" tipindeki firmaları filtreleme eklendi
        if (data.type !== "deleted") {
          companiesList.push({
            id: doc.id,
            name: data.name || "İsimsiz Şirket",
          });
        }
      });
      
      // Firma adına göre sırala
      companiesList.sort((a, b) => a.name.localeCompare(b.name));
      setAvailableCompanies(companiesList);
    } catch (error) {
      console.error("Şirketler çekilirken hata:", error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchAvailableCompanies();
  }, []);  // Yeni tedarikçi ekleme
  const handleAddSupplier = async () => {
    if (!selectedCompanyId) {
      toast({
        title: "Hata",
        description: "Lütfen bir firma seçin",
        variant: "destructive",
      });
      return;
    }

    try {
      // Seçilen firmanın bilgilerini bul
      const selectedCompany = availableCompanies.find(company => company.id === selectedCompanyId);
      
      if (!selectedCompany) {
        console.error("Seçilen firma bulunamadı");
        return;
      }
      
      // İlk olarak belgenin varlığını kontrol et
      const db = getDb();
      const docRef = doc(db, COLLECTIONS.COMPANIES, selectedCompanyId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.error("Firma veritabanında bulunamadı", selectedCompanyId);
        // Belge bulunamadıysa, yeni bir belge oluştur
        await setDoc(docRef, {
          name: selectedCompany.name,
          type: "supplier",
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log("Yeni firma belgesi oluşturuldu");
      } else {
        // Belge varsa güncelle
        await updateDoc(docRef, {
          type: "supplier",
          updatedAt: new Date(),
        });
        console.log("Mevcut firma belgesi güncellendi");
      }      // İşlem sonrası
      setSelectedCompanyId("");
      setIsAddSupplierDialogOpen(false);
      
      console.log("Tedarikçi başarıyla kaydedildi:", selectedCompanyId);
      
      // Listeyi yenile - önce mevcut şirketleri çekelim, sonra tedarikçileri
      await fetchAvailableCompanies();
      await fetchSuppliers();
        toast({
        title: "Başarılı",
        description: `${selectedCompany.name} tedarikçi olarak eklendi. Tedarikçi kartları sayfayı yeniledikten sonra görünecektir.`,
        duration: 5000, // 5 saniye göster
      });
    } catch (error) {
      console.error("Tedarikçi eklenirken hata:", error);
      toast({
        title: "Hata",
        description: "Tedarikçi eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  // Filtreleme ve sıralama
  const filteredAndSortedSuppliers = [...suppliers]
    .filter(supplier => 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
    )    .sort((a, b) => {
      if (sortOrder === "name") {
        return a.name.localeCompare(b.name);
      } else { // debt
        const aBalance = (a.totalDebt || 0) - (a.totalPaid || 0);
        const bBalance = (b.totalDebt || 0) - (b.totalPaid || 0);
        return bBalance - aBalance; // en yüksek borç üstte
      }
    });  // Toplam borç bilgilerini hesaplayan fonksiyon - para birimi bazlı
  const calculateTotalDebtInfo = () => {
    const totalsByCurrency: {[key: string]: {debt: number, paid: number}} = {};
    
    suppliers.forEach(supplier => {
      // TÜM borçları para birimi bazında hesapla (ödenmiş olanlar dahil)
      if (Array.isArray(supplier.debts)) {
        supplier.debts.forEach(debt => {
          const currency = debt.currency || 'TRY';
          if (!totalsByCurrency[currency]) {
            totalsByCurrency[currency] = { debt: 0, paid: 0 };
          }
          totalsByCurrency[currency].debt += Number(debt.amount) || 0;
        });
      }

      // TÜM ödeme kayıtlarını para birimi bazında topla
      if (Array.isArray(supplier.payments)) {
        supplier.payments.forEach(payment => {
          const currency = payment.currency || 'TRY';
          if (!totalsByCurrency[currency]) {
            totalsByCurrency[currency] = { debt: 0, paid: 0 };
          }
          totalsByCurrency[currency].paid += Number(payment.amount) || 0;
        });
      }
    });

    return totalsByCurrency;
  };
  
  // Borçlu tedarikçi sayısını hesapla
  const calculateSupplierStats = () => {
    const suppliersWithDebt = suppliers.filter(supplier => {
      // Her tedarikçinin borç ve ödemelerini para birimi bazlı hesapla
      const supplierBalances: {[currency: string]: number} = {};
      
      // Borçları topla
      supplier.debts.forEach(debt => {
        const currency = debt.currency || 'TRY';
        if (!supplierBalances[currency]) {
          supplierBalances[currency] = 0;
        }
        supplierBalances[currency] += Number(debt.amount) || 0;
      });
      
      // Ödemeleri çıkar
      supplier.payments.forEach(payment => {
        const currency = payment.currency || 'TRY';
        if (!supplierBalances[currency]) {
          supplierBalances[currency] = 0;
        }
        supplierBalances[currency] -= Number(payment.amount) || 0;
      });
      
      // Herhangi bir para biriminde borcu kaldıysa borçlu sayılır
      return Object.values(supplierBalances).some(balance => balance > 0);
    });
    
    return {
      suppliersWithDebt: suppliersWithDebt.length,
      totalSuppliers: suppliers.length
    };
  };

  return (
    <div className="space-y-6">      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mb-6">
        <div className="relative w-full sm:w-1/2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Tedarikçi ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "name" | "debt")}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sıralama" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">İsme Göre</SelectItem>
              <SelectItem value="debt">Borç Miktarına Göre</SelectItem>
            </SelectContent>
          </Select>
            <Dialog open={isAddSupplierDialogOpen} onOpenChange={setIsAddSupplierDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto whitespace-nowrap">Tedarikçi Ekle</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Tedarikçi Ekle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="supplierSelect" className="text-sm font-medium leading-none">
                    Tedarikçi Firması
                  </label>
                  <Select 
                    value={selectedCompanyId} 
                    onValueChange={(value) => setSelectedCompanyId(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Firma seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCompanies.length > 0 ? (
                        availableCompanies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-companies" disabled>
                          Kayıtlı firma bulunamadı
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  
                  {availableCompanies.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Önce Ayarlar &gt; Şirket Yönetimi menüsünden firma eklemelisiniz.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAddSupplier}>Ekle</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>      {/* Borç Özeti */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">        {/* Toplam Borç Kartı */}
        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
          <div className="text-xs sm:text-sm text-blue-600 font-medium">Toplam Borç</div>
          <div className="flex flex-col mt-1">
            {Object.entries(calculateTotalDebtInfo()).map(([currency, totals]) => (
              <div key={`debt-${currency}`} className="text-lg sm:text-xl font-bold text-blue-700">
                {totals.debt.toLocaleString('tr-TR')} {currency}
              </div>
            ))}
          </div>
        </div>
        
        {/* Ödenen Miktar Kartı */}
        <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
          <div className="text-xs sm:text-sm text-green-600 font-medium">Ödenen Miktar</div>
          <div className="flex flex-col mt-1">
            {Object.entries(calculateTotalDebtInfo()).map(([currency, totals]) => (
              <div key={`paid-${currency}`} className="text-lg sm:text-xl font-bold text-green-700">
                {totals.paid.toLocaleString('tr-TR')} {currency}
              </div>
            ))}
          </div>
        </div>
        
        {/* Kalan Borç Kartı */}
        <div className="bg-amber-50 p-3 sm:p-4 rounded-lg border border-amber-200">
          <div className="text-xs sm:text-sm text-amber-600 font-medium">Kalan Borç</div>
          <div className="flex flex-col mt-1">
            {Object.entries(calculateTotalDebtInfo()).map(([currency, totals]) => (
              <div key={`balance-${currency}`} className="text-lg sm:text-xl font-bold text-amber-700">
                {Math.max(0, totals.debt - totals.paid).toLocaleString('tr-TR')} {currency}
              </div>
            ))}
          </div>
        </div>
        
        {/* Borçlu Tedarikçi Kartı */}
        <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg border border-yellow-200">
          <div className="text-xs sm:text-sm text-yellow-600 font-medium">Borçlu Tedarikçi</div>
          <div className="flex flex-col mt-1">
            <div className="text-lg sm:text-xl font-bold text-yellow-700">
              {calculateSupplierStats().suppliersWithDebt}
            </div>
            <div className="text-xs sm:text-sm text-yellow-600">
              Toplam: {calculateSupplierStats().totalSuppliers}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Yükleniyor...</div>
      ) : filteredAndSortedSuppliers.length > 0 ? (
        <div className="grid gap-6">
          {filteredAndSortedSuppliers.map((supplier) => (
            <SupplierCard key={supplier.id} supplier={supplier} onUpdate={fetchSuppliers} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500">
          {searchTerm ? "Arama kriterine uygun tedarikçi bulunamadı." : "Henüz tedarikçi eklenmemiş."}
        </div>
      )}
    </div>
  )
}

// Örnek veri - API entegrasyonu olmadığında kullanılacak
const mockSuppliers = [  {
    id: "sup_1",
    name: "Çilem Turizm",
    type: "supplier",
    debts: [      {
        id: "debt_1",
        supplierId: "sup_1",
        companyId: "sup_1",
        amount: 1000,
        currency: "USD",
        description: "Rehber Ücreti",
        date: "2024-05-10",
        status: "unpaid" as "unpaid",
      },
      {
        id: "debt_2",
        supplierId: "sup_1",
        companyId: "sup_1",
        amount: 2500,
        currency: "TRY",
        description: "Otel Rezervasyonu",
        date: "2024-05-12",
        status: "unpaid" as "unpaid",
      },
    ],
    payments: [
      {
        id: "pay_1",
        supplierId: "sup_1",
        debtId: "debt_1",
        amount: 500,
        currency: "USD",
        description: "Kısmi Ödeme",
        date: "2024-05-15",
      },
    ],
    totalDebt: 3500,
    totalPaid: 500,
  },  {
    id: "sup_2",
    name: "Antalya Tur",
    type: "supplier",
    debts: [      {
        id: "debt_3",
        supplierId: "sup_2",
        companyId: "sup_2",
        amount: 750,
        currency: "EUR",
        description: "Transfer Ücreti",
        date: "2024-05-08",
        status: "unpaid" as "unpaid",
      },
    ],
    payments: [],
    totalDebt: 750,
    totalPaid: 0,
  },  {
    id: "sup_3",
    name: "İstanbul Rehberlik",
    type: "supplier",
    debts: [      {
        id: "debt_4",
        supplierId: "sup_3",
        companyId: "sup_3",
        amount: 5000,
        currency: "TRY",
        description: "Rehberlik Hizmeti",
        date: "2024-05-01",
        status: "unpaid" as "unpaid",
      },
      {
        id: "debt_5",
        supplierId: "sup_3",
        companyId: "sup_3",
        amount: 3000,
        currency: "TRY",
        description: "Müze Giriş Ücretleri",
        date: "2024-05-03",
        status: "paid" as "paid",
      },
    ],
    payments: [
      {
        id: "pay_2",
        supplierId: "sup_3",
        debtId: "debt_5",
        amount: 3000,
        currency: "TRY",
        description: "Tam Ödeme",
        date: "2024-05-05",
      },
    ],
    totalDebt: 8000,
    totalPaid: 3000,
  },
];
