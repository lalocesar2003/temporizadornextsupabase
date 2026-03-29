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

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if ("title" in body) {
      const cleanTitle =
        typeof body.title === "string" ? body.title.trim() : "";
      if (!cleanTitle) {
        return NextResponse.json(
          { error: "title debe ser un texto no vacío" },
          { status: 400 }
        );
      }
      if (cleanTitle.length > 160) {
        return NextResponse.json(
          { error: "title no debe superar 160 caracteres" },
          { status: 400 }
        );
      }
      updates.title = cleanTitle;
    }

    if ("description" in body) {
      const cleanDescription =
        typeof body.description === "string" ? body.description.trim() : "";
      if (cleanDescription.length > 500) {
        return NextResponse.json(
          { error: "description no debe superar 500 caracteres" },
          { status: 400 }
        );
      }
      updates.description = cleanDescription || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No hay campos válidos para actualizar" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando task:", error);
      return NextResponse.json(
        { error: "Error al actualizar la tarea" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en PATCH /api/tasks/[id]:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("tasks").delete().eq("id", id);

    if (error) {
      console.error("Error eliminando task:", error);
      return NextResponse.json(
        { error: "Error al eliminar la tarea" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/tasks/[id]:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
