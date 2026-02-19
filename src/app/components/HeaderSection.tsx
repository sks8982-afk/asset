import React from 'react';
import {
  Download,
  Moon,
  RefreshCcw,
  Settings,
  Sun,
  Trash2,
} from 'lucide-react';

export type HeaderSectionProps = {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onExportCSV: () => void;
  onOpenSettings: () => void;
  onRefreshPrices: () => void;
  isRefreshingPrice: boolean;
  onOpenResetDb: () => void;
  onOpenDeleteByDate: () => void;
  totalInvested: number;
  totalAsset: number;
  totalRoi: number;
};

export function HeaderSection({
  darkMode,
  onToggleDarkMode,
  onExportCSV,
  onOpenSettings,
  onRefreshPrices,
  isRefreshingPrice,
  onOpenResetDb,
  onOpenDeleteByDate,
  totalInvested,
  totalAsset,
  totalRoi,
}: HeaderSectionProps) {
  const formatNum = (n: number) => Math.floor(n).toLocaleString();

  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest italic">
            Real-Time DB Ledger
          </span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-none tracking-tighter">
          실전 <span className="text-blue-600 dark:text-blue-400">투자 장부</span>
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full justify-end">
        <button
          onClick={onToggleDarkMode}
          className="p-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          title={darkMode ? '라이트 모드' : '다크 모드'}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={onExportCSV}
          className="p-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
          title="CSV 내보내기"
        >
          <Download size={18} />
          <span className="text-xs font-bold hidden sm:inline">내보내기</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="p-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          title="설정"
        >
          <Settings size={20} />
        </button>
        <button
          onClick={onRefreshPrices}
          disabled={isRefreshingPrice}
          className="p-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 disabled:opacity-60"
          title="시세 새로고침"
        >
          <RefreshCcw
            size={18}
            className={isRefreshingPrice ? 'animate-spin' : ''}
          />
          <span className="text-xs font-bold hidden sm:inline">
            시세 새로고침
          </span>
        </button>
        <button
          onClick={onOpenDeleteByDate}
          className="bg-white dark:bg-slate-800 text-slate-400 p-4 rounded-3xl border border-slate-200 dark:border-slate-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 hover:border-amber-200 transition-all flex flex-col items-center justify-center gap-1"
          title="날짜별 기록 삭제"
        >
          <Trash2 size={18} />
          <span className="text-[9px] font-black uppercase">날짜별 삭제</span>
        </button>
        <button
          onClick={onOpenResetDb}
          className="bg-white dark:bg-slate-800 text-slate-400 p-4 rounded-3xl border border-slate-200 dark:border-slate-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 hover:border-rose-200 transition-all flex flex-col items-center justify-center gap-1"
          title="DB 전체 초기화"
        >
          <Trash2 size={18} />
          <span className="text-[9px] font-black uppercase">DB 초기화</span>
        </button>
        <div className="bg-slate-900 dark:bg-slate-800 px-6 py-4 rounded-3xl text-white shadow-2xl flex flex-col sm:flex-row gap-4 sm:gap-6 border-b-4 border-blue-600 ml-auto">
          <div className="text-right border-r border-white/10 pr-6">
            <p className="text-[10px] font-bold opacity-50 uppercase mb-1">
              투자 총액
            </p>
            <p className="text-2xl font-black italic">
              {formatNum(totalInvested)}원
            </p>
          </div>
          <div className="text-right border-r border-white/10 px-6">
            <p className="text-[10px] font-bold opacity-50 uppercase mb-1">
              순자산 총액
            </p>
            <p className="text-2xl font-black italic">
              {formatNum(totalAsset)}원
            </p>
          </div>
          <div className="text-right pl-4">
            <p className="text-[10px] font-bold opacity-50 uppercase mb-1">
              실현 수익률
            </p>
            <p
              className={`text-2xl font-black ${
                totalRoi >= 0 ? 'text-blue-400' : 'text-rose-400'
              }`}
            >
              {totalRoi > 0 ? '+' : ''}
              {totalRoi.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

