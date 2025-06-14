"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Edit } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { BorcItem } from "@/components/borclar/borc-item"
import { OdemeItem } from "@/components/borclar/odeme-item"
import { OdemeEkleForm } from "@/components/borclar/odeme-ekle-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Tedarikci } from "@/types/tedarikci"

interface TedarikciKartProps {
  tedarikci: Tedarikci
}

export function TedarikciKart({ tedarikci }: TedarikciKartProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Para birimine göre borç ve ödemeleri grupla
  const borclarByParaBirimi: Record<string, { total: number; items: any[] }> = {}
  const odemelerByParaBirimi: Record<string, { total: number; items: any[] }> = {}

  tedarikci.borclar.forEach((borc) => {
    if (!borclarByParaBirimi[borc.currency]) {
      borclarByParaBirimi[borc.currency] = { total: 0, items: [] }
    }
    borclarByParaBirimi[borc.currency].total += borc.amount
    borclarByParaBirimi[borc.currency].items.push(borc)
  })

  tedarikci.odemeler.forEach((odeme) => {
    if (!odemelerByParaBirimi[odeme.currency]) {
      odemelerByParaBirimi[odeme.currency] = { total: 0, items: [] }
    }
    odemelerByParaBirimi[odeme.currency].total += odeme.amount
    odemelerByParaBirimi[odeme.currency].items.push(odeme)
  })

  // Her para birimi için kalan borç hesapla
  const kalanBorcByParaBirimi: Record<string, number> = {}

  Object.keys(borclarByParaBirimi).forEach((currency) => {
    const totalBorc = borclarByParaBirimi[currency].total
    const totalOdenen = odemelerByParaBirimi[currency]?.total || 0
    kalanBorcByParaBirimi[currency] = totalBorc - totalOdenen
  })

  return (
    <Card>
      <CardHeader
        className="flex flex-row items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 className="text-lg font-semibold">{tedarikci.name}</h3>
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.entries(kalanBorcByParaBirimi).map(([currency, amount]) => (
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
                <DialogTitle>Ödeme Yap: {tedarikci.name}</DialogTitle>
              </DialogHeader>
              <OdemeEkleForm tedarikciId={tedarikci.id} />
            </DialogContent>
          </Dialog>
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <Tabs defaultValue="borclar">
            <TabsList className="mb-4">
              <TabsTrigger value="borclar">Borçlar</TabsTrigger>
              <TabsTrigger value="odemeler">Ödemeler</TabsTrigger>
              <TabsTrigger value="ozet">Özet</TabsTrigger>
            </TabsList>

            <TabsContent value="borclar" className="space-y-4">
              {Object.entries(borclarByParaBirimi).map(([currency, { items }]) => (
                <div key={currency}>
                  <h4 className="font-medium mb-2">{currency} Borçları</h4>
                  <div className="space-y-2">
                    {items.map((borc) => (
                      <BorcItem key={borc.id} borc={borc} />
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="odemeler" className="space-y-4">
              {Object.entries(odemelerByParaBirimi).map(([currency, { items }]) => (
                <div key={currency}>
                  <h4 className="font-medium mb-2">{currency} Ödemeleri</h4>
                  <div className="space-y-2">
                    {items.map((odeme) => (
                      <OdemeItem key={odeme.id} odeme={odeme} />
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="ozet">
              <div className="space-y-4">
                {Object.keys({ ...borclarByParaBirimi, ...odemelerByParaBirimi }).map((currency) => {
                  const totalBorc = borclarByParaBirimi[currency]?.total || 0
                  const totalOdenen = odemelerByParaBirimi[currency]?.total || 0
                  const kalan = totalBorc - totalOdenen

                  return (
                    <div key={currency} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">{currency} Özeti</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Toplam Borç</p>
                          <p className="font-medium">{formatCurrency(totalBorc, currency)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Toplam Ödeme</p>
                          <p className="font-medium">{formatCurrency(totalOdenen, currency)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Kalan Borç</p>
                          <p className={`font-medium ${kalan > 0 ? "text-red-500" : "text-green-500"}`}>
                            {formatCurrency(kalan, currency)}
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
