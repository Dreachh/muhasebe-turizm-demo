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
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { getSettings } from "@/lib/db";

export default function ReservationCariPrintPage() {
  const params = useParams();
  const router = useRouter();
  const cariId = params?.cariId as string;
  
  const [cari, setCari] = useState<ReservationCari | null>(null);
  const [detayliListe, setDetayliListe] = useState<any[]>([]);
  const [odemeDetaylar, setOdemeDetaylar] = useState<ReservationOdemeDetay[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<any>({});

  useEffect(() => {
    if (cariId) {
      loadCariData();
      loadCompanySettings();
    }
  }, [cariId]);

  // Otomatik güncelleme - her 15 saniyede bir veriyi kontrol et
  useEffect(() => {
    if (!cariId) return;
    
    const autoRefreshInterval = setInterval(async () => {
      try {
        const [detayli, odemeler] = await Promise.all([
          ReservationCariService.getBorcDetaylarWithReservationInfo(cariId),
          ReservationCariService.getOdemeDetaysByCariId(cariId)
        ]);
        
        // Sadece geçerli rezervasyonları göster (null olmayan)
        const validDetayli = detayli.filter(item => item !== null);
        setDetayliListe(validDetayli);
        setOdemeDetaylar(odemeler);
      } catch (error) {
        console.error("Otomatik güncelleme hatası:", error);
      }
    }, 15000); // 15 saniyede bir güncelle

    return () => clearInterval(autoRefreshInterval);
  }, [cariId]);

  const loadCariData = async () => {
    try {
      setLoading(true);
      const cariData = await ReservationCariService.getCariById(cariId);
      if (cariData) {
        setCari(cariData);
        const [detayli, odemeler] = await Promise.all([
          ReservationCariService.getBorcDetaylarWithReservationInfo(cariId),
          ReservationCariService.getOdemeDetaysByCariId(cariId)
        ]);
        // Sadece geçerli rezervasyonları göster (null olmayan)
        const validDetayli = detayli.filter(item => item !== null);
        setDetayliListe(validDetayli);
        setOdemeDetaylar(odemeler);
      }
    } catch (error) {
      console.error("Cari verileri yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanySettings = async () => {
    try {
      const settings = await getSettings();
      if (settings?.companyInfo) {
        setCompanyInfo(settings.companyInfo);
      }
    } catch (error) {
      console.error("Şirket ayarları yüklenirken hata:", error);
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

  const formatDate = (dateString: string | Date | any) => {
    try {
      if (!dateString) return "-";
      
      // Firestore Timestamp kontrolü
      if (dateString && typeof dateString === 'object' && dateString.toDate) {
        return format(dateString.toDate(), "dd MMM yyyy", { locale: tr });
      }
      
      if (typeof dateString === 'string') {
        return format(new Date(dateString), "dd MMM yyyy", { locale: tr });
      } 
      
      return format(dateString, "dd MMM yyyy", { locale: tr });
    } catch (error) {
      console.error("Date formatting error:", error);
      return dateString?.toString() || "-";
    }
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

      {/* Yazdırılacak içerik - A4 tam genişlik */}
      <div className="p-6 w-full">
        {/* Header */}
        <div className="mb-6 relative">
          {/* Sol üst köşede şirket logosu */}
          {companyInfo.logo && (
            <div className="absolute top-0 left-0 w-32 h-32 flex items-center justify-center">
              <img 
                src={companyInfo.logo} 
                alt="Şirket Logosu" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          
          {/* Başlık - logo varsa sağa kaydırılmış */}
          <div className={`text-center ${companyInfo.logo ? 'ml-36' : ''}`}>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">REZERVASYON CARİ KARTI</h1>
            <p className="text-gray-600">Yazdırma Tarihi: {getCurrentDate()}</p>
          </div>
        </div>

        {/* Cari Bilgileri - Tek satır düzenlemesi */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            {/* Sol taraf - Şirket ve İletişim Bilgileri */}
            <div className="flex gap-8">
              <div>
                <span className="text-sm text-gray-600">Şirket:</span>
                <span className="font-semibold ml-1">{cari.companyName}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">İletişim:</span>
                <span className="font-semibold ml-1">{cari.contactPerson || "-"}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Tel:</span>
                <span className="font-semibold ml-1">{cari.contactPhone || "-"}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">E-posta:</span>
                <span className="font-semibold ml-1">{cari.contactEmail || "-"}</span>
              </div>
            </div>
            
            {/* Sağ taraf - Dönem ve Oluşturulma Tarihi */}
            <div className="flex gap-6">
              <div>
                <span className="text-sm text-gray-600">Dönem:</span>
                <span className="font-semibold ml-1">{cari.period}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Oluşturma:</span>
                <span className="font-semibold ml-1">{formatDate(cari.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hareket Listesi - Kısaltılmış başlıklar ve dar yükseklik */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Rezervasyon Detayları</h2>
            <div className="flex items-center gap-1 text-sm bg-gray-50 px-3 py-1 rounded-lg border">
              <span className="text-gray-600">
                {cari.balance > 0 ? 'Alacak:' : cari.balance < 0 ? 'Borç:' : 'Bakiye:'}
              </span>
              <span className={`font-bold ${cari.balance > 0 ? 'text-red-600' : cari.balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                {formatCurrency(Math.abs(cari.balance))}
              </span>
              <span className="text-gray-400 mx-2">|</span>
              <span className="text-gray-600">Rezervasyon:</span>
              <span className="font-bold text-blue-600">{detayliListe.length} adet</span>
            </div>
          </div>
          {detayliListe.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-1 py-1 text-center text-[10px] font-bold">T.TARİHİ</th>
                    <th className="border border-gray-300 px-1 py-1 text-center text-[10px] font-bold">Ö.TARİHİ</th>
                    <th className="border border-gray-300 px-1 py-1 text-center text-[10px] font-bold">MÜŞTERİ</th>
                    <th className="border border-gray-300 px-1 py-1 text-center text-[10px] font-bold">DEST.</th>
                    <th className="border border-gray-300 px-1 py-1 text-center text-[10px] font-bold">KİŞİ</th>
                    <th className="border border-gray-300 px-1 py-1 text-center text-[10px] font-bold">ALIŞ</th>
                    <th className="border border-gray-300 px-1 py-1 text-center text-[10px] font-bold">FİRMA</th>
                    <th className="border border-gray-300 px-1 py-1 text-center text-[10px] font-bold">TUTAR</th>
                    <th className="border border-gray-300 px-1 py-1 text-center text-[10px] font-bold">ÖDEME/YAPAN</th>
                    <th className="border border-gray-300 px-1 py-1 text-center text-[10px] font-bold">KALAN</th>
                  </tr>
                </thead>
                <tbody>
                  {detayliListe.map((item, index) => (
                    <tr key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} h-8`}>
                      <td className="border border-gray-300 px-1 py-0.5 text-center text-[10px]">
                        {formatDate(item.turTarih)}
                      </td>
                      <td className="border border-gray-300 px-1 py-0.5 text-center text-[10px]">
                        {item.odemeTarih || item.odemeTarihi ? formatDate(item.odemeTarih || item.odemeTarihi) : "-"}
                      </td>
                      <td className="border border-gray-300 px-1 py-0.5 text-[10px] leading-tight">
                        {item.musteri}
                      </td>
                      <td className="border border-gray-300 px-1 py-0.5 text-center text-[10px]">
                        {item.destinasyon}
                      </td>
                      <td className="border border-gray-300 px-1 py-0.5 text-center text-[10px]">
                        {item.kisi}
                      </td>
                      <td className="border border-gray-300 px-1 py-0.5 text-[10px] leading-tight">
                        {item.alisYeriDetay || item.alisYeri || "-"}
                      </td>
                      <td className="border border-gray-300 px-1 py-0.5 text-[10px] leading-tight">
                        {item.firma}
                      </td>
                      <td className="border border-gray-300 px-1 py-0.5 text-right text-[10px]">
                        {formatCurrency(item.tutar, item.paraBirimi)}
                      </td>
                      <td className="border border-gray-300 px-1 py-0.5 text-center text-[10px] leading-tight">
                        <div>
                          {formatCurrency(item.odeme, item.paraBirimi)}
                          {item.odemeYapan && (
                            <div className="text-[8px] text-gray-600">
                              {item.odemeYapan}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-1 py-0.5 text-right text-[10px]">
                        {formatCurrency(item.kalan, item.paraBirimi)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-200 font-bold h-8">
                    <td colSpan={7} className="border border-gray-300 px-1 py-0.5 text-right text-[10px]">
                      TOPLAM:
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-right text-[10px]">
                      {formatCurrency(cari.totalDebt)}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-right text-[10px]">
                      {formatCurrency(cari.totalPayment)}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-right text-[10px]">
                      {formatCurrency(cari.balance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
              Bu cari kartında henüz rezervasyon bulunmamaktadır.
            </div>
          )}
        </div>

        {/* Notlar */}
        {cari.notes && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Notlar</h2>
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
              <p className="whitespace-pre-wrap text-sm">{cari.notes}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-600">
          <p>Bu rapor {getCurrentDate()} tarihinde sistem tarafından otomatik olarak oluşturulmuştur.</p>
        </div>
      </div>

      {/* Print stilleri - A4 optimizasyonu */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          
          @page {
            margin: 0.5in;
            size: A4;
          }
          
          .bg-red-50 {
            background-color: #fef2f2 !important;
          }
          
          .bg-green-50 {
            background-color: #f0fdf4 !important;
          }
          
          .bg-blue-50 {
            background-color: #eff6ff !important;
          }
          
          .bg-gray-50 {
            background-color: #f9fafb !important;
          }
          
          .bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          
          .bg-gray-200 {
            background-color: #e5e7eb !important;
          }
          
          .border-red-200 {
            border-color: #fecaca !important;
          }
          
          .border-green-200 {
            border-color: #bbf7d0 !important;
          }
          
          .border-blue-200 {
            border-color: #bfdbfe !important;
          }
          
          .border-gray-200 {
            border-color: #e5e7eb !important;
          }
          
          .border-gray-300 {
            border-color: #d1d5db !important;
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
          
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>
    </div>
  );
}
