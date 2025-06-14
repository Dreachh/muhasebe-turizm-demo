"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, calculateTourExpenses } from "@/lib/data-utils"

// Türleri tanımlayalım
interface DataItem {
  id?: string;
  type?: "income" | "expense";
  amount?: number | string;
  currency?: string;
  category?: string;
  date?: string | Date;
  description?: string;
  paymentMethod?: string;
  relatedTourId?: string;
  tourDate?: string | Date;
  tourName?: string;
  totalPrice?: number | string;
  customerName?: string;
  serialNumber?: string;
  [key: string]: any; // Diğer özellikleri de kabul etmek için
}

interface FinancialSummary {
  income: number;
  expense: number;
  tourIncome: number;
  tourExpenses: number;
  companyExpenses: number;
  profit: number;
  totalIncome: number;
  totalExpense: number;
  totalProfit: number;
  balance: number;
}

// Arayüzleri güncelliyorum
interface CurrencyFinancialSummaryProps {
  onCancel?: () => void;
  currency: string;
  financialData: DataItem[];
  toursData: DataItem[];
}

// onCancel fonksiyonu ana sayfaya yönlendirecek şekilde güncellendi
export function CurrencyFinancialSummary({ 
  onCancel = () => { window.location.hash = '#main-dashboard'; }, 
  currency, 
  financialData, 
  toursData 
}: CurrencyFinancialSummaryProps) {
  // Para birimine göre finansal özet hesaplama
  const getFinancialSummaryByCurrency = (cur: string): FinancialSummary => {
    const filterByCurrency = (item: { currency?: string }) => {
      if (cur === 'all') return true;
      return item && item.currency === cur;
    };

    // Gelirler (finansal kayıtlardaki gelirler)
    const income = financialData
      .filter(item => item && item.type === "income" && filterByCurrency(item))
      .reduce((sum, item) => {
        const amount = Number.parseFloat(item?.amount?.toString() || '0') || 0;
        return sum + amount;
      }, 0);
    
    // Giderler (finansal kayıtlardaki tüm giderler, tur giderleri dahil)
    // Bu değişken artık sadece tabloda detaylı görüntüleme için kullanılacak
    const expense = financialData
      .filter(item => item && item.type === "expense" && filterByCurrency(item))
      .reduce((sum, item) => {
        const amount = Number.parseFloat(item?.amount?.toString() || '0') || 0;
        return sum + amount;
      }, 0);
    
    // Tur giderleri (Data View ile tutarlı hesaplama - sadece tur.expenses kullanılır)
    const tourExpenses = toursData
      .filter(tour => tour && filterByCurrency(tour))
      .reduce((sum, tour) => {
        if (Array.isArray(tour.expenses) && tour.expenses.length > 0) {
          const expenses = calculateTourExpenses(tour);
          const amount = expenses[cur] || 0;
          return sum + amount;
        }
        return sum;
      }, 0);
      
    // Tur gelirleri (turların totalPrice değerleri)
    const tourIncome = toursData
      .filter(tour => tour && filterByCurrency(tour) && (tour.paymentStatus === 'completed' || tour.paymentStatus === 'partial'))
      .reduce((sum, tour) => {
        // Tamamlanmış veya kısmi ödeme durumuna göre hesapla
        let amount = 0;
        if (tour.paymentStatus === 'completed') {
          // Tamamlanmış ödemeler için totalPrice kullan
          amount = Number.parseFloat(tour?.totalPrice?.toString() || '0') || 0;
        } else if (tour.paymentStatus === 'partial') {
          // Kısmi ödemeler için partialPaymentAmount kullan
          const partialAmount = Number.parseFloat(tour?.partialPaymentAmount?.toString() || '0') || 0;
          // Eğer kısmi ödemenin para birimi aranılan para birimiyle aynıysa ekle
          if (tour.partialPaymentCurrency === cur || cur === 'all') {
            amount = partialAmount;
          }
          
          // Aktiviteleri kontrol et
          if (Array.isArray(tour.activities)) {
            tour.activities.forEach(activity => {
              if ((activity.currency === cur || cur === 'all') && activity.price && activity.participants) {
                const activityPrice = Number(activity.price) || 0;
                const participants = Number(activity.participants) || 0;
                amount += activityPrice * participants;
              }
            });
          }
        }
        return sum + amount;
      }, 0);
    
    // Toplam gelir, gider ve kar/zarar hesaplaması
    const totalIncome = income + tourIncome;
    
    // Şirket giderleri (Sadece ilgili para birimindeki ve tur ile ilişkili olmayan giderler)
    const companyExpenses = financialData
      .filter(item => item && item.type === "expense" && filterByCurrency(item) && !item.relatedTourId)
      .reduce((sum, item) => {
        const amount = Number.parseFloat(item?.amount?.toString() || '0') || 0;
        return sum + amount;
      }, 0);
    
    // Toplam gider: şirket giderleri + tur giderleri
    const totalExpense = companyExpenses + tourExpenses;
    
    // Net kar/zarar hesaplaması (Gelir - Gider)
    const totalProfit = totalIncome - totalExpense;
    
    console.log(`${cur} para birimi özeti hesaplandı:`, { 
      income, 
      expense, 
      tourIncome, 
      tourExpenses,
      companyExpenses,
      totalIncome,
      totalExpense,
      totalProfit
    });
    
    return {
      income,
      expense,
      tourIncome,
      tourExpenses,
      companyExpenses,
      profit: income - expense, // Finansal gelir - gider
      totalIncome: totalIncome, // Toplam gelir (finansal + tur)
      totalExpense: totalExpense, // Toplam gider (şirket + tur)
      totalProfit: totalProfit, // Net kar/zarar (toplam gelir - toplam gider)
      balance: totalProfit // Kasa kalan miktar = Net Kar/Zarar
    };
  };

  // Eğer 'all' seçiliyse, sistemdeki tüm para birimlerini bul ve her biri için ayrı özet göster
  if (currency === 'all') {
    // Tüm kullanılan para birimlerini normalize ederek bul
    const allCurrenciesSet = new Set<string>();
    financialData.forEach(item => {
      if (item && item.currency) allCurrenciesSet.add(item.currency.toUpperCase());
    });
    toursData.forEach(item => {
      if (item && item.currency) allCurrenciesSet.add(item.currency.toUpperCase());
    });
    // Eğer hiç veri yoksa TRY ekle
    if (allCurrenciesSet.size === 0) allCurrenciesSet.add('TRY');
    // Sıralı ve standart para birimi listesi
    const currencyOrder = ['TRY', 'USD', 'EUR', 'GBP'];
    const allCurrencies = Array.from(allCurrenciesSet).sort((a, b) => {
      const ia = currencyOrder.indexOf(a);
      const ib = currencyOrder.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    return (
      <div className="space-y-8">
        <h2 className="text-xl font-bold">Tüm Para Birimleri Finansal Özeti</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2">
          {allCurrencies.map((cur) => {
            const summary = getFinancialSummaryByCurrency(cur);
            const currencySymbol = cur === "TRY" ? "₺" : cur === "USD" ? "$" : cur === "EUR" ? "€" : cur === "GBP" ? "£" : cur;
            return (
              <Card key={cur} className="overflow-hidden">
                <CardHeader className="p-2 pb-0">
                  <CardTitle className="text-sm font-medium">{cur} Özeti</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(summary.totalIncome, cur)}
                  </div>
                  <div className="text-xs">
                    Toplam Gelir: {formatCurrency(summary.totalIncome, cur)}
                  </div>
                  <div className="text-xs text-red-600">
                    Toplam Gider: {formatCurrency(summary.totalExpense, cur)}
                  </div>
                  <div className={`text-xs ${summary.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    Net Kar/Zarar: {formatCurrency(summary.totalProfit, cur)}
                  </div>
                  <div className={`text-xs ${summary.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    Kasa: {formatCurrency(summary.balance, cur)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border mt-8">
          <h3 className="font-medium mb-2">Detaylı Bilgi</h3>
          {(() => {
            // Tüm para birimleri için özetleri hazırla
            const summaries = allCurrencies.map(cur => ({
              cur,
              summary: getFinancialSummaryByCurrency(cur)
            }));
            const rows = [
              { key: 'income', label: 'Finansal Gelirler', className: 'bg-green-50' },
              { key: 'tourIncome', label: 'Tur Gelirleri', className: 'bg-green-50' },
              { key: 'totalIncome', label: 'Toplam Gelir', className: 'bg-green-50 font-medium' },
              { key: 'companyExpenses', label: 'Şirket Giderleri', className: 'bg-red-50' },
              { key: 'tourExpenses', label: 'Tur Giderleri', className: 'bg-red-50' },
              { key: 'totalExpense', label: 'Toplam Gider', className: 'bg-red-50 font-medium' },
              { key: 'totalProfit', label: 'Net Kar/Zarar', className: '' },
            ];
            return (
              <div className="overflow-x-auto">
                <table className="min-w-max w-full border border-gray-300 rounded-lg bg-white border-collapse">
                  <thead>
                    <tr>
                      <th className="py-2 px-3 text-left border border-gray-300 font-semibold w-1/5">| Kalem</th>
                      {summaries.map(({ cur }) => (
                        <th key={cur} className="py-2 px-3 text-right border border-gray-300 font-semibold w-1/5">{cur}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.key} className={row.className}>
                        <td className="py-2 px-3 font-medium border border-gray-300 w-1/5">{row.label}</td>
                        {summaries.map(({ cur, summary }) => {
                          let value;
                          let cellClass = "py-2 px-3 text-right border border-gray-300 w-1/5";
                          if (row.key === 'companyExpenses' || row.key === 'tourExpenses' || row.key === 'totalExpense') {
                            // Tüm gider alanları için aynı stil
                            value = formatCurrency(summary[row.key as keyof FinancialSummary], cur);
                            cellClass += " text-red-600";
                          } else if (row.key === 'totalProfit') {
                            value = formatCurrency(summary.totalProfit, cur);
                            cellClass += summary.totalProfit >= 0 ? " text-green-600" : " text-red-600";
                            cellClass += " font-medium";
                            cellClass += summary.totalProfit >= 0 ? " bg-green-50" : " bg-red-50";
                          } else if (row.key === 'totalIncome') {
                            value = formatCurrency(summary.totalIncome, cur);
                            cellClass += " font-medium";
                          } else {
                            value = formatCurrency(summary[row.key as keyof FinancialSummary], cur);
                          }
                          return <td key={cur} className={cellClass}>{value}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  const summary = getFinancialSummaryByCurrency(currency);
  const currencySymbol = currency === "all" ? "" : 
    currency === "TRY" ? "₺" : 
    currency === "USD" ? "$" : 
    currency === "EUR" ? "€" : 
    currency === "GBP" ? "£" : currency;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{currency} Para Birimi Finansal Özeti</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-2">
        <Card className="overflow-hidden">
          <CardHeader className="p-2 pb-0">
            <CardTitle className="text-sm font-medium">{currency} Özeti</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(summary.totalIncome, currency)}
            </div>
            <p className="text-xs">
              Toplam Gelir: {formatCurrency(summary.totalIncome, currency)}
            </p>
            <p className="text-xs text-red-600">
              Toplam Gider: {formatCurrency(summary.totalExpense, currency)}
            </p>
            <p className={`text-xs ${summary.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              Net Kar/Zarar: {formatCurrency(summary.totalProfit, currency)}
            </p>
            <p className={`text-xs text-blue-600`}>
              Kasa: {formatCurrency(summary.balance, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border">
        <h3 className="font-medium mb-2">Detaylı Bilgi</h3>
        <table className="w-full border border-gray-300 border-collapse rounded-lg">
          <tbody>
            <tr className="border-b border-gray-300 bg-green-50">
              <td className="py-2 border border-gray-300">Finansal Gelirler</td>
              <td className="py-2 text-right border border-gray-300">{formatCurrency(summary.income, currency)}</td>
            </tr>
            <tr className="border-b border-gray-300 bg-green-50">
              <td className="py-2 border border-gray-300">Tur Gelirleri</td>
              <td className="py-2 text-right border border-gray-300">{formatCurrency(summary.tourIncome, currency)}</td>
            </tr>
            <tr className="border-b border-gray-300 bg-green-50">
              <td className="py-2 border border-gray-300">Toplam Gelir</td>
              <td className="py-2 text-right font-medium border border-gray-300">{formatCurrency(summary.totalIncome, currency)}</td>
            </tr>
            <tr className="border-b border-gray-300 bg-red-50">
              <td className="py-2 border border-gray-300">Şirket Giderleri</td>
              <td className="py-2 text-right text-red-600 border border-gray-300">{formatCurrency(summary.companyExpenses, currency)}</td>
            </tr>
            <tr className="border-b border-gray-300 bg-red-50">
              <td className="py-2 border border-gray-300">Tur Giderleri</td>
              <td className="py-2 text-right text-red-600 border border-gray-300">{formatCurrency(summary.tourExpenses, currency)}</td>
            </tr>
            <tr className="border-b border-gray-300 bg-red-50">
              <td className="py-2 border border-gray-300">Toplam Gider</td>
              <td className="py-2 text-right text-red-600 font-medium border border-gray-300">{formatCurrency(summary.totalExpense, currency)}</td>
            </tr>
            <tr className={`${summary.totalProfit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
              <td className="py-2 font-medium border border-gray-300">Net Kar/Zarar</td>
              <td className={`py-2 text-right font-medium border border-gray-300 ${summary.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(summary.totalProfit, currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
