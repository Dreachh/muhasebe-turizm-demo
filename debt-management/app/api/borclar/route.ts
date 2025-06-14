import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tedarikciId = searchParams.get("tedarikciId")
  const status = searchParams.get("status")
  const currency = searchParams.get("currency")

  const where: any = {}

  if (tedarikciId) {
    where.tedarikciId = tedarikciId
  }

  if (status) {
    where.status = status
  }

  if (currency) {
    where.currency = currency
  }

  try {
    const borclar = await db.borc.findMany({
      where,
      orderBy: {
        date: "desc",
      },
    })

    return NextResponse.json(borclar)
  } catch (error) {
    console.error("Borçları getirme hatası:", error)
    return NextResponse.json({ error: "Borçlar getirilemedi" }, { status: 500 })
  }
}
