export interface Debt {
  id: string
  supplierId: string
  amount: number
  currency: string
  description: string
  date: string
  status: "ACTIVE" | "PAID"
}
