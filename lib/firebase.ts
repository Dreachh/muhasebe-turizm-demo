"use client";

// Firebase yapılandırması
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDatabase, Database } from "firebase/database";

// Firebase yapılandırmasını import et
import { firebaseConfig } from './firebase-config';

// Singleton Firebase servislerini içerecek değişkenler
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: any;
let rtdb: Database;

// Firebase'i başlatmak için güvenli bir fonksiyon
function initFirebase(): boolean {
  try {
    // Browser tarafında olduğumuzu kontrol et
    if (typeof window === 'undefined') {
      console.log('Server tarafında çalışıyor, Firebase başlatma atlanıyor');
      return false;
    }

    if (!firebaseConfig.apiKey) {
      console.error('Firebase API anahtarı eksik! Lütfen yapılandırmayı kontrol edin.');
      return false;
    }
    
    // Eğer zaten başlatılmışsa, mevcut olanı kullan
    if (getApps().length === 0) {
      console.log("Firebase uygulaması başlatılıyor...");
      try {
        app = initializeApp(firebaseConfig);
      } catch (initError) {
        console.error("Firebase başlatma hatası:", initError);
        return false;
      }
    } else {
      console.log("Firebase zaten başlatılmış, mevcut instance kullanılıyor");
      try {
        app = getApps()[0];
      } catch (getAppError) {
        console.error("Firebase instance erişim hatası:", getAppError);
        return false;
      }
    }
    
    // Firebase servislerini başlat
    db = getFirestore(app);
    rtdb = getDatabase(app);
    auth = getAuth(app);
    storage = getStorage(app);
    
    console.log("Firebase servisleri başarıyla başlatıldı");
    return true;
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