import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const noteId = Number(id);

  if (!Number.isInteger(noteId) || noteId <= 0) {
    return NextResponse.json({ error: "id invalido" }, { status: 400 });
  }

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
      .update({
        title: cleanTitle || null,
        content: cleanContent,
      })
      .eq("id", noteId)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando note:", error);
      return NextResponse.json(
        { error: "Error al actualizar la nota" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en PATCH /api/notes/[id]:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const noteId = Number(id);

  if (!Number.isInteger(noteId) || noteId <= 0) {
    return NextResponse.json({ error: "id invalido" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("notes").delete().eq("id", noteId);

  if (error) {
    console.error("Error eliminando note:", error);
    return NextResponse.json(
      { error: "Error al eliminar la nota" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
