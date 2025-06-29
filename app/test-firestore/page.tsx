"use client";

import { useEffect, useState } from "react";
import { ReservationCariService } from "@/lib/reservation-cari-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TestFirestore() {
  const [testResult, setTestResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testCariService = async () => {
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear().toString();
      console.log("Test başlatılıyor, dönem:", currentYear);
      
      // Cari listesini getir
      const cariList = await ReservationCariService.getAllCari(currentYear);
      console.log("Cari listesi:", cariList);
      
      setTestResult(`
Dönem: ${currentYear}
Toplam cari sayısı: ${cariList.length}
${cariList.length > 0 ? `
İlk cari: ${JSON.stringify(cariList[0], null, 2)}
` : "Hiç cari kaydı bulunamadı."}
      `);
    } catch (error) {
      console.error("Test hatası:", error);
      setTestResult(`Hata: ${error instanceof Error ? error.message : String(error)}`);
    }
    setLoading(false);
  };

  const createTestCari = async () => {
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear().toString();
      
      const testCari = await ReservationCariService.createCari({
        companyName: "Test Şirketi A.Ş.",
        contactPerson: "Ali Veli",
        contactPhone: "0555-123-4567",
        contactEmail: "test@example.com",
        address: "Test Mah. Test Sok. No:1 İstanbul",
        taxNumber: "1234567890",
        notes: "Test amaçlı oluşturulan cari kartı",
        period: currentYear,
      });

      console.log("Test cari oluşturuldu:", testCari);
      setTestResult(`Test cari başarıyla oluşturuldu: ${testCari}`);
    } catch (error) {
      console.error("Test cari oluşturma hatası:", error);
      setTestResult(`Hata: ${error instanceof Error ? error.message : String(error)}`);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Firestore Test Sayfası</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={testCariService} disabled={loading}>
              Cari Listesini Test Et
            </Button>
            <Button onClick={createTestCari} disabled={loading} variant="outline">
              Test Cari Oluştur
            </Button>
          </div>
          
          {loading && <div>Yükleniyor...</div>}
          
          {testResult && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
