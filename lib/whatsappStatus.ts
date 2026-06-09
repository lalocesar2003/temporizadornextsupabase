import {
  HABITS_TIME_ZONE,
  getRecentDateKeys,
  getTimeZoneDateKey,
  isFutureDateKey,
  isValidDateKey,
} from "@/lib/habits";

export const WHATSAPP_STATUS_TIME_ZONE = HABITS_TIME_ZONE;

export type DailyWhatsappStatusLog = {
  id: number;
  entry_date: string;
  completed_items: string[];
  created_at: string;
  updated_at: string;
};

export type RecentWhatsappStatusDay = {
  date: string;
  completedItems: string[];
};

export function getWhatsappStatusTodayKey() {
  return getTimeZoneDateKey(new Date(), WHATSAPP_STATUS_TIME_ZONE);
}

export function getRecentWhatsappStatusDateKeys(count: number) {
  return getRecentDateKeys(count, WHATSAPP_STATUS_TIME_ZONE);
}

export function isValidWhatsappStatusDateKey(value: string) {
  return isValidDateKey(value);
}

export function isFutureWhatsappStatusDateKey(value: string) {
  return isFutureDateKey(value, WHATSAPP_STATUS_TIME_ZONE);
}

export function normalizeWhatsappStatusRow(
  row: DailyWhatsappStatusLog | null
): DailyWhatsappStatusLog | null {
  if (!row) return null;

  return {
    ...row,
    completed_items: Array.isArray(row.completed_items)
      ? row.completed_items
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0)
      : [],
  };
}
