import { NextResponse } from "next/server";
import { getAllData } from "@/lib/db";
import { COLLECTIONS } from "@/lib/db-firebase";

export async function GET() {
  try {
    // Finansal verileri getir
    const financialData = await getAllData(COLLECTIONS.financials);
    
    // Şirket giderlerini filtrele
    const companyExpenses = financialData.filter(f => 
      f.type === "expense" && !f.tourId && !f.relatedTourId
    );
    
    // Dönem bazında grupla
    const expensesByPeriod: { [key: string]: any[] } = {};
    companyExpenses.forEach(expense => {
      const date = new Date(expense.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const periodKey = `${year}-${month}`;
      
      if (!expensesByPeriod[periodKey]) {
        expensesByPeriod[periodKey] = [];
      }
      expensesByPeriod[periodKey].push(expense);
    });
    
    // Her dönem için toplam hesapla
    const periodTotals: { [key: string]: number } = {};
    Object.keys(expensesByPeriod).forEach(periodKey => {
      const periodExpenses = expensesByPeriod[periodKey];
      const total = periodExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
      periodTotals[periodKey] = total;
    });
    
    return NextResponse.json({
      success: true,
      data: {
        allFinancialData: financialData.length,
        companyExpenses: companyExpenses.length,
        expensesByPeriod,
        periodTotals,
        details: companyExpenses.map(expense => ({
          id: expense.id,
          date: expense.date,
          amount: expense.amount,
          description: expense.description,
          category: expense.category,
          tourId: expense.tourId,
          relatedTourId: expense.relatedTourId
        }))
      }
    });
    
  } catch (error) {
    console.error("Debug API hatası:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Bilinmeyen hata"
    }, { status: 500 });
  }
}
