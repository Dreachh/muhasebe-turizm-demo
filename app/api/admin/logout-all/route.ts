import { NextResponse } from 'next/server';
import { incrementSessionVersion } from '@/lib/db-firebase';

// Admin oturumlarını sonlandırma API'si
export async function POST() {
  try {
    // Tüm oturumları geçersiz kılmak için versiyon numarasını arttır
    const result = await incrementSessionVersion();
    
    // Mevcut oturumu da temizle
    const cookieOptions = {
      expires: new Date(0),
      path: '/',
    };
    
    if (result.success) {
      // Başarılı sonuç ve cookie temizleme
      const response = NextResponse.json({ 
        success: true, 
        message: 'Tüm oturumlar sonlandırıldı', 
        newVersion: result.newVersion
      });
      
      // Cookie'leri temizle
      response.cookies.set({
        name: 'admin_session',
        value: '',
        ...cookieOptions
      });
      
      response.cookies.set({
        name: 'session_version',
        value: '',
        ...cookieOptions
      });
      
      console.log('Tüm oturumlar başarıyla sonlandırıldı. Yeni versiyon:', result.newVersion);
      
      return response;
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Oturumları sonlandırma sırasında hata oluştu'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Oturumları sonlandırma hatası:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'İşlem sırasında bir hata oluştu'
    }, { status: 500 });
  }
}
