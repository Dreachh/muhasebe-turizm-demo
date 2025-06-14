import { NextResponse } from "next/server"
import { mockDb } from "@/lib/mock-data"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const supplierId = searchParams.get("supplierId")
  const currency = searchParams.get("currency")

  try {
    const suppliers = mockDb.getSuppliers()
    const payments = []

    // Tüm tedarikçilerden ödemeleri topla
    for (const supplier of suppliers) {
      let filteredPayments = [...supplier.payments]

      // Filtreleri uygula
      if (supplierId) {
        filteredPayments = filteredPayments.filter((payment) => payment.supplierId === supplierId)
      }

      if (currency) {
        filteredPayments = filteredPayments.filter((payment) => payment.currency === currency)
      }

      payments.push(...filteredPayments)
    }

    // Tarihe göre sırala
    payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json(payments)
  } catch (error) {
    console.error("Ödemeleri getirme hatası:", error)
    return NextResponse.json({ error: "Ödemeler getirilemedi" }, { status: 500 })
  }
}
