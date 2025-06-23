"use client"

import { useEffect, useState, useRef } from "react"
import { TourPrintView } from "@/components/tour-print-view"
import { getSettings } from "@/lib/db"

export default function PrintTourPage({ params }) {
  const [tourData, setTourData] = useState(null)
  const [companyInfo, setCompanyInfo] = useState({
    name: "Nehir Travel",
    address: "",
    phone: "",
    email: "",
    website: "",
    logo: null,
    footerText: "Bu belge Nehir Travel tarafından düzenlenmiştir."
  })
  const [isLoading, setIsLoading] = useState(true)
  const printAttempted = useRef(false)

  // Verileri yükleme işlemi
  useEffect(() => {
    // LocalStorage'dan tur verilerini al
    const loadTourData = () => {
      try {
        const printData = localStorage.getItem('printTourData');
        console.log('LocalStorage dan alınan veri:', printData);

        if (printData) {
          const parsedData = JSON.parse(printData);
          console.log('Ayrıştırılan veri:', parsedData);

          // Doğrudan parsedData'yı kullan, tour alt nesnesi arama
          // Verileri doğru bir şekilde işleyelim
          const processedData = {
            ...parsedData,
            // Eksik verileri varsa doldur
            destination: parsedData.destination || parsedData.selectedTourDestination || parsedData.destinationName || parsedData.varişYeri,
            tourDetails: parsedData.tourDetails || parsedData.selectedTourDescription || parsedData.description || parsedData.notes,
          };
          
          // Daha kapsamlı veri işleme ve eksik alanları tamamlama
          const finalProcessedData = {
            ...processedData,
            // Tüm ihtimalleri kapsayacak şekilde veri dönüşümü yap
            tourName: processedData.tourName || processedData.selectedTourName || processedData.name || "",
            tourDate: processedData.tourDate || processedData.startDate || processedData.date || new Date().toISOString(),
            numberOfPeople: processedData.numberOfPeople || processedData.adultCount || processedData.adults || 0,
            numberOfChildren: processedData.numberOfChildren || processedData.childCount || processedData.children || 0,
            activities: Array.isArray(processedData.activities) ? processedData.activities.map(act => {
              // Her aktivite için gerekli alanları kontrol et
              return {
                ...act,
                // Aktivite adı
                name: act.name || act.activityName || act.title || "İsimsiz Aktivite",
                // Fiyat
                price: act.price || act.cost || act.amount || 0,
                // Para birimi
                currency: act.currency || processedData.currency || "TRY",
                // Katılımcı türü bilgisi
                participantsType: act.participantsType || (act.useAllTourParticipants || act.allTourParticipants ? "all" : "custom"),
                // Katılımcı sayısı
                participants: act.participants || act.participantCount || 0,
                // Yetişkin ve çocuk sayıları
                adultParticipants: act.adultParticipants || 0,
                childParticipants: act.childParticipants || 0,
              };
            }) : [],
            // Diğer gerekli alanlar varsa ekle
          };
          
          console.log('İşlenmiş tur verileri:', finalProcessedData);
          setTourData(finalProcessedData);
          setIsLoading(false);
        } else {
          console.error("Yazdırma verisi bulunamadı");
          alert("Yazdırma verisi bulunamadı. Lütfen tekrar deneyin.");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Yazdırma verileri ayrıştırılırken hata:", error);
        alert("Yazdırma verileri yüklenirken bir hata oluştu. Lütfen tekrar deneyin.");
        setIsLoading(false);
      }
    }

    // Şirket bilgilerini yükle
    const loadSettings = async () => {
      try {
        const settings = await getSettings()
        if (settings?.companyInfo) {
          setCompanyInfo(prev => ({
            ...prev,
            ...settings.companyInfo
          }))
        }
      } catch (error) {
        console.error("Ayarlar yüklenirken hata:", error)
      }
    }
    
    // Verileri yükle - sadece bir kez çalışır
    loadTourData()
    loadSettings()
  }, [])

  // Yazdırma işlemi için ayrı bir useEffect
  useEffect(() => {
    // Sadece veriler yüklendiğinde ve daha önce yazdırma denemesi yapılmadıysa çalışır
    if (!isLoading && tourData && !printAttempted.current) {
      printAttempted.current = true // Sadece bir kez yazdırma denemesi yap
      
      const timer = setTimeout(() => {
        window.print()
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [isLoading, tourData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Yazdırma Verisi Yükleniyor...</h1>
          <p>Lütfen bekleyin...</p>
        </div>
      </div>
    )
  }
  
  if (!tourData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Yazdırma Verisi Bulunamadı</h1>
          <p>Lütfen ana sayfaya dönün ve tekrar deneyin.</p>
          <button 
            onClick={() => window.close()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Pencereyi Kapat
          </button>
        </div>
      </div>
    )
  }

  return <TourPrintView tour={tourData} companyInfo={companyInfo} />
}
