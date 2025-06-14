// Basit doğrudan giriş testi
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, signOut } = require('firebase/auth');

// Firebase yapılandırması
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

// Firebase başlat
console.log("Firebase başlatılıyor...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Kullanıcı bilgileri
const email = "passionistravell@gmail.com";
const password = "Arzumalan196565";

// Basit giriş işlemi
const testLogin = async () => {
  try {
    console.log(`"${email}" ile giriş deniyorum...`);
    
    // Giriş yap
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("GİRİŞ BAŞARILI!");
    console.log("Kullanıcı bilgileri:");
    console.log("- UID:", userCredential.user.uid);
    console.log("- Email:", userCredential.user.email);
    console.log("- Doğrulanmış E-posta:", userCredential.user.emailVerified);
    
    // auth-config.ts dosyasında kullanmak için bilgileri görüntüle
    console.log("\n===================== ÖNEMLİ BİLGİLER =====================");
    console.log("İŞTE BU KULLANICI ID'Sİ auth-config.ts dosyasına EKLENMELİDİR:");
    console.log(`"${userCredential.user.uid}",  // E-posta/şifre: ${email}`);
    console.log("===========================================================\n");
    
    // Çıkış yap
    await signOut(auth);
    console.log("Çıkış yapıldı");
    
    return userCredential.user;
  } catch (error) {
    console.error("GİRİŞ HATASI:");
    console.error("- Hata kodu:", error.code);
    console.error("- Mesaj:", error.message);
    
    // Yaygın hataları açıkla
    if (error.code === 'auth/user-not-found') {
      console.log("\nBu e-posta adresiyle kullanıcı bulunamadı. Önce kullanıcı oluşturmanız gerekiyor.");
    } else if (error.code === 'auth/wrong-password') {
      console.log("\nYanlış şifre. Şifrenizi kontrol edin.");
    } else if (error.code === 'auth/invalid-credential') {
      console.log("\nGeçersiz kimlik bilgileri. E-posta ve şifrenizi kontrol edin.");
    } else if (error.code === 'auth/too-many-requests') {
      console.log("\nÇok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.");
    }
    
    throw error;
  }
};

// Testi çalıştır
testLogin()
  .then(() => {
    console.log("Test tamamlandı");
    setTimeout(() => process.exit(0), 2000);
  })
  .catch(() => {
    console.log("Test başarısız oldu");
    setTimeout(() => process.exit(1), 2000);
  });
