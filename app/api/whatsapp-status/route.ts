import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isFutureWhatsappStatusDateKey,
  isValidWhatsappStatusDateKey,
  normalizeWhatsappStatusRow,
  type DailyWhatsappStatusLog,
  type WhatsappStatus,
} from "@/lib/whatsappStatus";

function normalizePayload(body: {
  entryDate?: string;
  status?: string;
}) {
  const entryDate =
    typeof body.entryDate === "string" ? body.entryDate.trim() : "";
  const status = body.status;

  if (!isValidWhatsappStatusDateKey(entryDate)) {
    return { error: "entryDate debe tener formato YYYY-MM-DD" };
  }

  if (isFutureWhatsappStatusDateKey(entryDate)) {
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
    status: status as WhatsappStatus,
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
    .from("daily_whatsapp_status_logs")
    .select("*")
    .eq("entry_date", date)
    .maybeSingle();

  if (error) {
    console.error("Error leyendo whatsapp status:", error);
    return NextResponse.json(
      { error: "Error al obtener el registro de estado de WhatsApp" },
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
      status?: string;
    };

    const normalized = normalizePayload(body);
    if ("error" in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("daily_whatsapp_status_logs")
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
      console.error("Error guardando whatsapp status:", error);
      return NextResponse.json(
        { error: "Error al guardar el registro de estado de WhatsApp" },
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
