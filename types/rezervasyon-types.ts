export interface Katilimci {
  id: number;
  ad: string;
  soyad: string;
  telefon: string;
  email: string;
  tcKimlik: string;
  ulke: string;
}

export interface Rezervasyon {
  id: string;
  seriNumarasi: string;
  kayitTarihi: string | number | Date;
  turTarihi: string | number | Date;
  kaydOlusturan: string;
  destinasyon: string;
  destinationName?: string; // getReservations fonksiyonundan gelen destinasyon ismi
  turSablonu: string;
  yetiskinSayisi: string | number;
  cocukSayisi: string | number;
  bebekSayisi: string | number;
  alisSaati: string;
  musteriAdiSoyadi: string;
  telefon: string;
  email: string;
  adres: string;
  tcKimlikPasaport: string;
  vatandaslik: string;
  referansKaynagi: string;
  alisYeri: string;
  alisDetaylari: Record<string, string>;
  firma: string;
  yetkiliKisi: string;
  yetkiliTelefon: string;
  yetkiliEmail: string;
  odemeYapan: string;
  odemeYontemi: string;
  odemeDurumu: "Ödendi" | "Bekliyor" | "Kısmi Ödendi" | "İptal" | "Tamamlandı";
  toplamTutar?: string | number; // Toplam tur tutarı
  odemeMiktari?: string | number; // Ödenen miktar
  tutar: string | number; // Geriye uyumluluk için
  paraBirimi: string;
  odemeTarihi: string;
  odemeNotlari: string;
  notlar: string;
  ozelIstekler: string;
  katilimcilar: Katilimci[];
}
