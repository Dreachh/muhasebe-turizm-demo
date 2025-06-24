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

  // Destinasyon sıralamasını en yakın tarih en üstte olacak şekilde düzenle
  const sortedReservations = (reservations: any[]) => {
    return reservations.sort((a, b) => {
      const dateA = new Date(a.turTarihi).getTime();
      const dateB = new Date(b.turTarihi).getTime();
      return dateA - dateB;
    });
  };

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
      <div className="mb-2 border-b-2 border-gray-300 pb-1">
        <div className="flex flex-row items-center justify-between" style={{ minHeight: 40 }}>
          {/* Sol: Firma İsmi ve Alt Başlık */}
          <div style={{ width: 180, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span className="text-2xl font-extrabold tracking-tight text-gray-900">Nehir Travel</span>
            <span className="text-xs font-medium text-gray-700">Turizm ve Seyahat Acentası</span>
          </div>
          {/* Orta: Başlık ve Rezervasyon Sayısı */}
          <div className="flex-1 flex flex-col items-center">
            <h1 className="text-xl font-bold text-gray-900 leading-tight text-center">REZERVASYON LİSTESİ</h1>
            {printData && printData.reservations && (
              <span className="text-sm text-gray-700">Toplam {printData.reservations.length} rezervasyon</span>
            )}
          </div>
          {/* Sağ: Tarih ve Saat */}
          <div style={{ minWidth: 120, textAlign: 'right' }}>
            <div className="text-xs text-gray-600">
              <div className="font-medium">{format(new Date(), "dd MMMM yyyy", { locale: tr })}</div>
              <div>{format(new Date(), "HH:mm", { locale: tr })}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Rezervasyon Grupları */}
      <div className="space-y-6">
        {Object.entries(groupedReservations).map(([destination, reservations]) => (
          <Card key={destination} className="shadow-none border border-gray-400">
            <CardHeader className="bg-gray-50 border-b border-gray-400" style={{ padding: '0.25rem' }}>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-gray-700" />
                {destination}
                <Badge variant="secondary" className="ml-auto bg-gray-200 text-gray-800">
                  {reservations.length} Rezervasyon
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Görseldeki gibi tabloyu düzenleme */}
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100" style={{ height: '24px' }}>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs" style={{ width: '80px' }}>TARİH</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs" style={{ width: '80px' }}>ÖDEME</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs" style={{ width: '120px' }}>TUR ŞABLONU</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs" style={{ width: '120px' }}>MÜŞTERİ</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs" style={{ width: '100px' }}>İLETİŞİM</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs" style={{ width: '80px' }}>KİŞİ SAYISI</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs" style={{ width: '100px' }}>ALIŞ YERİ</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-xs" style={{ width: '100px' }}>ALIŞ</TableHead>
                    <TableHead className="text-center font-bold text-xs" style={{ width: '150px' }}>NOTLAR VE ÖZEL İSTEKLER</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedReservations(reservations).map((reservation) => (
                    <TableRow key={reservation.id} className="border-b border-gray-400">
                      <TableCell className="border-r border-gray-400 text-center text-xs py-1">
                        <div className="font-medium">{reservation.turTarihi ? format(new Date(reservation.turTarihi), "dd MMM yyyy", { locale: tr }) : '-'}</div>
                      </TableCell>
                      <TableCell className="border-r border-gray-400 text-center text-xs py-1">
                        {reservation.odemeDurumu === "Bekliyor" ? (
                          <div className="font-medium">{reservation.odemeYapan} / {formatCurrency(reservation.tutar, reservation.paraBirimi)}</div>
                        ) : getStatusBadge(reservation.odemeDurumu)}
                      </TableCell>
                      <TableCell className="border-r border-gray-400 text-center text-xs py-1">
                        <div className="font-medium">{getTourTemplateName(reservation.turSablonu || "-")}</div>
                      </TableCell>
                      <TableCell className="border-r border-gray-400 text-center text-xs py-1">
                        <div className="font-medium">{reservation.musteriAdiSoyadi}</div>
                      </TableCell>
                      <TableCell className="border-r border-gray-400 text-center text-xs py-1">
                        <div className="font-medium">{reservation.telefon}</div>
                      </TableCell>
                      <TableCell className="border-r border-gray-400 text-center text-xs py-1">
                        <div className="font-medium">{reservation.yetiskinSayisi}{reservation.cocukSayisi > 0 ? `+${reservation.cocukSayisi}Ç` : ""}</div>
                      </TableCell>
                      <TableCell className="border-r border-gray-400 text-center text-xs py-1">
                        <div className="font-medium">{reservation.alisDetaylari?.["Otel Adı"] || '-'}</div>
                      </TableCell>
                      <TableCell className="border-r border-gray-400 text-center text-xs py-1">
                        <div className="font-medium">
                          {reservation.alisDetaylari?.["Alış Saati"] || "Saat Bilgisi Yok"} {reservation.alisDetaylari?.["Oda Numarası"] ? `Oda:${reservation.alisDetaylari?.["Oda Numarası"]}` : "Oda Bilgisi Yok"}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs py-1">
                        <div className="font-medium">Notlar: {reservation.notlar || "-"} | Özel İstekler: {reservation.ozelIstekler || "-"}</div>
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
          }
          img {
            display: none !important;
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
