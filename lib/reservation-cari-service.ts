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
  writeBatch,
  deleteField,
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
  borcId?: string | null; // Hangi borç kaydına ait (genel ödemeler için null olabilir)
  reservationId?: string | null; // Rezervasyon ID'si (genel ödemeler için null olabilir)
  tutar: number; // Ödeme tutarı
  tarih: string; // Ödeme tarihi
  aciklama: string; // Ödeme açıklaması
  odemeYontemi?: string; // Ödeme yöntemi
  odemeYapan?: string; // Ödemeyi yapan kişi
  fisNumarasi?: string; // Fiş numarası
  paraBirimi?: string; // Para birimi
  /**
   * Ödeme anındaki genel bakiye (ilgili para biriminde), geçmiş işlemler değişse bile sabit kalır.
   */
  cariBakiye?: number;
  createdAt: Timestamp;
  period: string;
}

// ReservationCariPayment alias - Geriye uyumluluk için
export interface ReservationCariPayment extends ReservationOdemeDetay {
  // Ek özellikler için
  type?: "debt" | "payment";
  amount?: number;
  description?: string;
  date?: string;
  currency?: string;
  paymentMethod?: string;
  receiptNumber?: string;
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

  // Cari bakiyesini güncelle - GENEL ÖDEMELERİ DE DAHİL ET
  static async updateCariBalance(cariId: string): Promise<void> {
    try {
      const db = this.getFirestore();
      
      // Bu cariye ait tüm borçları getir
      const borclarQuery = query(
        collection(db, COLLECTIONS.reservation_cari_borclar),
        where("cariId", "==", cariId)
      );
      const borclarSnapshot = await getDocs(borclarQuery);
      
      // Bu cariye ait tüm genel ödemeleri de getir
      const odemelerQuery = query(
        collection(db, COLLECTIONS.reservation_cari_odemeler),
        where("cariId", "==", cariId)
      );
      const odemelerSnapshot = await getDocs(odemelerQuery);
      
      let totalDebt = 0;
      let totalPaymentFromDebts = 0;
      let totalGeneralPayments = 0;
      
      // Borçlardan toplam borç ve ödeme hesapla
      borclarSnapshot.docs.forEach(doc => {
        const borc = doc.data() as ReservationBorcDetay;
        totalDebt += borc.tutar;
        totalPaymentFromDebts += borc.odeme;
      });
      
      // Genel ödemeleri hesapla (pozitif = tahsilat, negatif = iade)
      odemelerSnapshot.docs.forEach(doc => {
        const odeme = doc.data() as ReservationOdemeDetay;
        totalGeneralPayments += odeme.tutar; // Pozitif tahsilat, negatif iade
      });
      
      // Toplam ödeme = borçlardan ödemeler + genel ödemeler
      const totalPayment = totalPaymentFromDebts + totalGeneralPayments;
      const balance = totalDebt - totalPayment;
      
      console.log(`💰 Cari ${cariId} bakiye güncelleniyor:`);
      console.log(`   Toplam Borç: ${totalDebt}`);
      console.log(`   Borçlardan Ödemeler: ${totalPaymentFromDebts}`);
      console.log(`   Genel Ödemeler: ${totalGeneralPayments}`);
      console.log(`   Toplam Ödeme: ${totalPayment}`);
      console.log(`   Net Bakiye: ${balance}`);
      
      // Cari kaydını güncelle
      const cariRef = doc(db, COLLECTIONS.reservation_cari, cariId);
      await updateDoc(cariRef, {
        totalDebt,
        totalPayment,
        balance,
        updatedAt: Timestamp.now(),
      });
      
      console.log(`✅ Cari ${cariId} bakiyesi güncellendi`);
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
        paraBirimi: borcData.paraBirimi, // Borçtan para birimini al
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
      
      // Sadece aktif borç veya ödeme kaydı olan carileri getir
      const borcQuery = query(
        collection(db, COLLECTIONS.reservation_cari_borclar),
        where("period", "==", period)
      );
      
      const odemeQuery = query(
        collection(db, COLLECTIONS.reservation_cari_odemeler),
        where("period", "==", period)
      );
      
      // Borç ve ödeme kayıtlarını paralel olarak getir
      const [borcSnapshot, odemeSnapshot] = await Promise.all([
        getDocs(borcQuery),
        getDocs(odemeQuery)
      ]);
      
      // Aktif cari ID'lerini topla
      const aktiveCariIds = new Set<string>();
      
      borcSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.cariId) aktiveCariIds.add(data.cariId);
      });
      
      odemeSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.cariId) aktiveCariIds.add(data.cariId);
      });
      
      console.log(`Aktif cari sayısı: ${aktiveCariIds.size}`);
      
      if (aktiveCariIds.size === 0) {
        return [];
      }
      
      // Aktif carilerin bilgilerini getir
      const cariSnapshots = await Promise.all(
        Array.from(aktiveCariIds).map(cariId => 
          getDoc(doc(db, COLLECTIONS.reservation_cari, cariId))
        )
      );
      
      // Var olan ve geçerli cari kartlarını döndür
      const validCariList = cariSnapshots
        .filter(doc => doc.exists())
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ReservationCari[];
      
      // Boş olmayan carileri döndür
      return validCariList;
      
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
          } else {
            // Rezervasyon silinmişse, bu borç kaydı da geçersizdir
            console.warn(`Rezervasyon bulunamadı: ${borc.reservationId}. Borç kaydı temizlenecek.`);
            // Bu borç kaydını otomatik olarak temizle
            try {
              await deleteDoc(doc(db, COLLECTIONS.reservation_cari_borclar, borc.id!));
              console.log(`Geçersiz borç kaydı silindi: ${borc.id}`);
              return null; // Bu kayıt null olarak döner ve filtrelenecek
            } catch (deleteError) {
              console.error(`Geçersiz borç kaydı silinirken hata: ${deleteError}`);
            }
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
      
      // Null değerleri filtrele (silinmiş rezervasyonlar)
      const validDetayliListe = detayliListe.filter(item => item !== null);
      
      // Yaklaşan rezervasyonları önce göster, sonra tur tarihine göre sırala
      return validDetayliListe.sort((a, b) => {
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
      console.log(`🔍 getOdemeDetaysByCariId çağrıldı. Cari ID: ${cariId}`);
      const db = this.getFirestore();
      const q = query(
        collection(db, COLLECTIONS.reservation_cari_odemeler),
        where("cariId", "==", cariId)
      );
      
      const querySnapshot = await getDocs(q);
      const odemeler: ReservationOdemeDetay[] = [];
      
      console.log(`📊 Bulunan ödeme sayısı: ${querySnapshot.docs.length}`);
      
      querySnapshot.forEach((doc) => {
        const odeme = {
          id: doc.id,
          ...doc.data(),
        } as ReservationOdemeDetay;
        
        odemeler.push(odeme);
        console.log(`✅ Ödeme yüklendi: ID=${odeme.id}, Tutar=${odeme.tutar}, ReservationID=${odeme.reservationId || 'Genel'}, BorcID=${odeme.borcId || 'Genel'}`);
      });
      
      // Client-side sıralama (en yeni ödemeler üstte)
      const sortedOdemeler = odemeler.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
      console.log(`📋 Toplam döndürülen ödeme: ${sortedOdemeler.length}`);
      return sortedOdemeler;
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

  // Rezervasyon silme durumunda cari kayıtlarını temizle
  static async deleteReservationFromCari(reservationId: string): Promise<void> {
    try {
      const db = this.getFirestore();
      
      console.log(`Rezervasyon cari temizliği başlatılıyor: ${reservationId}`);
      
      // Bu rezervasyona ait tüm borç kayıtlarını bul (hem reservationId hem de seriNumarasi ile ara)
      const [borcSnapshot1, borcSnapshot2] = await Promise.all([
        getDocs(query(
          collection(db, COLLECTIONS.reservation_cari_borclar),
          where("reservationId", "==", reservationId)
        )),
        getDocs(query(
          collection(db, COLLECTIONS.reservation_cari_borclar),
          where("reservationSeriNo", "==", reservationId)
        ))
      ]);
      
      // Her iki sorgunun sonuçlarını birleştir ve duplicate'leri kaldır
      const uniqueBorcDocs = [...borcSnapshot1.docs, ...borcSnapshot2.docs]
        .filter((doc, index, self) => index === self.findIndex(d => d.id === doc.id));
      
      console.log(`${uniqueBorcDocs.length} borç kaydı bulundu`);
      
      // Etkilenen cari ID'lerini topla
      const etkilenenCariIds = new Set<string>();
      
      // Her bir borç kaydı için silme işlemi
      for (const borcDoc of uniqueBorcDocs) {
        const borcData = borcDoc.data();
        etkilenenCariIds.add(borcData.cariId);
        
        console.log(`Borç kaydı siliniyor: ${borcDoc.id} (Cari: ${borcData.cariId})`);
        
        // İlgili tüm ödeme kayıtlarını bul ve sil
        const odemeQuery = query(
          collection(db, COLLECTIONS.reservation_cari_odemeler),
          where("borcId", "==", borcDoc.id)
        );
        const odemeSnapshot = await getDocs(odemeQuery);
        
        // Ödemeleri sil
        const odemeDeletePromises = odemeSnapshot.docs.map(async (odemeDoc) => {
          console.log(`Ödeme kaydı siliniyor: ${odemeDoc.id}`);
          await deleteDoc(doc(db, COLLECTIONS.reservation_cari_odemeler, odemeDoc.id));
        });
        await Promise.all(odemeDeletePromises);
        
        // Borç kaydını sil
        await deleteDoc(doc(db, COLLECTIONS.reservation_cari_borclar, borcDoc.id));
      }
      
      console.log(`${etkilenenCariIds.size} cari kartı kontrol edilecek`);
      
      // Etkilenen cari kartlarını kontrol et ve boş ise sil
      const cariCheckPromises = Array.from(etkilenenCariIds).map(async (cariId) => {
        try {
          await this.checkAndDeleteEmptyCari(cariId);
        } catch (error) {
          console.error(`Cari kontrol hatası (${cariId}):`, error);
        }
      });
      await Promise.all(cariCheckPromises);
      
      console.log(`Rezervasyon cari temizliği tamamlandı: ${reservationId}`);
      
    } catch (error) {
      console.error("Rezervasyon cari silme hatası:", error);
      throw error;
    }
  }

  // Boş cari kartını kontrol et ve sil
  static async checkAndDeleteEmptyCari(cariId: string): Promise<void> {
    try {
      const db = this.getFirestore();
      
      console.log(`Boş cari kontrolü: ${cariId}`);
      
      // Önce cari kartı bilgilerini al
      const cariRef = doc(db, COLLECTIONS.reservation_cari, cariId);
      const cariDoc = await getDoc(cariRef);
      
      if (!cariDoc.exists()) {
        console.log(`Cari kartı zaten silinmiş: ${cariId}`);
        return;
      }
      
      const cariData = cariDoc.data();
      
      // Bu cariye ait tüm borç kayıtlarını kontrol et
      const borcQuery = query(
        collection(db, COLLECTIONS.reservation_cari_borclar),
        where("cariId", "==", cariId)
      );
      const borcSnapshot = await getDocs(borcQuery);
      
      // Bu cariye ait tüm ödemeleri kontrol et
      const odemeQuery = query(
        collection(db, COLLECTIONS.reservation_cari_odemeler),
        where("cariId", "==", cariId)
      );
      const odemeSnapshot = await getDocs(odemeQuery);
      
      console.log(`Cari ${cariId} için:
        - ${borcSnapshot.docs.length} borç kaydı
        - ${odemeSnapshot.docs.length} ödeme kaydı bulundu`);
      
      // Eğer hiç borç ve ödeme kaydı yoksa cari kartını sil
      if (borcSnapshot.empty && odemeSnapshot.empty) {
        // Kalan ödeme kayıtlarını temizle
        const deleteOdemePromises = odemeSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        await Promise.all(deleteOdemePromises);
        
        // Cari kartını sil
        await deleteDoc(cariRef);
        console.log(`Boş cari kartı silindi: ${cariData.companyName} (${cariId})`);
      } else {
        // Borç kayıtları varsa bakiyeyi güncelle
        console.log(`Cari ${cariId} boş değil, bakiye güncelleniyor`);
        await this.updateCariBalance(cariId);
      }
    } catch (error) {
      console.error("Boş cari kontrol hatası:", error);
      throw error;
    }
  }

  // Bakım fonksiyonu - Geçersiz borç kayıtlarını temizle
  static async cleanupInvalidDebtRecords(): Promise<number> {
    try {
      const db = this.getFirestore();
      let cleanedCount = 0;
      
      // Tüm borç kayıtlarını getir
      const borcQuery = query(collection(db, COLLECTIONS.reservation_cari_borclar));
      const borcSnapshot = await getDocs(borcQuery);
      
      // Her borç kaydı için rezervasyon var mı kontrol et
      for (const borcDoc of borcSnapshot.docs) {
        const borcData = borcDoc.data();
        const reservationRef = doc(db, 'reservations', borcData.reservationId);
        const reservationDoc = await getDoc(reservationRef);
        
        if (!reservationDoc.exists()) {
          // Rezervasyon yoksa borç kaydını sil
          console.log(`Geçersiz borç kaydı siliniyor: ${borcDoc.id} (Rezervasyon: ${borcData.reservationId})`);
          
          // İlgili ödeme kayıtlarını da sil
          const odemeQuery = query(
            collection(db, COLLECTIONS.reservation_cari_odemeler),
            where("borcId", "==", borcDoc.id)
          );
          const odemeSnapshot = await getDocs(odemeQuery);
          
          for (const odemeDoc of odemeSnapshot.docs) {
            await deleteDoc(doc(db, COLLECTIONS.reservation_cari_odemeler, odemeDoc.id));
          }
          
          // Borç kaydını sil
          await deleteDoc(doc(db, COLLECTIONS.reservation_cari_borclar, borcDoc.id));
          cleanedCount++;
        }
      }
      
      // Boş kalan cari kartlarını kontrol et ve sil
      const cariQuery = query(collection(db, COLLECTIONS.reservation_cari));
      const cariSnapshot = await getDocs(cariQuery);
      
      for (const cariDoc of cariSnapshot.docs) {
        await this.checkAndDeleteEmptyCari(cariDoc.id);
      }
      
      console.log(`Bakım tamamlandı: ${cleanedCount} geçersiz borç kaydı temizlendi`);
      return cleanedCount;
      
    } catch (error) {
      console.error("Bakım fonksiyonu hatası:", error);
      throw error;
    }
  }

  // Cari kartını manuel olarak sil (tüm ilgili kayıtlarla birlikte)
  static async deleteCari(cariId: string): Promise<void> {
    try {
      const db = this.getFirestore();
      
      console.log(`Cari silme işlemi başlatıldı: ${cariId}`);
      
      // 1. Bu cariye ait tüm borç kayıtlarını bul ve sil
      const borcQuery = query(
        collection(db, COLLECTIONS.reservation_cari_borclar),
        where("cariId", "==", cariId)
      );
      const borcSnapshot = await getDocs(borcQuery);
      
      // Borç kayıtlarını ve bağlantılı ödemeleri sil
      for (const borcDoc of borcSnapshot.docs) {
        // Her borç kaydı için ilgili ödemeleri bul ve sil
        const odemeQuery = query(
          collection(db, COLLECTIONS.reservation_cari_odemeler),
          where("borcId", "==", borcDoc.id)
        );
        const odemeSnapshot = await getDocs(odemeQuery);
        
        // Ödemeleri tek tek sil
        for (const odemeDoc of odemeSnapshot.docs) {
          await deleteDoc(odemeDoc.ref);
          console.log(`Ödeme silindi: ${odemeDoc.id}`);
        }
        
        // Borç kaydını sil
        await deleteDoc(borcDoc.ref);
        console.log(`Borç kaydı silindi: ${borcDoc.id}`);
      }
      
      // 2. Bu cariye ait tüm genel ödemeleri bul ve sil
      const genelOdemeQuery = query(
        collection(db, COLLECTIONS.reservation_cari_odemeler),
        where("cariId", "==", cariId)
      );
      const genelOdemeSnapshot = await getDocs(genelOdemeQuery);
      
      // Genel ödemeleri sil
      for (const odemeDoc of genelOdemeSnapshot.docs) {
        await deleteDoc(odemeDoc.ref);
        console.log(`Genel ödeme silindi: ${odemeDoc.id}`);
      }
      
      // 3. Bu carinin rezervasyon bağlantılarını temizle
      const reservationQuery = query(
        collection(db, 'reservations'),
        where("cariId", "==", cariId)
      );
      const reservationSnapshot = await getDocs(reservationQuery);
      
      for (const resDoc of reservationSnapshot.docs) {
        await updateDoc(resDoc.ref, {
          cariId: deleteField(),
          cariLink: deleteField(),
          updatedAt: Timestamp.now()
        });
        console.log(`Rezervasyon bağlantısı temizlendi: ${resDoc.id}`);
      }
      
      // 4. Son olarak cari kartını sil
      const cariRef = doc(db, COLLECTIONS.reservation_cari, cariId);
      await deleteDoc(cariRef);
      console.log(`Cari kartı silindi: ${cariId}`);

    } catch (error) {
      console.error("Cari silme hatası:", error);
      throw error;
    }
  }

  // Tüm cari kartlarından genel istatistikleri hesapla
  static async getGeneralStatistics(period: string): Promise<{
    totalCariCount: number;
    totalReservations: number;
    paidReservations: number;
    unpaidReservations: number;
    debtorCount: number;
    creditorCount: number;
  }> {
    try {
      const db = this.getFirestore();
      
      // Tüm cari kartlarını getir
      const cariList = await this.getAllCari(period);
      
      // Tüm borç kayıtlarını getir (bu dönem için)
      const borcQuery = query(
        collection(db, COLLECTIONS.reservation_cari_borclar),
        where("period", "==", period)
      );
      const borcSnapshot = await getDocs(borcQuery);
      
      // Rezervasyon sayısını hesapla (her borç kaydı bir rezervasyonu temsil eder)
      const totalReservations = borcSnapshot.docs.length;
      
      // Cari kart bazında ödeme durumunu hesapla
      let paidCariCount = 0; // Tüm borçları ödenmiş cari kart sayısı
      let unpaidCariCount = 0; // Borcu kalan cari kart sayısı
      
      console.log(`🔍 Cari Kart Bazında İstatistik Hesaplanıyor...`);
      
      // Her cari kart için ödeme durumunu kontrol et
      cariList.forEach(cari => {
        console.log(`Cari: ${cari.companyName}, Bakiye: ${cari.balance}, Toplam Borç: ${cari.totalDebt}, Toplam Ödeme: ${cari.totalPayment}`);
        
        // Cari kartın bakiyesine göre durumu belirle
        // balance = totalDebt - totalPayment
        // balance <= 0 ise tüm borçları ödenmiş demektir
        if (cari.balance <= 0 && cari.totalDebt > 0) {
          paidCariCount++;
          console.log(`✅ Ödenen cari: ${cari.companyName} (Bakiye: ${cari.balance})`);
        } else if (cari.balance > 0) {
          unpaidCariCount++;
          console.log(`❌ Bekleyen cari: ${cari.companyName} (Bakiye: ${cari.balance})`);
        } else {
          // Hiç borcu olmayan cariler (balance = 0 ve totalDebt = 0)
          console.log(`➖ Borcu olmayan cari: ${cari.companyName}`);
        }
      });
      
      console.log(`🔍 Cari Bazında İstatistik Özeti:`);
      console.log(`   - Toplam Cari: ${cariList.length}`);
      console.log(`   - Ödenen Cari: ${paidCariCount}`);
      console.log(`   - Bekleyen Cari: ${unpaidCariCount}`);
      console.log(`   - Toplam Rezervasyon: ${totalReservations}`);
      
      return {
        totalCariCount: cariList.length,
        totalReservations,
        paidReservations: paidCariCount, // Artık cari kart bazında
        unpaidReservations: unpaidCariCount, // Artık cari kart bazında
        debtorCount: cariList.filter(c => c.balance > 0).length,
        creditorCount: cariList.filter(c => c.balance < 0).length,
      };
    } catch (error) {
      console.error("Genel istatistik hesaplama hatası:", error);
      return {
        totalCariCount: 0,
        totalReservations: 0,
        paidReservations: 0,
        unpaidReservations: 0,
        debtorCount: 0,
        creditorCount: 0,
      };
    }
  }

  // Cariye ait ödemeleri getir - geriye uyumluluk için
  static async getPaymentsByCariId(cariId: string): Promise<ReservationCariPayment[]> {
    try {
      const odemeDetaylar = await this.getOdemeDetaysByCariId(cariId);
      
      // Formatı dönüştür
      return odemeDetaylar.map(odeme => ({
        ...odeme,
        type: "payment" as "payment",
        amount: odeme.tutar,
        description: odeme.aciklama,
        date: odeme.tarih,
        currency: "TRY", // Varsayılan
        paymentMethod: odeme.odemeYontemi,
        receiptNumber: odeme.fisNumarasi,
      }));
    } catch (error) {
      console.error("Cari ödemeleri getirme hatası:", error);
      throw error;
    }
  }

  // Ödeme ekle - geriye uyumluluk için
  static async addPayment(paymentData: {
    cariId: string;
    borcId?: string;
    reservationId?: string;
    tutar?: number;
    tarih?: string;
    aciklama?: string;
    odemeYontemi?: string;
    odemeYapan?: string;
    fisNumarasi?: string;
    // Ek alanlar
    type?: "debt" | "payment";
    amount?: number;
    description?: string;
    date?: any; // Timestamp veya string
    currency?: string;
    paymentMethod?: string;
    receiptNumber?: string;
    period?: string;
  }): Promise<void> {
    try {
      // Parametreleri dönüştür
      const tutar = paymentData.amount || paymentData.tutar || 0;
      const tarih = paymentData.date ? 
        (typeof paymentData.date === 'string' ? paymentData.date : paymentData.date.toDate?.()?.toISOString()?.split('T')[0]) :
        paymentData.tarih || new Date().toISOString().split('T')[0];
      const aciklama = paymentData.description || paymentData.aciklama || "";
      const odemeYontemi = paymentData.paymentMethod || paymentData.odemeYontemi;
      const fisNumarasi = paymentData.receiptNumber || paymentData.fisNumarasi;
      
      // Eğer borcId yoksa, dummy bir değer ver (eski kullanım için)
      const borcId = paymentData.borcId || "dummy-borc-id";
      
      await this.addOdeme(
        borcId,
        tutar,
        tarih,
        aciklama,
        odemeYontemi,
        paymentData.odemeYapan,
        fisNumarasi
      );
    } catch (error) {
      console.error("Ödeme ekleme hatası:", error);
      throw error;
    }
  }

  // Yeni genel ödeme ekleme fonksiyonu (rezervasyon bağımsız)
  static async addGeneralOdeme(paymentData: {
    cariId: string;
    tutar: number;
    paraBirimi: string;
    tarih: string;
    aciklama: string;
    odemeYontemi?: string;
    odemeYapan?: string;
    fisNumarasi?: string;
    reservationId?: string | null;
    paymentId?: string | null;
    cariBakiye?: number; // Yeni alan
  }): Promise<void> {
    try {
      const db = this.getFirestore();
      
      // Ödeme kaydını oluştur
      const odemeData: Omit<ReservationOdemeDetay, 'id'> = {
        cariId: paymentData.cariId,
        borcId: paymentData.paymentId || null, // Genel ödemeler için null
        reservationId: paymentData.reservationId || null, // Genel ödemeler için null
        tutar: paymentData.tutar,
        tarih: paymentData.tarih,
        aciklama: paymentData.aciklama,
        odemeYontemi: paymentData.odemeYontemi,
        odemeYapan: paymentData.odemeYapan,
        fisNumarasi: paymentData.fisNumarasi,
        createdAt: Timestamp.now(),
        period: new Date().getFullYear().toString(),
        paraBirimi: paymentData.paraBirimi,
        cariBakiye: paymentData.cariBakiye, // Yeni alan
      };
      
      await addDoc(collection(db, COLLECTIONS.reservation_cari_odemeler), odemeData);
      
      // Cari bakiyesini güncelle
      await this.updateCariBalance(paymentData.cariId);
    } catch (error) {
      console.error("Genel ödeme ekleme hatası:", error);
      throw error;
    }
  }

  // Ödeme güncelleme fonksiyonu
  static async updatePayment(paymentId: string, updateData: {
    tutar: number;
    paraBirimi: string;
    tarih: string;
    aciklama: string;
    odemeYontemi?: string;
    odemeYapan?: string;
    fisNumarasi?: string;
  }): Promise<void> {
    try {
      const db = this.getFirestore();
      
      const paymentRef = doc(db, COLLECTIONS.reservation_cari_odemeler, paymentId);
      const paymentDoc = await getDoc(paymentRef);
      
      if (!paymentDoc.exists()) {
        throw new Error("Ödeme kaydı bulunamadı");
      }

      const existingPayment = paymentDoc.data() as ReservationOdemeDetay;
      
      await updateDoc(paymentRef, {
        tutar: updateData.tutar,
        paraBirimi: updateData.paraBirimi,
        tarih: updateData.tarih,
        aciklama: updateData.aciklama,
        odemeYontemi: updateData.odemeYontemi,
        odemeYapan: updateData.odemeYapan,
        fisNumarasi: updateData.fisNumarasi,
        updatedAt: Timestamp.now(),
      });
      
      // Cari bakiyesini güncelle
      await this.updateCariBalance(existingPayment.cariId);
    } catch (error) {
      console.error("Ödeme güncelleme hatası:", error);
      throw error;
    }
  }

  // Ödeme silme fonksiyonu (sadece genel ödemeler + debug için tüm ödemeler)
  static async deletePayment(paymentId: string, forceDelete = false): Promise<void> {
    try {
      const db = this.getFirestore();
      
      const paymentRef = doc(db, COLLECTIONS.reservation_cari_odemeler, paymentId);
      const paymentDoc = await getDoc(paymentRef);
      
      if (!paymentDoc.exists()) {
        throw new Error("Ödeme kaydı bulunamadı");
      }

      const paymentData = paymentDoc.data() as ReservationOdemeDetay;
      
      // Force delete yoksa rezervasyon bağlantılı kontrol et
      if (!forceDelete) {
        const isReservationLinked = (paymentData.reservationId && paymentData.reservationId.trim() !== '') ||
                                   (paymentData.borcId && paymentData.borcId.trim() !== '');
        
        if (isReservationLinked) {
          throw new Error("Rezervasyon bağlantılı ödemeler sadece rezervasyon sayfasından silinebilir");
        }
      }
      
      await deleteDoc(paymentRef);
      
      // Cari bakiyesini güncelle
      await this.updateCariBalance(paymentData.cariId);
    } catch (error) {
      console.error("Ödeme silme hatası:", error);
      throw error;
    }
  }
}
