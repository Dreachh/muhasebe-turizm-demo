/**
 * Passionis Travel - Veri Yükleme Scripti
 * Bu script eski örnek verileri silip, gerçek firma verilerini yükler
 * 
 * Not: Bu dosyayı yalnızca uygulamanın ilk kurulumunda veya verileri sıfırlamak istediğinizde çalıştırın
 */

// IndexedDB ile bağlantı
import { 
  clearStore, 
  saveSettings, 
  saveDestinations, 
  saveActivities, 
  saveProviders, 
  saveReferralSources, 
  initializeDB,
  generateUUID
} from '../lib/db';

// Firma Bilgileri - Ayarlar
const companySettings = {
  id: "app-settings",
  companyName: "Passionis Travel (Çilem Turizm Seyahat Acentası)",
  license: "TURSAB NO:17606",
  email: "info@passionistravel.com.tr",
  phone1: "+90 506 166 76 85",
  phone2: "+90 534 078 75 83",
  address: "Hobyar Mah. Yalıköşkü Cd. No:18 D:203, Mühürdarzade iş Hanı FATİH/İSTANBUL",
  currency: "EUR", // Varsayılan para birimi
  language: "tr", // Varsayılan dil
  taxRate: 18, // KDV oranı
  logoUrl: "", // Logo URL'i
  lastUpdated: new Date().toISOString()
};

// Destinasyonlar
const destinations = [
  {
    id: generateUUID(),
    name: "İstanbul",
    country: "Türkiye",
    description: "Türkiye'nin en büyük şehri, Boğaziçi'nin incisi",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Kapadokya",
    country: "Türkiye",
    description: "Peri bacaları ve sıcak hava balonları ile ünlü tarihi bölge",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Pamukkale",
    country: "Türkiye",
    description: "Doğal traverten terasları ve antik havuzları",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Bursa",
    country: "Türkiye",
    description: "Osmanlı'nın ilk başkenti, yeşil şehir",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Sapanca",
    country: "Türkiye",
    description: "İstanbul'a yakın doğa ve göl manzarası",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Antalya",
    country: "Türkiye",
    description: "Türkiye'nin turizm başkenti",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Trabzon",
    country: "Türkiye",
    description: "Karadeniz'in incisi, doğa harikası",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Uzungöl",
    country: "Türkiye",
    description: "Karadeniz bölgesinin doğal güzelliği",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Gelibolu",
    country: "Türkiye",
    description: "Tarihi Gelibolu Yarımadası",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Truva",
    country: "Türkiye",
    description: "Antik Truva kalıntıları",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Efes",
    country: "Türkiye",
    description: "Antik Efes harabeleri",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Fethiye",
    country: "Türkiye",
    description: "Muğla'nın popüler tatil beldesi",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "İzmir",
    country: "Türkiye",
    description: "Ege'nin incisi, modern şehir",
    active: true,
    createdAt: new Date().toISOString()
  }
];

// Aktiviteler (tours store'a eklenen "products" aslında)
const activities = [
  {
    id: generateUUID(),
    name: "İstanbul Klasik Eski Şehir Turu",
    destinationId: destinations.find(d => d.name === "İstanbul")?.id,
    description: "İstanbul'un tarihi yerlerini kapsayan günübirlik tur",
    price: 150,
    currency: "EUR",
    duration: "8 saat",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Sıcak Hava Balonu Turu",
    destinationId: destinations.find(d => d.name === "Kapadokya")?.id,
    description: "Kapadokya manzarası üzerinde balon uçuşu",
    price: 280,
    currency: "EUR",
    duration: "1 saat",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "3 Gün 2 Gece Antalya Turu",
    destinationId: destinations.find(d => d.name === "Antalya")?.id,
    description: "Antalya'da çok günlü turu",
    price: 750,
    currency: "EUR",
    duration: "3 gün, 2 gece",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "3 Gün 2 Gece Trabzon & Uzungöl Turu",
    destinationId: destinations.find(d => d.name === "Trabzon")?.id,
    description: "Trabzon ve Uzungöl'ün çok günlü turu",
    price: 600,
    currency: "EUR",
    duration: "3 gün, 2 gece",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "2 Gün 1 Gece Gelibolu & Truva Turu",
    destinationId: destinations.find(d => d.name === "Gelibolu")?.id,
    description: "Gelibolu ve Truva tarihi yerlerinin turu",
    price: 350,
    currency: "EUR",
    duration: "2 gün, 1 gece",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Günübirlik Truva Turu",
    destinationId: destinations.find(d => d.name === "Truva")?.id,
    description: "Antik Truva'nın günübirlik turu",
    price: 150,
    currency: "EUR",
    duration: "12 saat",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Günübirlik Gelibolu Turu",
    destinationId: destinations.find(d => d.name === "Gelibolu")?.id,
    description: "Gelibolu savaş günübirlik turu",
    price: 150,
    currency: "EUR",
    duration: "12 saat",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "2 Gün 1 Gece Pamukkale ve Efes Turu",
    destinationId: destinations.find(d => d.name === "Pamukkale")?.id,
    description: "Pamukkale terasları ve Efes kalıntılarının birleşik turu",
    price: 550,
    currency: "EUR",
    duration: "2 gün, 1 gece",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Günübirlik Efes Turu",
    destinationId: destinations.find(d => d.name === "Efes")?.id,
    description: "Antik Efes'in günübirlik turu",
    price: 320,
    currency: "EUR",
    duration: "12 saat",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Günübirlik Pamukkale Turu",
    destinationId: destinations.find(d => d.name === "Pamukkale")?.id,
    description: "Pamukkale teraslarının günübirlik turu",
    price: 320,
    currency: "EUR",
    duration: "12 saat",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Günübirlik Kapadokya Kuzey (Kırmızı Tur)",
    destinationId: destinations.find(d => d.name === "Kapadokya")?.id,
    description: "Kuzey Kapadokya günübirlik turu",
    price: 475,
    currency: "EUR",
    duration: "8 saat",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Günübirlik Kapadokya Güney (Yeşil Tur)",
    destinationId: destinations.find(d => d.name === "Kapadokya")?.id,
    description: "Güney Kapadokya günübirlik turu",
    price: 475,
    currency: "EUR",
    duration: "8 saat",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Sapanca Maşukiye Günübirlik Turu",
    destinationId: destinations.find(d => d.name === "Sapanca")?.id,
    description: "Sapanca ve Maşukiye günübirlik turu",
    price: 40,
    currency: "EUR",
    duration: "9 saat",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Bursa Günübirlik Turu",
    destinationId: destinations.find(d => d.name === "Bursa")?.id,
    description: "Bursa günübirlik turu",
    price: 45,
    currency: "EUR",
    duration: "12 saat",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Boğaz'da Akşam Yemek Turu",
    destinationId: destinations.find(d => d.name === "İstanbul")?.id,
    description: "Boğaz'da eğlenceli akşam yemeği turu",
    price: 60,
    currency: "EUR",
    duration: "3 saat (20:45-24:00)",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "2 Gün 1 Gece Sıcak Hava Balonlu Kapadokya Turu",
    destinationId: destinations.find(d => d.name === "Kapadokya")?.id,
    description: "Sıcak hava balonu, Güllü Vadi, Kaymaklı Yeraltı Şehri, kaya oyma köyler, Göreme Açık Hava Müzesi dahil konaklama turu",
    price: 850,
    currency: "EUR",
    duration: "2 gün, 1 gece",
    active: true,
    createdAt: new Date().toISOString()
  }
];

// Sağlayıcılar (Transfer ve Konaklama Hizmetleri)
const providers = [
  // Transfer Hizmetleri
  {
    id: generateUUID(),
    name: "SABİHA(SAW) SPRINTER TRANSFERİ",
    category: "transfer",
    contactPerson: "Transfer Sorumlusu",
    description: "Sabiha Gökçen Havalimanı transferleri", 
    price: 70,
    currency: "EUR",
    capacity: "15 yolcu, 3 bagaj",
    vehicleType: "Sprinter",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "IHL (IST) SPRINTER TRANSFERİ",
    category: "transfer",
    contactPerson: "Transfer Sorumlusu",
    description: "İstanbul Havalimanı transferleri", 
    price: 60,
    currency: "EUR",
    capacity: "15 yolcu, 3 bagaj",
    vehicleType: "Sprinter",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "IHL (IST) TRANSFERİ",
    category: "transfer",
    contactPerson: "Transfer Sorumlusu",
    description: "İstanbul Havalimanı transferleri", 
    price: 45,
    currency: "EUR",
    capacity: "3 yolcu, 5 bagaj",
    vehicleType: "Otomatik vites, 4 kapı",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "SABİHA TRANSFERİ",
    category: "transfer",
    contactPerson: "Transfer Sorumlusu",
    description: "Sabiha Gökçen Havalimanı - Fethiye", 
    price: 50,
    currency: "EUR",
    capacity: "8 yolcu, 9 bagaj",
    vehicleType: "Otomatik vites, 4 kapı",
    active: true,
    createdAt: new Date().toISOString()
  },
  // Konaklama Hizmetleri
  {
    id: generateUUID(),
    name: "Butik Mağara Otel Kapadokya",
    category: "accommodation",
    contactPerson: "Otel Müdürü",
    description: "Kapadokya'da butik mağara otel konaklama hizmeti", 
    price: 250,
    currency: "EUR",
    capacity: "2 kişilik oda",
    location: "Kapadokya",
    active: true,
    createdAt: new Date().toISOString()
  },
  // Rehberlik Hizmetleri
  {
    id: generateUUID(),
    name: "Profesyonel Rehber - İngilizce",
    category: "guide",
    contactPerson: "Rehber Koordinatörü",
    description: "İngilizce dil desteği ile profesyonel rehberlik hizmeti", 
    price: 200,
    currency: "EUR",
    languages: ["İngilizce", "Türkçe"],
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: generateUUID(),
    name: "Profesyonel Rehber - Türkçe",
    category: "guide",
    contactPerson: "Rehber Koordinatörü",
    description: "Türkçe dil desteği ile profesyonel rehberlik hizmeti", 
    price: 150,
    currency: "EUR",
    languages: ["Türkçe"],
    active: true,
    createdAt: new Date().toISOString()
  }
];

// Referans Kaynakları
const referralSources = [
  { id: "website", name: "İnternet Sitemiz", type: "online" },
  { id: "hotel", name: "Otel Yönlendirmesi", type: "partner" },
  { id: "local_guide", name: "Hanutçu / Yerel Rehber", type: "partner" },
  { id: "walk_in", name: "Kapı Önü Müşterisi", type: "direct" },
  { id: "repeat", name: "Tekrar Gelen Müşteri", type: "direct" },
  { id: "recommendation", name: "Tavsiye", type: "referral" },
  { id: "social_media", name: "Sosyal Medya", type: "online" },
  { id: "other", name: "Diğer", type: "other" }
];

// Verileri yükle
export async function loadInitialData() {
  try {
    console.log("Veritabanı başlatılıyor...");
    await initializeDB();
    
    // Önce eski verileri temizle
    console.log("Eski veriler temizleniyor...");
    await clearStore("tours");
    await clearStore("financials");
    await clearStore("customers");
    await clearStore("activities");
    await clearStore("destinations");
    await clearStore("providers");
    await clearStore("referral_sources");

    // Şimdi yeni verileri yükle
    console.log("Yeni veriler yükleniyor...");
    
    // Firma Ayarları
    await saveSettings(companySettings);
    console.log("✓ Firma bilgileri kaydedildi");
    
    // Destinasyonlar
    await saveDestinations(destinations);
    console.log("✓ Destinasyonlar kaydedildi");
    
    // Aktiviteler
    await saveActivities(activities);
    console.log("✓ Aktiviteler kaydedildi");
    
    // Sağlayıcılar
    await saveProviders(providers);
    console.log("✓ Sağlayıcılar kaydedildi");
    
    // Referans Kaynakları
    await saveReferralSources(referralSources);
    console.log("✓ Referans kaynakları kaydedildi");
    
    console.log("✅ Tüm veriler başarıyla yüklendi!");
    return true;
  } catch (error) {
    console.error("❌ Veri yükleme hatası:", error);
    return false;
  }
}

// Otomatik çalıştırma için
// loadInitialData().then(() => {
//   console.log("İşlem tamamlandı");
// });

export default loadInitialData;