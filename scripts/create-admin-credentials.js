// Admin kimlik bilgilerini Firebase'e eklemek için basit bir script
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

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
    console.log("Firebase başlatılıyor...");
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log("Admin kimlik bilgilerini eklemek için Firestore'a bağlanılıyor...");
    
    const adminData = {
      username: "admin",
      password: "Passionis123",
      email: "passionistravell@gmail.com",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log("Admin kimlik bilgileri oluşturuluyor:", adminData);
    
    await setDoc(doc(db, "admin", "credentials"), adminData);
    
    console.log("Admin kimlik bilgileri başarıyla oluşturuldu!");
  } catch (error) {
    console.error("Admin kimlik bilgileri oluşturulurken hata:", error);
  }
}

createAdminCredentials();
