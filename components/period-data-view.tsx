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
          yearData.tourExpensesByCurrency.push({ amount: period.tourExpenses, currency });        }
      }
      
      yearData.totalTours += period.tourCount;
      yearData.totalCustomers += period.customerCount;
    });// Hesaplamalar ve ortalamalar
    yearlyMap.forEach((data, year) => {
      // Toplam değerleri para birimi gruplarından hesapla
      data.totalFinancialIncome = data.financialIncomeByCurrency.reduce((sum, group) => sum + group.amount, 0);
      data.totalTourIncome = data.tourIncomeByCurrency.reduce((sum, group) => sum + group.amount, 0);
      data.totalCompanyExpenses = data.companyExpensesByCurrency.reduce((sum, group) => sum + group.amount, 0);
      data.totalTourExpenses = data.tourExpensesByCurrency.reduce((sum, group) => sum + group.amount, 0);
      
      // Tüm gelirleri ve giderleri topla
      const totalIncome = data.totalFinancialIncome + data.totalTourIncome;
      const totalExpenses = data.totalCompanyExpenses + data.totalTourExpenses;
      data.totalNetProfit = totalIncome - totalExpenses;
      data.averageRevenuePerTour = data.totalTours > 0 ? totalIncome / data.totalTours : 0
      data.averageRevenuePerCustomer = data.totalCustomers > 0 ? totalIncome / data.totalCustomers : 0
    })

    return Array.from(yearlyMap.entries()).map(([year, data]) => ({      year,
      ...data
    })).sort((a, b) => b.year - a.year);
  };
  
  const calculateNetProfit = (period: PeriodData) => {
    // Para birimi bazlı hesaplama: tüm gelirleri ve giderleri topla
    let totalIncome = 0;
    let totalExpenses = 0;
    
    // Finansal gelirler
    if (period.financialIncomeByCurrency && period.financialIncomeByCurrency.length > 0) {
      totalIncome += period.financialIncomeByCurrency.reduce((sum, group) => sum + group.amount, 0);
    } else {
      totalIncome += period.financialIncome || 0;
    }
    
    // Tur gelirleri
    if (period.tourIncomeByCurrency && period.tourIncomeByCurrency.length > 0) {
      totalIncome += period.tourIncomeByCurrency.reduce((sum, group) => sum + group.amount, 0);
    } else {
      totalIncome += period.tourIncome || 0;
    }
    
    // Şirket giderleri
    if (period.companyExpensesByCurrency && period.companyExpensesByCurrency.length > 0) {
      totalExpenses += period.companyExpensesByCurrency.reduce((sum, group) => sum + group.amount, 0);
    } else {
      totalExpenses += period.companyExpenses || 0;
    }
    
    // Tur giderleri
    if (period.tourExpensesByCurrency && period.tourExpensesByCurrency.length > 0) {
      totalExpenses += period.tourExpensesByCurrency.reduce((sum, group) => sum + group.amount, 0);
    } else {
      totalExpenses += period.tourExpenses || 0;
    }
      return totalIncome - totalExpenses;
  };

  // Para birimi bazlı net kar/zarar hesaplama
  const calculateNetProfitByCurrency = (period: PeriodData) => {
    const netProfitByCurrency: Record<string, number> = {};
    
    // Tüm para birimlerini topla
    const allCurrencies = new Set<string>();
    
    // Gelir para birimlerini ekle
    period.financialIncomeByCurrency?.forEach(group => allCurrencies.add(group.currency));
    period.tourIncomeByCurrency?.forEach(group => allCurrencies.add(group.currency));
    
    // Gider para birimlerini ekle
    period.companyExpensesByCurrency?.forEach(group => allCurrencies.add(group.currency));
    period.tourExpensesByCurrency?.forEach(group => allCurrencies.add(group.currency));
    
    // Eski veri formatı için varsayılan para birimlerini ekle
    if (!period.financialIncomeByCurrency && period.financialIncome > 0) {
      allCurrencies.add(period.financialIncomeCurrency || 'TRY');
    }
    if (!period.tourIncomeByCurrency && period.tourIncome > 0) {
      allCurrencies.add(period.tourIncomeCurrency || 'TRY');
    }
    if (!period.companyExpensesByCurrency && period.companyExpenses > 0) {
      allCurrencies.add(period.companyExpensesCurrency || 'TRY');
    }
    if (!period.tourExpensesByCurrency && period.tourExpenses > 0) {
      allCurrencies.add(period.tourExpensesCurrency || 'TRY');
    }
    
    // Her para birimi için kar/zarar hesapla
    allCurrencies.forEach(currency => {
      let income = 0;
      let expenses = 0;
      
      // Gelirler
      income += period.financialIncomeByCurrency?.find(g => g.currency === currency)?.amount || 0;
      income += period.tourIncomeByCurrency?.find(g => g.currency === currency)?.amount || 0;
      
      // Eski format için
      if (!period.financialIncomeByCurrency && (period.financialIncomeCurrency || 'TRY') === currency) {
        income += period.financialIncome || 0;
      }
      if (!period.tourIncomeByCurrency && (period.tourIncomeCurrency || 'TRY') === currency) {
        income += period.tourIncome || 0;
      }
      
      // Giderler
      expenses += period.companyExpensesByCurrency?.find(g => g.currency === currency)?.amount || 0;
      expenses += period.tourExpensesByCurrency?.find(g => g.currency === currency)?.amount || 0;
      
      // Eski format için
      if (!period.companyExpensesByCurrency && (period.companyExpensesCurrency || 'TRY') === currency) {
        expenses += period.companyExpenses || 0;
      }
      if (!period.tourExpensesByCurrency && (period.tourExpensesCurrency || 'TRY') === currency) {
        expenses += period.tourExpenses || 0;
      }
      
      const profit = income - expenses;
      if (Math.abs(profit) > 0.01) {
        netProfitByCurrency[currency] = profit;
      }
    });
    
    return netProfitByCurrency;
  };
    const calculateProfitMargin = (period: PeriodData) => {
    // Para birimi bazlı toplam gelir hesapla
    let totalRevenue = 0;
    
    // Finansal gelirler
    if (period.financialIncomeByCurrency && period.financialIncomeByCurrency.length > 0) {
      totalRevenue += period.financialIncomeByCurrency.reduce((sum, group) => sum + group.amount, 0);
    } else {
      totalRevenue += period.financialIncome || 0;
    }
    
    // Tur gelirleri
    if (period.tourIncomeByCurrency && period.tourIncomeByCurrency.length > 0) {
      totalRevenue += period.tourIncomeByCurrency.reduce((sum, group) => sum + group.amount, 0);
    } else {
      totalRevenue += period.tourIncome || 0;
    }
    
    if (totalRevenue === 0) return 0;
    return (calculateNetProfit(period) / totalRevenue) * 100;
  };

  // Para birimi bazlı kar marjı hesaplama
  const calculateProfitMarginByCurrency = (period: PeriodData) => {
    const netProfitByCurrency = calculateNetProfitByCurrency(period);
    const marginByCurrency: Record<string, number> = {};
    
    Object.entries(netProfitByCurrency).forEach(([currency, profit]) => {
      // Bu para birimindeki toplam geliri hesapla
      let revenue = 0;
      
      revenue += period.financialIncomeByCurrency?.find(g => g.currency === currency)?.amount || 0;
      revenue += period.tourIncomeByCurrency?.find(g => g.currency === currency)?.amount || 0;
      
      // Eski format için
      if (!period.financialIncomeByCurrency && (period.financialIncomeCurrency || 'TRY') === currency) {
        revenue += period.financialIncome || 0;
      }
      if (!period.tourIncomeByCurrency && (period.tourIncomeCurrency || 'TRY') === currency) {
        revenue += period.tourIncome || 0;
      }
      
      if (revenue > 0) {
        marginByCurrency[currency] = (profit / revenue) * 100;
      }
    });
    
    return marginByCurrency;
  };

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
      ) : (        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const filteredData = getFilteredPeriods()
              
              // Para birimi bazlı toplamları hesapla
              const totalIncomeByCurrency: Record<string, number> = {};
              const totalExpensesByCurrency: Record<string, number> = {};
              
              filteredData.forEach(period => {
                // Gelirler
                if (period.financialIncomeByCurrency) {
                  period.financialIncomeByCurrency.forEach(group => {
                    totalIncomeByCurrency[group.currency] = (totalIncomeByCurrency[group.currency] || 0) + group.amount;
                  });
                }
                if (period.tourIncomeByCurrency) {
                  period.tourIncomeByCurrency.forEach(group => {
                    totalIncomeByCurrency[group.currency] = (totalIncomeByCurrency[group.currency] || 0) + group.amount;
                  });
                }
                
                // Giderler
                if (period.companyExpensesByCurrency) {
                  period.companyExpensesByCurrency.forEach(group => {
                    totalExpensesByCurrency[group.currency] = (totalExpensesByCurrency[group.currency] || 0) + group.amount;
                  });
                }
                if (period.tourExpensesByCurrency) {
                  period.tourExpensesByCurrency.forEach(group => {
                    totalExpensesByCurrency[group.currency] = (totalExpensesByCurrency[group.currency] || 0) + group.amount;
                  });
                }
              });
              
              // Net kar hesapla (para birimi bazlı)
              const netProfitByCurrency: Record<string, number> = {};
              const allCurrencies = new Set([...Object.keys(totalIncomeByCurrency), ...Object.keys(totalExpensesByCurrency)]);
              
              allCurrencies.forEach(currency => {
                const income = totalIncomeByCurrency[currency] || 0;
                const expense = totalExpensesByCurrency[currency] || 0;
                const profit = income - expense;
                if (Math.abs(profit) > 0.01) {
                  netProfitByCurrency[currency] = profit;
                }
              });
              
              const totalTours = filteredData.reduce((sum, p) => sum + p.tourCount, 0)
              
              return (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold text-green-600">
                        {Object.keys(totalIncomeByCurrency).length > 0 ? (
                          Object.entries(totalIncomeByCurrency).map(([currency, amount]) => (
                            <div key={`income-${currency}`} className="mb-1">
                              {formatCurrency(amount, currency)}
                            </div>
                          ))
                        ) : (
                          <div>{formatCurrency(0, "TRY")}</div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {filteredData.length} dönem toplamı
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Toplam Gider</CardTitle>
                      <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold text-red-600">
                        {Object.keys(totalExpensesByCurrency).length > 0 ? (
                          Object.entries(totalExpensesByCurrency).map(([currency, amount]) => (
                            <div key={`expense-${currency}`} className="mb-1">
                              {formatCurrency(amount, currency)}
                            </div>
                          ))
                        ) : (
                          <div>{formatCurrency(0, "TRY")}</div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Şirket + Tur giderleri
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Net Kar/Zarar</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold">                        {Object.keys(netProfitByCurrency).length > 0 ? (
                          Object.entries(netProfitByCurrency).map(([currency, profit]) => (
                            <div key={`profit-${currency}`} className={`mb-1 ${getProfitColor(profit)}`}>
                              {formatCurrency(profit, currency)}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-600">{formatCurrency(0, "TRY")}</div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Para birimi bazlı kar/zarar
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
                        Toplam {totalTours} tur
                      </p>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Aylık Mali Performans Detayları
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Farklı para birimlerindeki gelir/giderler orijinal para birimleriyle gösterilir. Net kar/zarar TRY cinsinden hesaplanır.
                </p>
              </CardHeader>              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="h-16 bg-gray-50">
                        <TableHead className="text-center font-bold text-sm w-24 border-r p-4">Dönem</TableHead>
                        <TableHead className="text-center font-bold text-sm w-32 border-r p-4">Finansal Gelir</TableHead>
                        <TableHead className="text-center font-bold text-sm w-32 border-r p-4">Tur Geliri</TableHead>
                        <TableHead className="text-center font-bold text-sm w-32 border-r p-4">Şirket Giderleri</TableHead>
                        <TableHead className="text-center font-bold text-sm w-32 border-r p-4">Tur Giderleri</TableHead>
                        <TableHead className="text-center font-bold text-sm w-36 border-r p-4">Net Kar/Zarar</TableHead>
                        <TableHead className="text-center font-bold text-sm w-24 border-r p-4">Kar Marjı</TableHead>
                        <TableHead className="text-center font-bold text-sm w-24 border-r p-4">Tur Sayısı</TableHead>
                        <TableHead className="text-center font-bold text-sm w-28 border-r p-4">Müşteri Sayısı</TableHead>
                        <TableHead className="text-center font-bold text-sm w-20 border-r p-4">Durum</TableHead>
                        <TableHead className="text-center font-bold text-sm w-20 p-4">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getMonthlyData().map((period) => {
                        const netProfit = calculateNetProfit(period)
                        const netProfitByCurrency = calculateNetProfitByCurrency(period)
                        const profitMargin = calculateProfitMargin(period)
                        
                        return (
                          <TableRow key={period.id} className="hover:bg-muted/50 h-16">
                            <TableCell className="text-center p-4 border-r">
                              <div className="font-semibold text-sm">{getMonthName(period.month)}</div>
                              <div className="text-xs text-muted-foreground">{period.year}</div>
                            </TableCell>
                            <TableCell className="text-right p-4 border-r">
                              <div className="text-green-700 font-medium">
                                {period.financialIncomeByCurrency && period.financialIncomeByCurrency.length > 0 ? (
                                  period.financialIncomeByCurrency.map((group, idx) => (
                                    <div key={idx} className="text-sm">{formatCurrency(group.amount, group.currency)}</div>
                                  ))
                                ) : (
                                  <div className="text-sm">{formatCurrency(period.financialIncome, period.financialIncomeCurrency || 'TRY')}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right p-4 border-r">
                              <div className="text-blue-700 font-medium">
                                {period.tourIncomeByCurrency && period.tourIncomeByCurrency.length > 0 ? (
                                  period.tourIncomeByCurrency.map((group, idx) => (
                                    <div key={idx} className="text-sm">{formatCurrency(group.amount, group.currency)}</div>
                                  ))
                                ) : (
                                  <div className="text-sm">{formatCurrency(period.tourIncome, period.tourIncomeCurrency || 'TRY')}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right p-4 border-r">
                              <div className="text-red-700 font-medium">
                                {period.companyExpensesByCurrency && period.companyExpensesByCurrency.length > 0 ? (
                                  period.companyExpensesByCurrency.map((group, idx) => (
                                    <div key={idx} className="text-sm">{formatCurrency(group.amount, group.currency)}</div>
                                  ))
                                ) : (
                                  <div className="text-sm">{formatCurrency(period.companyExpenses, period.companyExpensesCurrency || 'TRY')}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right p-4 border-r">
                              <div className="text-orange-700 font-medium">
                                {period.tourExpensesByCurrency && period.tourExpensesByCurrency.length > 0 ? (
                                  period.tourExpensesByCurrency.map((group, idx) => (
                                    <div key={idx} className="text-sm">{formatCurrency(group.amount, group.currency)}</div>
                                  ))
                                ) : (
                                  <div className="text-sm">{formatCurrency(period.tourExpenses, period.tourExpensesCurrency || 'TRY')}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right p-4 border-r">
                              <div className="font-bold">
                                {Object.keys(netProfitByCurrency).length > 0 ? (
                                  Object.entries(netProfitByCurrency).map(([currency, profit]) => (
                                    <div key={`profit-${currency}`} className={`flex items-center justify-end gap-2 text-sm ${getProfitColor(profit)}`}>
                                      {profit > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                      {formatCurrency(profit, currency)}
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
                                    <TrendingDown className="h-4 w-4" />
                                    {formatCurrency(0, 'TRY')}
                                  </div>
                                )}                              </div>
                            </TableCell>
                            <TableCell className="text-center p-4 border-r">
                              <div className="font-medium">
                                {(() => {
                                  const profitMarginByCurrency = calculateProfitMarginByCurrency(period);
                                  return Object.keys(profitMarginByCurrency).length > 0 ? (
                                    Object.entries(profitMarginByCurrency).map(([currency, margin]) => (
                                      <div key={`margin-${currency}`} className={`text-sm ${getProfitColor(margin)}`}>
                                        %{margin.toFixed(1)}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm text-gray-600">%0.0</div>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-center p-4 border-r">
                              <div className="flex items-center justify-center gap-2">
                                <Plane className="h-4 w-4 text-blue-500" />
                                <span className="font-medium text-sm">{period.tourCount}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center p-4 border-r">
                              <div className="flex items-center justify-center gap-2">
                                <Users className="h-4 w-4 text-green-500" />
                                <span className="font-medium text-sm">{period.customerCount}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center p-4 border-r">
                              <Badge variant={period.status === "active" ? "default" : "secondary"} className="text-xs">
                                {period.status === "active" ? "Aktif" : "Kapalı"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center p-4">
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
          </TabsContent>
          {/* Yearly View */}
          <TabsContent value="yearly" className="space-y-6">
            <Card>
              <CardHeader>                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Yıllık Mali Performans Özeti
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Farklı para birimlerindeki gelir/giderler orijinal para birimleriyle gösterilir. Net kar/zarar TRY cinsinden hesaplanır.
                </p>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow className="h-16 bg-gray-50">
                        <TableHead className="text-center font-bold text-sm w-20 border-r p-4">Yıl</TableHead>
                        <TableHead className="text-center font-bold text-sm w-32 border-r p-4">Finansal Gelir</TableHead>
                        <TableHead className="text-center font-bold text-sm w-32 border-r p-4">Tur Geliri</TableHead>
                        <TableHead className="text-center font-bold text-sm w-32 border-r p-4">Şirket Giderleri</TableHead>
                        <TableHead className="text-center font-bold text-sm w-32 border-r p-4">Tur Giderleri</TableHead>
                        <TableHead className="text-center font-bold text-sm w-36 border-r p-4">Net Yıllık Kar</TableHead>
                        <TableHead className="text-center font-bold text-sm w-24 border-r p-4">Toplam Tur</TableHead>
                        <TableHead className="text-center font-bold text-sm w-28 border-r p-4">Toplam Müşteri</TableHead>
                        <TableHead className="text-center font-bold text-sm w-20 p-4">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getYearlyData().map((yearData) => (
                        <TableRow key={yearData.year} className="hover:bg-muted/50 h-16">
                          <TableCell className="text-center p-4 border-r">
                            <div className="font-bold text-lg">{yearData.year}</div>
                          </TableCell>
                          <TableCell className="text-right p-4 border-r">
                            <div className="text-green-700 font-medium">
                              {yearData.financialIncomeByCurrency.length > 0 ? (
                                yearData.financialIncomeByCurrency.map((group, idx) => (
                                  <div key={idx} className="text-sm">{formatCurrency(group.amount, group.currency)}</div>
                                ))
                              ) : (
                                <div className="text-sm text-gray-500">-</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right p-4 border-r">
                            <div className="text-blue-700 font-medium">
                              {yearData.tourIncomeByCurrency.length > 0 ? (
                                yearData.tourIncomeByCurrency.map((group, idx) => (
                                  <div key={idx} className="text-sm">{formatCurrency(group.amount, group.currency)}</div>
                                ))
                              ) : (
                                <div className="text-sm text-gray-500">-</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right p-4 border-r">
                            <div className="text-red-700 font-medium">
                              {yearData.companyExpensesByCurrency.length > 0 ? (
                                yearData.companyExpensesByCurrency.map((group, idx) => (
                                  <div key={idx} className="text-sm">{formatCurrency(group.amount, group.currency)}</div>
                                ))
                              ) : (
                                <div className="text-sm text-gray-500">-</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right p-4 border-r">
                            <div className="text-orange-700 font-medium">
                              {yearData.tourExpensesByCurrency.length > 0 ? (
                                yearData.tourExpensesByCurrency.map((group, idx) => (
                                  <div key={idx} className="text-sm">{formatCurrency(group.amount, group.currency)}</div>
                                ))
                              ) : (
                                <div className="text-sm text-gray-500">-</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right p-4 border-r">
                            <div className="font-bold">
                              {(() => {
                                // Para birimi bazlı net kar/zarar hesapla
                                const netProfitByCurrency: Record<string, number> = {};
                                
                                // Tüm para birimlerini topla
                                const allCurrencies = new Set<string>();
                                yearData.financialIncomeByCurrency.forEach(group => allCurrencies.add(group.currency));
                                yearData.tourIncomeByCurrency.forEach(group => allCurrencies.add(group.currency));
                                yearData.companyExpensesByCurrency.forEach(group => allCurrencies.add(group.currency));
                                yearData.tourExpensesByCurrency.forEach(group => allCurrencies.add(group.currency));
                                
                                // Her para birimi için kar/zarar hesapla
                                allCurrencies.forEach(currency => {
                                  const income = 
                                    (yearData.financialIncomeByCurrency.find(g => g.currency === currency)?.amount || 0) +
                                    (yearData.tourIncomeByCurrency.find(g => g.currency === currency)?.amount || 0);
                                  const expenses = 
                                    (yearData.companyExpensesByCurrency.find(g => g.currency === currency)?.amount || 0) +
                                    (yearData.tourExpensesByCurrency.find(g => g.currency === currency)?.amount || 0);
                                  
                                  if (income > 0 || expenses > 0) {
                                    netProfitByCurrency[currency] = income - expenses;
                                  }
                                });
                                
                                return Object.keys(netProfitByCurrency).length > 0 ? (
                                  Object.entries(netProfitByCurrency).map(([currency, profit]) => (
                                    <div key={`yearly-profit-${currency}`} className={`flex items-center justify-end gap-2 text-sm ${getProfitColor(profit)}`}>
                                      {profit > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                      {formatCurrency(profit, currency)}
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
                                    <TrendingDown className="h-4 w-4" />
                                    {formatCurrency(0, 'TRY')}
                                  </div>
                                );
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="text-center p-4 border-r">
                            <div className="flex items-center justify-center gap-2">
                              <Plane className="h-4 w-4 text-blue-500" />
                              <span className="font-medium text-sm">{yearData.totalTours}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center p-4 border-r">
                            <div className="flex items-center justify-center gap-2">
                              <Users className="h-4 w-4 text-green-500" />
                              <span className="font-medium text-sm">{yearData.totalCustomers}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center p-4">
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
          </TabsContent>
        </Tabs>
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