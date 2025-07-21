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
  // LogOut, - Kaldırıldı
  Receipt, // Borç simgesi için eklendi
  BookOpen, // Rezervasyon simgesi için eklendi
  Globe,
  Building2, // Rezervasyon Cari simgesi için eklendi
} from "lucide-react"

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ currentView, onNavigate, onCollapsedChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  const handleCollapsedToggle = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
  };

  // Authentication sistemi kaldırıldı - MySQL'e geçiş

  return (
    <div
      className={`bg-white text-gray-700 border-r shadow-sm transition-all duration-300 ${
        collapsed ? "w-16 md:w-20" : "w-56 md:w-64"
      } flex flex-col fixed left-0 top-0 h-screen z-50`}
    >{/* Logo */}
      <div className="sticky top-0 z-10 bg-white p-1 flex flex-col items-center border-b">
        <img
          src="/logo.svg"
          alt="Nehir Travel Logo"
          className={`${collapsed ? "h-12 w-12" : "h-24 md:h-32"} w-auto cursor-pointer mb-0 transition-all duration-300`}
          onClick={() => onNavigate("main-dashboard")}
        />
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-700 hover:bg-gray-100 absolute top-1 right-1"
          onClick={handleCollapsedToggle}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>      {/* Menü Öğeleri */}
      <div className="flex-1 overflow-y-auto">
        <nav className="px-1 md:px-2">
          <div className="space-y-0">
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-1 md:px-2 py-2 border-b border-black ${currentView === "main-dashboard" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("main-dashboard")}>
              <Home className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-1 md:ml-2 text-left block w-full text-xs md:text-sm">Ana Sayfa</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-1 md:px-2 py-2 ${currentView === "rezervasyon-form" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("rezervasyon-form")}>
              <BookOpen className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-1 md:ml-2 text-left block w-full text-xs md:text-sm">Rezervasyon Girişi</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-1 md:px-2 py-2 ${currentView === "rezervasyon-liste" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("rezervasyon-liste")}>
              <Database className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-1 md:ml-2 text-left block w-full text-xs md:text-sm">Rezervasyon Listesi</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-1 md:px-2 py-2 border-b border-black ${currentView === "reservation-cari" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("reservation-cari")}>
              <Building2 className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-1 md:ml-2 text-left block w-full text-xs md:text-sm">Rezervasyon Cari</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-1 md:px-2 py-2 ${currentView === "tour-sales" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("tour-sales")}>
              <Globe className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-1 md:ml-2 text-left block w-full text-xs md:text-sm">Tur Satışı</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-1 md:px-2 py-2 border-b border-black ${currentView === "customers" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("customers")}>
              <Users className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-1 md:ml-2 text-left block w-full text-xs md:text-sm">Tur Müşterileri</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-1 md:px-2 py-2 ${currentView === "financial-entry" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("financial-entry")}>
              <DollarSign className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-1 md:ml-2 text-left block w-full text-xs md:text-sm">Finansal Giriş</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-1 md:px-2 py-2 ${currentView === "debts" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("debts")}> 
              <Receipt className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-1 md:ml-2 text-left block w-full text-xs md:text-sm">Borçlar</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-1 md:px-2 py-2 border-b border-black ${currentView === "period-data" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("period-data")}>
              <BarChart2 className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-1 md:ml-2 text-left block w-full text-xs md:text-sm">Dönem Verileri</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-1 md:px-2 py-2 ${currentView === "data-view" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("data-view")}>
              <Database className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-1 md:ml-2 text-left block w-full text-xs md:text-sm">Kayıtlar</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-1 md:px-2 py-2 border-b border-black ${currentView === "analytics" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("analytics")}>
              <BarChart2 className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-1 md:ml-2 text-left block w-full text-xs md:text-sm">Gelişmiş Analiz</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-1 md:px-2 py-2 ${currentView === "backup-restore" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("backup-restore")}>
              <Save className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-1 md:ml-2 text-left block w-full text-xs md:text-sm">Yedekleme/Geri Yükleme</span>}
            </Button>
            <Button variant="ghost" className={`w-full justify-start items-center text-left px-1 md:px-2 py-2 ${currentView === "settings" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("settings")}>
              <Settings className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-1 md:ml-2 text-left block w-full text-xs md:text-sm">Ayarlar</span>}
            </Button>
            {/* Logout button kaldırıldı - Authentication sistemi yok */}
          </div>
        </nav>
      </div>
    </div>
  )
}
