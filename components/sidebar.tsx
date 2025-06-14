"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Home,
  Calendar,
  DollarSign,
  BarChart2,
  Settings,
  Database,
  RefreshCw,
  Globe,
  Save,
  ChevronRight,
  ChevronLeft,
  Brain,
  Users,
  LogOut,
  Building, // Firma simgesi için eklendi
  Receipt, // Borç simgesi için eklendi
  CreditCard, // Ödeme simgesi için eklendi
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
  const menuItems = [
    { type: "title", label: "Kayıtlar" },
    { id: "financial-entry", label: "Finansal Giriş", icon: <DollarSign className="h-5 w-5" /> },
    { id: "tour-sales", label: "Tur Satışı", icon: <Globe className="h-5 w-5" /> },
    { id: "calendar", label: "Takvim", icon: <Calendar className="h-5 w-5" /> },
    { id: "customers", label: "Tur Müşterileri", icon: <Users className="h-5 w-5" /> },
    { id: "data-view", label: "Kayıtlar", icon: <Database className="h-5 w-5" /> },
    { id: "currency", label: "Döviz", icon: <DollarSign className="h-5 w-5" /> }, // Döviz butonu eklendi
    { id: "debts", label: "Borçlar", icon: <Receipt className="h-5 w-5" /> }, // Borçlar butonu eklendi
    { id: "period-data", label: "Dönem Verileri", icon: <BarChart2 className="h-5 w-5" /> }, // Dönem Verileri butonu eklendi
    { type: "divider" },
    { type: "title", label: "Analiz ve Ayarlar" },
    { id: "analytics", label: "Gelişmiş Analiz", icon: <BarChart2 className="h-5 w-5" /> },
    { id: "backup-restore", label: "Yedekleme/Geri Yükleme", icon: <Save className="h-5 w-5" /> },
    { id: "settings", label: "Ayarlar", icon: <Settings className="h-5 w-5" /> },
  ]

  return (
    <div
      className={`bg-white text-gray-700 border-r shadow-sm transition-all duration-300 ${collapsed ? "w-20" : "w-64"} flex flex-col`}
    >
      {/* Logo ve Ana Sayfa Butonu */}
      <div className="sticky top-0 z-10 bg-white p-2 flex flex-col items-center border-b">
        <img
          src="/logo.svg"
          alt="PassionisTravel Logo"
          className="h-14 w-auto mb-2 cursor-pointer"
          onClick={() => onNavigate("main-dashboard")}
        />
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-700 hover:bg-gray-100 absolute top-4 right-4"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      {/* Menü Öğeleri */}
      <div className="flex-1 py-4 overflow-y-auto">
        <nav>
          {/* KAYITLAR */}
          <div className="mb-6">
            <div className="pl-4 mb-2 text-sm font-extrabold text-gray-700 tracking-widest">KAYITLAR</div>
            <div className="space-y-1">
              <Button variant="ghost" className={`w-full justify-start ${currentView === "main-dashboard" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("main-dashboard")}> 
                <div className="pl-4 flex items-center w-full">
                  <Home className="h-5 w-5 mr-3" />Ana Sayfa
                </div>
              </Button>
              <Button variant="ghost" className={`w-full justify-start ${currentView === "financial-entry" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("financial-entry")}>
                <div className="pl-4 flex items-center w-full">
                  <DollarSign className="h-5 w-5 mr-3" />Finansal Giriş
                </div>
              </Button>
              <Button variant="ghost" className={`w-full justify-start ${currentView === "tour-sales" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("tour-sales")}>
                <div className="pl-4 flex items-center w-full">
                  <Globe className="h-5 w-5 mr-3" />Tur Satışı
                </div>
              </Button>
              <Button variant="ghost" className={`w-full justify-start ${currentView === "calendar" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("calendar")}>
                <div className="pl-4 flex items-center w-full">
                  <Calendar className="h-5 w-5 mr-3" />Takvim
                </div>
              </Button>
              <Button variant="ghost" className={`w-full justify-start ${currentView === "customers" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("customers")}>
                <div className="pl-4 flex items-center w-full">
                  <Users className="h-5 w-5 mr-3" />Tur Müşterileri
                </div>
              </Button>
              <Button variant="ghost" className={`w-full justify-start ${currentView === "data-view" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("data-view")}>
                <div className="pl-4 flex items-center w-full">
                  <Database className="h-5 w-5 mr-3" />Kayıtlar
                </div>
              </Button>
              <Button variant="ghost" className={`w-full justify-start ${currentView === "currency" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("currency")}>
                <div className="pl-4 flex items-center w-full">
                  <DollarSign className="h-5 w-5 mr-3" />Döviz
                </div>
              </Button>
                  <Button variant="ghost" className={`w-full justify-start ${currentView === "debts" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("debts")}>
                <div className="pl-4 flex items-center w-full">
                  <Receipt className="h-5 w-5 mr-3" />Borçlar
                </div>
              </Button>
              
              <Button variant="ghost" className={`w-full justify-start ${currentView === "period-data" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("period-data")}>
                <div className="pl-4 flex items-center w-full">
                  <BarChart2 className="h-5 w-5 mr-3" />Dönem Verileri
                </div>
              </Button>
            </div>
          </div>

          {/* ANALİZ VE AYARLAR */}
          <div>
            <div className="pl-4 mb-2 text-sm font-extrabold text-gray-700 tracking-widest">ANALİZ VE AYARLAR</div>
            <div className="space-y-1">
              <Button variant="ghost" className={`w-full justify-start ${currentView === "analytics" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("analytics")}>
                <div className="pl-4 flex items-center w-full">
                  <BarChart2 className="h-5 w-5 mr-3" />Gelişmiş Analiz
                </div>
              </Button>
              <Button variant="ghost" className={`w-full justify-start ${currentView === "backup-restore" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("backup-restore")}>
                <div className="pl-4 flex items-center w-full">
                  <Save className="h-5 w-5 mr-3" />Yedekleme/Geri Yükleme
                </div>
              </Button>
              <Button variant="ghost" className={`w-full justify-start ${currentView === "settings" ? "bg-[#00a1c6] text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => onNavigate("settings")}>
                <div className="pl-4 flex items-center w-full">
                  <Settings className="h-5 w-5 mr-3" />Ayarlar
                </div>
              </Button>
              {/* Uygulamadan Çık (Logout) butonu */}
              <Button variant="ghost" className="w-full justify-start text-red-600 hover:bg-red-100 hover:text-red-700 font-bold underline text-base md:text-lg" onClick={handleLogout}>
                <div className="pl-4 flex items-center w-full">
                  <LogOut className="h-5 w-5 mr-3" />Uygulamadan Çık
                </div>
              </Button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  )
}
