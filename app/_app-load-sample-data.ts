// Bu dosya artık kullanılmıyor - Örnek veri yükleme sistemi tamamen devre dışı bırakıldı
// Gerçek Firebase verilerinin işlenmesi için bu dosya ve localStorage kontrolü kaldırıldı

/*
import { useEffect } from "react";
import { loadSampleData } from "../lib/load-sample-data";

export default function AppLoadSampleData() {
  useEffect(() => {
    // Sadece ilk açılışta bir kere yükle
    if (!window.localStorage.getItem("sampleDataLoaded")) {
      loadSampleData().then(() => {
        window.localStorage.setItem("sampleDataLoaded", "1");
      });
    }
  }, []);
  return null;
}
*/

// Artık sadece boş bir fonksiyon döndürüyoruz
export default function AppLoadSampleData() {
  return null;
}
