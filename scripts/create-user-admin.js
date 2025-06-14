const admin = require('firebase-admin');
const serviceAccount = {
  // Firebase projenize ait servis hesabı bilgilerini buraya ekleyin
  // Bu bilgileri Firebase Console'dan alabilirsiniz
  // Güvenlik açısından, normalde bu bilgiler bir .env dosyasında saklanmalıdır
  type: "service_account",
  project_id: "muhasebe-demo",
  private_key_id: "5c25fe4cf326ddafc0c2a16ceee00d9edcaf8c9e", // Bu anahtarları Firebase konsolundan almanız gerekecek
  // private_key alanını Firebase Console'dan alacağınız gerçek değerle değiştirin
  private_key: process.env.FIREBASE_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\nBu alanı kendi anahtarınızla değiştirin\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-ww1n5@muhasebe-demo.iam.gserviceaccount.com", 
  client_id: "113022818952336778861",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-ww1n5%40muhasebe-demo.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

try {
  // Admin SDK'yı başlat
  console.log("Firebase Admin SDK başlatılıyor...");
  
  // Uygulama zaten başlatılmış mı kontrol et
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://muhasebe-demo-default-rtdb.europe-west1.firebasedatabase.app"
    });
    console.log("Firebase Admin SDK başlatıldı");
  } else {
    console.log("Firebase Admin SDK zaten başlatılmış");
  }

  // Kullanıcı bilgileri
  const email = "passionistravell@gmail.com";
  const password = "Arzumalan196565";
  const displayName = "Passionis Admin";

  // Kullanıcıyı oluştur veya güncelle
  const createOrUpdateUser = async () => {
    try {
      console.log(`"${email}" için kullanıcı kontrolü yapılıyor...`);
      
      // Kullanıcı var mı diye kontrol et
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log("Kullanıcı zaten var:", userRecord.uid);
        console.log("Kullanıcı bilgileri:", userRecord.toJSON());
        
        // Şifreyi güncellemek için
        console.log("Kullanıcı şifresi güncelleniyor...");
        await admin.auth().updateUser(userRecord.uid, {
          password: password,
          displayName: displayName,
        });
        console.log("Kullanıcı şifresi güncellendi");
        
        return userRecord;
      } catch (error) {
        // Kullanıcı bulunamadıysa, yeni oluştur
        if (error.code === 'auth/user-not-found') {
          console.log("Kullanıcı bulunamadı, yeni oluşturuluyor...");
          
          const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: displayName,
            emailVerified: true, // E-posta doğrulamasını otomatik olarak geç
          });
          
          console.log("Yeni kullanıcı oluşturuldu:", userRecord.uid);
          return userRecord;
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("İşlem hatası:", error.code, error.message);
      throw error;
    }
  };

  // Kullanıcı izinleri ekle - özel talimler (claims)
  const addCustomClaims = async (uid) => {
    try {
      console.log(`${uid} için özel talimler (claims) ekleniyor...`);
      
      await admin.auth().setCustomUserClaims(uid, {
        admin: true,
        authorized: true
      });
      
      console.log("Özel talimler eklendi");
    } catch (error) {
      console.error("Özel talimler eklenirken hata:", error);
      throw error;
    }
  };

  // İşlemi çalıştır
  createOrUpdateUser()
    .then(async (userRecord) => {
      // Özel talimler ekle
      await addCustomClaims(userRecord.uid);
      
      console.log("İşlemler başarıyla tamamlandı!");
      console.log("-------------------------------");
      console.log("E-posta:", email);
      console.log("Şifre:", password);
      console.log("Kullanıcı ID:", userRecord.uid);
      console.log("-------------------------------");
      console.log("Bu bilgilerle uygulamaya giriş yapabilirsiniz.");
      
      setTimeout(() => process.exit(0), 2000);
    })
    .catch(error => {
      console.error("Hata:", error);
      setTimeout(() => process.exit(1), 2000);
    });
} catch (error) {
  console.error("Genel hata:", error);
  setTimeout(() => process.exit(1), 2000);
}
