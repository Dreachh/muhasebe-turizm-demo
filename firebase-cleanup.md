# Firebase Koleksiyon Temizliği

## SİLİNMESİ GEREKEN KOLEKSIYONLAR (Duplike)

### ❌ Silinecek Koleksiyonlar:
- `rezervasyonlar` → `reservations` kullanılıyor (ÖNEMLİ!)
- `masraflar` → `expenses` kullanılıyor
- `finansallar` → `financials` kullanılıyor  
- `odemeler` → `payments` kullanılıyor
- `pikapTurleri` → `pickupTypes` kullanılıyor
- `saglayicilar` → `providers` kullanılıyor
- `seriyeadlari` → `serialSettings` kullanılıyor
- `turSablonlari` → `tourTemplates` kullanılıyor
- `turlar` → `tours` kullanılıyor

### ✅ Tutulacak Ana Koleksiyonlar:
- `reservations` (rezervasyonlar - ana koleksiyon) ⭐
- `settings` (genel ayarlar)
- `destinations` (destinasyonlar)
- `providers` (firmalar/sağlayıcılar)
- `activities` (aktiviteler)
- `expenses` (giderler)
- `tours` (tur satışları)
- `financials` (finansal kayıtlar)
- `customers` (müşteriler)
- `serialSettings` (seri no ayarları)
- `countries` (ülkeler)
- `paymentMethods` (ödeme yöntemleri)
- `paymentStatuses` (ödeme durumları)
- `referral_sources` (referans kaynakları)

## ÖZEL DİKKAT! ⚠️

**Kod `reservations` (İngilizce) kullanıyor, `rezervasyonlar` (Türkçe) sil!**

## MANuel OLARAK Firebase Console'dan SİLİN:

1. Firebase Console → Firestore Database
2. Yukarıdaki ❌ işaretli koleksiyonları tek tek silin
3. Her koleksiyona girin → ... menüsü → "Delete collection"

## DİKKAT:
- **ÖNEMLİ**: `rezervasyonlar` (Türkçe) koleksiyonunu sil, `reservations` (İngilizce) koleksiyonunu tut!
- Sadece DUPLIKE (çoğaltılmış) koleksiyonları silin
- ✅ işaretli koleksiyonlara dokunmayın
- Silmeden önce verilerin backup'ını alın
