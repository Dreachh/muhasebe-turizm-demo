'use client';

/**
 * firebase-fallback.js
 * 
 * Bu dosya, ana Firebase modüllerinde bir sorun olduğunda devreye girer.
 * Basitleştirilmiş ve yalnızca login için gereken minimum fonksiyonaliteyi içerir.
 */

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Minimum Firebase yapılandırması
const minimalConfig = {
  apiKey: "AIzaSyCdciO5sdgBxjtCGwRXHwYGHtCBQkw6I4c",
  authDomain: "muhasebe-demo.firebaseapp.com",
  projectId: "muhasebe-demo",
  storageBucket: "muhasebe-demo.firebasestorage.app",
  messagingSenderId: "493899697907",
  appId: "1:493899697907:web:1ff0c226462be0254d3186",
  measurementId: "G-NFZ7TQPNEW",
  databaseURL: "https://muhasebe-demo-default-rtdb.europe-west1.firebasedatabase.app"
};

// Yedek Firebase başlatma işlevi
export function initializeFallbackFirebase() {
  try {
    console.log("⚠️ Fallback Firebase başlatılıyor...");
    const app = initializeApp(minimalConfig);
    const db = getFirestore(app);
    return { success: true, app, db };
  } catch (error) {
    console.error("❌ Fallback Firebase başlatma hatası:", error);
    return { success: false };
  }
}

// Fallback admin doğrulama bilgileri
// NOT: Bu sadece acil durumlar için kullanılmalıdır
export const FALLBACK_ADMIN = {
  checkCredentials: (username, password) => {
    // Bu fonksiyon yalnızca acil durum girişi içindir
    return username === 'passionis' && password === 'Passionis123!';
  }
};
