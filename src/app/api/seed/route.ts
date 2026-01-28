import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const MONTHLY_INVEST = 1300000;
  const ANNUAL_INFLATION_RATE = 0.035; // 연 3.5% 물가상승률 가정
  const MONTHLY_INFLATION_RATE = ANNUAL_INFLATION_RATE / 12;

  const history = [
    {
      date: '2021-01-25',
      s: 3855,
      q: 315,
      d: 64,
      g: 65200,
      sil: 855,
      c: 35200000,
      ex: 1105,
    },
    {
      date: '2021-07-25',
      s: 4411,
      q: 368,
      d: 75,
      g: 66800,
      sil: 910,
      c: 39800000,
      ex: 1148,
    },
    {
      date: '2022-01-25',
      s: 4356,
      q: 352,
      d: 78,
      g: 71200,
      sil: 875,
      c: 43500000,
      ex: 1198,
    },
    {
      date: '2022-07-25',
      s: 3961,
      q: 305,
      d: 72,
      g: 74500,
      sil: 815,
      c: 28500000,
      ex: 1312,
    },
    {
      date: '2023-01-25',
      s: 4016,
      q: 288,
      d: 76,
      g: 78200,
      sil: 940,
      c: 29200000,
      ex: 1232,
    },
    {
      date: '2023-07-25',
      s: 4567,
      q: 378,
      d: 74,
      g: 81800,
      sil: 1040,
      c: 37500000,
      ex: 1285,
    },
    {
      date: '2024-01-25',
      s: 4894,
      q: 428,
      d: 75,
      g: 86500,
      sil: 1010,
      c: 57200000,
      ex: 1338,
    },
    {
      date: '2024-07-25',
      s: 5399,
      q: 492,
      d: 81,
      g: 104500,
      sil: 1340,
      c: 93500000,
      ex: 1382,
    },
    {
      date: '2025-01-25',
      s: 5850,
      q: 525,
      d: 89,
      g: 117500,
      sil: 1395,
      c: 144500000,
      ex: 1422,
    },
    {
      date: '2026-01-28',
      s: 6205,
      q: 618,
      d: 95,
      g: 121200,
      sil: 1425,
      c: 128500000,
      ex: 1412,
    },
  ];

  let qS = 0,
    qQ = 0,
    qD = 0,
    qG = 0,
    qSi = 0,
    qC = 0;
  let totalInjected = 0,
    cumulativeInflationValue = 0;

  const formattedData = history.map((item, idx) => {
    const monthsPassed = idx === 0 ? 1 : 6;

    for (let i = 0; i < monthsPassed; i++) {
      totalInjected += MONTHLY_INVEST;

      // 1. 기존에 쌓여있던 물가반영 원금에 한 달치 인플레이션 적용
      cumulativeInflationValue =
        cumulativeInflationValue * (1 + MONTHLY_INFLATION_RATE);
      // 2. 이번 달 새로 들어온 130만원 추가
      cumulativeInflationValue += MONTHLY_INVEST;

      // 자산 매수 로직 (생략 없이 유지)
      qS += (MONTHLY_INVEST * 0.35) / item.ex / item.s;
      qQ += (MONTHLY_INVEST * 0.25) / item.ex / item.q;
      qD += (MONTHLY_INVEST * 0.1) / item.ex / item.d;
      qG += (MONTHLY_INVEST * 0.15) / item.g;
      qSi += (MONTHLY_INVEST * 0.05) / item.sil;
      qC += (MONTHLY_INVEST * 0.1) / item.c;
    }

    const totalInv =
      qS * item.s * item.ex +
      qQ * item.q * item.ex +
      qD * item.d * item.ex +
      qG * item.g +
      qSi * item.sil +
      qC * item.c;

    return {
      date: item.date,
      total_investment: Math.floor(totalInv),
      savings_balance: totalInjected,
      inflation_adjusted: Math.floor(cumulativeInflationValue),
      details: {
        valS: qS * item.s * item.ex,
        valQ: qQ * item.q * item.ex,
        valD: qD * item.d * item.ex,
        valG: qG * item.g,
        valSi: qSi * item.sil,
        valC: qC * item.c,
      },
      status: 'stable',
    };
  });

  await supabase
    .from('asset_history')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('asset_history').insert(formattedData);
  return NextResponse.json({ message: '5개년 물가 복리 데이터 반영 완료' });
}
