import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminCredentials, getSessionVersion } from '@/lib/db-firebase';

// Admin giriş API endpoint'i
export async function POST(request: Request) {
  try {
    // Istek verilerini al
    const data = await request.json();
    const { username, password } = data;
    
    // Admin kimlik bilgilerini veritabanından al
    const adminCreds = await getAdminCredentials();
    
    // Admin kimlik bilgileri doğru mu kontrol et
    if (!adminCreds || !adminCreds.username) {
      console.error("Admin kimlik bilgileri bulunamadı");
      return NextResponse.json({ success: false, error: "Admin kullanıcı bilgileri bulunamadı. Lütfen yetkili ile iletişime geçin." }, { status: 404 });
    }
    
    // Kullanıcı adı ve şifre doğru mu kontrol et
    if (adminCreds.username === username && adminCreds.password === password) {
      // Giriş başarılı - mevcut oturum versiyonunu al
      const sessionVersion = await getSessionVersion();
      
      // Çerezler ile oturum bilgilerini ayarla (24 saat geçerli)
      cookies().set({
        name: 'admin_session',
        value: 'authenticated',
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      });
      
      // Oturum versiyonunu cookie'ye ayarla
      cookies().set({
        name: 'session_version',
        value: sessionVersion.toString(),
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      });
      
      // Başarılı yanıt döndür
      return NextResponse.json({ 
        success: true, 
        sessionVersion: sessionVersion,
        message: "Giriş başarılı"
      });
    } else {
      // Giriş başarısız
      return NextResponse.json({ 
        success: false, 
        error: "Kullanıcı adı veya şifre hatalı" 
      }, { status: 401 });
    }
  } catch (error) {
    console.error("Admin giriş hatası:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Giriş işlemi sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin."
    }, { status: 500 });
  }
}