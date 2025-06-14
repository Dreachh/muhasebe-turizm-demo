"use client"

import { useEffect, useState } from "react"
import type { Tedarikci } from "@/types/tedarikci"

export function useTedarikci() {
  const [tedarikciler, setTedarikciler] = useState<Tedarikci[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchTedarikciler() {
      try {
        const response = await fetch("/api/tedarikciler")
        const data = await response.json()
        setTedarikciler(data)
      } catch (error) {
        console.error("Tedarikçileri getirme hatası:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTedarikciler()
  }, [])

  return { tedarikciler, isLoading }
}
