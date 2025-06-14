"use client"

import { SupplierDebtDashboard } from "@/components/supplier-debt-dashboard"

export default function BorclarPage() {
  return (
    <main className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">Tedarikçi Borç Yönetimi</h1>
      <SupplierDebtDashboard />
    </main>
  )
}
