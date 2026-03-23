'use client';

import React, { useState } from 'react';
import { X, TrendingDown } from 'lucide-react';

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
      alert('자산, 수량, 단가를 모두 입력해 주세요.');
      return;
    }
    if (selectedPortfolio && qty > selectedPortfolio.qty) {
      alert(`보유 수량(${formatDec(selectedPortfolio.qty)})을 초과할 수 없습니다.`);
      return;
    }
    await onSave({
      asset_key: selectedAsset,
      quantity: qty,
      price,
      amount: totalAmount,
      date: sellDate,
    });
    setSelectedAsset('');
    setSellQty('');
    setSellPrice('');
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
          </>
        )}

        {/* 저장 */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving || !selectedAsset || qty <= 0}
          className="w-full py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isSaving ? '저장 중...' : '매도 기록 저장'}
        </button>
      </div>
    </div>
  );
}
