# Temporizador y productividad personal

Aplicación en español para gestionar temporizadores, cronómetro, Pomodoro, pensamientos, notas y tareas con pasos ponderados. Next.js sirve la interfaz y las rutas API; Supabase almacena los registros.

## Tecnología

Versiones declaradas: Next.js 16.0.10, React 19.2.0, Supabase JS ^2.87.0, TypeScript ^5 y Tailwind CSS ^4. Las versiones resueltas están en `package-lock.json`.

## Instalación

Requiere Node.js compatible con las dependencias, npm y un proyecto Supabase con el esquema esperado. El repositorio no fija una versión de Node ni incluye migraciones SQL.

```sh
git clone https://github.com/lalocesar2003/temporizadornextsupabase.git
cd temporizadornextsupabase
npm ci
```

Crear `.env.local` en la raíz:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
SUPABASE_SECRET_KEY=TU_CLAVE_SECRETA_DE_SERVIDOR
```

La clave secreta solo debe usarse en el servidor, sin prefijo `NEXT_PUBLIC_`. Los archivos `.env*` están ignorados por Git.

```sh
npm run dev
```

Abrir <http://localhost:3000>. Sin ambas variables, el cliente Supabase lanza un error al importarse.

## Comandos

| Comando | Función |
| --- | --- |
| `npm run dev` | Desarrollo |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Verificación de tipos tras instalar dependencias |
| `npm run build` | Compilación de producción |
| `npm start` | Ejecutar la compilación |

No hay script de pruebas automatizadas. La compilación requiere configurar las variables y puede necesitar conexión para descargar las fuentes Geist.

## Documentación

- [Arquitectura y funcionamiento](docs/ARQUITECTURA.md)
- [Referencia API](docs/API.md)
- [Modelo de datos](docs/BASE_DE_DATOS.md)
- [Operación y hallazgos](docs/OPERACION.md)

Documentación basada en el código local revisado el 3 de noviembre de 2026. No se inspeccionaron el esquema remoto de Supabase ni un despliegue activo.

## Acceso

Las rutas no comprueban autenticación ni propiedad de registros y utilizan un cliente administrativo. Quien alcance las rutas puede operar sobre los datos expuestos. Antes de ofrecer acceso público, implementar una política de acceso en el servidor.
