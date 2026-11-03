import {
  HABITS_TIME_ZONE,
  getRecentDateKeys,
  getTimeZoneDateKey,
  isFutureDateKey,
  isValidDateKey,
} from "@/lib/habits";

export const PLANNING_TIME_ZONE = HABITS_TIME_ZONE;

export type PlanningStatus = "pending" | "completed" | "failed";

export type DailyPlanningLog = {
  id: number;
  entry_date: string;
  status: PlanningStatus;
  created_at: string;
  updated_at: string;
};

export type RecentPlanningDay = {
  date: string;
  status: PlanningStatus;
};

export function getPlanningTodayKey() {
  return getTimeZoneDateKey(new Date(), PLANNING_TIME_ZONE);
}

export function getRecentPlanningDateKeys(count: number) {
  return getRecentDateKeys(count, PLANNING_TIME_ZONE);
}

export function isValidPlanningDateKey(value: string) {
  return isValidDateKey(value);
}

export function isFuturePlanningDateKey(value: string) {
  return isFutureDateKey(value, PLANNING_TIME_ZONE);
}

export function normalizePlanningRow(
  row: DailyPlanningLog | null
): DailyPlanningLog | null {
  if (!row) return null;

  return {
    ...row,
    status:
      row.status === "completed" || row.status === "failed"
        ? row.status
        : "pending",
  };
}
