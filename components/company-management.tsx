"use client"

import { useState, useEffect } from "react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Building, Plus, PenSquare, Trash2, Phone, Mail, FileText } from "lucide-react"
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc, setDoc, writeBatch } from "firebase/firestore"
import { getDb } from "../lib/firebase-client-module"
import { COLLECTIONS } from "../lib/db-firebase"
import { generateUUID } from "../lib/utils"

// Firma için tip tanımı
interface Company {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  taxId?: string;
  category?: string; // Yeni eklenen kategori alanı
  createdAt: Date;
  updatedAt: Date;
}

export default function CompanyManagement() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [dialogOpen, setDialogOpen] = useState(false);  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [backupData, setBackupData] = useState<any>(null);
  const [dbRepairDialogOpen, setDbRepairDialogOpen] = useState(false);
    // Kategori yönetimi için state'ler
  const [categories, setCategories] = useState<string[]>([
    "Otel", "Acenta", "Restaurant", "Müze", "Aktivite Sağlayıcısı", 
    "Ulaşım", "Hizmet Sağlayıcısı", "Diğer"
  ]);
  const [newCategory, setNewCategory] = useState<string>("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Company>>({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    taxId: "",
    category: ""
  });

  // Telefon formatlaması fonksiyonu
  const formatPhoneNumber = (value: string) => {
    // Sadece rakamları al
    const digits = value.replace(/\D/g, '')

    // Türkiye formatında formatlama (+90 5XX XXX XX XX)
    if (digits.length === 0) return ''
    if (digits.length <= 2) return `+${digits}`
    if (digits.length <= 5) return `+${digits.slice(0, 2)} ${digits.slice(2)}`
    if (digits.length <= 8) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
    if (digits.length <= 10) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`
  }

  // Telefon input'u için key press handler
  const handlePhoneKeyPress = (e: React.KeyboardEvent) => {
    // Sadece rakam, backspace, delete, tab ve arrow tuşlarına izin ver
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
    if (!allowedKeys.includes(e.key) && !/[0-9]/.test(e.key)) {
      e.preventDefault()
    }
  }

  // Firmaları Firebase'den yükle
  const loadCompanies = async () => {
    try {
      setLoading(true);
      const db = getDb();
      console.log("Firebase DB bağlantısı alındı:", db);
      console.log("Erişilecek koleksiyon:", COLLECTIONS.COMPANIES);
      
      const companiesRef = collection(db, COLLECTIONS.COMPANIES); // "companies" yerine "COLLECTIONS.COMPANIES" kullanıyoruz
      console.log("Koleksiyon referansı oluşturuldu");
      
      const querySnapshot = await getDocs(companiesRef);
      console.log("Sorgu sonucu alındı, belge sayısı:", querySnapshot.size);
        const companiesList: Company[] = [];      querySnapshot.forEach((doc) => {
        console.log("Belge ID:", doc.id);
        const data = doc.data();
        console.log("Belge verisi:", data);
        
        // Veri bütünlüğü kontrolü
        if (!data || !data.name) {
          console.warn(`Eksik veri, belge ID: ${doc.id}`, data);
        }
          // "deleted" tipindeki firmalar görüntülenmeyecek
        if (data.type !== "deleted") {
          companiesList.push({
            id: doc.id,
            name: data.name || "",
            contactPerson: data.contactPerson || "",
            phone: data.phone || "",
            email: data.email || "",
            address: data.address || "",
            notes: data.notes || "",
            taxId: data.taxId || "",
            category: data.category || "", // Category alanını ekle
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          });
        }
      });
      
      console.log("Yüklenen şirket sayısı:", companiesList.length);
      
      // Firma adına göre sırala
      companiesList.sort((a, b) => a.name.localeCompare(b.name));
      setCompanies(companiesList);
    } catch (error) {
      console.error("Firmalar yüklenirken hata oluştu:", error);
      toast({
        title: "Hata!",
        description: "Firmalar yüklenirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  // Veritabanı durum kontrolü
  const checkDatabaseStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/check-firebase');
      const data = await response.json();
      
      console.log("Veritabanı durum kontrolü sonucu:", data);
      
      if (data.collections && data.collections.companies) {
        if (data.collections.companies.count === 0) {
          toast({
            title: "Uyarı!",
            description: "Veritabanında hiç şirket kaydı bulunamadı.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Bilgi",
            description: `Veritabanında ${data.collections.companies.count} şirket kaydı bulundu.`
          });
        }
      }
      
      return data;
    } catch (error) {
      console.error("Veritabanı kontrolü sırasında hata:", error);
      toast({
        title: "Hata!",
        description: "Veritabanı kontrolü sırasında bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Şirket verilerini yedekle
  const backupCompanyData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/db-backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'backup' }),
      });
      
      const data = await response.json();
      console.log("Yedekleme sonucu:", data);
      
      if (data.backup) {
        setBackupData(data.backup);
        toast({
          title: "Başarılı!",
          description: `${data.backup.length} şirket kaydı yedeklendi.`
        });
        
        // Yedekleme verilerini yerel depolamaya da kaydedelim
        localStorage.setItem('companyBackup', JSON.stringify({
          data: data.backup,
          timestamp: data.timestamp
        }));
      }
    } catch (error) {
      console.error("Yedekleme sırasında hata:", error);
      toast({
        title: "Hata!",
        description: "Şirket verileri yedeklenirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Şirket verilerini geri yükle
  const restoreCompanyData = async () => {
    try {
      if (!backupData && localStorage.getItem('companyBackup')) {
        const storedBackup = JSON.parse(localStorage.getItem('companyBackup') || '{}');
        if (storedBackup.data) {
          setBackupData(storedBackup.data);
        }
      }
      
      if (!backupData) {
        toast({
          title: "Hata!",
          description: "Geri yüklenecek yedek veri bulunamadı.",
          variant: "destructive"
        });
        return;
      }
      
      const confirmRestore = window.confirm(
        `${backupData.length} şirket kaydını geri yüklemek istediğinizden emin misiniz? Bu işlem mevcut verilerin üzerine yazabilir.`
      );
      
      if (!confirmRestore) return;
      
      setLoading(true);
      const response = await fetch('/api/db-backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'restore',
          data: backupData
        }),
      });
      
      const data = await response.json();
      console.log("Geri yükleme sonucu:", data);
      
      toast({
        title: "Başarılı!",
        description: `${data.restoredCount} şirket kaydı geri yüklendi.`
      });
      
      // Şirketleri yeniden yükle
      loadCompanies();
    } catch (error) {
      console.error("Geri yükleme sırasında hata:", error);
      toast({
        title: "Hata!",
        description: "Şirket verileri geri yüklenirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Test şirketleri oluştur
  const createTestCompanies = async () => {
    try {
      const confirmCreate = window.confirm(
        "Test şirketleri oluşturmak istediğinizden emin misiniz?"
      );
      
      if (!confirmCreate) return;
      
      setLoading(true);
      const response = await fetch('/api/db-backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'create-test-companies' }),
      });
      
      const data = await response.json();
      console.log("Test şirketleri oluşturma sonucu:", data);
      
      toast({
        title: "Başarılı!",
        description: data.message
      });
      
      // Şirketleri yeniden yükle
      loadCompanies();
    } catch (error) {
      console.error("Test şirketleri oluşturulurken hata:", error);
      toast({
        title: "Hata!",
        description: "Test şirketleri oluşturulurken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }  };
    // Yeni kategori ekleme fonksiyonu
  const addNewCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updatedCategories = [...categories, newCategory.trim()];
      setCategories(updatedCategories);
      setFormData({ ...formData, category: newCategory.trim() });
      setNewCategory("");
      setShowNewCategoryInput(false);
      
      // Kategorileri localStorage'a kaydet
      localStorage.setItem('companyCategories', JSON.stringify(updatedCategories));
      
      toast({
        title: "Başarılı!",
        description: "Yeni kategori eklendi.",
      });
    } else if (categories.includes(newCategory.trim())) {
      toast({
        title: "Uyarı",
        description: "Bu kategori zaten mevcut.",
        variant: "destructive"
      });
    }
  };

  // Kategori silme fonksiyonu
  const deleteCategory = async (categoryToDelete: string) => {
    try {
      const db = getDb();
      
      // Önce bu kategoriye sahip firma var mı kontrol et
      const companiesRef = collection(db, COLLECTIONS.COMPANIES);
      const querySnapshot = await getDocs(companiesRef);
      
      let hasCompaniesWithCategory = false;
      let companyCount = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.category === categoryToDelete && data.type !== "deleted") {
          hasCompaniesWithCategory = true;
          companyCount++;
        }
      });

      if (hasCompaniesWithCategory) {
        const confirmDelete = window.confirm(
          `"${categoryToDelete}" kategorisinde ${companyCount} firma bulunmaktadır. Bu kategoriyi silmek istediğinizden emin misiniz? Bu firmaların kategorisi boş kalacaktır.`
        );
        
        if (!confirmDelete) return;

        // Bu kategorideki firmaların kategorisini temizle
        const batch = writeBatch(db);
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.category === categoryToDelete && data.type !== "deleted") {
            const docRef = doc(db, COLLECTIONS.COMPANIES, docSnap.id);
            batch.update(docRef, { category: "", updatedAt: new Date() });
          }
        });
        await batch.commit();
      }

      // Kategoriyi listeden kaldır
      const updatedCategories = categories.filter(cat => cat !== categoryToDelete);
      setCategories(updatedCategories);
      
      // localStorage'a kaydet
      localStorage.setItem('companyCategories', JSON.stringify(updatedCategories));

      toast({
        title: "Başarılı!",
        description: `"${categoryToDelete}" kategorisi silindi.${hasCompaniesWithCategory ? ` ${companyCount} firmanın kategorisi temizlendi.` : ""}`,
      });

      // Firmaları yeniden yükle
      loadCompanies();
    } catch (error) {
      console.error("Kategori silinirken hata:", error);
      toast({
        title: "Hata!",
        description: "Kategori silinirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  // Kategorileri localStorage'dan yükleme
  const loadCategories = () => {
    const savedCategories = localStorage.getItem('companyCategories');
    if (savedCategories) {
      try {
        const parsedCategories = JSON.parse(savedCategories);
        setCategories(parsedCategories);
      } catch (error) {
        console.error('Kategoriler yüklenirken hata:', error);
      }
    }
  };
    // Form alanlarının değişikliklerini izle
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    // Telefon alanı için özel formatla
    if (name === "phone") {
      formattedValue = formatPhoneNumber(value);
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue
    }));
  };
  // Firma ekle veya güncelle
  const handleSaveCompany = async () => {
    try {
      // Form doğrulama
      if (!formData.name || formData.name.trim() === "") {
        toast({
          title: "Hata!",
          description: "Firma adı boş olamaz.",
          variant: "destructive"
        });
        return;
      }

      const db = getDb();
      const now = new Date();
      
      if (formMode === 'add') {
        // Yeni firma ekle
        const newCompanyData = {
          ...formData,
          createdAt: now,
          updatedAt: now
        };
        
        await addDoc(collection(db, COLLECTIONS.COMPANIES), newCompanyData);
        
        toast({
          title: "Başarılı!",
          description: "Firma başarıyla eklendi.",
        });
      } else if (formMode === 'edit' && currentCompany) {
        // Mevcut firmayı güncelle
        const companyRef = doc(db, COLLECTIONS.COMPANIES, currentCompany.id);
        await updateDoc(companyRef, {
          ...formData,
          updatedAt: now
        });
        
        toast({
          title: "Başarılı!",
          description: "Firma bilgileri güncellendi.",
        });
      }
      
      // Diyaloğu kapat ve firmaları yeniden yükle
      setDialogOpen(false);
      loadCompanies();
    } catch (error) {
      console.error("Firma kaydedilirken hata oluştu:", error);
      toast({
        title: "Hata!",
        description: "Firma kaydedilirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };
  // Firma düzenleme modunu aç
  const handleEditCompany = (company: Company) => {
    setFormMode('edit');
    setCurrentCompany(company);
    setFormData({
      name: company.name,
      contactPerson: company.contactPerson,
      phone: company.phone,
      email: company.email,
      address: company.address,
      notes: company.notes,
      taxId: company.taxId,
      category: company.category
    });
    setDialogOpen(true);
  };
  // Firma silme işlemi
  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm("Bu firmayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
      return;
    }
    
    try {
      const db = getDb();
      // Firma kaydını silmek yerine, tipini değiştir (tedarikçiler için)
      const companyRef = doc(db, COLLECTIONS.COMPANIES, companyId);
      
      // Önce firma bilgilerini al
      const companySnap = await getDoc(companyRef);
      if (!companySnap.exists()) {
        toast({
          title: "Hata!",
          description: "Firma bulunamadı.",
          variant: "destructive"
        });
        return;
      }
      
      // Firma kaydını güncelleyerek tip bilgisini "deleted" olarak işaretle
      await updateDoc(companyRef, {
        type: "deleted", // company tipine değil "deleted" tipine çevir
        updatedAt: new Date()
      });
      
      toast({
        title: "Başarılı!",
        description: "Firma başarıyla silindi.",
      });
      
      // Firma listesini güncelle
      loadCompanies();
    } catch (error) {
      console.error("Firma silinirken hata oluştu:", error);
      toast({
        title: "Hata!",
        description: "Firma silinirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  // Yeni firma ekleme modunu aç
  const openAddDialog = () => {
    setFormMode('add');
    setCurrentCompany(null);    setFormData({
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      taxId: "",
      category: ""
    });
    setShowNewCategoryInput(false);
    setNewCategory("");
    setDialogOpen(true);
  };
  // Component yüklendiğinde firmaları getir
  useEffect(() => {
    loadCompanies();
    loadCategories(); // Kategorileri de yükle
  }, []);

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">Firma Yönetimi</CardTitle>
            <CardDescription>
              Tedarikçi, otel ve diğer iş ortaklarını buradan yönetebilirsiniz
            </CardDescription>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" /> Yeni Firma
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p>Yükleniyor...</p>
            </div>
          ) : (
            <Table>
              <TableCaption>Toplam {companies.length} firma</TableCaption>              <TableHeader>
                <TableRow>
                  <TableHead>Firma Adı</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>İletişim Kişisi</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Vergi No</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Henüz kayıtlı firma bulunmamaktadır
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>{company.category || "-"}</TableCell>
                      <TableCell>{company.contactPerson || "-"}</TableCell>
                      <TableCell>{company.phone || "-"}</TableCell>
                      <TableCell>{company.email || "-"}</TableCell>
                      <TableCell>{company.taxId || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditCompany(company)}
                        >
                          <PenSquare className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteCompany(company.id)}
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
              {formMode === 'add' ? 'Yeni Firma Ekle' : 'Firma Bilgilerini Düzenle'}
            </DialogTitle>
            <DialogDescription>
              Firma bilgilerini buradan ekleyip güncelleyebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Firma Adı
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
              <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Kategori
              </Label>
              <div className="col-span-3 space-y-2">
                <Select                  value={formData.category}
                  onValueChange={(value) => {
                    if (value === "add-new") {
                      setShowNewCategoryInput(true);
                    } else if (value === "manage") {
                      setShowCategoryManager(true);
                    } else {
                      setFormData({ ...formData, category: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Firma kategorisi seçin" />
                  </SelectTrigger>                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                    <SelectItem value="add-new" className="text-blue-600 font-medium">
                      + Yeni Kategori Ekle
                    </SelectItem>
                    <SelectItem value="manage" className="text-orange-600 font-medium">
                      🗂️ Kategorileri Yönet
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {showNewCategoryInput && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Yeni kategori adı"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addNewCategory();
                        } else if (e.key === 'Escape') {
                          setShowNewCategoryInput(false);
                          setNewCategory("");
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={addNewCategory}
                      disabled={!newCategory.trim()}
                    >
                      Ekle
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowNewCategoryInput(false);
                        setNewCategory("");
                      }}
                    >
                      İptal
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactPerson" className="text-right">
                İletişim Kişisi
              </Label>
              <Input
                id="contactPerson"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Telefon
              </Label>              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                onKeyPress={handlePhoneKeyPress}
                placeholder="+90 532 456 12 45"
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                E-posta
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="taxId" className="text-right">
                Vergi No
              </Label>
              <Input
                id="taxId"
                name="taxId"
                value={formData.taxId}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Adres
              </Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="col-span-3"
                rows={3}
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
            <Button type="button" onClick={handleSaveCompany}>
              {formMode === 'add' ? 'Ekle' : 'Güncelle'}
            </Button>
          </DialogFooter>        </DialogContent>
      </Dialog>

      {/* Kategori Yönetim Dialog'u */}
      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Kategori Yönetimi</DialogTitle>
            <DialogDescription>
              Firma kategorilerini buradan yönetebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {categories.map((category, index) => (
              <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">{category}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`"${category}" kategorisini silmek istediğinizden emin misiniz?`)) {
                      deleteCategory(category);
                    }
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Henüz kategori bulunmamaktadır.
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Kapat</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
