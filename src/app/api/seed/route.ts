import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const MONTHLY_INVEST = 1300000;
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
    qC = 0,
    totalInjected = 0;

  const formattedData = history.map((item, idx) => {
    const investCount = idx === 0 ? 1 : 6;
    for (let i = 0; i < investCount; i++) {
      totalInjected += MONTHLY_INVEST;
      qS += (MONTHLY_INVEST * 0.35) / item.ex / item.s;
      qQ += (MONTHLY_INVEST * 0.25) / item.ex / item.q;
      qD += (MONTHLY_INVEST * 0.1) / item.ex / item.d;
      qG += (MONTHLY_INVEST * 0.15) / item.g;
      qSi += (MONTHLY_INVEST * 0.05) / item.sil;
      qC += (MONTHLY_INVEST * 0.1) / item.c;
    }

    const valS = qS * item.s * item.ex;
    const valQ = qQ * item.q * item.ex;
    const valD = qD * item.d * item.ex;
    const valG = qG * item.g;
    const valSi = qSi * item.sil;
    const valC = qC * item.c;
    const totalInv = valS + valQ + valD + valG + valSi + valC;

    return {
      date: item.date,
      total_investment: Math.floor(totalInv),
      savings_balance: totalInjected,
      // 🟢 에러 발생 원인 해결: Not Null 제약 조건에 맞게 데이터 추가
      inflation_adjusted: Math.floor(totalInjected * 1.03),
      details: { valS, valQ, valD, valG, valSi, valC },
      status: 'stable',
    };
  });

  try {
    const { error: delError } = await supabase
      .from('asset_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (delError)
      return NextResponse.json(
        { error: '삭제 실패: ' + delError.message },
        { status: 500 },
      );

    const { error: insError } = await supabase
      .from('asset_history')
      .insert(formattedData);
    if (insError)
      return NextResponse.json(
        { error: '삽입 실패: ' + insError.message },
        { status: 500 },
      );

    return NextResponse.json({
      message: '성공적으로 데이터가 주입되었습니다!',
      count: formattedData.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: '알 수 없는 에러: ' + err.message },
      { status: 500 },
    );
  }
}
