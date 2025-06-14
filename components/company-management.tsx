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
import { useToast } from "@/components/ui/use-toast"
import { Building, Plus, PenSquare, Trash2, Phone, Mail, FileText } from "lucide-react"
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore"
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
  createdAt: Date;
  updatedAt: Date;
}

export default function CompanyManagement() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [backupData, setBackupData] = useState<any>(null);
  const [dbRepairDialogOpen, setDbRepairDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Company>>({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    taxId: ""
  });// Firmaları Firebase'den yükle
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
    }
  };
  // Form alanlarının değişikliklerini izle
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
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
      taxId: company.taxId
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
    setCurrentCompany(null);
    setFormData({
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      taxId: ""
    });
    setDialogOpen(true);
  };

  // Component yüklendiğinde firmaları getir
  useEffect(() => {
    loadCompanies();
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
              <TableCaption>Toplam {companies.length} firma</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Firma Adı</TableHead>
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
                    <TableCell colSpan={6} className="text-center">
                      Henüz kayıtlı firma bulunmamaktadır
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
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
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
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
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
