"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

interface BorcEkleParams {
  tedarikciId: string
  amount: number
  currency: string
  description: string
  date: string
}

export async function borcEkle(params: BorcEkleParams) {
  const { tedarikciId, amount, currency, description, date } = params

  try {
    // Borç ekleme işlemi
    await db.borc.create({
      data: {
        tedarikciId,
        amount,
        currency,
        description,
        date: new Date(date),
        status: "ACTIVE",
      },
    })

    revalidatePath("/borclar")
    return { success: true }
  } catch (error) {
    console.error("Borç oluşturma hatası:", error)
    throw new Error("Borç oluşturulamadı")
  }
}

export async function borcSil(formData: FormData) {
  const borcId = formData.get("borcId") as string

  if (!borcId) {
    throw new Error("Borç ID'si gereklidir")
  }

  try {
    // Önce borç kaydını al ve tedarikçi ID'sini hatırla
    const borc = await db.borc.findUnique({
      where: {
        id: borcId,
      },
      include: {
        tedarikci: true,
      },
    })

    if (!borc) {
      throw new Error("Borç kaydı bulunamadı")
    }

    const tedarikciId = borc.tedarikciId
    const tedarikciName = borc.tedarikci?.name || "Bilinmeyen Tedarikçi"

    // Borcu sil
    await db.borc.delete({
      where: {
        id: borcId,
      },
    })

    // İlişkili ödemeleri sil
    await db.odeme.deleteMany({
      where: {
        borcId,
      },
    })
    
    // Tedarikçi kaydının hala var olup olmadığını kontrol et
    const tedarikci = await db.tedarikci.findUnique({
      where: {
        id: tedarikciId,
      },
    })
    
    // Tedarikçi kaydı silinmişse tekrar oluştur
    if (!tedarikci) {
      console.log(`Tedarikçi kaydı silinmiş, tekrar oluşturuluyor: ${tedarikciId}`)
      await db.tedarikci.create({
        data: {
          id: tedarikciId,
          name: tedarikciName,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
    }

    revalidatePath("/borclar")
    return { success: true }
  } catch (error) {
    console.error("Borç silme hatası:", error)
    throw new Error("Borç silinemedi")
  }
}
