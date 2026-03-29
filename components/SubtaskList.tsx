"use client";

import { useState } from "react";
import type { Subtask } from "@/lib/taskTypes";

interface SubtaskListProps {
  taskId: string;
  subtasks: Subtask[];
  onSubtasksChange: () => Promise<void>;
}

export function SubtaskList({
  taskId,
  subtasks,
  onSubtasksChange,
}: SubtaskListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskWeight, setNewSubtaskWeight] = useState(1);
  const [subtaskError, setSubtaskError] = useState<string | null>(null);
  const [subtaskBusy, setSubtaskBusy] = useState(false);

  const toggleSubtask = async (subtask: Subtask) => {
    setSubtaskBusy(true);
    setSubtaskError(null);

    try {
      const res = await fetch(`/api/subtasks/${subtask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !subtask.completed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo actualizar el paso");
      }

      await onSubtasksChange();
    } catch (error) {
      console.error("Error actualizando subtask:", error);
      setSubtaskError("No se pudo actualizar el paso.");
    } finally {
      setSubtaskBusy(false);
    }
  };

  const addSubtask = async () => {
    const cleanTitle = newSubtaskTitle.trim();
    if (!cleanTitle) {
      setSubtaskError("El titulo del paso es obligatorio.");
      return;
    }

    setSubtaskBusy(true);
    setSubtaskError(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          weight: newSubtaskWeight,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo crear el paso");
      }

      setNewSubtaskTitle("");
      setNewSubtaskWeight(1);
      setIsAdding(false);
      await onSubtasksChange();
    } catch (error) {
      console.error("Error creando subtask:", error);
      setSubtaskError("No se pudo crear el paso.");
    } finally {
      setSubtaskBusy(false);
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    setSubtaskBusy(true);
    setSubtaskError(null);

    try {
      const res = await fetch(`/api/subtasks/${subtaskId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo eliminar el paso");
      }

      await onSubtasksChange();
    } catch (error) {
      console.error("Error eliminando subtask:", error);
      setSubtaskError("No se pudo eliminar el paso.");
    } finally {
      setSubtaskBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      {subtasks.map((subtask) => (
        <div
          key={subtask.id}
          className="group flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/70 p-3"
        >
          <button
            onClick={() => void toggleSubtask(subtask)}
            disabled={subtaskBusy}
            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
              subtask.completed
                ? "border-cyan-500 bg-cyan-500"
                : "border-slate-500 hover:border-cyan-400"
            }`}
          >
            {subtask.completed ? (
              <span className="text-xs font-bold text-slate-950">✓</span>
            ) : null}
          </button>

          <span
            className={`flex-1 text-sm ${
              subtask.completed ? "text-slate-500 line-through" : "text-slate-200"
            }`}
          >
            {subtask.title}
          </span>

          <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-400">
            peso {subtask.weight}
          </span>

          <button
            onClick={() => void deleteSubtask(subtask.id)}
            disabled={subtaskBusy}
            className="opacity-0 transition-all group-hover:opacity-100 text-sm text-slate-400 hover:text-red-400"
          >
            Borrar
          </button>
        </div>
      ))}

      {isAdding ? (
        <div className="space-y-3 rounded-lg border border-cyan-800 bg-slate-900/80 p-3">
          <input
            type="text"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            placeholder="Titulo del paso..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none"
            maxLength={160}
            autoFocus
          />
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-400">Peso</label>
            <input
              type="number"
              min={1}
              value={newSubtaskWeight}
              onChange={(e) =>
                setNewSubtaskWeight(Math.max(1, Number(e.target.value) || 1))
              }
              className="w-20 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm outline-none"
            />
            <div className="flex-1" />
            <button
              onClick={() => {
                setIsAdding(false);
                setNewSubtaskTitle("");
                setNewSubtaskWeight(1);
                setSubtaskError(null);
              }}
              className="px-3 py-1 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              onClick={() => void addSubtask()}
              disabled={subtaskBusy}
              className="rounded-lg bg-cyan-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
          {subtaskError ? (
            <p className="text-sm text-red-300">{subtaskError}</p>
          ) : null}
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full rounded-lg border-2 border-dashed border-slate-700 p-3 text-sm font-medium text-slate-400 transition-colors hover:border-cyan-500 hover:text-cyan-300"
        >
          Agregar paso
        </button>
      )}

      {!isAdding && subtaskError ? (
        <p className="text-sm text-red-300">{subtaskError}</p>
      ) : null}
    </div>
  );
}
