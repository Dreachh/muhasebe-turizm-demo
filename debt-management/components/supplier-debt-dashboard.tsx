"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { SupplierCard } from "@/components/supplier-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

// Örnek veri
const mockSuppliers = [
  {
    id: "sup_1",
    name: "Çilem Turizm",
    debts: [
      {
        id: "debt_1",
        supplierId: "sup_1",
        amount: 1000,
        currency: "USD",
        description: "Rehber Ücreti",
        date: "2024-05-10",
        status: "ACTIVE",
      },
      {
        id: "debt_2",
        supplierId: "sup_1",
        amount: 2500,
        currency: "TRY",
        description: "Otel Rezervasyonu",
        date: "2024-05-12",
        status: "ACTIVE",
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
  },
  {
    id: "sup_2",
    name: "Antalya Tur",
    debts: [
      {
        id: "debt_3",
        supplierId: "sup_2",
        amount: 750,
        currency: "EUR",
        description: "Transfer Ücreti",
        date: "2024-05-08",
        status: "ACTIVE",
      },
    ],
    payments: [],
    totalDebt: 750,
    totalPaid: 0,
  },
  {
    id: "sup_3",
    name: "İstanbul Rehberlik",
    debts: [
      {
        id: "debt_4",
        supplierId: "sup_3",
        amount: 5000,
        currency: "TRY",
        description: "Rehberlik Hizmeti",
        date: "2024-05-01",
        status: "ACTIVE",
      },
      {
        id: "debt_5",
        supplierId: "sup_3",
        amount: 3000,
        currency: "TRY",
        description: "Müze Giriş Ücretleri",
        date: "2024-05-03",
        status: "PAID",
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
      {
        id: "pay_3",
        supplierId: "sup_3",
        debtId: "debt_4",
        amount: 2500,
        currency: "TRY",
        description: "Kısmi Ödeme",
        date: "2024-05-10",
      },
    ],
    totalDebt: 8000,
    totalPaid: 5500,
  },
]

export function SupplierDebtDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currencyFilter, setCurrencyFilter] = useState("all")  

  // Borç ve ödeme toplamı hesaplama
  const calculateTotalDebtInfo = () => {
    let totalDebt = 0
    let totalPaid = 0

    mockSuppliers.forEach(supplier => {
      // Borçları hesapla
      supplier.debts.forEach(debt => {
        if (currencyFilter === "all" || debt.currency === currencyFilter) {
          totalDebt += Number(debt.amount || 0)
        }
      })

      // Ödemeleri hesapla
      supplier.payments?.forEach(payment => {
        if (currencyFilter === "all" || payment.currency === currencyFilter) {
          totalPaid += Number(payment.amount || 0)
        }
      })
    })

    return {
      totalDebt,
      totalPaid,
      remainingDebt: totalDebt - totalPaid
    }
  }

  // Özet değerleri hesapla
  const totals = calculateTotalDebtInfo()

  const filteredSuppliers = mockSuppliers.filter((supplier) => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCurrency = currencyFilter === "all" || supplier.debts.some((debt) => debt.currency === currencyFilter)
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && supplier.totalDebt > supplier.totalPaid) ||
      (statusFilter === "paid" && supplier.totalDebt <= supplier.totalPaid)

    return matchesSearch && matchesCurrency && matchesStatus
  })

  return (
    <div>
      {/* Borç Özeti */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Toplam Borç</div>
          <div className="text-xl font-bold text-blue-700">{totals.totalDebt.toLocaleString('tr-TR')} {currencyFilter === "all" ? "₺" : currencyFilter}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600 font-medium">Toplam Ödeme</div>
          <div className="text-xl font-bold text-green-700">{totals.totalPaid.toLocaleString('tr-TR')} {currencyFilter === "all" ? "₺" : currencyFilter}</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <div className="text-sm text-amber-600 font-medium">Kalan Borç</div>
          <div className="text-xl font-bold text-amber-700">{totals.remainingDebt.toLocaleString('tr-TR')} {currencyFilter === "all" ? "₺" : currencyFilter}</div>
        </div>
      </div>

      {/* Arama ve Filtreleme */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tedarikçi ara..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Para Birimi</label>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tüm Para Birimleri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Para Birimleri</SelectItem>
                <SelectItem value="TRY">TL</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Borç Durumu</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tüm Borçlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Borçlar</SelectItem>
                <SelectItem value="active">Aktif Borçlar</SelectItem>
                <SelectItem value="paid">Ödenmiş Borçlar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Yeni Borç Ekleme Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full">Yeni Borç Ekle</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Borç Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Tedarikçi</label>
                <Select defaultValue="sup_1">
                  <SelectTrigger>
                    <SelectValue placeholder="Tedarikçi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sup_1">Çilem Turizm</SelectItem>
                    <SelectItem value="sup_2">Antalya Tur</SelectItem>
                    <SelectItem value="sup_3">İstanbul Rehberlik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tutar</label>
                <Input type="number" placeholder="1000" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Para Birimi</label>
              <Select defaultValue="TRY">
                <SelectTrigger>
                  <SelectValue placeholder="Para birimi seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Açıklama</label>
              <Input placeholder="Borç açıklaması" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tarih</label>
              <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
            <Button className="w-full">Borç Ekle</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tedarikçi Kartları */}
      <div className="lg:col-span-3 space-y-4">
        {filteredSuppliers.map((supplier) => (
          <SupplierCard key={supplier.id} supplier={supplier} />
        ))}
      </div>
    </div>
  )
}
