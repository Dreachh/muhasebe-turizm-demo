/*
"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken, getAuth } from 'firebase/auth';
import { app as firebaseApp } from '@/lib/firebase'; // Firebase app instance
import { exchangeToken } from '@/lib/auto-login'; // Sunucu taraflı token değişim fonksiyonu

const AutoLoginPage = () => {
  const router = useRouter();
  const auth = getAuth(firebaseApp);

  useEffect(() => {
    const autoLogin = async () => {
      try {
        // 1. Sunucudan özel token'ı al
        const customToken = await exchangeToken();

        if (customToken) {
          // 2. Firebase ile özel token kullanarak giriş yap
          await signInWithCustomToken(auth, customToken);
          // 3. Başarılı giriş sonrası yönlendirme
          router.push('/admin/dashboard'); // Veya istediğiniz başka bir sayfa
        } else {
          // Token alınamazsa hata yönetimi veya login sayfasına yönlendirme
          console.error("Özel token alınamadı.");
          router.push('/login');
        }
      } catch (error) {
        console.error("Otomatik giriş sırasında hata:", error);
        router.push('/login'); // Hata durumunda login sayfasına yönlendir
      }
    };

    autoLogin();
  }, [router, auth]);

  return (
    <div>
      <p>Giriş yapılıyor, lütfen bekleyin...</p>
    </div>
  );
};

export default AutoLoginPage;
*/

// Bu sayfa güvenlik ve gereksizlik nedeniyle devre dışı bırakıldı.
// Gerekirse, yorumları kaldırıp tekrar aktif edebilirsiniz.
export default function AutoLoginPage() {
  if (typeof window !== 'undefined') {
    // İstemci tarafında çalışıyorsa, ana sayfaya yönlendir.
    // Bu, Vercel'de derleme hatalarını önlemeye yardımcı olabilir.
    window.location.href = '/';
  }
  return null; // Sunucu tarafı render için veya yönlendirme öncesi
}
