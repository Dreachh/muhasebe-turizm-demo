"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { BarChart2, DollarSign, Users, Calendar, Filter, Wallet, CalendarCheck } from "lucide-react"
import { CurrencyFinancialSummary } from "@/components/analytics/currency-financial-summary"
import { CustomerAnalytics } from "@/components/analytics/customer-analytics"
import { TourDetailedAnalytics } from "@/components/analytics/tour-detailed-analytics"
import { SupplierDebtAnalysis } from "@/components/analytics/supplier-debt-analysis"
import { ReservationAnalytics } from "@/components/analytics/reservation-analytics"
import { getDestinations } from "@/lib/db"
import { useToast } from "@/components/ui/use-toast"
import { DateRange } from "react-day-picker"

// Tür tanımlamaları (Type definitions)
type DataItem = {
  date?: string;
  tourDate?: string;
  [key: string]: any
};

type DestinationType = {
  id: string;
  name: string;
  country: string;
};

type EnhancedAnalyticsViewProps = {
  financialData: DataItem[];
  toursData: DataItem[];
  customersData: DataItem[];
  reservationsData?: DataItem[]; // Rezervasyon verileri için yeni prop
  reservationCariData?: DataItem[]; // Rezervasyon cari verileri için yeni prop
  onNavigate?: (view: string) => void; // Navigation prop eklendi
};

export function EnhancedAnalyticsView({ 
  financialData = [], 
  toursData = [], 
  customersData = [],
  reservationsData = [],
  reservationCariData = []
}: EnhancedAnalyticsViewProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("financial")
  const [selectedCurrency, setSelectedCurrency] = useState("all")
  const [destinations, setDestinations] = useState<DestinationType[]>([])
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1),
    to: new Date()
  })
  
  // Tarih filtresi aktif/pasif durumu için state
  const [isDateFilterActive, setIsDateFilterActive] = useState(false)
  
  // Filtrelenmiş veri state'leri
  const [filteredFinancialData, setFilteredFinancialData] = useState<DataItem[]>(financialData)
  const [filteredToursData, setFilteredToursData] = useState<DataItem[]>(toursData)
  const [filteredCustomersData, setFilteredCustomersData] = useState<DataItem[]>(customersData)
  const [filteredReservationsData, setFilteredReservationsData] = useState<DataItem[]>(reservationsData)
  const [filteredReservationCariData, setFilteredReservationCariData] = useState<DataItem[]>(reservationCariData)
  
  // Destinasyonları yükle
  useEffect(() => {
    const loadDestinations = async () => {
      try {
        // Önce localStorage'dan yüklemeyi dene
        const cachedDestinations = localStorage.getItem('destinations')
        if (cachedDestinations) {
          const parsedDestinations = JSON.parse(cachedDestinations)
          if (Array.isArray(parsedDestinations) && parsedDestinations.length > 0) {
            setDestinations(parsedDestinations)
            return
          }
        }
        
        // Veritabanından destinasyonları yükle
        const destinationsData = await getDestinations()
        if (Array.isArray(destinationsData) && destinationsData.length > 0) {
          setDestinations(destinationsData)
          // Önbelleğe kaydet
          localStorage.setItem('destinations', JSON.stringify(destinationsData))
        } else {
          // Varsayılan destinasyonlar
          const defaultDestinations: DestinationType[] = [
            { id: "default-dest-1", name: "Antalya", country: "Türkiye" },
            { id: "default-dest-2", name: "İstanbul", country: "Türkiye" },
            { id: "default-dest-3", name: "Kapadokya", country: "Türkiye" }
          ]
          setDestinations(defaultDestinations)
        }
      } catch (error) {
        console.error("Destinasyonlar yüklenirken hata:", error)
        toast({
          title: "Hata",
          description: "Destinasyon verileri yüklenemedi.",
          variant: "destructive",
        })
      }
    }
    
    loadDestinations()
  }, [toast])
  
  // Tarih aralığına göre veri filtreleme
  const filterDataByDateRange = (data: DataItem[]): DataItem[] => {
    if (!data || !Array.isArray(data)) return [];
    
    // Tarih filtresi aktif değilse tüm verileri döndür
    if (!isDateFilterActive) return data;
    
    // Tarih filtresinde geçerli bir aralık yoksa tüm verileri döndür
    if (!dateRange?.from || !dateRange?.to) return data;
    
    // Sadece tarih filtresi aktifse filtreleme yap
    return data.filter(item => {
      if (!item || (!item.date && !item.tourDate)) return false;
      
      const dateStr = item.date || item.tourDate;
      if (!dateStr) return false;
      
      const itemDate = new Date(dateStr.toString());
      if (dateRange.from && dateRange.to) {
        return itemDate >= dateRange.from && itemDate <= dateRange.to;
      }
      return true;
    });
  }
  
  // Tarih veya filtre durumu değiştiğinde yeniden filtreleme yap
  useEffect(() => {
    setFilteredFinancialData(filterDataByDateRange(financialData));
    setFilteredToursData(filterDataByDateRange(toursData));
    setFilteredCustomersData(filterDataByDateRange(customersData));
    setFilteredReservationsData(filterDataByDateRange(reservationsData));
    setFilteredReservationCariData(filterDataByDateRange(reservationCariData));
  }, [isDateFilterActive, dateRange, financialData, toursData, customersData, reservationsData, reservationCariData]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-[#00a1c6] flex items-center">
            <BarChart2 className="h-5 w-5 mr-2" />
            Gelişmiş Analiz
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Para Birimi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Para Birimleri</SelectItem>
                  <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
                  <SelectItem value="USD">Amerikan Doları ($)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                  <SelectItem value="GBP">İngiliz Sterlini (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="date-filter-checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={isDateFilterActive}
                  onChange={(e) => setIsDateFilterActive(e.target.checked)}
                />
                <label htmlFor="date-filter-checkbox" className="text-sm font-medium text-gray-600">
                  Tarih Filtresi Aktif
                </label>
              </div>
              <DatePickerWithRange
                date={dateRange}
                setDate={(date: DateRange | undefined) => {
                  if (date) {
                    setDateRange(date);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="financial">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Finansal Analiz
                  </TabsTrigger>
                  <TabsTrigger value="customers">
                    <Users className="h-4 w-4 mr-2" />
                    Müşteri Analizi
                  </TabsTrigger>
                  <TabsTrigger value="tours">
                    <Calendar className="h-4 w-4 mr-2" />
                    Tur Analizi
                  </TabsTrigger>
                  <TabsTrigger value="supplierDebt">
                    <Wallet className="h-4 w-4 mr-2" />
                    Tedarikçi Borç Analizi
                  </TabsTrigger>
                  <TabsTrigger value="reservations">
                    <CalendarCheck className="h-4 w-4 mr-2" />
                    Rezervasyon Analizleri
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="financial">
                <CurrencyFinancialSummary 
                  financialData={filteredFinancialData}
                  toursData={filteredToursData}
                  currency={selectedCurrency}
                />
              </TabsContent>

              <TabsContent value="customers">
                <CustomerAnalytics 
                  toursData={filteredToursData}
                />
              </TabsContent>

              <TabsContent value="tours">
                <TourDetailedAnalytics 
                  toursData={filteredToursData}
                  selectedCurrency={selectedCurrency}
                  destinations={destinations}
                />
              </TabsContent>

              <TabsContent value="supplierDebt">
                <SupplierDebtAnalysis 
                  selectedCurrency={selectedCurrency}
                  dateRange={isDateFilterActive ? dateRange : undefined}
                />
              </TabsContent>

              <TabsContent value="reservations">
                <ReservationAnalytics 
                  reservationsData={filteredReservationsData}
                  reservationCariData={filteredReservationCariData}
                  selectedCurrency={selectedCurrency}
                  dateRange={isDateFilterActive ? dateRange : undefined}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}