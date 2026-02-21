# NoteApp: Guía de Despliegue en Vercel (Node.js ESM)

Esta guía documenta las reglas críticas descubiertas para que el servidor de NoteApp funcione correctamente en Vercel. **Cualquier cambio en el servidor debe seguir estas reglas o el despliegue fallará con errores 500 o 504.**

## 1. Regla de Oro: Extensiones `.js` Obligatorias
Vercel utiliza el modo **ES Modules (ESM)** de Node.js de forma estricta. En este modo:
- **PROHIBIDO:** `import { foo } from './utils'`
- **OBLIGATORIO:** `import { foo } from './utils.js'`

**Importante:** Aunque el archivo original sea `.ts`, en el código de importación **debes usar siempre la extensión `.js`**. Esto es necesario para que el motor de resolución de Node en Vercel encuentre los archivos compilados correctamente.

## 2. Evitar Proxies en la Base de Datos
No utilices `Proxy` para envolver la conexión de la base de datos (`drizzle`). Los proxies pueden causar bloqueos de inicialización (Gateway Timeouts) en entornos Serverless.
- Usa el patrón de delegación simple implementado en `src/server/db/index.ts`.

## 3. Puente de API (`api/index.ts`)
El archivo `api/index.ts` actúa como el puente entre Vercel y la aplicación Hono.
- Si necesitas añadir rutas, hazlo preferiblemente dentro de `src/server/app.ts` y sus routers asociados.
- No cambies el manejador en `api/index.ts` a menos que sea estrictamente necesario; la configuración actual incluye un **timeout de seguridad** para evitar que las funciones se queden colgadas indefinidamente.

## 4. Middleware Pesado
Evita middlewares que realicen operaciones síncronas pesadas o que intenten escribir en `stdout`/`stderr` de forma constante (como `hono/logger`) en producción, ya que pueden afectar la estabilidad de la función serverless.

## 5. Variables de Entorno
Asegúrate de que estas variables estén siempre configuradas en el panel de Vercel:
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `NODE_ENV=production`

---
