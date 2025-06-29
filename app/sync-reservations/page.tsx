"use client";

import { useEffect, useState } from "react";
import { ReservationCariService } from "@/lib/reservation-cari-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase-client-module";

export default function SyncReservations() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [reservations, setReservations] = useState<any[]>([]);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      const db = getDb();
      const querySnapshot = await getDocs(collection(db, "reservations"));
      const reservationList: any[] = [];
      
      querySnapshot.forEach((doc) => {
        reservationList.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      
      setReservations(reservationList);
      console.log("Rezervasyonlar yüklendi:", reservationList.length);
    } catch (error) {
      console.error("Rezervasyonlar yüklenirken hata:", error);
    }
  };

  const syncReservationsWithCari = async () => {
    setLoading(true);
    setResult("");
    
    try {
      // Önce eksik rezervasyonları bul ve ekle
      await ReservationCariService.addMissingReservationsToCari();
      
      const currentYear = new Date().getFullYear().toString();
      let successCount = 0;
      let errorCount = 0;
      
      for (const reservation of reservations) {
        try {
          // Rezervasyon verilerini düzenle
          const reservationForCari = {
            id: reservation.id,
            seriNumarasi: reservation.seriNumarasi || reservation.id,
            firma: reservation.firma,
            telefonKisi: reservation.yetkiliKisi || reservation.telefonKisi,
            yetkiliTelefon: reservation.yetkiliTelefon,
            yetkiliEmail: reservation.yetkiliEmail,
            turTarihi: reservation.turTarihi,
            toplamTutar: reservation.toplamTutar || reservation.tutar,
            odemeMiktari: reservation.odemeMiktari || reservation.odeme || "0",
            odemeTarihi: reservation.odemeTarihi,
            destinasyon: reservation.destinasyon || reservation.destinasyonId || "",
            destinasyonId: reservation.destinasyonId || reservation.destinasyon || "",
            musteriAdiSoyadi: reservation.musteriAdiSoyadi,
            yetiskinSayisi: reservation.yetiskinSayisi || 0,
            cocukSayisi: reservation.cocukSayisi || 0,
            bebekSayisi: reservation.bebekSayisi || 0,
            alisYeri: reservation.alisYeri,
            alisSaati: reservation.alisSaati,
            paraBirimi: reservation.paraBirimi || "EUR",
            period: currentYear,
          };

          console.log(`Senkronize ediliyor: ${reservation.firma} - ${reservation.seriNumarasi}`, reservationForCari);

          await ReservationCariService.createBorcFromReservation(reservationForCari);
          successCount++;
          
        } catch (error) {
          console.error(`Rezervasyon ${reservation.id} için cari oluşturma hatası:`, error);
          errorCount++;
        }
      }
      
      setResult(`
✅ Rezervasyon senkronizasyonu tamamlandı!

📊 Sonuçlar:
- Toplam rezervasyon: ${reservations.length}
- Başarılı: ${successCount}
- Hatalı: ${errorCount}

Şimdi ana sayfaya gidip "Rezervasyon Cari" sekmesini yenileyin.
Borç detayları ve ödeme bilgileri görünecek.
      `);
      
      toast({
        title: "Başarılı",
        description: `${successCount} rezervasyon cari kartına aktarıldı`,
      });

    } catch (error) {
      console.error("Senkronizasyon hatası:", error);
      setResult(`❌ Hata: ${error instanceof Error ? error.message : String(error)}`);
      
      toast({
        title: "Hata",
        description: "Senkronizasyon başarısız",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Rezervasyon → Cari Senkronizasyonu</CardTitle>
          <p className="text-sm text-gray-600">
            Mevcut rezervasyonları cari kartlarına aktarır ve borç kayıtları oluşturur
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold">Mevcut Durum:</h3>
            <p>📋 Toplam rezervasyon: {reservations.length}</p>
            <p>🏢 Bu rezervasyonlar cari kartlarına aktarılacak</p>
          </div>

          <Button 
            onClick={syncReservationsWithCari} 
            disabled={loading || reservations.length === 0}
            className="w-full"
            size="lg"
          >
            {loading ? "Senkronize ediliyor..." : `${reservations.length} Rezervasyonu Cari Kartlarına Aktar`}
          </Button>
          
          {result && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">{result}</pre>
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            <p>Bu işlem:</p>
            <ul className="list-disc list-inside ml-4 mt-2">
              <li>Her rezervasyon için cari kartı oluşturur</li>
              <li>Borç kayıtları ekler</li>
              <li>Ödeme bilgilerini aktarır</li>
              <li>Bakiye hesaplamalarını yapar</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
