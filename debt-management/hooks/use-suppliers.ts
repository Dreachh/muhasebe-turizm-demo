"use client"

import { useEffect, useState } from "react"
import type { Supplier } from "@/types"

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchSuppliers() {
      try {
        const response = await fetch("/api/suppliers")
        const data = await response.json()
        setSuppliers(data)
      } catch (error) {
        console.error("Tedarikçileri getirme hatası:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSuppliers()
  }, [])

  return { suppliers, isLoading }
}
