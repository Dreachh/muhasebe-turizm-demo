import { NextResponse } from 'next/server';
import { updateAdminPassword, verifyAdminEmail } from '@/lib/db-firebase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { newPassword, email } = body;
    
    // Şifre karmaşıklık kontrolü
    if (newPassword.length < 6) {
      return NextResponse.json({ 
        success: false, 
        error: "Şifre en az 6 karakter uzunluğunda olmalıdır." 
      }, { status: 400 });
    }
    
    // E-posta kontrolü
    const result = await verifyAdminEmail(email);
    if (!result.success || !result.isValid) {
      return NextResponse.json({ 
        success: false, 
        error: "Yetkisiz erişim denemesi" 
      }, { status: 403 });
    }
    
    // Şifreyi güncelle
    const updateResult = await updateAdminPassword(newPassword);
    
    if (updateResult.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: "Şifre güncellenirken bir hata oluştu" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Şifre güncelleme hatası:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Bir hata oluştu" 
    }, { status: 500 });
  }
}
