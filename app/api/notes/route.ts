import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("notes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error leyendo notes:", error);
    return NextResponse.json(
      { error: "Error al obtener las notas" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content } = body as {
      title?: string;
      content?: string;
    };

    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const cleanContent = typeof content === "string" ? content.trim() : "";

    if (!cleanContent) {
      return NextResponse.json(
        { error: "content es obligatorio" },
        { status: 400 }
      );
    }

    if (cleanTitle.length > 120) {
      return NextResponse.json(
        { error: "title no debe superar 120 caracteres" },
        { status: 400 }
      );
    }

    if (cleanContent.length > 3000) {
      return NextResponse.json(
        { error: "content no debe superar 3000 caracteres" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("notes")
      .insert({
        title: cleanTitle || null,
        content: cleanContent,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creando note:", error);
      return NextResponse.json(
        { error: "Error al crear la nota" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/notes:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
