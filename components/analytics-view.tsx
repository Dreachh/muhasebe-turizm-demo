"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { formatCurrency } from "@/lib/data-utils"

export function AnalyticsView({ financialData = [], toursData = [], onClose }) {
  const [dateRange, setDateRange] = useState("thisMonth")
  const [filteredFinancialData, setFilteredFinancialData] = useState([])
  const [filteredToursData, setFilteredToursData] = useState([])
  const [selectedCurrency, setSelectedCurrency] = useState("all")

  // Tüm tur satışlarını (tarih farketmeksizin) analizlere dahil et
  useEffect(() => {
    setFilteredFinancialData(financialData)
    setFilteredToursData(toursData)
  }, [financialData, toursData])

  // Para birimine göre filtreleme
  const getFilteredToursByCurrency = () => {
    if (!filteredToursData || !Array.isArray(filteredToursData)) {
      return [];
    }
    
    if (selectedCurrency === "all") {
      return filteredToursData
    }
    return filteredToursData.filter((tour) => tour && tour.currency === selectedCurrency)
  }

  // Analitik hesaplamaları
  const totalIncome = (filteredFinancialData || [])
    .filter((item) => item && item.type === "income")
    .reduce((sum, item) => sum + (Number.parseFloat(item?.amount?.toString() || '0') || 0), 0)
  // Tur gelirleri (tüm turların totalPrice toplamı)
  const tourIncome = (filteredToursData || [])
    .reduce((sum, tour) => sum + (Number.parseFloat(tour?.totalPrice?.toString() || '0') || 0), 0)
      // Şirket giderleri (tur ile ilişkili olmayan giderler)
  const companyExpenses = (filteredFinancialData || [])
    .filter((item) => item && item.type === "expense" && !item.relatedTourId)
    .reduce((sum, item) => sum + (Number.parseFloat(item?.amount?.toString() || '0') || 0), 0);
    
  // Tur giderleri (sadece turların expenses alanından)
  const tourExpenses = (filteredToursData || []).reduce((sum, tour) => {
    if (!tour || !Array.isArray(tour.expenses)) return sum;
    return sum + tour.expenses.reduce((expSum, exp) => 
      expSum + (Number.parseFloat(exp?.amount?.toString() || '0') || 0), 0);
  }, 0);
  
  // Toplam gider (şirket giderleri + tur giderleri)
  const totalExpense = companyExpenses + tourExpenses;

  const totalProfit = totalIncome - totalExpense

  const filteredToursByCurrency = getFilteredToursByCurrency() || []
  const totalTours = filteredToursByCurrency.length

  const totalCustomers = filteredToursByCurrency.reduce(
    (sum, item) => sum + (Number.parseInt(item?.numberOfPeople?.toString() || '0') || 0),
    0,
  )

  const averageTourPrice =
    totalTours > 0
      ? filteredToursByCurrency.reduce((sum, item) => sum + (Number.parseFloat(item?.totalPrice?.toString() || '0') || 0), 0) / totalTours
      : 0

  // Para birimine göre toplam gelir
  const tourRevenueByCurrency = () => {
    const revenues = {}

    // Her para birimi için toplam geliri hesapla
    if (!filteredToursData || !Array.isArray(filteredToursData)) {
      console.error('filteredToursData geçerli bir dizi değil:', filteredToursData);
      return [];
    }

    // Para birimine göre filtrelenmiş tur verilerini kullan
    const toursToProcess = selectedCurrency === "all" 
      ? filteredToursData 
      : filteredToursData.filter(tour => tour && tour.currency === selectedCurrency);

    toursToProcess.forEach((tour) => {
      if (!tour) return;
      const currency = tour.currency || "TRY"
      const amount = Number.parseFloat(tour.totalPrice?.toString() || '0') || 0

      if (!revenues[currency]) {
        revenues[currency] = 0
      }

      revenues[currency] += amount
    })

    // Grafik için veri formatına dönüştür
    return Object.entries(revenues).map(([currency, amount]) => ({
      name: currency,
      value: amount,
      // Para birimi sembolü ve etiketini ekle
      symbol: currency === "TRY" ? "₺" : 
              currency === "USD" ? "$" : 
              currency === "EUR" ? "€" : 
              currency === "GBP" ? "£" : currency,
      label: currency === "TRY" ? "Türk Lirası" : 
             currency === "USD" ? "Amerikan Doları" : 
             currency === "EUR" ? "Euro" : 
             currency === "GBP" ? "İngiliz Sterlini" : currency
    }))
  }

  // Gelir kategorileri
  const incomeByCurrency = () => {
    const incomeData = {}

    filteredFinancialData
      .filter((item) => item.type === "income")
      .forEach((item) => {
        const currency = item.currency || "TRY"
        const amount = Number.parseFloat(item.amount) || 0

        if (!incomeData[currency]) {
          incomeData[currency] = 0
        }

        incomeData[currency] += amount
      })

    return Object.entries(incomeData).map(([currency, amount]) => ({
      name: currency,
      value: amount,
      // Para birimi sembolü ve etiketini ekle
      symbol: currency === "TRY" ? "₺" : 
              currency === "USD" ? "$" : 
              currency === "EUR" ? "€" : 
              currency === "GBP" ? "£" : currency,
      label: currency === "TRY" ? "Türk Lirası" : 
             currency === "USD" ? "Amerikan Doları" : 
             currency === "EUR" ? "Euro" : 
             currency === "GBP" ? "İngiliz Sterlini" : currency
    }))
  }
  // Gider kategorileri
  // Finansal ve tur giderlerini para birimine göre grupla
  const expenseByCurrency = () => {
    const expenseData = {}
      // Şirket giderleri
    filteredFinancialData
      .filter((item) => item && item.type === "expense" && !item.relatedTourId)
      .forEach((item) => {
        const currency = item.currency || "TRY"
        const amount = Number.parseFloat(item.amount) || 0
        if (!expenseData[currency]) {
          expenseData[currency] = 0
        }
        expenseData[currency] += amount
      });
      
    // Tur giderleri
    filteredToursData.forEach(tour => {
      if (!tour || !Array.isArray(tour.expenses)) return;
      tour.expenses.forEach(expense => {
        const currency = expense.currency || tour.currency || "TRY"
        const amount = Number.parseFloat(expense.amount) || 0
        if (!expenseData[currency]) {
          expenseData[currency] = 0
        }
        expenseData[currency] += amount
      });
    });
    
    return Object.entries(expenseData).map(([currency, amount]) => ({
      name: currency,
      value: amount,
    }))
  }

  // Gelir kategorileri
  const incomeByCategory = filteredFinancialData
    .filter((item) => item.type === "income")
    .reduce((acc, item) => {
      const category = item.category || "Diğer"
      if (!acc[category]) {
        acc[category] = 0
      }
      acc[category] += Number.parseFloat(item.amount) || 0
      return acc
    }, {})

  const incomeCategoryData = Object.entries(incomeByCategory).map(([name, value]) => ({
    name,
    value,
  }))
  // Gider kategorileri
  // Finansal ve tur giderlerini kategoriye göre grupla
  const expenseByCategory = () => {
    const categoryData = {};
      // Şirket giderleri
    filteredFinancialData
      .filter((item) => item && item.type === "expense" && !item.relatedTourId)
      .forEach(item => {
        const category = item.category || "Diğer"
        if (!categoryData[category]) {
          categoryData[category] = 0
        }
        categoryData[category] += Number.parseFloat(item.amount) || 0
      });
      
    // Tur giderleri - hepsini "Tur Gideri" kategorisinde topla
    let totalTourExpenses = 0;
    filteredToursData.forEach(tour => {
      if (!tour || !Array.isArray(tour.expenses)) return;
      tour.expenses.forEach(expense => {
        totalTourExpenses += Number.parseFloat(expense.amount) || 0;
      });
    });
    
    // Tur giderlerini ekle
    if (totalTourExpenses > 0) {
      categoryData["Tur Gideri"] = (categoryData["Tur Gideri"] || 0) + totalTourExpenses;
    }
    
    return Object.entries(categoryData).map(([name, value]) => ({
      name,
      value,
    }));
  };
  
  const expenseCategoryData = expenseByCategory();

  // Aylık gelir/gider trendi
  const getMonthlyData = () => {
    const monthlyData = {}

    // Son 12 ayı hazırla
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${month.getFullYear()}-${month.getMonth() + 1}`
      monthlyData[monthKey] = {
        name: month.toLocaleDateString("tr-TR", { month: "short", year: "numeric" }),
        income: 0,
        expense: 0,
        profit: 0,
        tours: 0,
      }
    }    // Finansal verileri ekle - gelirler ve şirket giderleri
    filteredFinancialData
      .filter(item => item && (item.type === "income" || (item.type === "expense" && !item.relatedTourId)))
      .forEach((item) => {
        const date = new Date(item.date)
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`

        if (monthlyData[monthKey]) {
          if (item.type === "income") {
            monthlyData[monthKey].income += Number.parseFloat(item.amount) || 0
          } else if (item.type === "expense") {
            monthlyData[monthKey].expense += Number.parseFloat(item.amount) || 0
          }
        }
      })
    
    // Tur verilerini ekle
    filteredToursData.forEach((tour) => {
      if (!tour || !tour.tourDate) return;
      const date = new Date(tour.tourDate)
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`

      if (monthlyData[monthKey]) {
        // Tur gelirini ekle
        const tourIncome = Number.parseFloat(tour.totalPrice) || 0
        monthlyData[monthKey].income += tourIncome
        
        // Tur giderlerini ekle
        if (Array.isArray(tour.expenses)) {
          const tourExpenses = tour.expenses.reduce(
            (sum, expense) => sum + (Number.parseFloat(expense.amount) || 0),
            0
          )
          monthlyData[monthKey].expense += tourExpenses
        }      }
    })
    
    // Kar hesaplamasını yapalım
    Object.keys(monthlyData).forEach(key => {
      monthlyData[key].profit = monthlyData[key].income - monthlyData[key].expense;
    })

    return Object.values(monthlyData)
  }

  const monthlyData = getMonthlyData()

  // Tur popülerliği
  const tourPopularity = filteredToursByCurrency.reduce((acc, item) => {
    const tourName = item.tourName || "Bilinmeyen Tur"
    if (!acc[tourName]) {
      acc[tourName] = {
        count: 0,
        customers: 0,
        revenue: 0,
      }
    }
    acc[tourName].count += 1
    acc[tourName].customers += Number.parseInt(item.numberOfPeople) || 0
    acc[tourName].revenue += Number.parseFloat(item.totalPrice) || 0
    return acc
  }, {})

  const tourPopularityData = Object.entries(tourPopularity)
    .map(([name, data]) => ({
      name,
      count: data.count,
      customers: data.customers,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5) // En popüler 5 tur

  // Grafik renkleri
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d", "#ffc658", "#8dd1e1"]

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[#2b3275]">Analiz</CardTitle>
        <div className="flex items-center gap-4">
          <Select defaultValue={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Dönem seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisWeek">Bu Hafta</SelectItem>
              <SelectItem value="thisMonth">Bu Ay</SelectItem>
              <SelectItem value="lastMonth">Geçen Ay</SelectItem>
              <SelectItem value="thisYear">Bu Yıl</SelectItem>
              <SelectItem value="allTime">Tüm Zamanlar</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Para birimi seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Para Birimleri</SelectItem>
              <SelectItem value="TRY">Türk Lirası (TRY)</SelectItem>
              <SelectItem value="USD">Amerikan Doları (USD)</SelectItem>
              <SelectItem value="EUR">Euro (EUR)</SelectItem>
              <SelectItem value="GBP">İngiliz Sterlini (GBP)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="financial">
          <TabsList className="mb-4">
            <TabsTrigger value="financial">Finansal Analiz</TabsTrigger>
            <TabsTrigger value="tours">Tur Analizi</TabsTrigger>
            <TabsTrigger value="currency">Para Birimi Analizi</TabsTrigger>
          </TabsList>

          <TabsContent value="financial">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome + tourIncome, selectedCurrency === "all" ? "TRY" : selectedCurrency)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Finansal: {formatCurrency(totalIncome, selectedCurrency === "all" ? "TRY" : selectedCurrency)} | Tur: {formatCurrency(tourIncome, selectedCurrency === "all" ? "TRY" : selectedCurrency)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tur Geliri</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-600">{formatCurrency(tourIncome, selectedCurrency === "all" ? "TRY" : selectedCurrency)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Gider</CardTitle>
                </CardHeader>                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense, selectedCurrency === "all" ? "TRY" : selectedCurrency)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Şirket: {formatCurrency(companyExpenses, selectedCurrency === "all" ? "TRY" : selectedCurrency)} | 
                    Tur: {formatCurrency(tourExpenses, selectedCurrency === "all" ? "TRY" : selectedCurrency)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Net Kar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(totalProfit, selectedCurrency === "all" ? "TRY" : selectedCurrency)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium mb-4">Aylık Gelir/Gider Trendi</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value, name, props) => {
                        if (name === "income") return `Gelir: ${value.toLocaleString("tr-TR")} ${selectedCurrency !== "all" ? selectedCurrency : "TRY"}`;
                        if (name === "expense") return `Gider: ${value.toLocaleString("tr-TR")} ${selectedCurrency !== "all" ? selectedCurrency : "TRY"}`;
                        if (name === "profit") return `Kar: ${value.toLocaleString("tr-TR")} ${selectedCurrency !== "all" ? selectedCurrency : "TRY"}`;
                        return `${value.toLocaleString("tr-TR")} ${selectedCurrency !== "all" ? selectedCurrency : "TRY"}`;
                      }} />
                      <Legend />
                      <Line type="monotone" dataKey="income" name="Gelir" stroke="#4ade80" strokeWidth={2} />
                      <Line type="monotone" dataKey="expense" name="Gider" stroke="#f87171" strokeWidth={2} />
                      <Line type="monotone" dataKey="profit" name="Kar" stroke="#60a5fa" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Gelir Dağılımı</h3>
                  <div className="h-[300px]">
                    {incomeCategoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={incomeCategoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {incomeCategoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name, props) => {
                          const currency = props?.payload?.symbol || "TRY";
                          return `${value.toLocaleString("tr-TR")} ${currency}`;
                        }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center border rounded-md bg-gray-50">
                        <p className="text-muted-foreground">Yeterli veri yok</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Gider Dağılımı</h3>
                  <div className="h-[300px]">
                    {expenseCategoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseCategoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {expenseCategoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name, props) => {
                          const currency = props?.payload?.symbol || "TRY";
                          return `${value.toLocaleString("tr-TR")} ${currency}`;
                        }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center border rounded-md bg-gray-50">
                        <p className="text-muted-foreground">Yeterli veri yok</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tours">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Tur Sayısı</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTours}</div>

