#!/bin/bash

# Admin giriş sistemini Vercel için düzeltme ve deploy etme scripti

echo "Admin giriş sistemini güncelleme ve Vercel'e deploy etme scripti"
echo "================================================================"

# Git durumunu kontrol et
echo "Git değişikliklerini kontrol ediyorum..."
git status

# Değişiklikleri ekle
echo "Değişiklikleri ekleyip commit ediyorum..."
git add .
git commit -m "Admin giriş sistemi: Vercel için middleware ve localStorage iyileştirmeleri"

# Değişiklikleri push et
echo "Değişiklikleri GitHub'a gönderiyorum..."
git push

echo "================================================================"
echo "İşlem tamamlandı! Vercel otomatik olarak uygulamayı yeniden build edecek."
echo "Uygulamanızın yeniden dağıtılması birkaç dakika sürebilir."
echo "Vercel dashboard'dan build durumunu izleyebilirsiniz."
echo "================================================================"
echo "Yeni sürümde admin sayfalarına erişmeyi deneyin:"
echo "https://sizin-siteniz.vercel.app/admin/login"
