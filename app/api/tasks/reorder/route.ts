import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ReorderItem = {
  id: string;
  position: number;
};

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body?.items as ReorderItem[] | undefined;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items debe ser un arreglo no vacío" },
        { status: 400 }
      );
    }

    const validItems = items.every(
      (item) =>
        typeof item?.id === "string" &&
        isValidUuid(item.id) &&
        Number.isInteger(item?.position) &&
        item.position > 0
    );

    if (!validItems) {
      return NextResponse.json(
        { error: "items contiene valores inválidos" },
        { status: 400 }
      );
    }

    const ids = items.map((item) => item.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      return NextResponse.json(
        { error: "items contiene ids duplicados" },
        { status: 400 }
      );
    }

    const updates = items.map((item) =>
      supabaseAdmin.from("tasks").update({ position: item.position }).eq("id", item.id)
    );

    const results = await Promise.all(updates);
    const firstError = results.find((result) => result.error)?.error;

    if (firstError) {
      console.error("Error reordenando tasks:", firstError);
      return NextResponse.json(
        { error: "Error al reordenar tareas" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en PATCH /api/tasks/reorder:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
