'use client';

import { useState } from 'react'; // useState import edildi
import { doc, setDoc, serverTimestamp, getFirestore } from "firebase/firestore";
import { initializeApp, getApps, getApp } from "firebase/app"; // getApps ve getApp import edildi
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"; // createUserWithEmailAndPassword import edildi
import { useRouter } from 'next/navigation'; // useRouter import edildi
import { Button } from '@/components/ui/button'; // Button import edildi
import { Input } from '@/components/ui/input'; // Input import edildi
import { Label } from '@/components/ui/label'; // Label import edildi
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'; // Card bileşenleri import edildi
import { useToast } from '@/components/ui/use-toast'; // useToast import edildi
import Image from 'next/image'; // Image import edildi

// Firebase konfigürasyon bilgileri (ortam değişkenlerinden alınması daha güvenlidir)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCdciO5sdgBxjtCGwRXHwYGHtCBQkw6I4c",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "muhasebe-demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "muhasebe-demo",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "muhasebe-demo.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "493899697907",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:493899697907:web:1ff0c226462be0254d3186",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-NFZ7TQPNEW",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://muhasebe-demo-default-rtdb.europe-west1.firebasedatabase.app"
};

// Firebase uygulamasını başlat (eğer zaten başlatılmamışsa)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export default function AdminSetupPage() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password123');
  const [confirmPassword, setConfirmPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSetupAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    if (password !== confirmPassword) {
      toast({
        title: 'Hata',
        description: 'Şifreler eşleşmiyor.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      // Firebase Authentication ile yeni kullanıcı oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Firestore'a admin bilgilerini kaydet (opsiyonel, rol bazlı erişim için kullanılabilir)
      const adminDocRef = doc(db, 'admins', user.uid); // admins koleksiyonu ve kullanıcı uid'si
      await setDoc(adminDocRef, {
        email: user.email,
        uid: user.uid,
        role: 'admin', // Kullanıcıya admin rolü ata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // API route'una istek göndererek NextAuth kullanıcısını da oluştur (isteğe bağlı)
      // Bu kısım, NextAuth ve Firebase Auth'u senkronize etmek için kullanılabilir.
      // await fetch('/api/auth/create-nextauth-user', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password, role: 'admin' }),
      // });

      toast({
        title: 'Başarılı!',
        description: 'Admin kullanıcısı başarıyla oluşturuldu. Giriş sayfasına yönlendiriliyorsunuz.',
      });
      router.push('/admin/login');
    } catch (error: any) {
      console.error('Admin oluşturulurken hata:', error);
      let errorMessage = 'Admin oluşturulurken bir hata oluştu.';
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'Bu e-posta adresi zaten kullanılıyor.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Geçersiz e-posta formatı.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Şifre çok zayıf. Lütfen daha güçlü bir şifre seçin.';
            break;
          default:
            errorMessage = error.message;
        }
      }
      toast({
        title: 'Admin Oluşturma Hatası',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-slate-200 dark:from-gray-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png" // Logonuzun yolu
              alt="Passionis Tour Logo"
              width={100} // İstediğiniz genişlik
              height={100} // İstediğiniz yükseklik
              className="rounded-full"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-[#003366]">Yeni Yönetici Oluştur</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            İlk yönetici hesabını oluşturmak için aşağıdaki formu doldurun.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSetupAdmin}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta Adresi</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="transition-all duration-300 ease-in-out focus:ring-2 focus:ring-[#00a1c6] dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6} // Firebase için minimum şifre uzunluğu
                className="transition-all duration-300 ease-in-out focus:ring-2 focus:ring-[#00a1c6] dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="transition-all duration-300 ease-in-out focus:ring-2 focus:ring-[#00a1c6] dark:bg-gray-700 dark:text-white"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-center">
            <Button type="submit" className="w-full bg-[#003366] hover:bg-[#004488] text-white font-semibold py-3 transition-colors duration-300 ease-in-out focus:ring-2 focus:ring-offset-2 focus:ring-[#00a1c6] disabled:opacity-70" disabled={loading}>
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Oluşturuluyor...
                </>
              ) : 'Yönetici Oluştur'}
            </Button>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Zaten bir hesabınız var mı?{' '}
              <a href="/admin/login" className="font-medium text-[#007bff] hover:underline dark:text-[#00a1c6]">
                Giriş Yap
              </a>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
