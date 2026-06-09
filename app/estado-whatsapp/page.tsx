"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Clapperboard,
  Plus,
  Trash2,
} from "lucide-react";
import {
  WHATSAPP_STATUS_TIME_ZONE,
  getWhatsappStatusTodayKey,
  type DailyWhatsappStatusLog,
  type RecentWhatsappStatusDay,
} from "@/lib/whatsappStatus";

type RowState = {
  completedItems: string[];
  draft: string;
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

export default function EstadoWhatsappPage() {
  const todayKey = useMemo(() => getWhatsappStatusTodayKey(), []);
  const [days, setDays] = useState<RecentWhatsappStatusDay[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadDays = async () => {
    setLoading(true);
    setPageError(null);

    try {
      const res = await fetch("/api/whatsapp-status/recent?days=15");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo obtener la bitacora");
      }

      const nextDays = Array.isArray(data)
        ? (data as RecentWhatsappStatusDay[])
        : [];
      setDays(nextDays);
      setRows(
        Object.fromEntries(
          nextDays.map((day) => [
            day.date,
            {
              completedItems: day.completedItems,
              draft: "",
              saving: false,
              error: null,
            },
          ])
        )
      );
    } catch (error) {
      console.error("Error cargando avance video:", error);
      setPageError("No se pudo cargar la bitacora de avance video.");
      setDays([]);
      setRows({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDays();
  }, []);

  const saveItems = async (date: string, completedItems: string[]) => {
    setRows((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        completedItems,
        saving: true,
        error: null,
      },
    }));

    try {
      const res = await fetch("/api/whatsapp-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryDate: date,
          completedItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo guardar el avance");
      }

      const saved = data as DailyWhatsappStatusLog;
      const nextItems = Array.isArray(saved.completed_items)
        ? saved.completed_items
        : [];

      setRows((prev) => ({
        ...prev,
        [date]: {
          ...prev[date],
          completedItems: nextItems,
          draft: "",
          saving: false,
          error: null,
        },
      }));

      setDays((prev) =>
        prev.map((day) =>
          day.date === date
            ? {
                ...day,
                completedItems: nextItems,
              }
            : day
        )
      );
    } catch (error) {
      console.error("Error guardando avance video:", error);
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

  const addProgress = async (date: string) => {
    const row = rows[date];
    if (!row) return;

    const nextValue = row.draft.trim();
    if (!nextValue) {
      setRows((prev) => ({
        ...prev,
        [date]: {
          ...prev[date],
          error: "Escribe un avance antes de agregarlo.",
        },
      }));
      return;
    }

    if (row.completedItems.includes(nextValue)) {
      setRows((prev) => ({
        ...prev,
        [date]: {
          ...prev[date],
          error: "Ese avance ya esta registrado en este dia.",
        },
      }));
      return;
    }

    await saveItems(date, [...row.completedItems, nextValue]);
  };

  const removeProgress = async (date: string, index: number) => {
    const row = rows[date];
    if (!row) return;

    const nextItems = row.completedItems.filter(
      (_, itemIndex) => itemIndex !== index
    );
    await saveItems(date, nextItems);
  };

  const updateDraft = (date: string, value: string) => {
    setRows((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        draft: value,
        error: null,
      },
    }));
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-900/60 bg-violet-950/40 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-violet-300">
                <Clapperboard className="h-3.5 w-3.5" />
                Meta minima
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
                Avance video
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
                Registra cualquier avance concreto que hayas logrado en el video.
                Si completas al menos uno, ese dia ya cuenta como cumplido.
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
                Bitacora de avance
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Puedes registrar cosas distintas cada dia. Con que uno se cumpla,
                el dia se considera exitoso.
              </p>
            </div>
            <div className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-400">
              Zona horaria: {WHATSAPP_STATUS_TIME_ZONE}
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
            <div className="space-y-4">
              {days.map((day) => {
                const row = rows[day.date];
                if (!row) return null;

                const isDone = row.completedItems.length > 0;

                return (
                  <article
                    key={day.date}
                    className={`rounded-2xl border p-4 transition ${
                      isDone
                        ? "border-emerald-900 bg-emerald-950/25"
                        : "border-rose-900 bg-rose-950/20"
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

                      <div className="text-sm">
                        {isDone ? (
                          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800 bg-emerald-950/50 px-3 py-1.5 text-emerald-300">
                            <CheckCircle2 className="h-4 w-4" />
                            Cumplido
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 rounded-full border border-rose-800 bg-rose-950/40 px-3 py-1.5 text-rose-300">
                            <CircleAlert className="h-4 w-4" />
                            Sin avances registrados
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        value={row.draft}
                        onChange={(event) =>
                          updateDraft(day.date, event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void addProgress(day.date);
                          }
                        }}
                        placeholder="Ej: grabar intro, editar 10 minutos, escribir guion..."
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-500"
                        disabled={row.saving}
                      />
                      <button
                        onClick={() => void addProgress(day.date)}
                        disabled={row.saving}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-700 bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar
                      </button>
                    </div>

                    {row.error ? (
                      <p className="mt-3 text-sm text-rose-300">{row.error}</p>
                    ) : null}

                    <div className="mt-4 space-y-2">
                      {row.completedItems.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-3 text-sm text-slate-500">
                          Aun no registras avances para este dia.
                        </p>
                      ) : (
                        row.completedItems.map((item, index) => (
                          <div
                            key={`${day.date}-${item}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-900/70 bg-emerald-950/35 px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                              <span className="text-sm text-emerald-100">
                                {item}
                              </span>
                            </div>
                            <button
                              onClick={() => void removeProgress(day.date, index)}
                              disabled={row.saving}
                              className="rounded-full border border-emerald-800/80 bg-emerald-950/40 p-2 text-emerald-300 transition hover:border-rose-700 hover:bg-rose-950/40 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label="Eliminar avance"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
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
