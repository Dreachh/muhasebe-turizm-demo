"use client";

import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/sidebar";
import { AdminHeader } from "@/components/admin-header";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense, useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentView, setCurrentView] = useState("dashboard");

  const handleNavigate = (view: string) => {
    setCurrentView(view);
  };

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Suspense fallback={<div>Yükleniyor...</div>}>
          <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <Sidebar currentView={currentView} onNavigate={handleNavigate} />
            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
              <AdminHeader />
              <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
                {children}
              </main>
            </div>
          </div>
        </Suspense>
        <Toaster />
      </ThemeProvider>
    </SessionProvider>
  );
}
