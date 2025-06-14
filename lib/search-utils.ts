// Tarih formatını standartlaştır (YYYY-MM-DD)
const standardizeDate = (dateStr: string): string => {
  // GG.AA.YYYY formatını kontrol et
  const ddmmyyyyRegex = /^(\d{2})[.-](\d{2})[.-](\d{4})$/
  const ddmmyyyyMatch = dateStr.match(ddmmyyyyRegex)

  if (ddmmyyyyMatch) {
    return `${ddmmyyyyMatch[3]}-${ddmmyyyyMatch[2]}-${ddmmyyyyMatch[1]}`
  }

  // YYYY-MM-DD formatını kontrol et
  const yyyymmddRegex = /^(\d{4})[.-](\d{2})[.-](\d{2})$/
  const yyyymmddMatch = dateStr.match(yyyymmddRegex)

  if (yyyymmddMatch) {
    return `${yyyymmddMatch[1]}-${yyyymmddMatch[2]}-${yyyymmddMatch[3]}`
  }

  // Geçersiz format
  return dateStr
}

// Tarih ile tur arama
export const searchToursByDate = async (toursData: any[], dateStr: string): Promise<any[]> => {
  const standardizedDate = standardizeDate(dateStr)

  // Tarih formatı geçerli değilse boş dizi döndür
  if (standardizedDate === dateStr && !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return []
  }

  // Turları filtrele
  return toursData.filter((tour) => {
    const tourDate = new Date(tour.tourDate).toISOString().split("T")[0]
    return tourDate === standardizedDate
  })
}

// Müşteri adı ile tur arama
export const searchToursByCustomer = async (toursData: any[], customerName: string): Promise<any[]> => {
  const lowerCustomerName = customerName.toLowerCase()

  // Turları filtrele
  return toursData.filter((tour) => {
    return tour.customerName && tour.customerName.toLowerCase().includes(lowerCustomerName)
  })
}

// Seri numarası ile tur arama
export const searchTourBySerialNumber = async (toursData: any[], serialNumber: string): Promise<any | null> => {
  const lowerSerialNumber = serialNumber.toLowerCase()

  // Turu bul
  return (
    toursData.find((tour) => {
      return tour.serialNumber && tour.serialNumber.toLowerCase().includes(lowerSerialNumber)
    }) || null
  )
}

// Müşteri adı ile müşteri arama
export const searchCustomerByName = async (customersData: any[], customerName: string): Promise<any | null> => {
  const lowerCustomerName = customerName.toLowerCase()

  // Müşteriyi bul
  return (
    customersData.find((customer) => {
      return customer.name && customer.name.toLowerCase().includes(lowerCustomerName)
    }) || null
  )
}

