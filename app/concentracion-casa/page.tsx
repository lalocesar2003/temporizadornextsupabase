"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useEffectEvent } from "react";
import { ArrowLeft, Clock3, History, Home } from "lucide-react";

type HomeFocusTimerLog = {
  id: number;
  configured_minutes: number;
  executed_at: string;
  created_at: string;
  label: string | null;
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

export default function ConcentracionCasaPage() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [label, setLabel] = useState("");
  const [minutes, setMinutes] = useState(1);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<HomeFocusTimerLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [targetTime, setTargetTime] = useState<number | null>(null);

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
      const res = await fetch("/api/home-focus-timers");
      if (!res.ok) {
        throw new Error("No se pudieron obtener los registros");
      }
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando logs de concentracion casa:", error);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    void cargarLogs();
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
      const res = await fetch("/api/home-focus-timers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configuredMinutes: minutes,
          executedAt: now.toISOString(),
          label,
        }),
      });

      if (!res.ok) {
        throw new Error("Error guardando concentracion casa");
      }

      await cargarLogs();
    } catch (error) {
      console.error("Error guardando concentracion casa:", error);
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

  const latestLog = logs[0] ?? null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/60 bg-emerald-950/40 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
                <Home className="h-3.5 w-3.5" />
                Temporizador hogar
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
                Concentracion casa
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
                Usa un temporizador separado para sesiones dentro de casa y guarda
                su historial sin mezclarlo con el temporizador general de concentracion.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al dashboard
            </Link>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30">
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Configuracion
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">
                  Sesion actual
                </h2>
              </div>

              <label className="block text-sm text-slate-300">
                Minutos
                <input
                  type="number"
                  min={1}
                  value={minutes}
                  onChange={(event) => setMinutes(Number(event.target.value))}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 outline-none"
                  disabled={running}
                />
              </label>

              <label className="block text-sm text-slate-300">
                Etiqueta
                <input
                  type="text"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Ej: limpieza, orden, lectura en casa..."
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 outline-none"
                  disabled={running}
                  maxLength={80}
                />
              </label>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 text-center">
                <div className="font-mono text-6xl tracking-tight text-slate-50">
                  {formatTime(remainingSeconds)}
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => void handleStart()}
                  disabled={running}
                  className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Iniciar
                </button>
                <button
                  onClick={handleStop}
                  disabled={!running}
                  className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Pausar
                </button>
                <button
                  onClick={handleReset}
                  className="rounded-2xl bg-rose-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-rose-400"
                >
                  Reset
                </button>
              </div>

              <p className="text-center text-xs text-slate-500">
                Cada vez que presionas <b>Iniciar</b>, se guarda en Supabase la
                fecha, la hora, los minutos configurados y la etiqueta de
                concentracion casa.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                  <History className="h-3.5 w-3.5" />
                  Ultimo registro
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Refresca este bloque cuando quieras confirmar el ultimo inicio
                  guardado de concentracion casa.
                </p>
              </div>
              <button
                onClick={() => void cargarLogs()}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Actualizar
              </button>
            </div>

            <div className="mt-6">
              {loadingLogs ? (
                <p className="text-sm text-slate-400">Cargando registros...</p>
              ) : !latestLog ? (
                <p className="text-sm text-slate-400">
                  Aun no hay registros de concentracion casa.
                </p>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Fecha
                      </p>
                      <p className="mt-1 text-slate-100">
                        {formatDateTime(latestLog.executed_at).date}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Hora
                      </p>
                      <p className="mt-1 text-slate-100">
                        {formatDateTime(latestLog.executed_at).time}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Min
                      </p>
                      <p className="mt-1 text-slate-100">
                        {latestLog.configured_minutes}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Etiqueta
                      </p>
                      <p className="mt-1 text-slate-100">
                        {latestLog.label || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
