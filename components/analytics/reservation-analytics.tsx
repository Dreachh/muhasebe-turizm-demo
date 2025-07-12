"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Users, MapPin, Building2, CreditCard } from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts"

// Grafik renkleri
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d", "#ffc658", "#8dd1e1"]

// Tür tanımlamaları
interface Reservation {
  id?: string;
  turTarihi?: string | Date;
  destinasyon?: string;
  destinationName?: string;
  firma?: string;
  odemeDurumu?: string;
  toplamTutar?: string | number;
  odemeMiktari?: string | number;
  tutar?: string | number;
  paraBirimi?: string;
  yetiskinSayisi?: string | number;
  cocukSayisi?: string | number;
  bebekSayisi?: string | number;
  musteriAdiSoyadi?: string;
  telefon?: string;
  alisYeri?: string;
  alisSaati?: string;
  kayitTarihi?: string | Date;
  seriNumarasi?: string;
  [key: string]: any;
}

interface ReservationCari {
  id?: string;
  companyName?: string;
  firma?: string;
  totalDebt?: number;
  totalPayment?: number;
  balance?: number;
  [key: string]: any;
}

interface ReservationAnalyticsProps {
  reservationsData: Reservation[];
  reservationCariData?: ReservationCari[];
  selectedCurrency: string;
  dateRange?: any;
}

export function ReservationAnalytics({ 
  reservationsData = [], 
  reservationCariData = [],
  selectedCurrency,
  dateRange 
}: ReservationAnalyticsProps) {

  // Para birimi formatı
  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = {
      'TRY': '₺',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };
    return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${symbols[currency] || currency}`;
  };

  // Para birimi bazlı gruplandırma
  const getAmountsByCurrency = (reservations: Reservation[]) => {
    const currencyAmounts: Record<string, number> = {};
    
    reservations.forEach(reservation => {
      const currency = reservation.paraBirimi || "TRY";
      const amount = Number(reservation.toplamTutar || reservation.tutar) || 0;
      currencyAmounts[currency] = (currencyAmounts[currency] || 0) + amount;
    });
    
    return currencyAmounts;
  };

  // Toplam rezervasyon sayısı
  const getTotalReservations = () => reservationsData.length;

  // Toplam katılımcı sayısı
  const getTotalParticipants = () => {
    return reservationsData.reduce((total, reservation) => {
      const yetiskin = Number(reservation.yetiskinSayisi) || 0;
      const cocuk = Number(reservation.cocukSayisi) || 0;
      const bebek = Number(reservation.bebekSayisi) || 0;
      return total + yetiskin + cocuk + bebek;
    }, 0);
  };

  // Destinasyon bazlı rezervasyon dağılımı
  const getDestinationData = () => {
    const destinationMap: Record<string, { count: number, revenueByCurrency: Record<string, number>, participants: number }> = {};
    
    reservationsData.forEach(reservation => {
      const destination = reservation.destinationName || reservation.destinasyon || "Belirtilmemiş";
      const amount = Number(reservation.toplamTutar || reservation.tutar) || 0;
      const currency = reservation.paraBirimi || "TRY";
      const participants = (Number(reservation.yetiskinSayisi) || 0) + 
                          (Number(reservation.cocukSayisi) || 0) + 
                          (Number(reservation.bebekSayisi) || 0);
      
      if (!destinationMap[destination]) {
        destinationMap[destination] = { count: 0, revenueByCurrency: {}, participants: 0 };
      }
      
      destinationMap[destination].count += 1;
      destinationMap[destination].revenueByCurrency[currency] = (destinationMap[destination].revenueByCurrency[currency] || 0) + amount;
      destinationMap[destination].participants += participants;
    });

    return Object.entries(destinationMap)
      .map(([name, data]) => ({
        name,
        rezervasyonSayisi: data.count,
        gelirDetay: data.revenueByCurrency,
        katilimci: data.participants
      }))
      .sort((a, b) => b.rezervasyonSayisi - a.rezervasyonSayisi);
  };

  // Ödeme durumu dağılımı
  const getPaymentStatusData = () => {
    const statusMap: Record<string, number> = {};
    
    reservationsData.forEach(reservation => {
      const status = reservation.odemeDurumu || "Belirtilmemiş";
      statusMap[status] = (statusMap[status] || 0) + 1;
    });

    return Object.entries(statusMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  // Acenteler bazlı analiz
  const getAgencyData = () => {
    const agencyMap: Record<string, { count: number, revenueByCurrency: Record<string, number>, participants: number }> = {};
    
    reservationsData.forEach(reservation => {
      const agency = reservation.firma || "Bireysel";
      const amount = Number(reservation.toplamTutar || reservation.tutar) || 0;
      const currency = reservation.paraBirimi || "TRY";
      const participants = (Number(reservation.yetiskinSayisi) || 0) + 
                          (Number(reservation.cocukSayisi) || 0) + 
                          (Number(reservation.bebekSayisi) || 0);
      
      if (!agencyMap[agency]) {
        agencyMap[agency] = { count: 0, revenueByCurrency: {}, participants: 0 };
      }
      
      agencyMap[agency].count += 1;
      agencyMap[agency].revenueByCurrency[currency] = (agencyMap[agency].revenueByCurrency[currency] || 0) + amount;
      agencyMap[agency].participants += participants;
    });

    return Object.entries(agencyMap)
      .map(([name, data]) => ({
        name,
        rezervasyonSayisi: data.count,
        gelirDetay: data.revenueByCurrency,
        katilimci: data.participants
      }))
      .sort((a, b) => b.rezervasyonSayisi - a.rezervasyonSayisi);
  };

  // Aylık rezervasyon trendi
  const getMonthlyTrend = () => {
    const monthMap: Record<string, { count: number, revenueByCurrency: Record<string, number> }> = {};
    
    reservationsData.forEach(reservation => {
      const date = new Date(reservation.turTarihi || reservation.kayitTarihi || new Date());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = Number(reservation.toplamTutar || reservation.tutar) || 0;
      const currency = reservation.paraBirimi || "TRY";
      
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { count: 0, revenueByCurrency: {} };
      }
      
      monthMap[monthKey].count += 1;
      monthMap[monthKey].revenueByCurrency[currency] = (monthMap[monthKey].revenueByCurrency[currency] || 0) + amount;
    });

    return Object.entries(monthMap)
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        const date = new Date(Number(year), Number(month) - 1);
        const monthName = date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
        
        return {
          ay: monthName,
          rezervasyonSayisi: data.count,
          gelirDetay: data.revenueByCurrency
        };
      })
      .sort((a, b) => a.ay.localeCompare(b.ay));
  };

  // Alış yeri dağılımı
  const getPickupLocationData = () => {
    const locationMap: Record<string, number> = {};
    
    reservationsData.forEach(reservation => {
      const location = reservation.alisYeri || "Belirtilmemiş";
      locationMap[location] = (locationMap[location] || 0) + 1;
    });

    return Object.entries(locationMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  // Para birimi dağılımı
  const getCurrencyData = () => {
    const currencyMap: Record<string, { count: number, amount: number }> = {};
    
    reservationsData.forEach(reservation => {
      const currency = reservation.paraBirimi || "TRY";
      const amount = Number(reservation.toplamTutar || reservation.tutar) || 0;
      
      if (!currencyMap[currency]) {
        currencyMap[currency] = { count: 0, amount: 0 };
      }
      
      currencyMap[currency].count += 1;
      currencyMap[currency].amount += amount;
    });

    return Object.entries(currencyMap)
      .map(([name, data]) => ({
        name,
        rezervasyonSayisi: data.count,
        toplamTutar: data.amount
      }))
      .sort((a, b) => b.rezervasyonSayisi - a.rezervasyonSayisi);
  };

  // Rezervasyon cari analizi
  const getCariAnalysis = () => {
    if (!reservationCariData.length) return null;

    // Rezervasyon verilerinden para birimi bilgisini al ve carilerle eşleştir
    const cariCurrencyMap: Record<string, string> = {};
    
    // Rezervasyon verilerinden cari - para birimi eşleştirmesi yap
    reservationsData.forEach(reservation => {
      const firma = reservation.firma;
      const currency = reservation.paraBirimi || "TRY";
      if (firma && !cariCurrencyMap[firma]) {
        cariCurrencyMap[firma] = currency;
      }
    });

    // Tek bir cari listesi oluştur, her birinde kendi para birimi bilgisiyle
    const cariList = reservationCariData.map(cari => {
      const firmaName = cari.companyName || cari.firma || "Bilinmeyen";
      const currency = cariCurrencyMap[firmaName] || "TRY";
      
      return {
        firma: firmaName,
        totalDebt: cari.totalDebt || 0,
        totalPayment: cari.totalPayment || 0,
        balance: cari.balance || 0,
        paraBirimi: currency
      };
    });

    // Borç en yüksekten düşüğe sırala
    const sortedCariList = cariList.sort((a, b) => b.balance - a.balance);

    // Genel toplam bilgileri (para birimi bazında)
    const totals: Record<string, { totalDebt: number; totalPayment: number; totalBalance: number; count: number }> = {};
    
    cariList.forEach(cari => {
      if (!totals[cari.paraBirimi]) {
        totals[cari.paraBirimi] = { totalDebt: 0, totalPayment: 0, totalBalance: 0, count: 0 };
      }
      totals[cari.paraBirimi].totalDebt += cari.totalDebt;
      totals[cari.paraBirimi].totalPayment += cari.totalPayment;
      totals[cari.paraBirimi].totalBalance += cari.balance;
      totals[cari.paraBirimi].count += 1;
    });

    return {
      cariList: sortedCariList,
      totals: totals
    };
  };

  const destinationData = getDestinationData();
  const paymentStatusData = getPaymentStatusData();
  const agencyData = getAgencyData();
  const monthlyTrend = getMonthlyTrend();
  const pickupLocationData = getPickupLocationData();
  const currencyData = getCurrencyData();
  const cariAnalysis = getCariAnalysis();

  return (
    <div className="space-y-6">
      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CalendarDays className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Rezervasyon</p>
                <p className="text-2xl font-bold">{getTotalReservations()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Katılımcı</p>
                <p className="text-2xl font-bold">{getTotalParticipants()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Destinasyon Sayısı</p>
                <p className="text-2xl font-bold">{destinationData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Acenta Sayısı</p>
                <p className="text-2xl font-bold">{agencyData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="destinations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="destinations">Destinasyonlar</TabsTrigger>
          <TabsTrigger value="agencies">Acenteler</TabsTrigger>
          <TabsTrigger value="payments">Ödemeler</TabsTrigger>
          <TabsTrigger value="trends">Trendler</TabsTrigger>
          <TabsTrigger value="locations">Alış Yerleri</TabsTrigger>
          <TabsTrigger value="cari">Cari Analiz</TabsTrigger>
        </TabsList>

        {/* Destinasyon Analizi */}
        <TabsContent value="destinations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#00a1c6]">Destinasyon Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={destinationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="rezervasyonSayisi"
                    >
                      {destinationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#00a1c6]">Destinasyon Detay Tablosu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {destinationData.map((dest, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                      <div>
                        <p className="font-medium text-lg">{dest.name}</p>
                        <p className="text-sm text-gray-600">{dest.katilimci} katılımcı</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="mb-2">{dest.rezervasyonSayisi} rezervasyon</Badge>
                        <div className="text-sm space-y-1">
                          <p className="font-medium text-gray-700">Toplam Gelir:</p>
                          {Object.entries(dest.gelirDetay).map(([currency, amount]) => (
                            <p key={currency} className="text-gray-600">
                              {formatCurrency(amount, currency)}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Acenta Analizi */}
        <TabsContent value="agencies" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#00a1c6]">Acenta Performansı</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={agencyData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="rezervasyonSayisi" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#00a1c6]">Acenta Detay Tablosu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {agencyData.map((agency, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                      <div>
                        <p className="font-medium text-lg">{agency.name}</p>
                        <p className="text-sm text-gray-600">{agency.katilimci} katılımcı</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="mb-2">{agency.rezervasyonSayisi} rezervasyon</Badge>
                        <div className="text-sm space-y-1">
                          <p className="font-medium text-gray-700">Toplam Gelir:</p>
                          {Object.entries(agency.gelirDetay).map(([currency, amount]) => (
                            <p key={currency} className="text-gray-600">
                              {formatCurrency(amount, currency)}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Ödeme Analizi */}
        <TabsContent value="payments" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#00a1c6]">Ödeme Durumu Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#00a1c6]">Para Birimi Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currencyData.map((currency, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="font-medium">{currency.name}</span>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="mb-1">{currency.rezervasyonSayisi} rezervasyon</Badge>
                        <p className="text-sm font-medium text-green-600">
                          {formatCurrency(currency.toplamTutar, currency.name)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trend Analizi */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#00a1c6]">Aylık Rezervasyon Trendi</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ay" />
                  <YAxis />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded shadow">
                            <p className="font-medium">{label}</p>
                            <p className="text-blue-600">
                              Rezervasyon: {data.rezervasyonSayisi}
                            </p>
                            <div className="mt-2">
                              <p className="font-medium text-sm">Gelir Detayı:</p>
                              {Object.entries(data.gelirDetay).map(([currency, amount]) => (
                                <p key={currency} className="text-green-600 text-sm">
                                  {formatCurrency(amount as number, currency)}
                                </p>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="rezervasyonSayisi" 
                    stroke="#0088FE" 
                    fill="#0088FE" 
                    fillOpacity={0.3}
                    name="Rezervasyon Sayısı"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alış Yeri Analizi */}
        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#00a1c6]">Alış Yeri Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pickupLocationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {pickupLocationData.map((location, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <p className="font-medium">{location.name}</p>
                      <Badge variant="secondary">{location.value} rezervasyon</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cari Analizi */}
        <TabsContent value="cari" className="space-y-4">
          {cariAnalysis && cariAnalysis.cariList && cariAnalysis.cariList.length > 0 ? (
            <div className="space-y-6">
              {/* Özet Bilgiler - Para Birimi Bazında */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(cariAnalysis.totals).map(([currency, totals]) => (
                  <Card key={currency}>
                    <CardHeader>
                      <CardTitle className="text-[#00a1c6] text-sm">
                        {currency} Özeti
                        <Badge variant="outline" className="ml-2">{totals.count} cari</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Toplam Borç:</span>
                        <span className="text-red-600 font-bold">
                          {formatCurrency(totals.totalDebt, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Toplam Ödeme:</span>
                        <span className="text-green-600 font-bold">
                          {formatCurrency(totals.totalPayment, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Genel Bakiye:</span>
                        <span className={`font-bold ${totals.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(totals.totalBalance), currency)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Cari Detay Tablosu */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#00a1c6]">Cari Detay Listesi</CardTitle>
                  <p className="text-sm text-gray-600">Toplam {cariAnalysis.cariList.length} cari kaydı</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {cariAnalysis.cariList.map((cari, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded border hover:bg-gray-100">
                        <div>
                          <p className="font-medium text-lg">{cari.firma}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center">
                              Para Birimi: 
                              <Badge variant="outline" className="ml-1 text-xs">{cari.paraBirimi}</Badge>
                            </span>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-sm">
                            <span className="text-red-600">Borç: {formatCurrency(cari.totalDebt, cari.paraBirimi)}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-green-600">Ödeme: {formatCurrency(cari.totalPayment, cari.paraBirimi)}</span>
                          </div>
                          <div className="text-sm font-bold">
                            <span className={cari.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                              Bakiye: {formatCurrency(Math.abs(cari.balance), cari.paraBirimi)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Cari Verisi Bulunamadı</h3>
                <p className="text-gray-600">Rezervasyon cari verileri henüz yüklenemedi.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
