import type { Debt } from "./debt"
import type { Payment } from "./payment"

export interface Supplier {
  id: string
  name: string
  debts: Debt[]
  payments: Payment[]
  totalDebt: number
  totalPaid: number
}
