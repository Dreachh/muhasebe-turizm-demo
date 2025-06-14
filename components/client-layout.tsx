"use client";

// filepath: c:\Users\LianEsileEfe\Desktop\githup\muhasebe-suat\muhasebe-passionis2\components\client-layout.tsx
import React from 'react';
import SessionProvider from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { DataInitializerComponent } from '@/components/data-initializer-component';

/**
 * ClientLayout Bileşeni
 * Bu bileşen "use client" direktifi ile client-side component olarak işaretlenmiştir
 * ve client tarafında çalışması gereken tüm bileşenleri (SessionProvider, ThemeProvider, DataInitializer) içerir
 */
export function ClientLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light">
        {children}
        <DataInitializerComponent />
        <Toaster />
      </ThemeProvider>
    </SessionProvider>
  );
}