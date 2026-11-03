import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PomodoroSession = {
  id: number;
  phase: "focus" | "break";
  cycle_number: number;
  completed_at: string | null;
};

const DEFAULT_TIMEZONE = "America/Lima";

function getTodayKey(timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getDateKey(iso: string, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date(iso))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export async function GET(req: NextRequest) {
  const rawTz = req.nextUrl.searchParams.get("tz");
  const timeZone = rawTz?.trim() || DEFAULT_TIMEZONE;
  const todayKey = getTodayKey(timeZone);

  const { data, error } = await supabaseAdmin
    .from("pomodoro_sessions")
    .select("id, phase, cycle_number, completed_at")
    .eq("phase", "focus")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Error leyendo resumen diario pomodoro:", error);
    return NextResponse.json(
      { error: "Error al obtener el resumen diario de pomodoro" },
      { status: 500 }
    );
  }

  const sessions = (data ?? []) as PomodoroSession[];
  const completedToday = sessions.filter(
    (session) =>
      session.completed_at && getDateKey(session.completed_at, timeZone) === todayKey
  );

  return NextResponse.json({
    today: todayKey,
    timeZone,
    completedFocusSessions: completedToday.length,
  });
}
