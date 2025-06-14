"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "recharts"

// Grafik renkleri
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d", "#ffc658", "#8dd1e1"]

// CustomerAnalytics bileşeni için tür tanımı
interface Tour {
  id?: string;
  nationality?: string;
  referralSource?: string;
  tourDate?: string | Date;
  tourName?: string;
  destination?: string; 
  destinationId?: string;
  [key: string]: any; // Diğer özellikleri de kabul etmek için
}

interface CustomerAnalyticsProps {
  toursData: Tour[];
}

// Ay veri tipi
interface MonthData {
  name: string;
  customers: number;
}

export function CustomerAnalytics({ toursData }: CustomerAnalyticsProps) {
  // Müşteri vatandaşlık/ülke dağılımı
  const getCustomerNationalityData = () => {
    const nationalityData: Record<string, number> = {};
    
    toursData.forEach((tour: Tour) => {
      if (!tour) return;
      
      // Müşteri sayısını doğru hesapla: Ana müşteri + ek katılımcılar
      let customerCount = 1; // Ana müşteri
      
      // Ek katılımcıları say
      if (tour.additionalCustomers && Array.isArray(tour.additionalCustomers)) {
        customerCount += tour.additionalCustomers.length;
      }
      
      // Alternatif olarak numberOfPeople alanını da kontrol et
      const numberOfPeople = Number(tour.numberOfPeople) || 0;
      if (numberOfPeople > customerCount) {
        customerCount = numberOfPeople; // numberOfPeople daha büyükse onu kullan
      }
      
      // Doğru alan adını kullan (nationality)
      const nationality = tour.nationality || "Belirtilmemiş";
      if (!nationalityData[nationality]) {
        nationalityData[nationality] = 0;
      }
      nationalityData[nationality] += customerCount;
    });
    
    return Object.entries(nationalityData)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Referans kaynağı dağılımı
  const getReferralSourceData = () => {
    const referralData: Record<string, number> = {};
    
    toursData.forEach((tour: Tour) => {
      if (!tour) return;
      let source = tour.referralSource || "Belirtilmemiş";

    // İngilizce referans kaynaklarını Türkçeye çevirme (tüm olasılıklar)
    const referralSourceMap: Record<string, string> = {
      website: "İnternet Sitemiz",
      hotel: "Otel Yönlendirmesi",
      local_guide: "Hanutçu / Yerel Rehber",
      walk_in: "Kapı Önü Müşterisi",
      repeat: "Tekrar Gelen Müşteri",
      recommendation: "Tavsiye",
      social_media: "Sosyal Medya",
      other: "Diğer"
    };
    // Eğer anahtar haritada yoksa, olduğu gibi bırak

    if (referralSourceMap[source]) {
      source = referralSourceMap[source];
    }

    // Müşteri sayısını doğru hesapla: Ana müşteri + ek katılımcılar
    let customerCount = 1; // Ana müşteri
    
    // Ek katılımcıları say
    if (tour.additionalCustomers && Array.isArray(tour.additionalCustomers)) {
      customerCount += tour.additionalCustomers.length;
    }
    
    // Alternatif olarak numberOfPeople alanını da kontrol et
    const numberOfPeople = Number(tour.numberOfPeople) || 0;
    if (numberOfPeople > customerCount) {
      customerCount = numberOfPeople; // numberOfPeople daha büyükse onu kullan
    }

    if (!referralData[source]) {
      referralData[source] = 0;
    }
    referralData[source] += customerCount;
      
      // Ek müşteriler için referans kaynağı artık dahil edilmiyor
      // Kullanıcı isteğine göre ek yolcular analiz kısmında gösterilmeyecek
    });
    
    return Object.entries(referralData)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Toplam müşteri sayısı hesaplama
  const getTotalCustomers = () => {
    return toursData.reduce((total, tour) => {
      if (!tour) return total;
      
      // Müşteri sayısını doğru hesapla: Ana müşteri + ek katılımcılar
      let customerCount = 1; // Ana müşteri
      
      // Ek katılımcıları say
      if (tour.additionalCustomers && Array.isArray(tour.additionalCustomers)) {
        customerCount += tour.additionalCustomers.length;
      }
      
      // Alternatif olarak numberOfPeople alanını da kontrol et
      const numberOfPeople = Number(tour.numberOfPeople) || 0;
      if (numberOfPeople > customerCount) {
        customerCount = numberOfPeople; // numberOfPeople daha büyükse onu kullan
      }
      
      return total + customerCount;
    }, 0);
  };

  // Aylara göre müşteri dağılımı
  const getCustomersByMonth = () => {
    const monthlyData: Record<string, MonthData> = {};
    
    // Son 12 ayı hazırla
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${month.getFullYear()}-${month.getMonth() + 1}`;
      monthlyData[monthKey] = {
        name: month.toLocaleDateString("tr-TR", { month: "short", year: "numeric" }),
        customers: 0,
      };
    }
    
    // Müşteri verilerini ekle
    toursData.forEach(tour => {
      if (!tour || !tour.tourDate) return;
      
      try {
        const date = new Date(tour.tourDate);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        
        if (monthlyData[monthKey]) {
          // Müşteri sayısını doğru hesapla: Ana müşteri + ek katılımcılar
          let customerCount = 1; // Ana müşteri
          
          // Ek katılımcıları say
          if (tour.additionalCustomers && Array.isArray(tour.additionalCustomers)) {
            customerCount += tour.additionalCustomers.length;
          }
          
          // Alternatif olarak numberOfPeople alanını da kontrol et
          const numberOfPeople = Number(tour.numberOfPeople) || 0;
          if (numberOfPeople > customerCount) {
            customerCount = numberOfPeople; // numberOfPeople daha büyükse onu kullan
          }
          
          monthlyData[monthKey].customers += customerCount;
        }
      } catch (e) {
        console.error('Tarih dönüştürme hatası:', e);
      }
    });
    
    return Object.values(monthlyData);
  };

  const nationalityData = getCustomerNationalityData();
  const referralSourceData = getReferralSourceData();
  const totalCustomers = getTotalCustomers();
  const customersByMonth = getCustomersByMonth();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Müşteri Analizi</h2>
        <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
          Toplam Müşteri: {totalCustomers}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Müşteri Vatandaşlık/Ülke Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {nationalityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={nationalityData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {nationalityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} müşteri`, 'Müşteri Sayısı']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center border rounded-md bg-gray-50">
                  <p className="text-muted-foreground">Yeterli veri yok</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Müşteri Referans Kaynakları</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {referralSourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={referralSourceData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {referralSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} müşteri`, 'Müşteri Sayısı']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center border rounded-md bg-gray-50">
                  <p className="text-muted-foreground">Yeterli veri yok</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Aylara Göre Müşteri Dağılımı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {customersByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customersByMonth} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} müşteri`, 'Müşteri Sayısı']} />
                  <Legend />
                  <Bar dataKey="customers" name="Müşteri Sayısı" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center border rounded-md bg-gray-50">
                <p className="text-muted-foreground">Yeterli veri yok</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
