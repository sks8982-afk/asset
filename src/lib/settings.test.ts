import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS, LOCAL_SETTINGS_KEYS, SETTINGS_CACHE_KEY, diffSettings, isMissingColumnError, parseSettingsRow,
  pendingMigration, readLocalSettings, readSettingsCache, removeLocalSettings, rowToSettings, settingsToRow,
  shadowedLocalFields, sp500PctOf, splitByLegacySchema, weightsFromSp500Pct, writeLocalSettings, writeSettingsCache,
} from './settings';
import { DEFAULT_POLICY_RULES } from './ips';

/** localStorage 대역 */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

/** SQL 적용 후 아직 아무 값도 없는 행 */
const EMPTY_NEW_ROW = {
  id: 1, emergency_fund_amount: 300000, updated_at: '2026-11-05T00:00:00Z',
  monthly_budget: null, core_weights: null, cma_rate: null, goal_asset: null,
  goal_roi: null, ips_rules: null, isa_open_date: null,
};

/** SQL 적용 전 행 (예전 컬럼만) */
const LEGACY_ROW = { id: 1, emergency_fund_amount: 300000, updated_at: '2026-11-05T00:00:00Z' };

describe('defaults', () => {
  it('matches the agreed defaults', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      monthlyBudget: 500_000,
      coreWeights: { sp500: 0.7, nasdaq100: 0.3 },
      cmaRate: 1.95,
      emergencyFundAmount: 0,
      goalAsset: 100_000_000,
      ipsRules: DEFAULT_POLICY_RULES,
      isaOpenDate: null,
    });
  });
});

describe('rowToSettings', () => {
  it('uses defaults without a row or local values', () => {
    expect(rowToSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('takes DB values first, then local values, then defaults', () => {
    const row = { ...EMPTY_NEW_ROW, monthly_budget: 700000, cma_rate: '2.1' };
    const local = { monthlyBudget: 1_300_000, goalAsset: 50_000_000 };
    expect(rowToSettings(row, local)).toMatchObject({
      monthlyBudget: 700_000, // DB
      cmaRate: 2.1, // DB (numeric 문자열)
      goalAsset: 50_000_000, // 이 기기
      emergencyFundAmount: 300_000, // DB 예전 컬럼
      isaOpenDate: null, // 기본값
    });
  });

  it('reads the legacy row (new columns missing)', () => {
    expect(rowToSettings(LEGACY_ROW, { monthlyBudget: 1_300_000 })).toMatchObject({
      monthlyBudget: 1_300_000,
      emergencyFundAmount: 300_000,
      coreWeights: { sp500: 0.7, nasdaq100: 0.3 },
    });
  });

  it('normalizes weights and ignores invalid DB values', () => {
    const row = {
      ...EMPTY_NEW_ROW,
      core_weights: { sp500: 60, nasdaq100: 40 },
      ips_rules: ['  첫째  ', '', 3, '둘째'],
      isa_open_date: '2024-02-30', // 없는 날짜
      goal_asset: -1,
      monthly_budget: 'abc',
    };
    const s = rowToSettings(row);
    expect(s.coreWeights).toEqual({ sp500: 0.6, nasdaq100: 0.4 });
    expect(s.ipsRules).toEqual(['첫째', '둘째']);
    expect(s.isaOpenDate).toBeNull();
    expect(s.goalAsset).toBe(DEFAULT_SETTINGS.goalAsset);
    expect(s.monthlyBudget).toBe(DEFAULT_SETTINGS.monthlyBudget);
  });

  it('rejects broken weight objects', () => {
    for (const bad of [[0.7, 0.3], { sp500: 0, nasdaq100: 0 }, { sp500: 0.7 }, 'x', { sp500: -1, nasdaq100: 2 }]) {
      expect(parseSettingsRow({ core_weights: bad }).coreWeights).toBeUndefined();
    }
  });

  it('keeps an ISA date column value', () => {
    expect(rowToSettings({ ...EMPTY_NEW_ROW, isa_open_date: '2024-03-15' }).isaOpenDate).toBe('2024-03-15');
  });
});

describe('settingsToRow', () => {
  it('maps only the given fields to snake_case columns', () => {
    expect(settingsToRow({ monthlyBudget: 500_000, isaOpenDate: null, coreWeights: { sp500: 0.7, nasdaq100: 0.3 } }))
      .toEqual({ monthly_budget: 500_000, isa_open_date: null, core_weights: { sp500: 0.7, nasdaq100: 0.3 } });
    expect(settingsToRow({ emergencyFundAmount: 0, ipsRules: ['a'], cmaRate: 2, goalAsset: 1 }))
      .toEqual({ emergency_fund_amount: 0, ips_rules: ['a'], cma_rate: 2, goal_asset: 1 });
    expect(settingsToRow({})).toEqual({});
  });
});

describe('local storage readers', () => {
  it('reads the legacy keys written by the old app', () => {
    const storage = memoryStorage({
      'asset-tracker-budget': '700000',
      'asset-tracker-cma-rate': '1.95',
      'asset-tracker-goal-asset': '100000000',
      'asset-tracker-ips-v2': JSON.stringify(['규칙 하나', '  ']),
    });
    expect(readLocalSettings(storage)).toEqual({
      monthlyBudget: 700_000,
      cmaRate: 1.95,
      goalAsset: 100_000_000,
      ipsRules: ['규칙 하나'],
    });
  });

  it('ignores the 1,300,000 budget the old app wrote automatically on first load', () => {
    const storage = memoryStorage({ 'asset-tracker-budget': '1300000' });
    expect(readLocalSettings(storage)).toEqual({});
  });

  it('ignores damaged values and storage errors', () => {
    expect(readLocalSettings(memoryStorage({
      'asset-tracker-budget': 'NaN',
      'asset-tracker-ips-v2': '{broken',
      'asset-tracker-core-weights': '[1,2]',
      'asset-tracker-isa-open-date': 'yesterday',
    }))).toEqual({});
    const throwing = { getItem: () => { throw new Error('denied'); } };
    expect(readLocalSettings(throwing)).toEqual({});
  });

  it('round-trips device-only values', () => {
    const storage = memoryStorage();
    expect(writeLocalSettings(storage, {
      monthlyBudget: 600_000,
      coreWeights: { sp500: 0.65, nasdaq100: 0.35 },
      isaOpenDate: '2024-03-15',
      ipsRules: ['하나'],
      emergencyFundAmount: 100_000, // DB에만 저장 — 무시
    })).toBe(true);
    expect(storage.data.size).toBe(4);
    expect(readLocalSettings(storage)).toEqual({
      monthlyBudget: 600_000,
      coreWeights: { sp500: 0.65, nasdaq100: 0.35 },
      isaOpenDate: '2024-03-15',
      ipsRules: ['하나'],
    });
    writeLocalSettings(storage, { isaOpenDate: null });
    expect(storage.data.has(LOCAL_SETTINGS_KEYS.isaOpenDate)).toBe(false);
    removeLocalSettings(storage, ['monthlyBudget', 'emergencyFundAmount']);
    expect(storage.data.has('asset-tracker-budget')).toBe(false);
    expect(storage.data.size).toBe(2);
  });

  it('reports a storage that cannot be written', () => {
    const full = { setItem: () => { throw new Error('quota'); }, removeItem: () => undefined };
    expect(writeLocalSettings(full, { goalAsset: 1 })).toBe(false);
  });
});

describe('settings cache (used when the DB cannot be read)', () => {
  const resolved = {
    ...DEFAULT_SETTINGS,
    monthlyBudget: 600_000,
    coreWeights: { sp500: 0.65, nasdaq100: 0.35 },
    emergencyFundAmount: 3_000_000,
    ipsRules: ['내 규칙'],
    isaOpenDate: '2024-03-15',
  };

  it('round-trips the full resolved settings', () => {
    const storage = memoryStorage();
    expect(writeSettingsCache(storage, resolved)).toBe(true);
    expect(storage.data.has(SETTINGS_CACHE_KEY)).toBe(true);
    expect(readSettingsCache(storage)).toEqual(resolved);
    expect(readSettingsCache(memoryStorage())).toBeNull();
  });

  it('survives the cleanup of legacy per-field values', () => {
    const storage = memoryStorage({ 'asset-tracker-budget': '400000' });
    writeSettingsCache(storage, resolved);
    removeLocalSettings(storage, Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[]);
    expect(storage.data.has('asset-tracker-budget')).toBe(false);
    expect(readSettingsCache(storage)).toEqual(resolved);
  });

  it('refuses a damaged cache or one missing a money field instead of falling back to defaults', () => {
    expect(readSettingsCache(memoryStorage({ [SETTINGS_CACHE_KEY]: '{oops' }))).toBeNull();
    expect(readSettingsCache(memoryStorage({ [SETTINGS_CACHE_KEY]: '[1,2]' }))).toBeNull();
    const withoutFund = JSON.stringify({ ...resolved, emergencyFundAmount: undefined });
    expect(readSettingsCache(memoryStorage({ [SETTINGS_CACHE_KEY]: withoutFund }))).toBeNull();
    const badFund = { ...resolved, emergencyFundAmount: -1 };
    expect(readSettingsCache(memoryStorage({ [SETTINGS_CACHE_KEY]: JSON.stringify(badFund) }))).toBeNull();
  });

  it('fills optional fields from the defaults', () => {
    const core = JSON.stringify({ ...resolved, ipsRules: undefined, isaOpenDate: undefined, goalAsset: undefined });
    expect(readSettingsCache(memoryStorage({ [SETTINGS_CACHE_KEY]: core }))).toEqual({
      ...resolved, ipsRules: DEFAULT_SETTINGS.ipsRules, isaOpenDate: null, goalAsset: DEFAULT_SETTINGS.goalAsset,
    });
  });

  it('reports a storage that cannot be used', () => {
    expect(writeSettingsCache({ setItem: () => { throw new Error('quota'); } }, resolved)).toBe(false);
    expect(readSettingsCache({ getItem: () => { throw new Error('blocked'); } })).toBeNull();
  });
});

describe('one-time migration', () => {
  const local = { monthlyBudget: 1_300_000, cmaRate: 1.95, ipsRules: ['내 규칙'] };

  it('moves local values into new columns that are still null', () => {
    const row = { ...EMPTY_NEW_ROW, cma_rate: 2.5 };
    expect(pendingMigration(row, local)).toEqual({ monthlyBudget: 1_300_000, ipsRules: ['내 규칙'] });
  });

  it('does nothing before the SQL is applied or without a row', () => {
    expect(pendingMigration(LEGACY_ROW, local)).toEqual({});
    expect(pendingMigration(null, local)).toEqual({});
    expect(pendingMigration(EMPTY_NEW_ROW, {})).toEqual({});
  });

  it('finds local values hidden behind DB values', () => {
    const row = { ...EMPTY_NEW_ROW, monthly_budget: 500_000 };
    expect(shadowedLocalFields(row, local)).toEqual(['monthlyBudget']);
    expect(shadowedLocalFields(LEGACY_ROW, local)).toEqual([]);
  });
});

describe('save failures', () => {
  it('recognizes missing-column errors', () => {
    expect(isMissingColumnError({ code: 'PGRST204', message: '' })).toBe(true);
    expect(isMissingColumnError({ code: '42703', message: '' })).toBe(true);
    expect(isMissingColumnError({
      code: null, message: "Could not find the 'monthly_budget' column of 'app_settings' in the schema cache",
    })).toBe(true);
    expect(isMissingColumnError({ message: 'column "goal_asset" does not exist' })).toBe(true);
    expect(isMissingColumnError({ code: '23502', message: 'null value in column "x" violates not-null constraint' })).toBe(false);
    expect(isMissingColumnError({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isMissingColumnError(null)).toBe(false);
  });

  it('keeps the emergency fund on the old column', () => {
    expect(splitByLegacySchema({ emergencyFundAmount: 1, monthlyBudget: 2, isaOpenDate: null })).toEqual({
      db: { emergencyFundAmount: 1 },
      local: { monthlyBudget: 2, isaOpenDate: null },
    });
  });
});

describe('settings form helpers', () => {
  it('returns only changed fields', () => {
    const next = { ...DEFAULT_SETTINGS, cmaRate: 2, coreWeights: { sp500: 0.7, nasdaq100: 0.3 } };
    expect(diffSettings(DEFAULT_SETTINGS, next)).toEqual({ cmaRate: 2 });
    expect(diffSettings(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, ipsRules: ['x'], isaOpenDate: '2024-01-02' }))
      .toEqual({ ipsRules: ['x'], isaOpenDate: '2024-01-02' });
    expect(diffSettings(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS })).toEqual({});
  });

  it('converts between the S&P500 percent and weights', () => {
    expect(weightsFromSp500Pct(70)).toEqual({ sp500: 0.7, nasdaq100: 0.3 });
    expect(weightsFromSp500Pct(65)).toEqual({ sp500: 0.65, nasdaq100: 0.35 });
    expect(weightsFromSp500Pct(140)).toEqual({ sp500: 1, nasdaq100: 0 });
    expect(weightsFromSp500Pct(Number.NaN)).toEqual({ sp500: 0, nasdaq100: 1 });
    expect(sp500PctOf({ sp500: 0.7, nasdaq100: 0.3 })).toBe(70);
    expect(sp500PctOf({ sp500: 0, nasdaq100: 0 })).toBe(0);
  });
});
