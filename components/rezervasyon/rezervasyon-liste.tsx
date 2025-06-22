"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Printer,
  Calendar,
  MapPin,
  Clock,
  Users,
  Phone,
  Loader2,
  RefreshCw,
  Settings,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { RezervasyonDetay } from "./rezervasyon-detay"
import { DateRange } from "react-day-picker"
import { useToast } from "@/components/ui/use-toast"
import { deleteReservation } from "@/lib/db"
import { getDestinations, getTourTemplates } from "@/lib/db-firebase"
import { Rezervasyon } from "@/types/rezervasyon-types"

interface RezervasyonListeProps {
  reservationsData: Rezervasyon[];
  isLoading: boolean;
  onAddNew: () => void;
  onEdit: (reservation: Rezervasyon) => void;
  onRefresh: () => Promise<void>;
}

// The component now receives data and loading status as props
export function RezervasyonListe({ reservationsData, isLoading, onAddNew, onEdit, onRefresh }: RezervasyonListeProps) {
  const { toast } = useToast()
  
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "Ödendi": "bg-green-100 text-green-800",
      "Bekliyor": "bg-yellow-100 text-yellow-800", 
      "Kısmi Ödendi": "bg-blue-100 text-blue-800",
      "İptal": "bg-red-100 text-red-800"
    } as const
    
    const className = statusConfig[status as keyof typeof statusConfig] || statusConfig["Bekliyor"]
    return <Badge className={className}>{status}</Badge>
  }
  const [groupedReservations, setGroupedReservations] = useState<{ [key: string]: any[] }>({});
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("Tümü");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [selectedAgency, setSelectedAgency] = useState("Tümü");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("Tümü");

  // Data for resolving IDs to names
  const [destinations, setDestinations] = useState<any[]>([]);
  const [tourTemplates, setTourTemplates] = useState<any[]>([]);

  // Dynamic filter data
  const [ornekDestinasyonlar, setOrnekDestinasyonlar] = useState<string[]>(["Tümü"]);
  const [ornekAcentalar, setOrnekAcentalar] = useState<string[]>(["Tümü"]);
  const odemeDurumlari = ["Tümü", "Ödendi", "Bekliyor", "Kısmi Ödendi", "İptal"];

  // Load destinations and tour templates for ID resolution
  useEffect(() => {
    const loadData = async () => {
      try {
        const [destinationsData, templatesData] = await Promise.all([
          getDestinations(),
          getTourTemplates()
        ]);
        setDestinations(destinationsData);
        setTourTemplates(templatesData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);
  // Update dynamic filters when data changes
  useEffect(() => {
    if (reservationsData && destinations.length > 0) {
      // Resolve destination IDs to names for filters
      const destinationNames = reservationsData
        .map((r) => getDestinationName(r.destinasyon))
        .filter(Boolean);
      const uniqueDestinations = ["Tümü", ...new Set(destinationNames)] as string[];
      
      const agencies = ["Tümü", ...new Set(reservationsData.map((r) => r.firma).filter(Boolean))] as string[];
      
      setOrnekDestinasyonlar(uniqueDestinations);
      setOrnekAcentalar(agencies);
    }
  }, [reservationsData, destinations])  // Helper functions to resolve IDs to names
  const getDestinationName = (destinationId: string) => {
    const destination = destinations.find(d => d.id === destinationId);
    return destination ? destination.name : destinationId;
  }

  const getTourTemplateName = (templateId: string) => {
    const template = tourTemplates.find(t => t.id === templateId);
    return template ? (template.name || template.title || templateId) : templateId;
  }

  // Helper function to format phone numbers for 2-line display
  const formatPhoneNumber = (phone: string | undefined) => {
    if (!phone) return { line1: "+90", line2: "" };
    
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +90, assume it's a Turkish number
    let number = cleaned;
    if (!number.startsWith('+90')) {
      if (number.startsWith('90')) {
        number = '+' + number;
      } else if (number.startsWith('0')) {
        number = '+90' + number.substring(1);
      } else {
        number = '+90' + number;
      }
    }
    
    // Split into 2 lines: +90 545 on first line, rest on second line
    if (number.length >= 13) {
      const formatted = number.replace(/(\+90)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2|$3 $4 $5');
      const parts = formatted.split('|');
      return { line1: parts[0], line2: parts[1] || "" };
    }
    
    return { line1: number, line2: "" };
  }
  // Helper function to split customer name into 2 lines
  const splitCustomerName = (fullName: string) => {
    if (!fullName) return { line1: "", line2: "" };
    
    const words = fullName.split(' ');
    if (words.length <= 2) {
      return { line1: words[0] || "", line2: words[1] || "" };
    }
    
    const midPoint = Math.ceil(words.length / 2);
    const line1 = words.slice(0, midPoint).join(' ');
    const line2 = words.slice(midPoint).join(' ');
    
    return { line1, line2 };
  }

  // Refresh function now calls the parent's refresh handler
  const handleRefresh = async () => {
    setRefreshing(true)
    if (onRefresh) {
      await onRefresh()
    }
    setRefreshing(false)
  }

  const handleDeleteReservation = async (id: string) => {
    if (window.confirm("Bu rezervasyonu kalıcı olarak silmek istediğinizden emin misiniz?")) {
      setDeletingId(id)
      try {
        await deleteReservation(id)
        toast({
          title: "Başarılı",
          description: "Rezervasyon başarıyla silindi.",
        })
        // Notify parent to refresh data
        if (onRefresh) {
          await onRefresh()
        }
      } catch (error) {
        console.error("Rezervasyon silinirken hata:", error)
        toast({
          title: "Hata",
          description: "Rezervasyon silinirken bir hata oluştu.",
          variant: "destructive",
        })
      } finally {
        setDeletingId(null)
      }
    }
  }

  const filteredReservations = useMemo(() => {
    if (!reservationsData) return []
    return reservationsData.filter((reservation: Rezervasyon) => {
      const matchesSearch =
        reservation.musteriAdiSoyadi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.telefon?.includes(searchTerm) ||
        reservation.seriNumarasi?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesDestination = filter === "Tümü" || reservation.destinasyon === filter
      const matchesAgency = selectedAgency === "Tümü" || reservation.firma === selectedAgency
      const matchesPayment = selectedPaymentStatus === "Tümü" || reservation.odemeDurumu === selectedPaymentStatus

      let matchesDate = true
      if (dateRange?.from) {
          const reservationDate = new Date(reservation.turTarihi);
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0); // Start of the day
          matchesDate = reservationDate >= fromDate;
      }
      if (dateRange?.to) {
          const reservationDate = new Date(reservation.turTarihi);
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999); // End of the day
          matchesDate = matchesDate && reservationDate <= toDate;
      }

      return matchesSearch && matchesDestination && matchesAgency && matchesPayment && matchesDate
    })
  }, [reservationsData, searchTerm, filter, selectedAgency, selectedPaymentStatus, dateRange])
  const groupReservationsByDestination = (reservations: any[]) => {
    return reservations.reduce((groups, reservation) => {
      const destination = getDestinationName(reservation.destinasyon) || "Diğer"
      if (!groups[destination]) {
        groups[destination] = []
      }
      groups[destination].push(reservation)
      return groups
    }, {} as Record<string, any[]>)
  }
  useEffect(() => {
    const grouped = groupReservationsByDestination(filteredReservations)
    setGroupedReservations(grouped)
  }, [filteredReservations, destinations])
  const handlePrint = () => {
    const now = new Date();
    const printDate = format(now, "dd.MM.yyyy", { locale: tr });
    const printTime = format(now, "HH:mm", { locale: tr });

    // Filtrelenmiş rezervasyonları destinasyona göre grupla
    const sorted = [...filteredReservations].sort((a, b) => {
      const da = new Date(a.turTarihi).getTime();
      const db = new Date(b.turTarihi).getTime();
      if (da !== db) return da - db;
      return (a.alisSaati || "00:00").localeCompare(b.alisSaati || "00:00");
    });
    
    const groups: Record<string, any[]> = {};
    sorted.forEach(res => {
      const dest = getDestinationName(res.destinasyon);
      if (!groups[dest]) groups[dest] = [];
      groups[dest].push(res);
    });

    let html = `
      <html>
      <head>
        <title>Rezervasyon Listesi - Nehir Travel</title>
        <meta charset="utf-8">
        <style>
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
          
          body { 
            font-family: 'Arial', 'Helvetica', sans-serif; 
            font-size: 10px;
            line-height: 1.2;
            margin: 10mm;
            color: #000;
            background: white;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 3px solid #000;
          }
          
          .header-left {
            display: flex;
            align-items: center;
          }
          
          .logo {
            height: 60px;
            width: auto;
            margin-right: 12px;
          }
          
          .company-info h2 {
            font-size: 16px;
            font-weight: bold;
            color: #000;
            margin-bottom: 2px;
          }
          
          .company-info p {
            font-size: 11px;
            color: #666;
          }
          
          .header-right {
            text-align: right;
            font-size: 11px;
            color: #000;
          }
          
          .header-right .date {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 2px;
          }
          
          .header-right .time {
            font-size: 10px;
            color: #666;
          }
          
          .main-title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin: 12px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #000;
          }
          
          .summary-info {
            text-align: center;
            font-size: 9px;
            color: #666;
            margin-bottom: 15px;
          }
          
          .destination-section {
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          
          .destination-title {
            background: linear-gradient(to right, #f8f9fa, #e9ecef);
            padding: 8px 15px;
            font-size: 13px;
            font-weight: bold;
            border: 2px solid #000;
            border-bottom: 1px solid #000;
            margin-bottom: 0;
            text-align: center;
            color: #000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 9px;
            table-layout: fixed;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 3px 4px;
            text-align: left;
            vertical-align: top;
            line-height: 1.2;
            word-wrap: break-word;
            overflow: hidden;
          }
          
          th {
            background: #f0f0f0;
            font-weight: bold;
            text-align: center;
            font-size: 8px;
            padding: 5px 3px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          
          tbody tr {
            border-bottom: 1px solid #ccc;
          }
          
          tbody tr:nth-child(even) {
            background: #f9f9f9;
          }
          
          /* Sütun genişlikleri */
          .col-seri { width: 45px; }
          .col-tarih { width: 50px; }
          .col-tur { width: 160px; }
          .col-musteri { width: 100px; }
          .col-iletisim { width: 85px; }
          .col-alis { width: 100px; }
          .col-firma { width: 120px; }
          .col-kisi { width: 35px; }
          .col-odeme { width: 75px; }
          .col-tutar { width: 60px; }
          .col-saat { width: 70px; }
          
          .text-center { text-align: center !important; }
          .text-right { text-align: right !important; }
          .text-bold { font-weight: bold; }
          .text-small { font-size: 7px; color: #666; }
          .text-xs { font-size: 6px; color: #666; }
          
          .status-badge {
            padding: 1px 4px;
            border-radius: 2px;
            font-size: 7px;
            font-weight: bold;
            text-align: center;
            display: inline-block;
            min-width: 40px;
          }
          
          .status-odendi { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
          .status-bekliyor { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
          .status-kismi { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
          .status-iptal { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
          
          .divider {
            height: 1px;
            background: #ddd;
            margin: 1px 0;
          }
          
          @media print {
            body { 
              margin: 0; 
              font-size: 9px;
            }
            .destination-section { 
              page-break-inside: avoid; 
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
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <img src="${window.location.origin}/logo.svg" alt="Nehir Travel Logo" class="logo" />
            <div class="company-info">
              <h2>NEHİR TRAVEL</h2>
              <p>Turizm ve Seyahat Acentası</p>
            </div>
          </div>
          <div class="header-right">
            <div class="date">Tarih: ${printDate}</div>
            <div class="time">Saat: ${printTime}</div>
          </div>
        </div>
        
        <h1 class="main-title">Rezervasyon Listesi</h1>
        
        <div class="summary-info">
          Toplam ${sorted.length} rezervasyon • ${Object.keys(groups).length} destinasyon
        </div>
    `;

    // Her destinasyon için tablo oluştur
    Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([dest, list]) => {
        html += `
        <div class="destination-section">
          <div class="destination-title">${dest} - ${list.length} Rezervasyon</div>
          <table>
            <colgroup>
              <col class="col-seri" />
              <col class="col-tarih" />
              <col class="col-tur" />
              <col class="col-musteri" />
              <col class="col-iletisim" />
              <col class="col-alis" />
              <col class="col-firma" />
              <col class="col-kisi" />
              <col class="col-odeme" />
              <col class="col-tutar" />
              <col class="col-saat" />
            </colgroup>
            <thead>
              <tr>
                <th class="col-seri">Seri No</th>
                <th class="col-tarih">Tarih</th>
                <th class="col-tur">Tur Şablonu</th>
                <th class="col-musteri">Müşteri Adı</th>
                <th class="col-iletisim">İletişim</th>
                <th class="col-alis">Alış Yeri</th>
                <th class="col-firma">Firma/Acenta</th>
                <th class="col-kisi">Kişi</th>
                <th class="col-odeme">Ödeme</th>
                <th class="col-tutar">Tutar</th>
                <th class="col-saat">Alış Saati</th>
              </tr>
            </thead>
            <tbody>`;
      
        list.forEach((res, index) => {
          const phone = formatPhoneNumber(res.telefon);
          const customer = splitCustomerName(res.musteriAdiSoyadi);
          const pickTime = res.alisDetaylari?.['Alış Saati'] || '-';
          
          let pickupInfo = '';
          if (res.alisYeri === 'Acenta') {
            pickupInfo = res.firma || 'Acenta';
          } else if (res.alisYeri === 'Otel') {
            if (res.alisDetaylari?.['Oda Numarası']) {
              pickupInfo = `${res.alisDetaylari?.['Otel Adı'] || 'Otel'}<br><span class="text-xs">Oda: ${res.alisDetaylari['Oda Numarası']}</span>`;
            } else {
              pickupInfo = res.alisDetaylari?.['Otel Adı'] || 'Otel';
            }
          } else if (res.alisYeri === 'Özel Adres') {
            const addr = res.alisDetaylari?.['Adres'];
            pickupInfo = addr ? (addr.length > 20 ? addr.substring(0, 20) + '...' : addr) : 'Özel Adres';
          } else {
            pickupInfo = res.alisYeri || '-';
          }
          
          let statusClass = 'status-bekliyor';
          if (res.odemeDurumu === 'Ödendi') statusClass = 'status-odendi';
          else if (res.odemeDurumu === 'Kısmi Ödendi') statusClass = 'status-kismi';
          else if (res.odemeDurumu === 'İptal') statusClass = 'status-iptal';
          
          const totalPeople = parseInt(res.yetiskinSayisi?.toString() || '0') + parseInt(res.cocukSayisi?.toString() || '0');
          
          html += `
            <tr>
              <td class="col-seri text-center">
                <div class="text-bold">${(res.seriNumarasi?.replace('RZV-', '') || (index + 1).toString().padStart(3, '0'))}</div>
              </td>
              <td class="col-tarih text-center">
                <div class="text-bold">${format(new Date(res.turTarihi), 'dd.MM', { locale: tr })}</div>
                <div class="text-xs">${format(new Date(res.turTarihi), 'yyyy', { locale: tr })}</div>
              </td>
              <td class="col-tur">
                <div class="text-bold" style="margin-bottom: 2px;">${getTourTemplateName(res.turSablonu)}</div>
                <div class="text-small">📍 ${getDestinationName(res.destinasyon)}</div>
              </td>
              <td class="col-musteri">
                <div class="text-bold">${customer.line1}</div>
                ${customer.line2 ? `<div class="text-bold">${customer.line2}</div>` : ''}
                ${res.katilimcilar && res.katilimcilar.length > 0 ? 
                  `<div class="text-xs">+${res.katilimcilar.length} katılımcı</div>` : ''}
              </td>
              <td class="col-iletisim text-center">
                <div class="text-bold">${phone.line1}</div>
                ${phone.line2 ? `<div class="text-small">${phone.line2}</div>` : ''}
              </td>
              <td class="col-alis">
                <div class="text-bold text-small">${res.alisYeri}</div>
                <div class="text-xs">${pickupInfo}</div>
              </td>
              <td class="col-firma">
                <div class="text-bold text-small">${res.firma || '-'}</div>
                ${res.yetkiliKisi ? `<div class="text-xs">${res.yetkiliKisi}</div>` : ''}
              </td>
              <td class="col-kisi text-center">
                <div class="text-bold">${totalPeople}</div>
                <div class="text-xs">(${res.yetiskinSayisi || 0}+${res.cocukSayisi || 0})</div>
              </td>
              <td class="col-odeme text-center">
                <div class="status-badge ${statusClass}">${res.odemeDurumu}</div>
                ${res.odemeYontemi ? `<div class="text-xs" style="margin-top: 1px;">${res.odemeYontemi}</div>` : ''}
              </td>
              <td class="col-tutar text-right">
                <div class="text-bold">${formatCurrency(res.tutar, res.paraBirimi)}</div>
              </td>
              <td class="col-saat text-center">
                <div class="text-bold">${pickTime}</div>
                ${res.alisDetaylari?.['Özel Talimatlar'] ? 
                  `<div class="text-xs">⚠️ Özel</div>` : ''}              </td>
            </tr>`;
            
          // Her satırdan sonra ince çizgi ekle
          if (index < list.length - 1) {
            html += `<tr><td colspan="11" class="divider"></td></tr>`;
          }
        });
      
        html += `
            </tbody>
          </table>
        </div>`;
      });

    html += `
      </body>
      </html>`;    // Yeni pencerede aç ve yazdır
    if (typeof window !== 'undefined') {
      let printWindow: Window | null;
      printWindow = window.open('', '_blank', 'width=1200,height=800');
      if (!printWindow) {
        alert('Pop-up engelleyici nedeniyle yazdırma penceresi açılamadı. Lütfen pop-up engelleyiciyi devre dışı bırakın.');
        return;
      }

      printWindow.document.write(html);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }, 500);
      };
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Rezervasyonlar yükleniyor...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rezervasyon Listesi</h1>
            <p className="text-gray-600 mt-2">Tüm rezervasyonlarınızı görüntüleyin ve yönetin</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            {onAddNew && (
              <Button 
                onClick={() => onAddNew()}
                className="bg-[#00a1c6] hover:bg-[#008bb3]"
              >
                Yeni Rezervasyon
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtreler
          </CardTitle>
          <CardDescription>Rezervasyonları filtrelemek için aşağıdaki seçenekleri kullanın</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Arama</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Misafir adı veya telefon..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Destinasyon</label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ornekDestinasyonlar.map((dest) => (
                    <SelectItem key={dest} value={dest}>
                      {dest}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Acenta</label>
              <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ornekAcentalar.map((agency) => (
                    <SelectItem key={agency} value={agency}>
                      {agency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ödeme Durumu</label>
              <Select value={selectedPaymentStatus} onValueChange={setSelectedPaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {odemeDurumlari.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {dateRange?.from ? 
                      (dateRange.to ? `${format(dateRange.from, "dd MMM")} - ${format(dateRange.to, "dd MMM")}` : format(dateRange.from, "dd MMM yyyy"))
                      : "Tarih Aralığı Seç"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
              </PopoverContent>
            </Popover>

            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="h-4 w-4 mr-2" />
              Yazdır
            </Button>
          </div>
        </CardContent>
      </Card>      {/* Print Content Container */}
      <div id="print-content" className="print-area">
        {/* Print Header */}
        <div className="hidden print:block mb-4 border-b-2 border-gray-300 pb-4">
          <div className="flex justify-between items-start mb-4">
            {/* Logo */}
            <div className="flex items-center">
              <img src="/logo.svg" alt="Nehir Travel" className="h-16 w-auto" />
              <div className="ml-4">
                <h2 className="text-lg font-bold text-gray-800">Nehir Travel</h2>
                <p className="text-sm text-gray-600">Turizm ve Seyahat Acentası</p>
              </div>
            </div>
            
            {/* Tarih ve Saat */}
            <div className="text-right text-sm text-gray-600">
              <div className="font-medium">{format(new Date(), "dd MMMM yyyy", { locale: tr })}</div>
              <div>{format(new Date(), "HH:mm", { locale: tr })}</div>
            </div>
          </div>
          
          {/* Başlık ve Özet */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">REZERVASYON LİSTESİ</h1>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Toplam {filteredReservations.length} rezervasyon</p>
              {dateRange?.from && (
                <p>
                  Tarih Aralığı: {format(dateRange.from, "dd MMM yyyy", { locale: tr })}
                  {dateRange.to && ` - ${format(dateRange.to, "dd MMM yyyy", { locale: tr })}`}
                </p>
              )}
              {filter !== "Tümü" && <p>Destinasyon: {filter}</p>}
              {selectedAgency !== "Tümü" && <p>Acenta: {selectedAgency}</p>}
              {selectedPaymentStatus !== "Tümü" && <p>Ödeme Durumu: {selectedPaymentStatus}</p>}
            </div>
          </div>
        </div>

        {/* Reservation List by Destination */}
      {Object.keys(groupedReservations).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Rezervasyon Bulunamadı</h3>
            <p className="text-gray-600">Seçilen kriterlere uygun rezervasyon bulunmuyor.</p>
          </CardContent>
        </Card>
      ) : (        Object.entries(groupedReservations)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([destination, reservations]) => (
            <Card key={destination} className="mb-4 print:shadow-none print:border print:border-gray-400 print:break-inside-avoid">
              <CardHeader className="bg-blue-50 print:bg-gray-100 print:border-b print:border-gray-400">
                <CardTitle className="flex items-center gap-2 text-lg print:text-base">
                  <MapPin className="h-5 w-5 text-blue-600 print:text-gray-700" />
                  {destination}
                  <Badge variant="secondary" className="ml-auto print:bg-gray-200 print:text-gray-800">
                    {reservations.length} Rezervasyon
                  </Badge>
                </CardTitle>
              </CardHeader>              <CardContent className="p-0 relative print:overflow-visible">
                <div className="overflow-x-auto print:overflow-visible">                  <Table className="border-collapse table-auto w-full print:text-xs"><colgroup><col style={{width: '60px'}}/><col style={{width: '65px'}}/><col style={{width: '220px'}}/><col style={{width: '100px'}}/><col style={{width: '110px'}}/>
                      <col style={{width: '140px'}} />
                      <col style={{width: '160px'}} />
                      <col style={{width: '50px'}} />
                      <col style={{width: '110px'}} />
                      <col style={{width: '80px'}} />
                      <col style={{width: '100px'}} />
                    </colgroup>                    <TableHeader>
                      <TableRow className="border-b-2 border-black bg-gray-100 print:border-b print:border-gray-600">
                        <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-2 px-2 print:py-1 print:px-1 print:border-r-gray-400" style={{width: '60px'}}>Seri</TableHead>
                        <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-2 px-2 print:py-1 print:px-1 print:border-r-gray-400" style={{width: '65px'}}>Tarih</TableHead>
                        <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-2 px-2 print:py-1 print:px-1 print:border-r-gray-400" style={{width: '220px'}}>Tur Şablonu</TableHead>
                        <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-2 px-2 print:py-1 print:px-1 print:border-r-gray-400" style={{width: '100px'}}>Müşteri</TableHead>
                        <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-2 px-2 print:py-1 print:px-1 print:border-r-gray-400" style={{width: '110px'}}>İletişim</TableHead>
                        <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-2 px-2 print:py-1 print:px-1 print:border-r-gray-400" style={{width: '140px'}}>Alış Yeri</TableHead>
                        <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-2 px-2 print:py-1 print:px-1 print:border-r-gray-400" style={{width: '160px'}}>Firma</TableHead>
                        <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-2 px-2 print:py-1 print:px-1 print:border-r-gray-400" style={{width: '50px'}}>Kişi</TableHead>
                        <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-2 px-2 print:py-1 print:px-1 print:border-r-gray-400" style={{width: '110px'}}>Ödeme</TableHead>
                        <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-2 px-2 print:py-1 print:px-1 print:border-r-gray-400" style={{width: '80px'}}>Tutar</TableHead>
                        <TableHead className="border-r border-gray-200 text-center text-xs font-bold py-2 px-2 print:py-1 print:px-1 print:border-r-gray-400" style={{width: '100px'}}>Alış</TableHead>
                        <TableHead className="print:hidden text-center py-2 px-1" style={{width: '40px'}}><Settings className="h-4 w-4 mx-auto" /></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {(() => {
                      const rows: React.ReactElement[] = [];
                      const sortedReservations = reservations
                        // Tarihe göre artan sırada (en yakın tarih en üstte), ardından saate göre sıralama
                        .sort((a, b) => {
                          const dateA = new Date(a.turTarihi).getTime();
                          const dateB = new Date(b.turTarihi).getTime();
                          if (dateA !== dateB) {
                            return dateA - dateB;
                          }
                          return (a.alisSaati || "00:00").localeCompare(b.alisSaati || "00:00");
                        });                      sortedReservations.forEach((reservation) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        
                        const tomorrow = new Date(today);
                        tomorrow.setDate(today.getDate() + 1);
                        
                        const dayAfterTomorrow = new Date(today);
                        dayAfterTomorrow.setDate(today.getDate() + 2);
                        
                        const threeDaysLater = new Date(today);
                        threeDaysLater.setDate(today.getDate() + 3);
                        
                        const reservationDate = new Date(reservation.turTarihi);
                        reservationDate.setHours(0, 0, 0, 0);
                        
                        // Yakınlık derecesine göre renklendirme (son 3 gün)
                        let rowBgClass = "";
                        let printBgClass = "";
                        
                        if (reservationDate >= today && reservationDate < tomorrow) {
                          // Bugün (1 gün kalan) - En koyu kırmızı
                          rowBgClass = "bg-red-100 border-l-4 border-red-700";
                          printBgClass = "print:bg-gray-100 print:border-l-2 print:border-l-gray-600";
                        } else if (reservationDate >= tomorrow && reservationDate < dayAfterTomorrow) {
                          // Yarın (2 gün kalan) - Orta kırmızı
                          rowBgClass = "bg-red-75 border-l-4 border-red-500";
                          printBgClass = "print:bg-gray-50 print:border-l-2 print:border-l-gray-500";
                        } else if (reservationDate >= dayAfterTomorrow && reservationDate < threeDaysLater) {
                          // Öbür gün (3 gün kalan) - Açık kırmızı
                          rowBgClass = "bg-red-50 border-l-4 border-red-300";
                          printBgClass = "print:bg-gray-25 print:border-l-2 print:border-l-gray-400";
                        }                        rows.push(
                          <TableRow
                            key={reservation.id}
                            className={`${rowBgClass} ${printBgClass} relative print:break-inside-avoid`}
                          >
                            <TableCell className="font-bold text-sm border-r border-gray-200 text-center align-top py-2 px-2 print:py-1 print:px-1 print:border-r-gray-400" style={{width: '60px'}}>
                              <div className="text-xs text-gray-500 leading-tight print:text-2xs">RZV-</div>
                              <div className="text-sm font-bold leading-tight print:text-xs">{reservation.seriNumarasi?.replace('RZV-', '') || '0001'}</div>
                            </TableCell>
                            <TableCell className="font-medium border-r border-gray-200 text-center align-top py-2 px-2 print:py-1 print:px-1 print:border-r-gray-400" style={{width: '65px'}}>
                              <div className="font-bold text-sm leading-tight print:text-xs">{format(new Date(reservation.turTarihi), "dd", { locale: tr })}</div>
                              <div className="text-xs text-gray-500 leading-tight print:text-2xs">{format(new Date(reservation.turTarihi), "MMM", { locale: tr })}</div>
                            </TableCell>
                            <TableCell className="border-r border-gray-200 align-top py-2 px-2" style={{width: '220px'}}>
                              <div className="space-y-1">
                                <div className="font-medium text-sm leading-tight">{getTourTemplateName(reservation.turSablonu)}</div>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="leading-tight">{getDestinationName(reservation.destinasyon)}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium border-r border-gray-200 align-top py-2 px-2" style={{width: '100px'}}>
                              <div className="space-y-1">
                                <div className="text-sm font-medium leading-tight">{splitCustomerName(reservation.musteriAdiSoyadi).line1}</div>
                                {splitCustomerName(reservation.musteriAdiSoyadi).line2 && (
                                  <div className="text-sm font-medium leading-tight">{splitCustomerName(reservation.musteriAdiSoyadi).line2}</div>
                                )}
                                {reservation.katilimcilar && reservation.katilimcilar.length > 0 && (
                                  <div className="text-xs text-gray-500 leading-tight">+{reservation.katilimcilar.length} katılımcı</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="border-r border-gray-200 text-center align-top py-2 px-2" style={{width: '110px'}}>
                              <div className="text-sm space-y-1">
                                <div className="font-medium leading-tight">{formatPhoneNumber(reservation.telefon).line1}</div>
                                {formatPhoneNumber(reservation.telefon).line2 && (
                                  <div className="text-xs text-gray-600 leading-tight">{formatPhoneNumber(reservation.telefon).line2}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="border-r border-gray-200 align-top py-2 px-2" style={{width: '140px'}}>
                              <div className="space-y-1">
                                <div className="font-medium text-sm leading-tight">{reservation.alisYeri}</div>
                                <div className="text-xs text-gray-500 leading-tight">
                                  {(reservation.alisDetaylari as any)?.["Otel Adı"] ||
                                    (reservation.alisDetaylari as any)?.["Acenta Adı"] ||
                                    ""}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm border-r border-gray-200 align-top py-2 px-2" style={{width: '160px'}}>
                              <div className="space-y-1">
                                <div className="font-medium text-xs leading-tight">{reservation.firma}</div>
                                <div className="text-xs text-gray-500 leading-tight">{reservation.yetkiliKisi}</div>
                              </div>
                            </TableCell>
                            <TableCell className="border-r border-gray-200 text-center align-top py-2 px-2" style={{width: '50px'}}>
                              <div className="flex items-center justify-center gap-1 text-sm">
                                <Users className="h-3 w-3 flex-shrink-0" />
                                <span className="text-sm font-medium">
                                  {parseInt(reservation.yetiskinSayisi?.toString() || "0")}
                                  {parseInt(reservation.cocukSayisi?.toString() || "0") > 0 && `+${parseInt(reservation.cocukSayisi?.toString() || "0")}Ç`}
                                </span>
                              </div>
                            </TableCell>                            <TableCell className="border-r border-gray-200 align-top py-2 px-2" style={{width: '110px'}}>
                              <div className="space-y-1">
                                {getStatusBadge(reservation.odemeDurumu)}
                                <div className="text-xs text-gray-500 leading-tight">
                                  {reservation.odemeYapan && (
                                    <div>{reservation.odemeYapan}</div>
                                  )}
                                  {reservation.odemeYontemi && (
                                    <div>{reservation.odemeYontemi}</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium border-r border-gray-200 text-right align-top py-2 px-2" style={{width: '80px'}}>
                              <div className="text-sm font-medium leading-tight">{formatCurrency(reservation.tutar, reservation.paraBirimi)}</div>
                            </TableCell>                            <TableCell className="border-r border-gray-200 text-center align-top py-2 px-2" style={{width: '100px'}}>
                              <div className="text-sm space-y-1">
                                {reservation.alisDetaylari && reservation.alisDetaylari["Alış Saati"] && (
                                  <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                                    <Clock className="h-3 w-3 flex-shrink-0" />
                                    <span className="leading-tight">{reservation.alisDetaylari["Alış Saati"]}</span>
                                  </div>
                                )}
                                
                                {/* Alış yeri kontrolü - Acenta ise firma adı, Otel ise oda bilgisi */}
                                {reservation.alisYeri === "Acenta" ? (
                                  <div className="text-xs text-gray-500 leading-tight">
                                    {reservation.firma || "Acenta"}
                                  </div>
                                ) : (
                                  // Otel durumunda oda bilgisini göster
                                  reservation.alisDetaylari && reservation.alisDetaylari["Oda Numarası"] ? (
                                    <div className="text-xs text-gray-500 leading-tight">
                                      Oda: {reservation.alisDetaylari["Oda Numarası"]}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-500 leading-tight">
                                      {reservation.alisDetaylari?.["Otel Adı"] || "Otel"}
                                    </div>
                                  )
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="print:hidden text-center align-top py-2 px-1" style={{width: '40px'}}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Menüyü aç</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => setSelectedReservation(reservation)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Görüntüle
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => onEdit(reservation)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Düzenle
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => handleDeleteReservation(reservation.id)} disabled={deletingId === reservation.id}>
                                    {deletingId === reservation.id ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="mr-2 h-4 w-4" />
                                    )}
                                    Sil
                                  </DropdownMenuItem>
                                </DropdownMenuContent>                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );

                        // Notlar ve Özel İstekler satırı (varsa)
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

                        const ozelIsteklerData = getOzelIsteklerFromAlisYeri(reservation);
                        
                        if (reservation.notlar || ozelIsteklerData) {
                          rows.push(
                            <TableRow key={`notes-${reservation.id}`} className="bg-gray-50 border-b border-black">
                              <TableCell colSpan={12} className="p-0">
                                <div className="flex h-1">
                                  <div className="w-1/2 border-r border-gray-300 flex items-center px-1">
                                    {reservation.notlar ? (
                                      <div className="flex items-center gap-1">
                                        <div className="w-1 h-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                                        <span className="text-sm font-medium text-blue-800">Notlar:</span>
                                        <span className="text-sm text-blue-700 truncate">{reservation.notlar}</span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-gray-400">Notlar: -</span>
                                    )}
                                  </div>
                                  <div className="w-1/2 flex items-center px-1">
                                    {ozelIsteklerData ? (
                                      <div className="flex items-center gap-1">
                                        <div className="w-1 h-1 bg-red-500 rounded-full flex-shrink-0"></div>
                                        <span className="text-sm font-medium text-red-800">Özel İstekler:</span>
                                        <span className="text-sm text-red-700 truncate">{ozelIsteklerData}</span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-gray-400">Özel İstekler: -</span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        } else {
                          // Notları olmayan rezervasyonlar için ayırıcı çizgi
                          rows.push(
                            <TableRow key={`separator-${reservation.id}`} className="border-b border-black">
                              <TableCell colSpan={12} className="p-0 h-1"></TableCell>
                            </TableRow>
                          );
                        }
                      });

                      return rows;
                    })()}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))      )}
      </div> {/* Print Content Container Sonu */}

      {/* Reservation Detail Modal */}
      {selectedReservation && (
        <RezervasyonDetay reservation={selectedReservation} onClose={() => setSelectedReservation(null)} />
      )}      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1cm;
            size: A4 landscape;
          }
          
          /* Tüm sayfayı gizle */
          body * {
            visibility: hidden !important;
          }
          
          /* Sadece print içeriğini göster */
          #print-content,
          #print-content * {
            visibility: visible !important;
          }
          
          /* Print alanını tam sayfa yap */
          #print-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 1rem !important;
            overflow: visible !important;
            background: white !important;
          }
          
          /* Container ayarları */
          .container {
            max-width: none !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Print header düzenle */
          #print-content .border-b-2 {
            display: flex !important;
            flex-direction: column !important;
            margin-bottom: 1rem !important;
            padding-bottom: 0.5rem !important;
            border-bottom: 2px solid #333 !important;
          }
          
          #print-content .flex.justify-between {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            margin-bottom: 0.5rem !important;
          }
          
          #print-content .flex.items-center img {
            height: 50px !important;
            width: auto !important;
          }
          
          #print-content h1 {
            font-size: 20px !important;
            font-weight: bold !important;
            margin: 0.5rem 0 !important;
            text-align: center !important;
          }
          
          #print-content h2 {
            font-size: 16px !important;
            font-weight: bold !important;
            margin: 0 !important;
          }
          
          #print-content .text-center {
            text-align: center !important;
          }
          
          /* Kaydırma çubuklarını kaldır */
          #print-content .overflow-x-auto {
            overflow: visible !important;
          }
          
          /* Card düzenlemeleri */
          #print-content .card {
            box-shadow: none !important;
            border: 1px solid #666 !important;
            margin-bottom: 1rem !important;
            page-break-inside: avoid !important;
            background: white !important;
          }
          
          /* Card header */
          #print-content .card-header {
            background-color: #f5f5f5 !important;
            padding: 0.5rem !important;
            border-bottom: 1px solid #666 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          
          #print-content .card-header h3 {
            font-size: 14px !important;
            font-weight: bold !important;
            margin: 0 !important;
            display: flex !important;
            align-items: center !important;
            gap: 0.5rem !important;
          }
          
          /* Badge düzenlemeleri */
          #print-content .badge {
            font-size: 10px !important;
            padding: 2px 6px !important;
            background-color: #e5e7eb !important;
            color: #374151 !important;
            border-radius: 4px !important;
          }
          
          /* Tablo tam genişlik */
          #print-content table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 10px !important;
            table-layout: fixed !important;
          }
          
          /* Sütun genişlikleri - landscape A4 için optimize */
          #print-content colgroup col:nth-child(1) { width: 5% !important; }   /* Seri */
          #print-content colgroup col:nth-child(2) { width: 6% !important; }   /* Tarih */
          #print-content colgroup col:nth-child(3) { width: 18% !important; }  /* Tur Şablonu */
          #print-content colgroup col:nth-child(4) { width: 12% !important; }  /* Müşteri */
          #print-content colgroup col:nth-child(5) { width: 10% !important; }  /* İletişim */
          #print-content colgroup col:nth-child(6) { width: 10% !important; }  /* Alış Yeri */
          #print-content colgroup col:nth-child(7) { width: 12% !important; }  /* Firma */
          #print-content colgroup col:nth-child(8) { width: 5% !important; }   /* Kişi */
          #print-content colgroup col:nth-child(9) { width: 10% !important; }  /* Ödeme */
          #print-content colgroup col:nth-child(10) { width: 7% !important; }  /* Tutar */
          #print-content colgroup col:nth-child(11) { width: 5% !important; }  /* Alış */
          
          /* Tablo başlıkları */
          #print-content th {
            font-size: 9px !important;
            font-weight: bold !important;
            padding: 4px 2px !important;
            border: 1px solid #333 !important;
            background-color: #f0f0f0 !important;
            text-align: center !important;
            vertical-align: middle !important;
            line-height: 1.2 !important;
          }
          
          /* Tablo hücreleri */
          #print-content td {
            font-size: 8px !important;
            padding: 3px 2px !important;
            border: 1px solid #666 !important;
            line-height: 1.1 !important;
            vertical-align: top !important;
            word-wrap: break-word !important;
            overflow: hidden !important;
          }
          
          /* Satır renklerini düzelt */
          #print-content tbody tr {
            background-color: white !important;
          }
          
          #print-content tbody tr:nth-child(even) {
            background-color: #fafafa !important;
          }
          
          /* Urgent satırları */
          #print-content tbody tr.bg-red-50 {
            background-color: #fef2f2 !important;
            border-left: 3px solid #dc2626 !important;
          }
          
          /* Icon boyutları */
          #print-content svg {
            width: 8px !important;
            height: 8px !important;
            flex-shrink: 0 !important;
          }
          
          /* Text boyutları */
          #print-content .text-xs {
            font-size: 7px !important;
          }
          
          #print-content .text-sm {
            font-size: 8px !important;
          }
          
          /* Notlar satırını gizle */
          #print-content tr[class*="notes-"],
          #print-content tr[class*="separator-"] {
            display: none !important;
          }
          
          /* Print utility sınıfları */
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .hidden.print\\:block {
            display: block !important;
          }
          
          /* Color adjustments */
          * {
            color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          /* Sayfa kırılımları */
          #print-content .card {
            page-break-inside: avoid !important;
          }
          
          /* Badge renkleri print için */
          #print-content .bg-green-100 {
            background-color: #dcfce7 !important;
            color: #166534 !important;
          }
          
          #print-content .bg-yellow-100 {
            background-color: #fef3c7 !important;
            color: #92400e !important;
          }
          
          #print-content .bg-blue-100 {
            background-color: #dbeafe !important;
            color: #1e40af !important;
          }
          
          #print-content .bg-red-100 {
            background-color: #fee2e2 !important;
            color: #dc2626 !important;
          }
        }
      `}</style>
    </div>
  )
}
