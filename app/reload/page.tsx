"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  clearStore, 
  saveDestinations, 
  saveActivities
} from "@/lib/db";
// JSON dosyalarını doğrudan import ediyoruz
import SampleDestinations from "@/data/sample-destinations.json";
import SampleActivities from "@/data/sample-activities.json";

export default function ReloadDataPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const addLogMessage = (message: string) => {
    setLogMessages((prev) => [...prev, message]);
  };

  const handleReloadData = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);
    setLogMessages([]);
    
    try {
      // 1. Önce localStorage'ı temizle
      addLogMessage("LocalStorage temizleniyor...");
      localStorage.removeItem("destinations");
      localStorage.removeItem("activities");
      addLogMessage("LocalStorage temizlendi.");
      
      // 2. IndexedDB veritabanını temizle
      addLogMessage("Veritabanı temizleniyor...");
      await clearStore("destinations");
      await clearStore("activities");
      addLogMessage("Veritabanı temizlendi.");
      
      // 3. Sample JSON dosyalarını kullan (fetch etmek yerine)
      addLogMessage("JSON dosyaları yükleniyor...");
      
      // JSON dosyalarını doğrudan kullanalım
      const destinations = SampleDestinations;
      const activities = SampleActivities;
      
      addLogMessage(`Destinasyonlar yüklendi: ${destinations.length} adet`);
      addLogMessage(`Aktiviteler yüklendi: ${activities.length} adet`);
      
      // 4. Verileri IndexedDB'ye kaydet
      addLogMessage("Veriler IndexedDB'ye kaydediliyor...");
      
      // 4.1 Önce destinations
      await saveDestinations(destinations);
      addLogMessage("Destinasyonlar kaydedildi.");
      
      // 4.2 Sonra activities
      await saveActivities(activities);
      addLogMessage("Aktiviteler kaydedildi.");
      
      // 5. LocalStorage'a kaydet (db.ts fonksiyonları zaten bunu yapıyor)
      addLogMessage("İşlem tamamlandı! Sayfayı yenileyebilirsiniz.");
      
      setSuccess(true);
    } catch (err: any) {
      console.error("Veri yenileme hatası:", err);
      setError(err.message || "Bilinmeyen bir hata oluştu");
      addLogMessage(`HATA: ${err.message || "Bilinmeyen bir hata oluştu"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto mt-8 px-4">
      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <h1 className="text-2xl font-bold">Veri Yenileme Sayfası</h1>
          <p className="text-muted-foreground">
            Bu sayfa destinasyon ve aktivite verilerini JSON dosyalarından yeniden yükler
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
            <h2 className="text-lg font-medium text-yellow-800">Dikkat!</h2>
            <p className="text-yellow-700">
              Bu işlem mevcut destinasyon ve aktivite verilerinizi silip, JSON dosyalarındaki güncel verileri yükleyecektir.
            </p>
          </div>
          
          <Button 
            onClick={handleReloadData}
            disabled={loading}
            className="mb-6 bg-blue-600 hover:bg-blue-700"
          >
            {loading ? "Yükleniyor..." : "Verileri Yenile"}
          </Button>
          
          {success && (
            <div className="bg-green-50 border border-green-200 p-4 rounded mb-6">
              <p className="text-green-700 font-medium">Veriler başarıyla yenilendi!</p>
              <p className="text-green-600 mt-1">
                Ayarlar sayfasını yeniden açarak güncel verileri görebilirsiniz.
              </p>
              <Button
                className="mt-2 bg-green-600 hover:bg-green-700"
                onClick={() => window.location.reload()}
              >
                Sayfayı Yenile
              </Button>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded mb-6">
              <p className="text-red-700 font-medium">Hata!</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}
          
          {logMessages.length > 0 && (
            <div className="border rounded-md p-4 bg-black text-white font-mono text-sm">
              <h3 className="text-gray-400 mb-2">İşlem Günlüğü:</h3>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {logMessages.map((msg, i) => (
                  <div key={i} className="text-sm">
                    <span className="text-green-400">{`> `}</span>
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}