import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  HABITS_TIME_ZONE,
  isFutureDateKey,
  isValidDateKey,
  normalizeHabitRow,
  type DailyFocusLog,
} from "@/lib/habits";

function validatePayload(body: {
  entryDate?: string;
  focusedMinutes?: number;
  didNotFocus?: boolean;
  reason?: string;
  note?: string;
}) {
  const entryDate = typeof body.entryDate === "string" ? body.entryDate.trim() : "";
  const didNotFocus = body.didNotFocus === true;
  const focusedMinutes = body.focusedMinutes;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!isValidDateKey(entryDate)) {
    return { error: "entryDate debe tener formato YYYY-MM-DD" };
  }

  if (isFutureDateKey(entryDate, HABITS_TIME_ZONE)) {
    return { error: "No se pueden registrar fechas futuras" };
  }

  if (
    typeof focusedMinutes !== "number" ||
    !Number.isInteger(focusedMinutes) ||
    focusedMinutes < 0
  ) {
    return { error: "focusedMinutes debe ser un entero mayor o igual a 0" };
  }

  if ((didNotFocus || focusedMinutes === 0) && !reason) {
    return { error: "reason es obligatorio cuando no hubo concentracion" };
  }

  return {
    entryDate,
    focusedMinutes,
    didNotFocus: focusedMinutes > 0 ? false : didNotFocus,
    reason: focusedMinutes > 0 ? null : reason,
    note: focusedMinutes > 0 ? note || null : null,
  };
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date")?.trim() ?? "";

  if (!isValidDateKey(date)) {
    return NextResponse.json(
      { error: "date debe tener formato YYYY-MM-DD" },
      { status: 400 }
    );
  }

  if (isFutureDateKey(date, HABITS_TIME_ZONE)) {
    return NextResponse.json(
      { error: "No se pueden consultar fechas futuras" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("daily_focus_logs")
    .select("*")
    .eq("entry_date", date)
    .maybeSingle();

  if (error) {
    console.error("Error leyendo habit:", error);
    return NextResponse.json(
      { error: "Error al obtener el registro del habito" },
      { status: 500 }
    );
  }

  return NextResponse.json(normalizeHabitRow((data as DailyFocusLog | null) ?? null));
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      entryDate?: string;
      focusedMinutes?: number;
      didNotFocus?: boolean;
      reason?: string;
      note?: string;
    };

    const validated = validatePayload(body);
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("daily_focus_logs")
      .upsert(
        {
          entry_date: validated.entryDate,
          focused_minutes: validated.focusedMinutes,
          did_not_focus: validated.didNotFocus,
          reason: validated.reason,
          note: validated.note,
        },
        { onConflict: "entry_date" }
      )
      .select("*")
      .single();

    if (error) {
      console.error("Error guardando habit:", error);
      return NextResponse.json(
        { error: "Error al guardar el registro del habito" },
        { status: 500 }
      );
    }

    return NextResponse.json(normalizeHabitRow(data as DailyFocusLog), {
      status: 201,
    });
  } catch (error) {
    console.error("Error en POST /api/habits:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
