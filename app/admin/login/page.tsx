"use client";

import { useState, useEffect, FormEvent } from "react"; // FormEvent import edildi
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter, // CardFooter import edildi
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, User } from "firebase/auth"; // User import edildi
import { app as firebaseApp } from "@/lib/firebase"; // firebaseApp import edildi
import Link from "next/link";
import Image from "next/image";
// import { checkUserRole } from "@/lib/auth-utils"; // Kullanılmıyor
// import { UserRole } from "@/types/user"; // Kullanılmıyor

const auth = getAuth(firebaseApp); // auth değişkeni firebaseApp ile initialize edildi

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null); // Hata mesajı için string veya null tipinde state
  const [loading, setLoading] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null); // Firebase kullanıcı state'i User | null olarak güncellendi
  const router = useRouter();
  const { toast } = useToast();
  const { data: session, status } = useSession();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        // Firebase ile giriş yapılmışsa NextAuth session'ını da kontrol et
        if (status === "authenticated" && session?.user?.email === user.email) {
          router.push("/admin/dashboard");
        }
      }
    });
    return () => unsubscribe();
  }, [router, session, status]); // Bağımlılıklara session ve status eklendi

  // NextAuth session'ı zaten varsa dashboard'a yönlendir
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/admin/dashboard");
    }
  }, [status, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => { // event tipi FormEvent<HTMLFormElement> olarak belirtildi
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Önce Firebase ile giriş yapmayı dene
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      setFirebaseUser(user);

      // Firebase girişi başarılıysa, NextAuth ile de giriş yap
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError(result.error);
        toast({
          title: "Giriş Başarısız",
          description: result.error,
          variant: "destructive",
        });
      } else if (result?.ok) {
        toast({
          title: "Giriş Başarılı",
          description: "Yönetim paneline yönlendiriliyorsunuz...",
        });
        router.push("/admin/dashboard");
      }
    } catch (firebaseError: any) { // firebaseError tipi any olarak belirtildi
      // Firebase giriş hatası
      let errorMessage = "Bir hata oluştu. Lütfen tekrar deneyin.";
      if (firebaseError.code) {
        switch (firebaseError.code) {
          case "auth/user-not-found":
            errorMessage = "Kullanıcı bulunamadı. Lütfen e-postanızı kontrol edin.";
            break;
          case "auth/wrong-password":
            errorMessage = "Yanlış şifre. Lütfen şifrenizi kontrol edin.";
            break;
          case "auth/invalid-email":
            errorMessage = "Geçersiz e-posta formatı.";
            break;
          default:
            errorMessage = firebaseError.message;
        }
      }
      setError(errorMessage);
      toast({
        title: "Giriş Hatası",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <p className="text-lg font-semibold">Yükleniyor...</p>
          {/* İsteğe bağlı olarak bir yükleme animasyonu eklenebilir */}
        </div>
      </div>
    );
  }

  // Eğer session varsa ve kullanıcı giriş yapmışsa, dashboard'a yönlendir
  // Bu kontrol useEffect içinde zaten yapılıyor ama ek bir güvenlik katmanı olarak kalabilir.
  if (session && firebaseUser && session.user?.email === firebaseUser.email) {
     router.push("/admin/dashboard");
     return null; // Yönlendirme sırasında bir şey render etme
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-slate-200 dark:from-gray-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png" // Logonuzun yolu
              alt="Passionis Tour Logo"
              width={120} // İstediğiniz genişlik
              height={120} // İstediğiniz yükseklik
              className="rounded-full"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-[#003366]">Yönetici Girişi</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Yönetim paneline erişmek için giriş yapın.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="transition-all duration-300 ease-in-out focus:ring-2 focus:ring-[#00a1c6] dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Şifre</Label>
                {/* <Link
                  href="/admin/forgot-password" // Şifremi unuttum sayfası
                  className="text-sm text-[#007bff] hover:underline dark:text-[#00a1c6]"
                >
                  Şifreni mi unuttun?
                </Link> */}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="transition-all duration-300 ease-in-out focus:ring-2 focus:ring-[#00a1c6] dark:bg-gray-700 dark:text-white"
              />
            </div>
            {error && (
              <div className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-md border border-red-200 dark:border-red-700/50">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full bg-[#003366] hover:bg-[#004488] text-white font-semibold py-3 transition-colors duration-300 ease-in-out focus:ring-2 focus:ring-offset-2 focus:ring-[#00a1c6] disabled:opacity-70" disabled={loading || status === 'authenticated'}>
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Giriş Yapılıyor...
                </>
              ) : status === 'authenticated' ? 'Giriş Yapıldı' : 'Giriş Yap'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-center flex flex-col items-center">
          <p className="text-gray-600 dark:text-gray-400">
            Hesabınız yok mu?{' '}
            <Link href="/admin/setup" className="font-medium text-[#007bff] hover:underline dark:text-[#00a1c6]">
              Yeni Yönetici Oluştur
            </Link>
          </p>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
            &copy; {new Date().getFullYear()} Passionis Tour. Tüm hakları saklıdır.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}