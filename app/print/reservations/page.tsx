"use client"

import { useEffect, useState } from 'react'
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MapPin, Users, Clock } from "lucide-react"
import { getDestinations, getReservationDestinations } from "@/lib/db-firebase"

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
  printMode?: 'driver' | 'admin' // Print modu eklendi
}

export default function PrintReservationsPage() {
  const [printData, setPrintData] = useState<ReservationPrintData | null>(null)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [tourTemplates, setTourTemplates] = useState<TourTemplate[]>([])
  
  // Print mode kontrolü
  const isAdminMode = printData?.printMode === 'admin'
  const isDriverMode = printData?.printMode === 'driver'
  
  useEffect(() => {
    const loadData = async () => {
      const storedData = localStorage.getItem('printData');
      if (storedData) {
        try {
          const decodedData = JSON.parse(storedData);
          setPrintData(decodedData);
          
          // Destinasyonları API'den yükle
          try {
            const dests = await getReservationDestinations()
            setDestinations(dests)
          } catch (error) {
            console.error('Destinasyonlar yüklenemedi:', error)
            // Fallback olarak printData'daki destinasyonları kullan
            if (decodedData.destinations) setDestinations(decodedData.destinations);
          }
          
          if (decodedData.tourTemplates) setTourTemplates(decodedData.tourTemplates);
        } catch (error) {
          console.error('Veri localStorage\'dan parse edilemedi:', error);
        }
      }
    }
    
    loadData()
  }, [])

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

  // Alış yeri bilgisini doğru formatla
  const getAlisYeriBilgisi = (reservation: any) => {
    if (!reservation.alisDetaylari) return reservation.alisYeri || '-';
    
    switch (reservation.alisYeri) {
      case 'Otel':
        return reservation.alisDetaylari["Otel Adı"] || '-';
      case 'Acenta':
        return reservation.alisDetaylari["Acenta Adı"] || '-';
      case 'Özel Adres':
      case 'Buluşma Noktası':
        return reservation.alisDetaylari["Adres"] || reservation.alisYeri || '-';
      default:
        return reservation.alisYeri || '-';
    }
  }

  // Özel istekler verilerini al
  const getOzelIsteklerFromAlisYeri = (reservation: any) => {
    if (!reservation.alisDetaylari) return '';
    
    switch (reservation.alisYeri) {
      case 'Acenta':
        return reservation.alisDetaylari?.Adres || '';
      case 'Otel':
        return reservation.alisDetaylari?.['Özel Talimatlar'] || '';
      case 'Özel Adres':
      case 'Buluşma Noktası':
        return [
          reservation.alisDetaylari?.Adres,
          reservation.alisDetaylari?.['İletişim'],
          reservation.alisDetaylari?.['Özel Talimatlar']
        ].filter(Boolean).join(' | ') || '';
      default:
        return '';
    }
  }

  // Helper function to format currency
  const formatCurrency = (amount: string | number, currency: string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return amount;
    
    const formatted = numAmount.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    
    if (currency === 'EUR') {
      return `${formatted} €`;
    } else if (currency === 'USD') {
      return `${formatted} $`;
    } else if (currency === 'TRY' || currency === 'TL') {
      return `${formatted} ₺`;
    }
    return `${formatted} ${currency}`;
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
      <div className="space-y-2">
        {Object.entries(groupedReservations).map(([destination, reservations]) => (
          <Card key={destination} className="shadow-none border border-gray-400">
            <CardHeader className="bg-gray-50 border-b border-gray-400" style={{ padding: '0.15rem' }}>
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="h-3 w-3 text-gray-700" />
                {destination}
                <div className="ml-auto flex gap-2">
                  <Badge variant="secondary" className="bg-gray-200 text-gray-800 text-xs">
                    {reservations.length} Rezervasyon
                  </Badge>
                  {isAdminMode && (() => {
                    // Toplam katılımcı sayılarını hesapla
                    const totalStats = reservations.reduce((acc, r: any) => {
                      acc.yetiskin += parseInt(r.yetiskinSayisi?.toString() || "0");
                      acc.cocuk += parseInt(r.cocukSayisi?.toString() || "0");
                      acc.bebek += parseInt(r.bebekSayisi?.toString() || "0");
                      return acc;
                    }, { yetiskin: 0, cocuk: 0, bebek: 0 });
                    
                    return (
                      <Badge variant="outline" className="bg-gray-100 text-gray-700 text-xs">
                        Toplam Katılımcı: {totalStats.yetiskin}Y {totalStats.cocuk}Ç {totalStats.bebek}B
                      </Badge>
                    );
                  })()}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Görseldeki gibi tabloyu düzenleme */}
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100 h-4">
                    <TableHead className="border-r border-gray-400 text-center font-bold text-[10px] px-0.5 py-0 h-4 leading-none" style={{ width: '60px' }}>TARİH</TableHead>
                    {isAdminMode && (
                      <TableHead className="border-r border-gray-400 text-center font-bold text-[10px] px-0.5 py-0 h-4 leading-none" style={{ width: '60px' }}>FİRMA</TableHead>
                    )}
                    {isAdminMode && (
                      <TableHead className="border-r border-gray-400 text-center font-bold text-[10px] px-0.5 py-0 h-4 leading-none" style={{ width: '65px' }}>TUTAR</TableHead>
                    )}
                    <TableHead className="border-r border-gray-400 text-center font-bold text-[10px] px-0.5 py-0 h-4 leading-none" style={{ width: '65px' }}>ÖDEME</TableHead>
                    {isAdminMode && (
                      <TableHead className="border-r border-gray-400 text-center font-bold text-[10px] px-0.5 py-0 h-4 leading-none" style={{ width: '65px' }}>KALAN</TableHead>
                    )}
                    <TableHead className="border-r border-gray-400 text-center font-bold text-[10px] px-0.5 py-0 h-4 leading-none" style={{ width: '80px' }}>DESTİNASYON</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-[10px] px-0.5 py-0 h-4 leading-none" style={{ width: '90px' }}>MÜŞTERİ</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-[10px] px-0.5 py-0 h-4 leading-none" style={{ width: '75px' }}>İLETİŞİM</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-[10px] px-0.5 py-0 h-4 leading-none" style={{ width: '50px' }}>KİŞİ</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-[10px] px-0.5 py-0 h-4 leading-none" style={{ width: '70px' }}>ALIŞ YERİ</TableHead>
                    <TableHead className="border-r border-gray-400 text-center font-bold text-[10px] px-0.5 py-0 h-4 leading-none" style={{ width: '60px' }}>ALIŞ</TableHead>
                    {!isAdminMode && (
                      <TableHead className="text-center font-bold text-[10px] px-0.5 py-0 h-4 leading-none" style={{ width: '200px' }}>NOTLAR VE ÖZEL İSTEKLER</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedReservations(reservations).map((reservation) => (
                    <TableRow key={reservation.id} className="border-b border-gray-400" style={{ height: '10px' }}>
                      <TableCell className="border-r border-gray-400 text-center text-[10px] px-0.5 py-0" style={{ lineHeight: '1.0', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <div className="font-medium truncate">{reservation.turTarihi ? format(new Date(reservation.turTarihi), "dd MMM", { locale: tr }) : '-'}</div>
                      </TableCell>
                      {isAdminMode && (
                        <TableCell className="border-r border-gray-400 text-center text-[10px] px-0.5 py-0" style={{ lineHeight: '1.0', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          <div className="font-medium truncate">{reservation.firma || '-'}</div>
                        </TableCell>
                      )}
                      {isAdminMode && (
                        <TableCell className="border-r border-gray-400 text-center text-[10px] px-0.5 py-0" style={{ lineHeight: '1.0', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          <div className="font-medium truncate">
                            {(reservation.toplamTutar || reservation.tutar || reservation.ucret || reservation.miktar) ? 
                              formatCurrency(
                                reservation.toplamTutar || reservation.tutar || reservation.ucret || reservation.miktar, 
                                reservation.paraBirimi || 'TRY'
                              ) : '-'
                            }
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="border-r border-gray-400 text-center text-[10px] px-0.5 py-0" style={{ lineHeight: '1.0', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <div className="text-center text-xs leading-none truncate">
                          {(reservation.odemeDurumu === "Ödendi" || reservation.odemeDurumu === "Tamamlandı") ? (
                            <span className="text-green-700 font-medium">
                              ✓ {reservation.odemeYapan || 'TAM'}
                            </span>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-[9px] leading-tight w-full">
                              <span className="font-medium truncate w-full text-center">
                                {reservation.odemeYapan || '-'}
                              </span>
                              {(reservation.odemeMiktari || reservation.odenen) && (
                                <span className="text-blue-600 font-bold truncate w-full text-center">
                                  {formatCurrency(
                                    reservation.odemeMiktari || reservation.odenen || 0, 
                                    reservation.paraBirimi || 'TRY'
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      {isAdminMode && (
                        <TableCell className="border-r border-gray-400 text-center text-[10px] px-0.5 py-0" style={{ lineHeight: '1.0', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          <div className="font-medium truncate">
                            {(() => {
                              const toplamTutar = parseFloat(reservation.toplamTutar || reservation.tutar || reservation.ucret || reservation.miktar || 0);
                              const odemeMiktari = parseFloat(reservation.odemeMiktari || reservation.odenen || 0);
                              const kalan = toplamTutar - odemeMiktari;
                              
                              if (reservation.odemeDurumu === "Ödendi" || reservation.odemeDurumu === "Tamamlandı") {
                                return <span className="text-green-600 font-medium">0</span>;
                              }
                              
                              if (kalan > 0) {
                                return <span className="text-red-600 font-bold">{formatCurrency(kalan, reservation.paraBirimi || 'TRY')}</span>;
                              } else if (kalan === 0) {
                                return <span className="text-green-600 font-medium">0</span>;
                              } else {
                                return <span className="text-blue-600 font-medium">Fazla: {formatCurrency(Math.abs(kalan), reservation.paraBirimi || 'TRY')}</span>;
                              }
                            })()}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="border-r border-gray-400 text-center text-[10px] px-0.5 py-0" style={{ lineHeight: '1.0', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <div className="font-medium truncate">{getDestinationName(reservation.destinasyon)}</div>
                      </TableCell>
                      <TableCell className="border-r border-gray-400 text-center text-[10px] px-0.5 py-0" style={{ lineHeight: '1.0', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <div className="font-medium truncate">{reservation.musteriAdiSoyadi}</div>
                      </TableCell>
                      <TableCell className="border-r border-gray-400 text-center text-[10px] px-0.5 py-0" style={{ lineHeight: '1.0', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <div className="font-medium truncate">{reservation.telefon}</div>
                      </TableCell>
                      <TableCell className="border-r border-gray-400 text-center text-[10px] px-0.5 py-0" style={{ lineHeight: '1.0', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <div className="font-medium truncate">
                          {parseInt(reservation.yetiskinSayisi?.toString() || "0")}
                          {parseInt(reservation.cocukSayisi?.toString() || "0") > 0 && `+${parseInt(reservation.cocukSayisi?.toString() || "0")}Ç`}
                          {parseInt(reservation.bebekSayisi?.toString() || "0") > 0 && `${parseInt(reservation.bebekSayisi?.toString() || "0")}B`}
                        </div>
                      </TableCell>
                      <TableCell className="border-r border-gray-400 text-center text-[10px] px-0.5 py-0" style={{ lineHeight: '1.0', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <div className="font-medium truncate">{getAlisYeriBilgisi(reservation)}</div>
                      </TableCell>
                      <TableCell className="border-r border-gray-400 text-center text-[10px] px-0.5 py-0" style={{ lineHeight: '1.0', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <div className="text-xs truncate">
                          {(() => {
                            const alisSaati = reservation.alisDetaylari && reservation.alisDetaylari["Alış Saati"] ? reservation.alisDetaylari["Alış Saati"] : "";
                            const odaNumarasi = reservation.alisDetaylari && reservation.alisDetaylari["Oda Numarası"] ? reservation.alisDetaylari["Oda Numarası"] : "";
                            
                            if (alisSaati && odaNumarasi) {
                              return `${alisSaati} Oda:${odaNumarasi}`;
                            } else if (alisSaati) {
                              return alisSaati;
                            } else if (odaNumarasi) {
                              return `Oda:${odaNumarasi}`;
                            } else {
                              return "-";
                            }
                          })()}
                        </div>
                      </TableCell>
                      {!isAdminMode && (
                        <TableCell className="text-left text-[10px] px-1 py-0" style={{ lineHeight: '1.1', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          <div className="text-xs truncate">
                            {(() => {
                              const ozelIsteklerData = getOzelIsteklerFromAlisYeri(reservation);
                              const notlar = reservation.notlar || "";
                              
                              // İçerik parçalarını topla
                              const contentParts = [];
                              if (notlar) contentParts.push(notlar);
                              if (ozelIsteklerData) contentParts.push(ozelIsteklerData);
                              
                              // Eğer hiç içerik yoksa "-" göster, varsa "/" ile ayır
                              return contentParts.length > 0 ? contentParts.join(" / ") : "-";
                            })()}
                          </div>
                        </TableCell>
                      )}
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
            margin: 0.8cm;
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
            font-size: 7px !important;
            width: 100% !important;
          }
          th, td {
            padding: 1px !important;
            border: 1px solid #333 !important;
          }
          th {
            background-color: #f0f0f0 !important;
            font-weight: bold !important;
            height: 12px !important;
          }
          tr {
            height: 10px !important;
          }
          .space-y-2 > * + * {
            margin-top: 0.5rem !important;
          }
          .CardHeader {
            padding: 0.1rem !important;
          }
          .CardTitle {
            font-size: 12px !important;
          }
        }
      `}</style>
    </div>
  )
}
