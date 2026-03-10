"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useEffectEvent } from "react";

type TimerLog = {
  id: number;
  configured_minutes: number;
  executed_at: string;
  created_at: string;
  label: string | null;
};

type TodoItem = {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  priority: number;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
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

function sortTodos(items: TodoItem[]) {
  const pending = items
    .filter((item) => !item.completed)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.position !== b.position) return a.position - b.position;
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

  const completed = items
    .filter((item) => item.completed)
    .sort(
      (a, b) =>
        new Date(b.completed_at ?? b.updated_at).getTime() -
        new Date(a.completed_at ?? a.updated_at).getTime()
    );

  return { pending, completed };
}

function buildPendingReorderPayload(items: TodoItem[]) {
  const { pending } = sortTodos(items);
  return pending.map((item, index) => ({ id: item.id, position: index + 1 }));
}

export default function HomePage() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [label, setLabel] = useState<string>("");
  const [minutes, setMinutes] = useState<number>(1);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(60);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<TimerLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [targetTime, setTargetTime] = useState<number | null>(null);

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [todoTitle, setTodoTitle] = useState("");
  const [todoDescription, setTodoDescription] = useState("");
  const [todoPriority, setTodoPriority] = useState(3);
  const [todoError, setTodoError] = useState<string | null>(null);
  const [submittingTodo, setSubmittingTodo] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [activeTodoTab, setActiveTodoTab] = useState<"pending" | "completed">(
    "pending"
  );
  const [pendingPriorityFilter, setPendingPriorityFilter] = useState<
    "all" | 1 | 2 | 3 | 4 | 5
  >(1);
  const [draggingTodoId, setDraggingTodoId] = useState<number | null>(null);
  const [dropTargetTodoId, setDropTargetTodoId] = useState<number | null>(null);

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
    } catch (err) {
      console.error("Error cargando logs:", err);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const cargarTodos = async () => {
    setLoadingTodos(true);
    setTodoError(null);
    try {
      const res = await fetch("/api/todos");
      if (!res.ok) {
        throw new Error("No se pudieron obtener las tareas");
      }
      const data = await res.json();
      setTodos(Array.isArray(data) ? (data as TodoItem[]) : []);
    } catch (err) {
      console.error("Error cargando TODOs:", err);
      setTodoError("No se pudieron cargar las tareas.");
      setTodos([]);
    } finally {
      setLoadingTodos(false);
    }
  };

  useEffect(() => {
    cargarLogs();
    cargarTodos();
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
    } catch (err) {
      console.error("Error guardando el temporizador:", err);
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

  const handleCreateTodo = async () => {
    const cleanTitle = todoTitle.trim();
    const cleanDescription = todoDescription.trim();

    if (!cleanTitle) {
      setTodoError("El título de la tarea es obligatorio.");
      return;
    }

    setSubmittingTodo(true);
    setTodoError(null);

    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          description: cleanDescription,
          priority: todoPriority,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo crear la tarea");
      }

      setTodos((prev) => [...prev, data as TodoItem]);
      setTodoTitle("");
      setTodoDescription("");
      setTodoPriority(3);
    } catch (err) {
      console.error("Error creando TODO:", err);
      setTodoError("No se pudo crear la tarea.");
    } finally {
      setSubmittingTodo(false);
    }
  };

  const handleToggleTodo = async (todo: TodoItem) => {
    const nextCompleted = !todo.completed;
    const prevTodos = todos;
    const nowIso = new Date().toISOString();

    setTodoError(null);
    setTodos((prev) =>
      prev.map((item) =>
        item.id === todo.id
          ? {
              ...item,
              completed: nextCompleted,
              completed_at: nextCompleted ? nowIso : null,
            }
          : item
      )
    );

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextCompleted }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo actualizar la tarea");
      }

      setTodos((prev) =>
        prev.map((item) => (item.id === todo.id ? (data as TodoItem) : item))
      );
    } catch (err) {
      console.error("Error cambiando estado de TODO:", err);
      setTodoError("No se pudo actualizar el estado de la tarea.");
      setTodos(prevTodos);
    }
  };

  const handlePriorityChange = async (todo: TodoItem, nextPriority: number) => {
    if (todo.priority === nextPriority) return;

    const prevTodos = todos;
    const optimistic = todos.map((item) =>
      item.id === todo.id ? { ...item, priority: nextPriority } : item
    );
    setTodos(optimistic);

    const reorderItems = buildPendingReorderPayload(optimistic);
    const normalized = optimistic.map((item) => {
      const next = reorderItems.find((r) => r.id === item.id);
      return next ? { ...item, position: next.position } : item;
    });
    setTodos(normalized);

    try {
      const patchRes = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: nextPriority }),
      });

      const patchData = await patchRes.json();
      if (!patchRes.ok) {
        throw new Error(patchData?.error || "No se pudo actualizar prioridad");
      }

      const reorderRes = await fetch("/api/todos/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reorderItems }),
      });
      const reorderData = await reorderRes.json();
      if (!reorderRes.ok) {
        throw new Error(reorderData?.error || "No se pudo actualizar orden");
      }

      await cargarTodos();
    } catch (err) {
      console.error("Error actualizando prioridad:", err);
      setTodoError("No se pudo actualizar la prioridad.");
      setTodos(prevTodos);
    }
  };

  const handlePendingDragStart = (todoId: number) => {
    setDraggingTodoId(todoId);
    setDropTargetTodoId(null);
  };

  const handlePendingDragOver = (
    event: DragEvent<HTMLDivElement>,
    targetTodoId: number
  ) => {
    if (!draggingTodoId || draggingTodoId === targetTodoId) return;

    const dragged = pendingTodos.find((item) => item.id === draggingTodoId);
    const target = pendingTodos.find((item) => item.id === targetTodoId);
    if (!dragged || !target || dragged.priority !== target.priority) return;

    event.preventDefault();
    setDropTargetTodoId(targetTodoId);
  };

  const handlePendingDragEnd = () => {
    setDraggingTodoId(null);
    setDropTargetTodoId(null);
  };

  const handlePendingDrop = async (targetTodoId: number) => {
    if (!draggingTodoId || draggingTodoId === targetTodoId) {
      handlePendingDragEnd();
      return;
    }

    const dragged = pendingTodos.find((item) => item.id === draggingTodoId);
    const target = pendingTodos.find((item) => item.id === targetTodoId);
    if (!dragged || !target || dragged.priority !== target.priority) {
      handlePendingDragEnd();
      return;
    }

    const samePriority = pendingTodos.filter(
      (item) => item.priority === dragged.priority
    );
    const draggedIndex = samePriority.findIndex(
      (item) => item.id === draggingTodoId
    );
    const targetIndex = samePriority.findIndex(
      (item) => item.id === targetTodoId
    );

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      handlePendingDragEnd();
      return;
    }

    const reorderedPriority = [...samePriority];
    const [moved] = reorderedPriority.splice(draggedIndex, 1);
    reorderedPriority.splice(targetIndex, 0, moved);

    let cursor = 0;
    const reorderedPending = pendingTodos.map((item) =>
      item.priority === dragged.priority ? reorderedPriority[cursor++] : item
    );
    const reorderItems = reorderedPending.map((item, index) => ({
      id: item.id,
      position: index + 1,
    }));

    const prevTodos = todos;
    const reorderMap = new Map(reorderItems.map((item) => [item.id, item.position]));
    const optimisticTodos = todos.map((item) =>
      reorderMap.has(item.id)
        ? { ...item, position: reorderMap.get(item.id) ?? item.position }
        : item
    );

    setTodoError(null);
    setTodos(optimisticTodos);
    handlePendingDragEnd();

    try {
      const res = await fetch("/api/todos/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reorderItems }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo reordenar");
      }
    } catch (err) {
      console.error("Error reordenando TODOs con drag and drop:", err);
      setTodoError("No se pudo guardar el nuevo orden.");
      setTodos(prevTodos);
    }
  };

  const startEditingTodo = (todo: TodoItem) => {
    setEditingTodoId(todo.id);
    setEditingTitle(todo.title);
    setEditingDescription(todo.description ?? "");
    setTodoError(null);
  };

  const cancelEditingTodo = () => {
    setEditingTodoId(null);
    setEditingTitle("");
    setEditingDescription("");
  };

  const handleSaveTodo = async (id: number) => {
    const cleanTitle = editingTitle.trim();
    const cleanDescription = editingDescription.trim();

    if (!cleanTitle) {
      setTodoError("El título no puede estar vacío.");
      return;
    }

    setTodoError(null);
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          description: cleanDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo actualizar la tarea");
      }

      setTodos((prev) =>
        prev.map((item) => (item.id === id ? (data as TodoItem) : item))
      );
      cancelEditingTodo();
    } catch (err) {
      console.error("Error actualizando TODO:", err);
      setTodoError("No se pudo actualizar la tarea.");
    }
  };

  const handleDeleteTodo = async (id: number) => {
    const prevTodos = todos;
    setTodoError(null);
    setTodos((prev) => prev.filter((item) => item.id !== id));

    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo eliminar la tarea");
      }
      if (editingTodoId === id) {
        cancelEditingTodo();
      }
    } catch (err) {
      console.error("Error eliminando TODO:", err);
      setTodoError("No se pudo eliminar la tarea.");
      setTodos(prevTodos);
    }
  };

  const { pending: pendingTodos, completed: completedTodos } = sortTodos(todos);
  const visiblePendingTodos =
    pendingPriorityFilter === "all"
      ? pendingTodos
      : pendingTodos.filter((item) => item.priority === pendingPriorityFilter);

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <div className="mx-auto w-full max-w-5xl p-4 md:p-6 space-y-6">
        <div className="p-6 rounded-xl bg-slate-800 shadow-lg space-y-6">
          <h1 className="text-2xl font-bold text-center">
            Temporizador con registro en Supabase
          </h1>

          <div className="grid md:grid-cols-2 gap-6">
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
              <div className="text-center text-5xl font-mono">
                {formatTime(remainingSeconds)}
              </div>

              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleStart}
                  disabled={running}
                  className="px-4 py-2 rounded bg-green-600 disabled:opacity-50"
                >
                  Iniciar
                </button>
                <button
                  onClick={handleStop}
                  disabled={!running}
                  className="px-4 py-2 rounded bg-yellow-500 disabled:opacity-50"
                >
                  Pausar
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded bg-red-600"
                >
                  Reset
                </button>
              </div>

              <p className="text-xs text-center text-slate-400">
                Cada vez que presionas <b>Iniciar</b>, se guarda en Supabase: el
                día, los minutos configurados y la hora de ejecución.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">Últimos registros</h2>
                <button
                  onClick={cargarLogs}
                  className="text-xs px-2 py-1 rounded bg-slate-700"
                >
                  Actualizar
                </button>
              </div>

              {loadingLogs ? (
                <p className="text-sm text-slate-400">Cargando registros...</p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Aún no hay registros de temporizadores.
                </p>
              ) : (
                <div className="max-h-64 overflow-auto border border-slate-700 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="px-2 py-1 text-left">Fecha</th>
                        <th className="px-2 py-1 text-left">Hora</th>
                        <th className="px-2 py-1 text-right">Min</th>
                        <th className="px-2 py-1 text-left">Etiqueta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => {
                        const { date, time } = formatDateTime(log.executed_at);
                        return (
                          <tr
                            key={log.id}
                            className="odd:bg-slate-800 even:bg-slate-900"
                          >
                            <td className="px-2 py-1">{date}</td>
                            <td className="px-2 py-1">{time}</td>
                            <td className="px-2 py-1 text-right">
                              {log.configured_minutes}
                            </td>
                            <td className="px-2 py-1">{log.label || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <section className="p-6 rounded-xl bg-slate-800 shadow-lg space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Todo List</h2>
            <button
              onClick={cargarTodos}
              className="text-xs px-2 py-1 rounded bg-slate-700"
            >
              Actualizar
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
            <input
              type="text"
              value={todoTitle}
              onChange={(e) => setTodoTitle(e.target.value)}
              placeholder="Título de la tarea"
              className="rounded-md bg-slate-700 px-3 py-2 outline-none"
              maxLength={120}
            />
            <input
              type="text"
              value={todoDescription}
              onChange={(e) => setTodoDescription(e.target.value)}
              placeholder="Descripción (opcional)"
              className="rounded-md bg-slate-700 px-3 py-2 outline-none"
              maxLength={500}
            />
            <select
              value={todoPriority}
              onChange={(e) => setTodoPriority(Number(e.target.value))}
              className="rounded-md bg-slate-700 px-3 py-2 outline-none"
            >
              <option value={1}>Prioridad 1</option>
              <option value={2}>Prioridad 2</option>
              <option value={3}>Prioridad 3</option>
              <option value={4}>Prioridad 4</option>
              <option value={5}>Prioridad 5</option>
            </select>
            <button
              onClick={handleCreateTodo}
              disabled={submittingTodo}
              className="px-4 py-2 rounded bg-blue-600 disabled:opacity-50"
            >
              Crear
            </button>
          </div>

          {todoError ? <p className="text-sm text-red-300">{todoError}</p> : null}

          <div className="inline-flex rounded-lg bg-slate-900 p-1">
            <button
              onClick={() => setActiveTodoTab("pending")}
              className={`px-3 py-1.5 text-sm rounded-md ${
                activeTodoTab === "pending"
                  ? "bg-slate-700 text-white"
                  : "text-slate-300"
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setActiveTodoTab("completed")}
              className={`px-3 py-1.5 text-sm rounded-md ${
                activeTodoTab === "completed"
                  ? "bg-slate-700 text-white"
                  : "text-slate-300"
              }`}
            >
              Completadas
            </button>
          </div>

          {loadingTodos ? (
            <p className="text-sm text-slate-400">Cargando tareas...</p>
          ) : activeTodoTab === "pending" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">Pendientes</h3>
                <select
                  value={pendingPriorityFilter}
                  onChange={(e) =>
                    setPendingPriorityFilter(
                      e.target.value === "all"
                        ? "all"
                        : (Number(e.target.value) as 1 | 2 | 3 | 4 | 5)
                    )
                  }
                  className="rounded bg-slate-700 px-2 py-1 text-sm"
                >
                  <option value={1}>Solo P1</option>
                  <option value={2}>Solo P2</option>
                  <option value={3}>Solo P3</option>
                  <option value={4}>Solo P4</option>
                  <option value={5}>Solo P5</option>
                  <option value="all">Todas</option>
                </select>
              </div>
              {visiblePendingTodos.length === 0 ? (
                <p className="text-sm text-slate-400">No hay tareas pendientes.</p>
              ) : (
                visiblePendingTodos.map((todo) => {
                  const isEditing = editingTodoId === todo.id;
                  const isDragged = draggingTodoId === todo.id;
                  const isDropTarget = dropTargetTodoId === todo.id;

                  return (
                    <div
                      key={todo.id}
                      draggable={!isEditing}
                      onDragStart={() => handlePendingDragStart(todo.id)}
                      onDragOver={(event) => handlePendingDragOver(event, todo.id)}
                      onDrop={() => handlePendingDrop(todo.id)}
                      onDragEnd={handlePendingDragEnd}
                      className={`rounded-lg border bg-slate-900/60 p-3 transition ${
                        isDropTarget
                          ? "border-cyan-400"
                          : "border-slate-700"
                      } ${isDragged ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => handleToggleTodo(todo)}
                          className="mt-1 h-4 w-4"
                        />

                        <div className="flex-1 space-y-2">
                          {isEditing ? (
                            <>
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                className="w-full rounded-md bg-slate-700 px-3 py-2 outline-none"
                                maxLength={120}
                              />
                              <textarea
                                value={editingDescription}
                                onChange={(e) =>
                                  setEditingDescription(e.target.value)
                                }
                                className="w-full rounded-md bg-slate-700 px-3 py-2 outline-none"
                                rows={2}
                                maxLength={500}
                              />
                            </>
                          ) : (
                            <>
                              <p className="font-medium text-white">{todo.title}</p>
                              {todo.description ? (
                                <p className="text-sm text-slate-300">
                                  {todo.description}
                                </p>
                              ) : null}
                              <p className="text-xs text-slate-500">
                                Creada: {formatDateTime(todo.created_at).date}{" "}
                                {formatDateTime(todo.created_at).time}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          value={todo.priority}
                          onChange={(e) =>
                            handlePriorityChange(todo, Number(e.target.value))
                          }
                          className="rounded bg-slate-700 px-2 py-1 text-sm"
                          disabled={isEditing}
                        >
                          <option value={1}>P1</option>
                          <option value={2}>P2</option>
                          <option value={3}>P3</option>
                          <option value={4}>P4</option>
                          <option value={5}>P5</option>
                        </select>
                        <span className="text-xs text-slate-400">Arrastra para reordenar</span>

                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveTodo(todo.id)}
                              className="px-3 py-1 rounded bg-green-600 text-sm"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={cancelEditingTodo}
                              className="px-3 py-1 rounded bg-slate-600 text-sm"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditingTodo(todo)}
                              className="px-3 py-1 rounded bg-yellow-600 text-sm"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteTodo(todo.id)}
                              className="px-3 py-1 rounded bg-red-600 text-sm"
                            >
                              Borrar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold">Completadas</h3>
              {completedTodos.length === 0 ? (
                <p className="text-sm text-slate-400">No hay tareas completadas.</p>
              ) : (
                completedTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="rounded-lg border border-slate-700 bg-slate-900/60 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => handleToggleTodo(todo)}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="flex-1 space-y-1">
                        <p className="font-medium line-through text-slate-400">
                          {todo.title}
                        </p>
                        {todo.description ? (
                          <p className="text-sm text-slate-400">
                            {todo.description}
                          </p>
                        ) : null}
                        {todo.completed_at ? (
                          <p className="text-xs text-slate-500">
                            Completada: {formatDateTime(todo.completed_at).date}{" "}
                            {formatDateTime(todo.completed_at).time}
                          </p>
                        ) : null}
                      </div>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="px-3 py-1 rounded bg-red-600 text-sm"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
