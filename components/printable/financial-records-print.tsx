"use client"

import { forwardRef } from "react"
import { formatCurrency, formatDate } from "@/lib/data-utils"

// Finansal kayıtlar için yazdırılabilir rapor bileşeni
export const FinancialRecordsPrint = forwardRef(({ 
  financialData,
  companyInfo = {},
  dateRange = {}
}, ref) => {
  // Tarih aralığı metni
  const getDateRangeText = () => {
    if (dateRange.from && dateRange.to) {
      return `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
    }
    return "Tüm Zamanlar"
  }

  // Gelir ve gider toplamlarını hesapla
  const calculateTotals = () => {
    const totals = {
      income: {},
      expense: {}
    }

    financialData.forEach(item => {
      if (!item) return

      const currency = item.currency || "TRY"
      const amount = Number(item.amount) || 0

      if (!totals.income[currency]) totals.income[currency] = 0
      if (!totals.expense[currency]) totals.expense[currency] = 0

      if (item.type === "income") {
        totals.income[currency] += amount
      } else if (item.type === "expense") {
        totals.expense[currency] += amount
      }
    })

    return totals
  }

  const totals = calculateTotals()

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
        </div>
      </div>

      <h1 className="text-center mb-4">Finansal Kayıtlar Raporu</h1>

      <div className="summary-box">
        <h2>Özet Bilgiler</h2>
        <table>
          <thead>
            <tr>
              <th>Para Birimi</th>
              <th>Toplam Gelir</th>
              <th>Toplam Gider</th>
              <th>Net Bakiye</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(totals.income).map(currency => (
              <tr key={currency}>
                <td>{currency}</td>
                <td>{formatCurrency(totals.income[currency], currency)}</td>
                <td>{formatCurrency(totals.expense[currency] || 0, currency)}</td>
                <td>{formatCurrency(totals.income[currency] - (totals.expense[currency] || 0), currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Detaylı Finansal Kayıtlar</h2>
      <table>
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Tür</th>
            <th>Kategori</th>
            <th>Açıklama</th>
            <th>Tutar</th>
            <th>Ödeme Yöntemi</th>
          </tr>
        </thead>
        <tbody>
          {financialData.map((item, index) => (
            <tr key={index}>
              <td>{formatDate(item.date)}</td>
              <td>{item.type === "income" ? "Gelir" : "Gider"}</td>
              <td>{item.category || "-"}</td>
              <td>{item.description || "-"}</td>
              <td>{formatCurrency(item.amount, item.currency)}</td>
              <td>{item.paymentMethod || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="footer">
        <p>{companyInfo.address || "Şirket Adresi"}</p>
        <p>{companyInfo.phone ? `Tel: ${companyInfo.phone}` : ""} {companyInfo.email ? `E-posta: ${companyInfo.email}` : ""}</p>
        <p>© {new Date().getFullYear()} {companyInfo.name || "Şirket Adı"} | Bu rapor otomatik olarak oluşturulmuştur.</p>
      </div>
    </div>
  )
})

FinancialRecordsPrint.displayName = "FinancialRecordsPrint"