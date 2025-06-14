const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = require('firebase/auth');

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

// Firebase başlatma
try {
  console.log("Firebase başlatılıyor...");
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  const email = "passionistravell@gmail.com";
  const password = "Arzumalan196565";

  // Kullanıcı oluştur
  const createUser = async () => {
    try {
      console.log(`"${email}" için hesap oluşturma denemesi başlatılıyor...`);
      
      try {
        // Önce giriş yapmayı dene
        console.log("Önce var olan hesap kontrolü yapılıyor (giriş denemesi)...");
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Kullanıcı zaten var ve giriş başarılı:", userCredential.user.uid);
        console.log("E-posta:", userCredential.user.email);
        
        // Testi tamamlamak için çıkış yap
        await signOut(auth);
        console.log("Test için çıkış yapıldı");
        
        return userCredential.user;
      } catch (loginError) {
        console.log("Giriş denemesi başarısız:", loginError.code);
        
        if (loginError.code === 'auth/user-not-found') {
          console.log("Kullanıcı bulunamadı. Yeni hesap oluşturuluyor...");
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log("Kullanıcı başarıyla oluşturuldu:", userCredential.user.uid);
            console.log("E-posta:", userCredential.user.email);
            return userCredential.user;
          } catch (createError) {
            console.error("Kullanıcı oluşturma hatası:", createError.code, createError.message);
            throw createError;
          }
        } else {
          console.error("Giriş hatası:", loginError.code, loginError.message);
          throw loginError;
        }
      }
    } catch (error) {
      console.error("İşlem hatası:", error.code, error.message);
      throw error;
    }
  };

  createUser()
    .then(() => {
      console.log("İşlem tamamlandı.");
      setTimeout(() => process.exit(0), 2000);
    })
    .catch(error => {
      console.error("Hata:", error);
      setTimeout(() => process.exit(1), 2000);
    });
} catch (error) {
  console.error("Firebase başlatma hatası:", error);
}
