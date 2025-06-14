export interface Supplier {
  id: string
  name: string
  debts: Debt[]
  payments: Payment[]
  totalDebt: number
  totalPaid: number
}

export interface Debt {
  id: string
  supplierId: string
  amount: number
  currency: string
  description: string
  date: string
  status: "ACTIVE" | "PAID"
}

export interface Payment {
  id: string
  supplierId: string
  debtId?: string
  amount: number
  currency: string
  description: string
  date: string
}
