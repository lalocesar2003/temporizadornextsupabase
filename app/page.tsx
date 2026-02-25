"use client";

import { useEffect, useState } from "react";

type TimerLog = {
  id: number;
  configured_minutes: number;
  executed_at: string;
  created_at: string;
  label: string | null; // NUEVO (si lo dejaste nullable, usa: string )
};

type TodoItem = {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
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

export default function HomePage() {
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
  const [todoError, setTodoError] = useState<string | null>(null);
  const [submittingTodo, setSubmittingTodo] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  // Actualizar segundos cuando cambian los minutos (si no está corriendo)
  useEffect(() => {
    if (!running) {
      setRemainingSeconds(minutes * 60);
    }
  }, [minutes, running]);

  // Lógica del temporizador
  useEffect(() => {
    // Si no está corriendo o no hay hora objetivo, no hacemos nada
    if (!running || !targetTime) return;

    // Creamos un intervalo que se ejecuta aprox cada 1 segundo
    const interval = setInterval(() => {
      const now = Date.now(); // tiempo actual en ms
      const diffMs = targetTime - now; // cuánto falta en ms
      const diffSeconds = Math.max(0, Math.floor(diffMs / 1000)); // pasamos a segundos, nunca negativo

      setRemainingSeconds(diffSeconds); // actualizamos el display

      if (diffSeconds <= 0) {
        setRunning(false); // detenemos el timer
        clearInterval(interval); // limpiamos el intervalo
      }
    }, 1000);

    // Cleanup: si cambia `running` o `targetTime`, o el componente se desmonta,
    // se limpia este intervalo para que no queden intervalos viejos vivos.
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
      setTodos(Array.isArray(data) ? data : []);
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

    // 1. Configura el tiempo objetivo y arranca el timer
    setTargetTime(target);
    setRemainingSeconds(minutes * 60);
    setRunning(true);

    // 2. Guarda en Supabase vía API (igual que antes)
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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo crear la tarea");
      }

      setTodos((prev) => [data as TodoItem, ...prev]);
      setTodoTitle("");
      setTodoDescription("");
    } catch (err) {
      console.error("Error creando TODO:", err);
      setTodoError("No se pudo crear la tarea.");
    } finally {
      setSubmittingTodo(false);
    }
  };

  const handleToggleTodo = async (todo: TodoItem) => {
    const previousCompleted = todo.completed;
    setTodos((prev) =>
      prev.map((item) =>
        item.id === todo.id ? { ...item, completed: !item.completed } : item
      )
    );

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !previousCompleted }),
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
      setTodos((prev) =>
        prev.map((item) =>
          item.id === todo.id ? { ...item, completed: previousCompleted } : item
        )
      );
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

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <div className="mx-auto w-full max-w-5xl p-4 md:p-6 space-y-6">
        <div className="p-6 rounded-xl bg-slate-800 shadow-lg space-y-6">
          <h1 className="text-2xl font-bold text-center">
            Temporizador con registro en Supabase
          </h1>

          {/* Configuración y display del temporizador */}
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

            {/* Lista de últimos registros */}
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

          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
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
            <button
              onClick={handleCreateTodo}
              disabled={submittingTodo}
              className="px-4 py-2 rounded bg-blue-600 disabled:opacity-50"
            >
              Crear
            </button>
          </div>

          {todoError ? (
            <p className="text-sm text-red-300">{todoError}</p>
          ) : null}

          {loadingTodos ? (
            <p className="text-sm text-slate-400">Cargando tareas...</p>
          ) : todos.length === 0 ? (
            <p className="text-sm text-slate-400">No hay tareas todavía.</p>
          ) : (
            <div className="space-y-3">
              {todos.map((todo) => {
                const isEditing = editingTodoId === todo.id;
                return (
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
                            <p
                              className={`font-medium ${
                                todo.completed
                                  ? "line-through text-slate-400"
                                  : "text-white"
                              }`}
                            >
                              {todo.title}
                            </p>
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

                      <div className="flex gap-2">
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
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
