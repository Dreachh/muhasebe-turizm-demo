import { getDb } from "@/lib/firebase-client-module";
import { COLLECTIONS } from "@/lib/db-firebase";
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, setDoc } from "firebase/firestore";

// Borç açıklamasından gider/aktivite adını çıkaran yardımcı fonksiyon
function extractItemNameFromDebt(description: string): string {
  try {
    // Açıklama şu formatta olmalı: "${tourData.customerName} turu için ${item.name} (${item.type || item.category})"
    // veya: "${tourData.customerName} turu için ${item.name} Aktivitesi"
    
    const forIndex = description.indexOf(' turu için ');
    if (forIndex === -1) return '';
    
    // "turu için " kısmından sonraki metni al
    let itemName = description.substring(forIndex + ' turu için '.length);
    
    // Türe göre farklı işle
    if (itemName.includes(' Aktivitesi')) {
      // Aktiviteyse, " Aktivitesi" kısmını çıkar
      return itemName.replace(' Aktivitesi', '');
    } else {
      // Giderse, parantez kısmından öncesini al
      const openParenIndex = itemName.indexOf(' (');
      if (openParenIndex !== -1) {
        return itemName.substring(0, openParenIndex);
      }
      return itemName;
    }
  } catch (e) {
    console.error('Borç açıklamasından öğe adı çıkarılırken hata:', e);
    return '';
  }
}

// Borç tipleri
export interface Debt {
  id: string;
  companyId: string;
  amount: number;
  currency: string;
  description: string;
  dueDate: Date;
  status: 'unpaid' | 'partially_paid' | 'paid';
  paidAmount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  companyId: string;
  debtId?: string;
  amount: number;
  currency: string;
  description: string;
  paymentDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  type?: string;
}

// Müşteri borcu arayüzü
export interface CustomerDebt {
  id: string;
  customerId: string;
  customerName: string;
  tourId?: string;
  amount: number;
  currency: string;
  description: string;
  dueDate?: Date;
  status: 'unpaid' | 'partially_paid' | 'paid';
  paidAmount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  sourceType: 'expense' | 'activity'; // Borcun kaynağı (gider veya aktivite)
  sourceId: string; // Gider veya aktivite ID'si
}

// Borçları getir
export const getDebts = async () => {
  try {
    const db = getDb();
    const debtsRef = collection(db, COLLECTIONS.DEBTS);
    const snapshot = await getDocs(debtsRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate?.() || null,
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error("Borçlar getirilirken hata:", error);
    return [];
  }
};

// Ödemeleri getir
export const getPayments = async () => {
  try {
    const db = getDb();
    const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
    const snapshot = await getDocs(paymentsRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      paymentDate: doc.data().paymentDate?.toDate?.() || null,
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error("Ödemeler getirilirken hata:", error);
    return [];
  }
};

// Tedarikçileri getir
export const getSuppliers = async () => {
  try {
    const db = getDb();
    const companiesRef = collection(db, COLLECTIONS.COMPANIES);
    const q = query(companiesRef, where("type", "==", "supplier"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Tedarikçiler getirilirken hata:", error);
    return [];
  }
};

// Borç ekle
export const addDebt = async (debtData: Omit<Debt, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'paidAmount'>) => {
  try {
    const db = getDb();
    const now = new Date();
    const debtWithDates = {
      ...debtData,
      createdAt: now,
      updatedAt: now,
      status: 'unpaid',
      paidAmount: 0,
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.DEBTS), debtWithDates);
    return { id: docRef.id, ...debtWithDates };
  } catch (error) {
    console.error("Borç eklenirken hata:", error);
    throw error;
  }
};

// Ödeme ekle
export const addPayment = async (paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const db = getDb();
    const now = new Date();
    const paymentWithDates = {
      ...paymentData,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.PAYMENTS), paymentWithDates);
    
    // Eğer ödeme bir borca bağlıysa borç durumunu güncelle
    if (paymentData.debtId) {
      const debtRef = doc(db, COLLECTIONS.DEBTS, paymentData.debtId);
      const debtDoc = await getDoc(debtRef);
      
      if (debtDoc.exists()) {
        const debtData = debtDoc.data();
        const currentPaidAmount = debtData.paidAmount || 0;
        const newPaidAmount = currentPaidAmount + paymentData.amount;
        const totalAmount = debtData.amount;
        
        let newStatus = 'unpaid';
        if (newPaidAmount >= totalAmount) {
          newStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'partially_paid';
        }
        
        await updateDoc(debtRef, {
          paidAmount: newPaidAmount,
          status: newStatus,
          updatedAt: now,
        });
      }
    }
    
    return { id: docRef.id, ...paymentWithDates };
  } catch (error) {
    console.error("Ödeme eklenirken hata:", error);
    throw error;
  }
};

// Müşteri borçlarını getir
export const getCustomerDebts = async () => {
  try {
    const db = getDb();
    const debtsRef = collection(db, COLLECTIONS.CUSTOMER_DEBTS);
    const snapshot = await getDocs(debtsRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate?.() || null,
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error("Müşteri borçları getirilirken hata:", error);
    return [];
  }
};

// Müşteri borcu ekle
export const addCustomerDebt = async (debtData: Omit<CustomerDebt, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'paidAmount'>) => {
  try {
    const db = getDb();
    const now = new Date();
    const debtWithDates = {
      ...debtData,
      createdAt: now,
      updatedAt: now,
      status: 'unpaid' as const,
      paidAmount: 0,
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.CUSTOMER_DEBTS), debtWithDates);
    return { id: docRef.id, ...debtWithDates };
  } catch (error) {
    console.error("Müşteri borcu eklenirken hata:", error);
    throw error;
  }
};

// Tur verisi arayüzü - Tour verisi için kısmi bir tanımlama
interface TourExpense {
  id: string;
  name: string;
  type?: string;
  amount: string | number;
  currency: string;
  details?: string;
  addToDebt?: boolean;
  companyId?: string; // Tedarikçi ID'si
  companyName?: string; // Tedarikçi Adı
  category?: string; // Gider kategorisi
}

interface TourActivity {
  id: string;
  name: string;
  price: string | number;
  currency: string;
  participants?: string | number;
  participantsType?: string;
  details?: string;
  addToDebt?: boolean;
  companyId?: string; // Aktivite için de tedarikçi olabilir
  companyName?: string; // Aktivite için tedarikçi adı
}

interface TourData {
  id: string;
  customerName: string;
  customerIdNumber?: string; // Eklendi: Müşteri TCKN/Pasaport No
  serialNumber?: string; // Tur seri numarası
  numberOfPeople?: string | number;
  expenses?: TourExpense[];
  activities?: TourActivity[];
}

// Tur aktivitelerinden ve giderlerinden müşteri borçlarını oluştur
export const createCustomerDebtsFromTour = async (tourData: TourData) => {
  try {
    const results = [];
    
    // Müşteri bilgilerini hazırla
    const customerId = tourData.customerIdNumber || tourData.id;
    const customerName = tourData.customerName;
    const tourId = tourData.id;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Varsayılan olarak 30 gün sonra
    
    console.log('Tur verileri MÜŞTERİ borcu oluşturma için kontrol ediliyor:', {
      expenses: tourData.expenses?.length || 0,
      activities: tourData.activities?.length || 0,
      customerIdUsed: customerId
    });
    
    // Borç olarak işaretlenmiş giderleri ekle (TEDARİKÇİ GİDERLERİ HARİÇ)
    if (tourData.expenses && tourData.expenses.length > 0) {
      for (const expense of tourData.expenses) {
        console.log('Gider MÜŞTERİ borç kontrolü:', {
          name: expense.name,
          addToDebt: expense.addToDebt,
          companyId: expense.companyId, // Tedarikçi kontrolü için eklendi
          amount: expense.amount,
          currency: expense.currency
        });
        
        // Eğer bir companyId varsa, bu bir tedarikçi borcudur, müşteri borcu değil.
        if (expense.addToDebt && !expense.companyId) {
          const amount = parseFloat(expense.amount as string);
          if (isNaN(amount) || amount <= 0) {
            console.warn('Geçersiz gider tutarı, müşteri borcu oluşturulmayacak:', expense.name);
            continue;
          }          // Kategori Türkçe karşılık haritası
          const categoryMap: Record<string, string> = {
            'accommodation': 'Konaklama',
            'transportation': 'Ulaşım',
            'transfer': 'Transfer',
            'guide': 'Rehberlik',
            'agency': 'Acente',
            'porter': 'Hanutçu',
            'food': 'Yemek',
            'meal': 'Yemek',
            'activity': 'Aktivite',
            'general': 'Genel',
            'other': 'Diğer'
          };

          // Kategori çevirisi yap
          const rawCategory = expense.type || expense.category || 'Gider';
          const translatedCategory = categoryMap[rawCategory] || rawCategory;
          
          // Tur seri numarası ile başlayan açıklama oluştur
          const serialNumber = tourData.serialNumber || '';
          
          const debtData = {
            customerId,
            customerName,
            tourId,
            amount: amount,
            currency: expense.currency,
            description: `${serialNumber ? serialNumber + ' - ' : ''}${tourData.customerName} turu için ${expense.name} (${translatedCategory})`,
            dueDate,
            sourceType: 'expense' as const,
            sourceId: expense.id,
            notes: expense.details || '',
          };
          
          console.log('Yeni MÜŞTERİ borç kaydı oluşturuluyor (Gider):', debtData);
          const result = await addCustomerDebt(debtData);
          results.push(result);
        }
      }
    }
    
    // Borç olarak işaretlenmiş aktiviteleri ekle (TEDARİKÇİ AKTİVİTELERİ HARİC)
    if (tourData.activities && tourData.activities.length > 0) {
      for (const activity of tourData.activities) {
        console.log('Aktivite MÜŞTERİ borç kontrolü:', {
          name: activity.name,
          addToDebt: activity.addToDebt,
          companyId: activity.companyId, // Tedarikçi kontrolü için eklendi
          price: activity.price,
          currency: activity.currency
        });
        
        // Eğer bir companyId varsa, bu bir tedarikçi borcudur, müşteri borcu değil.
        if (activity.addToDebt && !activity.companyId) {
          let participants = 1;
          if (activity.participantsType === 'all') {
            participants = parseInt(tourData.numberOfPeople as string || '1');
          } else if (activity.participants) {
            participants = parseInt(activity.participants as string);
          }
            const priceValue = parseFloat(activity.price as string);
          if (isNaN(priceValue) || priceValue <= 0) {
            console.warn('Geçersiz aktivite fiyatı, müşteri borcu oluşturulmayacak:', activity.name);
            continue;
          }
          
          const totalAmount = priceValue * participants;
            // Kategori Türkçe karşılık haritası
          const categoryMap: Record<string, string> = {
            'accommodation': 'Konaklama',
            'transportation': 'Ulaşım',
            'transfer': 'Transfer',
            'guide': 'Rehberlik',
            'agency': 'Acente',
            'porter': 'Hanutçu',
            'food': 'Yemek',
            'meal': 'Yemek',
            'activity': 'Aktivite',
            'general': 'Genel',
            'other': 'Diğer'
          };
          
          // Aktivite için Türkçe kategori adını kullan
          const translatedActivityName = categoryMap['activity'] || 'Aktivite';
          
          // Tur seri numarası ile başlayan açıklama oluştur
          const serialNumber = tourData.serialNumber || '';
          
          const debtData = {
            customerId,
            customerName,
            tourId,
            amount: totalAmount,
            currency: activity.currency,
            description: `${serialNumber ? serialNumber + ' - ' : ''}${tourData.customerName} turu için ${activity.name} ${translatedActivityName}si (${participants} kişi)`,
            dueDate,
            sourceType: 'activity' as const,
            sourceId: activity.id,
            notes: activity.details || '',
          };
          
          console.log('Yeni MÜŞTERİ borç kaydı oluşturuluyor (Aktivite):', debtData);
          const result = await addCustomerDebt(debtData);
          results.push(result);
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error("Tur verilerinden müşteri borçları oluşturulurken hata:", error);
    throw error;
  }
};

// Tur giderlerinden tedarikçi borçlarını oluştur
export const createSupplierDebtsFromTour = async (tourData: TourData) => {
  try {
    const db = getDb();
    const results = [];
    const now = new Date();    console.log('Tur verileri TEDARİKÇİ borcu oluşturma için kontrol ediliyor:', {
      tourId: tourData.id,
      expenses: tourData.expenses?.length || 0,
      activities: tourData.activities?.length || 0, // Aktiviteler de tedarikçiye borç oluşturabilir
    });

    // Tur ID'sine göre mevcut borçları kontrol et (tur düzenleniyorsa, zaten borç oluşturulmuş olabilir)
    const existingDebts: Array<{
      id: string;
      companyId: string;
      amount: number;
      currency: string;
      description: string;
      notes: string;
      status: string;
      paidAmount: number;
      [key: string]: any;
    }> = [];
    if (tourData.id) {
      const debtsQuery = query(
        collection(db, COLLECTIONS.DEBTS), 
        where("notes", ">=", `Tur ID: ${tourData.id}`),
        where("notes", "<=", `Tur ID: ${tourData.id}\uf8ff`)
      );      const debtsSnapshot = await getDocs(debtsQuery);
      debtsSnapshot.forEach(doc => {
        const data = doc.data();
        existingDebts.push({
          id: doc.id,
          companyId: data.companyId || '',
          amount: parseFloat(data.amount) || 0,
          currency: data.currency || '',
          description: data.description || '',
          notes: data.notes || '',
          status: data.status || '',
          paidAmount: parseFloat(data.paidAmount) || 0,
          ...data
        });
      });
      console.log(`Tur ID: ${tourData.id} için ${existingDebts.length} adet mevcut borç bulundu.`);
    }

    const processItemForSupplierDebt = async (item: TourExpense | TourActivity, itemType: 'expense' | 'activity') => {
      // Sadece companyId varsa ve addToDebt true ise işlem yap
      if (item.addToDebt && item.companyId && item.companyId.trim() !== '') {
        let companyId = item.companyId;
        const companyName = item.companyName || 'Bilinmeyen Firma'; // Eğer formda companyName yoksa

        // 1. Firma Kartını Kontrol Et veya Oluştur
        // Firma ID'sinin varlığını ve geçerliliğini kontrol et
        if (!companyId || typeof companyId !== 'string' || companyId.trim() === '') {
          console.warn(`Geçersiz veya eksik companyId, tedarikçi borcu oluşturulmayacak: ${item.name}`);
          return null;
        }
        
        console.log(`Firma bilgileri kontrol ediliyor: ID=${companyId}, Adı=${companyName}`);
        
        const companyRef = doc(db, COLLECTIONS.COMPANIES, companyId);
        const companySnap = await getDoc(companyRef);

        if (!companySnap.exists()) {
          console.log(`Firma kartı bulunamadı: ${companyId}. Yeni firma kartı oluşturuluyor: ${companyName}`);
          try {
            // Belirli bir ID ile doküman oluşturmak için setDoc kullanılır.
            // Bu, companyId'nin COMPANIES koleksiyonunda benzersiz bir anahtar olmasını sağlar.
            await setDoc(doc(db, COLLECTIONS.COMPANIES, companyId), {
                name: companyName,
                type: 'supplier', // ÖNEMLİ: Firma tipini 'supplier' olarak ayarlıyoruz
                createdAt: now,
                updatedAt: now,
                // Diğer potansiyel firma alanları buraya eklenebilir
            });
            console.log(`Yeni firma kartı başarıyla oluşturuldu: ${companyId} - ${companyName} (tip: supplier)`);
          } catch (e) {
            console.error(`Yeni firma kartı (${companyId} - ${companyName}) oluşturulurken hata:`, e);
            return null;
          }
        } else {
          // Mevcut firma kartını güncelle - supplier tipini ayarla
          const companyData = companySnap.data();
          console.log(`Firma kartı bulundu: ${companyId} - ${companyData.name} (mevcut tip: ${companyData.type || 'belirtilmemiş'})`);
          
          // Eğer firma tipi supplier değilse, güncelle
          if (companyData.type !== 'supplier') {
            try {
              await updateDoc(companyRef, {
                type: 'supplier',
                updatedAt: now
              });
              console.log(`Firma tipi 'supplier' olarak güncellendi: ${companyId} - ${companyData.name}`);
            } catch (e) {
              console.error(`Firma tipi güncellenirken hata (${companyId}):`, e);
            }
          }
        }        // 2. Tedarikçi Borcunu Oluştur veya Güncelle
        // Eğer aktivite ve supplierCost varsa onu kullan, yoksa normalde olduğu gibi davran
        let amount = 0;
        
        if (itemType === 'activity' && (item as any).supplierCost) {
          const supplierCostString = (item as any).supplierCost;
          amount = parseFloat(supplierCostString);
          console.log(`Aktivite için firma borç tutarı kullanılıyor: ${amount} (${item.name})`);
        } else {
          const amountString = itemType === 'expense' ? (item as TourExpense).amount : (item as TourActivity).price;
          amount = parseFloat(amountString as string);
        }

        if (isNaN(amount) || amount <= 0) {
          console.warn(`Geçersiz ${itemType} tutarı/fiyatı, tedarikçi borcu oluşturulmayacak:`, item.name);
          return null;
        }        // Tur seri numarası ile başlayan, ardından müşteri adı ve borç içeriğini gösteren açıklama
        const serialNumber = tourData.serialNumber || '';        // Kategori Türkçe karşılık haritası
        const categoryMap: Record<string, string> = {
          'accommodation': 'Konaklama',
          'transportation': 'Ulaşım',
          'transfer': 'Transfer',
          'guide': 'Rehberlik',
          'agency': 'Acente',
          'porter': 'Hanutçu',
          'food': 'Yemek',
          'meal': 'Yemek',
          'activity': 'Aktivite',
          'general': 'Genel',
          'other': 'Diğer'
        };

        // Kategori değerini Türkçe karşılığına çevir
        const rawCategory = (item as TourExpense).type || (item as TourExpense).category || 'Gider';
        const translatedCategory = categoryMap[rawCategory] || rawCategory;

        const debtDescription = itemType === 'expense'
          ? `${serialNumber ? serialNumber + ' - ' : ''}${tourData.customerName} turu için ${item.name} (${translatedCategory})`
          : `${serialNumber ? serialNumber + ' - ' : ''}${tourData.customerName} turu için ${item.name} Aktivitesi`;

        // Mevcut borçlar arasında bu öğeye ait borç var mı kontrol et
        const itemIdentifier = `${itemType} - ${item.name}`;
        const existingDebt = existingDebts.find(debt => 
          debt.companyId === companyId && 
          debt.notes.includes(`Tur ID: ${tourData.id}`) &&
          debt.description.includes(item.name)
        );

        if (existingDebt) {
          // Mevcut borcu güncelle
          console.log(`Mevcut tedarikçi borcu (${existingDebt.id}) güncelleniyor: ${itemIdentifier}`);
          const debtRef = doc(db, COLLECTIONS.DEBTS, existingDebt.id);
          
          // Borç durumunu kontrol et, eğer ödenmemiş ise güncelle
          if (existingDebt.status === 'unpaid' || existingDebt.status === 'partially_paid') {
            await updateDoc(debtRef, {
              amount: amount, // Yeni tutar
              currency: item.currency,
              description: debtDescription,
              updatedAt: now,
              notes: `Tur ID: ${tourData.id}. ${item.details || ''} (Güncellendi: ${now.toLocaleDateString()})`
            });
            
            return {
              id: existingDebt.id,
              companyId,
              amount,
              currency: item.currency,
              description: debtDescription,
              status: existingDebt.status,
              paidAmount: existingDebt.paidAmount,
              updated: true
            };
          } else {
            console.log(`${existingDebt.id} ID'li borç zaten ödenmiş durumda (${existingDebt.status}), güncelleme yapılmadı.`);
            return existingDebt;
          }
        } else {
          // Yeni borç oluştur
          const debtData: Omit<Debt, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'paidAmount'> = {
            companyId: companyId, 
            amount: amount,
            currency: item.currency,
            description: debtDescription,
            dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), // Vadeyi her zaman bugünden 30 gün sonrasına ayarla
            notes: `Tur ID: ${tourData.id}. ${item.details || ''}`,
          };
          
          console.log(`Yeni TEDARİKÇİ borç kaydı oluşturuluyor (${itemType}):`, debtData);
          const result = await addDebt(debtData); 
          return result;
        }
      } else {
        // Gider veya aktivitenin neden tedarikçi borcuna eklenmediğini logla
        console.log(
          `Tedarikçi borcu oluşturulmadı (${itemType}): '${item.name}'. Kontrol edin: addToDebt=${item.addToDebt}, companyId='${item.companyId}'`
        );
      }
      return null;
    };    // İşlenen giderleri ve aktiviteleri tutmak için bir liste oluştur
    const processedItems = [];
    
    // Borç olarak işaretlenmiş ve companyId'si olan giderleri işle
    if (tourData.expenses && tourData.expenses.length > 0) {
      for (const expense of tourData.expenses) {
        // Gideri işlenmişler listesine ekle (borç olarak eklenmiş olsun veya olmasın)
        processedItems.push({
          type: 'expense',
          name: expense.name,
          addToDebt: expense.addToDebt,
          companyId: expense.companyId || ''
        });
        
        const result = await processItemForSupplierDebt(expense, 'expense');
        if (result) results.push(result);
      }
    }

    // Borç olarak işaretlenmiş ve companyId'si olan aktiviteleri işle
    if (tourData.activities && tourData.activities.length > 0) {
      for (const activity of tourData.activities) {
        // Aktiviteyi işlenmişler listesine ekle
        processedItems.push({
          type: 'activity',
          name: activity.name,
          addToDebt: activity.addToDebt,
          companyId: activity.companyId || ''
        });
        
        const result = await processItemForSupplierDebt(activity, 'activity');
        if (result) results.push(result);
      }
    }
    
    // Tur düzenleme durumunda işareti kaldırılan borçları sil
    if (tourData.id && existingDebts.length > 0) {
      // Silinmesi gereken borçları bul
      for (const debt of existingDebts) {
        // Borç tanımlayıcı bilgileri çıkar
        const debtItem = {
          type: debt.description.includes('Aktivitesi') ? 'activity' : 'expense',
          name: extractItemNameFromDebt(debt.description),
          companyId: debt.companyId,
          debtId: debt.id,
          status: debt.status
        };
        
        // İşlenmiş öğelerde bu kalem var mı? Ve addToDebt seçeneği kaldırılmış mı?
        const processedItem = processedItems.find(item => 
          item.type === debtItem.type && 
          item.name === debtItem.name && 
          item.companyId === debtItem.companyId
        );          // Eğer işlenmiş bir öğe bulunamamışsa veya addToDebt işareti kaldırıldıysa
        if (!processedItem || !processedItem.addToDebt) {          // Bu borç ödenmemiş ise silme işlemini gerçekleştir
          if (debt.status === 'unpaid' || debt.status === 'partially_paid') {
            console.log(`Borç işareti kaldırıldı, borç siliniyor: ${debt.id} - ${debt.description}`);
            try {
              // Borcu silmeden önce tedarikçi firma bilgilerini hatırla
              const companyId = debt.companyId;
              const companyRef = doc(db, COLLECTIONS.COMPANIES, companyId);
              
              // Tedarikçi firma kaydını kontrol et
              const companySnap = await getDoc(companyRef);
              const companyExists = companySnap.exists();
              const companyData = companyExists ? companySnap.data() : null;
              
              // Sadece borcu sil, firmalara dokunma
              await deleteDoc(doc(db, COLLECTIONS.DEBTS, debt.id));
              console.log(`Borç başarıyla silindi: ${debt.id}`);
              
              // Bir temizlik yapıldıktan sonra firma kaydının hala var olup olmadığını kontrol et
              const companySnapAfterDelete = await getDoc(companyRef);
              
              // Eğer tedarikçi kaydı silindiyse, eski bilgilere göre tekrar oluştur
              if (companyExists && !companySnapAfterDelete.exists()) {
                console.log(`Tedarikçi firma kaydı silinmiş, tekrar oluşturuluyor: ${companyId}`);
                await setDoc(companyRef, {
                  name: companyData?.name || 'Yeniden Oluşturulan Firma',
                  type: 'supplier',
                  createdAt: companyData?.createdAt || new Date(),
                  updatedAt: new Date()
                });
                console.log(`Firma yeniden oluşturuldu: ${companyId}`);
              }
            } catch (e) {
              console.error(`Borç silinirken hata (${debt.id}):`, e);
            }
          } else {
            console.log(`Borç zaten ödenmiş durumda (${debt.status}), silinmedi: ${debt.id}`);
          }
        }
      }
    }

    return results;
  } catch (error) {
    console.error("Tur verilerinden tedarikçi borçları oluşturulurken hata:", error);
    throw error;
  }
};
