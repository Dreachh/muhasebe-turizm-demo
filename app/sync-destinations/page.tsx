"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { getDb } from '@/lib/firebase-client-module';
import { collection, getDocs, doc, writeBatch, DocumentData } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/db-firebase';
import { Loader2, RefreshCw } from 'lucide-react';

export default function SyncDestinationsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    totalBorclar: 0,
    updatedCount: 0,
    errors: 0,
  });

  const handleSync = async () => {
    setLoading(true);
    setResults({ totalBorclar: 0, updatedCount: 0, errors: 0 });
    
    try {
      const db = getDb();
      if (!db) {
        throw new Error("Firestore bağlantısı kurulamadı");
      }

      // 1. Tüm rezervasyonları çek ve bir harita oluştur (reservationId -> destinasyonId)
      const reservationsSnapshot = await getDocs(collection(db, 'reservations'));
      const reservationDestMap = new Map<string, string>();
      reservationsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.destinasyonId) {
          reservationDestMap.set(doc.id, data.destinasyonId);
        }
      });

      // 2. Tüm borç kayıtlarını çek
      const borclarSnapshot = await getDocs(collection(db, COLLECTIONS.reservation_cari_borclar));
      const totalBorclar = borclarSnapshot.docs.length;
      let updatedCount = 0;
      let errorCount = 0;

      // 3. Toplu güncelleme için bir batch oluştur
      const batch = writeBatch(db);
      let batchSize = 0;

      for (const borcDoc of borclarSnapshot.docs) {
        const borcData = borcDoc.data();
        const reservationId = borcData.reservationId;
        const currentDestinasyon = borcData.destinasyon;
        
        const correctDestinasyonId = reservationDestMap.get(reservationId);

        if (correctDestinasyonId && currentDestinasyon !== correctDestinasyonId) {
          const borcRef = doc(db, COLLECTIONS.reservation_cari_borclar, borcDoc.id);
          batch.update(borcRef, { destinasyon: correctDestinasyonId });
          updatedCount++;
          batchSize++;

          // Firestore batch limiti 500'dür. Güvenlik için 450'de bir commit yapalım.
          if (batchSize >= 450) {
            await batch.commit();
            // Yeni bir batch oluştur
            // batch = writeBatch(db); // Bu satır gereksiz, batch yeniden kullanılabilir.
            batchSize = 0;
          }
        } else if (!correctDestinasyonId) {
            console.warn(`Rezervasyon bulunamadı veya destinasyonId eksik: ${reservationId}`);
            errorCount++;
        }
      }

      // Kalan işlemleri commit et
      if (batchSize > 0) {
        await batch.commit();
      }

      setResults({ totalBorclar, updatedCount, errors: errorCount });
      toast({
        title: "Senkronizasyon Tamamlandı",
        description: `${updatedCount} kayıt güncellendi. ${errorCount} hata/uyarı oluştu.`,
      });

    } catch (error) {
      console.error("Senkronizasyon hatası:", error);
      toast({
        title: "Hata",
        description: "Senkronizasyon sırasında bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Veri Senkronizasyonu</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Bu araç, 'reservation_cari_borclar' koleksiyonundaki destinasyon verilerini, ana 'reservations' koleksiyonundaki doğru 'destinasyonId' ile günceller.
            Mevcut borç kayıtlarındaki hatalı veya eksik destinasyon bilgilerini düzeltmek için kullanılır.
          </p>
          <Button onClick={handleSync} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Senkronize Ediliyor...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Destinasyon Verilerini Senkronize Et
              </>
            )}
          </Button>
          
          {results.totalBorclar > 0 && (
            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-bold mb-2">Senkronizasyon Sonuçları</h3>
              <p>Toplam İncelenen Borç Kaydı: {results.totalBorclar}</p>
              <p>Güncellenen Kayıt Sayısı: {results.updatedCount}</p>
              <p>Bulunamayan Rezervasyonlar (Hata/Uyarı): {results.errors}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
