import { NextResponse } from "next/server"
import { mockDb } from "@/lib/mock-data"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const supplierId = searchParams.get("supplierId")
  const status = searchParams.get("status")
  const currency = searchParams.get("currency")

  try {
    const suppliers = mockDb.getSuppliers()
    const debts = []

    // Tüm tedarikçilerden borçları topla
    for (const supplier of suppliers) {
      let filteredDebts = [...supplier.debts]

      // Filtreleri uygula
      if (supplierId) {
        filteredDebts = filteredDebts.filter((debt) => debt.supplierId === supplierId)
      }

      if (status) {
        filteredDebts = filteredDebts.filter((debt) => debt.status === status)
      }

      if (currency) {
        filteredDebts = filteredDebts.filter((debt) => debt.currency === currency)
      }

      debts.push(...filteredDebts)
    }

    // Tarihe göre sırala
    debts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json(debts)
  } catch (error) {
    console.error("Borçları getirme hatası:", error)
    return NextResponse.json({ error: "Borçlar getirilemedi" }, { status: 500 })
  }
}
