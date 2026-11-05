import { describe, expect, it } from 'vitest';
import {
  ASSETS, ASSET_KEYS, CORE_ASSETS, HOLD_ASSETS, CORE_GROUPS, CORE_GROUP_KEYS,
  getAsset, getBuyVehicle, getGroupKeys, isCoreAsset, keysByTaxClass, type CoreGroup,
} from './assets';
import {
  NAMES, DEFAULT_RATIOS, RATIO_PRESETS, ASSET_MARKET_GROUPS, FOREIGN_ASSET_KEYS,
  DOMESTIC_ASSET_KEYS, ISA_ELIGIBLE_KEYS, NON_ISA_KEYS, TAXABLE_GAIN_KEYS,
} from './constants';

describe('asset registry', () => {
  it('keeps the DB keys exactly', () => {
    expect(ASSET_KEYS).toEqual([
      'snp', 'nasdaq', 'nasdaq_kodex', 'tech10', 'gold',
      'kodex200', 'kodex_kosdaq150', 'semiconductor_top10', 'samsung', 'btc',
    ]);
  });

  it('defines symbols, roles, groups and tax classes', () => {
    const summary = Object.fromEntries(
      ASSETS.map((a) => [a.key, [a.symbol, a.role, a.group ?? '-', a.buyVehicle ? 'buy' : '-', a.taxClass]]),
    );
    expect(summary).toEqual({
      snp: ['360750.KS', 'core', 'sp500', 'buy', 'foreign_etf'],
      nasdaq: ['133690.KS', 'core', 'nasdaq100', '-', 'foreign_etf'],
      nasdaq_kodex: ['379810.KS', 'core', 'nasdaq100', 'buy', 'foreign_etf'],
      tech10: ['381170.KS', 'hold', '-', '-', 'foreign_etf'],
      gold: ['0072R0.KS', 'hold', '-', '-', 'gold_etf'],
      kodex200: ['069500.KS', 'hold', '-', '-', 'domestic_equity'],
      kodex_kosdaq150: ['229200.KS', 'hold', '-', '-', 'domestic_equity'],
      semiconductor_top10: ['396500.KS', 'hold', '-', '-', 'domestic_equity'],
      samsung: ['005930.KS', 'hold', '-', '-', 'domestic_equity'],
      btc: ['BTC-USD', 'hold', '-', '-', 'crypto'],
    });
  });

  it('prices only BTC in USD', () => {
    expect(ASSETS.filter((a) => a.currency === 'USD').map((a) => a.key)).toEqual(['btc']);
  });

  it('splits core and hold assets', () => {
    expect(CORE_ASSETS.map((a) => a.key)).toEqual(['snp', 'nasdaq', 'nasdaq_kodex']);
    expect(HOLD_ASSETS).toHaveLength(ASSETS.length - CORE_ASSETS.length);
    expect(HOLD_ASSETS.every((a) => a.role === 'hold' && a.group === undefined)).toBe(true);
  });

  it('has 70/30 default core weights', () => {
    expect(CORE_GROUP_KEYS).toEqual(['sp500', 'nasdaq100']);
    expect(CORE_GROUPS.sp500).toEqual({ label: 'S&P500', defaultWeight: 0.7 });
    expect(CORE_GROUPS.nasdaq100).toEqual({ label: '나스닥100', defaultWeight: 0.3 });
  });

  it('has exactly one buy vehicle per core group', () => {
    for (const g of CORE_GROUP_KEYS) {
      expect(CORE_ASSETS.filter((a) => a.group === g && a.buyVehicle)).toHaveLength(1);
    }
    expect(getBuyVehicle('sp500').key).toBe('snp');
    expect(getBuyVehicle('nasdaq100').key).toBe('nasdaq_kodex');
    expect(() => getBuyVehicle('kospi' as CoreGroup)).toThrow();
  });

  it('looks assets up by key', () => {
    expect(getAsset('nasdaq_kodex')?.name).toBe('KODEX 미국나스닥100');
    expect(getAsset('cash')).toBeUndefined();
    expect(isCoreAsset('nasdaq')).toBe(true);
    expect(isCoreAsset('tech10')).toBe(false);
    expect(isCoreAsset('unknown')).toBe(false);
  });

  it('lists group members and tax classes', () => {
    expect(getGroupKeys('sp500')).toEqual(['snp']);
    expect(getGroupKeys('nasdaq100')).toEqual(['nasdaq', 'nasdaq_kodex']);
    expect(keysByTaxClass('gold_etf')).toEqual(['gold']);
    expect(keysByTaxClass('crypto', 'gold_etf')).toEqual(['gold', 'btc']);
  });
});

describe('legacy constants derived from the registry', () => {
  const uiKeys = Object.keys(NAMES);

  it('names every asset plus cash', () => {
    expect([...uiKeys].sort()).toEqual([...ASSET_KEYS, 'cash'].sort());
    expect(NAMES.snp).toBe('TIGER 미국S&P500');
    expect(NAMES.cash).toBe('현금(CMA)');
  });

  it('gives every UI key a numeric ratio so the legacy buy plan never sees NaN', () => {
    for (const k of uiKeys) {
      expect(typeof DEFAULT_RATIOS[k]).toBe('number');
      for (const preset of RATIO_PRESETS) expect(typeof preset.ratios[k]).toBe('number');
    }
    expect(DEFAULT_RATIOS.nasdaq_kodex).toBe(0);
  });

  it('puts every UI key in exactly one market group', () => {
    const grouped = ASSET_MARKET_GROUPS.flatMap((g) => g.keys);
    expect([...grouped].sort()).toEqual([...uiKeys].sort());
    expect(ASSET_MARKET_GROUPS.find((g) => g.label === '해외(미장)')?.keys).toContain('nasdaq_kodex');
  });

  it('derives tax key lists', () => {
    expect(FOREIGN_ASSET_KEYS).toEqual(['snp', 'nasdaq', 'nasdaq_kodex', 'tech10', 'btc']);
    expect(DOMESTIC_ASSET_KEYS).toEqual(['gold', 'kodex200', 'kodex_kosdaq150', 'semiconductor_top10', 'samsung']);
    expect(ISA_ELIGIBLE_KEYS).toEqual(ASSET_KEYS.filter((k) => k !== 'btc'));
    expect(NON_ISA_KEYS).toEqual(['btc']);
    expect(TAXABLE_GAIN_KEYS).toEqual(['snp', 'nasdaq', 'nasdaq_kodex', 'tech10', 'gold']);
  });
});
