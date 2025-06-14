export interface Borc {
  id: string
  tedarikciId: string
  amount: number
  currency: string
  description: string
  date: string
  status: "ACTIVE" | "PAID"
}
