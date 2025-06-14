"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Edit } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

export function SupplierCard({ supplier }) {
  const [isExpanded, setIsExpanded] = useState(false)

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

  // Her para birimi için kalan borç hesapla
  const remainingDebtByCurrency = {}

  Object.keys(debtsByCurrency).forEach((currency) => {
    const totalDebt = debtsByCurrency[currency].total
    const totalPaid = paymentsByCurrency[currency]?.total || 0
    remainingDebtByCurrency[currency] = totalDebt - totalPaid
  })

  return (
    <Card>
      <CardHeader
        className="flex flex-row items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 className="text-lg font-semibold">{supplier.name}</h3>
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.entries(remainingDebtByCurrency).map(([currency, amount]) => (
              <div key={currency} className="text-sm">
                <span className={amount > 0 ? "text-red-500" : "text-green-500"}>
                  {formatCurrency(amount, currency)}
                </span>
                {amount > 0 ? " borç" : " alacak"}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" onClick={(e) => e.stopPropagation()}>
                <Edit className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ödeme Yap: {supplier.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Ödeme Tutarı</label>
                    <Input type="number" placeholder="1000" />
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
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Açıklama (Opsiyonel)</label>
                  <Input placeholder="Ödeme açıklaması" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Ödeme Tarihi</label>
                  <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
                <Button className="w-full">Ödeme Ekle</Button>
              </div>
            </DialogContent>
          </Dialog>
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <Tabs defaultValue="debts">
            <TabsList className="mb-4">
              <TabsTrigger value="debts">Borçlar</TabsTrigger>
              <TabsTrigger value="payments">Ödemeler</TabsTrigger>
              <TabsTrigger value="summary">Özet</TabsTrigger>
            </TabsList>

            <TabsContent value="debts" className="space-y-4">
              {Object.entries(debtsByCurrency).map(([currency, { items }]) => (
                <div key={currency}>
                  <h4 className="font-medium mb-2">{currency} Borçları</h4>
                  <div className="space-y-2">
                    {items.map((debt) => (
                      <Card key={debt.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{debt.description}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{formatDate(debt.date)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-medium">{formatCurrency(debt.amount, debt.currency)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              {Object.entries(paymentsByCurrency).map(([currency, { items }]) => (
                <div key={currency}>
                  <h4 className="font-medium mb-2">{currency} Ödemeleri</h4>
                  <div className="space-y-2">
                    {items.map((payment) => (
                      <Card key={payment.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Ödeme</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{formatDate(payment.date)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-medium text-green-500">
                              {formatCurrency(payment.amount, payment.currency)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="summary">
              <div className="space-y-4">
                {Object.keys({ ...debtsByCurrency, ...paymentsByCurrency }).map((currency) => {
                  const totalDebt = debtsByCurrency[currency]?.total || 0
                  const totalPaid = paymentsByCurrency[currency]?.total || 0
                  const remaining = totalDebt - totalPaid

                  return (
                    <div key={currency} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">{currency} Özeti</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Toplam Borç</p>
                          <p className="font-medium">{formatCurrency(totalDebt, currency)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Toplam Ödeme</p>
                          <p className="font-medium">{formatCurrency(totalPaid, currency)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Kalan Borç</p>
                          <p className={`font-medium ${remaining > 0 ? "text-red-500" : "text-green-500"}`}>
                            {formatCurrency(remaining, currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  )
}
