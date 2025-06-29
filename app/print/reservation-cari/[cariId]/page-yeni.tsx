"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  ReservationCariService, 
  ReservationCari, 
  ReservationBorcDetay, 
  ReservationOdemeDetay 
} from "@/lib/reservation-cari-service";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ReservationCariPrintPage() {
  const params = useParams();
  const router = useRouter();
  const cariId = params?.cariId as string;
  
  const [cari, setCari] = useState<ReservationCari | null>(null);
  const [borcDetaylar, setBorcDetaylar] = useState<ReservationBorcDetay[]>([]);
  const [odemeDetaylar, setOdemeDetaylar] = useState<ReservationOdemeDetay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cariId) {
      loadCariData();
    }
  }, [cariId]);

  const loadCariData = async () => {
    try {
      setLoading(true);
      const cariData = await ReservationCariService.getCariById(cariId);
      if (cariData) {
        setCari(cariData);
        const [borclar, odemeler] = await Promise.all([
          ReservationCariService.getBorcDetaysByCariId(cariId),
          ReservationCariService.getOdemeDetaysByCariId(cariId)
        ]);
        setBorcDetaylar(borclar);
        setOdemeDetaylar(odemeler);
      }
    } catch (error) {
      console.error("Cari verileri yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number, currency = "EUR") => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('tr-TR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cari kartı yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!cari) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Cari Bulunamadı</h1>
          <p className="text-gray-600 mb-4">Belirtilen cari kartı bulunamadı.</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri Dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Print dışında görünecek kontroller */}
      <div className="no-print sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Yazdır
        </Button>
      </div>

      {/* Yazdırılacak içerik */}
      <div className="print-content max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8 text-center border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">REZERVASYON CARİ KARTI</h1>
          <div className="text-lg text-gray-600">
            {cari.companyName}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Yazdırma Tarihi: {getCurrentDate()}
          </div>
        </div>

        {/* Cari Bilgileri */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Cari Bilgileri</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Şirket Adı:</span>
                <div className="font-semibold">{cari.companyName}</div>
              </div>
              {cari.contactPerson && (
                <div>
                  <span className="text-sm text-gray-600">İletişim Kişisi:</span>
                  <div className="font-semibold">{cari.contactPerson}</div>
                </div>
              )}
              {cari.contactPhone && (
                <div>
                  <span className="text-sm text-gray-600">Telefon:</span>
                  <div className="font-semibold">{cari.contactPhone}</div>
                </div>
              )}
              {cari.contactEmail && (
                <div>
                  <span className="text-sm text-gray-600">E-posta:</span>
                  <div className="font-semibold">{cari.contactEmail}</div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {cari.taxNumber && (
                <div>
                  <span className="text-sm text-gray-600">Vergi Numarası:</span>
                  <div className="font-semibold">{cari.taxNumber}</div>
                </div>
              )}
              {cari.address && (
                <div>
                  <span className="text-sm text-gray-600">Adres:</span>
                  <div className="font-semibold">{cari.address}</div>
                </div>
              )}
              <div>
                <span className="text-sm text-gray-600">Dönem:</span>
                <div className="font-semibold">{cari.period}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Özet */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Finansal Özet</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
              <div className="text-sm text-red-600 font-medium">Toplam Borç</div>
              <div className="text-2xl font-bold text-red-700">
                {formatCurrency(cari.totalDebt)}
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
              <div className="text-sm text-green-600 font-medium">Toplam Ödeme</div>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(cari.totalPayment)}
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-center">
              <div className="text-sm text-blue-600 font-medium">Bakiye</div>
              <div className={`text-2xl font-bold ${cari.balance >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                {formatCurrency(Math.abs(cari.balance))}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {cari.balance > 0 ? 'Borçlu' : cari.balance < 0 ? 'Alacaklı' : 'Kapalı'}
              </div>
            </div>
          </div>
        </div>

        {/* Borç Detayları Tablosu */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Borç Detayları</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-left">TUR TARİH</th>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-left">ÖDEME TARİH</th>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-left">FİRMA</th>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-right">TUTAR</th>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-right">ÖDEME</th>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-right">KALAN</th>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-left">DESTİNASYON</th>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-left">MÜŞTERİ</th>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-center">KİŞİ</th>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-left">ALIŞ YERİ</th>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-center">ALIŞ</th>
                </tr>
              </thead>
              <tbody>
                {borcDetaylar.map((borc, index) => (
                  <tr key={borc.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-2 py-2 text-xs">{formatDate(borc.turTarih)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-xs">{borc.odemeTarih ? formatDate(borc.odemeTarih) : "-"}</td>
                    <td className="border border-gray-300 px-2 py-2 text-xs">{borc.firma}</td>
                    <td className="border border-gray-300 px-2 py-2 text-xs text-right">{formatCurrency(borc.tutar, borc.paraBirimi)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-xs text-right text-green-600">{formatCurrency(borc.odeme, borc.paraBirimi)}</td>
                    <td className={`border border-gray-300 px-2 py-2 text-xs text-right ${borc.kalan > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}`}>
                      {formatCurrency(borc.kalan, borc.paraBirimi)}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-xs">{borc.destinasyon}</td>
                    <td className="border border-gray-300 px-2 py-2 text-xs">{borc.musteri}</td>
                    <td className="border border-gray-300 px-2 py-2 text-xs text-center">{borc.kisi}</td>
                    <td className="border border-gray-300 px-2 py-2 text-xs">{borc.alisYeri}</td>
                    <td className="border border-gray-300 px-2 py-2 text-xs text-center">{borc.alis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ödeme Detayları */}
        {odemeDetaylar.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ödeme Detayları</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-left">Tarih</th>
                    <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-right">Tutar</th>
                    <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-left">Açıklama</th>
                    <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-left">Ödeme Yöntemi</th>
                    <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-left">Fiş No</th>
                  </tr>
                </thead>
                <tbody>
                  {odemeDetaylar.map((odeme, index) => (
                    <tr key={odeme.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{formatDate(odeme.tarih)}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-right text-green-600 font-semibold">
                        {formatCurrency(odeme.tutar)}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{odeme.aciklama}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{odeme.odemeYontemi || "-"}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{odeme.fisNumarasi || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>Bu rapor {getCurrentDate()} tarihinde sistem tarafından otomatik olarak oluşturulmuştur.</p>
        </div>
      </div>

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          .print-content {
            max-width: none !important;
            margin: 0 !important;
            padding: 20px !important;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          .bg-red-50, .bg-green-50, .bg-blue-50, .bg-gray-50 {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
