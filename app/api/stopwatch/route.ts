import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("stopwatch_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error leyendo stopwatch logs:", error);
    return NextResponse.json(
      { error: "Error al obtener los registros del cronometro" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { label, startedAt, endedAt, durationSeconds } = body as {
      label?: string;
      startedAt?: string;
      endedAt?: string;
      durationSeconds?: number;
    };

    const cleanLabel = typeof label === "string" ? label.trim() : "";

    if (!startedAt || Number.isNaN(Date.parse(startedAt))) {
      return NextResponse.json(
        { error: "startedAt debe ser una fecha valida" },
        { status: 400 }
      );
    }

    if (!endedAt || Number.isNaN(Date.parse(endedAt))) {
      return NextResponse.json(
        { error: "endedAt debe ser una fecha valida" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(durationSeconds) ||
      typeof durationSeconds !== "number" ||
      durationSeconds < 0
    ) {
      return NextResponse.json(
        { error: "durationSeconds debe ser un entero mayor o igual a 0" },
        { status: 400 }
      );
    }

    if (cleanLabel.length > 120) {
      return NextResponse.json(
        { error: "label no debe superar 120 caracteres" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("stopwatch_logs")
      .insert({
        label: cleanLabel || null,
        started_at: startedAt,
        ended_at: endedAt,
        duration_seconds: durationSeconds,
      })
      .select()
      .single();

    if (error) {
      console.error("Error insertando stopwatch log:", error);
      return NextResponse.json(
        { error: "Error al guardar el cronometro" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/stopwatch:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
