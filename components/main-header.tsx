"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Home, Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import LogoutButton from "./logout-button"

interface MainHeaderProps {
    currentView: string;
    onNavigate: (view: string) => void;
}

interface MenuItem {
    id: string;
    label: string;
    icon: React.ReactNode | null;
}

export function MainHeader({ currentView, onNavigate }: MainHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const mobileMenuItems: MenuItem[] = [
    { id: "main-dashboard", label: "Ana Sayfa", icon: <Home className="h-5 w-5" /> },
    { id: "calendar", label: "Takvim", icon: null },
    { id: "financial-entry", label: "Finansal Giriş", icon: null },
    { id: "tour-sales", label: "Tur Satışı", icon: null },
    { id: "customers", label: "Tur Müşterileri", icon: null },
    { id: "data-view", label: "Kayıtlar", icon: null },
    { id: "companies", label: "Firmalar", icon: null },
    { id: "debts", label: "Borçlar", icon: null },
    { id: "period-data", label: "Dönem Verileri", icon: null },
    { id: "payments", label: "Ödemeler", icon: null },
    { id: "analytics", label: "Raporlar", icon: null },
    { id: "currency", label: "Döviz Kurları", icon: null },
    { id: "settings", label: "Ayarlar", icon: null },
  ];

  return (
    <header className="bg-white border-b shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden mr-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menü</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[250px] p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-center">
                      <img src="/logo.svg" alt="PassionisTravel Logo" className="h-12" />
                    </div>
                  </div>
                  <nav className="flex-1 overflow-auto p-2">
                    {mobileMenuItems.map((item) => (
                      <Button
                        key={item.id}
                        variant="ghost"
                        className={`w-full justify-start mb-1 ${
                          currentView === item.id
                            ? "bg-[#00a1c6]/10 text-[#00a1c6] font-medium"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                        onClick={() => {
                          onNavigate(item.id)
                          setIsMobileMenuOpen(false)
                        }}
                      >
                        <div className="flex items-center">
                          {item.icon && <span className="mr-3">{item.icon}</span>}
                          <span>{item.label}</span>
                        </div>
                      </Button>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center cursor-pointer" onClick={() => onNavigate("main-dashboard")}>
              <img src="/logo.svg" alt="PassionisTravel Logo" className="h-14" />
            </div>
          </div>

          {/* Üst bar sadece logo ve ana sayfa yönlendirmesi içeriyor. Diğer menüler sidebar'a taşındı. */}
          <nav className="flex items-center space-x-2">
            <Button
              variant={currentView === "main-dashboard" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onNavigate("main-dashboard")}
              className={`flex items-center ${
                currentView === "main-dashboard" ? "bg-[#00a1c6]/10 text-[#00a1c6]" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Home className="h-5 w-5 mr-1" />
              Ana Sayfa
            </Button>
            <LogoutButton className="ml-2" />
          </nav>
        </div>
      </div>
    </header>
  )
}
