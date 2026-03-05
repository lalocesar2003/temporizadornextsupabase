import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseId(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if ("title" in body) {
      const cleanTitle =
        typeof body.title === "string" ? body.title.trim() : undefined;

      if (typeof cleanTitle !== "string" || !cleanTitle) {
        return NextResponse.json(
          { error: "title debe ser un texto no vacío" },
          { status: 400 }
        );
      }

      if (cleanTitle.length > 120) {
        return NextResponse.json(
          { error: "title no debe superar 120 caracteres" },
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

    if ("completed" in body) {
      if (typeof body.completed !== "boolean") {
        return NextResponse.json(
          { error: "completed debe ser boolean" },
          { status: 400 }
        );
      }
      updates.completed = body.completed;
      updates.completed_at = body.completed ? new Date().toISOString() : null;

      if (body.completed === false) {
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
            { error: "Error al actualizar la tarea" },
            { status: 500 }
          );
        }

        updates.position = (maxRow?.position ?? 0) + 1;
      }
    }

    if ("priority" in body) {
      if (
        typeof body.priority !== "number" ||
        !Number.isInteger(body.priority) ||
        body.priority < 1 ||
        body.priority > 5
      ) {
        return NextResponse.json(
          { error: "priority debe ser entero entre 1 y 5" },
          { status: 400 }
        );
      }
      updates.priority = body.priority;
    }

    if ("position" in body) {
      if (
        typeof body.position !== "number" ||
        !Number.isInteger(body.position) ||
        body.position < 1
      ) {
        return NextResponse.json(
          { error: "position debe ser entero mayor o igual a 1" },
          { status: 400 }
        );
      }
      updates.position = body.position;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No hay campos válidos para actualizar" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("todo_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando TODO:", error);
      return NextResponse.json(
        { error: "Error al actualizar la tarea" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Error en PATCH /api/todos/[id]:", err);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("todo_items").delete().eq("id", id);

    if (error) {
      console.error("Error eliminando TODO:", error);
      return NextResponse.json(
        { error: "Error al eliminar la tarea" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error en DELETE /api/todos/[id]:", err);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
