"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Sparkles,
} from "lucide-react";
import {
  HABITS_TIME_ZONE,
  getTimeZoneDateKey,
  isValidDateKey,
  type DailyFocusLog,
  type RecentHabitDay,
} from "@/lib/habits";

function formatLongDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

function formatDateChipLabel(dateKey: string, todayKey: string) {
  if (dateKey === todayKey) {
    return `Hoy, ${formatLongDateLabel(dateKey)}`;
  }

  return formatLongDateLabel(dateKey);
}

function formatRelativeLabel(dateKey: string, todayKey: string) {
  if (dateKey === todayKey) return "Hoy";

  const [year, month, day] = dateKey.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = todayKey.split("-").map(Number);
  const date = Date.UTC(year, month - 1, day);
  const today = Date.UTC(todayYear, todayMonth - 1, todayDay);
  const diffDays = Math.round((today - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "Ayer";
  if (diffDays > 1) return `Hace ${diffDays} dias`;
  return "Fecha";
}

function getStatusCardClasses(status: RecentHabitDay["status"]) {
  switch (status) {
    case "focused":
      return "border-emerald-800 bg-emerald-950/50 hover:border-emerald-600";
    case "missed":
      return "border-orange-900 bg-orange-950/30 hover:border-orange-700";
    default:
      return "border-slate-700 bg-slate-900/60 hover:border-slate-500";
  }
}

export default function HabitosPage() {
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const todayKey = useMemo(() => getTimeZoneDateKey(new Date(), HABITS_TIME_ZONE), []);

  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [focusedMinutes, setFocusedMinutes] = useState("0");
  const [didNotFocus, setDidNotFocus] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [currentRecord, setCurrentRecord] = useState<DailyFocusLog | null>(null);
  const [recentDays, setRecentDays] = useState<RecentHabitDay[]>([]);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const shouldAskReason =
    didNotFocus || Number.parseInt(focusedMinutes || "0", 10) === 0;
  const shouldShowNote =
    !didNotFocus && Number.parseInt(focusedMinutes || "0", 10) > 0;

  const loadRecentDays = async () => {
    setLoadingRecent(true);
    try {
      const res = await fetch("/api/habits/recent?days=7");
      if (!res.ok) {
        throw new Error("No se pudo obtener el historial");
      }

      const data = await res.json();
      setRecentDays(Array.isArray(data) ? (data as RecentHabitDay[]) : []);
    } catch (error) {
      console.error("Error cargando historial de habitos:", error);
      setRecentDays([]);
    } finally {
      setLoadingRecent(false);
    }
  };

  const loadRecord = async (dateKey: string) => {
    setLoadingRecord(true);
    setFormError(null);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/habits?date=${dateKey}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo obtener el registro");
      }

      const nextRecord = (data as DailyFocusLog | null) ?? null;
      setCurrentRecord(nextRecord);

      if (!nextRecord) {
        setFocusedMinutes("0");
        setDidNotFocus(false);
        setReason("");
        setNote("");
        return;
      }

      setFocusedMinutes(String(nextRecord.focused_minutes));
      setDidNotFocus(nextRecord.did_not_focus);
      setReason(nextRecord.reason ?? "");
      setNote(nextRecord.note ?? "");
    } catch (error) {
      console.error("Error cargando registro de habitos:", error);
      setCurrentRecord(null);
      setFocusedMinutes("0");
      setDidNotFocus(false);
      setReason("");
      setNote("");
      setFormError("No se pudo cargar el registro de la fecha seleccionada.");
    } finally {
      setLoadingRecord(false);
    }
  };

  useEffect(() => {
    void loadRecentDays();
  }, []);

  useEffect(() => {
    void loadRecord(selectedDate);
  }, [selectedDate]);

  const handlePreviousDay = () => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() - 1);
    setSelectedDate(getTimeZoneDateKey(date, "UTC"));
  };

  const handleNextDay = () => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + 1);
    const nextDate = getTimeZoneDateKey(date, "UTC");

    if (nextDate > todayKey) return;
    setSelectedDate(nextDate);
  };

  const handleMinutesChange = (value: string) => {
    const normalized = value.replace(/[^\d]/g, "");
    setFocusedMinutes(normalized === "" ? "0" : normalized);

    if (Number.parseInt(normalized || "0", 10) > 0) {
      setDidNotFocus(false);
      setReason("");
    }
  };

  const handleToggleDidNotFocus = (checked: boolean) => {
    setDidNotFocus(checked);
    if (checked) {
      setFocusedMinutes("0");
      setNote("");
      return;
    }

    setReason("");
  };

  const handleSave = async () => {
    const parsedMinutes = Number.parseInt(focusedMinutes || "0", 10);
    const normalizedMinutes = Number.isNaN(parsedMinutes) ? 0 : parsedMinutes;
    const cleanReason = reason.trim();
    const cleanNote = note.trim();

    if (!isValidDateKey(selectedDate)) {
      setFormError("La fecha seleccionada no es valida.");
      return;
    }

    if (selectedDate > todayKey) {
      setFormError("No puedes guardar registros en fechas futuras.");
      return;
    }

    if ((didNotFocus || normalizedMinutes === 0) && !cleanReason) {
      setFormError("Escribe una razon para entender que paso ese dia.");
      return;
    }

    setSavingRecord(true);
    setFormError(null);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryDate: selectedDate,
          focusedMinutes: normalizedMinutes,
          didNotFocus,
          reason: cleanReason,
          note: cleanNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo guardar el registro");
      }

      const savedRecord = data as DailyFocusLog;
      setCurrentRecord(savedRecord);
      setFocusedMinutes(String(savedRecord.focused_minutes));
      setDidNotFocus(savedRecord.did_not_focus);
      setReason(savedRecord.reason ?? "");
      setNote(savedRecord.note ?? "");
      setSaveMessage(
        currentRecord ? "Registro actualizado correctamente." : "Registro guardado correctamente."
      );
      await loadRecentDays();
    } catch (error) {
      console.error("Error guardando habito:", error);
      setFormError("No se pudo guardar el registro del dia.");
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-900/70 bg-cyan-950/50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                Seguimiento diario
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
                Habitos de concentracion
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
                Registra lo que lograste hoy o completa dias olvidados sin salir del
                mismo flujo. La pantalla esta pensada para editar rapido y revisar
                tus ultimos 7 dias.
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
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/25">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Selector de fecha
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-100">
                    {formatDateChipLabel(selectedDate, todayKey)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Puedes moverte por dias anteriores para completar o corregir un
                    registro olvidado.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousDay}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/70 text-slate-300 transition hover:border-slate-500 hover:text-white"
                    aria-label="Dia anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleNextDay}
                    disabled={selectedDate === todayKey}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/70 text-slate-300 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Dia siguiente"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-700 hover:text-white"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Elegir fecha
                  </button>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={selectedDate}
                    max={todayKey}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="sr-only"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/25">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Registro del dia
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-100">
                    {formatLongDateLabel(selectedDate)}
                  </h2>
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-400">
                  {currentRecord ? "Editable" : "Nuevo registro"}
                </div>
              </div>

              {loadingRecord ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">
                  Cargando informacion del dia...
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/65 p-5">
                      <label className="block text-sm font-medium text-slate-300">
                        Minutos de concentracion
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={focusedMinutes}
                        onChange={(event) => handleMinutesChange(event.target.value)}
                        className="mt-4 w-full border-none bg-transparent text-6xl font-semibold tracking-tight text-slate-50 outline-none placeholder:text-slate-700"
                        placeholder="0"
                      />
                      <p className="mt-3 text-sm text-slate-500">
                        Puedes registrar el tiempo exacto que recuerdes para esta fecha.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/65 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-200">
                            Ese dia no me concentre
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            Si activas esta opcion, el tiempo se llevara a cero y te
                            pediremos una breve reflexion.
                          </p>
                        </div>

                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={didNotFocus}
                            onChange={(event) =>
                              handleToggleDidNotFocus(event.target.checked)
                            }
                            className="peer sr-only"
                          />
                          <span className="h-7 w-12 rounded-full bg-slate-700 transition peer-checked:bg-orange-500" />
                          <span className="absolute left-1 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
                        </label>
                      </div>
                    </div>
                  </div>

                  {shouldAskReason ? (
                    <div className="rounded-2xl border border-orange-900/60 bg-orange-950/20 p-5">
                      <label className="block text-sm font-medium text-orange-100">
                        ¿Por que no pudiste hacerlo? Reflexiona sobre lo que paso
                      </label>
                      <textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        className="mt-3 min-h-36 w-full resize-none rounded-2xl border border-orange-900/60 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600"
                        placeholder="Describe lo que interrumpio tu concentracion, que aprendiste o que podrias cambiar la proxima vez..."
                        maxLength={700}
                      />
                    </div>
                  ) : null}

                  {shouldShowNote ? (
                    <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-5">
                      <label className="block text-sm font-medium text-emerald-100">
                        Nota rapida del dia
                      </label>
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        className="mt-3 min-h-28 w-full resize-none rounded-2xl border border-emerald-900/60 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600"
                        placeholder="Escribe que hiciste bien, que te funciono o algo que te convenga recordar despues..."
                        maxLength={500}
                      />
                    </div>
                  ) : null}

                  {formError ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-200">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>{formError}</p>
                    </div>
                  ) : null}

                  {saveMessage ? (
                    <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
                      {saveMessage}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">
                      Zona horaria de referencia: {HABITS_TIME_ZONE}
                    </p>
                    <button
                      onClick={() => void handleSave()}
                      disabled={savingRecord}
                      className="inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingRecord
                        ? "Guardando..."
                        : currentRecord
                          ? "Actualizar registro"
                          : "Guardar registro"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/25">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Dashboard de 7 dias
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">
                  Historial reciente
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Toca cualquier dia para cargarlo arriba y editarlo sin cambiar de
                  contexto.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {loadingRecent ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
                  Cargando historial...
                </div>
              ) : (
                recentDays.map((day) => (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDate(day.date)}
                    className={`group rounded-2xl border p-4 text-left transition ${getStatusCardClasses(
                      day.status
                    )} ${
                      selectedDate === day.date ? "ring-2 ring-cyan-400/70" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {formatRelativeLabel(day.date, todayKey)}
                        </p>
                        <h3 className="mt-1 text-base font-medium text-slate-100">
                          {formatLongDateLabel(day.date)}
                        </h3>
                      </div>

                      {day.status === "focused" ? (
                        <div className="rounded-full border border-emerald-800 bg-emerald-950 px-3 py-1 text-sm font-medium text-emerald-300">
                          {day.focusedMinutes} min
                        </div>
                      ) : day.status === "missed" ? (
                        <CircleAlert className="h-5 w-5 text-orange-300" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-slate-500" />
                      )}
                    </div>

                    <div className="mt-3 text-sm leading-6 text-slate-400">
                      {day.status === "focused" ? (
                        <p>
                          Buen avance. Haz click si quieres revisar o ajustar el tiempo
                          registrado.
                        </p>
                      ) : day.status === "missed" ? (
                        <p className="text-orange-100/85">
                          {day.reason || "Ese dia no hubo concentracion registrada."}
                        </p>
                      ) : (
                        <p className="text-slate-500">
                          Dia vacio. Puedes completarlo ahora desde esta misma pantalla.
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
