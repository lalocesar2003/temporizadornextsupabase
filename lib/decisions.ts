import {
  HABITS_TIME_ZONE,
  getRecentDateKeys,
  getTimeZoneDateKey,
  isFutureDateKey,
  isValidDateKey,
} from "@/lib/habits";

export const DECISIONS_TIME_ZONE = HABITS_TIME_ZONE;

export type DecisionStatus = "pending" | "completed" | "failed";

export type DailyDecisionLog = {
  id: number;
  entry_date: string;
  status: DecisionStatus;
  reason: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type RecentDecisionDay = {
  date: string;
  status: DecisionStatus;
  reason: string | null;
  note: string | null;
};

export function getDecisionTodayKey() {
  return getTimeZoneDateKey(new Date(), DECISIONS_TIME_ZONE);
}

export function getRecentDecisionDateKeys(count: number) {
  return getRecentDateKeys(count, DECISIONS_TIME_ZONE);
}

export function isValidDecisionDateKey(value: string) {
  return isValidDateKey(value);
}

export function isFutureDecisionDateKey(value: string) {
  return isFutureDateKey(value, DECISIONS_TIME_ZONE);
}

export function normalizeDecisionRow(
  row: DailyDecisionLog | null
): DailyDecisionLog | null {
  if (!row) return null;

  return {
    ...row,
    status:
      row.status === "completed" || row.status === "failed"
        ? row.status
        : "pending",
    reason: row.reason,
    note: row.note,
  };
}
