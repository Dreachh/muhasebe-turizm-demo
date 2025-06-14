'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User
} from 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';

// Hata ayıklama için konsol mesajları ekleyelim
console.log("Firebase Auth modülü yükleniyor...");

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
console.log("Firebase Auth başlatma girişimi...");
console.log("Mevcut Firebase Apps:", getApps().length);

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
console.log("Firebase App başlatıldı:", app.name);

const auth = getAuth(app);
console.log("Firebase Auth başlatıldı");

const googleProvider = new GoogleAuthProvider();

// Auth Context için tip tanımı
export type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<User | null>;
  signInWithGoogle: () => Promise<User | null>;
  signUp: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  
  // Eski fonksiyonlar için compatibility alias
  signin: (email: string, password: string) => Promise<User | null>;
  signinWithGoogle: () => Promise<User | null>;
  signup: (email: string, password: string) => Promise<User | null>;
  signout: () => Promise<void>;
};

// Varsayılan değerler
const defaultAuthContext: AuthContextType = {
  user: null,
  loading: true,
  error: null,
  signIn: async () => null,
  signInWithGoogle: async () => null,
  signUp: async () => null,
  logout: async () => {},
  
  // Eski fonksiyon isimleri için compatibility
  signin: async () => null,
  signinWithGoogle: async () => null,
  signup: async () => null,
  signout: async () => {},
};

// Auth Context oluştur
export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// Auth Hook
export const useAuth = (): AuthContextType => useContext(AuthContext);

// Auth Provider Bileşeni
export function FirebaseAuthProvider({ 
  children 
}: { 
  children: React.ReactNode 
}): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);  // Kullanıcı durumunu izle
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  // Email/Şifre ile giriş - basitleştirilmiş versiyon
  const signIn = async (email: string, password: string): Promise<User | null> => {
    try {
      console.log("signIn fonksiyonu başlatıldı - email:", email);
      setLoading(true);
      setError(null);
      
      // E-posta kontrolü
      console.log("E-posta kontrolü yapılıyor:", email);
      const { isAllowedEmail } = await import('./auth-config');
      
      if (!isAllowedEmail(email)) {
        console.warn("İzin verilmeyen e-posta adresi ile giriş denemesi:", email);
        setError("Bu e-posta adresi ile giriş yapma yetkisine sahip değilsiniz. Sadece yetkili hesaplar kullanılabilir.");
        return null;
      }
      
      // Doğrudan Firebase giriş isteği
      console.log("Firebase giriş isteği gönderiliyor...");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log("Firebase giriş başarılı! Kullanıcı bilgileri:", user.uid, user.email);
      setUser(user);
      return user;
      
    } catch (error: any) {
      console.error("Firebase giriş hatası:", error.code, error.message);
      
      let errorMessage = "Giriş hatası: ";
      
      // Firebase hata kodlarını daha kullanıcı dostu mesajlara çevirme
      if (error.code === 'auth/invalid-credential') {
        errorMessage += "E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.";
      } else if (error.code === 'auth/user-not-found') {
        errorMessage += "Bu e-posta ile kayıtlı hesap bulunamadı.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage += "Şifre hatalı.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage += "Çok fazla hatalı giriş denemesi. Lütfen daha sonra tekrar deneyin veya şifrenizi sıfırlayın.";
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Google ile giriş - sadece belirli kullanıcılar için
  const signInWithGoogle = async (): Promise<User | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      
      // Kullanıcı yetkilendirmesini kontrol et (ID ve e-posta)
      const { isAllowedUser, isAllowedEmail, isUserAuthorized } = await import('./auth-config');
      
      // Kullanıcı yetkili mi? (ID veya e-posta adresine göre)
      if (!isUserAuthorized(user.uid, user.email)) {
        // İzin verilmeyen kullanıcı, oturumu kapat
        console.warn("İzin verilmeyen kullanıcı girişi engellendi:", user.uid, user.email);
        await signOut(auth);
        setError("Bu Google hesabı ile giriş yapma yetkisine sahip değilsiniz. Sadece yetkili hesaplar kullanılabilir.");
        setUser(null);
        return null;
      }
      
      // İzin verilen kullanıcı
      console.log("İzin verilen kullanıcı giriş yaptı:", user.uid, user.email);
      setUser(user);
      return user;
    } catch (error: any) {
      let errorMessage = "Google giriş hatası: ";
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Google giriş penceresi kapatıldı. Lütfen tekrar deneyin.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = "İşlem iptal edildi. Lütfen tekrar deneyin.";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "Tarayıcı popup pencerelerini engellemiş olabilir. Lütfen popup izinlerini kontrol edin.";
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };
  // Hesap oluşturma - sadece belirli e-posta adresleri için
  const signUp = async (email: string, password: string): Promise<User | null> => {
    try {
      setLoading(true);
      setError(null);
      
      // E-posta kontrolü - izin verilen bir e-posta adresi mi?
      const { isAllowedEmail } = await import('./auth-config');
      
      if (!isAllowedEmail(email)) {
        console.warn("İzin verilmeyen e-posta adresi ile hesap oluşturma denemesi:", email);
        setError("Bu e-posta adresi ile hesap oluşturma yetkisine sahip değilsiniz. Sadece yetkili e-posta adresleri kullanılabilir.");
        return null;
      }
      
      // Hesap oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log("Yeni hesap oluşturuldu:", user.uid, user.email);
      setUser(user);
      return user;
    } catch (error: any) {
      let errorMessage = "Hesap oluşturma hatası: ";
      
      // Firebase hata kodlarını daha kullanıcı dostu mesajlara çevirme
      if (error.code === 'auth/email-already-in-use') {
        errorMessage += "Bu e-posta adresi zaten kullanılıyor. Lütfen giriş yapmayı deneyin.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage += "Şifre çok zayıf. Lütfen en az 6 karakter içeren daha güçlü bir şifre seçin.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage += "Geçersiz e-posta adresi.";
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Çıkış yapma - basitleştirilmiş
  const logout = async (): Promise<void> => {
    try {
      console.log("Çıkış yapılıyor...");
      await signOut(auth);
      console.log("Çıkış başarılı");
      setUser(null);
    } catch (error: any) {
      console.error("Çıkış hatası:", error.message);
      setError(`Çıkış hatası: ${error.message}`);
    }
  };
  const value: AuthContextType = {
    user,
    loading,
    error,
    signIn,
    signInWithGoogle,
    signUp,
    logout,
    // Eski fonksiyon isimleri için compatibility
    signin: signIn,
    signinWithGoogle: signInWithGoogle,
    signup: signUp,
    signout: logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
