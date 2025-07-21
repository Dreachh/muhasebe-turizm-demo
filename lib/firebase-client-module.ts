'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
// Auth kaldırıldı - MySQL'e geçiş

// Firebase yapılandırmasını import et
import { firebaseConfig } from './firebase-config';

// Firebase başlatma durumu
let app: any = null; // FirebaseApp
let db: any = null; // Firestore
let rtdb: any = null; // Realtime Database
// Auth kaldırıldı
let firebaseInitialized = false;

// Firebase başlatma fonksiyonu - Tek bir instance sağlar
export const initializeFirebaseClient = () => {
  if (firebaseInitialized) {
    console.log("Firebase client module already initialized.");
    return { success: true };
  }
  try {
    console.log("Attempting to initialize Firebase app...");
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized successfully.");
    } else {
      app = getApp();
      console.log("Firebase app already exists, retrieved existing instance.");
    }

    console.log("Attempting to initialize Firestore...");
    db = getFirestore(app);
    console.log("Firestore initialized successfully.");

    console.log("Attempting to initialize Realtime Database...");
    rtdb = getDatabase(app);
    console.log("Realtime Database initialized successfully.");

    // Auth kaldırıldı - MySQL'e geçiş
    
    firebaseInitialized = true;
    console.log("Firebase client module initialization complete.");
    return { success: true };
  } catch (error) {
    console.error("!!! Firebase client module initialization error:", error);
    firebaseInitialized = false; // Ensure it's marked as not initialized on error
    // Propagate specific service initialization failures if needed
    if (!app) console.error("Firebase app initialization failed.");
    if (!db) console.error("Firestore initialization failed.");
    if (!rtdb) console.error("Realtime Database initialization failed.");
    // Auth kontrolü kaldırıldı
    return { success: false, error };
  }
};

// Firebase başlatılıp başlatılmadığını kontrol eden fonksiyon
export const isFirebaseInitialized = () => {
  // Auth kontrolü kaldırıldı
  return firebaseInitialized && app && db;
};

// Firebase başlat (tek bir instance oluştur)
// Call initialization early
const initResult = initializeFirebaseClient();
if (!initResult.success) {
  console.error("!!! Critical: Firebase client module failed to initialize on load.", initResult.error);
}


// Firebase servislerini dışa aktar
export const getDb = () => {
  if (!db) {
    console.warn("getDb called but Firestore (db) is not initialized. Attempting to re-initialize.");
    // Attempt re-initialization or handle error, for now, log and return potentially null db
    // This path indicates a problem during initial load.
    initializeFirebaseClient(); // Try to initialize again if not already
    if(!db) console.error("!!! Firestore (db) is still not available after re-attempt in getDb.");
  }
  return db;
};
export const getRtdb = () => {
  if (!rtdb) {
    console.warn("getRtdb called but Realtime Database (rtdb) is not initialized.");
    initializeFirebaseClient();
    if(!rtdb) console.error("!!! Realtime Database (rtdb) is still not available after re-attempt in getRtdb.");
  }
  return rtdb;
};
export const getFirebaseApp = () => {
  if (!app) {
    console.warn("getFirebaseApp called but Firebase App (app) is not initialized.");
    initializeFirebaseClient();
     if(!app) console.error("!!! Firebase App (app) is still not available after re-attempt in getFirebaseApp.");
  }
  return app;
};

// Auth fonksiyonu kaldırıldı - MySQL'e geçiş

// Doğrudan erişim için
export { db, rtdb, app };