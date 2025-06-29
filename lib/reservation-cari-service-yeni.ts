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
      
      // Önce firma için cari var mı kontrol et
      let cariId = await this.getCariByCompanyName(reservationData.firma, reservationData.period);
      
      // Cari yoksa oluştur
      if (!cariId) {
        cariId = await this.createCari({
          companyName: reservationData.firma,
          contactPerson: reservationData.yetkiliKisi || "",
          contactPhone: reservationData.yetkiliTelefon || "",
          contactEmail: reservationData.yetkiliEmail || "",
          period: reservationData.period || new Date().getFullYear().toString(),
        });
      }

      // Toplam kişi sayısını hesapla
      const toplamKisi = (parseInt(reservationData.yetiskinSayisi) || 0) + 
                        (parseInt(reservationData.cocukSayisi) || 0) + 
                        (parseInt(reservationData.bebekSayisi) || 0);

      // Borç kaydını oluştur
      const borcData: Omit<ReservationBorcDetay, 'id'> = {
        cariId,
        reservationId: reservationData.id,
        turTarih: reservationData.turTarihi,
        firma: reservationData.firma,
        tutar: parseFloat(reservationData.toplamTutar || reservationData.tutar || "0"),
        odeme: parseFloat(reservationData.odemeMiktari || "0"),
        kalan: parseFloat(reservationData.toplamTutar || reservationData.tutar || "0") - parseFloat(reservationData.odemeMiktari || "0"),
        destinasyon: reservationData.destinasyon,
        musteri: reservationData.musteriAdiSoyadi,
        kisi: toplamKisi,
        alisYeri: reservationData.alisYeri,
        alis: reservationData.alisSaati,
        paraBirimi: reservationData.paraBirimi || "EUR",
        reservationSeriNo: reservationData.seriNumarasi,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        period: reservationData.period || new Date().getFullYear().toString(),
      };

      // Eğer başlangıçta ödeme varsa, ödeme tarihi de ekle
      if (borcData.odeme > 0) {
        borcData.odemeTarih = reservationData.odemeTarihi;
      }

      const borcRef = await addDoc(collection(db, COLLECTIONS.reservation_cari_borclar), borcData);
      
      // Cari bakiyesini güncelle
      await this.updateCariBalance(cariId);

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
  static async addOdeme(borcId: string, tutar: number, tarih: string, aciklama: string, odemeYontemi?: string, fisNumarasi?: string): Promise<void> {
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

  // Cariye ait borç detaylarını getir
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
      
      // Client-side sıralama (en yeni rezervasyonlar üstte)
      return borclar.sort((a, b) => new Date(b.turTarih).getTime() - new Date(a.turTarih).getTime());
    } catch (error) {
      console.error("Borç detayları getirme hatası:", error);
      throw error;
    }
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

  // Cari bilgilerini getir
  static async getCariById(cariId: string): Promise<ReservationCari | null> {
    try {
      const db = this.getFirestore();
      const cariRef = doc(db, COLLECTIONS.reservation_cari, cariId);
      const cariDoc = await getDoc(cariRef);
      
      if (cariDoc.exists()) {
        return {
          id: cariDoc.id,
          ...cariDoc.data(),
        } as ReservationCari;
      }
      return null;
    } catch (error) {
      console.error("Cari bilgisi getirme hatası:", error);
      throw error;
    }
  }
}
