'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  DEFAULT_SETTINGS, isMissingColumnError, pendingMigration, readLocalSettings, readSettingsCache,
  removeLocalSettings, rowToSettings, settingsToRow, shadowedLocalFields, splitByLegacySchema,
  writeLocalSettings, writeSettingsCache,
  type AppSettings, type SettingsKey, type SettingsPatch, type SettingsRow,
} from '@/lib/settings';
import { toast } from './useToast';

const DEVICE_ONLY_NOTICE =
  '설정이 이 기기에만 저장됩니다 — Supabase에 docs/sql/2026-11-renewal.sql을 적용하면 폰·PC가 같아집니다.';
const SAVE_ERROR =
  '설정을 저장하지 못했습니다. 로그인 상태와 인터넷 연결을 확인해 주세요. (새로고침하면 이전 값으로 돌아갑니다)';
const LOAD_ERROR_CACHED = '설정을 불러오지 못해 이 기기에 저장해 둔 마지막 설정으로 표시합니다.';
const LOAD_ERROR_UNAVAILABLE =
  '설정을 불러오지 못했습니다 — 새로고침해 주세요. 비상금 등을 알 수 없어 이번 달 기록은 막아 둡니다.';

/** 기기 저장 안내는 브라우저 세션당 한 번 */
const NOTICE_SESSION_KEY = 'asset-tracker-settings-device-only-notice';
let deviceOnlyNoticed = false;

function noticeDeviceOnlyOnce(): void {
  if (deviceOnlyNoticed) return;
  deviceOnlyNoticed = true;
  try {
    if (sessionStorage.getItem(NOTICE_SESSION_KEY)) return;
    sessionStorage.setItem(NOTICE_SESSION_KEY, '1');
  } catch {
    // 세션 저장소를 못 쓰면 이번 화면에서 한 번만 알린다
  }
  toast.warning(DEVICE_ONLY_NOTICE, 7000);
}

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function upsertSettings(patch: SettingsPatch) {
  return supabase
    .from('app_settings')
    .upsert({ id: 1, ...settingsToRow(patch), updated_at: new Date().toISOString() }, { onConflict: 'id' });
}

async function fetchSettingsRow(): Promise<{ row: SettingsRow | null; failed: boolean }> {
  try {
    const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
    if (error) return { row: null, failed: true };
    return { row: (data as SettingsRow | null) ?? null, failed: false };
  } catch {
    return { row: null, failed: true };
  }
}

/** 이 기기 값을 DB로 한 번 옮기고, DB 값에 가려진 이 기기 값은 지운다 */
async function migrateLocalValues(storage: Storage, row: SettingsRow, local: SettingsPatch): Promise<void> {
  removeLocalSettings(storage, shadowedLocalFields(row, local));
  const migration = pendingMigration(row, local);
  const keys = Object.keys(migration) as SettingsKey[];
  if (keys.length === 0) return;
  try {
    const { error } = await upsertSettings(migration);
    // 실패하면 다음에 다시 시도한다 (화면에는 이미 같은 값이 보인다)
    if (!error) removeLocalSettings(storage, keys);
  } catch {
    // 위와 같음
  }
}

/**
 * 앱 설정 (app_settings, id = 1 한 행 — 폰·PC 공통).
 * - 값: DB → 이 기기에 남은 예전 값 → 기본값. 확정한 값은 이 기기에 캐시해 둔다
 * - DB를 못 읽으면 캐시를 쓰고, 캐시도 없으면 unavailable (기본값 비상금 0원으로 매수 계산을 하지 않도록)
 * - 새 컬럼이 비어 있고 이 기기에 예전 값이 있으면 한 번 DB로 옮긴다
 * - updateSettings: 화면 먼저 바꾸고 DB에 저장. 새 컬럼이 없으면(SQL 미적용) 이 기기에 대신 저장
 * 다크모드·수익률 숨기기는 기기별 설정이라 여기 없다.
 */
export function useSettings(): {
  settings: AppSettings;
  ready: boolean;
  /** DB와 캐시 모두에서 설정을 얻지 못함 — 화면은 기본값이라 장부 기록을 막는다 */
  unavailable: boolean;
  updateSettings: (patch: SettingsPatch) => Promise<void>;
} {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  /** 지금 화면 값 (저장 성공 후 캐시를 고칠 때 사용) */
  const latest = useRef<AppSettings>(DEFAULT_SETTINGS);
  /** 이번에 DB에서 설정을 읽었는지 — 기본값을 캐시에 굳히지 않도록 그 뒤에만 캐시를 고친다 */
  const loadedFromDb = useRef(false);

  const apply = useCallback((next: AppSettings) => {
    latest.current = next;
    setSettings(next);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      const storage = getLocalStorage();
      const local = storage ? readLocalSettings(storage) : {};
      const { row, failed } = await fetchSettingsRow();
      if (!active) return;
      if (failed) {
        const cached = storage ? readSettingsCache(storage) : null;
        if (cached) {
          apply(cached);
          toast.warning(LOAD_ERROR_CACHED, 5000);
        } else {
          apply(rowToSettings(null, local));
          setUnavailable(true);
          toast.warning(LOAD_ERROR_UNAVAILABLE, 8000);
        }
        setReady(true);
        return;
      }
      const resolved = rowToSettings(row, local);
      apply(resolved);
      loadedFromDb.current = true;
      if (storage) writeSettingsCache(storage, resolved);
      setReady(true);
      if (storage && row) await migrateLocalValues(storage, row, local);
    };
    void load();
    return () => {
      active = false;
    };
  }, [apply]);

  const updateSettings = useCallback(async (patch: SettingsPatch): Promise<void> => {
    const keys = Object.keys(patch) as SettingsKey[];
    if (keys.length === 0) return;
    apply({ ...latest.current, ...patch });
    const storage = getLocalStorage();
    try {
      const { error } = await upsertSettings(patch);
      if (!error) {
        if (storage) {
          removeLocalSettings(storage, keys);
          if (loadedFromDb.current) writeSettingsCache(storage, latest.current);
        }
        return;
      }
      if (!isMissingColumnError(error)) {
        toast.error(SAVE_ERROR);
        return;
      }
      // 새 컬럼이 없다 — 새 필드는 이 기기에, 예전 컬럼(비상금)은 DB에
      const { db, local } = splitByLegacySchema(patch);
      if (Object.keys(local).length > 0) {
        if (!storage || !writeLocalSettings(storage, local)) {
          toast.error(SAVE_ERROR);
          return;
        }
        noticeDeviceOnlyOnce();
      }
      if (Object.keys(db).length > 0) {
        const { error: legacyError } = await upsertSettings(db);
        if (legacyError) toast.error(SAVE_ERROR);
      }
    } catch {
      toast.error(SAVE_ERROR);
    }
  }, [apply]);

  return { settings, ready, unavailable, updateSettings };
}
