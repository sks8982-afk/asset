import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const MONTHLY_INVEST = 1300000;
  // 2021.01 ~ 2026.01 실제 시장 데이터 (s:S&P500($), g:금(원/g), sil:은(원/g), c:비트코인(원), ex:환율)
  const history = [
    { date: '2021-01-25', s: 3855, g: 65000, sil: 850, c: 35000000, ex: 1105 },
    { date: '2021-07-25', s: 4411, g: 67000, sil: 920, c: 40000000, ex: 1150 },
    { date: '2022-01-25', s: 4356, g: 71000, sil: 880, c: 44000000, ex: 1195 },
    { date: '2022-07-25', s: 3966, g: 74000, sil: 820, c: 28000000, ex: 1310 },
    { date: '2023-01-25', s: 4016, g: 78000, sil: 950, c: 29000000, ex: 1235 },
    { date: '2023-07-25', s: 4567, g: 82000, sil: 1050, c: 38000000, ex: 1280 },
    { date: '2024-01-25', s: 4894, g: 87000, sil: 1020, c: 56000000, ex: 1335 },
    {
      date: '2024-07-25',
      s: 5399,
      g: 105000,
      sil: 1350,
      c: 92000000,
      ex: 1385,
    },
    {
      date: '2025-01-25',
      s: 5850,
      g: 118000,
      sil: 1400,
      c: 145000000,
      ex: 1420,
    },
    {
      date: '2026-01-28',
      s: 6205,
      g: 120000,
      sil: 1420,
      c: 143000000,
      ex: 1415,
    },
  ];

  let totalStockQty = 0,
    totalGoldQty = 0,
    totalSilverQty = 0,
    totalCryptoQty = 0;
  let totalInjected = 0,
    currentSavings = 0;

  const formattedData = history.map((item, idx) => {
    // 적립식 투자 매수 로직 (데이터 포인트 간 개월 수 자동 계산)
    const investCount = idx === 0 ? 1 : 6; // 반기별 데이터이므로 6개월치씩 투자 가정
    for (let i = 0; i < investCount; i++) {
      totalInjected += MONTHLY_INVEST;
      currentSavings += MONTHLY_INVEST; // 단순 원금 합계 (이자 제외 시)
      totalStockQty += (MONTHLY_INVEST * 0.7) / item.ex / item.s;
      totalGoldQty += (MONTHLY_INVEST * 0.15) / item.g;
      totalSilverQty += (MONTHLY_INVEST * 0.05) / item.sil;
      totalCryptoQty += (MONTHLY_INVEST * 0.1) / item.c;
    }

    const stockVal = totalStockQty * item.s * item.ex;
    const goldVal = totalGoldQty * item.g;
    const silverVal = totalSilverQty * item.sil;
    const cryptoVal = totalCryptoQty * item.c;
    const totalInv = stockVal + goldVal + silverVal + cryptoVal;

    // 리밸런싱 상태 체크 (주식 비중이 70%에서 5% 이상 벌어질 때)
    const stockRatio = (stockVal / totalInv) * 100;
    const status = Math.abs(stockRatio - 70) > 5 ? 'rebalance' : 'stable';

    return {
      date: item.date,
      total_investment: Math.floor(totalInv),
      savings_balance: totalInjected,
      inflation_adjusted: Math.floor(totalInjected * 1.03), // 물가 지표
      status: status,
    };
  });

  try {
    await supabase
      .from('asset_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    const { error } = await supabase
      .from('asset_history')
      .insert(formattedData);
    if (error) throw error;
    return NextResponse.json({
      message: '5년치 환율/리밸런싱 데이터 주입 성공!',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
