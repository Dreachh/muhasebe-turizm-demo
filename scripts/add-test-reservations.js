// Test rezervasyon verileri eklemek için script

const testReservations = [
  {
    id: "test-rezervasyon-1",
    misafirAdi: "Ahmet Demir",
    telefon: "+90 532 123 4567",
    email: "ahmet.demir@email.com",
    turTarihi: "2025-06-25", // 5 gün sonra
    destinasyon: "Kapadokya",
    firma: "ABC Turizm",
    odemeDurumu: "Ödendi",
    toplamFiyat: 2500,
    paraBirimi: "TRY",
    kisiSayisi: 2,
    notlar: "Balon turu dahil",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "test-rezervasyon-2", 
    misafirAdi: "Elif Yılmaz",
    telefon: "+90 533 987 6543",
    email: "elif.yilmaz@email.com",
    turTarihi: "2025-06-21", // Yarın
    destinasyon: "Antalya",
    firma: "XYZ Travel",
    odemeDurumu: "Bekliyor",
    toplamFiyat: 1800,
    paraBirimi: "TRY",
    kisiSayisi: 3,
    notlar: "Otelde konaklama",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "test-rezervasyon-3",
    misafirAdi: "Mehmet Kaya", 
    telefon: "+90 534 555 1234",
    email: "mehmet.kaya@email.com",
    turTarihi: "2025-07-15", // Gelecek ay
    destinasyon: "İstanbul",
    firma: "DEF Tours",
    odemeDurumu: "Kısmi Ödendi",
    toplamFiyat: 3200,
    paraBirimi: "TRY",
    kisiSayisi: 4,
    notlar: "Özel tur talebi",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// localStorage'a ekle
localStorage.setItem('reservations', JSON.stringify(testReservations));
console.log("✅ Test rezervasyon verileri eklendi:", testReservations);
