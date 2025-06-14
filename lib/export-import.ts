// Verileri dışa aktarma
export const exportData = async () => {
  try {
    // Tüm verileri topla
    const financialData = localStorage.getItem("financialData")
    const toursData = localStorage.getItem("toursData")
    const customerData = localStorage.getItem("customerData")
    const companyInfo = localStorage.getItem("companyInfo")
    const preferences = localStorage.getItem("preferences")
    const destinations = localStorage.getItem("destinations")
    const activities = localStorage.getItem("activities")
    const providers = localStorage.getItem("providers")
    const expenseTypes = localStorage.getItem("expenseTypes")

    const exportData = {
      financialData: financialData ? JSON.parse(financialData) : [],
      toursData: toursData ? JSON.parse(toursData) : [],
      customerData: customerData ? JSON.parse(customerData) : [],
      companyInfo: companyInfo ? JSON.parse(companyInfo) : {},
      preferences: preferences ? JSON.parse(preferences) : {},
      destinations: destinations ? JSON.parse(destinations) : [],
      activities: activities ? JSON.parse(activities) : [],
      providers: providers ? JSON.parse(providers) : [],
      expenseTypes: expenseTypes ? JSON.parse(expenseTypes) : [],
      exportDate: new Date().toISOString(),
    }

    // JSON dosyasını oluştur
    const dataStr = JSON.stringify(exportData, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    // Dosyayı indir
    const exportFileDefaultName = `passionistour_backup_${new Date().toISOString().split("T")[0]}.json`
    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()

    return true
  } catch (error) {
    console.error("Dışa aktarma hatası:", error)
    throw error
  }
}

// Verileri içe aktarma
export const importData = async () => {
  return new Promise((resolve, reject) => {
    try {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = ".json"

      input.onchange = (e) => {
        const file = e.target.files[0]
        if (!file) {
          reject(new Error("Dosya seçilmedi"))
          return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result)

            // Verileri doğrula
            if (!data.financialData || !data.toursData) {
              reject(new Error("Geçersiz yedek dosyası"))
              return
            }

            // Verileri kaydet
            localStorage.setItem("financialData", JSON.stringify(data.financialData))
            localStorage.setItem("toursData", JSON.stringify(data.toursData))
            
            if (data.customerData) {
              localStorage.setItem("customerData", JSON.stringify(data.customerData))
            }

            if (data.companyInfo) {
              localStorage.setItem("companyInfo", JSON.stringify(data.companyInfo))
            }

            if (data.preferences) {
              localStorage.setItem("preferences", JSON.stringify(data.preferences))
            }
            
            if (data.destinations) {
              localStorage.setItem("destinations", JSON.stringify(data.destinations))
            }
            
            if (data.activities) {
              localStorage.setItem("activities", JSON.stringify(data.activities))
            }
            
            if (data.providers) {
              localStorage.setItem("providers", JSON.stringify(data.providers))
            }
            
            if (data.expenseTypes) {
              localStorage.setItem("expenseTypes", JSON.stringify(data.expenseTypes))
            }

            resolve(true)
          } catch (error) {
            reject(new Error("Dosya ayrıştırma hatası: " + error.message))
          }
        }

        reader.onerror = () => {
          reject(new Error("Dosya okuma hatası"))
        }

        reader.readAsText(file)
      }

      input.click()
    } catch (error) {
      reject(error)
    }
  })
}

// IndexedDB verilerini dışa aktarma ve Firebase'e içe aktarma yardımcı fonksiyonları
import { openDB, getAllData } from './db';

// Tüm veritabanı depolarını dışa aktarma işlemi
export const exportAllData = async (): Promise<{ [key: string]: any[] }> => {
  // DB_NAME ve STORES değerlerini db.ts dosyasından alıyoruz 
  const DB_NAME = "passionistravelDB";
  const STORES = {
    tours: { keyPath: "id", indexes: ["customerName", "tourDate"] },
    financials: { keyPath: "id", indexes: ["date", "type"] },
    customers: { keyPath: "id", indexes: ["name", "phone"] },
    settings: { keyPath: "id" },
    expenses: { keyPath: "id", indexes: ["type", "name"] },
    providers: { keyPath: "id", indexes: ["name", "category"] },
    activities: { keyPath: "id", indexes: ["name"] },
    destinations: { keyPath: "id", indexes: ["name", "country"] },
    ai_conversations: { keyPath: "id", indexes: ["timestamp"] },
    customer_notes: { keyPath: "id", indexes: ["customerId", "timestamp"] },
    referral_sources: { keyPath: "id", indexes: ["name", "type"] },
    tourTemplates: { keyPath: "id", indexes: ["name", "destinationId"] },
  };

  try {
    const db = await openDB();
    const result: { [key: string]: any[] } = {};

    // Her bir veri deposunu dışa aktar
    for (const storeName of Object.keys(STORES)) {
      if (db.objectStoreNames.contains(storeName)) {
        console.log(`${storeName} deposundan veriler alınıyor...`);
        const data = await getAllData(storeName);
        result[storeName] = data;
        console.log(`${storeName}: ${data.length} kayıt alındı`);
      } else {
        console.log(`${storeName} deposu veritabanında bulunamadı.`);
        result[storeName] = [];
      }
    }

    return result;
  } catch (error) {
    console.error("Veri dışa aktarma hatası:", error);
    throw error;
  }
};

// Dışa aktarılan JSON verisini dosyaya indirme
export const downloadJSON = (data: any, fileName = 'indexeddb-export.json') => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // İndirme bağlantısı oluştur
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  
  // URL'i serbest bırak
  URL.revokeObjectURL(url);
};

// Bu fonksiyonu tarayıcıda çalıştıracağız
export const exportAndDownload = async () => {
  try {
    console.log("IndexedDB verilerini dışa aktarma başladı...");
    const data = await exportAllData();
    downloadJSON(data, 'passionisdb-export.json');
    console.log("Veriler başarıyla dışa aktarıldı ve indirildi!");
    return data; // Konsol üzerinde veriyi görmek için döndür
  } catch (error) {
    console.error("Veri dışa aktarma ve indirme hatası:", error);
    throw error;
  }
};

// Veri yükleme yardımcısı (daha sonra Firebase'e veri aktarımı için)
export const loadJSONFromFile = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const data = JSON.parse(result);
        resolve(data);
      } catch (error) {
        reject(new Error('JSON dosyası ayrıştırma hatası'));
      }
    };
    
    reader.onerror = () => reject(new Error('Dosya okuma hatası'));
    
    reader.readAsText(file);
  });
};

