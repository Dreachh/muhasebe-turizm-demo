"use client"

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
  const [printData, setPrintData] = useState<ReservationPrintData | null>(null)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [tourTemplates, setTourTemplates] = useState<TourTemplate[]>([])

  useEffect(() => {
    const storedData = localStorage.getItem('printData');
    if (storedData) {
      try {
        const decodedData = JSON.parse(storedData);
        setPrintData(decodedData);
        if (decodedData.destinations) setDestinations(decodedData.destinations);
        if (decodedData.tourTemplates) setTourTemplates(decodedData.tourTemplates);
        // İsteğe bağlı: Veri alındıktan sonra localStorage'ı temizle
        // localStorage.removeItem('printData');
      } catch (error) {
        console.error('Veri localStorage\'dan parse edilemedi:', error);
      }
    }
  }, [])

  // Helperlar
  const getDestinationName = (id: string) => {
    if (!id) return '-';
    const found = destinations.find(d => d.id === id)
    return found ? found.name : id
  }
  const getTourTemplateName = (id: string) => {
    if (!id) return '-';
    const found = tourTemplates.find(t => t.id === id)
    return found ? found.name : id
  }

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
        <div className="flex flex-row items-start justify-between mb-4">
          {/* Logo ve Şirket */}
          <div className="flex-1">
            <div className="flex flex-col">
              <img src="/logo.svg" alt="Nehir Travel" className="h-20 w-auto" />
              <span className="text-md font-bold text-gray-800 mt-2">Turizm ve Seyahat Acentası</span>
            </div>
          </div>
          
          {/* Tarih ve Saat */}
          <div className="flex-1 text-right">
            <div className="text-sm text-gray-600">
              <div className="font-medium">{format(new Date(), "dd MMMM yyyy", { locale: tr })}</div>
              <div>{format(new Date(), "HH:mm", { locale: tr })}</div>
            </div>
          </div>
        </div>
        
        {/* Başlık ve Özet */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">REZERVASYON LİSTESİ</h1>
          {printData && printData.reservations && (
            <p className="text-sm text-gray-500">
              Toplam {printData.reservations.length} rezervasyon
            </p>
          )}
          <div className="text-sm text-gray-600 space-y-1 mt-2">
            {printData?.filters.dateRange?.from && (
              <p>
                Tarih Aralığı: {format(new Date(printData.filters.dateRange.from), "dd MMM yyyy", { locale: tr })}
                {printData.filters.dateRange.to && ` - ${format(new Date(printData.filters.dateRange.to), "dd MMM yyyy", { locale: tr })}`}
              </p>
            )}
            {printData?.filters.filter !== "Tümü" && <p>Destinasyon: {printData.filters.filter}</p>}
            {printData?.filters.selectedAgency !== "Tümü" && <p>Acenta: {printData.filters.selectedAgency}</p>}
            {printData?.filters.selectedPaymentStatus !== "Tümü" && <p>Ödeme Durumu: {printData.filters.selectedPaymentStatus}</p>}
          </div>
        </div>
      </div>

      {/* Rezervasyon Grupları */}
      <div className="space-y-6">
        {Object.entries(groupedReservations).map(([destination, reservations]) => (
          <Card key={destination} className="shadow-none border border-gray-400">
            <CardHeader className="bg-gray-50 border-b border-gray-400">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-gray-700" />
                {destination}
                <Badge variant="secondary" className="ml-auto bg-gray-200 text-gray-800">
                  {reservations.length} Rezervasyon
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs py-2">SERİ</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs py-2">TARİH</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs py-2">FİRMA</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs py-2">ÖDEME</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs py-2">TUR ŞABLONU</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs py-2">MÜŞTERİ</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs py-2">İLETİŞİM</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs py-2">KİŞİ SAYISI</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs py-2">ALIŞ YERİ</TableHead>
                    <TableHead className="text-center font-bold text-xs py-2">ALIŞ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations
                    .sort((a, b) => {
                      const dateA = a.turTarihi ? new Date(a.turTarihi).getTime() : 0
                      const dateB = b.turTarihi ? new Date(b.turTarihi).getTime() : 0
                      if (dateA !== dateB) return dateA - dateB
                      return (a.alisSaati || "00:00").localeCompare(b.alisSaati || "00:00")
                    })
                    .map((reservation) => (                      <TableRow key={reservation.id} className="border-b border-gray-400">
                        <TableCell className="border-r border-gray-400 text-center text-xs py-2">
                          <div className="font-bold">{reservation.seriNumarasi?.replace('RZV-', '') || '0001'}</div>
                        </TableCell>
                        <TableCell className="border-r border-gray-400 text-center text-xs py-2">
                          {reservation.turTarihi ? (
                            <>
                              <div className="font-bold">{format(new Date(reservation.turTarihi), "dd", { locale: tr })}</div>
                              <div className="text-gray-500">{format(new Date(reservation.turTarihi), "MMM", { locale: tr })}</div>
                            </>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="border-r border-gray-400 text-center text-xs py-2">
                          <div className="font-medium">{reservation.firma}</div>
                          <div className="text-gray-500">{reservation.yetkiliKisi}</div>
                        </TableCell>
                        <TableCell className="border-r border-gray-400 text-center text-xs py-2">
                          <div className="text-center">
                            {getStatusBadge(reservation.odemeDurumu)}
                            <div className="text-gray-600 mt-1 text-xs">
                              {(reservation.odemeYapan || reservation.odemeYontemi) && (
                                <div>{reservation.odemeYapan || ''}{reservation.odemeYapan && reservation.odemeYontemi ? '/' : ''}{reservation.odemeYontemi || ''}</div>
                              )}
                              <div className="font-medium text-gray-800">
                                {formatCurrency(reservation.tutar, reservation.paraBirimi)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="border-r border-gray-400 text-center text-xs py-2">
                          <div className="font-medium">{getTourTemplateName(reservation.turSablonu || reservation.selectedTourName || reservation.tourName || "-")}</div>
                        </TableCell>
                        <TableCell className="border-r border-gray-400 text-center text-xs py-2">
                          <div className="font-medium">{reservation.musteriAdiSoyadi}</div>
                          {reservation.katilimcilar && reservation.katilimcilar.length > 0 && (
                            <div className="text-gray-500">+{reservation.katilimcilar.length} katılımcı</div>
                          )}
                        </TableCell>
                        <TableCell className="border-r border-gray-400 text-center text-xs py-2">
                          <div className="font-medium">{reservation.telefon}</div>
                        </TableCell>
                        <TableCell className="border-r border-gray-400 text-center text-xs py-2">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-3 w-3 flex-shrink-0" />
                            <span className="font-medium">
                              {parseInt(reservation.yetiskinSayisi?.toString() || "0")}
                              {parseInt(reservation.cocukSayisi?.toString() || "0") > 0 && 
                                `+${parseInt(reservation.cocukSayisi?.toString() || "0")}Ç`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="border-r border-gray-400 text-center text-xs py-2">
                          <div className="font-medium">{reservation.alisYeri || '-'}</div>
                        </TableCell>
                        <TableCell className="text-center text-xs py-2">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>{reservation.alisSaati || "-"}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
          }          img {
            height: 200px !important;
          }
          table {
            font-size: 8px !important;
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
