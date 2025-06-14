'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, Mail, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/firebase-auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.error) {
      setErrorMessage(auth.error);
    }
  }, [auth.error]);

  const handleAuthAction = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setErrorMessage('Lütfen e-posta ve şifre giriniz.');
      return;
    }
    
    setLoginInProgress(true);
    setErrorMessage(null);
    
    try {      let user;
      if (isRegistering) {
        user = await auth.signup(email, password);
        if (user) {
          router.push('/');
        }
      } else {
        user = await auth.signin(email, password);
        if (user) {
          router.push('/');
        }
      }
      
      if (!user && !auth.error) {
        setErrorMessage(isRegistering ? 
          'Kayıt oluşturulamadı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.' : 
          'Giriş yapılamadı. E-posta veya şifreniz yanlış olabilir.');
      }

    } catch (error: any) {
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setErrorMessage('E-posta adresi veya şifre hatalı. Lütfen kontrol ediniz.');
          break;
        case 'auth/email-already-in-use':
          setErrorMessage('Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapmayı deneyin.');
          break;
        case 'auth/weak-password':
          setErrorMessage('Şifre çok zayıf. Lütfen en az 6 karakterli bir şifre seçin.');
          break;
        case 'auth/too-many-requests':
          setErrorMessage('Çok fazla başarısız deneme yapıldı. Lütfen daha sonra tekrar deneyin.');
          break;
        default:
          setErrorMessage(error.message || 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      }
    } finally {
      setLoginInProgress(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    setLoginInProgress(true);
    setErrorMessage(null);    try {
      const user = await auth.signinWithGoogle();
      if (user) {
        router.push('/');
      } else if (!auth.error) {
        setErrorMessage('Google ile giriş yapılamadı. Lütfen tekrar deneyin.');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Google ile giriş sırasında bir hata oluştu.');
    } finally {
      setLoginInProgress(false);
    }
  };

  useEffect(() => {
    if (auth.user) {
      router.push('/');
    }
  }, [auth.user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 p-4">
      <Card className="w-full max-w-md shadow-xl rounded-lg overflow-hidden">
        <CardHeader className="space-y-2 text-center bg-slate-50 p-6">
          <div className="flex justify-center mb-3">
            <img src="/logo.svg" alt="Passionis Logo" className="h-14 w-auto" /> 
          </div>
          <CardTitle className="text-3xl font-bold text-slate-800">
            {isRegistering ? 'Hesap Oluştur' : 'Passionis Tour Giriş'}
          </CardTitle>
          <CardDescription className="text-slate-600">
            {isRegistering 
              ? 'Yeni bir hesap oluşturmak için bilgilerinizi girin.' 
              : 'Devam etmek için lütfen giriş yapın.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {errorMessage && (
            <Alert variant="destructive" className="bg-red-50 text-red-700 border-red-300">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleAuthAction} className="space-y-5">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="E-posta adresiniz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 pr-3 py-2.5 text-base border-slate-300 focus:border-sky-500 focus:ring-sky-500"
                disabled={loginInProgress}
                autoComplete="email"
                required
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Şifreniz"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 py-2.5 text-base border-slate-300 focus:border-sky-500 focus:ring-sky-500"
                disabled={loginInProgress}
                autoComplete={isRegistering ? "new-password" : "current-password"}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full py-3 text-base font-semibold bg-sky-600 hover:bg-sky-700 transition-colors duration-150"
              disabled={loginInProgress}
            >
              {isRegistering 
                ? <UserPlus className="mr-2 h-5 w-5" /> 
                : <LogIn className="mr-2 h-5 w-5" />}
              {loginInProgress 
                ? (isRegistering ? "Hesap Oluşturuluyor..." : "Giriş Yapılıyor...") 
                : (isRegistering ? "Kayıt Ol" : "Giriş Yap")}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-300"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Veya</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full py-3 text-base font-medium border-slate-300 hover:bg-slate-50 transition-colors duration-150"
            onClick={handleGoogleLogin}
            disabled={loginInProgress}
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google ile giriş yap" 
              className="mr-2 h-5 w-5" 
            />
            Google ile Devam Et
          </Button>
        </CardContent>

        <CardFooter className="p-6 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMessage(null);
            }}
            className="w-full text-sm text-sky-600 hover:text-sky-800 hover:underline focus:outline-none"
            disabled={loginInProgress}
          >
            {isRegistering 
              ? "Zaten bir hesabınız var mı? Giriş Yapın"
              : "Hesabınız yok mu? Hemen Kayıt Olun"}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
