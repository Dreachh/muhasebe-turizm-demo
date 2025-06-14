// Bu dosya Firebase veritabanı içeriğini kontrol etmek için kullanılacak
// API rotası: /api/check-firebase

import { getDb } from '../../lib/firebase-client-module';
import { collection, getDocs, listCollections } from 'firebase/firestore';
import { COLLECTIONS } from '../../lib/db-firebase';

export default async function handler(req, res) {
  try {
    const db = getDb();
    
    // Tüm koleksiyonları listele
    console.log("Veritabanı koleksiyonları kontrol ediliyor...");
    
    // Companies koleksiyonunu kontrol et
    const companiesRef = collection(db, COLLECTIONS.COMPANIES);
    const companiesSnapshot = await getDocs(companiesRef);
    
    const result = {
      collections: {
        companies: {
          count: companiesSnapshot.size,
          documents: []
        }
      }
    };
    
    // Şirket verilerini al
    companiesSnapshot.forEach(doc => {
      result.collections.companies.documents.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    // Ayrıca diğer koleksiyonları da kontrol et
    for (const [key, value] of Object.entries(COLLECTIONS)) {
      if (key !== 'COMPANIES') {
        try {
          const collRef = collection(db, value);
          const snapshot = await getDocs(collRef);
          result.collections[value] = {
            count: snapshot.size
          };
        } catch (error) {
          console.error(`${value} koleksiyonu kontrol edilirken hata:`, error);
          result.collections[value] = {
            error: error.message
          };
        }
      }
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error("Firebase kontrolü sırasında hata:", error);
    res.status(500).json({ error: error.message });
  }
}
