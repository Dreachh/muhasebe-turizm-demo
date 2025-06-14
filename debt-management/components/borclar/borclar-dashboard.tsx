"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { TedarikciKart } from "@/components/borclar/tedarikci-kart"
import { BorcEkleForm } from "@/components/borclar/borc-ekle-form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useTedarikci } from "@/hooks/use-tedarikci"
import { Card } from "@/components/ui/card"

export function BorclarDashboard() {
  const { tedarikciler, isLoading } = useTedarikci()
  const [searchTerm, setSearchTerm] = useState("")
  const [currencyFilter, setCurrencyFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredTedarikciler = tedarikciler.filter((tedarikci) => {
    const matchesSearch = tedarikci.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCurrency =
      currencyFilter === "all" || tedarikci.borclar.some((borc) => borc.currency === currencyFilter)
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && tedarikci.totalBorc > tedarikci.totalOdenen) ||
      (statusFilter === "paid" && tedarikci.totalBorc <= tedarikci.totalOdenen)

    return matchesSearch && matchesCurrency && matchesStatus
  })

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Yükleniyor...</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tedarikçi ara..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
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

        <div>
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

        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full">Yeni Borç Ekle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Borç Ekle</DialogTitle>
            </DialogHeader>
            <BorcEkleForm />
          </DialogContent>
        </Dialog>
      </div>

      <div className="lg:col-span-3 space-y-4">
        {filteredTedarikciler.length === 0 ? (
          <Card className="p-8">
            <div className="text-center py-10">
              <p>Filtrelere uygun tedarikçi bulunamadı.</p>
            </div>
          </Card>
        ) : (
          filteredTedarikciler.map((tedarikci) => <TedarikciKart key={tedarikci.id} tedarikci={tedarikci} />)
        )}
      </div>
    </div>
  )
}
