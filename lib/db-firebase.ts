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
export const COLLECTIONS = {  // Ana veri koleksiyonları
  tours: "tours", 
  financials: "financials",
  customers: "customers",
  settings: "settings",
  expenses: "expenses",
  providers: "providers",
  activities: "activities",
  destinations: "destinations",
  reservationDestinations: "reservationDestinations",
  
  // Borç ve ödeme yönetimi
  DEBTS: "debts", 
  PAYMENTS: "payments", 
  COMPANIES: "companies", 
  CUSTOMER_DEBTS: "customer_debts", 
  
  // Diğer yardımcı koleksiyonlar
  ai_conversations: "ai_conversations",
  customer_notes: "customer_notes",
  referral_sources: "referral_sources", 
  tourTemplates: "tourTemplates",
  periods: "periods",
    // Rezervasyon sistemi koleksiyonları (ana koleksiyonlar)
  reservations: "reservations",
  countries: "countries",
  paymentMethods: "paymentMethods",
  paymentStatuses: "paymentStatuses",
  serialSettings: "serialSettings",
  
  // Rezervasyon ayar koleksiyonları
  reservationCompanies: "reservationCompanies",
  pickupTypes: "pickupTypes",
  referenceSources: "referenceSources",
  
  // Rezervasyon cari koleksiyonları
  reservation_cari: "reservation_cari",
  reservation_cari_payments: "reservation_cari_payments",
  reservation_cari_borclar: "reservation_cari_borclar",
  reservation_cari_odemeler: "reservation_cari_odemeler",
  
  // DEPRECATED: Aşağıdaki koleksiyonlar artık kullanılmıyor
  // Bunları Firebase'den manuel olarak silin:
  // - masraflar (expenses kullanılıyor)
  // - finansallar (financials kullanılıyor)
  // - odemeler (payments kullanılıyor)
  // - pikapTurleri (pickupTypes kullanılıyor) 
  // - saglayicilar (providers kullanılıyor)
  // - seriyeadlari (serialSettings kullanılıyor)
  // - turSablonlari (tourTemplates kullanılıyor)
  // - turlar (tours kullanılıyor)
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
      .filter((company: any) => company.type !== "deleted"); // Silinen firmaları filtreleme
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
      await setDoc(docRef, {
        version: 2,
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

// ==================== REZERVASYON SİSTEMİ FONKSİYONLARI ====================

// Rezervasyon CRUD işlemleri
export async function getReservations(): Promise<any[]> {
  try {
    const firestore = getDb();
    if (!firestore) {
      console.warn("Firestore erişilemedi");
      return [];
    }

    const q = query(collection(firestore, COLLECTIONS.reservations), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    // Destinasyonları bir kere al
    const destinations = await getReservationDestinations();
    const destinationMap = new Map(destinations.map(d => [d.id, d.name]));

    const reservations = querySnapshot.docs.map(doc => {
      const reservationData = doc.data();
      // destinasyon veya destinationId alanını kontrol et
      const destId = reservationData.destinasyon || reservationData.destinationId;
      const destinationName = destinationMap.get(destId) || destId || "Belirlenmemiş";
      return {
        id: doc.id,
        ...reservationData,
        destinationName: destinationName, // Destinasyon adını ekle
      };
    });

    return reservations;
  } catch (error) {
    console.error("Rezervasyonlar alınırken hata:", error);
    return [];
  }
}

export async function saveReservation(reservation: any): Promise<boolean> {
  try {
    const firestore = getDb();
    if (!firestore) {
      console.warn("Firestore erişilemedi");
      return false;
    }

    if (reservation.id) {
      await updateDoc(doc(firestore, COLLECTIONS.reservations, reservation.id), {
        ...reservation,
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(firestore, COLLECTIONS.reservations), {
        ...reservation,
        createdAt: serverTimestamp()
      });
    }

    return true;
  } catch (error) {
    console.error("Rezervasyon kaydedilirken hata:", error);
    return false;
  }
}

export async function deleteReservation(id: string): Promise<boolean> {
  try {
    const firestore = getDb();
    if (!firestore) {
      const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
      const filtered = reservations.filter((r: any) => r.id !== id);
      localStorage.setItem('reservations', JSON.stringify(filtered));
      return true;
    }

    // Önce rezervasyon cari kayıtlarını temizle
    try {
      const { ReservationCariService } = await import('./reservation-cari-service');
      await ReservationCariService.deleteReservationFromCari(id);
    } catch (cariError) {
      console.warn("Rezervasyon cari temizliği sırasında uyarı:", cariError);
      // Cari temizliği başarısız olsa da rezervasyon silme işlemine devam et
    }

    // Rezervasyonu sil
    await deleteDoc(doc(firestore, COLLECTIONS.reservations, id));
    return true;
  } catch (error) {
    console.error("Rezervasyon silinirken hata:", error);
    return false;
  }
}

// Rezervasyon ayarları CRUD işlemleri
export async function getReservationSettings(type: string): Promise<any[]> {
  try {
    console.log(`getReservationSettings çağrıldı, type: ${type}`);
    
    const firestore = getDb();
    if (!firestore) {
      console.log('Firebase bağlantısı yok, localStorage\'dan alınıyor');
      return getLocalFallbackData(type);
    }

    // Type mapping - doğru koleksiyon adlarını kullan
    const typeMapping: Record<string, string> = {
      destinations: 'destinations',
      companies: 'reservationCompanies',
      pickupTypes: 'pickupTypes',
      countries: 'countries',
      paymentMethods: 'paymentMethods',
      paymentStatuses: 'paymentStatuses',
      referenceSources: 'referenceSources'
    };

    const collectionName = typeMapping[type] || type;
    console.log(`Koleksiyon adı: ${collectionName}`);
    
    if (!COLLECTIONS[collectionName as keyof typeof COLLECTIONS]) {
      console.warn(`Koleksiyon COLLECTIONS objesinde bulunamadı: ${collectionName}`);
      return getLocalFallbackData(type);
    }

    try {
      const q = query(collection(firestore, COLLECTIONS[collectionName as keyof typeof COLLECTIONS] as string));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`${type} için ${data.length} kayıt bulundu`);
      
      // Eğer koleksiyon boşsa, örnek verileri oluştur
      if (data.length === 0) {
        console.log(`${type} koleksiyonu boş, örnek veriler oluşturuluyor...`);
        const sampleData = getSampleData(type);
        await createSampleDataInFirestore(collectionName, sampleData);
        localStorage.setItem(`reservation_${type}`, JSON.stringify(sampleData));
        return sampleData;
      }

      localStorage.setItem(`reservation_${type}`, JSON.stringify(data));
      return data;
    } catch (firestoreError) {
      console.error(`Firestore'dan ${type} alınırken hata:`, firestoreError);
      return getLocalFallbackData(type);
    }
  } catch (error) {
    console.error(`Rezervasyon ${type} alınırken genel hata:`, error);
    return getLocalFallbackData(type);
  }
}

// Local fallback data fonksiyonu
function getLocalFallbackData(type: string): any[] {
  const localData = JSON.parse(localStorage.getItem(`reservation_${type}`) || '[]');
  if (localData.length > 0) {
    console.log(`${type} için localStorage\'dan ${localData.length} kayıt alındı`);
    return localData;
  }
  
  console.log(`${type} için örnek veriler döndürülüyor`);
  return getSampleData(type);
}

// Örnek veriler fonksiyonu
function getSampleData(type: string): any[] {
  switch (type) {
    case 'pickupTypes':
      return [
        { id: 'hotel', name: 'Otel', value: 'hotel' },
        { id: 'airport', name: 'Havalimanı', value: 'airport' },
        { id: 'other', name: 'Diğer', value: 'other' }
      ];
    
    case 'companies':
      return [
        { id: 'comp1', name: 'Aracı Firma 1', value: 'comp1' },
        { id: 'comp2', name: 'Aracı Firma 2', value: 'comp2' }
      ];
    
    case 'paymentMethods':
      return [
        { id: 'cash', name: 'Nakit', value: 'cash' },
        { id: 'card', name: 'Kredi Kartı', value: 'card' },
        { id: 'transfer', name: 'Havale', value: 'transfer' }
      ];
    
    case 'paymentStatuses':
      return [
        { id: 'paid', name: 'Ödendi', value: 'paid' },
        { id: 'pending', name: 'Beklemede', value: 'pending' },
        { id: 'partial', name: 'Kısmi Ödeme', value: 'partial' }
      ];
    
    case 'referenceSources':
      return [
        { id: 'website', name: 'Web Sitesi', value: 'website' },
        { id: 'social', name: 'Sosyal Medya', value: 'social' },
        { id: 'referral', name: 'Tavsiye', value: 'referral' }
      ];
    
    case 'countries':
      return [
        { id: 'tr', name: 'Türkiye', value: 'tr' },
        { id: 'de', name: 'Almanya', value: 'de' },
        { id: 'us', name: 'ABD', value: 'us' }
      ];
    
    default:
      return [];
  }
}

// Firestore'da örnek veri oluşturma fonksiyonu
async function createSampleDataInFirestore(collectionName: string, sampleData: any[]): Promise<void> {
  try {
    const firestore = getDb();
    if (!firestore || sampleData.length === 0) return;

    const batch = writeBatch(firestore);
    const collectionRef = collection(firestore, COLLECTIONS[collectionName as keyof typeof COLLECTIONS] as string);
    
    sampleData.forEach((item) => {
      const docRef = doc(collectionRef, item.id);
      batch.set(docRef, {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
    console.log(`${collectionName} koleksiyonuna ${sampleData.length} örnek kayıt eklendi`);
  } catch (error) {
    console.error(`${collectionName} koleksiyonuna örnek veri eklenirken hata:`, error);
  }
}

export async function saveReservationSettings(type: string, data: any[]): Promise<boolean> {
  try {
    const firestore = getDb();
    if (!firestore) {
      localStorage.setItem(`reservation_${type}`, JSON.stringify(data));
      return true;
    }

    // Type mapping - doğru koleksiyon adlarını kullan
    const typeMapping: Record<string, string> = {
      destinations: 'destinations',
      companies: 'reservationCompanies',
      pickupTypes: 'pickupTypes',
      countries: 'countries',
      paymentMethods: 'paymentMethods',
      paymentStatuses: 'paymentStatuses',
      referenceSources: 'referenceSources'
    };

    const collectionName = typeMapping[type] || type;
    if (!COLLECTIONS[collectionName as keyof typeof COLLECTIONS]) {
      console.warn(`Koleksiyon bulunamadı: ${collectionName}`);
      localStorage.setItem(`reservation_${type}`, JSON.stringify(data));
      return true;
    }

    const batch = writeBatch(firestore);
    const colRef = collection(firestore, COLLECTIONS[collectionName as keyof typeof COLLECTIONS] as string);

    // Mevcut verileri sil
    const existingDocs = await getDocs(colRef);
    existingDocs.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Yeni verileri ekle
    data.forEach(item => {
      const docRef = doc(colRef, item.id);
      batch.set(docRef, {
        ...item,
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
    localStorage.setItem(`reservation_${type}`, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Rezervasyon ${type} kaydedilirken hata:`, error);
    return false;
  }
}

// Seri numarası yönetimi
export async function getNextSerialNumber(): Promise<string> {
  try {
    const firestore = getDb();
    if (!firestore) {
      const settings = JSON.parse(localStorage.getItem('serialSettings') || '{"prefix":"REZ","nextNumber":1,"digits":4}');
      const serial = `${settings.prefix}-${String(settings.nextNumber).padStart(settings.digits, '0')}`;
      // Burada artırmıyoruz, sadece mevcut sıradaki numarayı döndürüyoruz
      return serial;
    }

    const docRef = doc(firestore, COLLECTIONS.serialSettings, 'reservations');
    const docSnap = await getDoc(docRef);

    let settings = { prefix: 'REZ', nextNumber: 1, digits: 4 };
    if (docSnap.exists()) {
      settings = { ...settings, ...docSnap.data() };
    }

    const serial = `${settings.prefix}-${String(settings.nextNumber).padStart(settings.digits, '0')}`;
    
    // Artık burada nextNumber'ı artırmıyoruz, sadece mevcut numarayı döndürüyoruz
    return serial;
  } catch (error) {
    console.error("Seri numarası alınırken hata:", error);
    // Fallback
    const timestamp = Date.now().toString().slice(-6);
    return `REZ-${timestamp}`;
  }
}

// Yeni fonksiyon: Seri numarayı artır (sadece gerçekten kaydedildiğinde çağrılacak)
export async function incrementSerialNumber(): Promise<void> {
  try {
    const firestore = getDb();
    if (!firestore) {
      const settings = JSON.parse(localStorage.getItem('serialSettings') || '{"prefix":"REZ","nextNumber":1,"digits":4}');
      settings.nextNumber++;
      localStorage.setItem('serialSettings', JSON.stringify(settings));
      return;
    }

    const docRef = doc(firestore, COLLECTIONS.serialSettings, 'reservations');
    const docSnap = await getDoc(docRef);

    let settings = { prefix: 'REZ', nextNumber: 1, digits: 4 };
    if (docSnap.exists()) {
      settings = { ...settings, ...docSnap.data() };
    }

    // Sonraki numarayı güncelle
    await setDoc(docRef, {
      ...settings,
      nextNumber: settings.nextNumber + 1,
      updatedAt: serverTimestamp()
    });

  } catch (error) {
    console.error("Seri numarası artırılırken hata:", error);
    throw error;
  }
}

export async function updateSerialSettings(settings: any): Promise<boolean> {
  try {
    const firestore = getDb();
    if (!firestore) {
      localStorage.setItem('serialSettings', JSON.stringify(settings));
      return true;
    }

    // Güvenli document referansı oluştur
    const collectionName = COLLECTIONS.serialSettings;
    const documentId = 'reservations';
    
    if (!collectionName || !documentId) {
      console.error("Geçersiz koleksiyon veya doküman ID'si:", { collectionName, documentId });
      return false;
    }

    const docRef = doc(firestore, collectionName, documentId);
    await setDoc(docRef, {
      ...settings,
      updatedAt: serverTimestamp()
    }, { merge: true }); // merge: true ekledik, mevcut veriyi korur

    localStorage.setItem('serialSettings', JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error("Seri numarası ayarları güncellenirken hata:", error);
    // Firebase başarısız olursa en azından localStorage'a kaydet
    try {
      localStorage.setItem('serialSettings', JSON.stringify(settings));
      return true;
    } catch (localError) {
      console.error("localStorage'a da kayıt başarısız:", localError);
      return false;
    }
  }
}

// Rezervasyonlara özel yeni fonksiyonlar
export async function getReservationById(id: string): Promise<any | null> {
  try {
    console.log(`getReservationById çağrıldı, id: ${id}`);
    
    const firestore = getDb();
    if (!firestore) {
      console.log('Firebase bağlantısı yok, localStorage\'dan alınıyor');
      // Firebase kullanılamıyorsa localStorage'dan al
      const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
      const found = reservations.find((r: any) => r.id === id) || null;
      console.log('localStorage\'dan bulunan rezervasyon:', found ? 'var' : 'yok');
      return found;
    }

    const docRef = doc(firestore, COLLECTIONS.reservations, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = {
        id: docSnap.id,
        ...docSnap.data()
      };
      console.log('Firestore\'dan rezervasyon bulundu:', data);
      return data;
    } else {
      console.log(`Rezervasyon bulunamadı: ${id}`);
      return null;
    }
  } catch (error) {
    console.error("Rezervasyon alınırken hata:", error);
    return null;
  }
}

export async function updateReservation(id: string, reservation: any): Promise<boolean> {
  try {
    const firestore = getDb();
    if (!firestore) {
      // Firebase kullanılamıyorsa localStorage'ı güncelle
      const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
      const index = reservations.findIndex((r: any) => r.id === id);
      if (index !== -1) {
        reservations[index] = { ...reservations[index], ...reservation, updatedAt: new Date().toISOString() };
        localStorage.setItem('reservations', JSON.stringify(reservations));
        return true;
      }
      return false;
    }

    const docRef = doc(firestore, COLLECTIONS.reservations, id);
    await updateDoc(docRef, {
      ...reservation,
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error("Rezervasyon güncellenirken hata:", error);
    return false;
  }
}

// ==================== REZERVASYON SIRALAMA FONKSİYONLARI ====================

// Rezervasyonları yaklaşan tarihe göre destinasyon gruplarında sırala
export function sortReservationsByUrgency(reservations: any[], destinations?: any[]): { [key: string]: any[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(today.getDate() + 3);

  // Destinasyon ID'sini isme çeviren helper fonksiyon
  const getDestinationName = (destinationId: string) => {
    if (!destinations || destinations.length === 0) return destinationId;
    const destination = destinations.find(d => d.id === destinationId);
    return destination ? (destination.name || destination.title || destinationId) : destinationId;
  };

  // Önce her rezervasyonun aciliyet durumunu hesapla
  const reservationsWithUrgency = reservations.map(reservation => {
    const reservationDate = new Date(reservation.turTarihi);
    reservationDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.ceil((reservationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Aciliyet skorlama: negatif değerler geçmiş, 0-3 arası yaklaşan
    let urgencyScore = daysDiff;
    if (daysDiff <= 0) urgencyScore = 1000; // Geçmiş tarihler en alta
    else if (daysDiff <= 3) urgencyScore = daysDiff; // 1-3 gün arası en üstte
    else urgencyScore = daysDiff + 100; // Diğerleri normal sırada
    
    return {
      ...reservation,
      urgencyScore,
      daysDiff,
      isUrgent: daysDiff >= 0 && daysDiff <= 3
    };
  });
  // Destinasyona göre grupla (isim kullanarak)
  const groupedByDestination = reservationsWithUrgency.reduce((groups, reservation) => {
    const destinationName = getDestinationName(reservation.destinasyon) || "Diğer";
    if (!groups[destinationName]) {
      groups[destinationName] = [];
    }
    groups[destinationName].push(reservation);
    return groups;
  }, {} as Record<string, any[]>);
  // Her grup için minimum aciliyet skorunu hesapla
  const destinationUrgency = Object.keys(groupedByDestination).map(destination => {
    const group = groupedByDestination[destination];
    const minUrgencyScore = Math.min(...group.map((r: any) => r.urgencyScore));
    const hasUrgentReservations = group.some((r: any) => r.isUrgent);
    const urgentCount = group.filter((r: any) => r.isUrgent).length;
    
    return {
      destination,
      minUrgencyScore,
      hasUrgentReservations,
      urgentCount,
      reservations: group
    };
  });

  // Destinasyonları aciliyet durumuna göre sırala
  destinationUrgency.sort((a, b) => {
    // Önce yaklaşan tarihi olan destinasyonlar
    if (a.hasUrgentReservations && !b.hasUrgentReservations) return -1;
    if (!a.hasUrgentReservations && b.hasUrgentReservations) return 1;
    
    // Her ikisinde de yaklaşan tarih varsa, en yakın tarihe göre sırala
    if (a.hasUrgentReservations && b.hasUrgentReservations) {
      return a.minUrgencyScore - b.minUrgencyScore;
    }
    
    // Hiçbirinde yaklaşan tarih yoksa, normal tarihe göre sırala
    return a.minUrgencyScore - b.minUrgencyScore;
  });
  // Her grup içindeki rezervasyonları da tarihe göre sırala
  const sortedGroups: { [key: string]: any[] } = {};
  destinationUrgency.forEach(({ destination, reservations }) => {
    sortedGroups[destination] = reservations.sort((a: any, b: any) => {
      // Önce aciliyet skoruna göre
      if (a.urgencyScore !== b.urgencyScore) {
        return a.urgencyScore - b.urgencyScore;
      }
      
      // Sonra saate göre (aynı gün içinde)
      const timeA = a.alisSaati || "00:00";
      const timeB = b.alisSaati || "00:00";
      return timeA.localeCompare(timeB);
    });
  });

  return sortedGroups;
}

// Rezervasyonları tek liste halinde sırala (grup olmadan)
export function sortReservationsFlat(reservations: any[]): any[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return reservations
    .map(reservation => {
      const reservationDate = new Date(reservation.turTarihi);
      reservationDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.ceil((reservationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let urgencyScore = daysDiff;
      if (daysDiff <= 0) urgencyScore = 1000; // Geçmiş tarihler en alta
      else if (daysDiff <= 3) urgencyScore = daysDiff; // 1-3 gün arası en üstte
      else urgencyScore = daysDiff + 100; // Diğerleri normal sırada
      
      return {
        ...reservation,
        urgencyScore,
        daysDiff,
        isUrgent: daysDiff >= 0 && daysDiff <= 3
      };
    })
    .sort((a, b) => {
      // Önce aciliyet skoruna göre
      if (a.urgencyScore !== b.urgencyScore) {
        return a.urgencyScore - b.urgencyScore;
      }
      
      // Sonra saate göre (aynı gün içinde)
      const timeA = a.alisSaati || "00:00";
      const timeB = b.alisSaati || "00:00";
      return timeA.localeCompare(timeB);
    });
}

// Yaklaşan rezervasyonları filtrele (son 3 gün)
export function getUpcomingReservations(reservations: any[]): any[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(today.getDate() + 3);

  return reservations.filter(reservation => {
    const reservationDate = new Date(reservation.turTarihi);
    reservationDate.setHours(0, 0, 0, 0);
    
    return reservationDate >= today && reservationDate < threeDaysLater;
  });
}

// ==================== REZERVASYON SİSTEMİ FONKSİYONLARI ====================

// ==================== REZERVASYON DESTİNASYONLARI FONKSİYONLARI ====================

export interface ReservationDestination {
  id: string;
  name: string;
  description: string;
  createdAt?: any;
  updatedAt?: any;
}

// Rezervasyon destinasyonlarını getir
export async function getReservationDestinations(): Promise<ReservationDestination[]> {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Firestore bağlantısı kurulamadı");
    }

    const querySnapshot = await getDocs(collection(db, COLLECTIONS.reservationDestinations));
    const destinations: ReservationDestination[] = [];
    
    querySnapshot.forEach((doc) => {
      destinations.push({ id: doc.id, ...doc.data() } as ReservationDestination);
    });
    
    return destinations.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Rezervasyon destinasyonları getirilirken hata:", error);
    return [];
  }
}

// Rezervasyon destinasyonu ekle
export async function addReservationDestination(destination: Omit<ReservationDestination, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Firestore bağlantısı kurulamadı");
    }

    const docRef = await addDoc(collection(db, COLLECTIONS.reservationDestinations), {
      ...destination,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error("Rezervasyon destinasyonu eklenirken hata:", error);
    throw error;
  }
}

// Rezervasyon destinasyonu güncelle
export async function updateReservationDestination(id: string, destination: Partial<Omit<ReservationDestination, 'id' | 'createdAt'>>): Promise<void> {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Firestore bağlantısı kurulamadı");
    }

    await updateDoc(doc(db, COLLECTIONS.reservationDestinations, id), {
      ...destination,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Rezervasyon destinasyonu güncellenirken hata:", error);
    throw error;
  }
}

// Rezervasyon destinasyonu sil
export async function deleteReservationDestination(id: string): Promise<void> {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Firestore bağlantısı kurulamadı");
    }

    await deleteDoc(doc(db, COLLECTIONS.reservationDestinations, id));
  } catch (error) {
    console.error("Rezervasyon destinasyonu silinirken hata:", error);
    throw error;
  }
}

// Rezervasyon destinasyonlarını toplu kaydet
export async function saveReservationDestinations(destinations: ReservationDestination[]): Promise<void> {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Firestore bağlantısı kurulamadı");
    }

    const batch = writeBatch(db);
    
    destinations.forEach((destination) => {
      const docRef = doc(db, COLLECTIONS.reservationDestinations, destination.id);
      batch.set(docRef, {
        ...destination,
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Rezervasyon destinasyonları kaydedilirken hata:", error);
    throw error;
  }
}
// ==================== REZERVASYON DESTİNASYONLARI FONKSİYONLARI ====================
