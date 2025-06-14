'use client';

/**
 * Firebase bağlantısını otomatik olarak tekrar denemek için yardımcı sayfa.
 * Bu sayfa, başka sayfalardan yönlendirildiğinde, tarayıcı önbelleğini ve Firebase 
 * bağlantısını temizleyerek yeniden deneme yapar.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { initializeFirebaseClient } from '@/lib/firebase-client-module';

export default function FirebaseRetryPage() {
  const [retryCount, setRetryCount] = useState(0);
  const [status, setStatus] = useState('Temizleme işlemi başlıyor...');
    useEffect(() => {
    // Çevre değişkenlerini al
    const autoRetry = process.env.NEXT_PUBLIC_FIREBASE_AUTO_RETRY === 'true';
    const maxRetryCount = parseInt(process.env.NEXT_PUBLIC_FIREBASE_RETRY_COUNT || '3', 10);
    const retryDelayMs = parseInt(process.env.NEXT_PUBLIC_FIREBASE_RETRY_DELAY_MS || '500', 10);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    
    console.log('Vercel çevre değişkenleri:', { 
      autoRetry, 
      maxRetryCount, 
      retryDelayMs, 
      appUrl,
      vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL
    });
    
    // Tarayıcı önbelleğini ve Firebase verilerini temizle
    const cleanupAndRetry = async () => {
      // Session bilgilerini temizle
      try {
        localStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminLoggedIn');
        document.cookie = "adminLoggedInClient=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        console.log('Oturum bilgileri temizlendi');
        setStatus('Oturum bilgileri temizlendi');
      } catch (e) {
        console.error('Temizleme hatası:', e);
      }
      
      // Kısa bir bekleme
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      
      // Firebase'i yeniden başlatmayı dene
      try {
        setStatus('Firebase yeniden başlatılıyor...');
        const result = initializeFirebaseClient();
        if (result.success) {
          setStatus('Firebase başarıyla yeniden başlatıldı! Yönlendiriliyor...');
          // Login sayfasına yönlendir
          setTimeout(() => {
            window.location.href = '/admin/login?retry_success=true';
          }, 1000);
        } else {
          if (retryCount < maxRetryCount) {
            setStatus(`Firebase başlatılamadı, ${maxRetryCount - retryCount} deneme kaldı...`);
            setRetryCount(count => count + 1);
            // Belirli bir süre sonra tekrar dene
            setTimeout(cleanupAndRetry, retryDelayMs * 2);
          } else {
            setStatus('Firebase başlatılamadı. Lütfen manuel olarak tekrar deneyin.');
          }
        }
      } catch (e) {
        console.error('Firebase başlatma hatası:', e);
        setStatus('Firebase başlatma hatası oluştu. Lütfen sayfayı yenileyin.');
      }
    };
    
    cleanupAndRetry();
  }, [retryCount]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Firebase Bağlantısı Yenileniyor</CardTitle>
          <CardDescription>Bağlantı tekrar kurulmaya çalışılıyor...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
            <Alert>
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
