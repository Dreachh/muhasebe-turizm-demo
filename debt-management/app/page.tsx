import { SupplierDebtDashboard } from "@/components/supplier-debt-dashboard"

export default function Home() {
  return (
    <main className="container mx-auto py-6 px-4">
      <div className="space-y-4 mb-6">
        <h1 className="text-3xl font-bold">Tedarikçi Borç Yönetimi</h1>        
      </div>
      <SupplierDebtDashboard />
    </main>
  )
}
