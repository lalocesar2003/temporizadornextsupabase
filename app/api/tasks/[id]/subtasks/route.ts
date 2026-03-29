import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function GET(_: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("subtasks")
    .select("*")
    .eq("task_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error leyendo subtasks:", error);
    return NextResponse.json(
      { error: "Error al obtener los pasos" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json();
    const { title, weight } = body as { title?: string; weight?: number };

    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const parsedWeight =
      typeof weight === "number" && Number.isInteger(weight) ? weight : 1;

    if (!cleanTitle) {
      return NextResponse.json(
        { error: "title es obligatorio" },
        { status: 400 }
      );
    }

    if (cleanTitle.length > 160) {
      return NextResponse.json(
        { error: "title no debe superar 160 caracteres" },
        { status: 400 }
      );
    }

    if (parsedWeight < 1) {
      return NextResponse.json(
        { error: "weight debe ser mayor o igual a 1" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("subtasks")
      .insert({
        task_id: id,
        title: cleanTitle,
        weight: parsedWeight,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creando subtask:", error);
      return NextResponse.json(
        { error: "Error al crear el paso" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/tasks/[id]/subtasks:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
