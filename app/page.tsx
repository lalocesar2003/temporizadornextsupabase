"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useEffectEvent } from "react";
import { TaskCard } from "@/components/TaskCard";
import type { Subtask, Task } from "@/lib/taskTypes";

type TimerLog = {
  id: number;
  configured_minutes: number;
  executed_at: string;
  created_at: string;
  label: string | null;
};

type ThoughtLog = {
  id: number;
  content: string;
  created_at: string;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString();
  return { date, time };
}

export default function HomePage() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const [label, setLabel] = useState("");
  const [minutes, setMinutes] = useState(1);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<TimerLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [targetTime, setTargetTime] = useState<number | null>(null);

  const [thoughts, setThoughts] = useState<ThoughtLog[]>([]);
  const [thoughtContent, setThoughtContent] = useState("");
  const [thoughtError, setThoughtError] = useState<string | null>(null);
  const [loadingThoughts, setLoadingThoughts] = useState(false);
  const [savingThought, setSavingThought] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasksByTask, setSubtasksByTask] = useState<Record<string, Subtask[]>>(
    {}
  );
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [submittingTask, setSubmittingTask] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dropTargetTaskId, setDropTargetTaskId] = useState<string | null>(null);

  const ensureAudioContext = async () => {
    if (typeof window === "undefined") return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  };

  const playAlarm = useEffectEvent(async () => {
    try {
      const audioContext = await ensureAudioContext();
      if (!audioContext) return;

      const startAt = audioContext.currentTime;
      const burstCount = 6;

      for (let index = 0; index < burstCount; index += 1) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const toneStart = startAt + index * 0.42;
        const toneMid = toneStart + 0.16;
        const toneEnd = toneStart + 0.34;

        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(780, toneStart);
        oscillator.frequency.linearRampToValueAtTime(1320, toneMid);
        oscillator.frequency.linearRampToValueAtTime(780, toneEnd);

        gainNode.gain.setValueAtTime(0.0001, toneStart);
        gainNode.gain.exponentialRampToValueAtTime(0.32, toneStart + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start(toneStart);
        oscillator.stop(toneEnd);
      }
    } catch (error) {
      console.error("No se pudo reproducir la alarma:", error);
    }
  });

  useEffect(() => {
    if (!running) {
      setRemainingSeconds(minutes * 60);
    }
  }, [minutes, running]);

  useEffect(() => {
    if (!running || !targetTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diffMs = targetTime - now;
      const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

      setRemainingSeconds(diffSeconds);

      if (diffSeconds <= 0) {
        setRunning(false);
        clearInterval(interval);
        void playAlarm();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [running, targetTime]);

  const cargarLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/timers");
      if (!res.ok) {
        throw new Error("No se pudieron obtener los registros");
      }
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando logs:", error);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const cargarThoughts = async () => {
    setLoadingThoughts(true);
    setThoughtError(null);
    try {
      const res = await fetch("/api/thoughts");
      if (!res.ok) {
        throw new Error("No se pudieron obtener los pensamientos");
      }
      const data = await res.json();
      setThoughts(Array.isArray(data) ? (data as ThoughtLog[]) : []);
    } catch (error) {
      console.error("Error cargando pensamientos:", error);
      setThoughtError("No se pudieron cargar los pensamientos.");
      setThoughts([]);
    } finally {
      setLoadingThoughts(false);
    }
  };

  const cargarTasks = async () => {
    setLoadingTasks(true);
    setTaskError(null);

    try {
      const tasksRes = await fetch("/api/tasks");
      if (!tasksRes.ok) {
        throw new Error("No se pudieron obtener las tareas");
      }

      const tasksData = await tasksRes.json();
      const nextTasks = Array.isArray(tasksData) ? (tasksData as Task[]) : [];
      setTasks(nextTasks);

      const subtasksEntries = await Promise.all(
        nextTasks.map(async (task) => {
          const subtasksRes = await fetch(`/api/tasks/${task.id}/subtasks`);
          if (!subtasksRes.ok) {
            throw new Error("No se pudieron obtener los pasos");
          }

          const subtasksData = await subtasksRes.json();
          return [
            task.id,
            Array.isArray(subtasksData) ? (subtasksData as Subtask[]) : [],
          ] as const;
        })
      );

      setSubtasksByTask(Object.fromEntries(subtasksEntries));
    } catch (error) {
      console.error("Error cargando tasks:", error);
      setTaskError("No se pudieron cargar las tareas.");
      setTasks([]);
      setSubtasksByTask({});
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    void cargarLogs();
    void cargarThoughts();
    void cargarTasks();
  }, []);

  const handleStart = async () => {
    if (minutes <= 0) return;

    const now = new Date();
    const target = now.getTime() + minutes * 60 * 1000;

    await ensureAudioContext();

    setTargetTime(target);
    setRemainingSeconds(minutes * 60);
    setRunning(true);

    try {
      const res = await fetch("/api/timers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configuredMinutes: minutes,
          executedAt: now.toISOString(),
          label,
        }),
      });

      if (!res.ok) {
        throw new Error("Error guardando temporizador");
      }

      await cargarLogs();
    } catch (error) {
      console.error("Error guardando el temporizador:", error);
    }
  };

  const handleStop = () => {
    setRunning(false);
  };

  const handleReset = () => {
    setRunning(false);
    setTargetTime(null);
    setRemainingSeconds(minutes * 60);
  };

  const handleSaveThought = async () => {
    const cleanContent = thoughtContent.trim();

    if (!cleanContent) {
      setThoughtError("Escribe un pensamiento antes de guardarlo.");
      return;
    }

    setSavingThought(true);
    setThoughtError(null);

    try {
      const res = await fetch("/api/thoughts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: cleanContent }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo guardar el pensamiento");
      }

      setThoughtContent("");
      await cargarThoughts();
    } catch (error) {
      console.error("Error guardando pensamiento:", error);
      setThoughtError("No se pudo guardar el pensamiento.");
    } finally {
      setSavingThought(false);
    }
  };

  const handleCreateTask = async () => {
    const cleanTitle = newTaskTitle.trim();
    const cleanDescription = newTaskDescription.trim();

    if (!cleanTitle) {
      setTaskError("El titulo de la tarea grande es obligatorio.");
      return;
    }

    setSubmittingTask(true);
    setTaskError(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          description: cleanDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo crear la tarea");
      }

      setNewTaskTitle("");
      setNewTaskDescription("");
      setIsCreatingTask(false);
      await cargarTasks();
    } catch (error) {
      console.error("Error creando task:", error);
      setTaskError("No se pudo crear la tarea.");
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTaskError(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo eliminar la tarea");
      }

      await cargarTasks();
    } catch (error) {
      console.error("Error eliminando task:", error);
      setTaskError("No se pudo eliminar la tarea.");
    }
  };

  const handleTaskDragStart = (taskId: string) => {
    setDraggingTaskId(taskId);
    setDropTargetTaskId(null);
  };

  const handleTaskDragOver = (
    event: DragEvent<HTMLDivElement>,
    targetTaskId: string
  ) => {
    if (!draggingTaskId || draggingTaskId === targetTaskId) return;
    event.preventDefault();
    setDropTargetTaskId(targetTaskId);
  };

  const handleTaskDragEnd = () => {
    setDraggingTaskId(null);
    setDropTargetTaskId(null);
  };

  const handleTaskDrop = async (targetTaskId: string) => {
    if (!draggingTaskId || draggingTaskId === targetTaskId) {
      handleTaskDragEnd();
      return;
    }

    const draggedIndex = tasks.findIndex((task) => task.id === draggingTaskId);
    const targetIndex = tasks.findIndex((task) => task.id === targetTaskId);

    if (draggedIndex === -1 || targetIndex === -1) {
      handleTaskDragEnd();
      return;
    }

    const reordered = [...tasks];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const normalized = reordered.map((task, index) => ({
      ...task,
      position: index + 1,
    }));
    const reorderItems = normalized.map((task) => ({
      id: task.id,
      position: task.position,
    }));

    const prevTasks = tasks;
    setTaskError(null);
    setTasks(normalized);
    handleTaskDragEnd();

    try {
      const res = await fetch("/api/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reorderItems }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo reordenar");
      }
    } catch (error) {
      console.error("Error reordenando tasks:", error);
      setTaskError("No se pudo guardar el nuevo orden de las tareas.");
      setTasks(prevTasks);
    }
  };

  const latestLog = logs[0] ?? null;

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
        <section className="rounded-xl bg-slate-800 p-6 shadow-lg">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold">
                Pensamientos tontos y distracciones
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Anota rapido lo que te distrae y manten a la vista solo los 3 mas
                recientes.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Recientes</h3>
                {loadingThoughts ? (
                  <p className="text-sm text-slate-400">
                    Cargando pensamientos...
                  </p>
                ) : thoughts.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Aun no hay pensamientos guardados.
                  </p>
                ) : (
                  <ul className="max-h-80 space-y-2 overflow-y-auto pr-2">
                    {thoughts.map((thought) => (
                      <li
                        key={thought.id}
                        className="rounded-lg border border-slate-700 bg-slate-900/60 p-3"
                      >
                        <p className="text-sm">{thought.content}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {formatDateTime(thought.created_at).date}{" "}
                          {formatDateTime(thought.created_at).time}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Agregar nuevo pensamiento
                </label>
                <textarea
                  value={thoughtContent}
                  onChange={(e) => setThoughtContent(e.target.value)}
                  className="min-h-32 w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 outline-none focus:border-slate-600"
                  placeholder="Escribe lo que te distrae o lo que no quieres olvidar..."
                  maxLength={500}
                />
                {thoughtError ? (
                  <p className="text-sm text-red-300">{thoughtError}</p>
                ) : null}
                <div className="flex justify-end">
                  <button
                    onClick={() => void handleSaveThought()}
                    disabled={savingThought}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6 rounded-xl bg-slate-800 p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-center md:text-left">
            Temporizador con registro en Supabase
          </h1>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <label className="block text-sm">
                Minutos:
                <input
                  type="number"
                  min={1}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="mt-1 w-full rounded-md bg-slate-700 px-3 py-2 outline-none"
                  disabled={running}
                />
              </label>
              <label className="block text-sm">
                Etiqueta:
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ej: Estudio, Trabajo, Gym..."
                  className="mt-1 w-full rounded-md bg-slate-700 px-3 py-2 outline-none"
                  disabled={running}
                  maxLength={80}
                />
              </label>

              <div className="text-center font-mono text-5xl">
                {formatTime(remainingSeconds)}
              </div>

              <div className="flex justify-center gap-2">
                <button
                  onClick={() => void handleStart()}
                  disabled={running}
                  className="rounded bg-green-600 px-4 py-2 disabled:opacity-50"
                >
                  Iniciar
                </button>
                <button
                  onClick={handleStop}
                  disabled={!running}
                  className="rounded bg-yellow-500 px-4 py-2 disabled:opacity-50"
                >
                  Pausar
                </button>
                <button
                  onClick={handleReset}
                  className="rounded bg-red-600 px-4 py-2"
                >
                  Reset
                </button>
              </div>

              <p className="text-center text-xs text-slate-400">
                Cada vez que presionas <b>Iniciar</b>, se guarda en Supabase: el
                dia, los minutos configurados y la hora de ejecucion.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Ultimo registro</h2>
                <button
                  onClick={() => void cargarLogs()}
                  className="rounded bg-slate-700 px-2 py-1 text-xs"
                >
                  Actualizar
                </button>
              </div>

              {loadingLogs ? (
                <p className="text-sm text-slate-400">Cargando registros...</p>
              ) : !latestLog ? (
                <p className="text-sm text-slate-400">
                  Aun no hay registros de temporizadores.
                </p>
              ) : (
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Fecha
                      </p>
                      <p>{formatDateTime(latestLog.executed_at).date}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Hora
                      </p>
                      <p>{formatDateTime(latestLog.executed_at).time}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Min
                      </p>
                      <p>{latestLog.configured_minutes}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Etiqueta
                      </p>
                      <p>{latestLog.label || "-"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-5 rounded-xl bg-slate-800 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Mis Tareas</h2>
              <p className="mt-1 text-sm text-slate-400">
                Organiza tus objetivos grandes en pasos pequenos con progreso
                ponderado por peso.
              </p>
            </div>
            <button
              onClick={() => void cargarTasks()}
              className="rounded bg-slate-700 px-2 py-1 text-xs"
            >
              Actualizar
            </button>
          </div>

          {taskError ? <p className="text-sm text-red-300">{taskError}</p> : null}

          {loadingTasks ? (
            <p className="text-sm text-slate-400">Cargando tareas...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-slate-400">
              Aun no hay tareas grandes creadas.
            </p>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleTaskDragStart(task.id)}
                  onDragOver={(event) => handleTaskDragOver(event, task.id)}
                  onDrop={() => void handleTaskDrop(task.id)}
                  onDragEnd={handleTaskDragEnd}
                  className={`transition ${
                    dropTargetTaskId === task.id
                      ? "rounded-xl ring-2 ring-cyan-400"
                      : ""
                  } ${draggingTaskId === task.id ? "opacity-60" : ""}`}
                >
                  <TaskCard
                    task={task}
                    subtasks={subtasksByTask[task.id] ?? []}
                    onRefresh={cargarTasks}
                    onDelete={handleDeleteTask}
                  />
                </div>
              ))}
            </div>
          )}

          {isCreatingTask ? (
            <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/70 p-5">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Titulo de la tarea grande..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 outline-none"
                maxLength={160}
                autoFocus
              />
              <textarea
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Descripcion opcional..."
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 outline-none"
                rows={3}
                maxLength={500}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsCreatingTask(false);
                    setNewTaskTitle("");
                    setNewTaskDescription("");
                    setTaskError(null);
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void handleCreateTask()}
                  disabled={submittingTask}
                  className="rounded-lg bg-cyan-600 px-4 py-2 font-medium text-white disabled:opacity-50"
                >
                  Crear tarea
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingTask(true)}
              className="w-full rounded-xl border-2 border-dashed border-slate-700 p-5 text-lg font-medium text-slate-400 transition-colors hover:border-cyan-500 hover:bg-slate-900/60 hover:text-cyan-300"
            >
              Nueva tarea grande
            </button>
          )}
          {tasks.length > 1 ? (
            <p className="text-xs text-slate-500">
              Arrastra las tareas grandes para reordenarlas.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
