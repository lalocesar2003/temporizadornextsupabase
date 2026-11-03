import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  HABITS_TIME_ZONE,
  getRecentDateKeys,
  normalizeHabitRow,
  type DailyFocusLog,
  type RecentHabitDay,
} from "@/lib/habits";

export async function GET(req: NextRequest) {
  const rawDays = Number(req.nextUrl.searchParams.get("days") ?? "7");
  const days = Number.isInteger(rawDays) && rawDays > 0 ? Math.min(rawDays, 30) : 7;
  const dateKeys = getRecentDateKeys(days, HABITS_TIME_ZONE);
  const oldestDate = dateKeys.at(-1) ?? dateKeys[0];
  const newestDate = dateKeys[0];

  const { data, error } = await supabaseAdmin
    .from("daily_focus_logs")
    .select("*")
    .gte("entry_date", oldestDate)
    .lte("entry_date", newestDate)
    .order("entry_date", { ascending: false });

  if (error) {
    console.error("Error leyendo recent habits:", error);
    return NextResponse.json(
      { error: "Error al obtener el historial reciente de habitos" },
      { status: 500 }
    );
  }

  const rows = ((data ?? []) as DailyFocusLog[]).map((row) => normalizeHabitRow(row)!);
  const byDate = new Map(rows.map((row) => [row.entry_date, row]));

  const recentDays: RecentHabitDay[] = dateKeys.map((date) => {
    const row = byDate.get(date);

    if (!row) {
      return {
        date,
        status: "empty",
        focusedMinutes: 0,
        reason: null,
        note: null,
      };
    }

    if (row.focused_minutes > 0) {
      return {
        date,
        status: "focused",
        focusedMinutes: row.focused_minutes,
        reason: null,
        note: row.note,
      };
    }

    return {
      date,
      status: "missed",
      focusedMinutes: 0,
      reason: row.reason,
      note: null,
    };
  });

  return NextResponse.json(recentDays);
}
