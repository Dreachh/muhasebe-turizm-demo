import type { Borc } from "./borc"
import type { Odeme } from "./odeme"

export interface Tedarikci {
  id: string
  name: string
  borclar: Borc[]
  odemeler: Odeme[]
  totalBorc: number
  totalOdenen: number
}
