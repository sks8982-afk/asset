'use client';

import React from 'react';
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
import { EmotionJournalSection } from '../EmotionJournalSection';

type RecordsTabProps = {
  myAccount: MyAccountData;
  dbHistory: DbHistory;
  reload: () => Promise<void>;
  /** 장부를 제대로 불러온 상태인지 — 아니면 매도·삭제·배당·보정을 막는다 (CSV 내보내기는 된다) */
  canWrite: boolean;
  /** 내가 적어 둔 투자 원칙 (매도 경고 창에 표시) */
  policyRules: string[];
  addDividend: (dividend: Omit<DividendRecord, 'id'>) => Promise<boolean>;
  deleteDividend: (id: string) => Promise<void>;
  saveBtcAmountOverride: (recordId: string, amountOverride: number | null) => Promise<void>;
};

const ACTION_CLASS =
  'flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 py-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 sm:flex-row sm:gap-2 sm:text-sm';

/** 기록 — 장부 관리(매도·날짜별 삭제·CSV) + 투자·입금·배당 내역 + 데이터 점검 + 감정 일기 */
export function RecordsTab({
  myAccount, dbHistory, reload, canWrite, policyRules, addDividend, deleteDividend, saveBtcAmountOverride,
}: RecordsTabProps) {
  const deleteByDate = useDeleteByDate({ dbHistory, reload, canWrite });
  const sellFlow = useSellFlow({ records: dbHistory.records, reload, canWrite });
  const exportCsv = useCsvExport(dbHistory, myAccount);

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card title="장부 관리" subtitle="매도·삭제는 되돌릴 수 없으니 확인 후 진행하세요">
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={sellFlow.openForm} disabled={!canWrite} className={ACTION_CLASS}>
            <TrendingDown size={18} aria-hidden="true" />
            매도 기록
          </button>
          <button type="button" onClick={deleteByDate.openModal} disabled={!canWrite} className={ACTION_CLASS}>
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
        records={dbHistory.records}
        names={NAMES}
        formatNum={formatNum}
        formatDec={formatDec}
        onSaveAmountOverride={saveBtcAmountOverride}
        canEdit={canWrite}
      />
      <DepositsHistorySection budgets={dbHistory.budgets} formatNum={formatNum} />
      <DividendSection
        dividends={dbHistory.dividends}
        names={NAMES}
        formatNum={formatNum}
        onAddDividend={addDividend}
        onDeleteDividend={deleteDividend}
        canEdit={canWrite}
      />
      <DataIntegritySection
        records={dbHistory.records}
        batchSummaries={dbHistory.batchSummaries}
        budgets={dbHistory.budgets}
        formatNum={formatNum}
      />
      <EmotionJournalSection totalAsset={myAccount.totalAsset} formatNum={formatNum} />

      <SellRecordModal
        open={sellFlow.formOpen}
        onClose={sellFlow.closeForm}
        records={dbHistory.records}
        names={NAMES}
        currentPriceMap={myAccount.currentPriceMap}
        formatNum={formatNum}
        formatDec={formatDec}
        onSave={sellFlow.submitSell}
        isSaving={sellFlow.isSaving}
      />
      <IpsViolationModal
        open={sellFlow.isReviewing}
        violations={sellFlow.violations}
        policyRules={policyRules}
        onProceed={sellFlow.proceedAnyway}
        onCancel={sellFlow.cancelSell}
        isSaving={sellFlow.isSaving}
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
