"use client";

// Firebase ile veri işlemleri için yardımcı fonksiyonlar
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
// Firebase bağlantısını güvenli bir şekilde al (client modülünden)
import { getDb } from "./firebase-client-module";
import { getDatabase, ref, set, get } from "firebase/database";

// IndexedDB'deki STORES koleksiyonuna karşılık gelen koleksiyonlar
export const COLLECTIONS = {
  tours: "tours", 
  financials: "financials",
  DEBTS: "debts", // Borçlar - Büyük harfli anahtar, küçük harfli değer
  PAYMENTS: "payments", // Ödemeler - Büyük harfli anahtar, küçük harfli değer
  COMPANIES: "companies", // Tedarikçi firmalar - Büyük harfli anahtar, küçük harfli değer
  CUSTOMER_DEBTS: "customer_debts", // Müşteri borçları
  customers: "customers",
  settings: "settings",
  expenses: "expenses",
  providers: "providers",
  activities: "activities",
  destinations: "destinations",
  ai_conversations: "ai_conversations",
  customer_notes: "customer_notes",
  referral_sources: "referral_sources", 
  tourTemplates: "tourTemplates",
  periods: "periods", // Dönem verileri koleksiyonu eklendi
};

// UUID oluşturma fonksiyonu (IndexedDB'den aynısını kullanıyoruz)
export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Veri ekleme
export const addData = async (collectionName: string, data: any): Promise<string> => {
  try {
    // Firestore instance'ını al
    const firestore = getDb();
    if (!firestore) {
      throw new Error("Firestore instance'ına erişilemedi");
    }

    // ID özelliğine sahip verilerde setDoc kullan
    if (data.id) {
      const docRef = doc(firestore, collectionName, data.id);
      await setDoc(docRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return data.id;
    } 
    // ID özelliği olmayan verilerde addDoc kullan
    else {
      const colRef = collection(firestore, collectionName);
      const newData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(colRef, newData);
      return docRef.id;
    }
  } catch (error) {
    console.error(`${collectionName} verisini eklerken hata:`, error);
    throw error;
  }
};

// Veri güncelleme
export const updateData = async (collectionName: string, data: any): Promise<any> => {
  try {
    // Firestore instance'ını al
    const firestore = getDb();
    if (!firestore) {
      throw new Error("Firestore instance'ına erişilemedi");
    }

    if (!data.id) {
      throw new Error("Güncellenecek verinin id özelliği yok");
    }

    const docRef = doc(firestore, collectionName, data.id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return data;
  } catch (error) {
    console.error(`${collectionName} verisini güncellerken hata:`, error);
    throw error;
  }
};

// Veri silme
export const deleteData = async (collectionName: string, id: string): Promise<void> => {
  try {
    // Firestore instance'ını al
    const firestore = getDb();
    if (!firestore) {
      throw new Error("Firestore instance'ına erişilemedi");
    }
    
    const docRef = doc(firestore, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`${collectionName} verisini silerken hata:`, error);
    throw error;
  }
};

// Tüm verileri getir
export const getAllData = async (collectionName: string): Promise<any[]> => {
  try {
    // Firestore instance'ını al
    const firestore = getDb();
    if (!firestore) {
      throw new Error("Firestore instance'ına erişilemedi");
    }
    
    const colRef = collection(firestore, collectionName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
  } catch (error) {
    console.error(`${collectionName} verilerini alırken hata:`, error);
    return [];
  }
};

// ID ile veri getir
export const getDataById = async (collectionName: string, id: string): Promise<any> => {
  try {
    // Firestore instance'ını al
    const firestore = getDb();
    if (!firestore) {
      throw new Error("Firestore instance'ına erişilemedi");
    }
    
    const docRef = doc(firestore, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log(`${collectionName}/${id} verisi bulunamadı`);
      return null;
    }
  } catch (error) {
    console.error(`${collectionName}/${id} verisini alırken hata:`, error);
    return null;
  }
};

// Veri temizleme
export const clearCollection = async (collectionName: string): Promise<void> => {
  try {
    // Firestore instance'ını al
    const firestore = getDb();
    if (!firestore) {
      throw new Error("Firestore instance'ına erişilemedi");
    }
    
    const colRef = collection(firestore, collectionName);
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(firestore);
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`${collectionName} koleksiyonu temizlendi`);
  } catch (error) {
    console.error(`${collectionName} koleksiyonunu temizlerken hata:`, error);
    throw error;
  }
};

// Toplu veri kaydetme (migration için)
export const bulkSaveData = async (collectionName: string, dataList: any[]): Promise<void> => {
  try {
    // Firestore instance'ını al
    const firestore = getDb();
    if (!firestore) {
      throw new Error("Firestore instance'ına erişilemedi");
    }
    
    if (!dataList || dataList.length === 0) {
      console.log(`${collectionName} için boş veri listesi, işlem yapılmadı`);
      return;
    }

    // Batch işlemi maksimum 500 yazma işlemini destekler
    const batchSize = 450;
    let batch = writeBatch(firestore);
    let operationCount = 0;
    
    for (const data of dataList) {
      // Her veri için ID kontrol et
      const id = data.id || generateUUID();
      const docRef = doc(firestore, collectionName, id);
      
      batch.set(docRef, {
        ...data,
        id: id, // ID'yi ekleyerek tutarlılığı sağla
        updatedAt: serverTimestamp(),
        migratedAt: serverTimestamp(), // Migration tarihi
      });
      
      operationCount++;
      
      // Batch sınırına ulaşıldığında commit ve yeni batch başlat
      if (operationCount === batchSize) {
        console.log(`${collectionName}: ${operationCount} veri yazılıyor...`);
        await batch.commit();
        batch = writeBatch(firestore);
        operationCount = 0;
      }
    }
    
    // Kalan işlemleri commit et
    if (operationCount > 0) {
      console.log(`${collectionName}: Son ${operationCount} veri yazılıyor...`);
      await batch.commit();
    }
    
    console.log(`${collectionName}: Toplam ${dataList.length} veri başarıyla kaydedildi`);
  } catch (error) {
    console.error(`${collectionName} verilerini kaydederken hata:`, error);
    throw error;
  }
};

// IndexedDB verilerini Firestore'a taşıma (migration)
export const migrateToFirestore = async (exportedData: { [key: string]: any[] }): Promise<void> => {
  try {
    for (const [storeName, data] of Object.entries(exportedData)) {
      if (!data || !Array.isArray(data)) {
        console.log(`${storeName} için geçerli veri bulunamadı, atlanıyor...`);
        continue;
      }
      
      const collectionName = COLLECTIONS[storeName as keyof typeof COLLECTIONS] || storeName;
      
      console.log(`--- ${storeName} => ${collectionName} taşınıyor (${data.length} kayıt) ---`);
      
      if (data.length === 0) {
        console.log(`${storeName} boş, atlanıyor...`);
        continue;
      }
      
      await bulkSaveData(collectionName, data);
    }
    
    console.log("Firestore'a veri taşıma işlemi tamamlandı!");
  } catch (error) {
    console.error("Veri taşıma işlemi sırasında hata:", error);
    throw error;
  }
};

// Ayarları getir - IndexedDB uyumlu
export const getSettings = async (): Promise<any> => {
  try {
    // Önce "general" id'li ayarı almaya çalış
    const settings = await getDataById(COLLECTIONS.settings, "general");
    if (settings) return settings;

    // Eğer bulamazsan "app-settings" id'li ayarı dene (eski format için)
    const appSettings = await getDataById(COLLECTIONS.settings, "app-settings");
    if (appSettings) return appSettings;
    
    // Hiçbiri yoksa boş nesne dön
    return {};
  } catch (error) {
    console.error("Ayarlar alınırken hata:", error);
    return {};
  }
};

// Ayarları kaydet - IndexedDB uyumlu
export const saveSettings = async (settings: any): Promise<void> => {
  try {
    // Mevcut ayarları almaya çalış
    let currentSettings = await getDataById(COLLECTIONS.settings, "general");
    
    // Eğer "general" id'li döküman yoksa, yeni bir döküman oluştur
    if (!currentSettings) {
      console.log("Ayarlar dökümanı bulunamadı, yeni döküman oluşturuluyor...");
      
      const newSettings = {
        ...settings,
        id: "general",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Yeni dökümanı ekle
      await addData(COLLECTIONS.settings, newSettings);
      console.log("Yeni ayarlar dökümanı başarıyla oluşturuldu");
      return;
    }
    
    // Mevcut döküman varsa güncelle
    const updatedSettings = {
      ...currentSettings,
      ...settings,
      id: "general",
      updatedAt: serverTimestamp()
    };
    
    // Firestore'a kaydet
    await updateData(COLLECTIONS.settings, updatedSettings);
    console.log("Ayarlar dökümanı başarıyla güncellendi");
  } catch (error) {
    console.error("settings verisini güncellerken hata:", error);
    throw error;
  }
};

// Gider türlerini kaydet
export const saveExpenseTypes = async (expenseTypes: any[]): Promise<void> => {
  try {
    // Önce koleksiyonu temizle
    await clearCollection(COLLECTIONS.expenses);
    
    // Sonra yeni giderleri ekle
    await bulkSaveData(COLLECTIONS.expenses, expenseTypes);
  } catch (error) {
    console.error("Gider türleri kaydedilirken hata:", error);
    throw error;
  }
};

// Gider türlerini getir
export const getExpenseTypes = async (): Promise<any[]> => {
  return getAllData(COLLECTIONS.expenses);
};

// Sağlayıcıları kaydet
export const saveProviders = async (providers: any[]): Promise<void> => {
  try {
    await clearCollection(COLLECTIONS.providers);
    await bulkSaveData(COLLECTIONS.providers, providers);
  } catch (error) {
    console.error("Sağlayıcılar kaydedilirken hata:", error);
    throw error;
  }
};

// Sağlayıcıları getir
export const getProviders = async (): Promise<any[]> => {
  return getAllData(COLLECTIONS.providers);
};

// Aktiviteleri kaydet
export const saveActivities = async (activities: any[]): Promise<void> => {
  try {
    await clearCollection(COLLECTIONS.activities);
    await bulkSaveData(COLLECTIONS.activities, activities);
  } catch (error) {
    console.error("Aktiviteler kaydedilirken hata:", error);
    throw error;
  }
};

// Aktiviteleri getir
export const getActivities = async (): Promise<any[]> => {
  return getAllData(COLLECTIONS.activities);
};

// Destinasyonları kaydet
export const saveDestinations = async (destinations: any[]): Promise<void> => {
  try {
    await clearCollection(COLLECTIONS.destinations);
    await bulkSaveData(COLLECTIONS.destinations, destinations);
  } catch (error) {
    console.error("Destinasyonlar kaydedilirken hata:", error);
    throw error;
  }
};

// Destinasyonları getir
export const getDestinations = async (): Promise<any[]> => {
  return getAllData(COLLECTIONS.destinations);
};

// Referans kaynaklarını kaydet
export const saveReferralSources = async (sources: any[]): Promise<void> => {
  try {
    await clearCollection(COLLECTIONS.referral_sources);
    await bulkSaveData(COLLECTIONS.referral_sources, sources);
  } catch (error) {
    console.error("Referans kaynakları kaydedilirken hata:", error);
    throw error;
  }
};

// Referans kaynaklarını getir
export const getReferralSources = async (): Promise<any[]> => {
  return getAllData(COLLECTIONS.referral_sources);
};

// Tur şablonlarını kaydet - Firestore kullanarak (destinasyonlar gibi)
export const saveTourTemplates = async (tourTemplates: any[]): Promise<void> => {
  try {
    console.log(`Firestore'a ${tourTemplates.length} tur şablonu kaydediliyor...`);
    
    // Önce yerel depolamaya yedekleme
    try {
      localStorage.setItem('tourTemplates', JSON.stringify(tourTemplates));
      console.log('Tur şablonları localStorage\'a yedeklendi');
    } catch (localErr) {
      console.warn('localStorage yedeklemesi yapılamadı:', localErr);
    }

    // Destinasyonlarda kullanılan aynı metod: önce koleksiyonu temizle, sonra toplu kaydet
    await clearCollection(COLLECTIONS.tourTemplates);
    await bulkSaveData(COLLECTIONS.tourTemplates, tourTemplates);
    
    console.log(`${tourTemplates.length} tur şablonu Firestore'a başarıyla kaydedildi!`);
  } catch (error) {
    console.error('Tur şablonları Firestore\'a kaydedilirken hata:', error);
    
    // Hata durumunda localStorage'daki verileri koru
    try {
      localStorage.setItem('tourTemplates_backup', JSON.stringify(tourTemplates));
      console.warn('Tur şablonları sadece localStorage\'a kaydedilebildi (Firestore hatası)');
    } catch (localErr) {
      console.error('Tur şablonları yedeklenemedi:', localErr);
    }
    
    throw error;
  }
};

// Tur şablonlarını getir - Firestore kullanarak (destinasyonlar gibi)
export const getTourTemplates = async (): Promise<any[]> => {
  try {
    console.log('Firestore\'dan tur şablonları alınıyor...');
    return await getAllData(COLLECTIONS.tourTemplates);
  } catch (error) {
    console.error('Tur şablonları Firestore\'dan alınırken hata:', error);
    
    // Hata durumunda localStorage'dan okuma dene
    try {
      const localData = localStorage.getItem('tourTemplates');
      if (localData) {
        const parsedData = JSON.parse(localData);
        console.log(`Hata sonrası localStorage'dan ${parsedData.length} tur şablonu alındı`);
        return parsedData;
      }
      
      const backupData = localStorage.getItem('tourTemplates_backup');
      if (backupData) {
        const parsedBackupData = JSON.parse(backupData);
        console.log(`Hata sonrası yedek depodan ${parsedBackupData.length} tur şablonu alındı`);
        return parsedBackupData;
      }
    } catch (localErr) {
      console.error('localStorage\'dan tur şablonları alınamadı:', localErr);
    }
    
    return [];
  }
};

// Destinasyon ID'sine göre tur şablonlarını getir
export const getTourTemplatesByDestination = async (destinationId: string): Promise<any[]> => {
  try {
    console.log(`${destinationId} ID'li destinasyon için tur şablonları alınıyor`);
    const allTemplates = await getTourTemplates();
    
    // Destinasyon ID'sine göre filtrele
    const filteredTemplates = allTemplates.filter(template => 
      template.destinationId === destinationId
    );
    
    console.log(`${destinationId} ID'li destinasyon için ${filteredTemplates.length} tur şablonu bulundu`);
    return filteredTemplates;
  } catch (error) {
    console.error(`${destinationId} ID'li destinasyon için tur şablonları alınırken hata:`, error);
    return [];
  }
};

// ID'ye göre tur şablonu getir
export const getTourTemplate = async (id: string): Promise<any> => {
  try {
    // Doğrudan Firestore'dan getir
    return await getDataById(COLLECTIONS.tourTemplates, id);
  } catch (error) {
    console.error(`ID: ${id} olan tur şablonu alınırken hata:`, error);
    return null;
  }
};

// Turları kaydet
export const saveTours = async (tours: any[]): Promise<void> => {
  try {
    await clearCollection(COLLECTIONS.tours);
    await bulkSaveData(COLLECTIONS.tours, tours);
  } catch (error) {
    console.error("Turlar kaydedilirken hata:", error);
    throw error;
  }
};

// Tüm turları getir
export const getTours = async (): Promise<any[]> => {
  return getAllData(COLLECTIONS.tours);
};

// Firmaları getir
export const getCompanies = async (): Promise<any[]> => {
  try {
    const firestore = getDb();
    if (!firestore) {
      throw new Error("Firestore instance'ına erişilemedi");
    }
    
    const colRef = collection(firestore, COLLECTIONS.COMPANIES);
    const snapshot = await getDocs(colRef);
    
    // "deleted" tipindeki firmaları filtrele
    return snapshot.docs
      .map(doc => ({
        ...doc.data(),
        id: doc.id
      }))
      .filter(company => company.type !== "deleted"); // Silinen firmaları filtreleme
  } catch (error) {
    console.error(`Firma verileri alınırken hata:`, error);
    return [];
  }
};

// Admin kimlik bilgilerini alma
export async function getAdminCredentials() {
  try {
    // Firestore instance'ını al
    const firestore = getDb();
    if (!firestore) {
      throw new Error("Firestore instance'ına erişilemedi");
    }
    
    const docRef = doc(firestore, "admin", "credentials");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as { 
        username: string; 
        password: string;
        email: string;
      };
    } else {
      console.error("Admin kimlik bilgileri bulunamadı");
      return { username: "", password: "", email: "" };
    }
  } catch (error) {
    console.error("Admin bilgilerini alma hatası:", error);
    return { username: "", password: "", email: "" };
  }
}

// Admin kullanıcı adını güncelleme
export async function updateAdminUsername(newUsername: string) {
  try {
    // Firestore instance'ını al
    const firestore = getDb();
    if (!firestore) {
      throw new Error("Firestore instance'ına erişilemedi");
    }
    
    const docRef = doc(firestore, "admin", "credentials");
    await updateDoc(docRef, {
      username: newUsername,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Admin kullanıcı adı güncelleme hatası:", error);
    return { success: false, error };
  }
}

// Admin şifresini güncelleme
export async function updateAdminPassword(newPassword: string) {
  try {
    // Firestore instance'ını al
    const firestore = getDb();
    if (!firestore) {
      throw new Error("Firestore instance'ına erişilemedi");
    }
    
    const docRef = doc(firestore, "admin", "credentials");
    await updateDoc(docRef, {
      password: newPassword,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Admin şifre güncelleme hatası:", error);
    return { success: false, error };
  }
}

// Admin e-posta adresini kontrol etme
export async function verifyAdminEmail(email: string) {
  try {
    const adminData = await getAdminCredentials();
    return { success: true, isValid: email.toLowerCase() === adminData.email.toLowerCase() };
  } catch (error) {
    console.error("Admin e-posta doğrulama hatası:", error);
    return { success: false, isValid: false, error };
  }
}

// Oturum versiyon sistemi için fonksiyonlar
// Geçerli oturum versiyonunu alma
export async function getSessionVersion() {
  try {
    // Firestore instance'ını al
    const firestore = getDb();
    if (!firestore) {
      throw new Error("Firestore instance'ına erişilemedi");
    }
    
    const docRef = doc(firestore, "admin", "session_config");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().version || 1;
    } else {
      // İlk çalıştırmada versiyon kaydı yoksa oluştur
      await setDoc(docRef, {
        version: 1,
        lastReset: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      return 1;
    }
  } catch (error) {
    console.error("Oturum versiyonu alma hatası:", error);
    return 1; // Hata durumunda varsayılan versiyon
  }
}

// Oturum versiyonunu arttır - tüm aktif oturumları geçersiz kılar
export async function incrementSessionVersion() {
  try {
    // Firestore instance'ını al
    const firestore = getDb();
    if (!firestore) {
      throw new Error("Firestore instance'ına erişilemedi");
    }
    
    const docRef = doc(firestore, "admin", "session_config");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const currentVersion = docSnap.data().version || 1;
      await updateDoc(docRef, {
        version: currentVersion + 1,
        lastReset: serverTimestamp(),
      });
      return { success: true, newVersion: currentVersion + 1 };
    } else {
      // Kayıt yoksa oluştur
      await setDoc(docRef, {
        version: 2, // İlk sıfırlamada 2'ye ayarla
        lastReset: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      return { success: true, newVersion: 2 };
    }
  } catch (error) {
    console.error("Oturum sıfırlama hatası:", error);
    return { success: false, error };
  }
}
