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

export interface ReservationCariPayment {
  id?: string;
  cariId: string; // Hangi cariye ait
  type: "debt" | "payment"; // Borç mu ödeme mi
  amount: number;
  description: string;
  date: Timestamp;
  reservationId?: string; // Rezervasyonla ilişki (opsiyonel)
  currency: "TRY" | "USD" | "EUR";
  exchangeRate?: number;
  paymentMethod?: string; // Ödeme yöntemi (nakit, kredi kartı, etc.)
  receiptNumber?: string; // Fiş/Fatura numarası
  createdAt: Timestamp;
  updatedAt: Timestamp;
  period: string;
}

// Rezervasyon Cari CRUD İşlemleri
export class ReservationCariService {
  
  // Firestore instance al
  private static getFirestore() {
    const db = getDb();
    if (!db) {
      throw new Error("Firestore instance'ına erişilemedi");
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

  // Cari güncelle
  static async updateCari(cariId: string, updates: Partial<ReservationCari>): Promise<void> {
    try {
      const db = this.getFirestore();
      const cariRef = doc(db, COLLECTIONS.reservation_cari, cariId);
      await updateDoc(cariRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Rezervasyon cari güncelleme hatası:", error);
      throw error;
    }
  }

  // Cari sil (dikkatli kullanın!)
  static async deleteCari(cariId: string): Promise<void> {
    try {
      const db = this.getFirestore();
      // Önce bu cariye ait tüm ödemeleri sil
      const paymentsQuery = query(
        collection(db, COLLECTIONS.reservation_cari_payments),
        where("cariId", "==", cariId)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const deletePromises = paymentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Sonra cariyi sil
      await deleteDoc(doc(db, COLLECTIONS.reservation_cari, cariId));
    } catch (error) {
      console.error("Rezervasyon cari silme hatası:", error);
      throw error;
    }
  }

  // Tüm carileri getir
  static async getAllCari(period: string): Promise<ReservationCari[]> {
    try {
      const db = this.getFirestore();
      const q = query(
        collection(db, COLLECTIONS.reservation_cari),
        where("period", "==", period),
        orderBy("companyName", "asc")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as ReservationCari));
    } catch (error) {
      console.error("Rezervasyon cari listesi getirme hatası:", error);
      throw error;
    }
  }

  // Tek cari getir
  static async getCariById(cariId: string): Promise<ReservationCari | null> {
    try {
      const db = this.getFirestore();
      const cariDoc = await getDoc(doc(db, COLLECTIONS.reservation_cari, cariId));
      if (!cariDoc.exists()) return null;
      
      return {
        id: cariDoc.id,
        ...cariDoc.data(),
      } as ReservationCari;
    } catch (error) {
      console.error("Rezervasyon cari getirme hatası:", error);
      throw error;
    }
  }

  // Şirket adına göre cari bul (rezervasyon oluştururken kullanılacak)
  static async getCariByCompanyName(companyName: string, period: string): Promise<ReservationCari | null> {
    try {
      const db = this.getFirestore();
      const q = query(
        collection(db, COLLECTIONS.reservation_cari),
        where("companyName", "==", companyName),
        where("period", "==", period)
      );
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      
      const docSnap = querySnapshot.docs[0];
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as ReservationCari;
    } catch (error) {
      console.error("Şirket adına göre cari arama hatası:", error);
      throw error;
    }
  }

  // Cari Ödeme İşlemleri

  // Ödeme/borç ekle
  static async addPayment(paymentData: Omit<ReservationCariPayment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const db = this.getFirestore();
      const now = Timestamp.now();
      const newPayment: Omit<ReservationCariPayment, 'id'> = {
        ...paymentData,
        createdAt: now,
        updatedAt: now,
      };

      // Ödemeyi ekle
      const docRef = await addDoc(collection(db, COLLECTIONS.reservation_cari_payments), newPayment);
      
      // Cari bakiyesini güncelle
      await this.updateCariBalance(paymentData.cariId);
      
      return docRef.id;
    } catch (error) {
      console.error("Rezervasyon cari ödeme ekleme hatası:", error);
      throw error;
    }
  }

  // Ödeme güncelle
  static async updatePayment(paymentId: string, updates: Partial<ReservationCariPayment>): Promise<void> {
    try {
      const db = this.getFirestore();
      const paymentRef = doc(db, COLLECTIONS.reservation_cari_payments, paymentId);
      const paymentDoc = await getDoc(paymentRef);
      
      if (!paymentDoc.exists()) {
        throw new Error("Ödeme bulunamadı");
      }

      const oldPayment = paymentDoc.data() as ReservationCariPayment;
      
      await updateDoc(paymentRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });

      // Bakiyeyi güncelle
      await this.updateCariBalance(oldPayment.cariId);
    } catch (error) {
      console.error("Rezervasyon cari ödeme güncelleme hatası:", error);
      throw error;
    }
  }

  // Ödeme sil
  static async deletePayment(paymentId: string): Promise<void> {
    try {
      const db = this.getFirestore();
      const paymentRef = doc(db, COLLECTIONS.reservation_cari_payments, paymentId);
      const paymentDoc = await getDoc(paymentRef);
      
      if (!paymentDoc.exists()) {
        throw new Error("Ödeme bulunamadı");
      }

      const payment = paymentDoc.data() as ReservationCariPayment;
      const cariId = payment.cariId;

      // Ödemeyi sil
      await deleteDoc(paymentRef);
      
      // Bakiyeyi güncelle
      await this.updateCariBalance(cariId);
    } catch (error) {
      console.error("Rezervasyon cari ödeme silme hatası:", error);
      throw error;
    }
  }

  // Cariye ait tüm ödemeleri getir
  static async getPaymentsByCariId(cariId: string): Promise<ReservationCariPayment[]> {
    try {
      const db = this.getFirestore();
      const q = query(
        collection(db, COLLECTIONS.reservation_cari_payments),
        where("cariId", "==", cariId),
        orderBy("date", "desc")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as ReservationCariPayment));
    } catch (error) {
      console.error("Rezervasyon cari ödemeler getirme hatası:", error);
      throw error;
    }
  }

  // Cari bakiyesini güncelle (özel method)
  private static async updateCariBalance(cariId: string): Promise<void> {
    try {
      // Bu cariye ait tüm ödemeleri getir
      const payments = await this.getPaymentsByCariId(cariId);
      
      let totalDebt = 0;
      let totalPayment = 0;

      payments.forEach(payment => {
        if (payment.type === "debt") {
          totalDebt += payment.amount;
        } else if (payment.type === "payment") {
          totalPayment += payment.amount;
        }
      });

      const balance = totalDebt - totalPayment;

      // Cari bilgilerini güncelle
      await this.updateCari(cariId, {
        totalDebt,
        totalPayment,
        balance,
      });
    } catch (error) {
      console.error("Cari bakiye güncelleme hatası:", error);
      throw error;
    }
  }

  // Rezervasyon oluşturulduğunda otomatik cari ve borç oluştur
  static async createFromReservation(reservationData: {
    companyName: string;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    reservationId: string;
    amount: number;
    description: string;
    period: string;
  }): Promise<{ cariId: string; paymentId: string }> {
    try {
      // Önce bu şirket için cari var mı kontrol et
      let cari = await this.getCariByCompanyName(reservationData.companyName, reservationData.period);
      
      let cariId: string;
      
      if (!cari) {
        // Cari yoksa oluştur
        cariId = await this.createCari({
          companyName: reservationData.companyName,
          contactPerson: reservationData.contactPerson,
          contactPhone: reservationData.contactPhone,
          contactEmail: reservationData.contactEmail,
          period: reservationData.period,
        });
      } else {
        cariId = cari.id!;
      }

      // Borç kaydı oluştur
      const paymentId = await this.addPayment({
        cariId,
        type: "debt",
        amount: reservationData.amount,
        description: reservationData.description,
        date: Timestamp.now(),
        reservationId: reservationData.reservationId,
        currency: "TRY",
        period: reservationData.period,
      });

      return { cariId, paymentId };
    } catch (error) {
      console.error("Rezervasyondan cari oluşturma hatası:", error);
      throw error;
    }
  }

  // Özet raporları
  static async getCariSummary(period: string): Promise<{
    totalCari: number;
    totalDebt: number;
    totalPayment: number;
    totalBalance: number;
  }> {
    try {
      const cariList = await this.getAllCari(period);
      
      const summary = cariList.reduce(
        (acc, cari) => ({
          totalCari: acc.totalCari + 1,
          totalDebt: acc.totalDebt + cari.totalDebt,
          totalPayment: acc.totalPayment + cari.totalPayment,
          totalBalance: acc.totalBalance + cari.balance,
        }),
        { totalCari: 0, totalDebt: 0, totalPayment: 0, totalBalance: 0 }
      );

      return summary;
    } catch (error) {
      console.error("Rezervasyon cari özet getirme hatası:", error);
      throw error;
    }
  }
}

export default ReservationCariService;
