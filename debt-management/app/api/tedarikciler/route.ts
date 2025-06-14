import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // Tedarikçileri getir
    const tedarikciler = await db.tedarikci.findMany()

    // Her tedarikçi için borç ve ödemeleri getir
    const tedarikcilerWithDetails = await Promise.all(
      tedarikciler.map(async (tedarikci) => {
        const borclar = await db.borc.findMany({
          where: { tedarikciId: tedarikci.id },
        })

        const odemeler = await db.odeme.findMany({
          where: { tedarikciId: tedarikci.id },
        })

        // Toplam borç ve ödeme hesapla
        const totalBorc = borclar.reduce((sum, borc) => sum + borc.amount, 0)
        const totalOdenen = odemeler.reduce((sum, odeme) => sum + odeme.amount, 0)

        return {
          ...tedarikci,
          borclar,
          odemeler,
          totalBorc,
          totalOdenen,
        }
      }),
    )

    return NextResponse.json(tedarikcilerWithDetails)
  } catch (error) {
    console.error("Tedarikçileri getirme hatası:", error)
    return NextResponse.json({ error: "Tedarikçiler getirilemedi" }, { status: 500 })
  }
}
