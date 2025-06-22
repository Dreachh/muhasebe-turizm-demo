// IndexedDB'den Firebase Firestore'a geçiş için yönlendirme modülü
// Bu dosya, mevcut IndexedDB fonksiyonlarını Firebase'e yönlendirir

import {
  addData as addFirestoreData,
  updateData as updateFirestoreData,
  deleteData as deleteFirestoreData,
  getAllData as getAllFirestoreData,
  getDataById as getFirestoreDataById,
  clearCollection,
  getSettings as getFirestoreSettings,
  saveSettings as saveFirestoreSettings,
  getExpenseTypes as getFirestoreExpenseTypes,
  saveExpenseTypes as saveFirestoreExpenseTypes,
  getProviders as getFirestoreProviders,
  saveProviders as saveFirestoreProviders,
  getActivities as getFirestoreActivities,
  saveActivities as saveFirestoreActivities,
  getDestinations as getFirestoreDestinations,
  saveDestinations as saveFirestoreDestinations,
  getReferralSources as getFirestoreReferralSources,
  saveReferralSources as saveFirestoreReferralSources,
  getTourTemplates as getFirestoreTourTemplates,
  saveTourTemplates as saveFirestoreTourTemplates,  getTourTemplate as getFirestoreTourTemplate,
  getCompanies as getFirestoreCompanies,
  getTourTemplatesByDestination as getFirestoreTourTemplatesByDestination,
  getTours as getFirestoreTours,
  saveTours as saveFirestoreTours,
  generateUUID
} from "./db-firebase";

import { COLLECTIONS } from "./db-firebase";

// Veritabanı adı ve sürümü (eski bilgileri koruyoruz)
const DB_NAME = "nehirtravelDB";
const DB_VERSION = 3;

// Store konfigürasyonu için arayüz tanımlaması (eski tanımlamaları koruyoruz)
interface StoreConfig {
  keyPath: string;
  indexes?: string[];
}

// Store'ların koleksiyonu için arayüz tanımlaması
interface StoreCollection {
  [key: string]: StoreConfig;
}

// Veritabanı şeması (eski tanımlamaları koruyoruz)
const STORES: StoreCollection = {
  tours: { keyPath: "id", indexes: ["customerName", "tourDate"] },
  financials: { keyPath: "id", indexes: ["date", "type"] },
  customers: { keyPath: "id", indexes: ["name", "phone"] },
  settings: { keyPath: "id" },
  expenses: { keyPath: "id", indexes: ["type", "name"] },
  providers: { keyPath: "id", indexes: ["name", "category"] },  activities: { keyPath: "id", indexes: ["name"] },
  destinations: { keyPath: "id", indexes: ["name", "country"] },
  ai_conversations: { keyPath: "id", indexes: ["timestamp"] },
  customer_notes: { keyPath: "id", indexes: ["customerId", "timestamp"] },
  referral_sources: { keyPath: "id", indexes: ["name", "type"] },
  tourTemplates: { keyPath: "id", indexes: ["name", "destinationId"] },
  periods: { keyPath: "id", indexes: ["year", "month"] },
};

// Veritabanını başlat (Firebase için bir uyarlama)
export const initializeDB = async (): Promise<void> => {
  try {
    console.log("Firebase veritabanı başlatıldı.");
    return Promise.resolve();
  } catch (error) {
    console.error("Firebase başlatılırken hata:", error);
    throw error;
  }
};

// IndexedDB veritabanını açma fonksiyonunu yeniden tanımlıyoruz
// Bu fonksiyon artık sadece geriye dönük uyumluluk için burada duruyor
export const openDB = (): Promise<any> => {
  console.warn("Firebase kullanıldığından openDB fonksiyonu artık gerekli değil");
  return Promise.resolve(null);
};

// Veri ekleme
export const addData = async (storeName: string, data: any): Promise<any> => {
  // Firebase koleksiyon adını bul
  const collectionName = COLLECTIONS[storeName as keyof typeof COLLECTIONS] || storeName;
  
  try {
    return await addFirestoreData(collectionName, data);
  } catch (error) {
    console.error(`${storeName} verisini eklerken hata:`, error);
    
    // Hata durumunda localStorage'a kaydetme yedeklemesini korudum
    try {
      const storageKey = `${storeName}_backup`;
      const existingData = localStorage.getItem(storageKey);
      const parsedData = existingData ? JSON.parse(existingData) : [];
      
      // Verileri ekle
      parsedData.push(data);
      
      // localStorage'a kaydet
      localStorage.setItem(storageKey, JSON.stringify(parsedData));
      console.log(`Veri localStorage'a kaydedildi: ${storeName}`);
      return data;
    } catch (storageError) {
      console.error(`localStorage'a kaydetme hatası:`, storageError);
      throw error;
    }
  }
};

// Veri güncelleme
export const updateData = async (storeName: string, data: any): Promise<any> => {
  // Firebase koleksiyon adını bul
  const collectionName = COLLECTIONS[storeName as keyof typeof COLLECTIONS] || storeName;
  
  try {
    return await updateFirestoreData(collectionName, data);
  } catch (error) {
    console.error(`${storeName} verisini güncellerken hata:`, error);
    
    // IndexedDB başarısız olursa localStorage'a kaydet (eski yedekleme davranışını koruyoruz)
    try {
      const storageKey = `${storeName}_backup`;
      const existingData = localStorage.getItem(storageKey);
      let parsedData = existingData ? JSON.parse(existingData) : [];
      
      // Mevcut kaydı güncelle
      parsedData = parsedData.map((item: any) => 
        item.id === data.id ? data : item
      );
      
      // localStorage'a kaydet
      localStorage.setItem(storageKey, JSON.stringify(parsedData));
      console.log(`Veri localStorage'da güncellendi: ${storeName}`);
      return data;
    } catch (storageError) {
      console.error(`localStorage güncelleme hatası:`, storageError);
      throw error;
    }
  }
};

// Veri silme
export const deleteData = async (storeName: string, id: string): Promise<void> => {
  const collectionName = COLLECTIONS[storeName as keyof typeof COLLECTIONS] || storeName;
  
  try {
    return await deleteFirestoreData(collectionName, id);
  } catch (error) {
    console.error(`${storeName} verisini silerken hata:`, error);
    throw error;
  }
};

// Tüm verileri getir
export const getAllData = async (storeName: string): Promise<any[]> => {
  const collectionName = COLLECTIONS[storeName as keyof typeof COLLECTIONS] || storeName;
  
  try {
    return await getAllFirestoreData(collectionName);
  } catch (error) {
    console.error(`${storeName} verilerini alırken hata:`, error);
    
    // Firebase başarısız olursa localStorage'dan dene (eski davranışı koruyoruz)
    try {
      const storageKey = `${storeName}_backup`;
      const data = localStorage.getItem(storageKey);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error(`localStorage'dan veriler alınırken hata:`, e);
    }
    
    return [];
  }
};

// ID ile veri getir
export const getDataById = async (storeName: string, id: string): Promise<any> => {
  const collectionName = COLLECTIONS[storeName as keyof typeof COLLECTIONS] || storeName;
  
  try {
    return await getFirestoreDataById(collectionName, id);
  } catch (error) {
    console.error(`${storeName} verisi alınırken hata:`, error);
    throw error;
  }
};

// Veritabanını temizle
export const clearStore = async (storeName: string): Promise<void> => {
  const collectionName = COLLECTIONS[storeName as keyof typeof COLLECTIONS] || storeName;
  
  try {
    return await clearCollection(collectionName);
  } catch (error) {
    console.error(`Veri deposu temizleme hatası (${storeName}):`, error);
    throw error;
  }
};

// Local Storage yardımcı fonksiyonları (eski davranışı koruyoruz)
const loadFromLocalStorage = (key: string): any[] => {
  if (typeof localStorage !== "undefined") {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }
  return [];
};

const saveToLocalStorage = (key: string, data: any[]): void => {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

// Ayarları getir
export const getSettings = async (): Promise<any> => {
  try {
    return await getFirestoreSettings();
  } catch (error) {
    console.error("Ayarlar alınırken hata:", error);
    
    // Son çare olarak localStorage'a bakalım (eski davranışı koruyoruz)
    try {
      const localSettings = localStorage.getItem("app_settings");
      return localSettings ? JSON.parse(localSettings) : {};
    } catch (e) {
      console.error("LocalStorage'dan ayarlar alınamadı:", e);
      return {};
    }
  }
};

// Ayarları kaydet
export const saveSettings = async (settings: any): Promise<void> => {
  try {
    await saveFirestoreSettings(settings);
    
    // Yedek olarak localStorage'a da kaydet (eski davranışı koruyoruz)
    localStorage.setItem("app_settings", JSON.stringify(settings));
  } catch (error) {
    console.error("Ayarlar kaydedilirken hata:", error);
    
    // Hata durumunda en azından localStorage'a kaydedelim
    try {
      const currentSettings = await getSettings();
      const updatedSettings = {
        ...currentSettings,
        ...settings,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem("app_settings", JSON.stringify(updatedSettings));
    } catch (e) {
      console.error("Ayarlar localStorage'a da kaydedilemedi:", e);
    }
    
    throw error;
  }
};

// Gider türlerini kaydet
export const saveExpenseTypes = async (expenseTypes: any[]): Promise<void> => {
  return saveFirestoreExpenseTypes(expenseTypes);
};

// Gider türlerini getir
export const getExpenseTypes = async (): Promise<any[]> => {
  return getFirestoreExpenseTypes();
};

// Sağlayıcıları kaydet
export const saveProviders = async (providers: any[]): Promise<void> => {
  return saveFirestoreProviders(providers);
};

// Sağlayıcıları getir
export const getProviders = async (): Promise<any[]> => {
  return getFirestoreProviders();
};

// Aktiviteleri kaydet
export const saveActivities = async (activities: any[]): Promise<void> => {
  return saveFirestoreActivities(activities);
};

// Aktiviteleri getir
export const getActivities = async (): Promise<any[]> => {
  return getFirestoreActivities();
};

// Destinasyonları kaydet
export const saveDestinations = async (destinations: any[]): Promise<void> => {
  return saveFirestoreDestinations(destinations);
};

// Destinasyonları getir
export const getDestinations = async (): Promise<any[]> => {
  return getFirestoreDestinations();
};

// Referans kaynaklarını kaydet
export const saveReferralSources = async (sources: any[]): Promise<void> => {
  return saveFirestoreReferralSources(sources);
};

// Referans kaynaklarını getir
export const getReferralSources = async (): Promise<any[]> => {
  return getFirestoreReferralSources();
};

// Turları kaydet
export const saveTours = async (tours: any[]): Promise<void> => {
  return saveFirestoreTours(tours);
};

// Tüm turları getir
export const getTours = async (): Promise<any[]> => {
  return getFirestoreTours();
};

// Firmaları getir
export const getCompanies = async (): Promise<any[]> => {
  return getFirestoreCompanies();
};

// Destinasyona göre turları getir
export const getToursByDestination = async (destinationId: string): Promise<any[]> => {
  try {
    if (!destinationId) return [];
    
    const allTours = await getTours();
    // Belirtilen destinasyona ait turları filtrele
    return allTours.filter((tour) => tour.destinationId === destinationId);
  } catch (error) {
    console.error(`Destinasyon (${destinationId}) için turlar alınırken hata:`, error);
    
    // LocalStorage'dan yüklemeyi dene (eski davranışı koruyoruz)
    try {
      const localTours = loadFromLocalStorage("tours");
      return localTours.filter((tour: any) => tour.destinationId === destinationId);
    } catch (storageError) {
      console.error("LocalStorage'dan turlar yüklenemedi:", storageError);
      return [];
    }
  }
};

// Destinasyona ait turları getir
export const getTourTemplatesByDestination = async (destinationId: string): Promise<any[]> => {
  return getFirestoreTourTemplatesByDestination(destinationId);
};

// Tüm turları getir
export const getTourTemplates = async (): Promise<any[]> => {
  return getFirestoreTourTemplates();
};

// Turları kaydet
export const saveTourTemplates = async (tourTemplates: any[]): Promise<void> => {
  return saveFirestoreTourTemplates(tourTemplates);
};

// Tek bir tur şablonu getir
export const getTourTemplate = async (id: string): Promise<any> => {
  return getFirestoreTourTemplate(id);
};

// ID üretici fonksiyonunu dışa aktarıyoruz
export { generateUUID };

// ==================== REZERVASYON SİSTEMİ FONKSİYONLARI ====================

// Rezervasyon sistemini db-firebase'den import et
import {
  getReservations as getFirestoreReservations,  saveReservation as saveFirestoreReservation,
  deleteReservation as deleteFirestoreReservation,
  getReservationById as getFirestoreReservationById,
  updateReservation as updateFirestoreReservation,
  getReservationSettings as getFirestoreReservationSettings,
  saveReservationSettings as saveFirestoreReservationSettings,
  getNextSerialNumber as getFirestoreNextSerialNumber,
  incrementSerialNumber as incrementFirestoreSerialNumber,
  updateSerialSettings as updateFirestoreSerialSettings
} from "./db-firebase";

// Rezervasyon CRUD işlemleri
export const getReservations = async (): Promise<any[]> => {
  return getFirestoreReservations();
};

export const saveReservation = async (reservation: any): Promise<boolean> => {
  return saveFirestoreReservation(reservation);
};

export const getReservationById = async (id: string): Promise<any | null> => {
  return getFirestoreReservationById(id);
};

export const updateReservation = async (id: string, reservation: any): Promise<boolean> => {
  return updateFirestoreReservation(id, reservation);
};

export const deleteReservation = async (id: string): Promise<boolean> => {
  return deleteFirestoreReservation(id);
};

// Rezervasyon ayarları
export const getReservationSettings = async (type: string): Promise<any[]> => {
  return getFirestoreReservationSettings(type);
};

export const saveReservationSettings = async (type: string, data: any[]): Promise<boolean> => {
  return saveFirestoreReservationSettings(type, data);
};

// Seri numarası işlemleri
export const getNextSerialNumber = async (): Promise<string> => {
  return getFirestoreNextSerialNumber();
};

export const incrementSerialNumber = async (): Promise<void> => {
  return incrementFirestoreSerialNumber();
};

export const updateSerialSettings = async (settings: any): Promise<boolean> => {
  return updateFirestoreSerialSettings(settings);
};
