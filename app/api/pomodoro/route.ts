import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phase, durationMinutes, startedAt, cycleNumber } = body as {
      phase?: string;
      durationMinutes?: number;
      startedAt?: string;
      cycleNumber?: number;
    };

    if (phase !== "focus" && phase !== "break") {
      return NextResponse.json({ error: "phase inválido" }, { status: 400 });
    }

    if (
      typeof durationMinutes !== "number" ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0
    ) {
      return NextResponse.json(
        { error: "durationMinutes debe ser un entero mayor a 0" },
        { status: 400 }
      );
    }

    if (typeof startedAt !== "string" || Number.isNaN(Date.parse(startedAt))) {
      return NextResponse.json(
        { error: "startedAt debe ser una fecha válida" },
        { status: 400 }
      );
    }

    if (
      typeof cycleNumber !== "number" ||
      !Number.isInteger(cycleNumber) ||
      cycleNumber <= 0
    ) {
      return NextResponse.json(
        { error: "cycleNumber debe ser un entero mayor a 0" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("pomodoro_sessions")
      .insert({
        phase,
        duration_minutes: durationMinutes,
        started_at: startedAt,
        cycle_number: cycleNumber,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creando sesión pomodoro:", error);
      return NextResponse.json(
        { error: "Error al crear la sesión pomodoro" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/pomodoro:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
