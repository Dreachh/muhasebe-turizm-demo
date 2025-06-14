"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import { useReactToPrint } from "react-to-print"
import { FinancialRecordsPrint } from "@/components/printable/financial-records-print"
import { CustomersPrint } from "@/components/printable/customers-print"
import { AnalyticsPrint } from "@/components/printable/analytics-print"
import { AnalyticsSimplePrint } from "@/components/printable/analytics-simple-print"

interface PrintButtonProps {
  type: "financial" | "customers" | "analytics" | "analytics-simple"
  data: any
  companyInfo?: any
  dateRange?: any
  selectedCurrency?: string
  nationalityData?: any[]
  referralSourceData?: any[]
  toursByDestination?: any[]
  toursByMonth?: any[]
  currencySummaries?: any
}

export function PrintButton({
  type,
  data,
  companyInfo = {},
  dateRange = {},
  selectedCurrency = "all",
  nationalityData = [],
  referralSourceData = [],
  toursByDestination = [],
  toursByMonth = [],
  currencySummaries = {}
}: PrintButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onBeforeprint: () => setIsPrinting(true),
    onAfterPrint: () => setIsPrinting(false),
    documentTitle: `${type === "financial" ? "Finansal Kayıtlar" : type === "customers" ? "Müşteriler" : type === "analytics-simple" ? "Basit Analiz" : "Gelişmiş Analiz"} Raporu`,
    removeAfterPrint: true
  })

  // Yazdırılacak veri yoksa butonu devre dışı bırak
  const isDataEmpty =
    (type === "financial" && (!Array.isArray(data) || data.length === 0)) ||
    (type === "customers" && (!Array.isArray(data) || data.length === 0)) ||
    (type === "analytics" && (
      !data ||
      (
        (!Array.isArray(data.financialData) || data.financialData.length === 0) &&
        (!Array.isArray(data.toursData) || data.toursData.length === 0) &&
        (!Array.isArray(data.customersData) || data.customersData.length === 0)
      )
    )) ||
    (type === "analytics-simple" && (
      !data ||
      (
        (!Array.isArray(data.financialData) || data.financialData.length === 0) &&
        (!Array.isArray(data.toursData) || data.toursData.length === 0) &&
        (!Array.isArray(data.customersData) || data.customersData.length === 0)
      )
    ));

  return (
    <>
      <Button 
        onClick={handlePrint} 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-1"
        disabled={isDataEmpty || !printRef.current}
        title={isDataEmpty ? "Yazdırılacak veri yok" : (!printRef.current ? "Yazdırılacak içerik hazırlanıyor" : "")}
      >
        <Printer className="h-4 w-4" />
        Yazdır
      </Button>
      {isDataEmpty && (
        <div className="text-xs text-red-500 mt-2">Yazdırılacak veri bulunamadı.</div>
      )}

      <div className="hidden">
        {type === "financial" && (
          <FinancialRecordsPrint
            ref={printRef}
            financialData={data}
            companyInfo={companyInfo}
            dateRange={dateRange}
          />
        )}

        {type === "customers" && (
          <CustomersPrint
            ref={printRef}
            customersData={data}
            companyInfo={companyInfo}
            dateRange={dateRange}
          />
        )}

        {type === "analytics" && (
          <AnalyticsPrint
            ref={printRef}
            financialData={data.financialData}
            toursData={data.toursData}
            customersData={data.customersData}
            dateRange={dateRange}
            selectedCurrency={selectedCurrency}
            companyInfo={companyInfo}
            nationalityData={nationalityData}
            referralSourceData={referralSourceData}
            toursByDestination={toursByDestination}
            toursByMonth={toursByMonth}
            currencySummaries={currencySummaries}
          />
        )}
        
        {type === "analytics-simple" && (
          <AnalyticsSimplePrint
            ref={printRef}
            financialData={data.financialData}
            toursData={data.toursData}
            customersData={data.customersData}
            dateRange={dateRange}
            selectedCurrency={selectedCurrency}
            companyInfo={companyInfo}
            nationalityData={nationalityData}
            referralSourceData={referralSourceData}
            toursByDestination={toursByDestination}
            toursByMonth={toursByMonth}
            currencySummaries={currencySummaries}
          />
        )}
      </div>
    </>
  )
}