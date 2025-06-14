const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// E-posta ve şifre bilgileri
const email = "passionistravell@gmail.com";
const password = "Arzumalan196565";

// Önce hesabın var olup olmadığını kontrol et, yoksa oluştur
async function createOrSignIn() {
  try {
    console.log("Hesap kontrolü yapılıyor...");
    
    try {
      // Önce giriş yapmayı dene (hesap varsa)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Hesap zaten var, giriş başarılı! Kullanıcı ID:", userCredential.user.uid);
      return;
    } catch (loginError) {
      // Giriş başarısız olursa ve hata kodu 'auth/user-not-found' ise hesap yoktur
      if (loginError.code === 'auth/user-not-found') {
        console.log("Hesap bulunamadı, yeni hesap oluşturuluyor...");
        // Hesabı oluştur
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Hesap başarıyla oluşturuldu! Kullanıcı ID:", userCredential.user.uid);
      } else {
        console.error("Giriş hatası:", loginError.message);
      }
    }
  } catch (error) {
    console.error("İşlem sırasında hata oluştu:", error.message);
  }
}

// Fonksiyonu çalıştır
createOrSignIn()
  .then(() => {
    console.log("İşlem tamamlandı.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Beklenmeyen hata:", error);
    process.exit(1);
  });
