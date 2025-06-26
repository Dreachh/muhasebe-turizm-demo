"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer, X } from "lucide-react"
import { format } from "date-fns"
import { getDestinations } from "@/lib/db-firebase"

interface RezervasyonDetayProps {
  reservation: any
  onClose: () => void
}

export function RezervasyonDetay({ reservation, onClose }: RezervasyonDetayProps) {
  const [destinations, setDestinations] = useState<any[]>([])
  
  useEffect(() => {
    // Destinasyonları yükle
    const loadDestinations = async () => {
      try {
        const dests = await getDestinations()
        setDestinations(dests)
      } catch (error) {
        console.error('Destinasyonlar yüklenemedi:', error)
      }
    }
    loadDestinations()
  }, [])

  const handlePrint = () => {
    window.print()
  }

  // Destinasyon adını al
  const getDestinationName = (destId: string) => {
    if (!destId) return "-"
    const dest = destinations.find(d => d.id === destId)
    return dest ? dest.name : destId
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
          <div className="text-center mb-8 border-b-2 border-blue-600 pb-6">
            <div className="flex flex-col items-center justify-center mb-4">
              <img src="/logo.svg" alt="Logo" className="h-16 w-auto mb-2" />
              <p className="text-sm text-gray-600">Yönetim Sistemi Kontrol Paneli</p>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tarih: {format(new Date(), "dd.MM.yyyy")}</span>
              <span>Belge No: {reservation.seriNumarasi}</span>
            </div>
          </div>

          {/* Rezervasyon Bilgileri */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-green-600 mb-4 border-b border-green-200 pb-2">
              Rezervasyon Bilgileri <span className="text-sm text-gray-500 font-normal">(Reservation Information)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">
                    Seri No: <span className="text-xs">(Ref No)</span>
                  </span>
                  <div className="font-medium">{reservation.seriNumarasi || "-"}</div>
                </div>

                <div>
                  <span className="text-sm text-gray-600">
                    Tur Tarihi: <span className="text-xs">(Tour Date)</span>
                  </span>
                  <div className="font-medium">
                    {reservation.turTarihi ? format(new Date(reservation.turTarihi), "dd.MM.yyyy") : "-"}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">
                    Destinasyon: <span className="text-xs">(Destination)</span>
                  </span>
                  <div className="font-medium">{getDestinationName(reservation.destinasyon) || "-"}</div>
                </div>

                <div>
                  <span className="text-sm text-gray-600">
                    Katılımcı Sayısı: <span className="text-xs">(Number of Participants)</span>
                  </span>
                  <div className="font-medium">
                    {(Number(reservation.yetiskinSayisi || 0) + Number(reservation.cocukSayisi || 0))} kişi
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">
                    Yetişkin: <span className="text-xs">(Adult)</span>
                  </span>
                  <div className="font-medium">{reservation.yetiskinSayisi || 0}</div>
                </div>

                <div>
                  <span className="text-sm text-gray-600">
                    Çocuk: <span className="text-xs">(Child)</span>
                  </span>
                  <div className="font-medium">{reservation.cocukSayisi || 0}</div>
                </div>
              </div>
            </div>

            {/* Kaydı Oluşturan */}
            {reservation.kaydOlusturan && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div>
                  <span className="text-sm text-gray-600">
                    Kaydı Oluşturan: <span className="text-xs">(Created By)</span>
                  </span>
                  <div className="font-medium">{reservation.kaydOlusturan}</div>
                </div>
              </div>
            )}
          </div>

          {/* Alış Yeri & Müşteri Bilgileri */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-green-600 mb-4 border-b border-green-200 pb-2">
              Alış Yeri & Müşteri Bilgileri <span className="text-sm text-gray-500 font-normal">(Pickup & Customer Information)</span>
            </h2>

            {/* Üst satır: Ad Soyad, Telefon, Alış Yeri */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div>
                <span className="text-sm text-gray-600">
                  Ad Soyad: <span className="text-xs">(Full Name)</span>
                </span>
                <div className="font-medium">{reservation.musteriAdiSoyadi || "-"}</div>
              </div>

              <div>
                <span className="text-sm text-gray-600">
                  Telefon: <span className="text-xs">(Phone)</span>
                </span>
                <div className="font-medium">
                  {reservation.telefon ? (
                    <a 
                      href={`https://wa.me/${reservation.telefon.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-800 hover:underline cursor-pointer inline-flex items-center gap-1"
                      title="WhatsApp ile iletişim kur"
                    >
                      {reservation.telefon}
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.515z"/>
                      </svg>
                    </a>
                  ) : "-"}
                </div>
              </div>

              {reservation.alisYeri && (
                <div>
                  <span className="text-sm text-gray-600">
                    Alış Yeri: <span className="text-xs">(Pickup Location)</span>
                  </span>
                  <div className="font-medium">{reservation.alisYeri}</div>
                </div>
              )}
            </div>

            {/* Alt satır: Aracı firma ve yetkili bilgileri */}
            {(reservation.firma || reservation.yetkiliKisi || reservation.yetkiliTelefon || reservation.yetkiliEmail) && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {reservation.firma && (
                  <div>
                    <span className="text-sm text-gray-600">
                      Aracı Firma: <span className="text-xs">(Agency)</span>
                    </span>
                    <div className="font-medium">{reservation.firma}</div>
                  </div>
                )}

                {reservation.yetkiliKisi && (
                  <div>
                    <span className="text-sm text-gray-600">
                      Yetkili Kişi: <span className="text-xs">(Contact Person)</span>
                    </span>
                    <div className="font-medium">{reservation.yetkiliKisi}</div>
                  </div>
                )}

                {reservation.yetkiliTelefon && (
                  <div>
                    <span className="text-sm text-gray-600">
                      Yetkili Tel: <span className="text-xs">(Contact Phone)</span>
                    </span>
                    <div className="font-medium">
                      <a 
                        href={`https://wa.me/${reservation.yetkiliTelefon.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-800 hover:underline cursor-pointer inline-flex items-center gap-1"
                        title="WhatsApp ile iletişim kur"
                      >
                        {reservation.yetkiliTelefon}
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.515z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                )}

                {reservation.yetkiliEmail && (
                  <div>
                    <span className="text-sm text-gray-600">
                      Yetkili E-posta: <span className="text-xs">(Contact Email)</span>
                    </span>
                    <div className="font-medium">{reservation.yetkiliEmail}</div>
                  </div>
                )}
              </div>
            )}

            {/* Alış Detayları - Tek satırda */}
            {reservation.alisDetaylari && Object.keys(reservation.alisDetaylari).length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="font-bold text-gray-800 mb-3">
                  Alış Yeri Detayları <span className="text-sm text-gray-500 font-normal">(Pickup Details)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {Object.entries(reservation.alisDetaylari).map(([key, value]) => 
                    value ? (
                      <div key={key}>
                        <span className="text-sm text-gray-600">{key}:</span>
                        <div className="font-medium">{String(value)}</div>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* Katılımcı Bilgileri - Sadece varsa göster */}
            {reservation.katilimcilar && reservation.katilimcilar.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="font-bold text-gray-800 mb-3">
                  Katılımcı Bilgileri <span className="text-sm text-gray-500 font-normal">({reservation.katilimcilar.length} kişi)</span>
                </h3>
                <div className="space-y-3">
                  {reservation.katilimcilar.map((katilimci: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-3 rounded border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <span className="text-sm text-gray-600">Katılımcı {index + 1}:</span>
                          <div className="font-medium">{katilimci.ad} {katilimci.soyad}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ödeme Bilgileri */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-green-600 mb-4 border-b border-green-200 pb-2">
              Ödeme Bilgileri <span className="text-sm text-gray-500 font-normal">(Payment Information)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">
                    Ödeme Yapan: <span className="text-xs">(Payer)</span>
                  </span>
                  <div className="font-medium">{reservation.odemeYapan || "-"}</div>
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
              </div>

              <div className="space-y-3">
                {(reservation.odemeDurumu === "Ödendi" || reservation.odemeDurumu === "Kısmi Ödendi" || reservation.odemeDurumu === "Tamamlandı") && (
                  <div>
                    <span className="text-sm text-gray-600">
                      Ödeme Yöntemi: <span className="text-xs">(Payment Method)</span>
                    </span>
                    <div className="font-medium">{reservation.odemeYontemi || "-"}</div>
                  </div>
                )}

                <div>
                  <span className="text-sm text-gray-600">
                    Toplam Tutar: <span className="text-xs">(Total Amount)</span>
                  </span>
                  <div className="font-medium text-lg">
                    {reservation.tutar ? `${reservation.tutar} ${reservation.paraBirimi || 'EUR'}` : "-"}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {(reservation.odemeDurumu === "Ödendi" || reservation.odemeDurumu === "Kısmi Ödendi" || reservation.odemeDurumu === "Tamamlandı") && reservation.odemeTarihi && (
                  <div>
                    <span className="text-sm text-gray-600">
                      Ödeme Tarihi: <span className="text-xs">(Payment Date)</span>
                    </span>
                    <div className="font-medium">{reservation.odemeTarihi}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Ödeme Notları */}
            {reservation.odemeNotlari && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div>
                  <span className="text-sm text-gray-600">
                    Ödeme Notları: <span className="text-xs">(Payment Notes)</span>
                  </span>
                  <div className="font-medium bg-blue-50 p-3 rounded text-sm mt-2">{reservation.odemeNotlari}</div>
                </div>
              </div>
            )}
          </div>

          {/* Ek Bilgiler */}
          {reservation.notlar && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-green-600 mb-4 border-b border-green-200 pb-2">
                Ek Bilgiler <span className="text-sm text-gray-500 font-normal">(Additional Information)</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-600">
                    Notlar: <span className="text-xs">(Notes)</span>
                  </span>
                  <div className="font-medium bg-gray-50 p-3 rounded text-sm whitespace-pre-line mt-2">
                    {reservation.notlar}
                  </div>
                </div>
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
