import type { Supplier, Debt, Payment } from "@/types"

// Sahte tedarikçi verileri
export const mockSuppliers: Supplier[] = [
  {
    id: "sup_1",
    name: "Çilem Turizm",
    debts: [
      {
        id: "debt_1",
        supplierId: "sup_1",
        amount: 1000,
        currency: "USD",
        description: "Rehber Ücreti",
        date: "2024-05-10",
        status: "ACTIVE",
      },
      {
        id: "debt_2",
        supplierId: "sup_1",
        amount: 2500,
        currency: "TRY",
        description: "Otel Rezervasyonu",
        date: "2024-05-12",
        status: "ACTIVE",
      },
    ],
    payments: [
      {
        id: "pay_1",
        supplierId: "sup_1",
        debtId: "debt_1",
        amount: 500,
        currency: "USD",
        description: "Kısmi Ödeme",
        date: "2024-05-15",
      },
    ],
    totalDebt: 3500,
    totalPaid: 500,
  },
  {
    id: "sup_2",
    name: "Antalya Tur",
    debts: [
      {
        id: "debt_3",
        supplierId: "sup_2",
        amount: 750,
        currency: "EUR",
        description: "Transfer Ücreti",
        date: "2024-05-08",
        status: "ACTIVE",
      },
    ],
    payments: [],
    totalDebt: 750,
    totalPaid: 0,
  },
  {
    id: "sup_3",
    name: "İstanbul Rehberlik",
    debts: [
      {
        id: "debt_4",
        supplierId: "sup_3",
        amount: 5000,
        currency: "TRY",
        description: "Rehberlik Hizmeti",
        date: "2024-05-01",
        status: "ACTIVE",
      },
      {
        id: "debt_5",
        supplierId: "sup_3",
        amount: 3000,
        currency: "TRY",
        description: "Müze Giriş Ücretleri",
        date: "2024-05-03",
        status: "PAID",
      },
    ],
    payments: [
      {
        id: "pay_2",
        supplierId: "sup_3",
        debtId: "debt_5",
        amount: 3000,
        currency: "TRY",
        description: "Tam Ödeme",
        date: "2024-05-05",
      },
      {
        id: "pay_3",
        supplierId: "sup_3",
        debtId: "debt_4",
        amount: 2500,
        currency: "TRY",
        description: "Kısmi Ödeme",
        date: "2024-05-10",
      },
    ],
    totalDebt: 8000,
    totalPaid: 5500,
  },
]

// Mock veri yönetimi için yardımcı fonksiyonlar
let suppliers = [...mockSuppliers]

export const mockDb = {
  // Tedarikçileri getir
  getSuppliers: () => {
    return [...suppliers]
  },

  // Borç ekle
  addDebt: (debtData: Omit<Debt, "id" | "status">) => {
    const newDebt: Debt = {
      id: `debt_${Date.now()}`,
      ...debtData,
      status: "ACTIVE",
    }

    const supplierIndex = suppliers.findIndex((s) => s.id === debtData.supplierId)
    if (supplierIndex !== -1) {
      suppliers[supplierIndex].debts.push(newDebt)
      suppliers[supplierIndex].totalDebt += newDebt.amount
    }

    return newDebt
  },

  // Ödeme ekle
  addPayment: (paymentData: Omit<Payment, "id">) => {
    const newPayment: Payment = {
      id: `pay_${Date.now()}`,
      ...paymentData,
    }

    const supplierIndex = suppliers.findIndex((s) => s.id === paymentData.supplierId)
    if (supplierIndex !== -1) {
      suppliers[supplierIndex].payments.push(newPayment)
      suppliers[supplierIndex].totalPaid += newPayment.amount

      // Eğer borç tamamen ödendiyse durumunu güncelle
      if (paymentData.debtId) {
        const debtIndex = suppliers[supplierIndex].debts.findIndex((d) => d.id === paymentData.debtId)
        if (debtIndex !== -1) {
          const debt = suppliers[supplierIndex].debts[debtIndex]
          const totalPaidForDebt = suppliers[supplierIndex].payments
            .filter((p) => p.debtId === debt.id && p.currency === debt.currency)
            .reduce((sum, p) => sum + p.amount, 0)

          if (totalPaidForDebt >= debt.amount) {
            suppliers[supplierIndex].debts[debtIndex].status = "PAID"
          }
        }
      }
    }

    return newPayment
  },

  // Borç sil
  deleteDebt: (debtId: string) => {
    for (let i = 0; i < suppliers.length; i++) {
      const debtIndex = suppliers[i].debts.findIndex((d) => d.id === debtId)
      if (debtIndex !== -1) {
        const debt = suppliers[i].debts[debtIndex]
        suppliers[i].totalDebt -= debt.amount
        suppliers[i].debts.splice(debtIndex, 1)

        // İlişkili ödemeleri de sil
        suppliers[i].payments = suppliers[i].payments.filter((p) => {
          if (p.debtId === debtId) {
            suppliers[i].totalPaid -= p.amount
            return false
          }
          return true
        })

        return true
      }
    }
    return false
  },

  // Verileri sıfırla (test için)
  resetData: () => {
    suppliers = [...mockSuppliers]
  },
}
