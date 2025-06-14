"use client"

import { formatCurrency, formatDate } from "@/lib/data-utils"

interface ActivityParticipants {
  adults: number;
  children: number;
  total: number;
}

// Aktivite katılımcı bilgilerini güvenli bir şekilde hesaplayan yardımcı fonksiyon
function getActivityParticipantInfo(activity: any, tour: any): ActivityParticipants {
  // "Tüm tur katılımcıları" seçeneği işaretlenmişse
  if (activity.participantsType === "all" || activity.useAllTourParticipants || activity.allTourParticipants) {
    const adults = Number(tour.numberOfPeople) || 0;
    const children = Number(tour.numberOfChildren) || 0;
    return {
      adults,
      children,
      total: adults + children
    };
  } 
  // Aktivitede özel katılımcı sayısı belirtilmişse
  else if (activity.participants && Number(activity.participants) > 0) {
    return {
      adults: Number(activity.participants),
      children: 0,
      total: Number(activity.participants)
    };
  } 
  // Aktivitede yetişkin ve çocuk ayrı ayrı belirtilmişse
  else {
    const adults = Number(activity.adultParticipants) || 0;
    const children = Number(activity.childParticipants) || 0;
    return {
      adults,
      children,
      total: adults + children
    };
  }
}

export function TourPrintView({ tour, companyInfo = {
  name: "PassionisTravel",
  address: "",
  phone: "",
  email: "",
  website: "",
  logo: null,
  footerText: "Bu belge PassionisTravel tarafından düzenlenmiştir."
} }) {
  if (!tour) return null
  
  const currentDate = new Date()
  const formattedDate = formatDate(currentDate)

  return (
    <div className="p-4 max-w-4xl mx-auto bg-white print:p-0">
      <div className="flex justify-between items-center mb-3">
        {/* Sol tarafta şirket logosu */}
        <div className="flex-shrink-0">
          {companyInfo.logo ? (
            <img 
              src={companyInfo.logo} 
              alt="Şirket Logosu" 
              className="h-16 object-contain" 
            />
          ) : (
            <h1 className="text-2xl font-bold text-teal-600">{companyInfo.name}</h1>
          )}
        </div>
        
        {/* Sağ tarafta tarih */}
        <div className="text-right">
          <p className="text-gray-600 text-sm">Tarih: {formattedDate}</p>
          <p className="text-gray-600 text-sm">Belge No: {tour.serialNumber}</p>
        </div>
      </div>
      
      <div className="text-center mb-3">
        <h1 className="text-xl font-bold text-teal-600">Tur Bilgileri <span className="text-sm font-medium text-gray-500">(Tour Information)</span></h1>
      </div>

      <div className="mb-3">
        <h2 className="text-lg font-semibold border-b pb-1 mb-2">
          Tur Detayları <span className="text-xs font-medium text-gray-500">(Tour Details)</span>
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-gray-600 text-sm">Seri No: <span className="text-xs text-gray-500">(Ref No)</span></p>
            <p className="font-medium">{tour.serialNumber}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Tur Kaydını Oluşturan Kişi: <span className="text-xs text-gray-500">(Created By)</span></p>
            <p className="font-medium">{tour.tourName || tour.selectedTourName || "-"}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Başlangıç Tarihi: <span className="text-xs text-gray-500">(Start Date)</span></p>
            <p className="font-medium">{formatDate(tour.tourDate)}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Bitiş Tarihi: <span className="text-xs text-gray-500">(End Date)</span></p>
            <p className="font-medium">{tour.tourEndDate ? formatDate(tour.tourEndDate) : "-"}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Kişi Sayısı: <span className="text-xs text-gray-500">(Number of Participants)</span></p>
            <p className="font-medium">
              {tour.numberOfPeople} Yetişkin <span className="text-xs text-gray-500">(Adult)</span>, {tour.numberOfChildren} Çocuk <span className="text-xs text-gray-500">(Child)</span>
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Varış Yeri: <span className="text-xs text-gray-500">(Destination)</span></p>
            <p className="font-medium">{tour.destination || tour.selectedTourDestination || tour.destinationName || tour.varişYeri || "-"}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Tur Bilgileri: <span className="text-xs text-gray-500">(Tour Details)</span></p>
            <p className="font-medium">
              {tour.selectedTourName || (tour.selectedTour && tour.selectedTour.name) || tour.tourDetails || tour.selectedTourDescription || tour.description || tour.notes || "-"}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <h2 className="text-lg font-semibold border-b pb-1 mb-2">
          Müşteri Bilgileri <span className="text-xs font-medium text-gray-500">(Customer Information)</span>
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-gray-600 text-sm">Ad Soyad: <span className="text-xs text-gray-500">(Full Name)</span></p>
            <p className="font-medium">{tour.customerName}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Telefon: <span className="text-xs text-gray-500">(Phone)</span></p>
            <p className="font-medium">{tour.customerPhone}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">E-posta: <span className="text-xs text-gray-500">(Email)</span></p>
            <p className="font-medium">{tour.customerEmail}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">TC/Pasaport No: <span className="text-xs text-gray-500">(ID/Passport No)</span></p>
            <p className="font-medium">{tour.customerIdNumber}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Vatandaşlık/Ülke: <span className="text-xs text-gray-500">(Citizenship/Country)</span></p>
            <p className="font-medium">{tour.customerCitizenship || tour.citizenship || tour.nationality || "-"}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Müşteri Referans Kaynağı: <span className="text-xs text-gray-500">(Referral Source)</span></p>
            <p className="font-medium">
              {(() => {
                // Referans kaynağı Türkçe çeviri haritası
                const referralSourceMap = {
                  social_media: "Sosyal Medya",
                  website: "Web Sitesi",
                  online_ad: "Online Reklam",
                  friend_referral: "Arkadaş Tavsiyesi",
                  repeat_customer: "Tekrar Eden Müşteri",
                  travel_agency: "Seyahat Acentası",
                  hotel: "Otel",
                  direct: "Doğrudan Başvuru",
                  other: "Diğer"
                };
                
                const referralSource = tour.referralSource || tour.referralSourceName || tour.nereden || "-";
                return referralSourceMap[referralSource] || referralSource;
              })()}
            </p>
          </div>
        </div>

        {tour.additionalCustomers?.length > 0 && (
          <div className="mt-2">
            <h3 className="font-medium mb-1 text-sm">
              Ek Katılımcılar <span className="text-xs text-gray-500">(Additional Participants)</span>
            </h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-1 text-left">Ad Soyad <span className="text-xs text-gray-500">(Name)</span></th>
                  <th className="border p-1 text-left">Telefon <span className="text-xs text-gray-500">(Phone)</span></th>
                  <th className="border p-1 text-left">TC/Pasaport No <span className="text-xs text-gray-500">(ID/Passport)</span></th>
                </tr>
              </thead>
              <tbody>
                {tour.additionalCustomers.map((customer, index) => (
                  <tr key={customer.id}>
                    <td className="border p-1">{customer.name}</td>
                    <td className="border p-1">{customer.phone}</td>
                    <td className="border p-1">{customer.idNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aktiviteler - Müşteriye gösterilecek */}
      {tour.activities?.length > 0 && (
        <div className="mb-3">
          <h2 className="text-lg font-semibold border-b pb-1 mb-2">
            Aktiviteler <span className="text-xs font-medium text-gray-500">(Activities)</span>
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-1 text-center">
                  <div>Aktivite</div>
                  <div className="text-xs text-gray-500">(Activity)</div>
                </th>
                <th className="border p-1 text-center">
                  <div>Tarih</div>
                  <div className="text-xs text-gray-500">(Date)</div>
                </th>
                <th className="border p-1 text-center">
                  <div>Süre</div>
                  <div className="text-xs text-gray-500">(Duration)</div>
                </th>
                <th className="border p-1 text-center">
                  <div>Katılımcı Sayısı</div>
                  <div className="text-xs text-gray-500">(Participants)</div>
                </th>
                <th className="border p-1 text-center">
                  <div>Birim Fiyat</div>
                  <div className="text-xs text-gray-500">(Unit Price)</div>
                </th>
                <th className="border p-1 text-center">
                  <div>Toplam Fiyat</div>
                  <div className="text-xs text-gray-500">(Total Price)</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {tour.activities.map((activity) => {
                const participantInfo = getActivityParticipantInfo(activity, tour);
                const price = Number(activity.price) || 0;
                const totalPrice = participantInfo.total > 0 ? price * participantInfo.total : price;

                return (
                  <tr key={activity.id}>
                    <td className="border p-1">{activity.name}</td>
                    <td className="border p-1">{activity.date ? formatDate(activity.date) : "-"}</td>
                    <td className="border p-1">{activity.duration}</td>
                    <td className="border p-1 text-center">
                      {participantInfo.total > 0 ? (
                        <>
                          {participantInfo.adults > 0 && `${participantInfo.adults} Yetişkin`}
                          {participantInfo.adults > 0 && participantInfo.children > 0 && ', '}
                          {participantInfo.children > 0 && `${participantInfo.children} Çocuk`}
                        </>
                      ) : "-"}
                    </td>
                    <td className="border p-1 text-right">{formatCurrency(price, activity.currency)}</td>
                    <td className="border p-1 text-right">{formatCurrency(totalPrice, activity.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-3">
        <h2 className="text-lg font-semibold border-b pb-1 mb-2">
          Ödeme Bilgileri <span className="text-xs font-medium text-gray-500">(Payment Information)</span>
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-gray-600 text-sm">Tur Fiyatı: <span className="text-xs text-gray-500">(Tour Price)</span></p>
            <p className="font-medium">{formatCurrency(Number(tour.numberOfPeople) * Number(tour.pricePerPerson), tour.currency)}</p>
          </div>
          {tour.activities?.length > 0 ? (
            <div>
              <p className="text-gray-600 text-sm">Aktivite Toplamı: <span className="text-xs text-gray-500">(Activities Total)</span></p>
              <p className="font-medium">
                {formatCurrency(
                  tour.activities.reduce((total, activity) => {
                    const participantInfo = getActivityParticipantInfo(activity, tour);
                    const price = Number(activity.price) || 0;
                    return total + (participantInfo.total > 0 ? price * participantInfo.total : price);
                  }, 0),
                  tour.currency
                )}
              </p>
            </div>
          ) : <div></div>}
          <div>
            <p className="text-gray-600 text-sm">Genel Toplam: <span className="text-xs text-gray-500">(Grand Total)</span></p>
            <p className="font-bold">
              {formatCurrency(
                (Number(tour.numberOfPeople) * Number(tour.pricePerPerson)) + 
                (tour.activities?.length > 0 ? 
                  tour.activities.reduce((total, activity) => {
                    const participantInfo = getActivityParticipantInfo(activity, tour);
                    const price = Number(activity.price) || 0;
                    return total + (participantInfo.total > 0 ? price * participantInfo.total : price);
                  }, 0) : 0
                ),
                tour.currency
              )}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Ödeme Durumu: <span className="text-xs text-gray-500">(Payment Status)</span></p>
            <p className="font-medium">
              {tour.paymentStatus === "pending"
                ? "Beklemede"
                : tour.paymentStatus === "partial"
                  ? "Kısmi Ödeme"
                  : tour.paymentStatus === "completed"
                    ? "Tamamlandı"
                    : tour.paymentStatus === "refunded"
                      ? "İade Edildi"
                      : "Bilinmiyor"}
              <span className="text-xs text-gray-500 ml-1">
                {tour.paymentStatus === "pending"
                  ? "(Pending)"
                  : tour.paymentStatus === "partial"
                    ? "(Partial Payment)"
                    : tour.paymentStatus === "completed"
                      ? "(Completed)"
                      : tour.paymentStatus === "refunded"
                        ? "(Refunded)"
                        : "(Unknown)"}
              </span>
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Ödeme Yöntemi: <span className="text-xs text-gray-500">(Payment Method)</span></p>
            <p className="font-medium">
              {tour.paymentMethod === "cash"
                ? "Nakit"
                : tour.paymentMethod === "creditCard"
                  ? "Kredi Kartı"
                  : tour.paymentMethod === "bankTransfer"
                    ? "Banka Transferi"
                    : tour.paymentMethod === "other"
                      ? "Diğer"
                      : "Bilinmiyor"}
              <span className="text-xs text-gray-500 ml-1">
                {tour.paymentMethod === "cash"
                  ? "(Cash)"
                  : tour.paymentMethod === "creditCard"
                    ? "(Credit Card)"
                    : tour.paymentMethod === "bankTransfer"
                      ? "(Bank Transfer)"
                      : tour.paymentMethod === "other"
                        ? "(Other)"
                        : "(Unknown)"}
              </span>
            </p>
          </div>
          <div></div> {/* Boş div - grid düzenini korumak için */}

          {tour.paymentStatus === "partial" && (
            <>
              <div>
                <p className="text-gray-600 text-sm">Yapılan Ödeme: <span className="text-xs text-gray-500">(Paid Amount)</span></p>
                <p className="font-medium">{formatCurrency(tour.partialPaymentAmount, tour.partialPaymentCurrency)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Kalan Ödeme: <span className="text-xs text-gray-500">(Remaining Amount)</span></p>
                <p className="font-bold">
                  {formatCurrency(tour.totalPrice - tour.partialPaymentAmount, tour.currency)}
                </p>
              </div>
              <div></div> {/* Boş div - grid düzenini korumak için */}
            </>
          )}
        </div>
      </div>

      {tour.notes && (
        <div className="mb-3">
          <h2 className="text-lg font-semibold border-b pb-1 mb-2">Notlar</h2>
          <p className="whitespace-pre-line text-sm">{tour.notes}</p>
        </div>
      )}

      <div className="mt-8 text-center text-xs text-gray-500 pt-2 border-t">
        Bu belge {companyInfo.name || "PassionisTravel"} tarafından düzenlenmiştir. ({companyInfo.address ? `Adres: ${companyInfo.address}` : ""}{companyInfo.phone ? `, Tel: ${companyInfo.phone}` : ""}{companyInfo.email ? `, E-posta: ${companyInfo.email}` : ""}{companyInfo.website ? `, Web: ${companyInfo.website}` : ""})
      </div>
    </div>
  )
}

