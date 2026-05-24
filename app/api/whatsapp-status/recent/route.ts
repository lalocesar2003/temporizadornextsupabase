import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getRecentWhatsappStatusDateKeys,
  normalizeWhatsappStatusRow,
  type DailyWhatsappStatusLog,
  type RecentWhatsappStatusDay,
} from "@/lib/whatsappStatus";

export async function GET(req: NextRequest) {
  const rawDays = Number(req.nextUrl.searchParams.get("days") ?? "15");
  const days = Number.isInteger(rawDays) && rawDays > 0 ? Math.min(rawDays, 60) : 15;
  const dateKeys = getRecentWhatsappStatusDateKeys(days);
  const oldestDate = dateKeys.at(-1) ?? dateKeys[0];
  const newestDate = dateKeys[0];

  const { data, error } = await supabaseAdmin
    .from("daily_whatsapp_status_logs")
    .select("*")
    .gte("entry_date", oldestDate)
    .lte("entry_date", newestDate)
    .order("entry_date", { ascending: false });

  if (error) {
    console.error("Error leyendo historial de whatsapp status:", error);
    return NextResponse.json(
      { error: "Error al obtener el historial de estado de WhatsApp" },
      { status: 500 }
    );
  }

  const rows = ((data ?? []) as DailyWhatsappStatusLog[]).map(
    (row) => normalizeWhatsappStatusRow(row)!
  );
  const byDate = new Map(rows.map((row) => [row.entry_date, row]));

  const recentDays: RecentWhatsappStatusDay[] = dateKeys.map((date) => {
    const row = byDate.get(date);
    return {
      date,
      status: row?.status ?? "pending",
    };
  });

  return NextResponse.json(recentDays);
}
