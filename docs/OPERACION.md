# Operación y hallazgos

## Producción

Se necesita un servidor compatible con Next.js y Route Handlers; la API no funciona únicamente con una exportación estática. Preparar el esquema Supabase, configurar ambas variables, instalar con npm ci, ejecutar lint/tipos/build e iniciar con npm start o un proveedor compatible.

El cliente verifica variables al importarse. Las fuentes Geist de next/font/google pueden requerir conexión durante la compilación. No hay configuración de CI ni despliegue específica versionada.

## Verificación manual propuesta

Esta guía no representa pruebas funcionales ejecutadas.

| Módulo | Verificación |
| --- | --- |
| Temporizador | Iniciar con etiqueta, revisar historial, detener y comprobar restauración; dejar finalizar para escuchar alarma |
| Cronómetro | Iniciar/detener y revisar duración; reiniciar una sesión activa y comprobar que no se guarda |
| Pomodoro | Usar fases cortas; comprobar creación, cierre, cambio manual de fase, pausa y reinicio |
| Pensamientos | Crear varios y comprobar que se consultan solo los tres últimos |
| Notas | Crear, editar, borrar y comprobar orden por actualización |
| Tareas | Crear con/sin fecha, editar, arrastrar y recargar |
| Pasos | Pesos 3 y 1: completar el primero debe mostrar 75 % |
| Borrado | Comprobar en desarrollo qué sucede con pasos al borrar una tarea |
| Pendientes API | Comprobar prioridad, completar, reabrir y reordenar con un cliente HTTP |
| Recarga | Comprobar persistencia de registros y pérdida de relojes activos |

## Hallazgos estáticos

| Relevancia | Hallazgo |
| --- | --- |
| Alta | Las API no comprueban sesión ni propiedad; utilizan cliente administrativo. Se necesita control de acceso antes de ofrecerlas públicamente. |
| Alta | Falta DDL/migraciones: un clon no permite reconstruir la base de datos sin información externa. |
| Media | Pomodoro reinicia duración tras pausar; reiniciar deja la sesión previa incompleta. |
| Media | completePomodoroSession no comprueba res.ok y limpia el ID incluso con error HTTP; el contador puede avanzar sin persistir el cierre. |
| Media | Reordenamientos sin transacción pueden aplicar cambios parciales. max(position) + 1 puede coincidir entre creaciones simultáneas. |
| Media | El comparador cliente retorna NaN para dos tareas sin fecha y puede omitir el desempate por posición. |
| Media | Temporizadores no validan estrictamente tipo de duración ni fecha. Cronómetro no valida coherencia de fechas/duración. |
| Media | Relojes en memoria: recargar o cerrar pierde seguimiento y no garantiza alarma. |
| Baja | Carga de pasos con una solicitud por tarea; notas y tareas sin paginación. |
| Baja | El documento conserva lang=en y metadatos de Create Next App aunque la interfaz esté en español. |
| Baja | No hay suite de pruebas automatizadas ni script de test. |

El análisis se basa en archivos locales; no se inspeccionaron políticas ni datos remotos. No se modificó el comportamiento de la aplicación.

## Diagnóstico

- Faltan variables: crear .env.local con los nombres exactos y reiniciar el servidor.
- Errores de lectura/escritura: revisar logs del servidor, tablas, columnas y permisos.
- Notas sin nuevo orden: comprobar que la base de datos mantenga updated_at.
- Borrado de tareas falla o deja pasos: revisar relación y política de eliminación.
- Alarma sin sonido: comprobar interacción inicial, estado de audio y suspensión de pestaña.
- Publicación con GitHub CLI falla: comprobar gh auth status y renovar con gh auth login; no guardar tokens en el repositorio.
