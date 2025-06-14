'use client';

import { useEffect } from 'react';
import { useAuth } from './firebase-auth';

/**
 * Firebase Authentication durumunu cookie'lere kaydeden bir bileşen
 * Bu bileşen layout.tsx içerisinde kullanılarak tüm sayfalarda çalışır
 */
export function FirebaseAuthSync() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Sadece client tarafında çalışacak
    if (typeof window === 'undefined') return;

    // Authentication durumu yüklendiğinde
    if (!loading) {
      if (user) {
        // Kullanıcı giriş yapmış ise
        console.log('Kullanıcı giriş yapmış:', user.email);
        
        // Cookie'leri ayarla (3 hafta geçerli)
        document.cookie = `firebase_session=true; path=/; max-age=${3 * 7 * 24 * 60 * 60}; SameSite=Strict`;
        document.cookie = `admin_logged_in=true; path=/; max-age=${3 * 7 * 24 * 60 * 60}; SameSite=Strict`;
        
        // localStorage'a da kaydet (client-side kontrol için)
        localStorage.setItem('adminLoggedIn', 'true');

        console.log('Authentication durumu cookie ve localStorage\'a kaydedildi');
      } else {
        // Kullanıcı giriş yapmamış ise
        console.log('Kullanıcı giriş yapmamış, cookie ve localStorage temizleniyor');
        
        // Cookie'leri temizle
        document.cookie = 'firebase_session=; path=/; max-age=0; SameSite=Strict';
        document.cookie = 'admin_logged_in=; path=/; max-age=0; SameSite=Strict';
        
        // localStorage'ı temizle
        localStorage.removeItem('adminLoggedIn');
        }
    }
  }, [user, loading]);

  // Bu bileşen herhangi bir UI render etmez
  return null;
}

export default FirebaseAuthSync;
