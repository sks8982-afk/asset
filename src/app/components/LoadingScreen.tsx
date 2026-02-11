'use client';

import React from 'react';
import { RefreshCcw } from 'lucide-react';

type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({
  message = '장부 불러오는 중...',
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] font-black text-slate-400">
      <RefreshCcw className="animate-spin mb-4" size={48} />
      <p className="tracking-widest uppercase italic text-center">{message}</p>
    </div>
  );
}
