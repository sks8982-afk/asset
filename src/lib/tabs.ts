/** 화면 탭 — 주소의 #month, #check, #plan, #records와 같다 */
export const TAB_IDS = ['month', 'check', 'plan', 'records'] as const;

export type TabId = (typeof TAB_IDS)[number];

export const DEFAULT_TAB: TabId = 'month';

export function isTabId(value: string): value is TabId {
  return (TAB_IDS as readonly string[]).includes(value);
}

/** location.hash → 탭 (모르는 값이면 이번 달) */
export function parseTabHash(hash: string): TabId {
  const id = hash.replace(/^#/, '');
  return isTabId(id) ? id : DEFAULT_TAB;
}

/** 방향키·Home·End로 옮겨 갈 탭 (해당 키가 아니면 null) */
export function tabForKey(current: TabId, key: string): TabId | null {
  const index = TAB_IDS.indexOf(current);
  const last = TAB_IDS.length - 1;
  switch (key) {
    case 'ArrowRight':
      return TAB_IDS[index === last ? 0 : index + 1];
    case 'ArrowLeft':
      return TAB_IDS[index === 0 ? last : index - 1];
    case 'Home':
      return TAB_IDS[0];
    case 'End':
      return TAB_IDS[last];
    default:
      return null;
  }
}
