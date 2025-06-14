// Tedarikçi ve borç yönetimi için tip tanımları
export interface Debt {
  id: string;
  supplierId: string;
  companyId: string; // API uyumluluğu için eklendi
  amount: number;
  currency: string;
  description: string;
  date: string;
  status: "unpaid" | "paid" | "partially_paid";
  paidAmount?: number;
}

export interface Payment {
  id: string;
  supplierId: string;
  companyId?: string; // API uyumluluğu için eklendi
  debtId: string;
  amount: number;
  currency: string;
  description?: string;
  date: string;
}

export interface Supplier {
  id: string;
  name: string;
  type?: string;
  debts: Debt[];
  payments: Payment[];
  totalDebt?: number;
  totalPaid?: number;
}

// İndeksleme için kullanılacak yardımcı tip
export interface CurrencyData {
  total: number;
  items: any[];
}

export interface CurrencyDataRecord {
  [key: string]: CurrencyData;
}
