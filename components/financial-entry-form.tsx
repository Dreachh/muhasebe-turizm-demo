"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Simple UUID generator function to replace the uuid package
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// onCancel fonksiyonu ana sayfaya yönlendirecek şekilde güncellendi
export function FinancialEntryForm({ onCancel = () => { window.location.hash = '#main-dashboard'; }, onSave, initialData }) {
  // initialData değiştiğinde formData'yı güncelle
  const [formData, setFormData] = useState({
    id: initialData?.id || generateUUID(),
    date: initialData?.date || new Date().toISOString().split("T")[0],
    type: initialData?.type || "income",
    category: initialData?.category || "",
    amount: initialData?.amount || "",
    currency: initialData?.currency || "TRY",
    description: initialData?.description || "",
    paymentMethod: initialData?.paymentMethod || "cash",
    paymentStatus: initialData?.paymentStatus || "paid", // paid veya debt şeklinde
    companyId: initialData?.companyId || "",
    tourId: initialData?.tourId || "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id || generateUUID(),
        date: initialData.date || new Date().toISOString().split("T")[0],
        type: initialData.type || "income",
        category: initialData.category || "",
        amount: initialData.amount || "",
        currency: initialData.currency || "TRY",
        description: initialData.description || "",
        paymentMethod: initialData.paymentMethod || "cash",
        paymentStatus: initialData.paymentStatus || "paid",
        companyId: initialData.companyId || "",
        tourId: initialData.tourId || "",
      });
    } else {
      setFormData({
        id: generateUUID(),
        date: new Date().toISOString().split("T")[0],
        type: "income",
        category: "",
        amount: "",
        currency: "TRY",
        description: "",
        paymentMethod: "cash",
        paymentStatus: "paid",
        companyId: "",
        tourId: "",
      });
    }
  }, [initialData]);

  const [isEditing, setIsEditing] = useState(false);

  const currencies = [
    { value: "TRY", label: "Türk Lirası (₺)" },
    { value: "USD", label: "Amerikan Doları ($)" },
    { value: "EUR", label: "Euro (€)" },
    { value: "GBP", label: "İngiliz Sterlini (£)" },
  ];

  useEffect(() => {
    if (initialData) {
      console.log("Financial edit data received:", initialData);
      // Form verilerini düzenlenecek kaydın değerlerine göre ayarla
      setFormData({
        id: initialData.id || generateUUID(),
        type: initialData.type || "income",
        category: initialData.category || "",
        amount: initialData.amount || "",
        currency: initialData.currency || "TRY",
        date: initialData.date || new Date().toISOString().split("T")[0],
        description: initialData.description || "",
        paymentMethod: initialData.paymentMethod || "cash",
        paymentStatus: initialData.paymentStatus || "paid",
        companyId: initialData.companyId || "",
        tourId: initialData.tourId || "",
      });
      // Düzenleme modunu etkinleştir
      setIsEditing(true);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      amount: Number.parseFloat(formData.amount),
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    // Eğer yeni kayıt modundaysa formu temizle ve başarı mesajı göster
    if (!initialData) {
      setFormData({
        id: generateUUID(),
        date: new Date().toISOString().split("T")[0],
        type: "income",
        category: "",
        amount: "",
        currency: "TRY",
        description: "",
        paymentMethod: "cash",
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
    // Düzenleme modunda ise formu kapatma, sadece güncelle
  };


  const getCurrencySymbol = (currencyCode) => {
    const symbols = {
      TRY: "₺",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    return symbols[currencyCode] || "";
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-12">
      <CardHeader>
        <CardTitle>{initialData ? "Finansal Kaydı Düzenle" : "Yeni Finansal Kayıt"}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Tarih</Label>
              <Input id="date" name="date" type="date" value={formData.date} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">İşlem Tipi</Label>
              <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="İşlem tipi seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Gelir</SelectItem>
                  <SelectItem value="expense">Gider</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Input
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="Kategori girin"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Ödeme Yöntemi</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => handleSelectChange("paymentMethod", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ödeme yöntemi seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Nakit</SelectItem>
                  <SelectItem value="creditCard">Kredi Kartı</SelectItem>
                  <SelectItem value="bankTransfer">Banka Transferi</SelectItem>
                  <SelectItem value="other">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Tutar</Label>
              <div className="flex">
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="rounded-r-none"
                  required
                />
                <Select value={formData.currency} onValueChange={(value) => handleSelectChange("currency", value)}>
                  <SelectTrigger className="w-[110px] rounded-l-none border-l-0">
                    <SelectValue placeholder="Para Birimi" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {getCurrencySymbol(currency.value)} {currency.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Açıklama girin"
              rows={3}
            />
          </div>

          {/* Ödeme durumu seçimi eklenmiştir */}
          {formData.type === "expense" && (
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Ödeme Durumu</Label>
              <Select
                value={formData.paymentStatus}
                onValueChange={(value) => handleSelectChange("paymentStatus", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ödeme durumunu seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Ödendi</SelectItem>
                  <SelectItem value="debt">Borç Olarak Ekle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Borç durumunda firma seçimi göster */}
          {formData.type === "expense" && formData.paymentStatus === "debt" && (
            <div className="space-y-2">
              <Label htmlFor="companyId">Firma/Tedarikçi</Label>
              <Select
                value={formData.companyId}
                onValueChange={(value) => handleSelectChange("companyId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Firma seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Yeni Firma Ekle</SelectItem>
                  {/* Burada API'den firmalar yüklenecek */}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            İptal
          </Button>
          <Button type="submit" className="bg-[#00a1c6] hover:bg-[#00a1c6]/90">
            {initialData ? "Güncelle" : "Kaydet"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
