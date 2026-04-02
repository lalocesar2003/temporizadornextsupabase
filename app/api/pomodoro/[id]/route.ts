import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseId(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json();
    const { completedAt } = body as { completedAt?: string };

    if (typeof completedAt !== "string" || Number.isNaN(Date.parse(completedAt))) {
      return NextResponse.json(
        { error: "completedAt debe ser una fecha válida" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("pomodoro_sessions")
      .update({ completed_at: completedAt })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error completando sesión pomodoro:", error);
      return NextResponse.json(
        { error: "Error al actualizar la sesión pomodoro" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en PATCH /api/pomodoro/[id]:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
