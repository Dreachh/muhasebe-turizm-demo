"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, Calendar, Globe, Database, Clock, CheckCircle } from "lucide-react"
import { getAllData } from "@/lib/db"
import { formatCurrency } from "@/lib/data-utils"

export function DashboardView({ onNavigate }) {
  const [financialData, setFinancialData] = useState([])
  const [toursData, setToursData] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Veritabanından verileri yükle
        const tours = await getAllData("tours")
        const financials = await getAllData("financials")

        setToursData(tours)
        setFinancialData(financials)
      } catch (error) {
        console.error("Veri yükleme hatası:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Son 30 gün içindeki verileri filtrele
  const last30Days = new Date()
  last30Days.setDate(last30Days.getDate() - 30)

  const recentFinancialData = financialData.filter((item) => new Date(item.date) >= last30Days)
  const recentToursData = toursData.filter((item) => new Date(item.tourDate) >= last30Days)

  // Toplam gelir
  const totalIncome = recentFinancialData
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + (Number.parseFloat(item.amount) || 0), 0)

  // Toplam müşteri sayısı
  const totalCustomers = recentToursData.reduce((sum, item) => sum + (Number.parseInt(item.numberOfPeople) || 0), 0)

  // Yaklaşan turlar (bugünden sonraki 30 gün)
  const today = new Date()
  const next30Days = new Date()
  next30Days.setDate(next30Days.getDate() + 30)

  const upcomingTours = toursData.filter((item) => {
    const tourDate = new Date(item.tourDate)
    return tourDate >= today && tourDate <= next30Days
  })

  // Tamamlanan turlar
  const completedTours = toursData.filter((item) => {
    const tourDate = new Date(item.tourDate)
    return tourDate < today
  })

  // Büyüme oranı (son 30 gün vs önceki 30 gün)
  const previous30Days = new Date()
  previous30Days.setDate(previous30Days.getDate() - 60)

  const previousPeriodData = financialData.filter((item) => {
    const itemDate = new Date(item.date)
    return itemDate >= previous30Days && itemDate < last30Days
  })

  const previousPeriodIncome = previousPeriodData
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + (Number.parseFloat(item.amount) || 0), 0)

  const growthRate = previousPeriodIncome > 0 ? ((totalIncome - previousPeriodIncome) / previousPeriodIncome) * 100 : 0

  // Son etkinlikler
  const recentActivities = [
    ...recentToursData.map((tour) => ({
      type: "tour",
      title: `Yeni tur satışı: ${tour.tourName}`,
      date: new Date(tour.createdAt || tour.tourDate),
      color: "bg-green-500",
    })),
    ...recentFinancialData.map((financial) => ({
      type: "financial",
      title: `${financial.type === "income" ? "Gelir" : "Gider"} kaydı: ${financial.category}`,
      date: new Date(financial.date),
      color: financial.type === "income" ? "bg-blue-500" : "bg-yellow-500",
    })),
  ]
    .sort((a, b) => b.date - a.date)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Toplam Turlar</h3>
                <p className="text-3xl font-bold">{toursData.length}</p>
                <p className="text-xs text-muted-foreground">Tüm zamanlar</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Globe className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Müşteriler</h3>
                <p className="text-3xl font-bold">{totalCustomers}</p>
                <p className="text-xs text-muted-foreground">Son 30 gün</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Yaklaşan Turlar</h3>
                <p className="text-3xl font-bold">{upcomingTours.length}</p>
                <p className="text-xs text-muted-foreground">Önümüzdeki 30 gün</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Tamamlanan Turlar</h3>
                <p className="text-3xl font-bold">{completedTours.length}</p>
                <p className="text-xs text-muted-foreground">Tüm zamanlar</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hızlı İşlemler */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-blue-600">Hızlı İşlemler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                onClick={() => onNavigate("financial-entry")}
              >
                <DollarSign className="h-6 w-6" />
                <span>Finansal Giriş</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                onClick={() => onNavigate("tour-sales")}
              >
                <Globe className="h-6 w-6" />
                <span>Tur Satışı</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                onClick={() => onNavigate("data-view")}
              >
                <Database className="h-6 w-6" />
                <span>Veri Görüntüleme</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                onClick={() => onNavigate("calendar")}
              >
                <Calendar className="h-6 w-6" />
                <span>Takvim</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Son Etkinlikler */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-blue-600">Son Etkinlikler</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${activity.color} mr-2`}></div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.date.toLocaleDateString("tr-TR")},{" "}
                        {activity.date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Calendar className="h-12 w-12 text-gray-300 mb-2" />
                <p className="text-sm text-muted-foreground">Henüz etkinlik yok</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gelir Bilgisi */}
      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Gelir (Son 30 gün):</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Büyüme oranı:</p>
          <p className={`text-xl font-bold ${growthRate >= 0 ? "text-green-600" : "text-red-600"}`}>
            {growthRate.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  )
}

