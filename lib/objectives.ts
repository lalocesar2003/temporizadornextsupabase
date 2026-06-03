import {
  HABITS_TIME_ZONE,
  getRecentDateKeys,
  getTimeZoneDateKey,
  isFutureDateKey,
  isValidDateKey,
} from "@/lib/habits";

export const OBJECTIVES_TIME_ZONE = HABITS_TIME_ZONE;

export type DailyObjectiveLog = {
  id: number;
  entry_date: string;
  completed_items: string[];
  created_at: string;
  updated_at: string;
};

export type RecentObjectiveDay = {
  date: string;
  completedItems: string[];
};

export function getObjectivesTodayKey() {
  return getTimeZoneDateKey(new Date(), OBJECTIVES_TIME_ZONE);
}

export function getRecentObjectiveDateKeys(count: number) {
  return getRecentDateKeys(count, OBJECTIVES_TIME_ZONE);
}

export function isValidObjectiveDateKey(value: string) {
  return isValidDateKey(value);
}

export function isFutureObjectiveDateKey(value: string) {
  return isFutureDateKey(value, OBJECTIVES_TIME_ZONE);
}

export function normalizeObjectiveRow(
  row: DailyObjectiveLog | null
): DailyObjectiveLog | null {
  if (!row) return null;

  return {
    ...row,
    completed_items: Array.isArray(row.completed_items)
      ? row.completed_items.map((item) => String(item))
      : [],
  };
}
