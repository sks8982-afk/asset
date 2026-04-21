'use client';

import React, { useState } from 'react';
import { X, TrendingDown, AlertTriangle } from 'lucide-react';
import { toast } from '../hooks/useToast';

export type SellReason =
  | 'rebalancing'
  | 'goal_reached'
  | 'emergency_cash'
  | 'strategy_change'
  | 'other';

export const SELL_REASONS: { key: SellReason; label: string; desc: string; friction: 'low' | 'high' }[] = [
  { key: 'rebalancing',     label: '분기 리밸런싱',   desc: '3/6/9/12월 비중 재조정', friction: 'low' },
  { key: 'goal_reached',    label: '목표 달성',       desc: 'ROI/자산 목표 도달',      friction: 'low' },
  { key: 'emergency_cash',  label: '긴급 자금 필요',  desc: '예비비로 부족',           friction: 'low' },
  { key: 'strategy_change', label: '전략 변경',       desc: '비중·자산 교체',          friction: 'low' },
  { key: 'other',           label: '⚠️ 기타 (감정 포함)', desc: '공포/후회/조급함 등',  friction: 'high' },
];

type SellRecordModalProps = {
  open: boolean;
  onClose: () => void;
  portfolio: Record<string, { qty: number; avg: number; val?: number }>;
  names: Record<string, string>;
  currentPriceMap: Record<string, number>;
  formatNum: (n: number) => string;
  formatDec: (n: number) => string;
  onSave: (sellData: {
    asset_key: string;
    quantity: number;
    price: number;
    amount: number;
    date: string;
    reason?: string;
  }) => Promise<void>;
  isSaving: boolean;
};

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
  const [selectedAsset, setSelectedAsset] = useState('');
  const [sellQty, setSellQty] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [reason, setReason] = useState<SellReason | ''>('');
  const [reasonNote, setReasonNote] = useState('');
  const [confirmEmotional, setConfirmEmotional] = useState(false);

  if (!open) return null;

  const sellableAssets = Object.entries(portfolio).filter(
    ([k, v]) => k !== 'cash' && v.qty > 0,
  );

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
    if (selectedPortfolio) {
      setSellQty(String(selectedPortfolio.qty));
    }
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
      toast.warning('⚠️ 감정 매도일 수 있습니다. 확인 체크를 눌러주세요.');
      return;
    }
    const reasonLabel = SELL_REASONS.find((r) => r.key === reason)?.label ?? reason;
    const fullReason = reasonNote ? `${reasonLabel} - ${reasonNote}` : reasonLabel;
    await onSave({
      asset_key: selectedAsset,
      quantity: qty,
      price,
      amount: totalAmount,
      date: sellDate,
      reason: fullReason,
    });
    setSelectedAsset('');
    setSellQty('');
    setSellPrice('');
    setReason('');
    setReasonNote('');
    setConfirmEmotional(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            매도 기록
          </h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 날짜 */}
        <div>
          <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">매도일</label>
          <input
            type="date"
            value={sellDate}
            onChange={(e) => setSellDate(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm"
          />
        </div>

        {/* 자산 선택 */}
        <div>
          <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">매도 자산</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {sellableAssets.map(([key, data]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectAsset(key)}
                className={`text-left px-3 py-2 rounded-xl border text-sm transition-all ${
                  selectedAsset === key
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                }`}
              >
                <div className="font-medium truncate">{names[key] ?? key}</div>
                <div className="text-xs text-zinc-400">{formatDec(data.qty)}주 보유</div>
              </button>
            ))}
          </div>
          {sellableAssets.length === 0 && (
            <p className="text-sm text-zinc-400 mt-2">매도 가능한 자산이 없습니다.</p>
          )}
        </div>

        {selectedAsset && selectedPortfolio && (
          <>
            {/* 수량 입력 */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">매도 수량</label>
                <button
                  type="button"
                  onClick={handleSellAll}
                  className="text-xs text-red-500 hover:underline"
                >
                  전량 매도
                </button>
              </div>
              <input
                type="number"
                step="any"
                value={sellQty}
                onChange={(e) => setSellQty(e.target.value)}
                placeholder={`최대 ${formatDec(selectedPortfolio.qty)}`}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm"
              />
            </div>

            {/* 단가 입력 */}
            <div>
              <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">매도 단가</label>
              <input
                type="number"
                step="any"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm"
              />
            </div>

            {/* 요약 */}
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">매도 총액</span>
                <span className="font-bold">{formatNum(totalAmount)}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">평균 매수가</span>
                <span>{formatNum(avgCost)}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">예상 손익</span>
                <span className={`font-bold ${estimatedPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {estimatedPnl >= 0 ? '+' : ''}{formatNum(estimatedPnl)}원
                  {avgCost > 0 && ` (${((price / avgCost - 1) * 100).toFixed(1)}%)`}
                </span>
              </div>
            </div>

            {/* 매도 사유 (감정 방어) */}
            <div>
              <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <AlertTriangle size={14} className="text-amber-500" />
                매도 사유 (필수)
              </label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {SELL_REASONS.map((r) => {
                  const isSelected = reason === r.key;
                  const isRisky = r.friction === 'high';
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => { setReason(r.key); setConfirmEmotional(false); }}
                      className={`px-3 py-2 rounded-xl border text-left transition-all ${
                        isSelected
                          ? isRisky
                            ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-400 ring-2 ring-amber-400'
                            : 'bg-sky-50 dark:bg-sky-900/30 border-sky-400 ring-2 ring-sky-400'
                          : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                      }`}
                    >
                      <div className="text-sm font-bold">{r.label}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">{r.desc}</div>
                    </button>
                  );
                })}
              </div>

              {reason === 'other' && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300">
                  <p className="text-xs text-amber-800 dark:text-amber-200 font-bold mb-2">
                    ⚠️ 이 매도가 정말 필요한가요? 감정에 휘둘리고 있을 수 있습니다.
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mb-2">
                    과거 통계: 감정 매도는 평균적으로 6개월 내 재매수 시 가격이 더 높습니다.
                  </p>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmEmotional}
                      onChange={(e) => setConfirmEmotional(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>그럼에도 매도하겠습니다 (감정 매도 기록됨)</span>
                  </label>
                </div>
              )}

              <input
                type="text"
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                placeholder="세부 메모 (선택)"
                className="w-full mt-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs"
              />
            </div>
          </>
        )}

        {/* 저장 */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving || !selectedAsset || qty <= 0 || !reason}
          className="w-full py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isSaving ? '저장 중...' : '매도 기록 저장'}
        </button>
      </div>
    </div>
  );
}
