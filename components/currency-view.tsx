"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { fetchExchangeRates } from "@/lib/currency-service"

interface Rate {
  code: string
  name: string
  buying: number
  selling: number
}

export function CurrencyView({ onClose }: { onClose: () => void }) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [rates, setRates] = useState<Rate[]>([])
  const [amount, setAmount] = useState("1")
  const [fromCurrency, setFromCurrency] = useState("USD")
  const [toCurrency, setToCurrency] = useState("TRY")
  const [result, setResult] = useState("")
  const [rateType, setRateType] = useState<"buying" | "selling">("buying")

  // Gerçek API'den döviz kurlarını çek
  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const data = await fetchExchangeRates()
      setRates(data.rates)
      setLastUpdate(new Date(data.lastUpdated || new Date()))
      toast({
        title: "Kurlar güncellendi",
        description: "Döviz kurları başarıyla güncellendi.",
      })
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Döviz kurları alınamadı.",
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }
  
  const handleConvert = () => {
    let convertedAmount = 0
    const amountValue = Number.parseFloat(amount)
    
    // Radio button seçimine göre kur tipini belirle
    const useSellingRate = rateType === "selling"
    
    if (fromCurrency === "TRY" && toCurrency !== "TRY") {
      // TRY'den yabancı para birimine
      const currency = rates.find((r) => r.code === toCurrency)
      if (currency) {
        const rate = useSellingRate ? currency.selling : currency.buying
        convertedAmount = +(amountValue / rate).toFixed(2)
      }
    } else if (fromCurrency !== "TRY" && toCurrency === "TRY") {
      // Yabancı para biriminden TRY'ye
      const currency = rates.find((r) => r.code === fromCurrency)
      if (currency) {
        const rate = useSellingRate ? currency.selling : currency.buying
        
        // Tam olarak çarpım yaparak kesin sonuç al
        convertedAmount = +(amountValue * rate).toFixed(2)
      }
    } else if (fromCurrency !== "TRY" && toCurrency !== "TRY") {
      // Yabancı para biriminden yabancı para birimine
      const fromRate = rates.find((r) => r.code === fromCurrency)
      const toRate = rates.find((r) => r.code === toCurrency)
      if (fromRate && toRate) {
        // Önce TRY'ye çevir, sonra hedef para birimine
        const fromRateValue = useSellingRate ? fromRate.selling : fromRate.buying
        const toRateValue = useSellingRate ? toRate.selling : toRate.buying
        const tryAmount = amountValue * fromRateValue
        convertedAmount = +(tryAmount / toRateValue).toFixed(2)
      }
    } else {
      // TRY'den TRY'ye
      convertedAmount = amountValue
    }

    // Sonuç formatı - Hassas hesaplamayı koruyarak göster
    setResult(`${amountValue} ${fromCurrency} = ${convertedAmount.toFixed(2)} ${toCurrency}`)
  }

  useEffect(() => {
    handleRefresh()
  }, [])

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[#00a1c6]">Döviz Kurları</CardTitle>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">Son güncelleme: {lastUpdate.toLocaleTimeString("tr-TR")}</div>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Güncelle
          </Button>
          <Button variant="outline" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-muted/50">
                <tr>
                  <th className="py-3 px-4 text-left font-medium border-b border-r">Para Birimi</th>
                  <th className="py-3 px-4 text-right font-medium border-b border-r w-[120px]">Alış</th>
                  <th className="py-3 px-4 text-right font-medium border-b w-[120px]">Satış</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate) => (
                  <tr key={rate.code} className="border-b hover:bg-muted/30">
                    <td className="py-2.5 px-4 border-r">
                      <div dangerouslySetInnerHTML={{ __html: rate.name }} />
                    </td>
                    <td className="py-2.5 px-4 text-right border-r">{rate.buying.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right">{rate.selling.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Kur Çeviri Alanı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Label htmlFor="kurTipi">Kur Tipi:</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="alis"
                    name="kurTipi"
                    value="buying"
                    checked={rateType === "buying"}
                    onChange={() => setRateType("buying")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="alis">Alış</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="satis"
                    name="kurTipi"
                    value="selling"
                    checked={rateType === "selling"}
                    onChange={() => setRateType("selling")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="satis">Satış</Label>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="w-full md:w-1/3">
                  <Label htmlFor="amount" className="mb-2 block">Miktar:</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="w-full md:w-1/3">
                  <Label htmlFor="fromCurrency" className="mb-2 block">Para Birimi:</Label>
                  <Select value={fromCurrency} onValueChange={setFromCurrency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Para birimi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {rates.map((rate) => (
                        <SelectItem key={rate.code} value={rate.code}>
                          <div dangerouslySetInnerHTML={{ __html: rate.name }} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-center w-full md:w-[40px]">
                  <span className="text-xl">→</span>
                </div>
                
                <div className="w-full md:w-1/3">
                  <Label htmlFor="result" className="mb-2 block">Sonuç:</Label>
                  <div className="flex">
                    <Input
                      id="result"
                      type="text"
                      value={result ? (parseFloat(result.split(" = ")[1].split(" ")[0]).toFixed(2)) : ""}
                      readOnly
                      className="rounded-r-none"
                    />
                    <Select value={toCurrency} onValueChange={setToCurrency}>
                      <SelectTrigger className="rounded-l-none border-l-0 w-[140px]">
                        <SelectValue placeholder="Birim" />
                      </SelectTrigger>
                      <SelectContent>
                        {rates.map((rate) => (
                          <SelectItem key={rate.code} value={rate.code}>
                            <div dangerouslySetInnerHTML={{ __html: rate.name }} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleConvert} className="bg-[#2b3275] hover:bg-[#00a1c6]">
                  Çevir
                </Button>
              </div>
            </div>
            
            {result && (
              <div className="mt-4 p-4 bg-muted rounded-md text-center font-medium">
                {(() => {
                  if (parseFloat(amount) > 0) {
                    // Kur değerini doğrudan veri kaynağından al
                    const currency = rates.find((r) => r.code === fromCurrency);
                    const toCurrencyInfo = rates.find((r) => r.code === toCurrency);
                    
                    if (fromCurrency === "TRY" && toCurrency !== "TRY" && toCurrencyInfo) {
                      // TRY'den başka para birimine çevirirken, 1 birim toCurrency'nin TRY değeri
                      const rate = rateType === "selling" ? toCurrencyInfo.selling : toCurrencyInfo.buying;
                      return `1 ${fromCurrency} = ${(1/rate).toFixed(2)} ${toCurrency} (${rateType === "buying" ? "Alış" : "Satış"} kuru ile)`;
                    } 
                    else if (fromCurrency !== "TRY" && toCurrency === "TRY" && currency) {
                      // Başka para biriminden TRY'ye çevirirken
                      const rate = rateType === "selling" ? currency.selling : currency.buying;
                      return `1 ${fromCurrency} = ${rate.toFixed(2)} ${toCurrency} (${rateType === "buying" ? "Alış" : "Satış"} kuru ile)`;
                    }
                    else if (currency && toCurrencyInfo) {
                      // Her iki para birimi de TRY değilse, çapraz kur hesapla
                      const fromRate = rateType === "selling" ? currency.selling : currency.buying;
                      const toRate = rateType === "selling" ? toCurrencyInfo.selling : toCurrencyInfo.buying;
                      return `1 ${fromCurrency} = ${(fromRate/toRate).toFixed(2)} ${toCurrency} (${rateType === "buying" ? "Alış" : "Satış"} kuru ile)`;
                    }
                  }
                  return `1 ${fromCurrency} = 0.00 ${toCurrency} (${rateType === "buying" ? "Alış" : "Satış"} kuru ile)`;
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
