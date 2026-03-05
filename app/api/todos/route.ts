import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("todo_items")
    .select("*");

  if (error) {
    console.error("Error leyendo TODOs:", error);
    return NextResponse.json(
      { error: "Error al obtener las tareas" },
      { status: 500 }
    );
  }

  const rows = data ?? [];
  const pending = rows
    .filter((item) => !item.completed)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.position !== b.position) return a.position - b.position;
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  const completed = rows
    .filter((item) => item.completed)
    .sort(
      (a, b) =>
        new Date(b.completed_at ?? b.updated_at).getTime() -
        new Date(a.completed_at ?? a.updated_at).getTime()
    );

  return NextResponse.json([...pending, ...completed]);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, priority } = body as {
      title?: string;
      description?: string;
      priority?: number;
    };

    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const cleanDescription =
      typeof description === "string" ? description.trim() : "";
    const parsedPriority =
      typeof priority === "number" && Number.isInteger(priority) ? priority : 3;

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

    if (parsedPriority < 1 || parsedPriority > 5) {
      return NextResponse.json(
        { error: "priority debe estar entre 1 y 5" },
        { status: 400 }
      );
    }

    const { data: maxRow, error: maxError } = await supabaseAdmin
      .from("todo_items")
      .select("position")
      .eq("completed", false)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) {
      console.error("Error leyendo posición máxima:", maxError);
      return NextResponse.json(
        { error: "Error al crear la tarea" },
        { status: 500 }
      );
    }

    const nextPosition = (maxRow?.position ?? 0) + 1;

    const { data, error } = await supabaseAdmin
      .from("todo_items")
      .insert({
        title: cleanTitle,
        description: cleanDescription || null,
        priority: parsedPriority,
        position: nextPosition,
        completed: false,
        completed_at: null,
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
