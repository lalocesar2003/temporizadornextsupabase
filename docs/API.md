# Referencia API

Todas las escrituras reciben JSON con `Content-Type: application/json`. Las entradas pueden usar camelCase; los registros devueltos conservan snake_case de Supabase.

## Convenciones

GET de colecciones devuelve arreglos. POST devuelve el registro con estado 201; PATCH devuelve el registro con 200. Los errores controlados tienen forma `{ "error": "mensaje" }`, con 400 para validaciones y generalmente 500 para fallos de base de datos o procesamiento. No hay traducción general de registros ausentes a 404. JSON malformado suele producir 500 dentro de los bloques catch.

Las tareas y pasos requieren UUID admitidos por la expresión de versiones 1–5. Los IDs de notas, pendientes y Pomodoro son enteros positivos. Ninguna ruta comprueba sesión o propiedad.

## Tiempo

| Método y ruta | Contrato |
| --- | --- |
| GET `/api/timers` | Últimos 20 por created_at descendente |
| POST `/api/timers` | configuredMinutes, executedAt, label opcional |
| GET `/api/stopwatch` | Últimos 20 por created_at descendente |
| POST `/api/stopwatch` | startedAt, endedAt, durationSeconds, label obligatorio |
| POST `/api/pomodoro` | phase, durationMinutes, startedAt, cycleNumber |
| PATCH `/api/pomodoro/{id}` | completedAt |

Temporizador: rechaza duración ausente o menor/igual a cero y etiqueta de más de 80 caracteres. No exige rigurosamente tipo numérico ni valida executedAt.

Cronómetro: fechas parseables, duración entera no negativa y etiqueta obligatoria de hasta 120 caracteres tras recortar espacios. No comprueba coherencia entre duración y fechas ni que fin sea posterior a inicio.

Pomodoro: phase es focus/break; duración y ciclo son enteros positivos; fechas parseables. No hay GET de historial ni cancelación.

## Pensamientos y notas

| Método y ruta | Contrato |
| --- | --- |
| GET `/api/thoughts` | Últimos tres por creación descendente |
| POST `/api/thoughts` | content obligatorio, hasta 500 caracteres |
| GET `/api/notes` | Todas por updated_at descendente |
| POST `/api/notes` | content obligatorio hasta 3000; title opcional hasta 120 |
| PATCH `/api/notes/{id}` | Exige content; title omitido/vacío se sustituye por null |
| DELETE `/api/notes/{id}` | Responde `{ "ok": true }` |

Los textos se recortan antes de validar.

## Tareas y pasos

| Método y ruta | Contrato |
| --- | --- |
| GET `/api/tasks` | Todas por fecha y posición |
| POST `/api/tasks` | title obligatorio hasta 160; description opcional hasta 500; due_date opcional/null |
| PATCH `/api/tasks/{id}` | Uno o más de title, description, due_date |
| DELETE `/api/tasks/{id}` | `{ "success": true }` |
| PATCH `/api/tasks/reorder` | `{ "items": [{ "id": "UUID", "position": 1 }] }` |
| GET `/api/tasks/{id}/subtasks` | Pasos por creación ascendente |
| POST `/api/tasks/{id}/subtasks` | title obligatorio hasta 160; weight opcional |
| PATCH `/api/subtasks/{id}` | Uno o más de title, weight, completed |
| DELETE `/api/subtasks/{id}` | `{ "success": true }` |

Las tareas nuevas reciben max(position) + 1. La fecha prevista es YYYY-MM-DD, validada con Date.parse al agregar T00:00:00; no hay validación estricta de calendario.

Crear un paso usa peso 1 si se omite o no es número entero; enteros menores a 1 se rechazan. PATCH exige peso entero positivo. completed debe ser booleano; su cambio asigna fecha del servidor o null a completed_at.

Reordenar exige arreglo no vacío, IDs únicos y posiciones enteras positivas. No exige posiciones únicas ni confirma existencia de los IDs. Las actualizaciones paralelas no son transaccionales y pueden quedar parcialmente aplicadas.

El borrado de una tarea no elimina explícitamente sus pasos; depende del esquema remoto.

## Pendientes independientes

| Método y ruta | Contrato |
| --- | --- |
| GET `/api/todos` | Pendientes por prioridad ascendente, posición y creación; completados después por completed_at/updated_at descendente |
| POST `/api/todos` | title obligatorio hasta 120; description opcional hasta 500; priority opcional 1–5 |
| PATCH `/api/todos/{id}` | Uno o más de title, description, completed, priority, position |
| DELETE `/api/todos/{id}` | `{ "success": true }` |
| PATCH `/api/todos/reorder` | `{ "items": [{ "id": 1, "position": 1 }] }`; solo modifica pendientes |

Crear usa prioridad 3 si se omite o no es entero; enteros fuera de 1–5 se rechazan. PATCH exige prioridad entera 1–5 y posición entera positiva. Completar asigna completed_at; reabrir lo limpia y mueve al final. Reordenar tiene las mismas limitaciones de atomicidad que tareas.

## Ejemplo de creación

```json
{
  "title": "Documentar el proyecto",
  "description": "Revisar arquitectura y API",
  "due_date": "2026-12-01"
}
```

Enviar por POST a `/api/tasks`. Para crear un paso, enviar `{"title":"Revisar documentación","weight":3}` a `/api/tasks/{id}/subtasks`. Estas operaciones crean datos reales en el Supabase configurado; utilizar un entorno de desarrollo.
