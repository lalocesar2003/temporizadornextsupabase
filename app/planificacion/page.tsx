"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import {
  PLANNING_TIME_ZONE,
  getPlanningTodayKey,
  type DailyPlanningLog,
  type PlanningStatus,
  type RecentPlanningDay,
} from "@/lib/planning";

type RowState = {
  status: PlanningStatus;
  saving: boolean;
  error: string | null;
};

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

function formatRelativeLabel(dateKey: string, todayKey: string) {
  if (dateKey === todayKey) return "Hoy";

  const [year, month, day] = dateKey.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = todayKey.split("-").map(Number);
  const date = Date.UTC(year, month - 1, day);
  const today = Date.UTC(todayYear, todayMonth - 1, todayDay);
  const diffDays = Math.round((today - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "Ayer";
  return `Hace ${diffDays} dias`;
}

function statusButtonClasses(current: PlanningStatus, target: PlanningStatus) {
  const base = "rounded-full border px-3 py-1.5 text-xs font-medium transition";

  if (target === "pending") {
    return `${base} ${
      current === target
        ? "border-slate-500 bg-slate-700 text-slate-100"
        : "border-slate-700 bg-slate-900/70 text-slate-400 hover:border-slate-500 hover:text-slate-200"
    }`;
  }

  if (target === "completed") {
    return `${base} ${
      current === target
        ? "border-emerald-600 bg-emerald-500 text-slate-950"
        : "border-emerald-900 bg-emerald-950/40 text-emerald-300 hover:border-emerald-700"
    }`;
  }

  return `${base} ${
    current === target
      ? "border-rose-600 bg-rose-500 text-white"
      : "border-rose-900 bg-rose-950/30 text-rose-300 hover:border-rose-700"
  }`;
}

export default function PlanificacionPage() {
  const todayKey = useMemo(() => getPlanningTodayKey(), []);
  const [days, setDays] = useState<RecentPlanningDay[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadDays = async () => {
    setLoading(true);
    setPageError(null);

    try {
      const res = await fetch("/api/planning/recent?days=15");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo obtener la bitacora");
      }

      const nextDays = Array.isArray(data) ? (data as RecentPlanningDay[]) : [];
      setDays(nextDays);
      setRows(
        Object.fromEntries(
          nextDays.map((day) => [
            day.date,
            {
              status: day.status,
              saving: false,
              error: null,
            },
          ])
        )
      );
    } catch (error) {
      console.error("Error cargando planning:", error);
      setPageError("No se pudo cargar la bitacora de planificacion.");
      setDays([]);
      setRows({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDays();
  }, []);

  const saveRow = async (date: string, status: PlanningStatus) => {
    setRows((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        status,
        saving: true,
        error: null,
      },
    }));

    try {
      const res = await fetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryDate: date,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo guardar el estado");
      }

      const saved = data as DailyPlanningLog;

      setRows((prev) => ({
        ...prev,
        [date]: {
          status: saved.status,
          saving: false,
          error: null,
        },
      }));

      setDays((prev) =>
        prev.map((day) =>
          day.date === date
            ? {
                ...day,
                status: saved.status,
              }
            : day
        )
      );
    } catch (error) {
      console.error("Error guardando planning:", error);
      setRows((prev) => ({
        ...prev,
        [date]: {
          ...prev[date],
          saving: false,
          error: "No se pudo guardar este dia.",
        },
      }));
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-900/60 bg-cyan-950/40 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-cyan-300">
                <CalendarRange className="h-3.5 w-3.5" />
                Ritual diario
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
                Planificacion de 15 minutos
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
                Marca si planificaste tu dia durante 15 minutos. La regla es fija,
                asi que aqui solo registras si se hizo, si fallo o si aun esta
                pendiente.
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

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Ultimos 15 dias
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-100">
                Bitacora de planificacion
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Cada fila representa un unico check diario: ¿hiciste o no tus 15
                minutos de planificacion?
              </p>
            </div>
            <div className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-400">
              Zona horaria: {PLANNING_TIME_ZONE}
            </div>
          </div>

          {pageError ? (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{pageError}</p>
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm text-slate-400">
              Cargando bitacora...
            </div>
          ) : (
            <div className="space-y-3">
              {days.map((day) => {
                const row = rows[day.date];
                if (!row) return null;

                return (
                  <article
                    key={day.date}
                    className={`rounded-2xl border p-4 transition ${
                      row.status === "completed"
                        ? "border-emerald-900 bg-emerald-950/25"
                        : row.status === "failed"
                          ? "border-rose-900 bg-rose-950/20"
                          : "border-slate-800 bg-slate-950/60"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {formatRelativeLabel(day.date, todayKey)}
                        </p>
                        <h3 className="text-base font-medium text-slate-100">
                          {formatDateLabel(day.date)}
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => void saveRow(day.date, "pending")}
                          disabled={row.saving}
                          className={statusButtonClasses(row.status, "pending")}
                        >
                          Pendiente
                        </button>
                        <button
                          onClick={() => void saveRow(day.date, "completed")}
                          disabled={row.saving}
                          className={statusButtonClasses(row.status, "completed")}
                        >
                          Hecho
                        </button>
                        <button
                          onClick={() => void saveRow(day.date, "failed")}
                          disabled={row.saving}
                          className={statusButtonClasses(row.status, "failed")}
                        >
                          No hecho
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-sm">
                      {row.status === "completed" ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span className="text-emerald-300">
                            Ese dia si hiciste tus 15 minutos de planificacion.
                          </span>
                        </>
                      ) : row.status === "failed" ? (
                        <>
                          <AlertCircle className="h-4 w-4 text-rose-400" />
                          <span className="text-rose-300">
                            Ese dia no se completaron los 15 minutos.
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock3 className="h-4 w-4 text-slate-500" />
                          <span className="text-slate-400">
                            Aun no marcas el resultado de este dia.
                          </span>
                        </>
                      )}
                    </div>

                    {row.error ? (
                      <p className="mt-3 text-sm text-red-300">{row.error}</p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
