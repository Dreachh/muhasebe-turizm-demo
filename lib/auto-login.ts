'use client';

/**
 * Bu modül, uygulamanın otomatik admin girişi yapmasını sağlar.
 * Admin giriş ekranı kaldırıldığından, cookie'leri otomatik olarak
 * oluşturup kullanıcıya direkt erişim sağlar.
 */

export function setupAutoLogin() {
  if (typeof window !== 'undefined') {
    // Manuel çıkış kontrolü ekle
    const manualLogout = localStorage.getItem('manualLogout') === 'true';
    
    if (manualLogout) {
      console.log('Manuel çıkış aktif, otomatik admin girişi engelleniyor...');
      // Manuel çıkış durumunda tüm admin cookie'lerini temizle
      document.cookie = 'admin_session=; path=/; max-age=0; SameSite=Strict';
      document.cookie = 'session_version=; path=/; max-age=0; SameSite=Strict';
      document.cookie = 'adminLoggedInClient=; path=/; max-age=0; SameSite=Strict';
      document.cookie = 'firebase_session=; path=/; max-age=0; SameSite=Strict';
      document.cookie = 'admin_logged_in=; path=/; max-age=0; SameSite=Strict';
      return false;
    }
    
    // Tarayıcı ortamında çalıştığından emin ol
    console.log('Otomatik admin girişi ayarlanıyor...');
    
    // Cookie'leri kontrol et
    const hasAdminSession = document.cookie.includes('admin_session=authenticated');
    
    if (!hasAdminSession) {
      // Admin oturumunu otomatik olarak ayarla (cookie'ler 30 gün geçerli)
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      
      // Admin cookie'lerini oluştur
      document.cookie = `admin_session=authenticated; expires=${expires.toUTCString()}; path=/`;
      document.cookie = `session_version=999; expires=${expires.toUTCString()}; path=/`;
      document.cookie = `adminLoggedInClient=true; expires=${expires.toUTCString()}; path=/`;
      
      console.log('Admin oturum cookie\'leri otomatik oluşturuldu.');
    } else {
      console.log('Admin oturum cookie\'leri zaten mevcut.');
    }
  }
  
  return true;
}
