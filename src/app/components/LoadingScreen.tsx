'use client';

import React from 'react';
import { RefreshCcw } from 'lucide-react';

type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({ message = '장부 불러오는 중…' }: LoadingScreenProps) {
  return (
    <div
      role="status"
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--background)] text-slate-500 dark:text-slate-400"
    >
      <RefreshCcw className="animate-spin" size={28} aria-hidden="true" />
      <p className="text-sm font-semibold">{message}</p>
    </div>
  );
}
