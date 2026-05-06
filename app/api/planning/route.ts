import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isFuturePlanningDateKey,
  isValidPlanningDateKey,
  normalizePlanningRow,
  type DailyPlanningLog,
  type PlanningStatus,
} from "@/lib/planning";

function normalizePayload(body: {
  entryDate?: string;
  status?: string;
}) {
  const entryDate =
    typeof body.entryDate === "string" ? body.entryDate.trim() : "";
  const status = body.status;

  if (!isValidPlanningDateKey(entryDate)) {
    return { error: "entryDate debe tener formato YYYY-MM-DD" };
  }

  if (isFuturePlanningDateKey(entryDate)) {
    return { error: "No se pueden guardar fechas futuras" };
  }

  if (
    status !== "pending" &&
    status !== "completed" &&
    status !== "failed"
  ) {
    return { error: "status debe ser pending, completed o failed" };
  }

  return {
    entryDate,
    status: status as PlanningStatus,
  };
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date")?.trim() ?? "";

  if (!isValidPlanningDateKey(date)) {
    return NextResponse.json(
      { error: "date debe tener formato YYYY-MM-DD" },
      { status: 400 }
    );
  }

  if (isFuturePlanningDateKey(date)) {
    return NextResponse.json(
      { error: "No se pueden consultar fechas futuras" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("daily_planning_logs")
    .select("*")
    .eq("entry_date", date)
    .maybeSingle();

  if (error) {
    console.error("Error leyendo planning:", error);
    return NextResponse.json(
      { error: "Error al obtener el registro de planificacion" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    normalizePlanningRow((data as DailyPlanningLog | null) ?? null)
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      entryDate?: string;
      status?: string;
    };

    const normalized = normalizePayload(body);
    if ("error" in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("daily_planning_logs")
      .upsert(
        {
          entry_date: normalized.entryDate,
          status: normalized.status,
        },
        { onConflict: "entry_date" }
      )
      .select("*")
      .single();

    if (error) {
      console.error("Error guardando planning:", error);
      return NextResponse.json(
        { error: "Error al guardar el registro de planificacion" },
        { status: 500 }
      );
    }

    return NextResponse.json(normalizePlanningRow(data as DailyPlanningLog), {
      status: 201,
    });
  } catch (error) {
    console.error("Error en POST /api/planning:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
