// Firebase Admin verilerini oluşturmak için script
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, serverTimestamp } = require('firebase/firestore');

// Firebase yapılandırma bilgileri doğrudan tanımlanıyor
// NOT: Bu script için yapılandırmayı doğrudan burada saklıyoruz, güvenli kullanım için .env dosyası kullanın
const firebaseConfig = {
  apiKey: "AIzaSyCdciO5sdgBxjtCGwRXHwYGHtCBQkw6I4c",
  authDomain: "muhasebe-demo.firebaseapp.com",
  projectId: "muhasebe-demo",
  storageBucket: "muhasebe-demo.firebasestorage.app",
  messagingSenderId: "493899697907",
  appId: "1:493899697907:web:1ff0c226462be0254d3186",
  measurementId: "G-NFZ7TQPNEW",
  databaseURL: "https://muhasebe-demo-default-rtdb.europe-west1.firebasedatabase.app"
};

async function initializeAdminData() {
  try {
    console.log('Firebase admin verisi kontrol ediliyor...');
    
    // Firebase başlat
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Önce mevcut admin bilgilerini kontrol et
    const docRef = doc(db, "admin", "credentials");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log('Admin kimlik bilgileri zaten mevcut, güncelleme yapılacak...');
      
      // Mevcut verileri al
      const existingData = docSnap.data();
      console.log('Mevcut bilgiler:', {
        username: existingData.username,
        email: existingData.email,
        createdAt: existingData.createdAt?.toDate?.() || 'tarih alınamadı'
      });
      
      // Admin bilgilerini güncelle
      await setDoc(doc(db, "admin", "credentials"), {
        ...existingData,  // Mevcut verileri koru
        username: "admin", // Güncellenecek kullanıcı adı
        password: "Passionis123", // Güncellenecek şifre
        email: "passionistravell@gmail.com", // Güncellenecek e-posta
        updatedAt: new Date() // Güncelleme zamanını ayarla
      });
      
      console.log('Firebase admin verisi başarıyla güncellendi!');
    } else {
      console.log('Admin kimlik bilgileri bulunamadı, yeni kayıt oluşturuluyor...');
      
      // Admin bilgilerini oluştur
      await setDoc(doc(db, "admin", "credentials"), {
        username: "admin", // Varsayılan kullanıcı adı
        password: "Passionis123", // Varsayılan şifre
        email: "passionistravell@gmail.com", // Admin e-posta adresi
        createdAt: new Date(), // Oluşturma zamanı
        updatedAt: new Date() // Güncelleme zamanı
      });
      
      console.log('Firebase admin verisi başarıyla oluşturuldu!');
    }
  } catch (error) {
    console.error('Firebase admin verisi işlem hatası:', error);
  }
}

// Scripti çalıştır
initializeAdminData().then(() => console.log('İşlem tamamlandı.'));
