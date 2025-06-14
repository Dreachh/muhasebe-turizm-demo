import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// E-posta gönderimi için bir API
export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();
    
    // Admin e-posta adresini al ve karşılaştır
    // Firestore'dan kontrolü varsayılan olarak kaldırıyoruz çünkü
    // şu an için sabit e-posta adresini kullanıyoruz
    // İlerisi için: getAdminCredentials() fonksiyonunu kullanarak
    // Firestore'dan e-posta adresini alabilirsiniz
    if (email !== 'passionistravell@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized email', success: false }, { status: 403 });
    }
    
    // Gerçek SMTP bilgilerini .env.local dosyasından alıyoruz
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    
    const mailOptions = {
      from: `"Pasionis Travel" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Pasionis Travel - Şifre Sıfırlama Kodu',
      text: `Şifre sıfırlama kodunuz: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Pasionis Travel - Şifre Sıfırlama</h2>
          <p>Merhaba,</p>
          <p>Şifre sıfırlama talebiniz için doğrulama kodu:</p>
          <div style="background-color: #f4f4f4; padding: 15px; font-size: 24px; text-align: center; letter-spacing: 5px; margin: 20px 0;">
            <strong>${code}</strong>
          </div>
          <p>Bu kodu kullanarak şifrenizi sıfırlayabilirsiniz.</p>
          <p>Eğer bu talebi siz yapmadıysanız, lütfen bu e-postayı dikkate almayın.</p>
          <p>Saygılarımızla,<br>Pasionis Travel Ekibi</p>
        </div>
      `
    };
    
    // E-postayı gönder
    const info = await transporter.sendMail(mailOptions);
    
    // E-posta gönderim sonucunu konsola yazdır
    console.log("Message sent: %s", info.messageId);
    
    // Başarılı yanıt dön
    return NextResponse.json({ 
      success: true,
      messageId: info.messageId
    });
    
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
} 