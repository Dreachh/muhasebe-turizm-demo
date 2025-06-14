"use server"

import { revalidatePath } from "next/cache"
import { mockDb } from "@/lib/mock-data"

interface CreatePaymentParams {
  supplierId: string
  amount: number
  currency: string
  description?: string
  date: string
}

export async function createPayment(params: CreatePaymentParams) {
  const { supplierId, amount, currency, description, date } = params

  try {
    // Ödemeyi mock veritabanına ekle
    mockDb.addPayment({
      supplierId,
      amount,
      currency,
      description: description || "",
      date,
    })

    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Ödeme oluşturma hatası:", error)
    throw new Error("Ödeme oluşturulamadı")
  }
}
