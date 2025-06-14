"use client"

import { forwardRef } from "react"
import { formatCurrency, formatDate } from "@/lib/data-utils"

// Analiz verileri için basit yazdırılabilir rapor bileşeni (grafik olmadan)
export const AnalyticsSimplePrint = forwardRef(({ 
  financialData,
  toursData,
  customersData,
  dateRange = {},
  selectedCurrency = "all",
  companyInfo = {},
  nationalityData = [],
  referralSourceData = [],
  toursByDestination = [],
  toursByMonth = [],
  currencySummaries = {}
}, ref) => {
  // Tarih aralığı metni
  const getDateRangeText = () => {
    if (dateRange.from && dateRange.to) {
      return `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
    }
    return "Tüm Zamanlar"
  }

  // Para birimi metni
  const getCurrencyText = (selectedCurrency: string) => {
    switch (selectedCurrency) {
      case "all": return "Tüm Para Birimleri";
      case "TRY": return "Türk Lirası (TRY)";
      case "USD": return "Amerikan Doları (USD)";
      case "EUR": return "Euro (EUR)";
      case "GBP": return "İngiliz Sterlini (GBP)";
      default: return selectedCurrency;
    }
  };

  // Finansal özet hesaplama
  const calculateFinancialSummary = () => {
    const summary = {
      income: 0,
      expense: 0,
      tourIncome: 0,
      tourExpenses: 0,
      profit: 0,
      totalIncome: 0,
      totalProfit: 0,
      balance: 0,
      currencyBreakdown: {}
    };

    // Para birimine göre filtreleme fonksiyonu
    const filterByCurrency = (item) => {
      if (selectedCurrency === 'all') return true;
      return item && item.currency === selectedCurrency;
    };

    // Finansal verileri işle
    financialData.forEach(item => {
      if (!item || !filterByCurrency(item)) return;
      
      const amount = Number(item.amount) || 0;
      const currency = item.currency || "TRY";
      
      // Para birimi bazında özet
      if (!summary.currencyBreakdown[currency]) {
        summary.currencyBreakdown[currency] = {
          income: 0,
          expense: 0,
          balance: 0
        };
      }
      
      if (item.type === "income") {
        summary.income += amount;
        summary.currencyBreakdown[currency].income += amount;
      } else if (item.type === "expense") {
        summary.expense += amount;
        summary.currencyBreakdown[currency].expense += amount;
            // Tur gideri kategorisi
        // Not: Tur giderleri artık finansal kayıtlardaki "Tur Gideri" kategorisi ile takip ediliyor
        if (item.category === "Tur Gideri") {
          summary.tourExpenses += amount;
        }
      }
    });
    
    // Tur gelirlerini işle
    toursData.forEach(tour => {
      if (!tour || !filterByCurrency(tour)) return;
      
      const amount = Number(tour.totalPrice) || 0;
      const currency = tour.currency || "TRY";
      
      summary.tourIncome += amount;
      
      // Para birimi bazında özet
      if (!summary.currencyBreakdown[currency]) {
        summary.currencyBreakdown[currency] = {
          income: 0,
          expense: 0,
          balance: 0,
          tourIncome: 0
        };
      }
      
      summary.currencyBreakdown[currency].tourIncome = (summary.currencyBreakdown[currency].tourIncome || 0) + amount;
    });
      // Toplam değerleri hesapla
    summary.totalIncome = summary.income + summary.tourIncome;
    summary.profit = summary.income - summary.expense;
    
    // Net kar/zarar hesaplaması (Toplam gelir - Toplam gider)
    // Not: Tur giderleri zaten finansal kayıtlarda bulunduğundan, toplam gidere tekrar eklenmeyecektir
    summary.totalProfit = summary.totalIncome - summary.expense;
    summary.balance = summary.totalProfit;
    
    // Para birimi bazında bakiyeleri hesapla
    Object.keys(summary.currencyBreakdown).forEach(currency => {
      const currData = summary.currencyBreakdown[currency];
      currData.tourIncome = currData.tourIncome || 0;
      currData.balance = (currData.income + currData.tourIncome) - currData.expense;
    });
    
    return summary;
  };

  // Tur istatistikleri hesaplama
  const calculateTourStatistics = () => {
    const stats = {
      totalTours: toursData.length,
      totalCustomers: 0,
      averagePrice: 0,
      paymentStatusBreakdown: {
        paid: 0,
        partial: 0,
        pending: 0
      },
      popularDestinations: {},
      monthlyDistribution: {}
    };
    
    let totalPrice = 0;
    let validPriceCount = 0;
      toursData.forEach(tour => {
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
      
      // Müşteri sayısı
      stats.totalCustomers += customerCount;
      
      // Ödeme durumu
      if (tour.paymentStatus) {
        stats.paymentStatusBreakdown[tour.paymentStatus] = 
          (stats.paymentStatusBreakdown[tour.paymentStatus] || 0) + 1;
      }
      
      // Fiyat hesaplamaları (seçilen para birimine göre)
      if ((selectedCurrency === 'all' || tour.currency === selectedCurrency) && tour.totalPrice) {
        totalPrice += Number(tour.totalPrice) || 0;
        validPriceCount++;
      }
      
      // Destinasyon analizi
      if (tour.tourName) {
        stats.popularDestinations[tour.tourName] = 
          (stats.popularDestinations[tour.tourName] || 0) + 1;
      }
      
      // Aylık dağılım
      if (tour.tourDate) {
        try {
          const date = new Date(tour.tourDate);
          const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
          const monthName = date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
          
          if (!stats.monthlyDistribution[monthYear]) {
            stats.monthlyDistribution[monthYear] = {
              name: monthName,
              count: 0,
              customers: 0,
              revenue: 0
            };
          }
          
          stats.monthlyDistribution[monthYear].count += 1;
          stats.monthlyDistribution[monthYear].customers += (Number(tour.numberOfPeople) || 0);
          
          if ((selectedCurrency === 'all' || tour.currency === selectedCurrency) && tour.totalPrice) {
            stats.monthlyDistribution[monthYear].revenue += Number(tour.totalPrice) || 0;
          }
        } catch (e) {
          console.error('Tarih dönüştürme hatası:', e);
        }
      }
    });
    
    // Ortalama fiyat hesapla
    stats.averagePrice = validPriceCount > 0 ? totalPrice / validPriceCount : 0;
    
    // Popüler destinasyonları sırala
    stats.popularDestinations = Object.entries(stats.popularDestinations)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Aylık dağılımı sırala
    stats.monthlyDistribution = Object.values(stats.monthlyDistribution)
      .sort((a, b) => {
        const aDate = new Date(a.name);
        const bDate = new Date(b.name);
        return aDate - bDate;
      });
    
    return stats;
  };

  // Müşteri istatistikleri hesaplama
  const calculateCustomerStatistics = () => {
    return {
      totalCustomers: customersData.length,
      nationalityDistribution: nationalityData.slice(0, 10),
      referralSourceDistribution: referralSourceData.slice(0, 10)
    };
  };

  const financialSummary = calculateFinancialSummary();
  const tourStats = calculateTourStatistics();
  const customerStats = calculateCustomerStatistics();

  return (
    <div ref={ref} className="p-8 bg-white print:p-5">
      <style type="text/css" media="print">
        {`
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            font-family: Arial, sans-serif;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          .page-break {
            page-break-after: always;
          }
          h1, h2, h3 {
            color: #333;
          }
          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .logo {
            max-width: 150px;
            max-height: 80px;
          }
          .company-info {
            text-align: left;
          }
          .date-info {
            text-align: right;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
          .summary-box {
            border: 1px solid #ddd;
            padding: 10px;
            margin-bottom: 20px;
            background-color: #f9f9f9;
          }
        `}
      </style>

      {/* Başlık ve Şirket Bilgileri */}
      <div className="header">
        <div className="company-info">
          {companyInfo.logo && (
            <img src={companyInfo.logo} alt="Şirket Logosu" className="logo" />
          )}
          <h1>{companyInfo.name || "Şirket Adı"}</h1>
          <p>{companyInfo.address || ""}</p>
          <p>{companyInfo.phone || ""}</p>
        </div>
        <div className="date-info">
          <p><strong>Rapor Tarihi:</strong> {formatDate(new Date())}</p>
          <p><strong>Dönem:</strong> {getDateRangeText()}</p>
          <p><strong>Para Birimi:</strong> {getCurrencyText()}</p>
        </div>
      </div>

      <h2>Finansal Analiz Raporu</h2>
      
      {/* Finansal Özet */}
      <div className="summary-box">
        <h3>Finansal Özet</h3>
        <table>
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Tutar</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Toplam Gelir (Finansal)</td>
              <td>{formatCurrency(financialSummary.income, selectedCurrency)}</td>
            </tr>
            <tr>
              <td>Toplam Gelir (Turlar)</td>
              <td>{formatCurrency(financialSummary.tourIncome, selectedCurrency)}</td>
            </tr>
            <tr>
              <td>Toplam Gelir</td>
              <td><strong>{formatCurrency(financialSummary.totalIncome, selectedCurrency)}</strong></td>
            </tr>
            <tr>
              <td>Toplam Gider</td>
              <td>{formatCurrency(financialSummary.expense, selectedCurrency)}</td>
            </tr>
            <tr>
              <td>Net Kar/Zarar</td>
              <td><strong>{formatCurrency(financialSummary.totalProfit, selectedCurrency)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Para Birimi Bazında Özet */}
      {selectedCurrency === 'all' && (
        <div>
          <h3>Para Birimi Bazında Özet</h3>
          <table>
            <thead>
              <tr>
                <th>Para Birimi</th>
                <th>Gelir</th>
                <th>Gider</th>
                <th>Bakiye</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(financialSummary.currencyBreakdown).map(([currency, data]) => (
                <tr key={currency}>
                  <td>{currency}</td>
                  <td>{formatCurrency(data.income + (data.tourIncome || 0), currency)}</td>
                  <td>{formatCurrency(data.expense, currency)}</td>
                  <td><strong>{formatCurrency(data.balance, currency)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tur İstatistikleri */}
      <div className="page-break"></div>
      <h2>Tur Analiz Raporu</h2>
      
      <div className="summary-box">
        <h3>Genel Tur İstatistikleri</h3>
        <table>
          <tbody>
            <tr>
              <td>Toplam Tur Sayısı</td>
              <td>{tourStats.totalTours}</td>
            </tr>
            <tr>
              <td>Toplam Müşteri Sayısı</td>
              <td>{tourStats.totalCustomers}</td>
            </tr>
            <tr>
              <td>Ortalama Tur Fiyatı</td>
              <td>{formatCurrency(tourStats.averagePrice, selectedCurrency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Ödeme Durumu Dağılımı */}
      <div>
        <h3>Ödeme Durumu Dağılımı</h3>
        <table>
          <thead>
            <tr>
              <th>Ödeme Durumu</th>
              <th>Tur Sayısı</th>
              <th>Yüzde</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ödendi</td>
              <td>{tourStats.paymentStatusBreakdown.paid || 0}</td>
              <td>{tourStats.totalTours > 0 ? ((tourStats.paymentStatusBreakdown.paid || 0) / tourStats.totalTours * 100).toFixed(2) : 0}%</td>
            </tr>
            <tr>
              <td>Kısmi Ödeme</td>
              <td>{tourStats.paymentStatusBreakdown.partial || 0}</td>
              <td>{tourStats.totalTours > 0 ? ((tourStats.paymentStatusBreakdown.partial || 0) / tourStats.totalTours * 100).toFixed(2) : 0}%</td>
            </tr>
            <tr>
              <td>Beklemede</td>
              <td>{tourStats.paymentStatusBreakdown.pending || 0}</td>
              <td>{tourStats.totalTours > 0 ? ((tourStats.paymentStatusBreakdown.pending || 0) / tourStats.totalTours * 100).toFixed(2) : 0}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* En Popüler Turlar */}
      <div>
        <h3>En Popüler Turlar</h3>
        <table>
          <thead>
            <tr>
              <th>Tur Adı</th>
              <th>Satış Sayısı</th>
            </tr>
          </thead>
          <tbody>
            {tourStats.popularDestinations.map((destination, index) => (
              <tr key={index}>
                <td>{destination.name}</td>
                <td>{destination.count}</td>
              </tr>
            ))}
            {tourStats.popularDestinations.length === 0 && (
              <tr>
                <td colSpan={2}>Veri bulunamadı</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Aylık Tur Dağılımı */}
      <div className="page-break"></div>
      <h3>Aylık Tur Dağılımı</h3>
      <table>
        <thead>
          <tr>
            <th>Ay</th>
            <th>Tur Sayısı</th>
            <th>Müşteri Sayısı</th>
            <th>Gelir</th>
          </tr>
        </thead>
        <tbody>
          {tourStats.monthlyDistribution.map((month, index) => (
            <tr key={index}>
              <td>{month.name}</td>
              <td>{month.count}</td>
              <td>{month.customers}</td>
              <td>{formatCurrency(month.revenue, selectedCurrency)}</td>
            </tr>
          ))}
          {tourStats.monthlyDistribution.length === 0 && (
            <tr>
              <td colSpan={4}>Veri bulunamadı</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Müşteri İstatistikleri */}
      <div className="page-break"></div>
      <h2>Müşteri Analiz Raporu</h2>
      
      <div className="summary-box">
        <h3>Genel Müşteri İstatistikleri</h3>
        <table>
          <tbody>
            <tr>
              <td>Toplam Müşteri Sayısı</td>
              <td>{customerStats.totalCustomers}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Müşteri Milliyeti Dağılımı */}
      {customerStats.nationalityDistribution && customerStats.nationalityDistribution.length > 0 && (
        <div>
          <h3>Müşteri Milliyeti Dağılımı</h3>
          <table>
            <thead>
              <tr>
                <th>Milliyet</th>
                <th>Müşteri Sayısı</th>
                <th>Yüzde</th>
              </tr>
            </thead>
            <tbody>
              {customerStats.nationalityDistribution.map((item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>
                  <td>{item.value}</td>
                  <td>{customerStats.totalCustomers > 0 ? ((item.value / customerStats.totalCustomers) * 100).toFixed(2) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Referans Kaynağı Dağılımı */}
      {customerStats.referralSourceDistribution && customerStats.referralSourceDistribution.length > 0 && (
        <div>
          <h3>Referans Kaynağı Dağılımı</h3>
          <table>
            <thead>
              <tr>
                <th>Kaynak</th>
                <th>Müşteri Sayısı</th>
                <th>Yüzde</th>
              </tr>
            </thead>
            <tbody>
              {customerStats.referralSourceDistribution.map((item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>
                  <td>{item.value}</td>
                  <td>{customerStats.totalCustomers > 0 ? ((item.value / customerStats.totalCustomers) * 100).toFixed(2) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sayfa Altı */}
      <div className="footer">
        <p>© {new Date().getFullYear()} {companyInfo.name || "Şirket Adı"} - Tüm Hakları Saklıdır</p>
        <p>{companyInfo.address} | Tel: {companyInfo.phone} | E-posta: {companyInfo.email}</p>
      </div>
    </div>
  )
})