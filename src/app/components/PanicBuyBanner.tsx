'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

type PanicBuyBannerProps = {
  onEnterPanicMode: () => void;
};

export function PanicBuyBanner({ onEnterPanicMode }: PanicBuyBannerProps) {
  return (
    <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-xl animate-bounce flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AlertTriangle size={24} />
        <p className="font-black">
          ⚠️ 하락장 감지! 보유 현금을 투입할 때입니다.
        </p>
      </div>
      <button
        onClick={onEnterPanicMode}
        className="bg-white text-rose-600 px-4 py-2 rounded-xl font-black text-sm"
      >
        추매 모드 ON
      </button>
    </div>
  );
}
