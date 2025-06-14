"use client"

import { useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, FileSearch } from "lucide-react"

export default function AdminNavLinks() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Veritabanı Araçları</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <Link href="/test-firebase" className="block">
            <Button variant="outline" className="w-full flex items-center gap-2 justify-start">
              <Database className="h-4 w-4" />
              <span>Firebase Veritabanı Test</span>
            </Button>
          </Link>
          <Link href="/app/settings" className="block">
            <Button variant="outline" className="w-full flex items-center gap-2 justify-start">
              <FileSearch className="h-4 w-4" />
              <span>Şirket Yönetimi</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
