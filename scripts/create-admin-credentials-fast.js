// Admin bilgilerini Firebase Firestore'a ekleyen script
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, serverTimestamp } = require('firebase/firestore');

// Firebase yapılandırma bilgileri
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

async function createAdminCredentials() {
  try {
    console.log("Firebase'i başlatıyorum...");
    
    // Firebase'i başlat
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log("Admin kimlik bilgilerini kontrol ediyorum...");
    
    // Önce mevcut admin bilgilerini kontrol et
    const docRef = doc(db, "admin", "credentials");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log("Admin kimlik bilgileri zaten mevcut, güncelliyorum...");
      console.log("Mevcut bilgiler:", docSnap.data());
      
      // Mevcut bilgileri güncelle
      await setDoc(docRef, {
        ...docSnap.data(),
        username: "admin",
        password: "Passionis123",
        email: "passionistravell@gmail.com",
        updatedAt: serverTimestamp()
      });
    } else {
      console.log("Admin kimlik bilgileri bulunamadı, yeni oluşturuyorum...");
      
      // Yeni bilgiler oluştur
      await setDoc(docRef, {
        username: "admin",
        password: "Passionis123",
        email: "passionistravell@gmail.com",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    console.log("Admin kimlik bilgileri başarıyla oluşturuldu/güncellendi!");
    
    // Son durumu kontrol et
    const updatedDoc = await getDoc(docRef);
    console.log("Güncel admin bilgileri:", updatedDoc.data());
    
  } catch (error) {
    console.error("Hata oluştu:", error);
  }
}

// Scripti çalıştır
createAdminCredentials()
  .then(() => console.log("İşlem tamamlandı!"))
  .catch(err => console.error("Script çalıştırılırken hata:", err));
