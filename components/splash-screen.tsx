"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"

export function SplashScreen({ onFinish = () => {} }) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState("Uygulama başlatılıyor...")

  useEffect(() => {
    const timer = setTimeout(() => {
      // Başlangıç animasyonu
      let currentProgress = 0
      const interval = setInterval(() => {
        currentProgress += 5
        setProgress(currentProgress)

        // Durum mesajlarını güncelle
        if (currentProgress === 20) {
          setStatus("Veriler yükleniyor...")
        } else if (currentProgress === 50) {
          setStatus("Ayarlar kontrol ediliyor...")
        } else if (currentProgress === 80) {
          setStatus("Uygulama hazırlanıyor...")
        }

        if (currentProgress >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            if (typeof onFinish === "function") {
              onFinish()
            }
          }, 500)
        }
      }, 50)

      return () => clearInterval(interval)
    }, 500)

    return () => clearTimeout(timer)
  }, [onFinish])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
      <Card className="w-[400px] shadow-lg border-[#00a1c6]/30">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="text-center">
              <img src="/logo.svg" alt="PassionisTravel Logo" className="h-32 mx-auto mb-4" width="200" height="60" />
              <p className="text-lg text-muted-foreground">Yönetim Sistemi</p>
            </div>

            <div className="w-full space-y-2">
              <Progress value={progress} className="h-2" indicatorClassName="bg-[#00a1c6]" />
              <p className="text-sm text-center text-muted-foreground">{status}</p>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              © {new Date().getFullYear()} PassionisTravel. Tüm hakları saklıdır.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

