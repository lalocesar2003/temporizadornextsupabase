"use client";

import { useState } from "react";
import { calculateTaskProgress, type Subtask, type Task } from "@/lib/taskTypes";
import { ProgressBar } from "@/components/ProgressBar";
import { SubtaskList } from "@/components/SubtaskList";

interface TaskCardProps {
  task: Task;
  subtasks: Subtask[];
  onRefresh: () => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export function TaskCard({
  task,
  subtasks,
  onRefresh,
  onDelete,
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(task.title);
  const [editingDescription, setEditingDescription] = useState(
    task.description ?? ""
  );
  const [editingDueDate, setEditingDueDate] = useState(task.due_date ?? "");
  const [taskError, setTaskError] = useState<string | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const progress = calculateTaskProgress(subtasks);
  const completedCount = subtasks.filter((subtask) => subtask.completed).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDateValue = task.due_date
    ? new Date(`${task.due_date}T00:00:00`).getTime()
    : null;
  const remainingMs = dueDateValue !== null ? dueDateValue - Date.now() : null;
  const isOverdue = dueDateValue !== null && dueDateValue < today.getTime();
  const isDueSoon =
    dueDateValue !== null &&
    dueDateValue >= today.getTime() &&
    dueDateValue <= today.getTime() + 3 * 24 * 60 * 60 * 1000;
  const remainingLabel =
    remainingMs === null
      ? null
      : remainingMs <= 0
        ? "fecha vencida"
        : (() => {
            const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
            const days = Math.floor(totalHours / 24);
            const hours = totalHours % 24;

            if (days <= 0) {
              return `${hours} h restantes`;
            }

            return `${days} d ${hours} h restantes`;
          })();

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingTitle(task.title);
    setEditingDescription(task.description ?? "");
    setEditingDueDate(task.due_date ?? "");
    setTaskError(null);
  };

  const handleSaveTask = async () => {
    const cleanTitle = editingTitle.trim();
    const cleanDescription = editingDescription.trim();

    if (!cleanTitle) {
      setTaskError("El titulo no puede estar vacio.");
      return;
    }

    setSavingTask(true);
    setTaskError(null);

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          description: cleanDescription,
          due_date: editingDueDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo actualizar la tarea");
      }

      setIsEditing(false);
      await onRefresh();
    } catch (error) {
      console.error("Error actualizando task:", error);
      setTaskError("No se pudo actualizar la tarea.");
    } finally {
      setSavingTask(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/70 shadow-md transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between p-5 transition-colors hover:bg-slate-900">
        <div className="flex-1 text-left">
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editingTitle}
                onChange={(event) => setEditingTitle(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-lg font-semibold text-slate-100 outline-none"
                maxLength={160}
              />
              <textarea
                value={editingDescription}
                onChange={(event) => setEditingDescription(event.target.value)}
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 outline-none"
                rows={3}
                maxLength={500}
                placeholder="Descripcion opcional..."
              />
              <input
                type="date"
                value={editingDueDate}
                onChange={(event) => setEditingDueDate(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 outline-none"
              />
              {taskError ? (
                <p className="text-sm text-red-300">{taskError}</p>
              ) : null}
            </div>
          ) : (
            <button
              onClick={() => setIsExpanded((value) => !value)}
              className="w-full text-left"
            >
              <div className="mb-3 flex items-center gap-3">
                <h3 className="text-lg font-semibold text-slate-100">
                  {task.title}
                </h3>
                <span className="rounded bg-cyan-950 px-2 py-1 text-sm font-medium text-cyan-300">
                  {Math.round(progress)}%
                </span>
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    task.due_date
                      ? isOverdue
                        ? "bg-red-950 text-red-300"
                        : isDueSoon
                          ? "bg-amber-950 text-amber-300"
                          : "bg-slate-800 text-slate-300"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {task.due_date
                    ? `vence ${task.due_date}`
                    : "sin fecha limite"}
                </span>
              </div>

              {task.description ? (
                <p className="mb-3 text-sm text-slate-400">{task.description}</p>
              ) : null}

              {remainingLabel ? (
                <p
                  className={`mb-3 text-xs ${
                    isOverdue ? "text-red-300" : "text-slate-400"
                  }`}
                >
                  {remainingLabel}
                </p>
              ) : null}

              <ProgressBar percentage={progress} />

              <div className="mt-2 text-xs text-slate-500">
                {completedCount} de {subtasks.length} pasos completados
              </div>
            </button>
          )}
        </div>

        <div className="ml-4 flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => void handleSaveTask()}
                disabled={savingTask}
                className="rounded-lg px-3 py-1 text-sm text-cyan-300 transition-colors hover:bg-cyan-950 disabled:opacity-50"
              >
                Guardar
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={savingTask}
                className="rounded-lg px-3 py-1 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setIsEditing(true);
                setEditingTitle(task.title);
                setEditingDescription(task.description ?? "");
                setEditingDueDate(task.due_date ?? "");
                setTaskError(null);
              }}
              className="rounded-lg px-2 py-1 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              Editar
            </button>
          )}
          <button
            onClick={() => void onDelete(task.id)}
            className="rounded-lg px-2 py-1 text-sm text-slate-400 transition-colors hover:bg-red-950 hover:text-red-300"
          >
            Borrar
          </button>
          <button
            onClick={() => setIsExpanded((value) => !value)}
            className="rounded-lg px-2 py-1 text-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label={isExpanded ? "Contraer tarea" : "Expandir tarea"}
          >
            {isExpanded ? "−" : "+"}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="border-t border-slate-700 bg-slate-950/60 px-5 pb-5">
          <SubtaskList
            taskId={task.id}
            subtasks={subtasks}
            onSubtasksChange={onRefresh}
          />
        </div>
      ) : null}
    </div>
  );
}
