import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getRecentPlanningDateKeys,
  normalizePlanningRow,
  type DailyPlanningLog,
  type RecentPlanningDay,
} from "@/lib/planning";

export async function GET(req: NextRequest) {
  const rawDays = Number(req.nextUrl.searchParams.get("days") ?? "15");
  const days = Number.isInteger(rawDays) && rawDays > 0 ? Math.min(rawDays, 60) : 15;
  const dateKeys = getRecentPlanningDateKeys(days);
  const oldestDate = dateKeys.at(-1) ?? dateKeys[0];
  const newestDate = dateKeys[0];

  const { data, error } = await supabaseAdmin
    .from("daily_planning_logs")
    .select("*")
    .gte("entry_date", oldestDate)
    .lte("entry_date", newestDate)
    .order("entry_date", { ascending: false });

  if (error) {
    console.error("Error leyendo historial de planning:", error);
    return NextResponse.json(
      { error: "Error al obtener el historial de planificacion" },
      { status: 500 }
    );
  }

  const rows = ((data ?? []) as DailyPlanningLog[]).map(
    (row) => normalizePlanningRow(row)!
  );
  const byDate = new Map(rows.map((row) => [row.entry_date, row]));

  const recentDays: RecentPlanningDay[] = dateKeys.map((date) => {
    const row = byDate.get(date);
    return {
      date,
      status: row?.status ?? "pending",
    };
  });

  return NextResponse.json(recentDays);
}
