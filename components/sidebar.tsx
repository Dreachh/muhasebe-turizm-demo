"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Home,
  DollarSign,
  BarChart2,
  Settings,
  Database,
  Save,
  ChevronRight,
  ChevronLeft,
  Users,
  LogOut,
  Receipt, // Borç simgesi için eklendi
  BookOpen, // Rezervasyon simgesi için eklendi
  Globe,
} from "lucide-react"

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  // Logout fonksiyonu
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminLoggedIn');
      window.location.href = '/admin/login';
    }
  };
  return (
    <div
      className={`bg-white text-gray-700 border-r shadow-sm transition-all duration-300 ${collapsed ? "w-20" : "w-64"} flex flex-col fixed left-0 top-0 h-screen z-50`}
    >{/* Logo */}
      <div className="sticky top-0 z-10 bg-white p-1 flex flex-col items-center border-b">
        <img
          src="/logo.svg"
          alt="Nehir Travel Logo"
          className="h-32 w-auto cursor-pointer mb-0"
          onClick={() => onNavigate("main-dashboard")}
        />
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-700 hover:bg-gray-100 absolute top-1 right-1"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>      {/* Menü Öğeleri */}
      <div className="flex-1 overflow-y-auto">
        <nav className="px-2">
          <div className="space-y-0">
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-2 py-2 border-b border-black ${currentView === "main-dashboard" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("main-dashboard")}>
              <Home className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-2 text-left block w-full">Ana Sayfa</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-2 py-2 ${currentView === "rezervasyon-form" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("rezervasyon-form")}>
              <BookOpen className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-2 text-left block w-full">Rezervasyon Girişi</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-2 py-2 border-b border-black ${currentView === "rezervasyon-liste" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("rezervasyon-liste")}>
              <Database className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-2 text-left block w-full">Rezervasyon Listesi</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-2 py-2 ${currentView === "tour-sales" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("tour-sales")}>
              <Globe className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-2 text-left block w-full">Tur Satışı</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-2 py-2 border-b border-black ${currentView === "customers" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("customers")}>
              <Users className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-2 text-left block w-full">Tur Müşterileri</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-2 py-2 ${currentView === "financial-entry" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("financial-entry")}>
              <DollarSign className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-2 text-left block w-full">Finansal Giriş</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-2 py-2 ${currentView === "debts" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("debts")}> 
              <Receipt className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-2 text-left block w-full">Cari</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-2 py-2 border-b border-black ${currentView === "period-data" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("period-data")}>
              <BarChart2 className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-2 text-left block w-full">Dönem Verileri</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-2 py-2 ${currentView === "data-view" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("data-view")}>
              <Database className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-2 text-left block w-full">Kayıtlar</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-2 py-2 border-b border-black ${currentView === "analytics" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("analytics")}>
              <BarChart2 className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-2 text-left block w-full">Gelişmiş Analiz</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-2 py-2 ${currentView === "backup-restore" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("backup-restore")}>
              <Save className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-2 text-left block w-full">Yedekleme/Geri Yükleme</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-2 py-2 ${currentView === "settings" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("settings")}>
              <Settings className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-2 text-left block w-full">Ayarlar</span>}
            </Button>
            <Button variant="ghost" className="w-full justify-start items-center text-left px-2 py-2 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold" onClick={handleLogout}>
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-2 text-left block w-full">Uygulamadan Çık</span>}
            </Button>
          </div>
        </nav>
      </div>
    </div>
  )
}
