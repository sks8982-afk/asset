'use client';

import { useCallback } from 'react';
import type { DbHistory, MyAccountData } from '@/lib/types';
import { NAMES } from '@/lib/constants';
import { getRecordAmount } from '@/lib/utils';
import { todayISO } from '@/lib/date';

/** 장부 CSV 문자열 — 기준일은 KST */
export function buildLedgerCsv(
  dbHistory: Pick<DbHistory, 'records' | 'budgets'>,
  myAccount: Pick<MyAccountData, 'totalAsset' | 'totalInvested'> | null,
  today: string,
): string {
  const rows: string[] = ['구분,날짜,항목,단가,수량,금액,비고'];
  for (const r of dbHistory.records) {
    const kind = r.type === 'sell' ? '매도' : '매수';
    rows.push(
      `${kind},${r.date},${NAMES[r.asset_key] ?? r.asset_key},${r.price},${r.quantity},${getRecordAmount(r)},${r.is_panic_buy ? '추매' : ''}`,
    );
  }
  rows.push('', '월별 입금 내역', '월,입금액');
  for (const b of dbHistory.budgets) rows.push(`${b.month_date},${b.amount}`);
  rows.push('', '현재 스냅샷', `기준일,${today}`);
  if (myAccount) {
    const roi = myAccount.totalInvested > 0 ? (myAccount.totalAsset / myAccount.totalInvested - 1) * 100 : 0;
    rows.push(`총자산,${myAccount.totalAsset}`, `누적원금,${myAccount.totalInvested}`, `수익률(%),${roi}`);
  }
  return rows.join('\n');
}

/** CSV 내보내기 (엑셀 한글 깨짐 방지 BOM 포함) */
export function useCsvExport(
  dbHistory: Pick<DbHistory, 'records' | 'budgets'>,
  myAccount: Pick<MyAccountData, 'totalAsset' | 'totalInvested'> | null,
): () => void {
  return useCallback(() => {
    const today = todayISO();
    const blob = new Blob(['﻿' + buildLedgerCsv(dbHistory, myAccount, today)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-tracker-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dbHistory, myAccount]);
}
