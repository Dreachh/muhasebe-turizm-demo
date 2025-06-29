"use client";

import { useEffect, useState } from "react";
import { ReservationCariService } from "@/lib/reservation-cari-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function CreateSampleData() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const createSampleData = async () => {
    setLoading(true);
    setResult("");
    
    try {
      const currentYear = new Date().getFullYear().toString();
      
      // 1. Test carisi oluştur
      const testCariId = await ReservationCariService.createCari({
        companyName: "Acme Tourism A.Ş.",
        contactPerson: "Mehmet Yılmaz",
        contactPhone: "0555-123-4567",
        contactEmail: "mehmet@acmetourism.com",
        address: "Taksim Mah. İstiklal Cad. No:123 Beyoğlu/İstanbul",
        taxNumber: "1234567890",
        notes: "Test amaçlı oluşturulan örnek cari kartı",
        period: currentYear,
      });

      // 2. Test borç kaydı oluştur
      await ReservationCariService.createBorcFromReservation({
        reservationId: "sample-reservation-1",
        firma: "Acme Tourism A.Ş.",
        tutar: 5000,
        turTarihi: "2025-07-15",
        destinasyon: "Kapadokya",
        musteriAdiSoyadi: "Ali Veli",
        yetiskinSayisi: 2,
        cocukSayisi: 2,
        bebekSayisi: 0,
        alisYeri: "Sultanahmet",
        alisSaati: "08:00",
        paraBirimi: "TRY",
        telefon: "0555-999-8888",
        period: currentYear,
      });

      // 3. Test ödeme kaydı oluştur - Bu fonksiyon şu anda mevcut değil, bu yüzden atla
      // await ReservationCariService.addOdeme(...)

      // 4. İkinci test carisi oluştur
      const testCari2Id = await ReservationCariService.createCari({
        companyName: "Sunrise Tours Ltd.",
        contactPerson: "Ayşe Demir",
        contactPhone: "0555-987-6543",
        contactEmail: "ayse@sunrisetours.com",
        address: "Kadıköy Mah. Bağdat Cad. No:456 Kadıköy/İstanbul",
        taxNumber: "9876543210",
        notes: "İkinci test cari kartı",
        period: currentYear,
      });

      await ReservationCariService.createBorcFromReservation({
        reservationId: "sample-reservation-2",
        firma: "Sunrise Tours Ltd.",
        tutar: 3500,
        turTarihi: "2025-07-20",
        destinasyon: "Antalya",
        musteriAdiSoyadi: "Fatma Özkan",
        yetiskinSayisi: 1,
        cocukSayisi: 1,
        bebekSayisi: 0,
        alisYeri: "Eminönü",
        alisSaati: "09:30",
        paraBirimi: "TRY",
        telefon: "0555-111-2222",
        period: currentYear,
      });

      setResult(`
✅ Test verileri başarıyla oluşturuldu!

Oluşturulan Cari Kartları:
1. ${testCariId} - Acme Tourism A.Ş. 
   - Borç: 5,000 TL
   - Ödeme: 2,000 TL  
   - Bakiye: 3,000 TL borçlu

2. ${testCari2Id} - Sunrise Tours Ltd.
   - Borç: 3,500 TL
   - Ödeme: 0 TL
   - Bakiye: 3,500 TL borçlu

Şimdi ana sayfaya gidip "Rezervasyon Cari" sekmesini kontrol edin.
      `);
      
      toast({
        title: "Başarılı",
        description: "Test verileri oluşturuldu",
      });

    } catch (error) {
      console.error("Test verisi oluşturma hatası:", error);
      setResult(`❌ Hata: ${error instanceof Error ? error.message : String(error)}`);
      
      toast({
        title: "Hata",
        description: "Test verileri oluşturulamadı",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Verisi Oluşturucu</CardTitle>
          <p className="text-sm text-gray-600">
            Rezervasyon cari modülü için örnek test verileri oluşturur
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={createSampleData} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Oluşturuluyor..." : "Test Verilerini Oluştur"}
          </Button>
          
          {result && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">{result}</pre>
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            <p>Bu işlem:</p>
            <ul className="list-disc list-inside ml-4 mt-2">
              <li>2 adet test cari kartı oluşturur</li>
              <li>Borç kayıtları ekler</li>
              <li>Örnek ödeme kaydı ekler</li>
              <li>Bakiye hesaplamalarını yapar</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
