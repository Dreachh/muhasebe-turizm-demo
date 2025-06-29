"use client"

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MapPin, Users, Clock } from "lucide-react"

interface Destination { id: string; name: string; }
interface TourTemplate { id: string; name: string; }
interface ReservationPrintData {
  reservations: any[]
  filters: {
    dateRange?: any
    filter: string
    selectedAgency: string
    selectedPaymentStatus: string
  }
  destinations?: Destination[]
  tourTemplates?: TourTemplate[]
}

export default function PrintReservationsPage() {
  const searchParams = useSearchParams()
  const [printData, setPrintData] = useState<ReservationPrintData | null>(null)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [tourTemplates, setTourTemplates] = useState<TourTemplate[]>([])

  useEffect(() => {
    const data = searchParams?.get('data')
    if (data) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(data))
        setPrintData(decodedData)
        if (decodedData.destinations) setDestinations(decodedData.destinations)
        else {
          const stored = localStorage.getItem('destinations')
          if (stored) setDestinations(JSON.parse(stored))
        }
        if (decodedData.tourTemplates) setTourTemplates(decodedData.tourTemplates)
        else {
          const stored = localStorage.getItem('tour_templates')
          if (stored) setTourTemplates(JSON.parse(stored))
        }
      } catch (error) {
        console.error('Veri parse edilemedi:', error)
      }
    }
  }, [searchParams])

  // Helperlar
  const getDestinationName = (id: string) => {
    if (!id) return '-';
    const found = destinations.find(d => d.id === id)
    if (found) {
      return found.name || id;
    }
    // ID çok uzunsa kısalt
    return id.length > 20 ? id.substring(0, 20) + '...' : id;
  }
  const getTourTemplateName = (id: string) => {
    if (!id) return '-';
    const found = tourTemplates.find(t => t.id === id)
    return found ? found.name : id
  }

  const formatCurrency = (amount: number, currency = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0)
  }

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string, variant: "default" | "secondary" | "destructive" } } = {
      "Tamamlandı": { label: "Tamamlandı", variant: "default" },
      "Bekliyor": { label: "Bekliyor", variant: "secondary" },
      "Kısmi Ödendi": { label: "Kısmi Ödendi", variant: "secondary" },
      "İptal": { label: "İptal", variant: "destructive" }
    }
    const statusInfo = statusMap[status] || { label: status, variant: "default" as const }
    return (
      <Badge variant={statusInfo.variant} className="text-xs">
        {statusInfo.label}
      </Badge>
    )
  }

  // Alış yeri detaylarından özel istekler çıkarımı
  const getOzelIsteklerFromAlisYeri = (reservation: any) => {
    if (!reservation.alisYeri) return '';
    switch (reservation.alisYeri) {
      case 'Acenta':
        return reservation.alisDetaylari?.Adres || '';
      case 'Otel':
        return reservation.alisDetaylari?.['Özel Talimatlar'] || '';
      case 'Özel Adres':
      case 'Buluşma Noktası':
        return [
          reservation.alisDetaylari?.Adres && `Adres: ${reservation.alisDetaylari?.Adres}`,
          reservation.alisDetaylari?.['İletişim'] && `İletişim: ${reservation.alisDetaylari?.['İletişim']}`,
          reservation.alisDetaylari?.['Özel Talimatlar'] && `Talimatlar: ${reservation.alisDetaylari?.['Özel Talimatlar']}`
        ].filter(Boolean).join(' | ') || '';
      default:
        return '';
    }
  };

  if (!printData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Veriler yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Destinasyon gruplama (isimle)
  const groupedReservations = printData.reservations.reduce((groups: { [key: string]: any[] }, reservation) => {
    let destinationId = reservation.destinasyon || reservation.selectedTourDestination || reservation.turSablonu || reservation.varişYeri || reservation.selectedTour?.destination || "Bilinmeyen Destinasyon"
    let destination = getDestinationName(destinationId)
    if (!groups[destination]) groups[destination] = []
    groups[destination].push(reservation)
    return groups
  }, {})

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Sadece ekranda görünen Yazdır butonu */}
      <div className="mb-4 print:hidden flex justify-end">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow text-lg"
        >
          Yazdır
        </button>
      </div>

      {/* Print Header */}
      <div className="mb-6 border-b-2 border-gray-300 pb-4">
        <div className="flex flex-row items-center justify-between">
          {/* Sol: Nehir Travel */}
          <div className="flex flex-col items-start">
            <span className="text-2xl font-extrabold tracking-tight text-gray-900 leading-tight">Nehir Travel</span>
            <span className="text-sm font-medium text-gray-700 -mt-1">Turizm ve Seyahat Acentası</span>
          </div>
          {/* Orta: Başlık ve toplam */}
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-gray-900">REZERVASYON LİSTESİ</span>
            <span className="text-sm text-gray-700 mt-1">Toplam {printData.reservations.length} rezervasyon</span>
          </div>
          {/* Sağ: Tarih ve saat */}
          <div className="flex flex-col items-end text-sm text-gray-600">
            <span className="font-medium">{format(new Date(), "dd MMMM yyyy", { locale: tr })}</span>
            <span>{format(new Date(), "HH:mm", { locale: tr })}</span>
          </div>
        </div>
        {/* Filtre özetleri */}
        <div className="text-center mt-2">
          <div className="text-xs text-gray-600 space-y-1">
            {printData.filters.dateRange?.from && (
              <p>
                Tarih Aralığı: {format(printData.filters.dateRange.from, "dd MMM yyyy", { locale: tr })}
                {printData.filters.dateRange.to && ` - ${format(printData.filters.dateRange.to, "dd MMM yyyy", { locale: tr })}`}
              </p>
            )}
            {printData.filters.filter !== "Tümü" && <p>Destinasyon: {printData.filters.filter}</p>}
            {printData.filters.selectedAgency !== "Tümü" && <p>Acenta: {printData.filters.selectedAgency}</p>}
            {printData.filters.selectedPaymentStatus !== "Tümü" && <p>Ödeme Durumu: {printData.filters.selectedPaymentStatus}</p>}
          </div>
        </div>
      </div>

      {/* Rezervasyon Grupları */}
      <div className="space-y-6">
        {Object.entries(groupedReservations).map(([destination, reservations]) => (
          <div key={destination} className="border border-gray-400 rounded print:break-inside-avoid">
            <div className="bg-gray-50 border-b border-gray-400 px-2 py-1 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-700" />
              <span className="text-sm font-semibold">{destination}</span>
              <span className="ml-auto text-xs bg-gray-200 text-gray-800 rounded px-2 py-0.5">{reservations.length} Rezervasyon</span>
            </div>
            <div className="overflow-x-auto">              <table className="min-w-full border-collapse print:w-full" style={{fontSize: '11px'}}>
                <colgroup>
                  <col style={{width: '55px'}} />
                  <col style={{width: '150px'}} />
                  <col style={{width: '95px'}} />
                  <col style={{width: '190px'}} />
                  <col style={{width: '130px'}} />
                  <col style={{width: '120px'}} />
                  <col style={{width: '55px'}} />
                  <col style={{width: '160px'}} />
                  <col style={{width: '80px'}} />
                </colgroup>
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-black h-2">
                    <th className="border-r border-gray-200 text-center text-xs font-bold py-0 px-0.5 print:py-0 print:px-0 print:border-r-gray-400">TARİH</th>
                    <th className="border-r border-gray-200 text-center text-xs font-bold py-0 px-0.5 print:py-0 print:px-0 print:border-r-gray-400">FİRMA</th>
                    <th className="border-r border-gray-200 text-center text-xs font-bold py-0 px-0.5 print:py-0 print:px-0 print:border-r-gray-400">ÖDEME</th>
                    <th className="border-r border-gray-200 text-center text-xs font-bold py-0 px-0.5 print:py-0 print:px-0 print:border-r-gray-400">TUR ŞABLONU</th>
                    <th className="border-r border-gray-200 text-center text-xs font-bold py-0 px-0.5 print:py-0 print:px-0 print:border-r-gray-400">MÜŞTERİ</th>
                    <th className="border-r border-gray-200 text-center text-xs font-bold py-0 px-0.5 print:py-0 print:px-0 print:border-r-gray-400">İLETİŞİM</th>
                    <th className="border-r border-gray-200 text-center text-xs font-bold py-0 px-0.5 print:py-0 print:px-0 print:border-r-gray-400">K.SAYISI</th>
                    <th className="border-r border-gray-200 text-center text-xs font-bold py-0 px-0.5 print:py-0 print:px-0 print:border-r-gray-400">ALIŞ YERİ</th>
                    <th className="border-r border-gray-200 text-center text-xs font-bold py-0 px-0.5 print:py-0 print:px-0 print:border-r-gray-400">ALIŞ</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.sort((a, b) => {
                    const dateA = new Date(a.turTarihi).getTime();
                    const dateB = new Date(b.turTarihi).getTime();
                    if (dateA !== dateB) return dateA - dateB;
                    return (a.alisSaati || "00:00").localeCompare(b.alisSaati || "00:00");
                  }).map((reservation) => {
                    const ozelIsteklerData = reservation.ozelIstekler || getOzelIsteklerFromAlisYeri(reservation);
                    return [
                      <tr key={reservation.id} className="border-b border-gray-300 print:break-inside-avoid">
                        <td className="font-bold border-r border-gray-200 text-center align-top py-0 px-0.5 print:py-0 print:px-0 print:border-r-gray-400 h-5 text-xs leading-none">{format(new Date(reservation.turTarihi), "dd MMM", { locale: tr })}</td>
                        <td className="font-medium border-r border-gray-200 text-center align-top py-0 px-0.5 h-5 text-xs leading-none">{reservation.firma}</td>
                        <td className="border-r border-gray-200 align-top py-0 px-0.5 h-5 text-xs leading-none">
                          {reservation.odemeDurumu === "Ödendi" ? (
                            <span className="font-medium text-green-700">Ödendi</span>
                          ) : (
                            <span className="text-gray-600">{reservation.odemeYapan || 'Ödeme Yapan'} / {formatCurrency(reservation.tutar, reservation.paraBirimi)}</span>
                          )}
                        </td>
                        <td className="border-r border-gray-200 text-center align-top py-0 px-0.5 h-5 text-xs leading-none">{getTourTemplateName(reservation.turSablonu)}</td>
                        <td className="font-medium border-r border-gray-200 text-center align-top py-0 px-0.5 h-5 text-xs leading-none">{reservation.musteriAdiSoyadi}{reservation.katilimcilar && reservation.katilimcilar.length > 0 && (<span className="text-xs text-gray-500 ml-1">(+{reservation.katilimcilar.length})</span>)}</td>
                        <td className="border-r border-gray-200 text-center align-top py-0 px-0.5 h-5 text-xs leading-none">{reservation.telefon}</td>
                        <td className="border-r border-gray-200 text-center align-top py-0 px-0.5 h-5 text-xs leading-none">
                          <div className="flex items-center justify-center gap-1 text-xs">
                            <Users className="h-3 w-3 flex-shrink-0" />
                            <span className="text-xs font-medium">{parseInt(reservation.yetiskinSayisi?.toString() || "0")}{parseInt(reservation.cocukSayisi?.toString() || "0") > 0 && `+${parseInt(reservation.cocukSayisi?.toString() || "0")}Ç`}</span>
                          </div>
                        </td>
                        <td className="border-r border-gray-200 text-center align-top py-0 px-0.5 h-5 text-xs leading-none">{reservation.alisYeri}</td>
                        <td className="border-r border-gray-200 text-center align-top py-0 px-0.5 print:px-0 h-5 text-xs leading-none">{reservation.alisSaati || '-'}</td>
                      </tr>,
                      (reservation.notlar || ozelIsteklerData) && (
                        <tr key={`notes-${reservation.id}`} className="bg-gray-50 border-b border-black">
                          <td colSpan={9} className="p-0 h-0 leading-none">
                            <div className="flex items-center h-0 min-h-0 py-0 m-0">
                              <div className="w-1/2 border-r border-gray-300 flex items-center px-0.5 h-0 min-h-0">
                                {reservation.notlar ? (
                                  <div className="flex items-center gap-0.5 h-0 min-h-0">
                                    <div className="w-0.5 h-0.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                                    <span className="text-xs font-medium text-blue-800 leading-none">Notlar:</span>
                                    <span className="text-xs text-blue-700 truncate leading-none">{reservation.notlar}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 leading-none">Notlar: -</span>
                                )}
                              </div>
                              <div className="w-1/2 flex items-center px-0.5 h-0 min-h-0">
                                {ozelIsteklerData ? (
                                  <div className="flex items-center gap-0.5 h-0 min-h-0">
                                    <div className="w-0.5 h-0.5 bg-red-500 rounded-full flex-shrink-0"></div>
                                    <span className="text-xs font-medium text-red-800 leading-none">Özel İstekler:</span>
                                    <span className="text-xs text-red-700 truncate leading-none">{ozelIsteklerData}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 leading-none">Özel İstekler: -</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    ];
                  }).flat()}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Print Footer */}
      <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Nehir Travel. Tüm hakları saklıdır.
      </div>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1cm;
            size: A4 landscape;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: none !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          table {
            font-size: 9px !important;
            width: 100% !important;
          }
          th, td {
            padding: 2px !important;
            border: 1px solid #333 !important;
          }
          th {
            background-color: #f0f0f0 !important;
            font-weight: bold !important;
          }
          .space-y-6 > * + * {
            margin-top: 1rem !important;
          }
        }
      `}</style>
    </div>
  )
}
