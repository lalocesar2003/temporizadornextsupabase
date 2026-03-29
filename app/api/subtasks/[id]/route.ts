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

    if ("weight" in body) {
      if (
        typeof body.weight !== "number" ||
        !Number.isInteger(body.weight) ||
        body.weight < 1
      ) {
        return NextResponse.json(
          { error: "weight debe ser un entero mayor o igual a 1" },
          { status: 400 }
        );
      }
      updates.weight = body.weight;
    }

    if ("completed" in body) {
      if (typeof body.completed !== "boolean") {
        return NextResponse.json(
          { error: "completed debe ser boolean" },
          { status: 400 }
        );
      }
      updates.completed = body.completed;
      updates.completed_at = body.completed ? new Date().toISOString() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No hay campos válidos para actualizar" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("subtasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando subtask:", error);
      return NextResponse.json(
        { error: "Error al actualizar el paso" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en PATCH /api/subtasks/[id]:", error);
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

    const { error } = await supabaseAdmin.from("subtasks").delete().eq("id", id);

    if (error) {
      console.error("Error eliminando subtask:", error);
      return NextResponse.json(
        { error: "Error al eliminar el paso" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/subtasks/[id]:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
