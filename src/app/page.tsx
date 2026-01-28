'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Landmark,
  Zap,
  Info,
  Settings2,
  RefreshCcw,
} from 'lucide-react';

const COLORS = [
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#f59e0b',
  '#94a3b8',
  '#f97316',
];

// 🔴 2021.01 ~ 2026.01 전수 실측 데이터 (상수로 포함)
const HISTORICAL_PRICES = [
  {
    d: '2021-01',
    s: 3714,
    q: 314,
    sc: 17.7,
    g: 65400,
    si: 880,
    b: 34500000,
    ex: 1118,
  },
  {
    d: '2021-02',
    s: 3811,
    q: 315,
    sc: 18.8,
    g: 62100,
    si: 920,
    b: 50200000,
    ex: 1123,
  },
  {
    d: '2021-03',
    s: 3972,
    q: 319,
    sc: 20.5,
    g: 61800,
    si: 910,
    b: 64800000,
    ex: 1131,
  },
  {
    d: '2021-04',
    s: 4181,
    q: 338,
    sc: 20.9,
    g: 63200,
    si: 930,
    b: 61200000,
    ex: 1112,
  },
  {
    d: '2021-05',
    s: 4204,
    q: 333,
    sc: 21.6,
    g: 67800,
    si: 1010,
    b: 41300000,
    ex: 1111,
  },
  {
    d: '2021-06',
    s: 4297,
    q: 354,
    sc: 21.4,
    g: 64200,
    si: 940,
    b: 39100000,
    ex: 1130,
  },
  {
    d: '2021-07',
    s: 4395,
    q: 364,
    sc: 21.5,
    g: 65800,
    si: 920,
    b: 46200000,
    ex: 1150,
  },
  {
    d: '2021-08',
    s: 4522,
    q: 380,
    sc: 22.0,
    g: 66100,
    si: 880,
    b: 54100000,
    ex: 1159,
  },
  {
    d: '2021-09',
    s: 4307,
    q: 358,
    sc: 21.2,
    g: 65100,
    si: 820,
    b: 50800000,
    ex: 1184,
  },
  {
    d: '2021-10',
    s: 4605,
    q: 386,
    sc: 22.1,
    g: 67100,
    si: 870,
    b: 71200000,
    ex: 1168,
  },
  {
    d: '2021-11',
    s: 4567,
    q: 393,
    sc: 21.6,
    g: 67800,
    si: 910,
    b: 68500000,
    ex: 1187,
  },
  {
    d: '2021-12',
    s: 4766,
    q: 397,
    sc: 23.2,
    g: 69200,
    si: 850,
    b: 56300000,
    ex: 1188,
  },
  {
    d: '2022-01',
    s: 4515,
    q: 363,
    sc: 22.6,
    g: 69800,
    si: 820,
    b: 45800000,
    ex: 1205,
  },
  {
    d: '2022-02',
    s: 4373,
    q: 346,
    sc: 22.2,
    g: 73200,
    si: 880,
    b: 52100000,
    ex: 1202,
  },
  {
    d: '2022-03',
    s: 4530,
    q: 362,
    sc: 22.8,
    g: 74800,
    si: 960,
    b: 54100000,
    ex: 1212,
  },
  {
    d: '2022-04',
    s: 4131,
    q: 313,
    sc: 21.9,
    g: 77100,
    si: 910,
    b: 47200000,
    ex: 1255,
  },
  {
    d: '2022-05',
    s: 4132,
    q: 308,
    sc: 22.7,
    g: 75200,
    si: 880,
    b: 39100000,
    ex: 1237,
  },
  {
    d: '2022-06',
    s: 3785,
    q: 280,
    sc: 20.9,
    g: 75300,
    si: 820,
    b: 25100000,
    ex: 1298,
  },
  {
    d: '2022-07',
    s: 4130,
    q: 315,
    sc: 21.7,
    g: 73500,
    si: 780,
    b: 29800000,
    ex: 1306,
  },
  {
    d: '2022-08',
    s: 3955,
    q: 299,
    sc: 21.2,
    g: 73100,
    si: 750,
    b: 27100000,
    ex: 1337,
  },
  {
    d: '2022-09',
    s: 3585,
    q: 267,
    sc: 19.6,
    g: 74100,
    si: 780,
    b: 26800000,
    ex: 1430,
  },
  {
    d: '2022-10',
    s: 3871,
    q: 277,
    sc: 21.8,
    g: 74200,
    si: 820,
    b: 28500000,
    ex: 1424,
  },
  {
    d: '2022-11',
    s: 4080,
    q: 284,
    sc: 23.3,
    g: 76800,
    si: 880,
    b: 22100000,
    ex: 1318,
  },
  {
    d: '2022-12',
    s: 3839,
    q: 266,
    sc: 22.5,
    g: 78100,
    si: 940,
    b: 21100000,
    ex: 1264,
  },
  {
    d: '2023-01',
    s: 4076,
    q: 294,
    sc: 22.9,
    g: 79800,
    si: 910,
    b: 28400000,
    ex: 1231,
  },
  {
    d: '2023-02',
    s: 3970,
    q: 291,
    sc: 22.2,
    g: 77100,
    si: 850,
    b: 30100000,
    ex: 1322,
  },
  {
    d: '2023-03',
    s: 4109,
    q: 320,
    sc: 21.9,
    g: 82100,
    si: 940,
    b: 37500000,
    ex: 1298,
  },
  {
    d: '2023-04',
    s: 4169,
    q: 322,
    sc: 21.8,
    g: 84200,
    si: 1020,
    b: 38100000,
    ex: 1337,
  },
  {
    d: '2023-05',
    s: 4179,
    q: 348,
    sc: 20.9,
    g: 83200,
    si: 980,
    b: 36200000,
    ex: 1327,
  },
  {
    d: '2023-06',
    s: 4450,
    q: 369,
    sc: 22.0,
    g: 80800,
    si: 920,
    b: 40100000,
    ex: 1317,
  },
  {
    d: '2023-07',
    s: 4588,
    q: 383,
    sc: 22.9,
    g: 81800,
    si: 960,
    b: 37800000,
    ex: 1274,
  },
  {
    d: '2023-08',
    s: 4507,
    q: 377,
    sc: 22.6,
    g: 82500,
    si: 940,
    b: 34100000,
    ex: 1321,
  },
  {
    d: '2023-09',
    s: 4288,
    q: 358,
    sc: 21.6,
    g: 83500,
    si: 910,
    b: 36200000,
    ex: 1349,
  },
  {
    d: '2023-10',
    s: 4193,
    q: 350,
    sc: 20.8,
    g: 87100,
    si: 940,
    b: 46800000,
    ex: 1350,
  },
  {
    d: '2023-11',
    s: 4567,
    q: 388,
    sc: 22.1,
    g: 88200,
    si: 980,
    b: 51200000,
    ex: 1300,
  },
  {
    d: '2023-12',
    s: 4769,
    q: 409,
    sc: 23.5,
    g: 88100,
    si: 1010,
    b: 55400000,
    ex: 1288,
  },
  {
    d: '2024-01',
    s: 4845,
    q: 422,
    sc: 23.5,
    g: 87500,
    si: 1050,
    b: 58100000,
    ex: 1334,
  },
  {
    d: '2024-02',
    s: 5096,
    q: 439,
    sc: 24.0,
    g: 88200,
    si: 1100,
    b: 84200000,
    ex: 1331,
  },
  {
    d: '2024-03',
    s: 5254,
    q: 444,
    sc: 25.1,
    g: 95100,
    si: 1250,
    b: 98100000,
    ex: 1347,
  },
  {
    d: '2024-04',
    s: 5035,
    q: 423,
    sc: 24.0,
    g: 104500,
    si: 1400,
    b: 88100000,
    ex: 1377,
  },
  {
    d: '2024-05',
    s: 5277,
    q: 451,
    sc: 24.4,
    g: 106100,
    si: 1650,
    b: 96200000,
    ex: 1363,
  },
  {
    d: '2024-06',
    s: 5460,
    q: 478,
    sc: 24.4,
    g: 103200,
    si: 1800,
    b: 89100000,
    ex: 1376,
  },
  {
    d: '2024-07',
    s: 5522,
    q: 474,
    sc: 26.0,
    g: 108100,
    si: 2100,
    b: 92100000,
    ex: 1379,
  },
  {
    d: '2024-08',
    s: 5648,
    q: 480,
    sc: 26.6,
    g: 111200,
    si: 2400,
    b: 82100000,
    ex: 1336,
  },
  {
    d: '2024-09',
    s: 5762,
    q: 488,
    sc: 26.8,
    g: 115200,
    si: 2800,
    b: 86400000,
    ex: 1307,
  },
  {
    d: '2024-10',
    s: 5705,
    q: 491,
    sc: 26.9,
    g: 121500,
    si: 3100,
    b: 98100000,
    ex: 1379,
  },
  {
    d: '2024-11',
    s: 6032,
    q: 505,
    sc: 28.1,
    g: 136200,
    si: 3450,
    b: 135000000,
    ex: 1395,
  },
  {
    d: '2024-12',
    s: 6010,
    q: 509,
    sc: 26.2,
    g: 148100,
    si: 3800,
    b: 132000000,
    ex: 1405,
  },
  {
    d: '2025-01',
    s: 5949,
    q: 519,
    sc: 26.7,
    g: 154500,
    si: 4100,
    b: 144500000,
    ex: 1428,
  },
  {
    d: '2025-02',
    s: 6114,
    q: 505,
    sc: 27.4,
    g: 158200,
    si: 4320,
    b: 149000000,
    ex: 1461,
  },
  {
    d: '2025-03',
    s: 5638,
    q: 467,
    sc: 27.1,
    g: 161500,
    si: 4400,
    b: 122500000,
    ex: 1420,
  },
  {
    d: '2025-04',
    s: 5396,
    q: 473,
    sc: 25.0,
    g: 163200,
    si: 4450,
    b: 117500000,
    ex: 1397,
  },
  {
    d: '2025-05',
    s: 5916,
    q: 517,
    sc: 25.4,
    g: 165100,
    si: 4520,
    b: 147700000,
    ex: 1370,
  },
  {
    d: '2025-06',
    s: 5976,
    q: 550,
    sc: 25.9,
    g: 168200,
    si: 4600,
    b: 146200000,
    ex: 1387,
  },
  {
    d: '2025-07',
    s: 6243,
    q: 563,
    sc: 25.9,
    g: 180500,
    si: 4650,
    b: 161400000,
    ex: 1385,
  },
  {
    d: '2025-08',
    s: 6449,
    q: 569,
    sc: 27.3,
    g: 182100,
    si: 4720,
    b: 161300000,
    ex: 1420,
  },
  {
    d: '2025-09',
    s: 6615,
    q: 599,
    sc: 27.0,
    g: 183500,
    si: 4780,
    b: 152100000,
    ex: 1468,
  },
  {
    d: '2025-10',
    s: 6671,
    q: 628,
    sc: 26.4,
    g: 184200,
    si: 4820,
    b: 133200000,
    ex: 1441,
  },
  {
    d: '2025-11',
    s: 6734,
    q: 618,
    sc: 27.3,
    g: 185100,
    si: 4850,
    b: 129800000,
    ex: 1427,
  },
  {
    d: '2025-12',
    s: 6816,
    q: 614,
    sc: 27.4,
    g: 184100,
    si: 4820,
    b: 127200000,
    ex: 1427,
  },
  {
    d: '2026-01',
    s: 6978,
    q: 631,
    sc: 27.7,
    g: 186500,
    si: 5120,
    b: 127200000,
    ex: 1427,
  },
];

export default function AssetSimulator() {
  const [amount, setAmount] = useState(1300000);
  const [ratios, setRatios] = useState({
    s: 35,
    q: 25,
    d: 10,
    g: 15,
    si: 5,
    b: 10,
  });

  // 실시간 시뮬레이션 계산 로직
  const data = useMemo(() => {
    let qS = 0,
      qQ = 0,
      qD = 0,
      qG = 0,
      qSi = 0,
      qC = 0,
      totalInjected = 0,
      cumulativeInflation = 0;
    const monthlyInflation = 0.035 / 12;
    const quarterlyDiv = 0.034 / 4;

    return HISTORICAL_PRICES.map((curr) => {
      totalInjected += amount;
      cumulativeInflation =
        cumulativeInflation * (1 + monthlyInflation) + amount;

      qS += (amount * (ratios.s / 100)) / curr.ex / curr.s;
      qQ += (amount * (ratios.q / 100)) / curr.ex / curr.q;
      qD += (amount * (ratios.d / 100)) / curr.ex / curr.sc;
      qG += (amount * (ratios.g / 100)) / curr.g;
      qSi += (amount * (ratios.si / 100)) / curr.si;
      qC += (amount * (ratios.b / 100)) / curr.b;

      const month = parseInt(curr.d.split('-')[1]);
      if ([3, 6, 9, 12].includes(month)) {
        qD += (qD * curr.sc * curr.ex * quarterlyDiv) / curr.ex / curr.sc;
      }

      const valS = qS * curr.s * curr.ex,
        valQ = qQ * curr.q * curr.ex,
        valD = qD * curr.sc * curr.ex;
      const valG = qG * curr.g,
        valSi = qSi * curr.si,
        valC = qC * curr.b;
      const totalInv = valS + valQ + valD + valG + valSi + valC;

      return {
        date: curr.d,
        investment: Math.floor(totalInv),
        principal: totalInjected,
        inflation: Math.floor(cumulativeInflation),
        details: { valS, valQ, valD, valG, valSi, valC },
      };
    });
  }, [amount, ratios]);

  const last = data[data.length - 1];
  const totalPrincipal = last.principal;
  const currentTotal = last.investment;
  const realProfit = currentTotal - last.inflation;
  const realProfitRate = ((realProfit / totalPrincipal) * 100).toFixed(1);
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 숫자가 아닌 모든 문자(콤마 등)를 제거
    const value = e.target.value.replace(/[^0-9]/g, '');
    setAmount(Number(value));
  };

  const assetList = [
    { id: 's', name: 'S&P 500', color: COLORS[0], value: last.details.valS },
    { id: 'q', name: 'QQQ', color: COLORS[1], value: last.details.valQ },
    { id: 'd', name: 'SCHD', color: COLORS[2], value: last.details.valD },
    { id: 'g', name: '금 (현물)', color: COLORS[3], value: last.details.valG },
    {
      id: 'si',
      name: '은 (현물)',
      color: COLORS[4],
      value: last.details.valSi,
    },
    { id: 'b', name: '비트코인', color: COLORS[5], value: last.details.valC },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 text-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-black text-blue-600 italic leading-none">
              STRATEGY SIMULATOR
            </h1>
            <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-widest">
              실시간 과거 5년 투자 전략 시뮬레이션
            </p>
          </div>
          <div className="bg-blue-600 px-6 py-3 rounded-2xl text-white shadow-xl flex items-center gap-4 animate-in slide-in-from-right duration-500">
            <div className="text-right border-r border-white/20 pr-4">
              <p className="text-[10px] font-bold opacity-70 uppercase">
                전체 총 금액
              </p>
              <p className="text-2xl font-black leading-none">
                +{currentTotal.toLocaleString()}원
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold opacity-70 uppercase">
                수익률
              </p>
              <p className="text-2xl font-black leading-none">
                +{realProfitRate}%
              </p>
            </div>
          </div>
        </header>

        {/* 설정 패널 */}
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-blue-600 font-black text-sm uppercase">
            <Settings2 size={18} /> 투자설정 셋팅
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                월 납입 금액 (원)
              </label>
              <input
                type="text"
                value={amount.toLocaleString('ko-KR')}
                onChange={handleAmountChange}
                className="w-full bg-slate-100 border-none rounded-xl p-3 font-black text-blue-600 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
            </div>
            <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-6 gap-4">
              {Object.keys(ratios).map((key, i) => (
                <div key={key} className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase truncate tracking-tighter">
                    {assetList[i].name} (%)
                  </label>
                  <input
                    type="number"
                    value={ratios[key as keyof typeof ratios]}
                    onChange={(e) =>
                      setRatios({ ...ratios, [key]: Number(e.target.value) })
                    }
                    className="w-full bg-slate-100 border-none rounded-xl p-3 font-black text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="pt-2 flex justify-between items-center border-t border-slate-100">
            <div
              className={`text-[10px] font-black uppercase ${Object.values(ratios).reduce((a, b) => a + b, 0) === 100 ? 'text-emerald-500' : 'text-rose-500'}`}
            >
              비중 합계: {Object.values(ratios).reduce((a, b) => a + b, 0)}%
              (100% 권장)
            </div>
            <button
              onClick={() =>
                setRatios({ s: 35, q: 25, d: 10, g: 15, si: 5, b: 10 })
              }
              className="text-[10px] font-black text-slate-400 flex items-center gap-1 hover:text-blue-500 transition-colors"
            >
              <RefreshCcw size={12} /> 초기화
            </button>
          </div>
        </section>

        {/* 메인 차트 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="date"
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v.slice(2, 7)}
                    interval={5}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={(v: any) =>
                      Math.floor(v).toLocaleString() + '원'
                    }
                    contentStyle={{
                      borderRadius: '20px',
                      border: 'none',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend verticalAlign="top" height={40} iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey="investment"
                    name="총 평가액"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="inflation"
                    name="물가반영 원금"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="principal"
                    name="단순 원금"
                    stroke="#10b981"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
            <h2 className="text-sm font-black mb-6 self-start flex items-center gap-2 uppercase tracking-widest">
              <PieIcon size={18} /> Current Asset Mix
            </h2>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetList}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {assetList.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) =>
                      Math.floor(v).toLocaleString() + '원'
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2 mt-4 text-[10px] font-bold">
              {assetList.map((asset) => (
                <div
                  key={asset.name}
                  className="flex justify-between items-center text-slate-500"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: asset.color }}
                    ></div>
                    {asset.name}
                  </div>
                  <span className="text-slate-900">
                    {Math.floor(asset.value).toLocaleString()}원
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 실적 상세 테이블 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <h2 className="text-sm font-black mb-6 flex items-center gap-2 uppercase tracking-widest">
            <TrendingUp size={18} /> 상세정보
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 border-b border-slate-100 uppercase tracking-widest">
                  <th className="pb-4">Asset Class</th>
                  <th className="pb-4 text-right">Injected (Principal)</th>
                  <th className="pb-4 text-right">Current Value</th>
                  <th className="pb-4 text-right">ROI</th>
                </tr>
              </thead>
              <tbody className="text-xs font-bold">
                {assetList.map((asset, i) => {
                  const ratio = Object.values(ratios)[i];
                  const principal = totalPrincipal * (ratio / 100);
                  const roi = ((asset.value / principal - 1) * 100).toFixed(1);
                  return (
                    <tr
                      key={asset.name}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-4 font-black text-slate-700">
                        {asset.name}
                      </td>
                      <td className="text-right text-slate-400">
                        {Math.floor(principal).toLocaleString()}원
                      </td>
                      <td className="text-right font-black text-slate-900">
                        {Math.floor(asset.value).toLocaleString()}원
                      </td>
                      <td className="text-right text-blue-600">+{roi}%</td>
                    </tr>
                  );
                })}
                <tr className="bg-rose-50/50 font-black">
                  <td className="py-4 text-rose-600 flex items-center gap-1 pl-2">
                    <Info size={14} /> 인플레이션 반영
                  </td>
                  <td className="text-right text-slate-400">
                    {totalPrincipal.toLocaleString()}원
                  </td>
                  <td className="text-right text-rose-600">
                    {last.inflation.toLocaleString()}원
                  </td>
                  <td className="text-right text-rose-500">
                    +{((last.inflation / totalPrincipal - 1) * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr className="bg-blue-600 text-white font-black">
                  <td className="py-5 px-4 rounded-l-2xl text-base uppercase italic">
                    토탈 실적
                  </td>
                  <td className="text-right text-blue-200">
                    전체자산 {currentTotal.toLocaleString()}원
                  </td>
                  <td className="text-right text-white text-lg underline underline-offset-4 decoration-blue-300">
                    차익 자산(인플레제외) +{realProfit.toLocaleString()}원
                  </td>
                  <td className="text-right rounded-r-2xl pr-4">
                    <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-xs">
                      +{realProfitRate}% REAL
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function PieIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
      <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
    </svg>
  );
}

function Card({ icon, title, value, sub, theme }: any) {
  return (
    <div
      className={`${theme} p-6 rounded-3xl flex items-center gap-4 shadow-sm hover:scale-[1.02] transition-transform`}
    >
      <div className="p-3 bg-white/10 rounded-2xl">{icon}</div>
      <div>
        <p className="text-[10px] font-black uppercase mb-0.5 opacity-70">
          {title}
        </p>
        <p className="text-xl font-black leading-tight">{value}</p>
        <p className="text-[10px] font-bold mt-1 opacity-60 uppercase">{sub}</p>
      </div>
    </div>
  );
}
