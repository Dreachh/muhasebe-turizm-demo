"use client";

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BarChart2, Calendar, TrendingUp, TrendingDown, DollarSign, Users, Plane, Building, RefreshCw, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/data-utils"
import { getPeriods, PeriodData, recalculatePeriods, deletePeriod } from "@/lib/period-service"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface CurrencyGroup {
  amount: number;
  currency: string;
}

interface PeriodSummary {
  totalFinancialIncome: number
  financialIncomeByCurrency: CurrencyGroup[]
  totalTourIncome: number
  tourIncomeByCurrency: CurrencyGroup[]
  totalCompanyExpenses: number
  companyExpensesByCurrency: CurrencyGroup[]
  totalTourExpenses: number
  tourExpensesByCurrency: CurrencyGroup[]
  totalNetProfit: number
  totalTours: number
  totalCustomers: number
  averageRevenuePerTour: number
  averageRevenuePerCustomer: number
}

export function PeriodDataView() {
  const [periods, setPeriods] = useState<PeriodData[]>([])
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'period' | 'year';
    id?: string;
    year?: number;
    title: string;
    description: string;
  }>({
    isOpen: false,
    type: 'period',
    title: '',
    description: ''
  })// Dönem verilerini yeniden hesapla
  const handleRecalculatePeriods = async () => {
    try {
      setIsRecalculating(true)
      const recalculatedData = await recalculatePeriods()
      setPeriods(recalculatedData || [])
      showSuccessToast("Dönem verileri başarıyla yeniden hesaplandı")
    } catch (error) {
      console.error("Dönem verileri yeniden hesaplanırken hata:", error)
      showErrorToast("Dönem verileri hesaplanırken bir hata oluştu")
    } finally {
      setIsRecalculating(false)
    }
  }  // Dönem silme fonksiyonu
  const handleDeletePeriod = (periodId: string, periodName: string) => {
    setDeleteDialog({
      isOpen: true,
      type: 'period',
      id: periodId,
      title: 'Dönem Silme Onayı',
      description: `"${periodName}" dönemini silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz ve dönem ile ilgili tüm veriler kalıcı olarak silinecektir.`
    })
  }
  // Yıl silme fonksiyonu
  const handleDeleteYear = (year: number) => {
    const yearPeriods = periods.filter(period => period.year === year)
    setDeleteDialog({
      isOpen: true,
      type: 'year',
      year: year,
      title: 'Yıl Silme Onayı',
      description: `${year} yılına ait tüm dönemleri silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz ve ${year} yılındaki toplam ${yearPeriods.length} aylık dönem kalıcı olarak silinecektir.`
    })
  }

  // Silme işlemini onayla
  const confirmDelete = async () => {
    try {
      if (deleteDialog.type === 'period' && deleteDialog.id) {
        await deletePeriod(deleteDialog.id)
        const updatedPeriods = periods.filter(period => period.id !== deleteDialog.id)
        setPeriods(updatedPeriods)
        showSuccessToast('Dönem başarıyla silindi')
      } else if (deleteDialog.type === 'year' && deleteDialog.year) {
        const yearPeriods = periods.filter(period => period.year === deleteDialog.year)
        for (const period of yearPeriods) {
          await deletePeriod(period.id)
        }
        const updatedPeriods = periods.filter(period => period.year !== deleteDialog.year)
        setPeriods(updatedPeriods)
        showSuccessToast(`${deleteDialog.year} yılına ait tüm dönemler başarıyla silindi`)
      }
    } catch (error) {
      console.error("Silme işlemi sırasında hata:", error)
      showErrorToast("Silme işlemi sırasında bir hata oluştu")
    } finally {
      setDeleteDialog({ isOpen: false, type: 'period', title: '', description: '' })
    }
  }
  useEffect(() => {
    const loadPeriods = async () => {
      try {
        setLoading(true)
        const data = await getPeriods()
        
        // Eğer veri yoksa dönem verilerini yeniden hesapla
        if (!data || data.length === 0) {
          setIsRecalculating(true)
          try {
            const recalculatedData = await recalculatePeriods()
            setPeriods(recalculatedData || [])
          } catch (recalcError) {
            console.error("Dönem verileri yeniden hesaplanırken hata:", recalcError)
            setPeriods([])
          } finally {
            setIsRecalculating(false)
          }
        } else {
          setPeriods(data)
        }
      } catch (error) {
        console.error("Dönem verileri yüklenirken hata:", error)
        setPeriods([])
      } finally {
        setLoading(false)
      }
    }

    loadPeriods()
  }, [])

  const getFilteredPeriods = () => {
    if (selectedYear === "all") return periods
    return periods.filter(p => p.year.toString() === selectedYear)
  }
  const getMonthlyData = () => {
    const filtered = getFilteredPeriods()
    return filtered.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })
  }
  const getYearlyData = () => {
    const yearlyMap = new Map<number, PeriodSummary>()
    
    periods.forEach(period => {
      const year = period.year
      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, {
          totalFinancialIncome: 0,
          financialIncomeByCurrency: [],
          totalTourIncome: 0,
          tourIncomeByCurrency: [],
          totalCompanyExpenses: 0,
          companyExpensesByCurrency: [],
          totalTourExpenses: 0,
          tourExpensesByCurrency: [],
          totalNetProfit: 0,
          totalTours: 0,
          totalCustomers: 0,
          averageRevenuePerTour: 0,
          averageRevenuePerCustomer: 0
        })
      }
      
      const yearData = yearlyMap.get(year)!
      
      // Yeni para birimi gruplarını kullan, yoksa eski alanları kullan
      if (period.financialIncomeByCurrency && period.financialIncomeByCurrency.length > 0) {
        period.financialIncomeByCurrency.forEach(group => {
          const existingGroup = yearData.financialIncomeByCurrency.find(g => g.currency === group.currency);
          if (existingGroup) {
            existingGroup.amount += group.amount;
          } else {
            yearData.financialIncomeByCurrency.push({ amount: group.amount, currency: group.currency });
          }
        });
      } else if (period.financialIncome > 0) {
        const currency = period.financialIncomeCurrency || 'TRY';
        const existingGroup = yearData.financialIncomeByCurrency.find(g => g.currency === currency);
        if (existingGroup) {
          existingGroup.amount += period.financialIncome;
        } else {
          yearData.financialIncomeByCurrency.push({ amount: period.financialIncome, currency });
        }
      }
      
      // Tur gelirleri için para birimi gruplaması
      if (period.tourIncomeByCurrency && period.tourIncomeByCurrency.length > 0) {
        period.tourIncomeByCurrency.forEach(group => {
          const existingGroup = yearData.tourIncomeByCurrency.find(g => g.currency === group.currency);
          if (existingGroup) {
            existingGroup.amount += group.amount;
          } else {
            yearData.tourIncomeByCurrency.push({ amount: group.amount, currency: group.currency });
          }
        });
      } else if (period.tourIncome > 0) {
        const currency = period.tourIncomeCurrency || 'TRY';
        const existingGroup = yearData.tourIncomeByCurrency.find(g => g.currency === currency);
        if (existingGroup) {
          existingGroup.amount += period.tourIncome;
        } else {
          yearData.tourIncomeByCurrency.push({ amount: period.tourIncome, currency });
        }
      }
      
      // Şirket giderleri için para birimi gruplaması
      if (period.companyExpensesByCurrency && period.companyExpensesByCurrency.length > 0) {
        period.companyExpensesByCurrency.forEach(group => {
          const existingGroup = yearData.companyExpensesByCurrency.find(g => g.currency === group.currency);
          if (existingGroup) {
            existingGroup.amount += group.amount;
          } else {
            yearData.companyExpensesByCurrency.push({ amount: group.amount, currency: group.currency });
          }
        });
      } else if (period.companyExpenses > 0) {
        const currency = period.companyExpensesCurrency || 'TRY';
        const existingGroup = yearData.companyExpensesByCurrency.find(g => g.currency === currency);
        if (existingGroup) {
          existingGroup.amount += period.companyExpenses;
        } else {
          yearData.companyExpensesByCurrency.push({ amount: period.companyExpenses, currency });
        }
      }
      
      // Tur giderleri için para birimi gruplaması
      if (period.tourExpensesByCurrency && period.tourExpensesByCurrency.length > 0) {
        period.tourExpensesByCurrency.forEach(group => {
          const existingGroup = yearData.tourExpensesByCurrency.find(g => g.currency === group.currency);
          if (existingGroup) {
            existingGroup.amount += group.amount;
          } else {
            yearData.tourExpensesByCurrency.push({ amount: group.amount, currency: group.currency });
          }
        });
      } else if (period.tourExpenses > 0) {
        const currency = period.tourExpensesCurrency || 'TRY';
        const existingGroup = yearData.tourExpensesByCurrency.find(g => g.currency === currency);
        if (existingGroup) {
          existingGroup.amount += period.tourExpenses;
        } else {
          yearData.tourExpensesByCurrency.push({ amount: period.tourExpenses, currency });
        }
      }
      
      // TRY cinsinden toplam değerleri hesapla
      if (period.totalIncomeInTRY !== undefined) {
        yearData.totalFinancialIncome += period.totalIncomeInTRY;
      } else {
        yearData.totalFinancialIncome += period.financialIncome;
      }
      
      yearData.totalTours += period.tourCount
      yearData.totalCustomers += period.customerCount
    })

    // Hesaplamalar ve ortalamalar
    yearlyMap.forEach((data, year) => {
      data.totalNetProfit = data.totalFinancialIncome - (data.totalCompanyExpenses + data.totalTourExpenses)
      data.averageRevenuePerTour = data.totalTours > 0 ? data.totalFinancialIncome / data.totalTours : 0
      data.averageRevenuePerCustomer = data.totalCustomers > 0 ? data.totalFinancialIncome / data.totalCustomers : 0
    })

    return Array.from(yearlyMap.entries()).map(([year, data]) => ({
      year,
      ...data
    })).sort((a, b) => b.year - a.year)
  }
  const calculateNetProfit = (period: PeriodData) => {
    // Eğer TRY cinsinden toplam değerler varsa onları kullan
    if (period.totalIncomeInTRY !== undefined && period.totalExpensesInTRY !== undefined) {
      return period.totalIncomeInTRY - period.totalExpensesInTRY;
    } 
    // Yoksa eski hesaplama yöntemini kullan
    return (period.financialIncome + period.tourIncome) - (period.companyExpenses + period.tourExpenses)
  }

  const calculateProfitMargin = (period: PeriodData) => {
    // Eğer TRY cinsinden toplam gelir varsa onu kullan
    const totalRevenue = period.totalIncomeInTRY !== undefined ? 
      period.totalIncomeInTRY : 
      (period.financialIncome + period.tourIncome);
    
    if (totalRevenue === 0) return 0;
    return (calculateNetProfit(period) / totalRevenue) * 100;
  }

  const getMonthName = (month: number) => {
    const months = [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ]
    return months[month - 1]
  }

  const getAvailableYears = () => {
    const years = [...new Set(periods.map(p => p.year))].sort((a, b) => b - a)
    return years
  }

  const getProfitColor = (profit: number) => {
    if (profit > 0) return "text-green-600"
    if (profit < 0) return "text-red-600"
    return "text-gray-600"
  }
  if (loading || isRecalculating) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              {isRecalculating ? "Dönem verileri hesaplanıyor..." : "Dönem verileri yükleniyor..."}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart2 className="h-8 w-8" />
            Dönem Verileri Analizi
          </h1>
          <p className="text-muted-foreground mt-1">Detaylı mali performans değerlendirmesi ve dönemsel karşılaştırma</p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleRecalculatePeriods}
            disabled={isRecalculating}
            variant="default" 
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            {isRecalculating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Hesaplanıyor...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Verileri Güncelle
              </>
            )}
          </Button>
          
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Yıl Filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Dönemler</SelectItem>
              {getAvailableYears().map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year} Yılı
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}      {periods.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-40">
            <div className="text-center">
              <BarChart2 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground font-medium">Henüz dönem verisi bulunmuyor</p>
              <p className="text-sm text-muted-foreground mb-4">Finansal veriler ve turlar kayıtlı olduğunda dönem analizi görüntülenecektir</p>
              <Button 
                onClick={handleRecalculatePeriods}
                disabled={isRecalculating}
                variant="default"
                className="w-auto bg-green-600 hover:bg-green-700"
              >
                {isRecalculating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Hesaplanıyor...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Verileri Güncelle
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const filteredData = getFilteredPeriods()
              // TRY cinsinden toplam gelir ve giderleri hesapla
              const totalRevenue = filteredData.reduce((sum, p) => sum + (p.totalIncomeInTRY !== undefined ? p.totalIncomeInTRY : (p.financialIncome + p.tourIncome)), 0)
              const totalExpenses = filteredData.reduce((sum, p) => sum + (p.totalExpensesInTRY !== undefined ? p.totalExpensesInTRY : (p.companyExpenses + p.tourExpenses)), 0)
              const totalProfit = totalRevenue - totalExpenses
              const totalTours = filteredData.reduce((sum, p) => sum + p.tourCount, 0)
              
              return (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue, "TRY")}</div>
                      <p className="text-xs text-muted-foreground">
                        {filteredData.length} dönem toplamı (TRY)
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Toplam Gider</CardTitle>
                      <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses, "TRY")}</div>
                      <p className="text-xs text-muted-foreground">
                        Şirket + Tur giderleri (TRY)
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Net Kar</CardTitle>
                      {totalProfit > 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${getProfitColor(totalProfit)}`}>
                        {formatCurrency(totalProfit, "TRY")}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Kar marjı: %{totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0'}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Toplam Tur</CardTitle>
                      <Plane className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{totalTours}</div>
                      <p className="text-xs text-muted-foreground">
                        Tur başına ort.: {totalTours > 0 ? formatCurrency(totalRevenue / totalTours) : '₺0'}
                      </p>
                    </CardContent>
                  </Card>
                </>
              )            })()}
          </div>
          {/* Alttaki tekrarlayan Dönem Verilerini Yenile butonu kaldırıldı */}
        </>
      )}

      {/* Tab Navigation - Sadece veri varsa göster */}
      {periods.length > 0 && (
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Aylık Detay Görünümü
            </TabsTrigger>
            <TabsTrigger value="yearly" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Yıllık Özet Analizi
            </TabsTrigger>
          </TabsList>

          {/* Monthly View */}
          <TabsContent value="monthly" className="space-y-6">
            <Card>              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Aylık Mali Performans Detayları
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Farklı para birimlerindeki gelir/giderler orijinal para birimleriyle gösterilir. Net kar/zarar TRY cinsinden hesaplanır.
                </p>
              </CardHeader>              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Dönem</TableHead>
                        <TableHead className="font-semibold">Finansal Gelir</TableHead>
                        <TableHead className="font-semibold">Tur Geliri</TableHead>
                        <TableHead className="font-semibold">Şirket Giderleri</TableHead>
                        <TableHead className="font-semibold">Tur Giderleri</TableHead>
                        <TableHead className="font-semibold">Net Kar/Zarar</TableHead>
                        <TableHead className="font-semibold">Kar Marjı</TableHead>
                        <TableHead className="font-semibold">Tur Sayısı</TableHead>
                        <TableHead className="font-semibold">Müşteri Sayısı</TableHead>
                        <TableHead className="font-semibold">Durum</TableHead>
                        <TableHead className="font-semibold">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getMonthlyData().map((period) => {
                        const netProfit = calculateNetProfit(period)
                        const profitMargin = calculateProfitMargin(period)
                        
                        return (
                          <TableRow key={period.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{getMonthName(period.month)} {period.year}</TableCell>
                            <TableCell className="text-green-700 font-medium">
                              {period.financialIncomeByCurrency && period.financialIncomeByCurrency.length > 0 ? (
                                period.financialIncomeByCurrency.map((group, idx) => (
                                  <div key={idx} className="mb-1">{formatCurrency(group.amount, group.currency)}</div>
                                ))
                              ) : (
                                formatCurrency(period.financialIncome, period.financialIncomeCurrency || 'TRY')
                              )}
                            </TableCell>
                            <TableCell className="text-blue-700 font-medium">
                              {period.tourIncomeByCurrency && period.tourIncomeByCurrency.length > 0 ? (
                                period.tourIncomeByCurrency.map((group, idx) => (
                                  <div key={idx} className="mb-1">{formatCurrency(group.amount, group.currency)}</div>
                                ))
                              ) : (
                                formatCurrency(period.tourIncome, period.tourIncomeCurrency || 'TRY')
                              )}
                            </TableCell>
                            <TableCell className="text-red-700 font-medium">
                              {period.companyExpensesByCurrency && period.companyExpensesByCurrency.length > 0 ? (
                                period.companyExpensesByCurrency.map((group, idx) => (
                                  <div key={idx} className="mb-1">{formatCurrency(group.amount, group.currency)}</div>
                                ))
                              ) : (
                                formatCurrency(period.companyExpenses, period.companyExpensesCurrency || 'TRY')
                              )}
                            </TableCell>
                            <TableCell className="text-orange-700 font-medium">
                              {period.tourExpensesByCurrency && period.tourExpensesByCurrency.length > 0 ? (
                                period.tourExpensesByCurrency.map((group, idx) => (
                                  <div key={idx} className="mb-1">{formatCurrency(group.amount, group.currency)}</div>
                                ))
                              ) : (
                                formatCurrency(period.tourExpenses, period.tourExpensesCurrency || 'TRY')
                              )}
                            </TableCell>
                            <TableCell className={`font-bold ${getProfitColor(netProfit)}`}>
                              <div className="flex items-center gap-1">
                                {netProfit > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                {formatCurrency(netProfit, 'TRY')}
                              </div>
                            </TableCell>
                            <TableCell className={`font-medium ${getProfitColor(netProfit)}`}>%{profitMargin.toFixed(1)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Plane className="h-4 w-4 text-blue-500" />
                                <span className="font-medium">{period.tourCount}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-green-500" />
                                <span className="font-medium">{period.customerCount}</span>
                              </div>                            </TableCell>
                            <TableCell>
                              <Badge variant={period.status === "active" ? "default" : "secondary"}>
                                {period.status === "active" ? "Aktif Dönem" : "Kapalı Dönem"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePeriod(period.id, `${getMonthName(period.month)} ${period.year}`)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Dönem Sil</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>          {/* Yearly View */}          <TabsContent value="yearly" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Yıllık Mali Performans Özeti
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Farklı para birimlerindeki gelir/giderler orijinal para birimleriyle gösterilir. Net kar/zarar TRY cinsinden hesaplanır.
                </p>
              </CardHeader>              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Yıl</TableHead>
                        <TableHead className="font-semibold">Finansal Gelir</TableHead>
                        <TableHead className="font-semibold">Tur Geliri</TableHead>
                        <TableHead className="font-semibold">Şirket Giderleri</TableHead>
                        <TableHead className="font-semibold">Tur Giderleri</TableHead>
                        <TableHead className="font-semibold">Net Yıllık Kar</TableHead>
                        <TableHead className="font-semibold">Toplam Tur</TableHead>
                        <TableHead className="font-semibold">Toplam Müşteri</TableHead>
                        <TableHead className="font-semibold">Tur Başına Ort.</TableHead>
                        <TableHead className="font-semibold">Müşteri Başına Ort.</TableHead>
                        <TableHead className="font-semibold">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getYearlyData().map((yearData) => (
                        <TableRow key={yearData.year} className="hover:bg-muted/50">
                          <TableCell className="font-bold text-lg">{yearData.year}</TableCell>
                          <TableCell className="text-green-700 font-medium">
                            {yearData.financialIncomeByCurrency.map((group, idx) => (
                              <div key={idx} className="mb-1">{formatCurrency(group.amount, group.currency)}</div>
                            ))}
                          </TableCell>
                          <TableCell className="text-blue-700 font-medium">
                            {yearData.tourIncomeByCurrency.map((group, idx) => (
                              <div key={idx} className="mb-1">{formatCurrency(group.amount, group.currency)}</div>
                            ))}
                          </TableCell>
                          <TableCell className="text-red-700 font-medium">
                            {yearData.companyExpensesByCurrency.map((group, idx) => (
                              <div key={idx} className="mb-1">{formatCurrency(group.amount, group.currency)}</div>
                            ))}
                          </TableCell>
                          <TableCell className="text-orange-700 font-medium">
                            {yearData.tourExpensesByCurrency.map((group, idx) => (
                              <div key={idx} className="mb-1">{formatCurrency(group.amount, group.currency)}</div>
                            ))}
                          </TableCell>
                          <TableCell className={`font-bold ${getProfitColor(yearData.totalNetProfit)}`}>
                            <div className="flex items-center gap-1">
                              {yearData.totalNetProfit > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                              {formatCurrency(yearData.totalNetProfit, "TRY")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Plane className="h-4 w-4 text-blue-500" />
                              <span className="font-bold">{yearData.totalTours}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-green-500" />
                              <span className="font-bold">{yearData.totalCustomers}</span>                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-blue-600">{formatCurrency(yearData.averageRevenuePerTour, "TRY")}</TableCell>
                          <TableCell className="font-medium text-green-600">{formatCurrency(yearData.averageRevenuePerCustomer, "TRY")}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteYear(yearData.year)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Yıl Sil</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>        </Tabs>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => 
        setDeleteDialog(prev => ({ ...prev, isOpen: open }))
      }>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              {deleteDialog.title}
            </DialogTitle>
            <DialogDescription className="text-gray-700 whitespace-pre-line">
              {deleteDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialog(prev => ({ ...prev, isOpen: false }))}
            >
              İptal
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}