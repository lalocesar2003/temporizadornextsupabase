import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getRecentDecisionDateKeys,
  normalizeDecisionRow,
  type DailyDecisionLog,
  type RecentDecisionDay,
} from "@/lib/decisions";

export async function GET(req: NextRequest) {
  const rawDays = Number(req.nextUrl.searchParams.get("days") ?? "15");
  const days = Number.isInteger(rawDays) && rawDays > 0 ? Math.min(rawDays, 60) : 15;
  const dateKeys = getRecentDecisionDateKeys(days);
  const oldestDate = dateKeys.at(-1) ?? dateKeys[0];
  const newestDate = dateKeys[0];

  const { data, error } = await supabaseAdmin
    .from("daily_decision_logs")
    .select("*")
    .gte("entry_date", oldestDate)
    .lte("entry_date", newestDate)
    .order("entry_date", { ascending: false });

  if (error) {
    console.error("Error leyendo historial de decisiones:", error);
    return NextResponse.json(
      { error: "Error al obtener el historial de decisiones" },
      { status: 500 }
    );
  }

  const rows = ((data ?? []) as DailyDecisionLog[]).map(
    (row) => normalizeDecisionRow(row)!
  );
  const byDate = new Map(rows.map((row) => [row.entry_date, row]));

  const recentDays: RecentDecisionDay[] = dateKeys.map((date) => {
    const row = byDate.get(date);
    if (!row) {
      return {
        date,
        status: "pending",
        reason: null,
        note: null,
      };
    }

    return {
      date,
      status: row.status,
      reason: row.reason,
      note: row.note,
    };
  });

  return NextResponse.json(recentDays);
}
