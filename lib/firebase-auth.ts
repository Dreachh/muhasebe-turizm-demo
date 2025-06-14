'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

// Firebase yapılandırmasını import et
import { firebaseConfig } from './firebase-config';

// Firebase'i başlat
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// AuthContext türü
type AuthContextType = {
  user: User | null;
  loading: boolean;
  signin: (email: string, password: string) => Promise<User>;
  signinWithGoogle: () => Promise<User>;
  signup: (email: string, password: string) => Promise<User>;
  signout: () => Promise<void>;
  error: string | null;
};

// AuthContext oluştur
export const AuthContext = createContext<AuthContextType | null>(null);

// Auth Provider bileşeni
export const FirebaseAuthProvider = ({ children }: { children: ReactNode }): React.ReactNode => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Kullanıcı durumu değişikliklerini dinle
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Email/Şifre ile giriş
  const signin = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (error: any) {
      setError("Giriş yapılamadı: " + (error.message || "Bilinmeyen hata"));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Google ile giriş
  const signinWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (error: any) {
      setError("Google ile giriş yapılamadı: " + (error.message || "Bilinmeyen hata"));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Yeni kullanıcı oluşturma
  const signup = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (error: any) {
      setError("Hesap oluşturulamadı: " + (error.message || "Bilinmeyen hata"));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Çıkış yapma
  const signout = async () => {
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
    } catch (error: any) {
      setError("Çıkış yapılamadı: " + (error.message || "Bilinmeyen hata"));
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signin, signinWithGoogle, signup, signout, error }}>
      {children}
    </AuthContext.Provider>
  );
};

// Auth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Yardımcı fonksiyonlar
export const signInWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signInWithGooglePopup = () => {
  return signInWithPopup(auth, googleProvider);
};

export const createUser = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const logout = () => {
  return signOut(auth);
};

export { auth };
