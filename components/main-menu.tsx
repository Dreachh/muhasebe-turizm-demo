"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, Calendar, DollarSign, BarChart2, Settings, Database, RefreshCw, Globe, Save, Building, CreditCard, Receipt } from "lucide-react"

export function MainMenu({ onNavigate }: { onNavigate: (id: string) => void }) {
  const menuItems = [
    { id: "dashboard", label: "Ana Sayfa", icon: <Home className="h-6 w-6" />, color: "bg-blue-100 text-blue-700" },
    { id: "calendar", label: "Takvim", icon: <Calendar className="h-6 w-6" />, color: "bg-green-100 text-green-700" },
    {
      id: "financial-entry",
      label: "Finansal Giriş",
      icon: <DollarSign className="h-6 w-6" />,
      color: "bg-yellow-100 text-yellow-700",
    },
    {
      id: "tour-sales",
      label: "Tur Satışı",
      icon: <Globe className="h-6 w-6" />,
      color: "bg-purple-100 text-purple-700",
    },
    {
      id: "data-view",
      label: "Veri Görüntüleme",
      icon: <Database className="h-6 w-6" />,
      color: "bg-pink-100 text-pink-700",
    },
    {
      id: "analytics",
      label: "Analitik",
      icon: <BarChart2 className="h-6 w-6" />,
      color: "bg-indigo-100 text-indigo-700",
    },
    {
      id: "debts",
      label: "Borçlar",
      icon: <Receipt className="h-6 w-6" />,
      color: "bg-rose-100 text-rose-700",
    },
    {
      id: "payments",
      label: "Ödemeler",
      icon: <CreditCard className="h-6 w-6" />,
      color: "bg-emerald-100 text-emerald-700",
    },
    {
      id: "currency",
      label: "Döviz Kurları",
      icon: <RefreshCw className="h-6 w-6" />,
      color: "bg-red-100 text-red-700",
    },
    { id: "settings", label: "Ayarlar", icon: <Settings className="h-6 w-6" />, color: "bg-gray-100 text-gray-700" },
    {
      id: "backup-restore",
      label: "Yedekleme",
      icon: <Save className="h-6 w-6" />,
      color: "bg-teal-100 text-teal-700",
    },
  ]

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Nehir Travel Yönetim Sistemi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant="outline"
                className={`h-24 flex flex-col items-center justify-center gap-2 ${item.color}`}
                onClick={() => onNavigate(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

