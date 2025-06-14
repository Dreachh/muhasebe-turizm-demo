# Admin giriş sistemini Vercel için düzeltme ve deploy etme scripti (PowerShell)

Write-Host "Admin giriş sistemini güncelleme ve Vercel'e deploy etme scripti" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green

# Git durumunu kontrol et
Write-Host "Git değişikliklerini kontrol ediyorum..." -ForegroundColor Cyan
git status

# Değişiklikleri ekle
Write-Host "Değişiklikleri ekleyip commit ediyorum..." -ForegroundColor Cyan
git add .
git commit -m "Admin giriş sistemi: Vercel için middleware ve localStorage iyileştirmeleri"

# Değişiklikleri push et
Write-Host "Değişiklikleri GitHub'a gönderiyorum..." -ForegroundColor Cyan
git push

Write-Host "================================================================" -ForegroundColor Green
Write-Host "İşlem tamamlandı! Vercel otomatik olarak uygulamayı yeniden build edecek." -ForegroundColor Yellow
Write-Host "Uygulamanızın yeniden dağıtılması birkaç dakika sürebilir." -ForegroundColor Yellow
Write-Host "Vercel dashboard'dan build durumunu izleyebilirsiniz." -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Green
Write-Host "Yeni sürümde admin sayfalarına erişmeyi deneyin:" -ForegroundColor Cyan
Write-Host "https://sizin-siteniz.vercel.app/admin/login" -ForegroundColor White
