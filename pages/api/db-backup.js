// Bu dosya, Firebase veritabanındaki şirket verilerini yedeklemek ve geri yüklemek için kullanılır
// API rotası: /api/db-backup

import { getDb } from '../../lib/firebase-client-module';
import { collection, getDocs, addDoc, writeBatch, doc } from 'firebase/firestore';
import { COLLECTIONS } from '../../lib/db-firebase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { action, data } = req.body;

  try {
    const db = getDb();
    
    // Şirket verilerini yedekle
    if (action === 'backup') {
      const companiesRef = collection(db, COLLECTIONS.COMPANIES);
      const companiesSnapshot = await getDocs(companiesRef);
      
      const backupData = [];
      companiesSnapshot.forEach(doc => {
        backupData.push({
          id: doc.id,
          data: doc.data()
        });
      });
      
      return res.status(200).json({ 
        message: 'Yedekleme başarılı', 
        backup: backupData,
        timestamp: new Date().toISOString()
      });
    }
    
    // Şirket verilerini geri yükle
    if (action === 'restore') {
      if (!data || !Array.isArray(data)) {
        return res.status(400).json({ message: 'Geçerli veri sağlanmadı' });
      }
      
      const batch = writeBatch(db);
      let restoredCount = 0;
      
      for (const item of data) {
        if (item.id && item.data) {
          // Mevcut dökümanı güncelleyin veya yeni bir döküman oluşturun
          const companyRef = doc(db, COLLECTIONS.COMPANIES, item.id);
          batch.set(companyRef, {
            ...item.data,
            updatedAt: new Date() // Geri yükleme tarihini güncelleyin
          });
          restoredCount++;
        }
      }
      
      await batch.commit();
      
      return res.status(200).json({ 
        message: 'Geri yükleme başarılı', 
        restoredCount
      });
    }
    
    // Yeni test şirketleri oluştur
    if (action === 'create-test-companies') {
      const testCompanies = [
        {
          name: "Test Şirketi 1",
          contactPerson: "İletişim Kişisi 1",
          phone: "0555-555-5555",
          email: "test1@example.com",
          address: "Test Adresi 1",
          notes: "Test Notları 1",
          taxId: "1234567890",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: "Test Şirketi 2",
          contactPerson: "İletişim Kişisi 2",
          phone: "0555-555-5556",
          email: "test2@example.com",
          address: "Test Adresi 2",
          notes: "Test Notları 2",
          taxId: "0987654321",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      const batch = writeBatch(db);
      const companiesRef = collection(db, COLLECTIONS.COMPANIES);
      
      for (const company of testCompanies) {
        await addDoc(companiesRef, company);
      }
      
      return res.status(200).json({ 
        message: 'Test şirketleri oluşturuldu', 
        count: testCompanies.length
      });
    }
    
    return res.status(400).json({ message: 'Geçersiz işlem' });
  } catch (error) {
    console.error("Veritabanı işlemi sırasında hata:", error);
    return res.status(500).json({ 
      message: 'Sunucu hatası', 
      error: error.message 
    });
  }
}
