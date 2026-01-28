import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const MONTHLY_INVEST = 1300000;
  // 2021.01 ~ 2026.01 연도별/분기별 주요 시세 데이터 (S&P500, Gold, Silver, BTC)
  const history = [
    { date: '2021-01-25', s: 3855, g: 1855, sil: 25.4, c: 32000 },
    { date: '2021-07-25', s: 4411, g: 1802, sil: 25.2, c: 34000 },
    { date: '2022-01-25', s: 4356, g: 1847, sil: 23.8, c: 36000 },
    { date: '2022-07-25', s: 3966, g: 1719, sil: 18.6, c: 21000 },
    { date: '2023-01-25', s: 4016, g: 1945, sil: 23.9, c: 23000 },
    { date: '2023-07-25', s: 4567, g: 1964, sil: 24.6, c: 29000 },
    { date: '2024-01-25', s: 4894, g: 2020, sil: 22.9, c: 40000 },
    { date: '2024-07-25', s: 5399, g: 2360, sil: 27.9, c: 65000 },
    { date: '2025-01-25', s: 5850, g: 2730, sil: 33.5, c: 92000 },
    { date: '2025-11-25', s: 5950, g: 2650, sil: 31.0, c: 95000 },
    { date: '2026-01-25', s: 6180, g: 2730, sil: 32.5, c: 104000 },
    { date: '2026-01-28', s: 6205, g: 2740, sil: 32.8, c: 103500 },
  ];

  let totalStockQty = 0,
    totalGoldQty = 0,
    totalSilverQty = 0,
    totalCryptoQty = 0;
  let currentSavings = 0,
    currentInflation = 0,
    totalPrincipal = 0;

  const formattedData = history.map((item, idx) => {
    const prevDate =
      idx === 0 ? new Date(item.date) : new Date(history[idx - 1].date);
    const currDate = new Date(item.date);
    const daysPassed =
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

    currentSavings = currentSavings * Math.pow(1 + 0.035 / 365, daysPassed);
    currentInflation = currentInflation * Math.pow(1 + 0.03 / 365, daysPassed);

    // 실제로는 매달 25일이지만, 시뮬레이션 데이터 포인트마다 누적 투자금을 가중치로 계산
    if (idx > 0) {
      const monthsBetween =
        (currDate.getFullYear() - prevDate.getFullYear()) * 12 +
        (currDate.getMonth() - prevDate.getMonth());
      const investCount = monthsBetween > 0 ? monthsBetween : 1;

      for (let i = 0; i < investCount; i++) {
        totalPrincipal += MONTHLY_INVEST;
        currentSavings += MONTHLY_INVEST;
        currentInflation += MONTHLY_INVEST;
        totalStockQty += (MONTHLY_INVEST * 0.7) / item.s;
        totalGoldQty += (MONTHLY_INVEST * 0.15) / item.g;
        totalSilverQty += (MONTHLY_INVEST * 0.05) / item.sil;
        totalCryptoQty += (MONTHLY_INVEST * 0.1) / item.c;
      }
    } else {
      // 첫 데이터 포인트 처리
      totalPrincipal += MONTHLY_INVEST;
      currentSavings += MONTHLY_INVEST;
      currentInflation += MONTHLY_INVEST;
      totalStockQty += (MONTHLY_INVEST * 0.7) / item.s;
      totalGoldQty += (MONTHLY_INVEST * 0.15) / item.g;
      totalSilverQty += (MONTHLY_INVEST * 0.05) / item.sil;
      totalCryptoQty += (MONTHLY_INVEST * 0.1) / item.c;
    }

    const currentInvestment =
      totalStockQty * item.s +
      totalGoldQty * item.g +
      totalSilverQty * item.sil +
      totalCryptoQty * item.c;

    return {
      date: item.date,
      total_investment: Math.floor(currentInvestment),
      savings_balance: Math.floor(currentSavings),
      inflation_adjusted: Math.floor(currentInflation),
    };
  });

  await supabase
    .from('asset_history')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  const { error } = await supabase.from('asset_history').insert(formattedData);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: '5개년(2021-2026) 데이터 주입 성공!' });
}
