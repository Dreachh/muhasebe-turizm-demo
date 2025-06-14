"use client";

// Firebase yapılandırması
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDatabase, Database } from "firebase/database";

// Firebase yapılandırmasını import et
import { firebaseConfig, isServerSide } from './firebase-config';

// Singleton Firebase servislerini içerecek değişkenler
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: any;
let rtdb: Database;

// Firebase'i başlatmak için güvenli bir fonksiyon
function initFirebase(): boolean {
  try {
    // Server-side kontrolü
    if (isServerSide()) {
      console.log('Server tarafında çalışıyor, Firebase başlatma atlanıyor');
      return false;
    }

    // Config kontrolü
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.databaseURL) {
      console.error('Eksik Firebase yapılandırması!');
      return false;
    }
    
    // Eğer zaten başlatılmışsa, mevcut olanı kullan
    if (getApps().length === 0) {
      console.log("Firebase uygulaması başlatılıyor...");
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);
      rtdb = getDatabase(app);
      storage = getStorage(app);
      console.log("Firebase servisleri başarıyla başlatıldı");
      return true;
    } else {
      console.log("Mevcut Firebase instance kullanılıyor");
      app = getApps()[0];
      return true;
    }
  } catch (error) {
    console.error("Firebase başlatma hatası:", error);
    return false;
  }
}

// Firebase'i başlat
const firebaseInitialized = initFirebase();

// Firebase servislerini dışa aktar
export { app, db, rtdb, auth, storage, firebaseInitialized };

// İstemci tarafında Firebase'i yeniden başlatmak için kullanılacak fonksiyon
export function clientInitializeFirebase(): boolean {
  try {
    if (typeof window !== "undefined") {
      console.log("Client tarafında Firebase başlatılıyor...");
      const success = initFirebase();
      console.log("Firebase client başlatma sonucu:", success ? "Başarılı" : "Başarısız");
      return success;
    }
    console.log("Client tarafında değil, Firebase başlatılmıyor");
    return false;
  } catch (error) {
    console.error("Firebase başlatma hatası (clientInitializeFirebase):", error);
    return false;
  }
}

// Alternatif giriş yöntemi: Direkt kullanıcı oluşturma ve auth bypass
// Bu fonksiyon gelişmiş kullanım içindir - sadece geliştirme ortamında kullanın
export async function bypassLogin(email: string, password: string) {
  try {
    console.log("Direkt giriş denemesi başlatılıyor...");
    
    // Firebase başlatıldığından emin ol
    initFirebase();
    const authInstance = getAuth();
    
    // E-posta ve şifre ile giriş yap
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
    
    // Sonucu döndür
    return userCredential.user;
  } catch (error: any) {
    console.error("Direkt giriş hatası:", error.code, error.message);
    throw error;
  }
}