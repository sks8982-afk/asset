'use client';

import React, { useId, useState } from 'react';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import { SELL_REASON_LABELS, type SellReason } from '@/lib/ips';
import { todayISO } from '@/lib/date';
import { toast } from '../hooks/useToast';
import type { SellSubmission } from '../hooks/useSellFlow';
import { Modal } from './ui/Modal';
import { INPUT_CLASS, LABEL_CLASS, NOTICE_CLASS, PANEL_CLASS, buttonClass, signToneClass } from './ui/styles';

/** 매도 사유 선택지 — 'other'는 감정 매도 확인을 한 번 더 받는다 */
const SELL_REASONS: { key: SellReason; desc: string; friction: 'low' | 'high' }[] = [
  { key: 'rebalancing',    desc: '목표 비중으로 되돌리기', friction: 'low' },
  { key: 'simplify',       desc: '보유만 종목 정리·교체',  friction: 'low' },
  { key: 'goal_reached',   desc: 'ROI/자산 목표 도달',     friction: 'low' },
  { key: 'emergency_cash', desc: '예비비로 부족',          friction: 'low' },
  { key: 'other',          desc: '공포/후회/조급함 등',    friction: 'high' },
];

type SellRecordModalProps = {
  open: boolean;
  onClose: () => void;
  portfolio: Record<string, { qty: number; avg: number; val?: number }>;
  names: Record<string, string>;
  currentPriceMap: Record<string, number>;
  formatNum: (n: number) => string;
  formatDec: (n: number) => string;
  onSave: (sellData: SellSubmission) => Promise<void>;
  isSaving: boolean;
};

const CHOICE_ON = 'border-blue-400 bg-blue-50 ring-1 ring-blue-400 dark:border-blue-500 dark:bg-blue-950/40';
const CHOICE_RISKY_ON = 'border-amber-400 bg-amber-50 ring-1 ring-amber-400 dark:border-amber-500 dark:bg-amber-950/40';
const CHOICE_OFF = 'border-slate-200 bg-white hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800';

export function SellRecordModal({
  open,
  onClose,
  portfolio,
  names,
  currentPriceMap,
  formatNum,
  formatDec,
  onSave,
  isSaving,
}: SellRecordModalProps) {
  const ids = { date: useId(), qty: useId(), price: useId() };
  const [selectedAsset, setSelectedAsset] = useState('');
  const [sellQty, setSellQty] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState(todayISO);
  const [reason, setReason] = useState<SellReason | ''>('');
  const [confirmEmotional, setConfirmEmotional] = useState(false);

  if (!open) return null;

  const sellableAssets = Object.entries(portfolio).filter(([k, v]) => k !== 'cash' && v.qty > 0);
  const selectedPortfolio = selectedAsset ? portfolio[selectedAsset] : null;
  const qty = Number(sellQty) || 0;
  const price = Number(sellPrice) || 0;
  const totalAmount = qty * price;
  const avgCost = selectedPortfolio?.avg ?? 0;
  const estimatedPnl = qty * (price - avgCost);

  const handleSelectAsset = (key: string) => {
    setSelectedAsset(key);
    setSellPrice(String(currentPriceMap[key] ?? 0));
    setSellQty('');
  };

  const handleSellAll = () => {
    if (selectedPortfolio) setSellQty(String(selectedPortfolio.qty));
  };

  const handleSubmit = async () => {
    if (!selectedAsset || qty <= 0 || price <= 0) {
      toast.warning('자산, 수량, 단가를 모두 입력해 주세요.');
      return;
    }
    if (selectedPortfolio && qty > selectedPortfolio.qty) {
      toast.warning(`보유 수량(${formatDec(selectedPortfolio.qty)})을 초과할 수 없습니다.`);
      return;
    }
    if (!reason) {
      toast.warning('매도 사유를 선택해 주세요. (감정 방어)');
      return;
    }
    if (reason === 'other' && !confirmEmotional) {
      toast.warning('감정 매도일 수 있습니다. 확인 체크를 눌러주세요.');
      return;
    }
    await onSave({ asset_key: selectedAsset, quantity: qty, price, amount: totalAmount, date: sellDate, reason });
    setSelectedAsset('');
    setSellQty('');
    setSellPrice('');
    setReason('');
    setConfirmEmotional(false);
    onClose();
  };

  return (
    <Modal title="매도 기록" icon={<TrendingDown size={18} />} onClose={onClose} closeOnBackdrop={false} size="lg">
      <div className="space-y-5">
        <div>
          <label htmlFor={ids.date} className={LABEL_CLASS}>매도일</label>
          <input
            id={ids.date}
            type="date"
            value={sellDate}
            onChange={(e) => setSellDate(e.target.value)}
            className={`${INPUT_CLASS} mt-1 w-full`}
          />
        </div>

        <div>
          <p className={LABEL_CLASS}>매도 자산</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {sellableAssets.map(([key, data]) => (
              <button
                key={key}
                type="button"
                aria-pressed={selectedAsset === key}
                onClick={() => handleSelectAsset(key)}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 ${
                  selectedAsset === key ? CHOICE_ON : CHOICE_OFF
                }`}
              >
                <span className="block truncate font-semibold text-slate-800 dark:text-slate-100">{names[key] ?? key}</span>
                <span className="block text-xs tabular-nums text-slate-500 dark:text-slate-400">{formatDec(data.qty)}주 보유</span>
              </button>
            ))}
          </div>
          {sellableAssets.length === 0 && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">매도 가능한 자산이 없습니다.</p>
          )}
        </div>

        {selectedAsset && selectedPortfolio && (
          <>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor={ids.qty} className={LABEL_CLASS}>매도 수량</label>
                <button type="button" onClick={handleSellAll} className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                  전량 매도
                </button>
              </div>
              <input
                id={ids.qty}
                type="number"
                step="any"
                inputMode="decimal"
                value={sellQty}
                onChange={(e) => setSellQty(e.target.value)}
                placeholder={`최대 ${formatDec(selectedPortfolio.qty)}`}
                className={`${INPUT_CLASS} mt-1 w-full tabular-nums`}
              />
            </div>

            <div>
              <label htmlFor={ids.price} className={LABEL_CLASS}>매도 단가</label>
              <input
                id={ids.price}
                type="number"
                step="any"
                inputMode="decimal"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className={`${INPUT_CLASS} mt-1 w-full tabular-nums`}
              />
            </div>

            <dl className={`${PANEL_CLASS} space-y-2 text-sm tabular-nums`}>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">매도 총액</dt>
                <dd className="font-bold text-slate-900 dark:text-slate-100">{formatNum(totalAmount)}원</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">평균 매수가</dt>
                <dd className="text-slate-800 dark:text-slate-200">{formatNum(avgCost)}원</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">예상 손익</dt>
                <dd className={`font-bold ${signToneClass(estimatedPnl)}`}>
                  {estimatedPnl >= 0 ? '+' : ''}{formatNum(estimatedPnl)}원
                  {avgCost > 0 && ` (${((price / avgCost - 1) * 100).toFixed(1)}%)`}
                </dd>
              </div>
            </dl>

            <fieldset>
              <legend className={`flex items-center gap-1 ${LABEL_CLASS}`}>
                <AlertTriangle size={14} className="text-amber-500" aria-hidden="true" />
                매도 사유 (필수)
              </legend>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {SELL_REASONS.map((r) => {
                  const isSelected = reason === r.key;
                  const isRisky = r.friction === 'high';
                  return (
                    <button
                      key={r.key}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => { setReason(r.key); setConfirmEmotional(false); }}
                      className={`rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 ${
                        isSelected ? (isRisky ? CHOICE_RISKY_ON : CHOICE_ON) : CHOICE_OFF
                      }`}
                    >
                      <span className={`block text-sm font-bold ${isRisky ? 'text-amber-800 dark:text-amber-300' : 'text-slate-800 dark:text-slate-100'}`}>
                        {SELL_REASON_LABELS[r.key]}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{r.desc}</span>
                    </button>
                  );
                })}
              </div>

              {reason === 'other' && (
                <div className={`mt-3 ${NOTICE_CLASS}`}>
                  <p className="font-bold">이 매도가 정말 필요한가요? 감정에 휘둘리고 있을 수 있습니다.</p>
                  <p className="mt-1 text-xs">과거 통계: 감정 매도는 평균적으로 6개월 내 재매수 시 가격이 더 높습니다.</p>
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={confirmEmotional}
                      onChange={(e) => setConfirmEmotional(e.target.checked)}
                      className="h-4 w-4 accent-amber-600"
                    />
                    그럼에도 매도하겠습니다
                  </label>
                </div>
              )}
            </fieldset>
          </>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving || !selectedAsset || qty <= 0 || !reason}
          className={buttonClass('danger', 'md', 'w-full py-3')}
        >
          {isSaving ? '저장 중…' : '매도 기록 저장'}
        </button>
      </div>
    </Modal>
  );
}
