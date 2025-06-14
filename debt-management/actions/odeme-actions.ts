"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

interface OdemeEkleParams {
  tedarikciId: string
  amount: number
  currency: string
  description?: string
  date: string
}

export async function odemeEkle(params: OdemeEkleParams) {
  const { tedarikciId, amount, currency, description, date } = params

  try {
    // Ödemeyi ekle
    await db.odeme.create({
      data: {
        tedarikciId,
        amount,
        currency,
        description: description || "",
        date: new Date(date),
      },
    })

    // Borç durumunu güncelle
    // Aynı para birimindeki borçları ve ödemeleri topla
    const borclar = await db.borc.findMany({
      where: {
        tedarikciId,
        currency,
      },
    })

    const odemeler = await db.odeme.findMany({
      where: {
        tedarikciId,
        currency,
      },
    })

    const totalBorc = borclar.reduce((sum, borc) => sum + borc.amount, 0)
    const totalOdenen = odemeler.reduce((sum, odeme) => sum + odeme.amount, 0)

    // Eğer tüm borçlar ödendiyse, borçların durumunu güncelle
    if (totalOdenen >= totalBorc) {
      await db.borc.updateMany({
        where: {
          tedarikciId,
          currency,
          status: "ACTIVE",
        },
        data: {
          status: "PAID",
        },
      })
    }

    revalidatePath("/borclar")
    return { success: true }
  } catch (error) {
    console.error("Ödeme oluşturma hatası:", error)
    throw new Error("Ödeme oluşturulamadı")
  }
}
