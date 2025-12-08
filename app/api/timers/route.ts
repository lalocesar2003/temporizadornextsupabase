// app/api/timers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { configuredMinutes, executedAt } = body as {
      configuredMinutes: number;
      executedAt: string; // ISO string
    };

    if (!configuredMinutes || configuredMinutes <= 0) {
      return NextResponse.json(
        { error: "configuredMinutes debe ser mayor a 0" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("timer_logs")
      .insert({
        configured_minutes: configuredMinutes,
        executed_at: executedAt, // puede ser ISO string
      })
      .select()
      .single();

    if (error) {
      console.error("Error insertando en Supabase:", error);
      return NextResponse.json(
        { error: "Error al guardar el temporizador" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("timer_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error leyendo logs:", error);
    return NextResponse.json(
      { error: "Error al obtener los registros" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}
