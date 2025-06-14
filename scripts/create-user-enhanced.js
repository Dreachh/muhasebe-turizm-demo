// Firebase istemci SDK'sını kullanan test kullanıcı oluşturma script'i
const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut
} = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

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

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Kullanıcı bilgileri
const email = "passionistravell@gmail.com";
const password = "Arzumalan196565";
const displayName = "Passionis Admin";

// İzin verilen kullanıcılar koleksiyonunu güncelleme
const updateAllowedUsers = async (userId) => {
  try {
    console.log(`İzin verilen kullanıcılar koleksiyonunu güncelleme: ${userId}`);
    
    // Firestore'da allowed_users koleksiyonuna kullanıcı bilgilerini ekle
    await setDoc(doc(db, "allowed_users", userId), {
      email: email,
      displayName: displayName,
      isAdmin: true,
      createdAt: new Date().toISOString()
    });
    
    console.log("İzin verilen kullanıcılar koleksiyonu güncellendi");
  } catch (error) {
    console.error("İzin verilen kullanıcılar güncellenirken hata:", error);
  }
};

// Kullanıcı oluştur veya güncelle
const createOrUpdateUser = async () => {
  try {
    console.log(`"${email}" için hesap işlemi başlatılıyor...`);
    
    try {
      // Önce giriş yaparak kullanıcının var olup olmadığını kontrol et
      console.log("Kullanıcı giriş denemesi yapılıyor...");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Giriş başarılı, kullanıcı zaten var:", userCredential.user.uid);
      
      // Profil bilgilerini güncelle
      if (userCredential.user.displayName !== displayName) {
        console.log("Profil bilgileri güncelleniyor...");
        await updateProfile(userCredential.user, {
          displayName: displayName
        });
        console.log("Profil bilgileri güncellendi");
      }
      
      // İzin verilen kullanıcılar koleksiyonunu güncelle
      await updateAllowedUsers(userCredential.user.uid);
      
      // Çıkış yap
      await signOut(auth);
      console.log("Test için çıkış yapıldı");
      
      return userCredential.user;
    } catch (loginError) {
      console.log("Giriş denemesi başarısız:", loginError.code);
      
      if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
        // Kullanıcı bulunamadı, yeni oluştur
        console.log("Yeni kullanıcı oluşturuluyor...");
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          console.log("Kullanıcı oluşturuldu:", userCredential.user.uid);
          
          // Profil bilgilerini ayarla
          console.log("Profil bilgileri ayarlanıyor...");
          await updateProfile(userCredential.user, {
            displayName: displayName
          });
          console.log("Profil bilgileri ayarlandı");
          
          // İzin verilen kullanıcılar koleksiyonunu güncelle
          await updateAllowedUsers(userCredential.user.uid);
          
          // Çıkış yap
          await signOut(auth);
          console.log("Test için çıkış yapıldı");
          
          return userCredential.user;
        } catch (createError) {
          console.error("Kullanıcı oluşturma hatası:", createError.code, createError.message);
          throw createError;
        }
      } else if (loginError.code === 'auth/too-many-requests') {
        console.error("Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin.");
        throw loginError;
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

// Auth config dosyasındaki ALLOWED_USER_IDS dizisine kullanıcı ID'sini eklemek için talimatlar
const printInstructions = (userId) => {
  console.log("\n===================== ÖNEMLİ ADIMLAR =====================");
  console.log("auth-config.ts dosyasına aşağıdaki kullanıcı ID'sini ekleyin:");
  console.log(`"${userId}",  // E-posta/şifre kullanıcısı: ${email}`);
  console.log("\nDosya yolu: lib/auth-config.ts");
  console.log("==========================================================\n");
};

// İşlemi çalıştır
createOrUpdateUser()
  .then(user => {
    console.log("İşlem tamamlandı!");
    console.log("-------------------------------");
    console.log("E-posta:", email);
    console.log("Şifre:", password);
    console.log("Kullanıcı ID:", user.uid);
    console.log("-------------------------------");
    
    // Kullanıcı ID'sini auth-config.ts dosyasına eklemek için talimatlar
    printInstructions(user.uid);
    
    setTimeout(() => process.exit(0), 2000);
  })
  .catch(error => {
    console.error("Hata:", error);
    setTimeout(() => process.exit(1), 2000);
  });
