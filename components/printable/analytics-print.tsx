"use client"

import { forwardRef } from "react"
import { formatCurrency, formatDate } from "@/lib/data-utils"

// Gelişmiş analiz için yazdırılabilir rapor bileşeni
export const AnalyticsPrint = forwardRef(({ 
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

  // Toplam tur sayısı
  const totalTours = toursData.length;
  
  // Toplam müşteri sayısı
  const totalCustomers = toursData.reduce(
    (sum, item) => sum + 1, // Her tur için bir ana müşteri sayılıyor
    0,
  );

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
        <div className="company-info">
          {companyInfo.logo && (
            <img src={companyInfo.logo} alt="Şirket Logosu" className="logo" />
          )}
          <h2>{companyInfo.name || "Şirket Adı"}</h2>
        </div>
        <div className="date-info">
          <p><strong>Rapor Tarihi:</strong> {formatDate(new Date())}</p>
          <p><strong>Dönem:</strong> {getDateRangeText()}</p>
          <p><strong>Para Birimi:</strong> {getCurrencyText()}</p>
        </div>
      </div>

      <h1 className="text-center mb-4">Gelişmiş Analiz Raporu</h1>

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
          {nationalityData && nationalityData.slice(0, 10).map((item, index) => (
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

      <div className="chart-container">
        <table className="chart-table">
          <tbody>
            {nationalityData && nationalityData.slice(0, 5).map((item, index) => (
              <tr key={index}>
                <td className="chart-label">{item.name}</td>
                <td className="chart-bar">
                  <div 
                    className="bar" 
                    style={{
                      width: `${(item.value / Math.max(...nationalityData.map(d => d.value))) * 100}%`,
                      backgroundColor: '#e2e8f0',
                      height: '20px'
                    }}
                  />
                </td>
                <td className="chart-value">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      <div className="chart-placeholder">
        <p>Müşteri Referans Kaynakları Grafiği (Yazdırma önizlemesinde grafik gösterilmez)</p>
      </div>

      <div className="page-break"></div>

      <h2>Tur Analizi</h2>
      
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
                  ? formatCurrency(dest.revenue, selectedCurrency)
                  : formatCurrency(dest.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Aylara Göre Tur Dağılımı</h3>
      <table>
        <thead>
          <tr>
            <th>Ay</th>
            <th>Tur Sayısı</th>
            <th>Müşteri Sayısı</th>
            <th>Toplam Gelir</th>
          </tr>
        </thead>
        <tbody>
          {toursByMonth && toursByMonth.slice(0, 12).map((month, index) => (
            <tr key={index}>
              <td>{month.name}</td>
              <td>{month.tours}</td>
              <td>{month.customers}</td>
              <td>
                {selectedCurrency !== "all"
                  ? formatCurrency(month.revenue, selectedCurrency)
                  : formatCurrency(month.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="chart-placeholder">
        <p>Aylara Göre Tur Dağılımı Grafiği (Yazdırma önizlemesinde grafik gösterilmez)</p>
      </div>

      <div className="footer">
        <p>{companyInfo.address || "Şirket Adresi"}</p>
        <p>{companyInfo.phone ? `Tel: ${companyInfo.phone}` : ""} {companyInfo.email ? `E-posta: ${companyInfo.email}` : ""}</p>
        <p>© {new Date().getFullYear()} {companyInfo.name || "Şirket Adı"} | Bu rapor otomatik olarak oluşturulmuştur.</p>
      </div>
    </div>
  )
})

AnalyticsPrint.displayName = "AnalyticsPrint"