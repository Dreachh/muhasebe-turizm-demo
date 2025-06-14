import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tedarikciId = searchParams.get("tedarikciId")
  const currency = searchParams.get("currency")

  const where: any = {}

  if (tedarikciId) {
    where.tedarikciId = tedarikciId
  }

  if (currency) {
    where.currency = currency
  }

  try {
    const odemeler = await db.odeme.findMany({
      where,
      orderBy: {
        date: "desc",
      },
    })

    return NextResponse.json(odemeler)
  } catch (error) {
    console.error("Ödemeleri getirme hatası:", error)
    return NextResponse.json({ error: "Ödemeler getirilemedi" }, { status: 500 })
  }
}
