import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("thought_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("Error leyendo pensamientos:", error);
    return NextResponse.json(
      { error: "Error al obtener los pensamientos" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content } = body as { content?: string };
    const cleanContent = typeof content === "string" ? content.trim() : "";

    if (!cleanContent) {
      return NextResponse.json(
        { error: "content es obligatorio" },
        { status: 400 }
      );
    }

    if (cleanContent.length > 500) {
      return NextResponse.json(
        { error: "content no debe superar 500 caracteres" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("thought_logs")
      .insert({ content: cleanContent })
      .select()
      .single();

    if (error) {
      console.error("Error creando pensamiento:", error);
      return NextResponse.json(
        { error: "Error al guardar el pensamiento" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/thoughts:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
