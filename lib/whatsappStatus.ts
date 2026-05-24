import {
  HABITS_TIME_ZONE,
  getRecentDateKeys,
  getTimeZoneDateKey,
  isFutureDateKey,
  isValidDateKey,
} from "@/lib/habits";

export const WHATSAPP_STATUS_TIME_ZONE = HABITS_TIME_ZONE;

export type WhatsappStatus = "pending" | "completed" | "failed";

export type DailyWhatsappStatusLog = {
  id: number;
  entry_date: string;
  status: WhatsappStatus;
  created_at: string;
  updated_at: string;
};

export type RecentWhatsappStatusDay = {
  date: string;
  status: WhatsappStatus;
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
    status:
      row.status === "completed" || row.status === "failed"
        ? row.status
        : "pending",
  };
}
