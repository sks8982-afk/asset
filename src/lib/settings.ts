/**
 * 앱 설정 — DB(app_settings, id = 1 한 행)와 브라우저(localStorage) 값의 변환.
 * 네트워크·화면 상태와 무관한 순수 함수만 둔다 (useSettings 훅이 사용).
 *
 * 값을 정하는 순서: DB 값(널이 아니고 유효) → 이 기기에 남은 값 → 기본값
 */
import { CORE_GROUPS, CORE_GROUP_KEYS, type CoreGroup } from './assets';
import { STORAGE_KEYS } from './constants';
import { DEFAULT_POLICY_RULES } from './ips';

export type AppSettings = {
  /** 월 적립 금액 (원) */
  monthlyBudget: number;
  /** 코어 목표 비중 (합 1) */
  coreWeights: Record<CoreGroup, number>;
  /** CMA 연 이율 (%) */
  cmaRate: number;
  /** 비상금 — 장부 현금 중 투자하지 않고 남겨 둘 금액 (원) */
  emergencyFundAmount: number;
  /** 목표 자산 (원) */
  goalAsset: number;
  /** 투자 원칙 문구 */
  ipsRules: string[];
  /** ISA 가입일 'YYYY-MM-DD' */
  isaOpenDate: string | null;
};

export type SettingsKey = keyof AppSettings;
export type SettingsPatch = Partial<AppSettings>;

/** select('*')로 받은 app_settings 행 */
export type SettingsRow = Record<string, unknown>;

type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'setItem' | 'removeItem'>;

export const DEFAULT_SETTINGS: AppSettings = {
  monthlyBudget: 500_000,
  coreWeights: {
    sp500: CORE_GROUPS.sp500.defaultWeight,
    nasdaq100: CORE_GROUPS.nasdaq100.defaultWeight,
  },
  cmaRate: 1.95,
  emergencyFundAmount: 0,
  goalAsset: 100_000_000,
  ipsRules: DEFAULT_POLICY_RULES,
  isaOpenDate: null,
};

const SETTINGS_KEYS: readonly SettingsKey[] = [
  'monthlyBudget', 'coreWeights', 'cmaRate', 'emergencyFundAmount', 'goalAsset', 'ipsRules', 'isaOpenDate',
];

/** 필드 → app_settings 컬럼 */
const SETTINGS_COLUMNS: Readonly<Record<SettingsKey, string>> = {
  monthlyBudget: 'monthly_budget',
  coreWeights: 'core_weights',
  cmaRate: 'cma_rate',
  emergencyFundAmount: 'emergency_fund_amount',
  goalAsset: 'goal_asset',
  ipsRules: 'ips_rules',
  isaOpenDate: 'isa_open_date',
};

/**
 * docs/sql/2026-11-renewal.sql 이전부터 있던 컬럼의 필드.
 * 새 컬럼이 없어 저장이 실패하면 이 필드만 DB에 다시 저장한다.
 */
const LEGACY_DB_FIELDS: readonly SettingsKey[] = ['emergencyFundAmount'];

type LocalKey = Exclude<SettingsKey, 'emergencyFundAmount'>;

/** DB 대신 이 기기에 둘 때의 저장 키 (비상금은 예전부터 DB에만 저장) */
export const LOCAL_SETTINGS_KEYS: Readonly<Record<LocalKey, string>> = {
  monthlyBudget: STORAGE_KEYS.budget,
  coreWeights: 'asset-tracker-core-weights',
  cmaRate: STORAGE_KEYS.cmaRate,
  goalAsset: STORAGE_KEYS.goalAsset,
  ipsRules: 'asset-tracker-ips-v2',
  isaOpenDate: 'asset-tracker-isa-open-date',
};

// ─── 값 검증 (외부 값은 믿지 않는다 — 유효하지 않으면 null) ───

function toNonNegativeNumber(value: unknown): number | null {
  const n = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** 비중 객체 → 합이 1이 되도록 정규화 */
function toCoreWeights(value: unknown): Record<CoreGroup, number> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const weights = CORE_GROUP_KEYS.map((g) => toNonNegativeNumber(source[g]));
  if (weights.some((w) => w === null)) return null;
  const sum = weights.reduce<number>((s, w) => s + (w ?? 0), 0);
  if (!(sum > 0)) return null;
  return Object.fromEntries(
    CORE_GROUP_KEYS.map((g, i) => [g, (weights[i] ?? 0) / sum]),
  ) as Record<CoreGroup, number>;
}

function toRules(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const rules = value
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim())
    .filter((s) => s !== '');
  return rules.length > 0 ? rules : null;
}

/** 실제 있는 날짜의 'YYYY-MM-DD'만 */
function toIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const valid = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  return valid ? s : null;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** DB 값 검증기 */
const PARSERS: { [K in SettingsKey]: (value: unknown) => AppSettings[K] | null } = {
  monthlyBudget: toNonNegativeNumber,
  coreWeights: toCoreWeights,
  cmaRate: toNonNegativeNumber,
  emergencyFundAmount: toNonNegativeNumber,
  goalAsset: toNonNegativeNumber,
  ipsRules: toRules,
  isaOpenDate: toIsoDate,
};

/**
 * 예전 버전이 처음 열 때 이 기기에 자동으로 써 둔 월 예산 기본값.
 * 사용자가 고른 값이 아니므로(실제 입금은 14만~60만원) 무시하고 새 기본값을 쓴다.
 */
const OLD_AUTO_DEFAULT_BUDGET = 1_300_000;

/** 이 기기 저장 문자열 검증기 */
const LOCAL_PARSERS: { [K in LocalKey]: (raw: string) => AppSettings[K] | null } = {
  monthlyBudget: (raw) => {
    const value = toNonNegativeNumber(raw);
    return value === OLD_AUTO_DEFAULT_BUDGET ? null : value;
  },
  coreWeights: (raw) => toCoreWeights(parseJson(raw)),
  cmaRate: toNonNegativeNumber,
  goalAsset: toNonNegativeNumber,
  ipsRules: (raw) => toRules(parseJson(raw)),
  isaOpenDate: toIsoDate,
};

function setField<K extends SettingsKey>(target: SettingsPatch, key: K, value: AppSettings[K]): void {
  target[key] = value;
}

function isLocalKey(key: SettingsKey): key is LocalKey {
  return key in LOCAL_SETTINGS_KEYS;
}

function hasColumn(row: SettingsRow, key: SettingsKey): boolean {
  return Object.prototype.hasOwnProperty.call(row, SETTINGS_COLUMNS[key]);
}

// ─── DB 행 ↔ 설정 ───

/** DB 행에서 값이 있는(널이 아니고 유효한) 필드만 */
export function parseSettingsRow(row: SettingsRow | null | undefined): SettingsPatch {
  const out: SettingsPatch = {};
  if (!row) return out;
  for (const key of SETTINGS_KEYS) {
    const value = PARSERS[key](row[SETTINGS_COLUMNS[key]]);
    if (value !== null) setField(out, key, value);
  }
  return out;
}

/** 설정 확정: DB 값 → 이 기기 값(local) → 기본값 */
export function rowToSettings(row: SettingsRow | null | undefined, local: SettingsPatch = {}): AppSettings {
  return { ...DEFAULT_SETTINGS, ...local, ...parseSettingsRow(row) };
}

/** 바꿀 필드 → app_settings 컬럼 (snake_case) */
export function settingsToRow(patch: SettingsPatch): Record<string, unknown> {
  return Object.fromEntries(
    SETTINGS_KEYS.filter((key) => patch[key] !== undefined).map((key) => [SETTINGS_COLUMNS[key], patch[key]]),
  );
}

// ─── 이 기기(localStorage) ───

/** 예전 버전이 남긴 값 + DB에 못 넣고 이 기기에 둔 값 (손상된 값은 무시) */
export function readLocalSettings(storage: StorageReader): SettingsPatch {
  const out: SettingsPatch = {};
  for (const key of SETTINGS_KEYS) {
    if (!isLocalKey(key)) continue;
    let raw: string | null = null;
    try {
      raw = storage.getItem(LOCAL_SETTINGS_KEYS[key]);
    } catch {
      raw = null;
    }
    if (raw == null) continue;
    const value = LOCAL_PARSERS[key](raw);
    if (value !== null) setField(out, key, value);
  }
  return out;
}

function serializeLocal(value: AppSettings[LocalKey]): string | null {
  if (value === null) return null;
  if (typeof value === 'number' || typeof value === 'string') return String(value);
  return JSON.stringify(value);
}

/** 이 기기에 저장 (null이면 지움). 저장소를 쓸 수 없으면 false */
export function writeLocalSettings(storage: StorageWriter, patch: SettingsPatch): boolean {
  try {
    for (const key of SETTINGS_KEYS) {
      const value = patch[key];
      if (value === undefined || !isLocalKey(key)) continue;
      const serialized = serializeLocal(value as AppSettings[LocalKey]);
      if (serialized === null) storage.removeItem(LOCAL_SETTINGS_KEYS[key]);
      else storage.setItem(LOCAL_SETTINGS_KEYS[key], serialized);
    }
    return true;
  } catch {
    return false;
  }
}

/** 이 기기 값 지우기 (DB에 저장된 뒤 — 나중에 되살아나지 않도록) */
export function removeLocalSettings(storage: StorageWriter, keys: readonly SettingsKey[]): void {
  for (const key of keys) {
    if (!isLocalKey(key)) continue;
    try {
      storage.removeItem(LOCAL_SETTINGS_KEYS[key]);
    } catch {
      // 지우지 못해도 DB 값이 우선이라 화면은 같다
    }
  }
}

// ─── 마지막으로 불러온 설정 (DB를 못 읽을 때 대신 쓴다) ───

/**
 * DB에서 불러와 확정한 설정 전체를 이 기기에 저장하는 키.
 * 예전 값 정리(removeLocalSettings)는 LOCAL_SETTINGS_KEYS만 지우므로 이 값은 남는다.
 */
export const SETTINGS_CACHE_KEY = 'asset-tracker-settings-cache';

/** 캐시에 꼭 있어야 하는 필드 — 돈 계산에 쓰는 값이 하나라도 없으면 캐시를 쓰지 않는다 */
const CACHE_REQUIRED_KEYS: readonly SettingsKey[] = ['monthlyBudget', 'coreWeights', 'cmaRate', 'emergencyFundAmount'];

/** 확정한 설정을 캐시에 저장. 저장소를 쓸 수 없으면 false */
export function writeSettingsCache(storage: Pick<Storage, 'setItem'>, settings: AppSettings): boolean {
  try {
    storage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/** 캐시된 설정 (없거나 손상됐거나 돈 계산 값이 빠졌으면 null — 기본값으로 대신하지 않는다) */
export function readSettingsCache(storage: StorageReader): AppSettings | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(SETTINGS_CACHE_KEY);
  } catch {
    return null;
  }
  if (raw == null) return null;
  const parsed = parseJson(raw);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const source = parsed as Record<string, unknown>;
  const out: SettingsPatch = {};
  for (const key of SETTINGS_KEYS) {
    const value = PARSERS[key](source[key]);
    if (value !== null) setField(out, key, value);
  }
  if (CACHE_REQUIRED_KEYS.some((key) => out[key] === undefined)) return null;
  return { ...DEFAULT_SETTINGS, ...out };
}

// ─── 한 번만 하는 이전 (이 기기 값 → DB) ───

/** DB에 컬럼은 있지만 값이 null이고 이 기기에 값이 있는 필드 — 한 번 DB로 옮길 대상 */
export function pendingMigration(row: SettingsRow | null | undefined, local: SettingsPatch): SettingsPatch {
  const out: SettingsPatch = {};
  if (!row) return out;
  for (const key of SETTINGS_KEYS) {
    const value = local[key];
    if (value === undefined || !hasColumn(row, key) || row[SETTINGS_COLUMNS[key]] !== null) continue;
    setField(out, key, value);
  }
  return out;
}

/** DB 값이 이미 있어 쓰이지 않는 이 기기 값 (정리 대상) */
export function shadowedLocalFields(row: SettingsRow | null | undefined, local: SettingsPatch): SettingsKey[] {
  const fromDb = parseSettingsRow(row);
  return SETTINGS_KEYS.filter((key) => local[key] !== undefined && fromDb[key] !== undefined);
}

// ─── 저장 실패 처리 ───

type DbError = { code?: string | null; message?: string | null } | null | undefined;

/** 컬럼이 없어서 난 오류인지 (docs/sql/2026-11-renewal.sql 미적용) */
export function isMissingColumnError(error: DbError): boolean {
  if (!error) return false;
  if (error.code === 'PGRST204' || error.code === '42703') return true;
  return /could not find the '.+' column|column .+ does not exist/i.test(error.message ?? '');
}

/** 예전부터 있던 컬럼(DB)과 새 컬럼(이 기기로 대신 저장)으로 나누기 */
export function splitByLegacySchema(patch: SettingsPatch): { db: SettingsPatch; local: SettingsPatch } {
  const db: SettingsPatch = {};
  const local: SettingsPatch = {};
  for (const key of SETTINGS_KEYS) {
    const value = patch[key];
    if (value === undefined) continue;
    setField(LEGACY_DB_FIELDS.includes(key) ? db : local, key, value);
  }
  return { db, local };
}

// ─── 설정 화면 ───

function sameValue(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

/** 바뀐 필드만 (설정 화면 저장 시 — 손대지 않은 기본값을 DB에 굳히지 않도록) */
export function diffSettings(current: AppSettings, next: AppSettings): SettingsPatch {
  const out: SettingsPatch = {};
  for (const key of SETTINGS_KEYS) {
    if (!sameValue(current[key], next[key])) setField(out, key, next[key]);
  }
  return out;
}

/** S&P500 비중(%) → 코어 비중 (나머지는 나스닥100) */
export function weightsFromSp500Pct(pct: number): Record<CoreGroup, number> {
  const clamped = Math.min(100, Math.max(0, Math.round(Number.isFinite(pct) ? pct : 0)));
  return { sp500: clamped / 100, nasdaq100: (100 - clamped) / 100 };
}

/** 코어 비중 → S&P500 비중(%) 정수 */
export function sp500PctOf(weights: Record<CoreGroup, number>): number {
  const sum = weights.sp500 + weights.nasdaq100;
  return sum > 0 ? Math.round((weights.sp500 / sum) * 100) : 0;
}
