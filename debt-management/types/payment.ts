export interface Payment {
  id: string
  supplierId: string
  debtId?: string
  amount: number
  currency: string
  description: string
  date: string
}
