import { getItem, setItem } from '@/lib/storage';

const TRACE_STORAGE_KEY = 'xuhui_island_traces_v1';
const PAW_PRINT_THRESHOLD = 10;
const TREE_STREAK_THRESHOLD = 7;

export interface TraceRecommendation {
  text: string;
  authorName: string;
  updatedAt: number;
}

export interface MemorialStone {
  text: string;
  updatedAt: number;
}

export interface TraceState {
  shopVisits: Record<string, number>;
  recommendations: Record<string, TraceRecommendation>;
  memorialStone: MemorialStone | null;
  lastVisitDate: string | null;
  visitStreak: number;
  treeUnlockedAt: number | null;
}

const DEFAULT_TRACE_STATE: TraceState = {
  shopVisits: {},
  recommendations: {},
  memorialStone: null,
  lastVisitDate: null,
  visitStreak: 0,
  treeUnlockedAt: null,
};

function getDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayKey(date = new Date()) {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return getDayKey(yesterday);
}

export function getTraceState() {
  return getItem<TraceState>(TRACE_STORAGE_KEY, DEFAULT_TRACE_STATE);
}

export function saveTraceState(state: TraceState) {
  setItem(TRACE_STORAGE_KEY, state);
  return state;
}

export function recordIslandVisit(now = new Date()) {
  const state = getTraceState();
  const today = getDayKey(now);

  if (state.lastVisitDate === today) {
    return state;
  }

  const streak =
    state.lastVisitDate === getYesterdayKey(now)
      ? state.visitStreak + 1
      : 1;

  return saveTraceState({
    ...state,
    lastVisitDate: today,
    visitStreak: streak,
    treeUnlockedAt:
      streak >= TREE_STREAK_THRESHOLD
        ? state.treeUnlockedAt ?? Date.now()
        : state.treeUnlockedAt,
  });
}

export function recordShopVisit(shopId: string) {
  const state = getTraceState();
  return saveTraceState({
    ...state,
    shopVisits: {
      ...state.shopVisits,
      [shopId]: (state.shopVisits[shopId] ?? 0) + 1,
    },
  });
}

export function saveShopRecommendation(
  shopId: string,
  text: string,
  authorName = '你'
) {
  const state = getTraceState();
  const trimmedText = text.trim();

  if (!trimmedText) {
    const nextRecommendations = { ...state.recommendations };
    delete nextRecommendations[shopId];
    return saveTraceState({
      ...state,
      recommendations: nextRecommendations,
    });
  }

  return saveTraceState({
    ...state,
    recommendations: {
      ...state.recommendations,
      [shopId]: {
        text: trimmedText,
        authorName,
        updatedAt: Date.now(),
      },
    },
  });
}

export function saveMemorialStone(text: string) {
  const state = getTraceState();
  const trimmedText = text.trim();

  return saveTraceState({
    ...state,
    memorialStone: trimmedText
      ? {
          text: trimmedText,
          updatedAt: Date.now(),
        }
      : null,
  });
}

export function hasPawPrint(state: TraceState, shopId: string) {
  return (state.shopVisits[shopId] ?? 0) >= PAW_PRINT_THRESHOLD;
}

export function getUnlockedPawPrintShopIds(state: TraceState) {
  return Object.keys(state.shopVisits).filter((shopId) => hasPawPrint(state, shopId));
}

export function isTreeUnlocked(state: TraceState) {
  return state.visitStreak >= TREE_STREAK_THRESHOLD || Boolean(state.treeUnlockedAt);
}

export { DEFAULT_TRACE_STATE, PAW_PRINT_THRESHOLD, TREE_STREAK_THRESHOLD };
