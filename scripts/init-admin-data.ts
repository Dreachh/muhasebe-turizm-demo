// Firebase Admin verilerini oluşturmak için script
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// .env.local dosyasını yükle
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function initializeAdminData() {
  try {
    console.log('Firebase admin verisi oluşturuluyor...');
    
    // Firebase başlat
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Admin bilgilerini oluştur
    await setDoc(doc(db, "admin", "credentials"), {
      username: "admin", // Varsayılan kullanıcı adını buraya girin
      password: "Passionis123", // Varsayılan şifreyi buraya girin
      email: "passionistravell@gmail.com", // Admin e-posta adresini buraya girin
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('Firebase admin verisi başarıyla oluşturuldu!');
  } catch (error) {
    console.error('Firebase admin verisi oluşturma hatası:', error);
  }
}

// Scripti çalıştır
initializeAdminData();
