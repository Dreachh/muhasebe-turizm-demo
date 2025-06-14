"use client"

import { forwardRef } from "react"
import { formatCurrency } from "@/lib/data-utils"

// Yazdırılabilir rapor bileşeni
export const PrintableReport = forwardRef(({ 
  financialData, 
  toursData, 
  dateRange,
  selectedCurrency,
  customerNationalityData,
  referralSourceData,
  popularTours,
  toursByDestination,
  toursByPaymentStatus,
  currencySummaries
}, ref) => {
  // Tarih aralığı metni
  const getDateRangeText = () => {
    switch (dateRange) {
      case "thisWeek": return "Bu Hafta";
      case "thisMonth": return "Bu Ay";
      case "lastMonth": return "Geçen Ay";
      case "thisYear": return "Bu Yıl";
      case "allTime": return "Tüm Zamanlar";
      default: return "Belirtilmemiş Dönem";
    }
  };

  // Para birimi metni
  const getCurrencyText = () => {
    switch (selectedCurrency) {
      case "all": return "Tüm Para Birimleri";
      case "TRY": return "Türk Lirası (TRY)";
      case "USD": return "Amerikan Doları (USD)";
      case "EUR": return "Euro (EUR)";
      case "GBP": return "İngiliz Sterlini (GBP)";
      default: return selectedCurrency;
    }
  };

  // Toplam tur sayısı
  const totalTours = toursData.length;
  
  // Toplam müşteri sayısı
  const totalCustomers = toursData.reduce(
    (sum, item) => sum + (Number.parseInt(item?.numberOfPeople?.toString() || '0') || 0),
    0,
  );

  return (
    <div ref={ref} className="p-8 bg-white">
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
            text-align: center;
            margin-bottom: 20px;
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
          .chart-placeholder {
            height: 200px;
            border: 1px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            background-color: #f9f9f9;
          }
        `}
      </style>

      <div className="header">
        <h1>Passionist Travel Finansal ve Tur Analiz Raporu</h1>
        <p>Dönem: {getDateRangeText()} | Para Birimi: {getCurrencyText()}</p>
        <p>Rapor Tarihi: {new Date().toLocaleDateString("tr-TR")}</p>
      </div>

      <div className="summary-box">
        <h2>Genel Özet</h2>
        <table>
          <tbody>
            <tr>
              <td><strong>Toplam Tur Sayısı:</strong></td>
              <td>{totalTours}</td>
              <td><strong>Toplam Müşteri Sayısı:</strong></td>
              <td>{totalCustomers}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Finansal Analiz</h2>
      
      {currencySummaries && Object.entries(currencySummaries).map(([currency, summary]) => (
        <div key={currency} className="summary-box">
          <h3>{currency} Para Birimi Özeti</h3>
          <table>
            <tbody>
              <tr>
                <td><strong>Toplam Gelir:</strong></td>
                <td>{formatCurrency(summary.totalIncome, currency)}</td>
                <td><strong>Toplam Gider:</strong></td>
                <td>{formatCurrency(summary.expense, currency)}</td>
              </tr>
              <tr>
                <td><strong>Net Kar/Zarar:</strong></td>
                <td>{formatCurrency(summary.totalProfit, currency)}</td>
                <td><strong>Kasa Bakiyesi:</strong></td>
                <td>{formatCurrency(summary.balance, currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      <div className="page-break"></div>

      <h2>Tur Analizi</h2>
      
      <h3>En Çok Satılan Turlar</h3>
      <table>
        <thead>
          <tr>
            <th>Tur Adı</th>
            <th>Satış Sayısı</th>
            <th>Müşteri Sayısı</th>
            <th>Toplam Gelir</th>
          </tr>
        </thead>
        <tbody>
          {popularTours && popularTours.slice(0, 10).map((tour, index) => (
            <tr key={index}>
              <td>{tour.name}</td>
              <td>{tour.count}</td>
              <td>{tour.customers}</td>
              <td>
                {selectedCurrency !== "all"
                  ? `${tour.revenue.toFixed(2)} ${selectedCurrency}`
                  : formatCurrency(tour.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="chart-placeholder">
        <p>Tur Popülerliği Grafiği (Yazdırma önizlemesinde grafik gösterilmez)</p>
      </div>

      <h3>Destinasyonlara Göre Tur Dağılımı</h3>
      <table>
        <thead>
          <tr>
            <th>Destinasyon</th>
            <th>Tur Sayısı</th>
            <th>Müşteri Sayısı</th>
            <th>Toplam Gelir</th>
          </tr>
        </thead>
        <tbody>
          {toursByDestination && toursByDestination.slice(0, 10).map((dest, index) => (
            <tr key={index}>
              <td>{dest.name}</td>
              <td>{dest.count}</td>
              <td>{dest.customers}</td>
              <td>
                {selectedCurrency !== "all"
                  ? `${dest.revenue.toFixed(2)} ${selectedCurrency}`
                  : formatCurrency(dest.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="page-break"></div>

      <h2>Müşteri Analizi</h2>
      
      <h3>Müşteri Vatandaşlık/Ülke Dağılımı</h3>
      <table>
        <thead>
          <tr>
            <th>Ülke/Vatandaşlık</th>
            <th>Müşteri Sayısı</th>
            <th>Yüzde</th>
          </tr>
        </thead>
        <tbody>
          {customerNationalityData && customerNationalityData.slice(0, 10).map((item, index) => (
            <tr key={index}>
              <td>{item.name}</td>
              <td>{item.value}</td>
              <td>
                {totalCustomers > 0 ? ((item.value / totalCustomers) * 100).toFixed(1) : 0}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Müşteri Referans Kaynakları</h3>
      <table>
        <thead>
          <tr>
            <th>Referans Kaynağı</th>
            <th>Müşteri Sayısı</th>
            <th>Yüzde</th>
          </tr>
        </thead>
        <tbody>
          {referralSourceData && referralSourceData.slice(0, 10).map((item, index) => (
            <tr key={index}>
              <td>{item.name}</td>
              <td>{item.value}</td>
              <td>
                {totalTours > 0 ? ((item.value / totalTours) * 100).toFixed(1) : 0}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="footer">
        <p>© {new Date().getFullYear()} Passionist Travel | Bu rapor otomatik olarak oluşturulmuştur.</p>
        <p>Rapor Tarihi: {new Date().toLocaleDateString("tr-TR")} {new Date().toLocaleTimeString("tr-TR")}</p>
      </div>
    </div>
  )
})

PrintableReport.displayName = "PrintableReport"
