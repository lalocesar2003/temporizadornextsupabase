"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useEffectEvent } from "react";
import { TaskCard } from "@/components/TaskCard";
import { sortTasksByDeadline, type Subtask, type Task } from "@/lib/taskTypes";

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

type Note = {
  id: number;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

type StopwatchLog = {
  id: number;
  label: string | null;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  created_at: string;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function formatDuration(seconds: number) {
  const totalSeconds = Math.max(0, seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const hh = h.toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
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
  const [stopwatchLabel, setStopwatchLabel] = useState("");
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchElapsedSeconds, setStopwatchElapsedSeconds] = useState(0);
  const [stopwatchStartTime, setStopwatchStartTime] = useState<number | null>(
    null
  );
  const [stopwatchStartedAtIso, setStopwatchStartedAtIso] = useState<string | null>(
    null
  );
  const [stopwatchLogs, setStopwatchLogs] = useState<StopwatchLog[]>([]);
  const [loadingStopwatchLogs, setLoadingStopwatchLogs] = useState(false);
  const [stopwatchError, setStopwatchError] = useState<string | null>(null);
  const [pomodoroWorkMinutes, setPomodoroWorkMinutes] = useState(25);
  const [pomodoroBreakMinutes, setPomodoroBreakMinutes] = useState(5);
  const [pomodoroPhase, setPomodoroPhase] = useState<"focus" | "break">("focus");
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroRemainingSeconds, setPomodoroRemainingSeconds] = useState(25 * 60);
  const [pomodoroTargetTime, setPomodoroTargetTime] = useState<number | null>(null);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [currentPomodoroSessionId, setCurrentPomodoroSessionId] = useState<
    number | null
  >(null);

  const [thoughts, setThoughts] = useState<ThoughtLog[]>([]);
  const [thoughtContent, setThoughtContent] = useState("");
  const [thoughtError, setThoughtError] = useState<string | null>(null);
  const [loadingThoughts, setLoadingThoughts] = useState(false);
  const [savingThought, setSavingThought] = useState(false);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState("");
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [savingNoteId, setSavingNoteId] = useState<number | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasksByTask, setSubtasksByTask] = useState<Record<string, Subtask[]>>(
    {}
  );
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
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
    if (pomodoroRunning) return;

    if (pomodoroPhase === "focus") {
      setPomodoroRemainingSeconds(pomodoroWorkMinutes * 60);
      return;
    }

    setPomodoroRemainingSeconds(pomodoroBreakMinutes * 60);
  }, [pomodoroBreakMinutes, pomodoroPhase, pomodoroRunning, pomodoroWorkMinutes]);

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

  useEffect(() => {
    if (!stopwatchRunning || !stopwatchStartTime) return;

    const interval = setInterval(() => {
      const diffSeconds = Math.max(
        0,
        Math.floor((Date.now() - stopwatchStartTime) / 1000)
      );
      setStopwatchElapsedSeconds(diffSeconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [stopwatchRunning, stopwatchStartTime]);

  useEffect(() => {
    if (!pomodoroRunning || !pomodoroTargetTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diffMs = pomodoroTargetTime - now;
      const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

      setPomodoroRemainingSeconds(diffSeconds);

      if (diffSeconds <= 0) {
        setPomodoroRunning(false);
        setPomodoroTargetTime(null);
        void playAlarm();
        void completePomodoroSession();

        if (pomodoroPhase === "focus") {
          setCompletedPomodoros((value) => value + 1);
          setPomodoroPhase("break");
          setPomodoroRemainingSeconds(pomodoroBreakMinutes * 60);
          return;
        }

        setPomodoroPhase("focus");
        setPomodoroRemainingSeconds(pomodoroWorkMinutes * 60);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    pomodoroBreakMinutes,
    pomodoroPhase,
    pomodoroRunning,
    pomodoroTargetTime,
    pomodoroWorkMinutes,
  ]);

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

  const cargarStopwatchLogs = async () => {
    setLoadingStopwatchLogs(true);
    setStopwatchError(null);

    try {
      const res = await fetch("/api/stopwatch");
      if (!res.ok) {
        throw new Error("No se pudieron obtener los registros del cronometro");
      }

      const data = await res.json();
      setStopwatchLogs(Array.isArray(data) ? (data as StopwatchLog[]) : []);
    } catch (error) {
      console.error("Error cargando stopwatch logs:", error);
      setStopwatchError("No se pudieron cargar los registros del cronometro.");
      setStopwatchLogs([]);
    } finally {
      setLoadingStopwatchLogs(false);
    }
  };

  const cargarNotes = async () => {
    setLoadingNotes(true);
    setNoteError(null);

    try {
      const res = await fetch("/api/notes");
      if (!res.ok) {
        throw new Error("No se pudieron obtener las notas");
      }

      const data = await res.json();
      setNotes(Array.isArray(data) ? (data as Note[]) : []);
    } catch (error) {
      console.error("Error cargando notes:", error);
      setNoteError("No se pudieron cargar las notas.");
      setNotes([]);
    } finally {
      setLoadingNotes(false);
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
      const nextTasks = Array.isArray(tasksData)
        ? sortTasksByDeadline(tasksData as Task[])
        : [];
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
    void cargarStopwatchLogs();
    void cargarNotes();
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

  const handleStopwatchStart = async () => {
    await ensureAudioContext();

    const startedAt = new Date();
    setStopwatchError(null);
    setStopwatchStartTime(startedAt.getTime());
    setStopwatchStartedAtIso(startedAt.toISOString());
    setStopwatchElapsedSeconds(0);
    setStopwatchRunning(true);
  };

  const handleStopwatchStop = async () => {
    if (!stopwatchRunning || !stopwatchStartTime || !stopwatchStartedAtIso) {
      return;
    }

    const endedAt = new Date();
    const durationSeconds = Math.max(
      0,
      Math.floor((endedAt.getTime() - stopwatchStartTime) / 1000)
    );

    setStopwatchRunning(false);
    setStopwatchElapsedSeconds(durationSeconds);
    setStopwatchStartTime(null);

    try {
      const res = await fetch("/api/stopwatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: stopwatchLabel,
          startedAt: stopwatchStartedAtIso,
          endedAt: endedAt.toISOString(),
          durationSeconds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo guardar el cronometro");
      }

      setStopwatchLabel("");
      setStopwatchStartedAtIso(null);
      await cargarStopwatchLogs();
    } catch (error) {
      console.error("Error guardando cronometro:", error);
      setStopwatchError("No se pudo guardar la sesion del cronometro.");
    }
  };

  const handleStopwatchReset = () => {
    setStopwatchRunning(false);
    setStopwatchElapsedSeconds(0);
    setStopwatchStartTime(null);
    setStopwatchStartedAtIso(null);
    setStopwatchError(null);
  };

  const completePomodoroSession = useEffectEvent(async () => {
    if (!currentPomodoroSessionId) return;

    try {
      await fetch(`/api/pomodoro/${currentPomodoroSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: new Date().toISOString() }),
      });
    } catch (error) {
      console.error("Error completando sesión pomodoro:", error);
    } finally {
      setCurrentPomodoroSessionId(null);
    }
  });

  const handlePomodoroStart = async () => {
    const phaseMinutes =
      pomodoroPhase === "focus" ? pomodoroWorkMinutes : pomodoroBreakMinutes;

    if (phaseMinutes <= 0) return;

    await ensureAudioContext();

    if (!currentPomodoroSessionId) {
      try {
        const startedAt = new Date().toISOString();
        const res = await fetch("/api/pomodoro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phase: pomodoroPhase,
            durationMinutes: phaseMinutes,
            startedAt,
            cycleNumber: completedPomodoros + 1,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "No se pudo crear la sesión pomodoro");
        }

        if (typeof data?.id === "number") {
          setCurrentPomodoroSessionId(data.id);
        }
      } catch (error) {
        console.error("Error creando sesión pomodoro:", error);
        return;
      }
    }

    setPomodoroTargetTime(Date.now() + phaseMinutes * 60 * 1000);
    setPomodoroRemainingSeconds(phaseMinutes * 60);
    setPomodoroRunning(true);
  };

  const handlePomodoroPause = () => {
    setPomodoroRunning(false);
    setPomodoroTargetTime(null);
  };

  const handlePomodoroReset = () => {
    setPomodoroRunning(false);
    setPomodoroTargetTime(null);
    setPomodoroPhase("focus");
    setPomodoroRemainingSeconds(pomodoroWorkMinutes * 60);
    setCompletedPomodoros(0);
    setCurrentPomodoroSessionId(null);
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

  const resetNoteEditor = () => {
    setEditingNoteId(null);
    setEditingNoteTitle("");
    setEditingNoteContent("");
  };

  const handleCreateNote = async () => {
    const cleanTitle = noteTitle.trim();
    const cleanContent = noteContent.trim();

    if (!cleanContent) {
      setNoteError("El contenido de la nota es obligatorio.");
      return;
    }

    setSubmittingNote(true);
    setNoteError(null);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          content: cleanContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo crear la nota");
      }

      setNoteTitle("");
      setNoteContent("");
      await cargarNotes();
    } catch (error) {
      console.error("Error creando note:", error);
      setNoteError("No se pudo crear la nota.");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleStartEditingNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingNoteTitle(note.title ?? "");
    setEditingNoteContent(note.content);
    setNoteError(null);
  };

  const handleSaveNote = async (noteId: number) => {
    const cleanTitle = editingNoteTitle.trim();
    const cleanContent = editingNoteContent.trim();

    if (!cleanContent) {
      setNoteError("El contenido de la nota es obligatorio.");
      return;
    }

    setSavingNoteId(noteId);
    setNoteError(null);

    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          content: cleanContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo actualizar la nota");
      }

      resetNoteEditor();
      await cargarNotes();
    } catch (error) {
      console.error("Error actualizando note:", error);
      setNoteError("No se pudo actualizar la nota.");
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    setNoteError(null);

    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo eliminar la nota");
      }

      if (editingNoteId === noteId) {
        resetNoteEditor();
      }
      await cargarNotes();
    } catch (error) {
      console.error("Error eliminando note:", error);
      setNoteError("No se pudo eliminar la nota.");
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
          due_date: newTaskDueDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo crear la tarea");
      }

      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDueDate("");
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
    const dragged = tasks.find((task) => task.id === draggingTaskId);
    const target = tasks.find((task) => task.id === targetTaskId);
    if (!dragged || !target || dragged.due_date !== target.due_date) return;
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
    const dragged = tasks.find((task) => task.id === draggingTaskId);
    const target = tasks.find((task) => task.id === targetTaskId);

    if (
      draggedIndex === -1 ||
      targetIndex === -1 ||
      !dragged ||
      !target ||
      dragged.due_date !== target.due_date
    ) {
      handleTaskDragEnd();
      return;
    }

    const reordered = [...tasks];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const normalized = sortTasksByDeadline(
      reordered.map((task, index) => ({
        ...task,
        position: index + 1,
      }))
    );
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
              <h2 className="text-xl font-bold">Cronometro</h2>
              <p className="mt-1 text-sm text-slate-400">
                Cuenta hacia arriba y guarda el resultado cuando detienes la
                sesion.
              </p>
            </div>
            <button
              onClick={() => void cargarStopwatchLogs()}
              className="rounded bg-slate-700 px-2 py-1 text-xs"
            >
              Actualizar
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <label className="block text-sm">
                Etiqueta:
                <input
                  type="text"
                  value={stopwatchLabel}
                  onChange={(event) => setStopwatchLabel(event.target.value)}
                  placeholder="Ej: lectura, cardio, revision..."
                  className="mt-1 w-full rounded-md bg-slate-700 px-3 py-2 outline-none"
                  disabled={stopwatchRunning}
                  maxLength={120}
                />
              </label>

              <div className="text-center font-mono text-5xl">
                {formatDuration(stopwatchElapsedSeconds)}
              </div>

              <div className="flex justify-center gap-2">
                <button
                  onClick={() => void handleStopwatchStart()}
                  disabled={stopwatchRunning}
                  className="rounded bg-emerald-600 px-4 py-2 disabled:opacity-50"
                >
                  Iniciar
                </button>
                <button
                  onClick={() => void handleStopwatchStop()}
                  disabled={!stopwatchRunning}
                  className="rounded bg-amber-500 px-4 py-2 text-slate-950 disabled:opacity-50"
                >
                  Detener y guardar
                </button>
                <button
                  onClick={handleStopwatchReset}
                  className="rounded bg-red-600 px-4 py-2"
                >
                  Reset
                </button>
              </div>

              {stopwatchError ? (
                <p className="text-sm text-red-300">{stopwatchError}</p>
              ) : null}
            </div>

            <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">
                  Ultimos registros
                </h3>
                <span className="text-xs text-slate-500">
                  {stopwatchRunning ? "corriendo" : "en pausa"}
                </span>
              </div>

              {loadingStopwatchLogs ? (
                <p className="text-sm text-slate-400">
                  Cargando registros del cronometro...
                </p>
              ) : stopwatchLogs.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Aun no hay sesiones guardadas.
                </p>
              ) : (
                <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {stopwatchLogs.map((log) => (
                    <li
                      key={log.id}
                      className="rounded-lg border border-slate-700 bg-slate-950/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-100">
                            {log.label || "Sesion sin etiqueta"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDateTime(log.started_at).date}{" "}
                            {formatDateTime(log.started_at).time}
                          </p>
                        </div>
                        <span className="rounded bg-emerald-950 px-2 py-1 text-xs font-medium text-emerald-300">
                          {formatDuration(log.duration_seconds)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-5 rounded-xl bg-slate-800 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Notas</h2>
              <p className="mt-1 text-sm text-slate-400">
                Un bloque rapido para guardar texto mas estable que un pensamiento
                suelto.
              </p>
            </div>
            <button
              onClick={() => void cargarNotes()}
              className="rounded bg-slate-700 px-2 py-1 text-xs"
            >
              Actualizar
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <h3 className="text-sm font-semibold text-slate-200">Nueva nota</h3>
              <input
                type="text"
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Titulo opcional..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none"
                maxLength={120}
              />
              <textarea
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="Escribe la nota..."
                className="min-h-40 w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none"
                maxLength={3000}
              />
              {noteError ? <p className="text-sm text-red-300">{noteError}</p> : null}
              <div className="flex justify-end">
                <button
                  onClick={() => void handleCreateNote()}
                  disabled={submittingNote}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Guardar nota
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">Tus notas</h3>
              {loadingNotes ? (
                <p className="text-sm text-slate-400">Cargando notas...</p>
              ) : notes.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Aun no hay notas guardadas.
                </p>
              ) : (
                <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                  {notes.map((note) => {
                    const isEditing = editingNoteId === note.id;
                    const isSaving = savingNoteId === note.id;

                    return (
                      <article
                        key={note.id}
                        className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editingNoteTitle}
                              onChange={(event) =>
                                setEditingNoteTitle(event.target.value)
                              }
                              placeholder="Titulo opcional..."
                              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none"
                              maxLength={120}
                            />
                            <textarea
                              value={editingNoteContent}
                              onChange={(event) =>
                                setEditingNoteContent(event.target.value)
                              }
                              className="min-h-32 w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none"
                              maxLength={3000}
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={resetNoteEditor}
                                disabled={isSaving}
                                className="px-3 py-1 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => void handleSaveNote(note.id)}
                                disabled={isSaving}
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-sm text-white disabled:opacity-50"
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-2">
                                <h4 className="text-base font-semibold text-slate-100">
                                  {note.title || "Nota sin titulo"}
                                </h4>
                                <p className="whitespace-pre-wrap text-sm text-slate-300">
                                  {note.content}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <button
                                  onClick={() => handleStartEditingNote(note)}
                                  className="rounded-lg px-2 py-1 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => void handleDeleteNote(note.id)}
                                  className="rounded-lg px-2 py-1 text-sm text-slate-400 transition-colors hover:bg-red-950 hover:text-red-300"
                                >
                                  Borrar
                                </button>
                              </div>
                            </div>
                            <p className="mt-3 text-xs text-slate-500">
                              Actualizada: {formatDateTime(note.updated_at).date}{" "}
                              {formatDateTime(note.updated_at).time}
                            </p>
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-5 rounded-xl bg-slate-800 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Pomodoro</h2>
              <p className="mt-1 text-sm text-slate-400">
                Una seccion separada para ciclos de enfoque y descanso.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                pomodoroPhase === "focus"
                  ? "bg-cyan-950 text-cyan-300"
                  : "bg-emerald-950 text-emerald-300"
              }`}
            >
              {pomodoroPhase === "focus" ? "Enfoque" : "Descanso"}
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  Minutos de enfoque
                  <input
                    type="number"
                    min={1}
                    value={pomodoroWorkMinutes}
                    onChange={(e) =>
                      setPomodoroWorkMinutes(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="mt-1 w-full rounded-md bg-slate-700 px-3 py-2 outline-none"
                    disabled={pomodoroRunning}
                  />
                </label>
                <label className="block text-sm">
                  Minutos de descanso
                  <input
                    type="number"
                    min={1}
                    value={pomodoroBreakMinutes}
                    onChange={(e) =>
                      setPomodoroBreakMinutes(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="mt-1 w-full rounded-md bg-slate-700 px-3 py-2 outline-none"
                    disabled={pomodoroRunning}
                  />
                </label>
              </div>

              <div className="text-center font-mono text-5xl">
                {formatTime(pomodoroRemainingSeconds)}
              </div>

              <div className="flex justify-center gap-2">
                <button
                  onClick={() => void handlePomodoroStart()}
                  disabled={pomodoroRunning}
                  className="rounded bg-cyan-600 px-4 py-2 disabled:opacity-50"
                >
                  Iniciar
                </button>
                <button
                  onClick={handlePomodoroPause}
                  disabled={!pomodoroRunning}
                  className="rounded bg-yellow-500 px-4 py-2 disabled:opacity-50"
                >
                  Pausar
                </button>
                <button
                  onClick={handlePomodoroReset}
                  className="rounded bg-red-600 px-4 py-2"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
              <h3 className="text-sm font-semibold text-slate-300">
                Estado del ciclo
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Fase actual
                  </p>
                  <p>{pomodoroPhase === "focus" ? "Enfoque" : "Descanso"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Pomodoros completados
                  </p>
                  <p>{completedPomodoros}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Proxima fase
                  </p>
                  <p>{pomodoroPhase === "focus" ? "Descanso" : "Enfoque"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Estado
                  </p>
                  <p>{pomodoroRunning ? "Corriendo" : "En pausa"}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Cuando termina una fase, suena la alarma y el sistema cambia a la
                siguiente automaticamente.
              </p>
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
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsCreatingTask(false);
                    setNewTaskTitle("");
                    setNewTaskDescription("");
                    setNewTaskDueDate("");
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
              Arrastra las tareas grandes para reordenarlas dentro del mismo
              grupo de fecha limite.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
