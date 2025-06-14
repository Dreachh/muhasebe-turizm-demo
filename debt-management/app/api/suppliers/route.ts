import { NextResponse } from "next/server"
import { mockDb } from "@/lib/mock-data"

export async function GET() {
  try {
    // Mock veritabanından tedarikçileri getir
    const suppliers = mockDb.getSuppliers()
    return NextResponse.json(suppliers)
  } catch (error) {
    console.error("Tedarikçileri getirme hatası:", error)
    return NextResponse.json({ error: "Tedarikçiler getirilemedi" }, { status: 500 })
  }
}
