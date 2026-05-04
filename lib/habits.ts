export const HABITS_TIME_ZONE = "America/Lima";

export type DailyFocusLog = {
  id: number;
  entry_date: string;
  focused_minutes: number;
  did_not_focus: boolean;
  reason: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type HabitStatus = "focused" | "missed" | "empty";

export type RecentHabitDay = {
  date: string;
  status: HabitStatus;
  focusedMinutes: number;
  reason: string | null;
  note: string | null;
};

const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function ymdPartsFromFormatter(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  ) as Record<"year" | "month" | "day", string>;
}

export function getTimeZoneDateKey(
  date: Date = new Date(),
  timeZone: string = HABITS_TIME_ZONE
) {
  const parts = ymdPartsFromFormatter(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isValidDateKey(value: string) {
  if (!YMD_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
}

export function isFutureDateKey(
  value: string,
  timeZone: string = HABITS_TIME_ZONE
) {
  return value > getTimeZoneDateKey(new Date(), timeZone);
}

export function addDaysToDateKey(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return getTimeZoneDateKey(utcDate, "UTC");
}

export function getRecentDateKeys(
  count: number,
  timeZone: string = HABITS_TIME_ZONE
) {
  const today = getTimeZoneDateKey(new Date(), timeZone);
  return Array.from({ length: count }, (_, index) =>
    addDaysToDateKey(today, -index)
  );
}

export function normalizeHabitRow(row: DailyFocusLog | null): DailyFocusLog | null {
  if (!row) return null;

  return {
    ...row,
    focused_minutes: Number(row.focused_minutes),
    did_not_focus: Boolean(row.did_not_focus),
    reason: row.reason,
    note: row.note,
  };
}
