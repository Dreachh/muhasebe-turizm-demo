"use server"

import { revalidatePath } from "next/cache"
import { mockDb } from "@/lib/mock-data"

interface CreateDebtParams {
  supplierId: string
  amount: number
  currency: string
  description: string
  date: string
}

export async function createDebt(params: CreateDebtParams) {
  const { supplierId, amount, currency, description, date } = params

  try {
    // Mock veritabanına borç ekle
    mockDb.addDebt({
      supplierId,
      amount,
      currency,
      description,
      date,
    })

    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Borç oluşturma hatası:", error)
    throw new Error("Borç oluşturulamadı")
  }
}

export async function deleteDebt(formData: FormData) {
  const debtId = formData.get("debtId") as string

  if (!debtId) {
    throw new Error("Borç ID'si gereklidir")
  }

  try {
    // Borcu sil
    mockDb.deleteDebt(debtId)

    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Borç silme hatası:", error)
    throw new Error("Borç silinemedi")
  }
}
