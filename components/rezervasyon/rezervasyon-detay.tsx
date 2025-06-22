"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Printer, X } from "lucide-react"
import { format } from "date-fns"

interface RezervasyonDetayProps {
  reservation: any
  onClose: () => void
}

export function RezervasyonDetay({ reservation, onClose }: RezervasyonDetayProps) {
  const handlePrint = () => {
    window.print()
  }

  // ESC tuşu ile kapatma
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Kontrol Butonları - Print sırasında gizli */}
        <div className="flex justify-between items-center p-4 border-b print:hidden">
          <h2 className="text-xl font-bold">Rezervasyon Detayları</h2>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="h-4 w-4 mr-2" />
              Yazdır
            </Button>
            <Button onClick={onClose} variant="outline">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Print Edilecek İçerik */}
        <div className="p-8 print:p-6 print-content">
          {/* Firma Başlığı */}
          <div className="text-center mb-8 border-b-2 border-blue-600 pb-6">            <div className="flex items-center justify-center mb-4">              <img src="/logo.svg" alt="Nehir Travel" className="h-16 w-auto mr-4" />
              <div>
                <h1 className="text-2xl font-bold text-blue-600">NEHİR TRAVEL</h1>
                <p className="text-sm text-gray-600">Yönetim Sistemi Kontrol Paneli</p>
              </div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tarih: {format(new Date(), "dd.MM.yyyy")}</span>
              <span>Belge No: {reservation.seriNumarasi}</span>
            </div>
          </div>

          {/* Tur Bilgileri */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-green-600 mb-4 border-b border-green-200 pb-2">
              Tur Bilgileri <span className="text-sm text-gray-500 font-normal">(Tour Information)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-gray-800 mb-4">
                  Tur Detayları <span className="text-sm text-gray-500 font-normal">(Tour Details)</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">
                      Seri No: <span className="text-xs">(Ref No)</span>
                    </span>
                    <div className="font-medium">{reservation.seriNumarasi}</div>
                  </div>

                  <div>
                    <span className="text-sm text-gray-600">
                      Başlangıç Tarihi: <span className="text-xs">(Start Date)</span>
                    </span>
                    <div className="font-medium">{format(new Date(reservation.turTarihi), "dd.MM.yyyy")}</div>
                  </div>                  <div>
                    <span className="text-sm text-gray-600">
                      Kişi Sayısı: <span className="text-xs">(Number of Participants)</span>
                    </span>
                    <div className="font-medium">
                      {reservation.yetiskinSayisi} Yetişkin <span className="text-xs">(Adult)</span>
                      {reservation.cocukSayisi > 0 && `, ${reservation.cocukSayisi} Çocuk `}
                      <span className="text-xs">(Child)</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-gray-600">
                      Varış Yeri: <span className="text-xs">(Destination)</span>
                    </span>
                    <div className="font-medium">{reservation.destinasyon || "-"}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 mb-4">Ek Bilgiler</h3>

                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">
                      Tur Bilgileri: <span className="text-xs">(Tour Details)</span>
                    </span>
                    <div className="font-medium">{reservation.turSablonu || "-"}</div>
                  </div>

                  <div>
                    <span className="text-sm text-gray-600">
                      Tur Kaydını Oluşturan Kişi: <span className="text-xs">(Created By)</span>
                    </span>
                    <div className="font-medium">{reservation.kaydOlusturan || "-"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Müşteri Bilgileri */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-green-600 mb-4 border-b border-green-200 pb-2">
              Müşteri Bilgileri <span className="text-sm text-gray-500 font-normal">(Customer Information)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">
                    Ad Soyad: <span className="text-xs">(Full Name)</span>
                  </span>
                  <div className="font-medium">{reservation.musteriAdiSoyadi}</div>
                </div>

                <div>
                  <span className="text-sm text-gray-600">
                    E-posta: <span className="text-xs">(Email)</span>
                  </span>
                  <div className="font-medium">{reservation.email || "-"}</div>
                </div>

                <div>
                  <span className="text-sm text-gray-600">
                    Vatandaşlık/Ülke: <span className="text-xs">(Citizenship/Country)</span>
                  </span>
                  <div className="font-medium">{reservation.vatandaslik || "-"}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">
                    Telefon: <span className="text-xs">(Phone)</span>
                  </span>
                  <div className="font-medium">{reservation.telefon}</div>
                </div>

                <div>
                  <span className="text-sm text-gray-600">
                    TC/Pasaport No: <span className="text-xs">(ID/Passport No)</span>
                  </span>
                  <div className="font-medium">{reservation.tcKimlikPasaport || "-"}</div>
                </div>

                <div>
                  <span className="text-sm text-gray-600">
                    Müşteri Referans Kaynağı: <span className="text-xs">(Referral Source)</span>
                  </span>
                  <div className="font-medium">{reservation.referansKaynagi || "-"}</div>
                </div>
              </div>
            </div>

            {reservation.adres && (
              <div className="mt-4">
                <span className="text-sm text-gray-600">
                  Adres: <span className="text-xs">(Address)</span>
                </span>
                <div className="font-medium">{reservation.adres}</div>
              </div>
            )}

            {/* Katılımcılar */}
            {reservation.katilimcilar && reservation.katilimcilar.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-gray-800 mb-3">
                  Ek Katılımcılar <span className="text-sm text-gray-500 font-normal">({reservation.katilimcilar.length} kişi)</span>
                </h3>
                <div className="space-y-3">
                  {reservation.katilimcilar.map((katilimci: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-3 rounded border">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <span className="text-sm text-gray-600">Ad Soyad:</span>
                          <div className="font-medium">{katilimci.ad} {katilimci.soyad}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">TC/Pasaport:</span>
                          <div className="font-medium">{katilimci.tcKimlik || "-"}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Ülke:</span>
                          <div className="font-medium">{katilimci.ulke || "-"}</div>
                        </div>
                      </div>
                      {katilimci.telefon && (
                        <div className="mt-2">
                          <span className="text-sm text-gray-600">Telefon:</span>
                          <div className="font-medium">{katilimci.telefon}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Alış Yeri Bilgileri */}
          {reservation.alisYeri && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-green-600 mb-4 border-b border-green-200 pb-2">
                Alış Yeri Bilgileri <span className="text-sm text-gray-500 font-normal">(Pickup Information)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Alış Yeri Türü:</span>
                    <div className="font-medium">{reservation.alisYeri}</div>
                  </div>

                  {reservation.alisDetaylari && Object.entries(reservation.alisDetaylari).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-sm text-gray-600">{key}:</span>
                      <div className="font-medium">{value as string}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {reservation.firma && (
                    <>
                      <div>
                        <span className="text-sm text-gray-600">Firma:</span>
                        <div className="font-medium">{reservation.firma}</div>
                      </div>

                      {reservation.yetkiliKisi && (
                        <div>
                          <span className="text-sm text-gray-600">Yetkili Kişi:</span>
                          <div className="font-medium">{reservation.yetkiliKisi}</div>
                        </div>
                      )}

                      {reservation.yetkiliTelefon && (
                        <div>
                          <span className="text-sm text-gray-600">Yetkili Telefon:</span>
                          <div className="font-medium">{reservation.yetkiliTelefon}</div>
                        </div>
                      )}

                      {reservation.yetkiliEmail && (
                        <div>
                          <span className="text-sm text-gray-600">Yetkili E-posta:</span>
                          <div className="font-medium">{reservation.yetkiliEmail}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Ödeme Bilgileri */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-green-600 mb-4 border-b border-green-200 pb-2">
              Ödeme Bilgileri <span className="text-sm text-gray-500 font-normal">(Payment Information)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">
                    Tur Fiyatı: <span className="text-xs">(Tour Price)</span>
                  </span>
                  <div className="font-medium text-lg">
                    {reservation.tutar ? `${reservation.tutar} ${reservation.paraBirimi || 'EUR'}` : "-"}
                  </div>
                </div>

                <div>
                  <span className="text-sm text-gray-600">
                    Ödeme Durumu: <span className="text-xs">(Payment Status)</span>
                  </span>
                  <div className="font-medium">
                    {reservation.odemeDurumu === "Ödendi" && "Tamamlandı (Completed)"}
                    {reservation.odemeDurumu === "Bekliyor" && "Bekliyor (Pending)"}
                    {reservation.odemeDurumu === "Kısmi Ödendi" && "Kısmi Ödendi (Partial)"}
                    {reservation.odemeDurumu === "Tamamlandı" && "Tamamlandı (Completed)"}
                    {reservation.odemeDurumu === "İptal" && "İptal (Cancelled)"}
                    {!reservation.odemeDurumu && "-"}
                  </div>
                </div>

                <div>
                  <span className="text-sm text-gray-600">
                    Ödeme Yapan: <span className="text-xs">(Payer)</span>
                  </span>
                  <div className="font-medium">{reservation.odemeYapan || "-"}</div>
                </div>
              </div>

              <div className="space-y-3">
                {(reservation.odemeDurumu === "Ödendi" || reservation.odemeDurumu === "Kısmi Ödendi" || reservation.odemeDurumu === "Tamamlandı") && (
                  <>
                    <div>
                      <span className="text-sm text-gray-600">
                        Ödeme Yöntemi: <span className="text-xs">(Payment Method)</span>
                      </span>
                      <div className="font-medium">{reservation.odemeYontemi || "-"}</div>
                    </div>

                    {reservation.odemeTarihi && (
                      <div>
                        <span className="text-sm text-gray-600">
                          Ödeme Tarihi: <span className="text-xs">(Payment Date)</span>
                        </span>
                        <div className="font-medium">{reservation.odemeTarihi}</div>
                      </div>
                    )}
                  </>
                )}

                {reservation.odemeNotlari && (
                  <div>
                    <span className="text-sm text-gray-600">
                      Ödeme Notları: <span className="text-xs">(Payment Notes)</span>
                    </span>
                    <div className="font-medium bg-blue-50 p-2 rounded text-sm">{reservation.odemeNotlari}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ek Bilgiler */}
          {(reservation.notlar || reservation.ozelIstekler) && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-green-600 mb-4 border-b border-green-200 pb-2">
                Ek Bilgiler <span className="text-sm text-gray-500 font-normal">(Additional Information)</span>
              </h2>

              <div className="space-y-4">
                {reservation.notlar && (
                  <div>
                    <span className="text-sm text-gray-600">
                      Notlar: <span className="text-xs">(Notes)</span>
                    </span>
                    <div className="font-medium bg-gray-50 p-3 rounded text-sm whitespace-pre-line">
                      {reservation.notlar}
                    </div>
                  </div>
                )}

                {reservation.alisYeri && (
                  <div>
                    <span className="text-sm text-gray-600">
                      Özel İstekler: <span className="text-xs">(Special Requests)</span>
                    </span>
                    <div className="font-medium bg-yellow-50 p-3 rounded text-sm whitespace-pre-line">
                      {(() => {
                        switch (reservation.alisYeri) {
                          case 'Acenta':
                            return reservation.alisDetaylari?.Adres || '-';
                          case 'Otel':
                            return reservation.alisDetaylari?.['Özel Talimatlar'] || '-';
                          case 'Özel Adres':
                          case 'Buluşma Noktası':
                            return [
                              reservation.alisDetaylari?.Adres && `Adres: ${reservation.alisDetaylari?.Adres}`,
                              reservation.alisDetaylari?.['İletişim'] && `İletişim: ${reservation.alisDetaylari?.['İletişim']}`,
                              reservation.alisDetaylari?.['Özel Talimatlar'] && `Talimatlar: ${reservation.alisDetaylari?.['Özel Talimatlar']}`
                            ].filter(Boolean).join('\n') || '-';
                          default:
                            return '-';
                        }
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>        {/* Print Stilleri */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-content, .print-content * {
              visibility: visible !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            .print-content {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 1cm !important;
              background-color: white !important;
            }
            @page {
              margin: 1cm;
              size: A4;
            }
            .print-content img {
              display: block !important;
            }
            .print-content .mb-8 {
              margin-bottom: 1rem !important;
            }
            .print-content .mb-4 {
              margin-bottom: 0.5rem !important;
            }
            .print-content .space-y-3 > * + * {
              margin-top: 0.3rem !important;
            }
            /* Fontları küçült */
            .print-content h1 {
              font-size: 1.5rem !important;
            }
            .print-content h2 {
              font-size: 1.2rem !important;
            }
            .print-content h3 {
              font-size: 1rem !important;
            }
            .print-content .text-sm {
              font-size: 0.75rem !important;
            }
            .print-content .text-xs {
              font-size: 0.7rem !important;
            }
            /* Renk düzeltmeleri */
            * {
              color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>
      </div>
    </div>
  )
}
