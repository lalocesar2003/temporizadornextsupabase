import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isFutureDecisionDateKey,
  isValidDecisionDateKey,
  normalizeDecisionRow,
  type DailyDecisionLog,
  type DecisionStatus,
} from "@/lib/decisions";

function normalizePayload(body: {
  entryDate?: string;
  status?: string;
  reason?: string;
  note?: string;
}) {
  const entryDate =
    typeof body.entryDate === "string" ? body.entryDate.trim() : "";
  const status = body.status;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!isValidDecisionDateKey(entryDate)) {
    return { error: "entryDate debe tener formato YYYY-MM-DD" };
  }

  if (isFutureDecisionDateKey(entryDate)) {
    return { error: "No se pueden guardar fechas futuras" };
  }

  if (
    status !== "pending" &&
    status !== "completed" &&
    status !== "failed"
  ) {
    return { error: "status debe ser pending, completed o failed" };
  }

  if (status === "failed" && !reason) {
    return { error: "reason es obligatorio cuando el estado es failed" };
  }

  return {
    entryDate,
    status: status as DecisionStatus,
    reason: status === "failed" ? reason : null,
    note: note || null,
  };
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date")?.trim() ?? "";

  if (!isValidDecisionDateKey(date)) {
    return NextResponse.json(
      { error: "date debe tener formato YYYY-MM-DD" },
      { status: 400 }
    );
  }

  if (isFutureDecisionDateKey(date)) {
    return NextResponse.json(
      { error: "No se pueden consultar fechas futuras" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("daily_decision_logs")
    .select("*")
    .eq("entry_date", date)
    .maybeSingle();

  if (error) {
    console.error("Error leyendo decision:", error);
    return NextResponse.json(
      { error: "Error al obtener el registro de decisiones" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    normalizeDecisionRow((data as DailyDecisionLog | null) ?? null)
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      entryDate?: string;
      status?: string;
      reason?: string;
      note?: string;
    };

    const normalized = normalizePayload(body);
    if ("error" in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("daily_decision_logs")
      .upsert(
        {
          entry_date: normalized.entryDate,
          status: normalized.status,
          reason: normalized.reason,
          note: normalized.note,
        },
        { onConflict: "entry_date" }
      )
      .select("*")
      .single();

    if (error) {
      console.error("Error guardando decision:", error);
      return NextResponse.json(
        { error: "Error al guardar el registro de decisiones" },
        { status: 500 }
      );
    }

    return NextResponse.json(normalizeDecisionRow(data as DailyDecisionLog), {
      status: 201,
    });
  } catch (error) {
    console.error("Error en POST /api/decisions:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
