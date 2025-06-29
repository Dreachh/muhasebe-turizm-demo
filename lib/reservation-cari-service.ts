import { COLLECTIONS } from "./db-firebase";
import { getDb } from "./firebase-client-module";
import {
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  Timestamp,
} from "firebase/firestore";

// Rezervasyon Cari Interface'leri
export interface ReservationCari {
  id?: string;
  companyName: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  taxNumber?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  totalDebt: number; // Toplam borç
  totalPayment: number; // Toplam ödeme
  balance: number; // Bakiye (borç - ödeme)
  period: string; // Dönem bilgisi
}

// Rezervasyon Borç Detayı - Her rezervasyon için bir borç kaydı
export interface ReservationBorcDetay {
  id?: string;
  cariId: string; // Hangi cariye ait
  reservationId: string; // Rezervasyon ID'si
  turTarih: string; // TUR TARİH
  odemeTarih?: string; // ÖDEME TARİH (null olabilir)
  firma: string; // FİRMA
  tutar: number; // TUTAR (asıl tutar)
  odeme: number; // ÖDEME (ödenen miktar)
  kalan: number; // KALAN (tutar - ödeme)
  destinasyon: string; // DESTİNASYON
  musteri: string; // MÜŞTERİ
  kisi: number; // KİŞİ (toplam kişi sayısı)
  alisYeri: string; // ALIŞ YERİ
  alis: string; // ALIŞ (saat)
  paraBirimi: string; // Para birimi
  reservationSeriNo: string; // Rezervasyon seri numarası
  createdAt: Timestamp;
  updatedAt: Timestamp;
  period: string;
}

// Rezervasyon Ödeme Detayı - Her ödeme işlemi için bir kayıt
export interface ReservationOdemeDetay {
  id?: string;
  cariId: string; // Hangi cariye ait
  borcId: string; // Hangi borç kaydına ait
  reservationId: string; // Rezervasyon ID'si
  tutar: number; // Ödeme tutarı
  tarih: string; // Ödeme tarihi
  aciklama: string; // Ödeme açıklaması
  odemeYontemi?: string; // Ödeme yöntemi
  odemeYapan?: string; // Ödemeyi yapan kişi
  fisNumarasi?: string; // Fiş numarası
  createdAt: Timestamp;
  period: string;
}

export class ReservationCariService {
  private static getFirestore() {
    const db = getDb();
    if (!db) {
      throw new Error("Firestore bağlantısı kurulamadı");
    }
    return db;
  }

  // Yeni cari oluştur
  static async createCari(cariData: Omit<ReservationCari, 'id' | 'createdAt' | 'updatedAt' | 'totalDebt' | 'totalPayment' | 'balance'>): Promise<string> {
    try {
      const db = this.getFirestore();
      const now = Timestamp.now();
      const newCari: Omit<ReservationCari, 'id'> = {
        ...cariData,
        totalDebt: 0,
        totalPayment: 0,
        balance: 0,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.reservation_cari), newCari);
      return docRef.id;
    } catch (error) {
      console.error("Rezervasyon cari oluşturma hatası:", error);
      throw error;
    }
  }

  // Rezervasyondan otomatik borç kaydı oluştur
  static async createBorcFromReservation(reservationData: any): Promise<string> {
    try {
      const db = this.getFirestore();
      
      console.log('createBorcFromReservation - Gelen veri:', reservationData);
      
      // Önce aynı rezervasyon için borç kaydı var mı kontrol et
      const existingBorcQuery = query(
        collection(db, COLLECTIONS.reservation_cari_borclar),
        where("reservationId", "==", reservationData.id || reservationData.seriNumarasi)
      );
      const existingBorcSnapshot = await getDocs(existingBorcQuery);
      
      if (!existingBorcSnapshot.empty) {
        console.log('Bu rezervasyon için zaten borç kaydı mevcut:', reservationData.id || reservationData.seriNumarasi);
        return existingBorcSnapshot.docs[0].id; // Mevcut borç kaydının ID'sini döndür
      }
      
      // Önce firma için cari var mı kontrol et
      let cariId = await this.getCariByCompanyName(reservationData.firma, reservationData.period);
      
      console.log('Firma için cari ID:', cariId);
      
      // Cari yoksa oluştur
      if (!cariId) {
        console.log('Yeni cari oluşturuluyor...');
        cariId = await this.createCari({
          companyName: reservationData.firma,
          contactPerson: reservationData.telefonKisi || reservationData.yetkiliKisi || "",
          contactPhone: reservationData.yetkiliTelefon || "",
          contactEmail: reservationData.yetkiliEmail || "",
          period: reservationData.period || new Date().getFullYear().toString(),
        });
        console.log('Yeni cari ID:', cariId);
      }

      // Toplam kişi sayısını hesapla
      const toplamKisi = (parseInt(reservationData.yetiskinSayisi) || 0) + 
                        (parseInt(reservationData.cocukSayisi) || 0) + 
                        (parseInt(reservationData.bebekSayisi) || 0);

      // Borç kaydını oluştur
      const borcData: Omit<ReservationBorcDetay, 'id'> = {
        cariId,
        reservationId: reservationData.id || reservationData.seriNumarasi || "",
        turTarih: reservationData.turTarihi || reservationData.turTarih || "",
        firma: reservationData.firma || "",
        tutar: parseFloat(reservationData.toplamTutar || reservationData.tutar || "0"),
        odeme: parseFloat(reservationData.odemeMiktari || reservationData.odeme || "0"),
        kalan: parseFloat(reservationData.toplamTutar || reservationData.tutar || "0") - parseFloat(reservationData.odemeMiktari || reservationData.odeme || "0"),
        destinasyon: reservationData.destinasyonId || reservationData.destinasyon || reservationData.hedef || "", // Fallback değerleri
        musteri: reservationData.musteriAdiSoyadi || reservationData.musteri || reservationData.musteriAdi || "",
        kisi: toplamKisi,
        alisYeri: reservationData.alisYeri || "",
        alis: reservationData.alisSaati || reservationData.alis || "",
        paraBirimi: reservationData.paraBirimi || "EUR",
        reservationSeriNo: reservationData.seriNumarasi || "",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        period: reservationData.period || new Date().getFullYear().toString(),
      };

      // Eğer başlangıçta ödeme varsa, ödeme tarihi de ekle
      if (borcData.odeme > 0) {
        borcData.odemeTarih = reservationData.odemeTarihi;
      }

      console.log('Oluşturulacak borç verisi:', borcData);

      const borcRef = await addDoc(collection(db, COLLECTIONS.reservation_cari_borclar), borcData);
      
      console.log('Borç kaydı oluşturuldu, ID:', borcRef.id);
      
      // Cari bakiyesini güncelle
      await this.updateCariBalance(cariId);
      
      console.log('Cari bakiyesi güncellendi');

      return borcRef.id;
    } catch (error) {
      console.error("Rezervasyondan borç oluşturma hatası:", error);
      throw error;
    }
  }

  // Firmaya göre cari ID'si getir
  static async getCariByCompanyName(companyName: string, period: string): Promise<string | null> {
    try {
      const db = this.getFirestore();
      const q = query(
        collection(db, COLLECTIONS.reservation_cari),
        where("companyName", "==", companyName),
        where("period", "==", period)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
      }
      return null;
    } catch (error) {
      console.error("Cari arama hatası:", error);
      return null;
    }
  }

  // Cari ID'sine göre tek cari getir
  static async getCariById(cariId: string): Promise<ReservationCari | null> {
    try {
      const db = this.getFirestore();
      const docRef = doc(db, COLLECTIONS.reservation_cari, cariId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as ReservationCari;
      }
      
      return null;
    } catch (error) {
      console.error("Cari getirme hatası:", error);
      throw error;
    }
  }

  // Cari bakiyesini güncelle
  static async updateCariBalance(cariId: string): Promise<void> {
    try {
      const db = this.getFirestore();
      
      // Bu cariye ait tüm borçları getir
      const borclarQuery = query(
        collection(db, COLLECTIONS.reservation_cari_borclar),
        where("cariId", "==", cariId)
      );
      const borclarSnapshot = await getDocs(borclarQuery);
      
      let totalDebt = 0;
      let totalPayment = 0;
      
      borclarSnapshot.docs.forEach(doc => {
        const borc = doc.data() as ReservationBorcDetay;
        totalDebt += borc.tutar;
        totalPayment += borc.odeme;
      });

      const balance = totalDebt - totalPayment;
      
      // Cari kaydını güncelle
      const cariRef = doc(db, COLLECTIONS.reservation_cari, cariId);
      await updateDoc(cariRef, {
        totalDebt,
        totalPayment,
        balance,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Cari bakiye güncelleme hatası:", error);
      throw error;
    }
  }

  // Ödeme ekle
  static async addOdeme(borcId: string, tutar: number, tarih: string, aciklama: string, odemeYontemi?: string, odemeYapan?: string, fisNumarasi?: string): Promise<void> {
    try {
      const db = this.getFirestore();
      
      // Borç kaydını getir
      const borcRef = doc(db, COLLECTIONS.reservation_cari_borclar, borcId);
      const borcDoc = await getDoc(borcRef);
      
      if (!borcDoc.exists()) {
        throw new Error("Borç kaydı bulunamadı");
      }
      
      const borcData = borcDoc.data() as ReservationBorcDetay;
      
      // Ödeme kaydını oluştur
      const odemeData: Omit<ReservationOdemeDetay, 'id'> = {
        cariId: borcData.cariId,
        borcId,
        reservationId: borcData.reservationId,
        tutar,
        tarih,
        aciklama,
        odemeYontemi,
        odemeYapan,
        fisNumarasi,
        createdAt: Timestamp.now(),
        period: borcData.period,
      };
      
      await addDoc(collection(db, COLLECTIONS.reservation_cari_odemeler), odemeData);
      
      // Borç kaydını güncelle
      const yeniOdeme = borcData.odeme + tutar;
      const yeniKalan = borcData.tutar - yeniOdeme;
      
      await updateDoc(borcRef, {
        odeme: yeniOdeme,
        kalan: yeniKalan,
        odemeTarih: tarih,
        updatedAt: Timestamp.now(),
      });
      
      // Cari bakiyesini güncelle
      await this.updateCariBalance(borcData.cariId);
      
      // Rezervasyon kaydını da güncelle (senkronizasyon için)
      await this.updateReservationPayment(borcData.reservationId, yeniOdeme, odemeYapan);
    } catch (error) {
      console.error("Ödeme ekleme hatası:", error);
      throw error;
    }
  }

  // Tüm cari kartlarını getir
  static async getAllCari(period: string): Promise<ReservationCari[]> {
    try {
      const db = this.getFirestore();
      const q = query(
        collection(db, COLLECTIONS.reservation_cari),
        where("period", "==", period)
      );
      
      const querySnapshot = await getDocs(q);
      const cariList: ReservationCari[] = [];
      
      querySnapshot.forEach((doc) => {
        cariList.push({
          id: doc.id,
          ...doc.data(),
        } as ReservationCari);
      });
      
      // Client-side sıralama
      return cariList.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
    } catch (error) {
      console.error("Cari listesi getirme hatası:", error);
      throw error;
    }
  }

  // Cariye ait borç detaylarını getir - rezervasyon bilgileriyle birlikte
  static async getBorcDetaysByCariId(cariId: string): Promise<ReservationBorcDetay[]> {
    try {
      const db = this.getFirestore();
      const q = query(
        collection(db, COLLECTIONS.reservation_cari_borclar),
        where("cariId", "==", cariId)
      );
      
      const querySnapshot = await getDocs(q);
      const borclar: ReservationBorcDetay[] = [];
      
      querySnapshot.forEach((doc) => {
        borclar.push({
          id: doc.id,
          ...doc.data(),
        } as ReservationBorcDetay);
      });
      
      // Client-side sıralama
      return borclar.sort((a, b) => new Date(b.turTarih).getTime() - new Date(a.turTarih).getTime());
    } catch (error) {
      console.error("Borç detayları getirme hatası:", error);
      throw error;
    }
  }

  // Cariye ait borç detaylarını rezervasyon listesi formatında getir
  static async getBorcDetaylarWithReservationInfo(cariId: string): Promise<any[]> {
    try {
      const borclar = await this.getBorcDetaysByCariId(cariId);
      
      // Destinasyonları ve ödemeleri yükle
      const [destinations, allOdemeler] = await Promise.all([
        this.getDestinationsFromFirestore(),
        this.getOdemeDetaysByCariId(cariId)
      ]);

      // Destinasyonları kolay erişim için bir haritaya dönüştür
      const destinationMap = new Map(destinations.map(d => [d.id, d.name || d.destinationName || d.title]));
      
      // Her borç için rezervasyon bilgilerini getir
      const detaylarPromises = borclar.map(async (borc) => {
        try {
          // Rezervasyon bilgilerini Firestore'dan getir
          const db = this.getFirestore();
          const reservationRef = doc(db, 'reservations', borc.reservationId);
          const reservationDoc = await getDoc(reservationRef);
          
          let rezervasyonDetay: any = null;
          if (reservationDoc.exists()) {
            rezervasyonDetay = {
              id: reservationDoc.id,
              ...reservationDoc.data()
            };
          }

          // Destinasyon ID'sini isme çevir (önceden yüklenmiş haritadan)
          const destinationName = this.getDestinationName(borc.destinasyon, destinationMap);
          
          // Alış yeri detaylarını rezervasyon listesi formatında hazırla
          const alisDetaylari = this.formatAlisDetaylari(rezervasyonDetay);
          
          // Bu borca ait ödemeleri bul ve en son ödeme bilgisini al
          const borcOdemeleri = allOdemeler.filter((odeme: ReservationOdemeDetay) => odeme.borcId === borc.id);
          const sonOdeme = borcOdemeleri.length > 0 ? 
            borcOdemeleri.sort((a: ReservationOdemeDetay, b: ReservationOdemeDetay) => 
              new Date(b.tarih).getTime() - new Date(a.tarih).getTime())[0] : null;

          return {
            ...borc,
            destinasyon: destinationName, // Artık isim olarak
            destinasyonId: borc.destinasyon, // Orijinal ID'yi de saklayalım
            rezervasyon: rezervasyonDetay,
            // Rezervasyon listesi formatında ek bilgiler
            seriNumarasi: rezervasyonDetay?.seriNumarasi || '',
            musteriTelefon: rezervasyonDetay?.telefon || '',
            musteriEmail: rezervasyonDetay?.email || '',
            odemeYapan: rezervasyonDetay?.odemeYapan || sonOdeme?.odemeYapan || '',
            odemeYontemi: rezervasyonDetay?.odemeYontemi || sonOdeme?.odemeYontemi || '',
            odemeTarihi: sonOdeme?.tarih || null, // Son ödeme tarihi
            odemeDurumu: this.calculateOdemeDurumu(borc.tutar, borc.odeme),
            rezervasyonNot: rezervasyonDetay?.notlar || '',
            ozelIstekler: rezervasyonDetay?.ozelIstekler || '',
            // Alış detayları - rezervasyon detayından alış yeri adı ve saati
            alisYeriDetay: alisDetaylari.alisYeriDetay || borc.alisYeri || '',
            alisDetay: alisDetaylari.alisDetay || borc.alis || '',
            // Fallback olarak borç kaydındaki orijinal değerleri de ekle
            alisYeri: alisDetaylari.alisYeriDetay || borc.alisYeri || '',
            alis: alisDetaylari.alisDetay || borc.alis || '',
            katilimciSayilari: {
              yetiskin: rezervasyonDetay?.yetiskinSayisi || 0,
              cocuk: rezervasyonDetay?.cocukSayisi || 0,
              bebek: rezervasyonDetay?.bebekSayisi || 0
            }
          };
        } catch (error) {
          console.error(`Rezervasyon detayı getirme hatası (${borc.reservationId}):`, error);
          return borc; // Hata durumunda sadece borç bilgisini döndür
        }
      });

      const detayliListe = await Promise.all(detaylarPromises);
      
      // Yaklaşan rezervasyonları önce göster, sonra tur tarihine göre sırala
      return detayliListe.sort((a, b) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dateA = new Date(a.turTarih);
        const dateB = new Date(b.turTarih);
        dateA.setHours(0, 0, 0, 0);
        dateB.setHours(0, 0, 0, 0);
        
        // Yaklaşan rezervasyonlar (bugünden itibaren 7 gün içinde) önce gelsin
        const aIsUpcoming = dateA >= today && dateA.getTime() - today.getTime() <= 7 * 24 * 60 * 60 * 1000;
        const bIsUpcoming = dateB >= today && dateB.getTime() - today.getTime() <= 7 * 24 * 60 * 60 * 1000;
        
        if (aIsUpcoming && !bIsUpcoming) return -1;
        if (!aIsUpcoming && bIsUpcoming) return 1;
        
        // Her ikisi de yaklaşan veya yaklaşan değilse, tur tarihine göre sırala
        return dateA.getTime() - dateB.getTime();
      });
    } catch (error) {
      console.error("Detaylı borç listesi getirme hatası:", error);
      throw error;
    }
  }

  // Destinasyonları Firestore'dan getir
  static async getDestinationsFromFirestore(): Promise<any[]> {
    try {
      const db = this.getFirestore();
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.reservationDestinations));
      const destinations: any[] = [];
      
      querySnapshot.forEach((doc) => {
        destinations.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      
      return destinations;
    } catch (error) {
      console.error("Destinasyonlar getirme hatası:", error);
      return [];
    }
  }

  // Destinasyon ID'sini isme çevir (önceden yüklenmiş haritayı kullanarak)
  static getDestinationName(destinationId: string, destinationMap: Map<string, string>): string {
    if (!destinationId) return '';
    
    const name = destinationMap.get(destinationId);
    
    if (!name) {
      console.warn(`Haritada destinasyon bulunamadı: ${destinationId}`, 'Mevcut harita:', Array.from(destinationMap.entries()));
      return destinationId; // İsim bulunamazsa ID'yi döndür
    }
    
    return name;
  }

  // Alış detaylarını rezervasyon listesi formatında hazırla
  static formatAlisDetaylari(rezervasyonDetay: any): { alisYeriDetay: string; alisDetay: string } {
    if (!rezervasyonDetay) {
      return { alisYeriDetay: '', alisDetay: '' };
    }

    // Alış yeri detayları (rezervasyon listesindeki gibi)
    let alisYeriDetay = '';
    if (rezervasyonDetay.alisDetaylari) {
      // Önce "Otel Adı" veya "Acenta Adı" ara
      alisYeriDetay = rezervasyonDetay.alisDetaylari["Otel Adı"] || 
                     rezervasyonDetay.alisDetaylari["Acenta Adı"] || 
                     rezervasyonDetay.alisYeri || '';
    } else {
      alisYeriDetay = rezervasyonDetay.alisYeri || '';
    }

    // Alış saati + oda numarası (rezervasyon listesindeki gibi)
    let alisDetay = '';
    if (rezervasyonDetay.alisDetaylari) {
      const alisSaati = rezervasyonDetay.alisDetaylari["Alış Saati"] || '';
      const odaNumarasi = rezervasyonDetay.alisDetaylari["Oda Numarası"] || '';
      
      if (alisSaati && odaNumarasi) {
        alisDetay = `${alisSaati} Oda:${odaNumarasi}`;
      } else if (alisSaati) {
        alisDetay = alisSaati;
      } else if (odaNumarasi) {
        alisDetay = `Oda:${odaNumarasi}`;
      }
    }

    return { alisYeriDetay, alisDetay };
  }

  // Cariye ait ödeme detaylarını getir
  static async getOdemeDetaysByCariId(cariId: string): Promise<ReservationOdemeDetay[]> {
    try {
      const db = this.getFirestore();
      const q = query(
        collection(db, COLLECTIONS.reservation_cari_odemeler),
        where("cariId", "==", cariId)
      );
      
      const querySnapshot = await getDocs(q);
      const odemeler: ReservationOdemeDetay[] = [];
      
      querySnapshot.forEach((doc) => {
        odemeler.push({
          id: doc.id,
          ...doc.data(),
        } as ReservationOdemeDetay);
      });
      
      // Client-side sıralama (en yeni ödemeler üstte)
      return odemeler.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
    } catch (error) {
      console.error("Ödeme detayları getirme hatası:", error);
      throw error;
    }
  }

  // Ödeme durumunu hesapla
  static calculateOdemeDurumu(tutar: number, odeme: number): "Ödendi" | "Bekliyor" | "Kısmi Ödendi" | "İptal" {
    if (odeme === 0) return "Bekliyor";
    if (odeme >= tutar) return "Ödendi";
    return "Kısmi Ödendi";
  }

  // Mevcut rezervasyonları kontrol edip eksik olanları bulma fonksiyonu
  static async findMissingReservationsInCari(): Promise<any[]> {
    try {
      const db = this.getFirestore();
      
      // Tüm rezervasyonları getir
      const reservationsSnapshot = await getDocs(collection(db, 'reservations'));
      const allReservations: any[] = [];
      
      reservationsSnapshot.forEach((doc) => {
        allReservations.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      
      // Tüm cari borç kayıtlarını getir
      const borclarSnapshot = await getDocs(collection(db, COLLECTIONS.reservation_cari_borclar));
      const existingBorcIds = new Set();
      
      borclarSnapshot.forEach((doc) => {
        const borc = doc.data();
        existingBorcIds.add(borc.reservationId);
      });
      
      // Eksik olanları bul
      const missingReservations = allReservations.filter(reservation => 
        !existingBorcIds.has(reservation.id) && !existingBorcIds.has(reservation.seriNumarasi)
      );
      
      console.log('Toplam rezervasyon:', allReservations.length);
      console.log('Mevcut borç kayıtları:', existingBorcIds.size);
      console.log('Eksik rezervasyonlar:', missingReservations);
      
      return missingReservations;
    } catch (error) {
      console.error("Eksik rezervasyonları kontrol ederken hata:", error);
      return [];
    }
  }

  // Eksik rezervasyonları otomatik olarak cari kartlara ekle
  static async addMissingReservationsToCari(): Promise<void> {
    try {
      const missingReservations = await this.findMissingReservationsInCari();
      const currentYear = new Date().getFullYear().toString();
      
      for (const reservation of missingReservations) {
        try {
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
          
          console.log(`Eksik rezervasyon ekleniyor: ${reservation.firma} - ${reservation.musteriAdiSoyadi}`);
          await this.createBorcFromReservation(reservationForCari);
          
        } catch (error) {
          console.error(`Eksik rezervasyon ${reservation.id} eklenirken hata:`, error);
        }
      }
    } catch (error) {
      console.error("Eksik rezervasyonları eklerken hata:", error);
    }
  }

  // Rezervasyon güncellendiğinde cari kartını güncelle
  static async updateCariFromReservation(reservationData: any): Promise<void> {
    try {
      const db = this.getFirestore();
      
      console.log('updateCariFromReservation - Gelen veri:', reservationData);
      
      // Önce bu rezervasyon için mevcut borç kaydı var mı bul
      const existingBorcQuery = query(
        collection(db, COLLECTIONS.reservation_cari_borclar),
        where("reservationId", "==", reservationData.id)
      );
      const existingBorcSnapshot = await getDocs(existingBorcQuery);
      
      if (existingBorcSnapshot.empty) {
        // Borç kaydı yoksa yeni oluştur
        console.log('Borç kaydı bulunamadı, yeni oluşturuluyor...');
        await this.createBorcFromReservation(reservationData);
        return;
      }
      
      // Mevcut borç kaydını güncelle
      const borcDoc = existingBorcSnapshot.docs[0];
      const borcData = borcDoc.data() as ReservationBorcDetay;
      
      // Toplam kişi sayısını hesapla
      const toplamKisi = (parseInt(reservationData.yetiskinSayisi) || 0) + 
                        (parseInt(reservationData.cocukSayisi) || 0) + 
                        (parseInt(reservationData.bebekSayisi) || 0);
      
      // Güncellenecek veri
      const updatedBorcData: any = {
        turTarih: reservationData.turTarihi || reservationData.turTarih || borcData.turTarih,
        firma: reservationData.firma || borcData.firma,
        tutar: parseFloat(reservationData.toplamTutar || reservationData.tutar || borcData.tutar.toString()),
        odeme: parseFloat(reservationData.odemeMiktari || reservationData.odeme || borcData.odeme.toString()),
        destinasyon: reservationData.destinasyonId || reservationData.destinasyon || borcData.destinasyon,
        musteri: reservationData.musteriAdiSoyadi || reservationData.musteri || borcData.musteri,
        kisi: toplamKisi || borcData.kisi,
        alisYeri: reservationData.alisYeri || borcData.alisYeri,
        alis: reservationData.alisSaati || reservationData.alis || borcData.alis,
        paraBirimi: reservationData.paraBirimi || borcData.paraBirimi,
        reservationSeriNo: reservationData.seriNumarasi || borcData.reservationSeriNo,
        updatedAt: Timestamp.now(),
      };
      
      // Kalan tutarı yeniden hesapla
      updatedBorcData.kalan = updatedBorcData.tutar - updatedBorcData.odeme;
      
      // Eğer ödeme varsa, ödeme tarihi de güncelle
      if (updatedBorcData.odeme > 0 && reservationData.odemeTarihi) {
        updatedBorcData.odemeTarih = reservationData.odemeTarihi;
      }
      
      console.log('Borç kaydı güncelleniyor:', updatedBorcData);
      
      // Borç kaydını güncelle
      const borcRef = doc(db, COLLECTIONS.reservation_cari_borclar, borcDoc.id);
      await updateDoc(borcRef, updatedBorcData);
      
      console.log('Borç kaydı güncellendi');
      
      // Cari bakiyesini güncelle
      await this.updateCariBalance(borcData.cariId);
      
      console.log('Cari bakiyesi güncellendi');
      
    } catch (error) {
      console.error("Rezervasyon cari güncelleme hatası:", error);
      throw error;
    }
  }

  // Rezervasyon ödeme bilgisini güncelle (senkronizasyon için)
  static async updateReservationPayment(reservationId: string, yeniOdeme: number, odemeYapan?: string): Promise<void> {
    try {
      const db = this.getFirestore();
      const reservationRef = doc(db, 'reservations', reservationId);
      
      const updateData: any = {
        odeme: yeniOdeme,
        updatedAt: Timestamp.now(),
      };
      
      if (odemeYapan) {
        updateData.odemeYapan = odemeYapan;
      }
      
      await updateDoc(reservationRef, updateData);
    } catch (error) {
      console.error("Rezervasyon güncelleme hatası:", error);
      // Bu hata kritik değil, sadece log'layıp devam ediyoruz
    }
  }
}
