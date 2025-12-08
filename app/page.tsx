"use client";

import { useEffect, useState } from "react";

type TimerLog = {
  id: number;
  configured_minutes: number;
  executed_at: string;
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
  const [minutes, setMinutes] = useState<number>(1);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(60);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<TimerLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Actualizar segundos cuando cambian los minutos (si no está corriendo)
  useEffect(() => {
    if (!running) {
      setRemainingSeconds(minutes * 60);
    }
  }, [minutes, running]);

  // Lógica del temporizador
  useEffect(() => {
    if (!running) return;
    if (remainingSeconds <= 0) {
      setRunning(false);
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [running, remainingSeconds]);

  const cargarLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/timers");
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error("Error cargando logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    cargarLogs();
  }, []);

  const handleStart = async () => {
    if (minutes <= 0) return;

    const now = new Date();

    // 1. Arranca el temporizador
    setRemainingSeconds(minutes * 60);
    setRunning(true);

    // 2. Guarda en Supabase a través de la API
    try {
      await fetch("/api/timers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configuredMinutes: minutes,
          executedAt: now.toISOString(), // aquí va fecha y hora exacta
        }),
      });

      // recargar lista de logs
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
    setRemainingSeconds(minutes * 60);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="p-6 rounded-xl bg-slate-800 shadow-lg w-full max-w-2xl space-y-6">
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
    </main>
  );
}
