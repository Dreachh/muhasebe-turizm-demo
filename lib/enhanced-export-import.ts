import {
  collection,
  getDocs,
  doc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "./firebase-client-module";
import { COLLECTIONS, LOCAL_STORAGE_KEYS, INDEXED_DB_STORES } from "./constants";
import { clearAllData } from "./db";

// === GENEL YARDIMCI FONKSİYONLAR ===

// Firestore Timestamp nesnelerini yeniden oluşturmak için helper fonksiyon
const rehydrateData = (key: string, value: any) => {
  if (typeof value === 'object' && value !== null) {
    if (value.hasOwnProperty('seconds') && value.hasOwnProperty('nanoseconds')) {
      return new Timestamp(value.seconds, value.nanoseconds);
    }
  }
  return value;
};

/**
 * Dosya indirme işlemini tetikler.
 * @param {string} content - Dosya içeriği.
 * @param {string} fileName - Dosya adı.
 */
const downloadFile = (content: string, fileName: string) => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Kullanıcıya bir dosya seçtirir ve içeriğini string olarak döner.
 * @returns {Promise<string | null>} Dosya içeriği veya iptal durumunda null.
 */
const selectFile = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    let resolved = false;
    
    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          if (!resolved) {
            resolved = true;
            resolve(event.target?.result as string);
          }
        };
        reader.onerror = () => {
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        };
        reader.readAsText(file);
      } else {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      }
    };
    
    const handleWindowFocus = () => {
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
        window.removeEventListener('focus', handleWindowFocus);
      }, 300);
    };
    
    input.addEventListener('change', handleChange);
    window.addEventListener('focus', handleWindowFocus);
    
    input.click();
  });
};


// === SİSTEM VERİLERİ (AYARLAR & TANIMLAR) ===

/**
 * Sistem verilerini (Ayarlar & Tanımlar) dışa aktarır.
 */
export const exportSystemData = async () => {
  try {
    const systemData: any = {
      exportType: 'NehirTravelSystemData',
      exportDate: new Date().toISOString(),
      version: '2.0'
    };

    Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        try {
          systemData[key] = JSON.parse(item);
        } catch (e) {
          console.warn(`LocalStorage'daki '${key}' verisi JSON formatında değil, ham olarak alınıyor.`);
          systemData[key] = item;
        }
      }
    });

    const fileName = `nehir-travel-sistem-yedek-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.json`;
    downloadFile(JSON.stringify(systemData, null, 2), fileName);
    alert("Sistem verileri başarıyla dışa aktarıldı.");
  } catch (error: any) {
    console.error("Sistem verileri dışa aktarma hatası:", error);
    alert(`Bir hata oluştu: ${error.message}`);
  }
};

/**
 * Sistem verilerini (Ayarlar & Tanımlar) içe aktarır.
 */
export const importSystemData = async () => {
  try {
    const fileContent = await selectFile();
    if (!fileContent) {
      alert("İçe aktarma iptal edildi.");
      return;
    }

    const data = JSON.parse(fileContent);

    if (data.exportType !== 'NehirTravelSystemData') {
      throw new Error("Bu dosya geçerli bir Sistem Verileri yedeği değil.");
    }

    // Eski verileri temizle
    Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    // Yeni verileri yükle
    Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
      if (data[key]) {
        localStorage.setItem(key, JSON.stringify(data[key]));
      }
    });

    alert("Sistem verileri başarıyla geri yüklendi. Değişikliklerin etkili olması için sayfayı yenileyin.");
  } catch (error: any) {
    console.error("Sistem verileri içe aktarma hatası:", error);
    alert(`Bir hata oluştu: ${error.message}`);
  }
};


// === İŞLEMSEL VERİLER (KAYITLAR & İŞLEMLER) ===

/**
 * İşlemsel verileri (Kayıtlar & İşlemler) dışa aktarır.
 */
export const exportOperationalData = async () => {
  console.log("İşlemsel veri dışa aktarma başlatılıyor...");
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Firestore bağlantısı kurulamadı.");
    }

    const operationalData: any = {
      exportType: 'NehirTravelOperationalData',
      exportDate: new Date().toISOString(),
      version: '2.0'
    };

    // Firestore verilerini topla
    for (const collectionName of Object.values(INDEXED_DB_STORES)) {
      console.log(`'${collectionName}' koleksiyonu dışa aktarılıyor...`);
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        operationalData[collectionName] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`'${collectionName}' - ${operationalData[collectionName].length} kayıt toplandı.`);
      } catch (error) {
        console.error(`'${collectionName}' koleksiyonu dışa aktarılırken hata:`, error);
        operationalData[collectionName] = [];
      }
    }

    const fileName = `nehir-travel-islemsel-yedek-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.json`;
    downloadFile(JSON.stringify(operationalData, null, 2), fileName);
    
    console.log("İşlemsel veri dışa aktarma tamamlandı.");
    alert("İşlemsel veriler başarıyla dışa aktarıldı.");
  } catch (error) {
    console.error("İşlemsel veri dışa aktarma hatası:", error);
    alert(`Veri dışa aktarılırken bir hata oluştu: ${error.message}`);
  }
};

/**
 * İşlemsel verileri (Kayıtlar & İşlemler) içe aktarır.
 * @param {boolean} clearExistingData - Geri yüklemeden önce mevcut verileri silip silmeyeceği.
 */
export const importOperationalData = async (clearExistingData = true) => {
  console.log("İşlemsel veri içe aktarma başlatılıyor...");
  try {
    const fileContent = await selectFile();
    if (!fileContent) {
      console.log("Dosya seçimi iptal edildi.");
      alert("İçe aktarma iptal edildi.");
      return;
    }

    console.log("Dosya okundu, içerik parse ediliyor...");
    const importedData = JSON.parse(fileContent, rehydrateData);
    console.log("İçerik başarıyla parse edildi.");

    if (importedData.exportType !== 'NehirTravelOperationalData') {
      throw new Error("Bu dosya geçerli bir İşlemsel Veri yedeği değil.");
    }

    if (clearExistingData) {
      console.log("Mevcut işlemsel veriler temizleniyor...");
      try {
        await clearAllData();
        console.log("Mevcut veriler başarıyla temizlendi.");
      } catch (error) {
        console.error("Veri temizleme sırasında kritik hata:", error);
        alert(
          `Mevcut veriler temizlenirken bir hata oluştu: ${error.message}. Lütfen tekrar deneyin.`
        );
        return;
      }
    }

    console.log("Veriler Firestore'a yazılmaya başlanıyor...");
    const db = getDb();
    if (!db) {
      throw new Error("Firestore bağlantısı kurulamadı.");
    }

    // Her koleksiyon için verileri geri yükle
    for (const collectionName of Object.values(INDEXED_DB_STORES)) {
      if (importedData[collectionName] && Array.isArray(importedData[collectionName])) {
        console.log(`'${collectionName}' koleksiyonu için yazma işlemi hazırlanıyor...`);
        const items = importedData[collectionName];
        console.log(`'${collectionName}' koleksiyonuna ${items.length} adet doküman yazılacak.`);

        // Batch işlemini 500'lü parçalara böl
        for (let i = 0; i < items.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = items.slice(i, i + 500);

          chunk.forEach((item: any) => {
            if (item.id) {
              const docRef = doc(db, collectionName, item.id);
              const { id, ...dataToWrite } = item;
              // Timestamp alanlarını düzelt
              Object.keys(dataToWrite).forEach(key => {
                const val = dataToWrite[key];
                if (val && typeof val === 'object' && val.seconds !== undefined && val.nanoseconds !== undefined) {
                  dataToWrite[key] = new Timestamp(val.seconds, val.nanoseconds);
                }
              });
              batch.set(docRef, dataToWrite);
            }
          });

          try {
            await batch.commit();
            console.log(`'${collectionName}' koleksiyonu başarıyla yazıldı (parça ${i/500+1}).`);
          } catch (error) {
            console.error(`'${collectionName}' koleksiyonu yazılırken hata:`, error);
            alert(`'${collectionName}' verileri aktarılırken bir hata oluştu: ${error.message}`);
          }
        }
      }
    }

    console.log("İşlemsel veri içe aktarma tamamlandı.");
    alert(
      "İşlemsel veriler başarıyla içe aktarıldı. Değişiklikleri görmek için lütfen sayfayı yenileyin."
    );
  } catch (error) {
    console.error("İşlemsel veri içe aktarma hatası:", error);
    alert(`Veri içe aktarılırken bir hata oluştu: ${error.message}`);
  }
};
