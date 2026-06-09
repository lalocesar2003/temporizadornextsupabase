import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isFutureWhatsappStatusDateKey,
  isValidWhatsappStatusDateKey,
  normalizeWhatsappStatusRow,
  type DailyWhatsappStatusLog,
} from "@/lib/whatsappStatus";

function normalizePayload(body: {
  entryDate?: string;
  completedItems?: unknown;
}) {
  const entryDate =
    typeof body.entryDate === "string" ? body.entryDate.trim() : "";

  if (!isValidWhatsappStatusDateKey(entryDate)) {
    return { error: "entryDate debe tener formato YYYY-MM-DD" };
  }

  if (isFutureWhatsappStatusDateKey(entryDate)) {
    return { error: "No se pueden guardar fechas futuras" };
  }

  if (!Array.isArray(body.completedItems)) {
    return { error: "completedItems debe ser un arreglo" };
  }

  const completedItems = body.completedItems
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);

  return {
    entryDate,
    completedItems,
  };
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date")?.trim() ?? "";

  if (!isValidWhatsappStatusDateKey(date)) {
    return NextResponse.json(
      { error: "date debe tener formato YYYY-MM-DD" },
      { status: 400 }
    );
  }

  if (isFutureWhatsappStatusDateKey(date)) {
    return NextResponse.json(
      { error: "No se pueden consultar fechas futuras" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("daily_video_progress_logs")
    .select("*")
    .eq("entry_date", date)
    .maybeSingle();

  if (error) {
    console.error("Error leyendo avance video:", error);
    return NextResponse.json(
      { error: "Error al obtener el registro de avance video" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    normalizeWhatsappStatusRow((data as DailyWhatsappStatusLog | null) ?? null)
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      entryDate?: string;
      completedItems?: unknown;
    };

    const normalized = normalizePayload(body);
    if ("error" in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("daily_video_progress_logs")
      .upsert(
        {
          entry_date: normalized.entryDate,
          completed_items: normalized.completedItems,
        },
        { onConflict: "entry_date" }
      )
      .select("*")
      .single();

    if (error) {
      console.error("Error guardando avance video:", error);
      return NextResponse.json(
        { error: "Error al guardar el registro de avance video" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      normalizeWhatsappStatusRow(data as DailyWhatsappStatusLog),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en POST /api/whatsapp-status:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
