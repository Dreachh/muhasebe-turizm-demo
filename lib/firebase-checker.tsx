// Firebase ve diğer servisler için varsayılan yapılandırma kontrolcüsü
// Bu dosya Firebase'in yüklenmesi sırasında ek güvenlik kontrolleri sağlar

import { useEffect, useState } from 'react';
import { clientInitializeFirebase } from './firebase';

export function useFirebaseStatus() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function checkFirebase() {
      try {
        // Firebase'i başlatmaya çalış
        if (typeof window !== 'undefined') {
          console.log('Firebase client tarafında başlatılıyor...');
          const firebaseInstance = clientInitializeFirebase();
          console.log('Firebase client instance:', firebaseInstance ? 'Başarılı' : 'Başarısız');
        }
        
        // Firebase modülünü dinamik olarak import et
        const firebaseModule = await import('@/lib/firebase');
        
        // Firebase app ve db'nin varlığını kontrol et
        if (!firebaseModule.app || !firebaseModule.db) {
          throw new Error('Firebase servisleri başlatılamadı');
        }
        
        console.log('Firebase kontrolleri başarılı');
        setIsReady(true);
      } catch (err) {
        console.error('Firebase servisleri kontrol hatası:', err);
        setError(err instanceof Error ? err : new Error('Bilinmeyen hata'));
      }
    }
    
    checkFirebase();
  }, []);
  
  return { isReady, error };
}

export function withFirebaseCheck(Component: React.ComponentType<any>) {
  return function WrappedComponent(props: any) {
    const { isReady, error } = useFirebaseStatus();
    
    if (error) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Firebase Bağlantı Hatası</h2>
            <p className="text-sm text-gray-600">{error.message}</p>
            <p className="mt-4 text-sm">
              <button 
                onClick={() => window.location.reload()}
                className="text-blue-500 hover:text-blue-700 underline"
              >
                Sayfayı Yenile
              </button>
            </p>
          </div>
        </div>
      );
    }
    
    if (!isReady) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 border-t-4 border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Firebase servisleri yükleniyor...</p>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}
