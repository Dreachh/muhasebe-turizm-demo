"use client"

import { forwardRef } from "react"
import { formatDate } from "@/lib/data-utils"

// Müşteriler için yazdırılabilir rapor bileşeni
export const CustomersPrint = forwardRef(({ 
  customersData,
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

      <h1 className="text-center mb-4">Müşteri Listesi Raporu</h1>

      <div className="summary-box">
        <h2>Özet Bilgiler</h2>
        <p><strong>Toplam Müşteri Sayısı:</strong> {customersData.length}</p>
      </div>

      <h2>Müşteri Listesi</h2>
      <table>
        <thead>
          <tr>
            <th>Müşteri Adı</th>
            <th>Telefon</th>
            <th>E-posta</th>
            <th>Kimlik Numarası</th>
            <th>Adres</th>
            <th>Notlar</th>
          </tr>
        </thead>
        <tbody>
          {customersData.map((customer, index) => (
            <tr key={index}>
              <td>{customer.name || "-"}</td>
              <td>{customer.phone || "-"}</td>
              <td>{customer.email || "-"}</td>
              <td>{customer.idNumber || "-"}</td>
              <td>{customer.address || "-"}</td>
              <td>{customer.notes || "-"}</td>
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

CustomersPrint.displayName = "CustomersPrint"