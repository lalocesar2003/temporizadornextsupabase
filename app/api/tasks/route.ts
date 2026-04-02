import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select("*");

  if (error) {
    console.error("Error leyendo tasks:", error);
    return NextResponse.json(
      { error: "Error al obtener las tareas" },
      { status: 500 }
    );
  }

  const rows = data ?? [];
  rows.sort((a, b) => {
    const aDue = a.due_date
      ? new Date(`${a.due_date}T00:00:00`).getTime()
      : Number.POSITIVE_INFINITY;
    const bDue = b.due_date
      ? new Date(`${b.due_date}T00:00:00`).getTime()
      : Number.POSITIVE_INFINITY;

    if (aDue !== bDue) return aDue - bDue;
    return a.position - b.position;
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, due_date } = body as {
      title?: string;
      description?: string;
      due_date?: string | null;
    };

    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const cleanDescription =
      typeof description === "string" ? description.trim() : "";
    const cleanDueDate =
      typeof due_date === "string" && due_date.trim() ? due_date.trim() : null;

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

    if (cleanDueDate && Number.isNaN(Date.parse(`${cleanDueDate}T00:00:00`))) {
      return NextResponse.json(
        { error: "due_date debe ser una fecha válida" },
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
        due_date: cleanDueDate,
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
