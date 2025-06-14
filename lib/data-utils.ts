// Yerel depolamadan veri yükleme
export const loadSavedData = async () => {
  try {
    // Finansal verileri yükle
    const savedFinancialData = localStorage.getItem("financialData")
    const financialData = savedFinancialData ? JSON.parse(savedFinancialData) : []

    // Tur verilerini yükle
    const savedToursData = localStorage.getItem("toursData")
    const toursData = savedToursData ? JSON.parse(savedToursData) : []

    // Müşteri verilerini yükle
    const savedCustomerData = localStorage.getItem("customerData")
    const customerData = savedCustomerData ? JSON.parse(savedCustomerData) : []

    // Şirket bilgilerini yükle
    const savedCompanyInfo = localStorage.getItem("companyInfo")
    const companyInfo = savedCompanyInfo
      ? JSON.parse(savedCompanyInfo)
      : {
          name: "PassionisTravel",
          address: "Örnek Mahallesi, Örnek Caddesi No:123, İstanbul",
          phone: "+90 212 123 4567",
          email: "info@passionistour.com",
          taxId: "1234567890",
          website: "www.passionistour.com",
        }

    // Tercih ayarlarını yükle
    const savedPreferences = localStorage.getItem("preferences")
    const preferences = savedPreferences
      ? JSON.parse(savedPreferences)
      : {
          darkMode: false,
          notifications: true,
          autoBackup: true,
          language: "tr",
          defaultCurrency: "TRY",
          dateFormat: "DD.MM.YYYY",
          autoCalculateTax: true,
          taxRate: "18",
          showPricesWithTax: true,
          roundPrices: true,
        }

    return { financialData, toursData, customerData, companyInfo, preferences }
  } catch (error) {
    console.error("Veri yükleme hatası:", error)
    return { financialData: [], toursData: [], customerData: [], companyInfo: {}, preferences: {} }
  }
}

// Yerel depolamaya veri kaydetme
export const saveToLocalStorage = async (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (error) {
    console.error("Veri kaydetme hatası:", error)
    return false
  }
}

// Verileri temizleme
export const clearData = async () => {
  try {
    localStorage.removeItem("financialData")
    localStorage.removeItem("toursData")
    localStorage.removeItem("customerData")
    return true
  } catch (error) {
    console.error("Veri temizleme hatası:", error)
    return false
  }
}

// Para birimi formatı
export const formatCurrency = (amount, currency = "TRY") => {
  const currencySymbols = {
    TRY: "₺",
    USD: "$",
    EUR: "€",
    GBP: "£",
  }

  const symbol = currencySymbols[currency] || currency
  
  // Sayısal değeri güvenli bir şekilde çevir
  let numAmount = 0;
  if (typeof amount === "number") {
    numAmount = amount;
  } else if (typeof amount === "string") {
    numAmount = parseFloat(amount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
  }

  // Tam sayılar için ondalık kısmı gösterme
  const fractionDigits = Number.isInteger(numAmount) ? 0 : 2;
  const formattedAmount = numAmount.toLocaleString("tr-TR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  });

  // Ekran görüntüsündeki formata uygun olarak düzenlenmiş format
  return `${formattedAmount} ${symbol}`;
}

// Para birimi gruplandırma ve formatlama
export const formatCurrencyGroups = (currencyGroups) => {
  if (!currencyGroups || Object.keys(currencyGroups).length === 0) {
    return "-";
  }
  
  // Filtrelenmiş değerler
  const filteredEntries = Object.entries(currencyGroups)
    .filter(([_, amount]) => {
      // Sayısal değere dönüştür
      const numAmount = typeof amount === "number" ? amount : 
                      (typeof amount === "string" ? parseFloat(amount.replace(/[^\d.,]/g, '').replace(',', '.')) : 0);
      return !isNaN(numAmount) && numAmount !== 0;
    });
    
  // Eğer tek para birimi varsa <br /> kullanmayız
  if (filteredEntries.length === 1) {
    const [currency, amount] = filteredEntries[0];
    return formatCurrency(amount, currency);
  }
  
  // Birden fazla para birimi varsa alt alta göster
  return filteredEntries
    .map(([currency, amount]) => formatCurrency(amount, currency))
    .join("<br />");
}

// Tarih formatı
export const formatDate = (dateString, format = "DD.MM.YYYY") => {
  const date = new Date(dateString)

  if (format === "DD.MM.YYYY") {
    return date.toLocaleDateString("tr-TR")
  } else if (format === "MM/DD/YYYY") {
    return date.toLocaleDateString("en-US")
  } else if (format === "YYYY-MM-DD") {
    return date.toISOString().split("T")[0]
  }

  return date.toLocaleDateString("tr-TR")
}

// Döviz çevirme
export const convertCurrency = (amount, fromCurrency, toCurrency, rates) => {
  if (fromCurrency === toCurrency) {
    return amount
  }

  if (fromCurrency === "TRY" && toCurrency !== "TRY") {
    // TRY'den yabancı para birimine
    const currency = rates.find((r) => r.code === toCurrency)
    if (currency) {
      return amount / currency.selling
    }
    return amount
  }

  if (fromCurrency !== "TRY" && toCurrency === "TRY") {
    // Yabancı para biriminden TRY'ye
    const currency = rates.find((r) => r.code === fromCurrency)
    if (currency) {
      return amount * currency.buying
    }
    return amount
  }

  if (fromCurrency !== "TRY" && toCurrency !== "TRY") {
    // Yabancı para biriminden yabancı para birimine
    const fromRate = rates.find((r) => r.code === fromCurrency)
    const toRate = rates.find((r) => r.code === toCurrency)
    if (fromRate && toRate) {
      // Önce TRY'ye çevir, sonra hedef para birimine
      const tryAmount = amount * fromRate.buying
      return tryAmount / toRate.selling
    }
    return amount
  }

  return amount
}

// Tur giderlerini hesaplayan fonksiyon - Data View ile aynı mantık
export const calculateTourExpenses = (tour: any) => {
  if (!tour || !tour.expenses || !Array.isArray(tour.expenses)) {
    return {};
  }

  return tour.expenses.reduce((acc: Record<string, number>, expense: any) => {
    const currency = expense.currency || tour.currency || "TRY";
    const amount = typeof expense.amount === "string" 
      ? parseFloat(expense.amount.replace(/[^\d.,]/g, '').replace(',', '.'))
      : Number(expense.amount) || 0;
    
    if (!isNaN(amount)) {
      acc[currency] = (acc[currency] || 0) + amount;
    }
    return acc;
  }, {});
}

// Tur toplam tutarını hesaplayan fonksiyon - Data View ile aynı mantık
export const calculateTourTotals = (tour: any) => {
  const totals: Record<string, number> = {};
  
  // Ana tur tutarını ekle
  const tourCurrency = tour.currency || 'TRY';
  const tourTotal = Number(tour.totalPrice) || 0;
  if (tourTotal > 0) {
    totals[tourCurrency] = (totals[tourCurrency] || 0) + tourTotal;
  }
  
  // Aktivitelerin toplamını da ekle (farklı para biriminde olanları ayrı ayrı göster)
  if (Array.isArray(tour.activities)) {
    tour.activities.forEach((act: any) => {
      const actCurrency = act.currency || tourCurrency;
      const actPrice = Number(act.price) || 0;
      let actParticipants = 0;
      
      // Katılımcı sayısını doğru şekilde belirle
      if (act.participantsType === 'all') {
        actParticipants = Number(tour.numberOfPeople) || 0;
      } else {
        actParticipants = Number(act.participants) || 0;
      }
      
      const activityTotal = actPrice * actParticipants;
      if (activityTotal > 0) {
        totals[actCurrency] = (totals[actCurrency] || 0) + activityTotal;
      }
    });
  }
  
  return totals;
}

// Tur karını hesaplayan fonksiyon - Data View ile aynı mantık
export const calculateTourProfit = (tour: any) => {
  const profit: Record<string, number> = {};
  if (!tour) return profit;

  // 1. Gelirleri hesapla
  const totals = calculateTourTotals(tour);
  
  // 2. Giderleri hesapla
  const expenses = calculateTourExpenses(tour);
  
  // 3. Her para birimi için ayrı ayrı kar hesapla
  Object.keys(totals).forEach(currency => {
    const totalRevenue = totals[currency] || 0;
    const totalExpenses = expenses[currency] || 0;
    const profitAmount = totalRevenue - totalExpenses;
    
    if (Math.abs(profitAmount) > 0.01) { // Çok küçük değerleri göz ardı et
      profit[currency] = profitAmount;
    }
  });
  
  // Eğer giderler var ama gelir yok ise, giderleri negatif kar olarak ekle
  Object.keys(expenses).forEach(currency => {
    if (!profit[currency] && expenses[currency] > 0) {
      profit[currency] = -expenses[currency];
    }
  });
  
  return profit;
}
