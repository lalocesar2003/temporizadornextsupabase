import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .order("position", { ascending: true });

  if (error) {
    console.error("Error leyendo tasks:", error);
    return NextResponse.json(
      { error: "Error al obtener las tareas" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description } = body as {
      title?: string;
      description?: string;
    };

    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const cleanDescription =
      typeof description === "string" ? description.trim() : "";

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

    if (cleanDescription.length > 500) {
      return NextResponse.json(
        { error: "description no debe superar 500 caracteres" },
        { status: 400 }
      );
    }

    const { data: maxRow, error: maxError } = await supabaseAdmin
      .from("tasks")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) {
      console.error("Error leyendo posición máxima de tasks:", maxError);
      return NextResponse.json(
        { error: "Error al crear la tarea" },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .insert({
        title: cleanTitle,
        description: cleanDescription || null,
        position: (maxRow?.position ?? 0) + 1,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creando task:", error);
      return NextResponse.json(
        { error: "Error al crear la tarea" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/tasks:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
