"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Search, Edit, Trash2, Save, Plus, X } from "lucide-react"

// Customer veri tipi tanımı
interface Customer {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  idNumber?: string;
  citizenship?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
}

interface CustomerViewProps {
  initialData?: Customer;
  onCancel?: () => void;
  onSave?: (customer: Customer) => void; 
  onUpdateData?: (customers: Customer[]) => void;
  customersData: Customer[];
  editingRecord?: any;
  setEditingRecord?: (record: any) => void;
  onNavigate?: (view: string) => void;
}

// Simple UUID generator function
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// onCancel fonksiyonu ana sayfaya yönlendirecek şekilde güncellendi
export function CustomerView({ 
  initialData, 
  onCancel = () => { window.location.hash = '#main-dashboard'; }, 
  onSave, 
  onUpdateData, 
  customersData = [], 
  editingRecord, 
  setEditingRecord,
  onNavigate
}: CustomerViewProps) {
  // State tanımlamaları
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<Customer>({
    id: generateUUID(),
    name: "",
    phone: "",
    email: "",
    address: "",
    idNumber: "",
    citizenship: "", // Vatandaşlık/Ülke alanı eklendi
    notes: "",
    createdAt: new Date().toISOString(),
  })

  // initialData değiştiğinde çalışacak etki
  useEffect(() => {
    if (initialData) {
      console.log("Düzenleme için veri geldi:", initialData);
      // Form verilerini düzenlenecek müşteriye göre ayarla
      setFormData({
        id: initialData.id || generateUUID(),
        name: initialData.name || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        address: initialData.address || "",
        idNumber: initialData.idNumber || "",
        citizenship: initialData.citizenship || "", // Vatandaşlık/Ülke alanı eklendi
        notes: initialData.notes || "",
        createdAt: initialData.createdAt || new Date().toISOString(),
      })
      
      // Düzenleme modunu etkinleştir ve formu göster
      setIsEditing(true)
      setShowForm(true)
    }
  }, [initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Form verilerini kaydet
    if (typeof onSave === 'function') {
      onSave({
        ...formData,
        updatedAt: new Date().toISOString(),
      });
    }

    // Form işleminden sonra durumu sıfırla
    if (!isEditing) {
      setFormData({
        id: generateUUID(),
        name: "",
        phone: "",
        email: "",
        address: "",
        idNumber: "",
        citizenship: "", // Vatandaşlık/Ülke alanı eklendi
        notes: "",
        createdAt: new Date().toISOString(),
      })
    }
    
    setIsEditing(false)
    setShowForm(false)
  }

  const handleEdit = (customer: Customer) => {
    // Tablodaki düzenle butonuna tıklandığında
    setFormData({
      id: customer.id || generateUUID(),
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      idNumber: customer.idNumber || "",
      citizenship: customer.citizenship || "", // Vatandaşlık/Ülke alanı eklendi
      notes: customer.notes || "",
      createdAt: customer.createdAt || new Date().toISOString(),
    })
    setIsEditing(true)
    setShowForm(true)
  }

  const handleDelete = (customer: Customer) => {
    setCustomerToDelete(customer)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!customerToDelete) return
    
    if (typeof onSave === 'function') {
      onSave({
        ...customerToDelete,
        deleted: true,
      })
    } else {
      // Ana sayfadan silme işlemi için alternatif yol
      const updatedCustomers = customersData.filter(c => c.id !== customerToDelete.id);
      if (typeof onUpdateData === 'function') {
        onUpdateData(updatedCustomers);
      }
    }
    setIsDeleteDialogOpen(false)
  }

  const toggleForm = () => {
    if (!showForm) {
      // Yeni müşteri ekle butonuna tıklandığında
      setFormData({
        id: generateUUID(),
        name: "",
        phone: "",
        email: "",
        address: "",
        idNumber: "",
        citizenship: "", // Vatandaşlık/Ülke alanı eklendi
        notes: "",
        createdAt: new Date().toISOString(),
      })
      setIsEditing(false)
    } else {
      // Form kapatılırken düzenleme de iptal edilmeli
      setIsEditing(false)
    }
    setShowForm(!showForm)
  }

  const openEditForm = (customer: Customer) => {
    handleEdit(customer)
  }

  const filteredCustomers = customersData.filter(
    (customer) =>
      customer && 
      !customer.deleted &&
      (
        (customer.name && customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.phone && customer.phone.includes(searchTerm)) ||
        (customer.email && customer.email?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
  )

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-[40px] mt-10 sm:px-4">
      {!showForm ? (
        <Button 
          className="bg-[#00a1c6] hover:bg-[#0090b0] mb-4" 
          onClick={toggleForm}
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni Müşteri Ekle
        </Button>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[#00a1c6]">{isEditing ? "Müşteri Düzenle" : "Yeni Müşteri Ekle"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={toggleForm} title="Kapat">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Ad Soyad</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Müşteri adı soyadı"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Telefon numarası"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="E-posta adresi"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idNumber">TC/Pasaport No</Label>
                  <Input
                    id="idNumber"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleChange}
                    placeholder="Kimlik numarası"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="citizenship">Vatandaşlık/Ülke</Label>
                <Input
                  id="citizenship"
                  name="citizenship"
                  value={formData.citizenship}
                  onChange={handleChange}
                  placeholder="Vatandaşlık veya ülke"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Adres bilgisi"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notlar</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Müşteri ile ilgili notlar"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={toggleForm}>
                  İptal
                </Button>
                <Button type="submit" className="bg-[#00a1c6] hover:bg-[#0090b0]">
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Güncelle" : "Kaydet"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#00a1c6]">Müşteri Listesi</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Müşteri ara..."
                className="pl-8 w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] text-center">Sıra No</TableHead>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead>TC/Pasaport No</TableHead>
                  <TableHead>Vatandaşlık/Ülke</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer, index) => (
                    <TableRow key={customer.id}>
                      <TableCell className="text-center font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.idNumber}</TableCell>
                      <TableCell>{customer.citizenship}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditForm(customer)} title="Düzenle">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(customer)} title="Sil">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      {searchTerm ? "Arama kriterlerine uygun müşteri bulunamadı." : "Henüz müşteri kaydı bulunmuyor."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Müşteriyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu müşteriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={confirmDelete}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
