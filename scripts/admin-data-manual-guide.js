// Firebase Admin verilerini manuel olarak çalıştırmak için kullanılabilecek script
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

// Firebase veritabanınızda doğrudan bu admin bilgilerini oluşturun:
/**
 * 1. https://console.firebase.google.com adresine gidin
 * 2. "muhasebe-demo" projesini seçin
 * 3. Sol menüden "Firestore Database" seçeneğine tıklayın
 * 4. "Koleksiyon oluştur" butonuna tıklayın
 * 5. Koleksiyon adı olarak "admin" yazın
 * 6. Belge ID'si olarak "credentials" yazın
 * 7. Belgenin alanlarını şu şekilde oluşturun:
 *    - username: "admin" (string)
 *    - password: "Passionis123" (string)
 *    - email: "passionistravell@gmail.com" (string)
 *    - createdAt: Current timestamp (timestamp)
 *    - updatedAt: Current timestamp (timestamp)
 */

/*
// Not: Bu JSON formatındaki veriyi Firebase konsolundan "JSON olarak içe aktar" seçeneğiyle de ekleyebilirsiniz:
{
  "username": "admin",
  "password": "Passionis123",
  "email": "passionistravell@gmail.com",
  "createdAt": {"_seconds": 1715521896, "_nanoseconds": 0},
  "updatedAt": {"_seconds": 1715521896, "_nanoseconds": 0}
}
*/

console.log("Bu dosya Firebase konsolunda manuel olarak admin bilgilerini oluşturmanız için rehberdir.");
console.log("Yukarıdaki adımları takip ederek admin kullanıcısını oluşturabilirsiniz.");
