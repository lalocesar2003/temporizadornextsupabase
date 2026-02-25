import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("todo_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error leyendo TODOs:", error);
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

    if (cleanTitle.length > 120) {
      return NextResponse.json(
        { error: "title no debe superar 120 caracteres" },
        { status: 400 }
      );
    }

    if (cleanDescription.length > 500) {
      return NextResponse.json(
        { error: "description no debe superar 500 caracteres" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("todo_items")
      .insert({
        title: cleanTitle,
        description: cleanDescription || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creando TODO:", error);
      return NextResponse.json(
        { error: "Error al crear la tarea" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Error en POST /api/todos:", err);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
