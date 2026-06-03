import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getRecentObjectiveDateKeys,
  normalizeObjectiveRow,
  type DailyObjectiveLog,
  type RecentObjectiveDay,
} from "@/lib/objectives";

export async function GET(req: NextRequest) {
  const rawDays = Number(req.nextUrl.searchParams.get("days") ?? "15");
  const days = Number.isInteger(rawDays) && rawDays > 0 ? Math.min(rawDays, 60) : 15;
  const dateKeys = getRecentObjectiveDateKeys(days);
  const oldestDate = dateKeys.at(-1) ?? dateKeys[0];
  const newestDate = dateKeys[0];

  const { data, error } = await supabaseAdmin
    .from("daily_objective_logs")
    .select("*")
    .gte("entry_date", oldestDate)
    .lte("entry_date", newestDate)
    .order("entry_date", { ascending: false });

  if (error) {
    console.error("Error leyendo historial de objetivos del dia:", error);
    return NextResponse.json(
      { error: "Error al obtener el historial de objetivos del dia" },
      { status: 500 }
    );
  }

  const rows = ((data ?? []) as DailyObjectiveLog[]).map(
    (row) => normalizeObjectiveRow(row)!
  );
  const byDate = new Map(rows.map((row) => [row.entry_date, row]));

  const recentDays: RecentObjectiveDay[] = dateKeys.map((date) => {
    const row = byDate.get(date);
    return {
      date,
      completedItems: row?.completed_items ?? [],
    };
  });

  return NextResponse.json(recentDays);
}
