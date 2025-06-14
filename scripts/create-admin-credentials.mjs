// Firebase başlatma test script - ESM version
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

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

async function initAdminData() {
  try {
    // Firebase başlat
    console.log("Firebase uygulaması başlatılıyor...");
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log("Firebase başlatıldı, admin verisi oluşturuluyor...");
    
    // Admin kimlik bilgilerini oluştur
    const docRef = doc(db, "admin", "credentials");
    await setDoc(docRef, {
      username: "admin",
      password: "Passionis123",
      email: "passionistravell@gmail.com",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log("Admin kimlik bilgileri başarıyla oluşturuldu/güncellendi!");
    
    // Bilgileri kontrol et
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log("Admin bilgileri:", docSnap.data());
    }
    
    console.log("İşlem tamamlandı!");
  } catch (error) {
    console.error("Hata oluştu:", error);
  }
}

// Fonksiyonu çalıştır
initAdminData();
