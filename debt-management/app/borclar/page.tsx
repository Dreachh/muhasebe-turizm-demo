import { Suspense } from "react"
import { BorclarDashboard } from "@/components/borclar/borclar-dashboard"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/page-header"

export default function BorclarPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <PageHeader
        title="Tedarikçi Cari Yönetimi"
        description="Tedarikçilere olan carilerinizi ve ödemelerinizi takip edin"
      />
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <BorclarDashboard />
      </Suspense>
    </div>
  )
}
