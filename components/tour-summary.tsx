"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Expense {
  id: string;
  type: string;
  name: string;
  amount: string | number;
  currency: string;
  details?: string;
  isIncludedInPrice?: boolean;
  rehberInfo?: string;
  transferType?: string;
  transferPerson?: string;
  acentaName?: string;
  provider?: string;
  description?: string;
  date?: string | Date;
  category?: string;
}

interface Activity {
  name: string;
  date?: string | Date;
  duration?: string;
  price?: number;
  currency?: string;
  participants?: number;
  activityId?: string;
}

interface AdditionalCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  idNumber?: string;
  address?: string;
}

interface TourSummaryProps {
  formData: {
    serialNumber?: string;
    tourName?: string;
    tourDate?: string | Date;
    tourEndDate?: string | Date;
    numberOfPeople?: number;
    numberOfChildren?: number;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerIdNumber?: string;
    customerAddress?: string;
    nationality?: string;
    referralSource?: string;
    additionalCustomers?: AdditionalCustomer[];
    pricePerPerson?: number | string;
    totalPrice?: number | string;
    currency?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    partialPaymentAmount?: number | string;
    partialPaymentCurrency?: string;
    notes?: string;
    expenses?: Expense[];
    activities?: Activity[];
    destinationId?: string;
    destinationName?: string; // Destinasyon adı eklendi
    selectedTourId?: string; // Seçilen tur ID'si
    selectedTourName?: string; // Seçilen tur adı
  };
  calculateTotalExpensesByCurrency?: (expenses: Expense[]) => Record<string, number>;
}

const formatDate = (date: string | Date | undefined) => {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("tr-TR");
};

export function TourSummary({ formData, calculateTotalExpensesByCurrency }: TourSummaryProps) {
  if (!formData) return null;
  const {
    serialNumber,
    tourName,
    tourDate,
    tourEndDate,
    numberOfPeople,
    numberOfChildren,
    customerName,
    customerPhone,
    customerEmail,
    customerIdNumber,
    customerAddress,
    nationality,
    referralSource,
    additionalCustomers = [],
    pricePerPerson,
    totalPrice,
    currency,
    paymentStatus,
    paymentMethod,
    partialPaymentAmount,
    partialPaymentCurrency,
    notes,
    expenses = [],
    activities = [],
    destinationId,
    destinationName, // Destinasyon adı değişkeni eklendi
    selectedTourId,
    selectedTourName, // Seçilen tur adı
  } = formData;

  const totalExpensesByCurrency = calculateTotalExpensesByCurrency
    ? calculateTotalExpensesByCurrency(expenses)
    : {};

  const paymentStatusMap: Record<string, string> = {
    pending: "Beklemede",
    partial: "Kısmi Ödeme",
    completed: "Tamamlandı",
    refunded: "İade Edildi",
  };
  const paymentMethodMap: Record<string, string> = {
    cash: "Nakit",
    creditCard: "Kredi Kartı",
    bankTransfer: "Banka Transferi",
    other: "Diğer",
  };

  const referralSourceMap: Record<string, string> = {
    website: "İnternet Sitesi",
    hotel: "Otel Yönlendirmesi",
    local_guide: "Hanutçu / Yerel Rehber",
    walk_in: "Kapı Önü Müşterisi",
    repeat: "Tekrar Gelen Müşteri",
    recommendation: "Tavsiye",
    social_media: "Sosyal Medya",
    other: "Diğer",
  };
  
  // Gider kategori türleri için dönüşüm haritası
  const expenseTypeMap: Record<string, string> = {
    accommodation: "Konaklama",
    transportation: "Ulaşım",
    transfer: "Transfer",
    guide: "Rehberlik",
    agency: "Acente",
    porter: "Hanutçu",
    food: "Yemek",
    meal: "Yemek",
    activity: "Aktivite",
    general: "Genel",
    other: "Diğer"
  };

  // Aktivite adı eksikse, activityId ile bul
  const getActivityName = (activity: any) => {
    if (activity.name && activity.name !== "") return activity.name;
    if (activity.activityId && Array.isArray(activities)) {
      const found = activities.find((a: any) => a.id === activity.activityId);
      if (found && found.name) return found.name;
    }
    return "-";
  };

  // Tur fiyatı (kişi başı fiyat * kişi sayısı) kendi para biriminde
  const tourTotals: Record<string, number> = {};
  if (currency && Number(pricePerPerson) && Number(numberOfPeople)) {
    tourTotals[currency] = (Number(pricePerPerson) || 0) * (Number(numberOfPeople) || 0);
  }
  // Aktivite toplamları (her biri kendi para biriminde)
  const activityTotals: Record<string, number> = {};
  activities.forEach((activity) => {
    const cur = activity.currency || currency || "TRY";
    const toplam = (Number(activity.price) || 0) * (Number(activity.participants) || 0);
    if (!activityTotals[cur]) activityTotals[cur] = 0;
    activityTotals[cur] += toplam;
  });
  // Tüm toplamları birleştir
  const allTotals: Record<string, number> = { ...tourTotals };
  for (const cur in activityTotals) {
    allTotals[cur] = (allTotals[cur] || 0) + activityTotals[cur];
  }
  // Toplamları string olarak hazırla
  const totalString = Object.entries(allTotals)
    .filter(([_, val]) => val > 0)
    .map(([cur, val]) => `${val} ${cur}`)
    .join(" + ") || "-";

  return (
    <div className="space-y-4">
      {/* 1. Müşteri Bilgileri */}
      <Card>
        <CardHeader className="pb-2 pt-2 mb-0 mt-0"><CardTitle>Müşteri Bilgileri</CardTitle></CardHeader>
        <CardContent className="pt-2 pb-2 mb-0 mt-0">
          <Table>
            <TableBody>
              <TableRow><TableHead>Ad Soyad</TableHead><TableCell>{customerName || '-'}</TableCell></TableRow>
              <TableRow><TableHead>Telefon</TableHead><TableCell>{customerPhone || '-'}</TableCell></TableRow>
              <TableRow><TableHead>E-posta</TableHead><TableCell>{customerEmail || '-'}</TableCell></TableRow>
              <TableRow><TableHead>T.C./Pasaport No</TableHead><TableCell>{customerIdNumber || '-'}</TableCell></TableRow>
              <TableRow><TableHead>Adres</TableHead><TableCell>{customerAddress || '-'}</TableCell></TableRow>
              <TableRow><TableHead>Uyruk</TableHead><TableCell>{nationality || '-'}</TableCell></TableRow>
              <TableRow><TableHead>Referans Kaynağı</TableHead><TableCell>{referralSourceMap[referralSource || ''] || referralSource || '-'}</TableCell></TableRow>
            </TableBody>
          </Table>
          {additionalCustomers.length > 0 && (
            <div className="mt-2 mb-0">
              <span className="font-semibold">Ek Katılımcılar:</span>
              <Table className="mt-1 mb-0">
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>E-posta</TableHead>
                    <TableHead>T.C./Pasaport No</TableHead>
                    <TableHead>Adres</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {additionalCustomers.map((c) => (
                    <TableRow key={c.id} className="h-8">
                      <TableCell className="py-1 px-2">{c.name || '-'}</TableCell>
                      <TableCell className="py-1 px-2">{c.phone || '-'}</TableCell>
                      <TableCell className="py-1 px-2">{c.email || '-'}</TableCell>
                      <TableCell className="py-1 px-2">{c.idNumber || '-'}</TableCell>
                      <TableCell className="py-1 px-2">{c.address || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Tur Detayları */}
      <Card>
        <CardHeader className="pb-2 pt-2 mb-0 mt-0"><CardTitle>Tur Detayları</CardTitle></CardHeader>
        <CardContent className="pt-2 pb-2 mb-0 mt-0">
          <Table>
            <TableBody>
              <TableRow><TableHead>Seri No</TableHead><TableCell>{serialNumber || '-'}</TableCell></TableRow>
              <TableRow><TableHead>Tur Kaydını Oluşturan Kişi</TableHead><TableCell className="font-medium">{tourName || '-'}</TableCell></TableRow>
              <TableRow><TableHead>Başlangıç Tarihi</TableHead><TableCell>{formatDate(tourDate)}</TableCell></TableRow>
              <TableRow><TableHead>Bitiş Tarihi</TableHead><TableCell>{formatDate(tourEndDate)}</TableCell></TableRow>
              <TableRow><TableHead>Kişi Sayısı</TableHead><TableCell>{numberOfPeople || 0}</TableCell></TableRow>
              <TableRow><TableHead>Çocuk Sayısı</TableHead><TableCell>{numberOfChildren || 0}</TableCell></TableRow>
              <TableRow><TableHead>Destinasyon</TableHead><TableCell className="font-medium">{destinationName || '-'}</TableCell></TableRow>
              <TableRow><TableHead>Tur Bilgisi</TableHead><TableCell className="font-medium">{selectedTourName || '-'}</TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 3. Giderler */}
      <Card>
        <CardHeader className="pb-2 pt-2 mb-0 mt-0"><CardTitle>Giderler</CardTitle></CardHeader>
        <CardContent className="pt-2 pb-2 mb-0 mt-0">
          {expenses.length === 0 ? (
            <div className="text-muted-foreground">Gider eklenmemiş.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="py-1 px-2">Gider Tipi</TableHead>
                    <TableHead className="py-1 px-2">Açıklama</TableHead>
                    <TableHead className="py-1 px-2">Tutar</TableHead>
                    <TableHead className="py-1 px-2">Para Birimi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense, idx) => (
                    <TableRow key={idx} className="h-8">
                      <TableCell className="py-1 px-2">{expenseTypeMap[expense.type] || expense.type}</TableCell>
                      <TableCell className="py-1 px-2">{expense.name}</TableCell>
                      <TableCell className="py-1 px-2">{expense.amount}</TableCell>
                      <TableCell className="py-1 px-2">{expense.currency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalExpensesByCurrency && Object.keys(totalExpensesByCurrency).length > 0 && (
                <div className="mt-1">
                  <span className="font-semibold">Toplam Giderler: </span>
                  {Object.entries(totalExpensesByCurrency).map(([cur, total]) => (
                    <span key={cur}>{total} {cur} </span>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 4. Aktiviteler */}
      <Card>
        <CardHeader className="pb-2 pt-2 mb-0 mt-0"><CardTitle>Aktiviteler</CardTitle></CardHeader>
        <CardContent className="pt-2 pb-2 mb-0 mt-0">
          {activities.length === 0 ? (
            <div className="text-muted-foreground">Aktivite eklenmemiş.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="py-1 px-2">Aktivite Adı</TableHead>
                  <TableHead className="py-1 px-2">Tarih</TableHead>
                  <TableHead className="py-1 px-2">Süre</TableHead>
                  <TableHead className="py-1 px-2">Katılımcı Sayısı</TableHead>
                  <TableHead className="py-1 px-2">Birim Ücret</TableHead>
                  <TableHead className="py-1 px-2">Toplam Ücret</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity, idx) => {
                  let katilimci;
                  let participants;
                  
                  // "Tüm tur katılımcıları" seçiliyse, katılımcı sayısını turdan al
                  if (activity.participantsType === "all") {
                    participants = Number(formData.numberOfPeople) || 0;
                    katilimci = String(participants) + ' (Tüm katılımcılar)';
                  } else {
                    participants = Number(activity.participants) || 0;
                    katilimci = String(participants);
                  }
                  
                  const birimUcret = activity.price ? `${activity.price} ${activity.currency || ''}` : '-';
                  const toplamUcret = activity.price ? `${Number(activity.price) * participants} ${activity.currency || ''}` : '-';
                  return (
                    <TableRow key={idx} className="h-8">
                      <TableCell className="py-1 px-2">{getActivityName(activity)}</TableCell>
                      <TableCell className="py-1 px-2">{formatDate(activity.date)}</TableCell>
                      <TableCell className="py-1 px-2">{activity.duration || '-'}</TableCell>
                      <TableCell className="py-1 px-2">{katilimci}</TableCell>
                      <TableCell className="py-1 px-2">{birimUcret}</TableCell>
                      <TableCell className="py-1 px-2">{toplamUcret}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 5. Ödeme Bilgileri */}
      <Card>
        <CardHeader className="pb-2 pt-2 mb-0 mt-0"><CardTitle>Ödeme Bilgileri</CardTitle></CardHeader>
        <CardContent className="pt-2 pb-2 mb-0 mt-0">
          <Table>
            <TableBody>
              <TableRow><TableHead>Tur Fiyatı</TableHead><TableCell>{numberOfPeople && pricePerPerson ? Number(pricePerPerson) * Number(numberOfPeople) : '-'} {currency || ''}</TableCell></TableRow>
              {activities.length > 0 && (
                <TableRow>
                  <TableHead>Aktiviteler</TableHead>
                  <TableCell>
                    {Object.entries(activityTotals)
                      .filter(([_, val]) => val > 0)
                      .map(([cur, val]) => `${val} ${cur}`)
                      .join(" + ") || "-"}
                  </TableCell>
                </TableRow>
              )}
              <TableRow><TableHead>Toplam Fiyat</TableHead><TableCell>{totalString}</TableCell></TableRow>
              <TableRow><TableHead>Ödeme Durumu</TableHead><TableCell>{paymentStatusMap[paymentStatus || ''] || '-'}</TableCell></TableRow>
              <TableRow><TableHead>Ödeme Yöntemi</TableHead><TableCell>{paymentMethodMap[paymentMethod || ''] || '-'}</TableCell></TableRow>
              <TableRow><TableHead>Kısmi Ödeme</TableHead><TableCell>{partialPaymentAmount || '-'} {partialPaymentCurrency || ''}</TableCell></TableRow>
            </TableBody>
          </Table>
          {notes && (
            <div className="mt-1">
              <span className="font-semibold">Notlar:</span>
              <div className="whitespace-pre-line">{notes}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TourSummary;
