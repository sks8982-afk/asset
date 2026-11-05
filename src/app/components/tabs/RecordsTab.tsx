'use client';

import React, { useMemo, useState } from 'react';
import { Download, Trash2, TrendingDown } from 'lucide-react';
import type { DbHistory, DividendRecord, MyAccountData } from '@/lib/types';
import { NAMES } from '@/lib/constants';
import { formatDec, formatNum } from '@/lib/utils';
import { useDeleteByDate } from '../../hooks/useDeleteByDate';
import { useSellFlow } from '../../hooks/useSellFlow';
import { useCsvExport } from '../../hooks/useCsvExport';
import { Card } from '../ui/Card';
import { SellRecordModal } from '../SellRecordModal';
import { IpsViolationModal } from '../IpsViolationModal';
import { DeleteByDateModal } from '../DeleteByDateModal';
import { InvestmentHistorySection } from '../InvestmentHistorySection';
import { DepositsHistorySection } from '../DepositsHistorySection';
import { DividendSection } from '../DividendSection';
import { DataIntegritySection } from '../DataIntegritySection';

type RecordsTabProps = {
  myAccount: MyAccountData;
  dbHistory: DbHistory;
  reload: () => Promise<void>;
  /** 내가 적어 둔 투자 원칙 (매도 경고 창에 표시) */
  policyRules: string[];
  addDividend: (dividend: Omit<DividendRecord, 'id'>) => Promise<void>;
  deleteDividend: (id: string) => Promise<void>;
  saveBtcAmountOverride: (recordId: string, amountOverride: number | null) => Promise<void>;
};

const ACTION_CLASS =
  'flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 py-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 sm:flex-row sm:gap-2 sm:text-sm';

/** 기록 — 장부 관리(매도·날짜별 삭제·CSV) + 투자·입금·배당 내역 + 데이터 점검 */
export function RecordsTab({
  myAccount, dbHistory, reload, policyRules, addDividend, deleteDividend, saveBtcAmountOverride,
}: RecordsTabProps) {
  const [filterMonth, setFilterMonth] = useState('');
  const [filterAsset, setFilterAsset] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showDeposits, setShowDeposits] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const deleteByDate = useDeleteByDate({ dbHistory, reload });
  const sellFlow = useSellFlow({ records: dbHistory.records, portfolio: myAccount.portfolio, reload });
  const exportCsv = useCsvExport(dbHistory, myAccount);

  const filteredRecords = useMemo(() => {
    let list = [...dbHistory.records].reverse();
    if (filterMonth) list = list.filter((r) => r.date.startsWith(filterMonth));
    if (filterAsset) list = list.filter((r) => r.asset_key === filterAsset);
    return list;
  }, [dbHistory.records, filterMonth, filterAsset]);

  return (
    <div className="space-y-6">
      <Card title="장부 관리" subtitle="매도·삭제는 되돌릴 수 없으니 확인 후 진행하세요">
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => setShowSellModal(true)} className={ACTION_CLASS}>
            <TrendingDown size={18} aria-hidden="true" />
            매도 기록
          </button>
          <button type="button" onClick={deleteByDate.openModal} className={ACTION_CLASS}>
            <Trash2 size={18} aria-hidden="true" />
            날짜별 삭제
          </button>
          <button type="button" onClick={exportCsv} className={ACTION_CLASS}>
            <Download size={18} aria-hidden="true" />
            CSV 내보내기
          </button>
        </div>
      </Card>

      <InvestmentHistorySection
        open={showHistory}
        onToggle={() => setShowHistory(!showHistory)}
        filterMonth={filterMonth}
        filterAsset={filterAsset}
        onFilterMonthChange={setFilterMonth}
        onFilterAssetChange={setFilterAsset}
        records={filteredRecords}
        allRecords={dbHistory.records}
        names={NAMES}
        formatNum={formatNum}
        formatDec={formatDec}
        onSaveAmountOverride={saveBtcAmountOverride}
      />
      <DepositsHistorySection
        open={showDeposits}
        onToggle={() => setShowDeposits(!showDeposits)}
        budgets={dbHistory.budgets}
        formatNum={formatNum}
      />
      <DividendSection
        dividends={dbHistory.dividends}
        names={NAMES}
        formatNum={formatNum}
        onAddDividend={addDividend}
        onDeleteDividend={deleteDividend}
      />
      <DataIntegritySection
        records={dbHistory.records}
        batchSummaries={dbHistory.batchSummaries}
        budgets={dbHistory.budgets}
        formatNum={formatNum}
      />

      <SellRecordModal
        open={showSellModal}
        onClose={() => setShowSellModal(false)}
        portfolio={myAccount.portfolio}
        names={NAMES}
        currentPriceMap={myAccount.currentPriceMap}
        formatNum={formatNum}
        formatDec={formatDec}
        onSave={sellFlow.submitSell}
        isSaving={false}
      />
      <IpsViolationModal
        open={sellFlow.isReviewing}
        violations={sellFlow.violations}
        policyRules={policyRules}
        onProceed={sellFlow.proceedAnyway}
        onCancel={sellFlow.cancelSell}
      />
      <DeleteByDateModal
        open={deleteByDate.open}
        onClose={deleteByDate.close}
        recordBatches={deleteByDate.recordBatches}
        selectedKeys={deleteByDate.selectedKeys}
        onToggleBatch={deleteByDate.toggleBatch}
        onConfirm={deleteByDate.confirmDelete}
        isDeleting={deleteByDate.isDeleting}
      />
    </div>
  );
}
