# BRIEF DE IMPLEMENTACIÓN — 02 MAESTROS Y SERVICIOS DEL NÚCLEO (núcleo 1b)

**Repositorio:** `Cryptobal/opai-2` · **Rama:** `brief/02-maestros-y-servicios` (desde `main` @ `914f363`) · **Fecha:** 23-oct-2026 · **Depende de:** Briefs 01 y 01c ejecutados y verificados (`ESTADO.md`) · **Diseño:** `docs/2.0/design/DESIGN-PROMPT-maestros-y-configuracion.md` → export aprobado en `docs/2.0/design/export-maestros/` (bloques 10 a 12 lo exigen) · **Extracción:** `docs/2.0/extraccion/maestros.md`, `integraciones-y-configuracion-por-tenant.md`, `dt-normativa.md`

> **Ejecución (ADR-035):** Claude ejecuta este brief desde el chat del proyecto en la rama `brief/02-maestros-y-servicios`, en **cuatro sesiones** (A: bloques 0–4, B: 5–9, C: 10–12, D: 13–15), con un commit por bloque y el gate en verde, revisión del diff por un subagente independiente, PR e integración a `main` por rebase cuando CI pasa. Las sesiones A y B no necesitan el diseño; la C exige el export aprobado de Claude Design (se detiene si no existe); la D crea infraestructura y aplica la migración en `main`: prepara todo y **se detiene** antes de cada acción de alto impacto para que Carlos la apruebe (CLIs del Mac o conector de Vercel) y para la verificación guiada. Si el entorno del chat no tiene base de datos, `pnpm test:db` lo cubre CI en el PR.

---

## 1. Objetivo

Completar el núcleo para que los módulos vendibles (Comercial y CPQ en la fase 2) tengan sobre qué construir:

- **Maestros únicos** del núcleo: cuentas, contactos, instalaciones, puestos de servicio, personas, vínculos laborales, cargos y estructuras de sueldo en tres niveles (ADR-005), con pantallas premium en el ERP, API `/api/v1` y MCP con los mismos permisos, auditoría y `dryRun`.
- **Documentos** como servicio (`core.documentos`, ADR-019): archivos en R2 con URLs firmadas, tipos por capa, vigencias, versiones, vínculos polimórficos y ficha de documentos en cuentas, instalaciones y personas; integridad registrada en la bitácora encadenada.
- **Servicios del núcleo** (ADR-008, ADR-018, ADR-020, ADR-027, ADR-029, ADR-031, ADR-032): configuración declarativa por ámbitos y un solo centro de Configuración; perfil de empresa y marca; comunicaciones con plantillas por evento, ruteo con silencio por defecto e inbox in-app; eventos de dominio por outbox y tabla de trabajos con cron; catálogo de integraciones con almacén de secretos cifrado (correo, geolocalización, IA con clases de tarea y BYOK); medidor de consumos `core.consumos` (reemplaza `usage_events`); presupuesto por API key, autonomía por capacidad y cola de aprobaciones; principal de la key y `portales` en las capacidades (ADR-033); primitivas reguladas (bitácora append-only y comprobantes, ADR-023); previews por PR con rama Neon efímera.
- **Rendimiento medido**: presupuesto de JavaScript por ruta con gate en CI; `/login` baja de 170 KB a ≤ 152 KB gzip (≤ 140 KB tras la sesión C); el ERP se mantiene bajo 165 KB por ruta.
- **DS 2.0** sobre primitivas Radix (ADR-017): reemplazo de `Menu`, `Dialog`, `Switch` y del `<select>` del selector de portal; componentes nuevos (Select, Combobox, paleta ⌘K, Popover, Tooltip, Checkbox, RadioGroup, Toast, FilaSeleccionable, InputFecha, Uploader, CampoSecreto, CampoDireccion, MapaEstatico, Timeline, Vigencia, AjustesForm) y el patrón `SplitScreen`; regla de ESLint en error en la app.
- Primer manual para agentes: `docs/2.0/agentes/operar-el-nucleo.md`, publicado como recurso del MCP.

Fuera de este brief: Comercial, CPQ, módulo Documentos (explorador, editor, plantillas, firma), flujo de caja y todo Finanzas, portales (fase 3), webhooks salientes, importación desde 1.0 (fase 2), roles personalizados.

## 2. Estado actual del repo (verificado)

Verificado sobre `main` @ `914f363` (23-oct-2026, "docs: ajustes de la revisión de ADR-035") con el gate en verde (169 tests).

- **Brief 01c** (ADR-034) ejecutado: `defineCapability` rechaza descripciones de menos de 40 caracteres (`DESCRIPCION_MINIMA`); `CLAUDE.md`, `CONTEXTO-agentes.md` y `agentes/README.md` exigen campos externos marcados, `interna` con razón, una key por agente y un escenario de prueba por manual. **ADR-035** cambia la forma de trabajo: los briefs se ejecutan desde el chat del proyecto en rama `brief/NN-<nombre>` con PR y rebase; nunca push directo a `main`. Los ADR nuevos de este brief son, por tanto, **ADR-036 a ADR-039**.
- **Identidad y plataforma** (Brief 01) completos: Better Auth 1.7.12, `memberships` con RLS, roles ADR-016 en `@opai/domain`, 27 capacidades `core.*`/`platform.*`, MCP en `/api/mcp`, `resolverActor`, shell real, Configuración con tres entradas separadas (`/configuracion/{usuarios,api-keys,empresa}`; `/configuracion` redirige a usuarios), Plataforma.
- **Esquemas Prisma** en `packages/db/prisma/schema/`: `core.prisma` (`Tenant`, `AuditEvent`), `identidad.prisma` (Better Auth), `tenancy.prisma` (`Membership`, `Invitation`, `TenantModule`, `ApiKey`, `UsageEvent`). Dos migraciones aplicadas en Neon `main` y `dev`. `forTenant` envuelve cada operación en `$transaction([set_config, query])`: **no hay forma de ejecutar varias escrituras en una sola transacción con tenant fijado**; hace falta para el outbox.
- **`packages/capabilities`**: `Contexto` con `db`, `auditoria`, `telemetria`, `servicios` (`correo`, `urlBase`), `plataforma`; `executeCapability` valida, autoriza (tenant, módulo, scopes, permiso), audita escrituras y mide toda ejecución en `usage_events`. `ModuleManifest.configuracion` es un `z.ZodType` sin metadatos: nada lo renderiza. `herramientasMcp` deriva herramientas y `preview_`. No existe noción de transacción, eventos, trabajos, aprobaciones, consumos ni `portales` en `Capacidad`.
- **`packages/domain`**: dinero (CLP enteros, `PCT_ESCALA`, `UF_ESCALA`, IVA), permisos, vocabulario. No hay RUT, teléfono, estructuras ni vigencias.
- **`packages/integrations`**: solo `email` (Resend/consola). Sin R2, geolocalización, IA ni secretos.
- **`packages/ds`**: tokens aprobados (ADR-014), componentes base propios; `Menu`, `Dialog`, `Sheet` sobre `<dialog>` nativo, `Switch` propio, `PortalSwitcher` con `<select>` nativo, `Tabs` con `useState`; `ListScreen` renderiza `<button onClick>` por fila (exige cliente); sin `sideEffects` en `package.json`. `apps/web/eslint.config.mjs` tiene la regla de elementos crudos en **warn** para `app/**`.
- **Correos** de invitación y recuperación están cableados en `packages/capabilities/src/core/invitar.ts` y `packages/auth/src/auth.ts` (texto plano). No hay plantillas ni notificaciones in-app (`notificaciones` del shell es un número fijo).
- **Rendimiento (medido con `next build` de producción en este commit, gzip de los chunks JS del cliente según `.next/build-manifest.json` + `page_client-reference-manifest.js`, excluido el polyfill `noModule` que los navegadores modernos no descargan):**

  | Ruta | Total | Sobre el framework | Composición del exceso |
  |---|---|---|---|
  | framework (`rootMainFiles`: React DOM, router, RSC client, runtime) | 129,2 KB | — | base de Next 16.4 + React 19.3 con Cache Components |
  | `/login` | 170,2 KB | +41,0 | cliente de better-auth 12,3 · barrel completo de `@opai/ds` 18,8 (incluye `PlanillaScreen`, shell…) · login 6,3 · layout 3,5 |
  | `/` (ERP) | 171,3 KB | +42,0 | better-auth 12,3 · DS 18,8 · shell 7,4 · layout 3,5 |
  | `/configuracion/usuarios` | 174,6 KB | +45,3 | better-auth 12,3 · DS 18,8 · pantalla 10,7 · layout 3,5 |

  Los 216 KB que midió Carlos incluyen el polyfill (39,5 KB, `noModule`). El exceso real y evitable está en dos cosas: el cliente de Better Auth (se puede eliminar del bundle usando Server Actions) y el barrel del DS sin `sideEffects` (Turbopack conserva todo el paquete).
- **Infra**: Vercel `opai-2` (`gard-security`), Neon `opai-2` (`main`, `dev`), `test.opai.cl`, Resend con dominio verificado, Google OAuth. Sin R2, sin crons, sin previews por PR, sin `CRON_SECRET`.

## 3. Alcance

### Incluido

- Bloques 0 a 15 de la sección 11, en cuatro sesiones.
- Modelo de datos de la sección 6 con migración aditiva, RLS y triggers de la bitácora.
- Capacidades de la sección 7 con tests; MCP y `/api/v1` derivados.
- Pantallas de la sección 8 según el export aprobado; centro de Configuración con migración de Empresa, Usuarios y API keys.
- Infraestructura: bucket R2 con CORS, variables, crons de Vercel, workflow de previews por PR, migración y seeds en `main`.
- ADR-036 a ADR-039, `ESTADO.md`, `CLAUDE.md`, `CONTEXTO-agentes.md`, `.env.example`, `docs/2.0/agentes/operar-el-nucleo.md`.

### Excluido (briefs siguientes)

- Comercial, CPQ y el módulo Documentos (explorador, editor enriquecido, plantillas de documento, firma): fase 2.
- Importación de maestros desde 1.0: fase 2 (este brief deja `core.ids_externos` para el mapeo).
- Webhooks salientes firmados y suscripciones MCP a eventos (ADR-032 "reactivo"): Brief 03, sobre el outbox que aquí nace.
- Alcance de datos por supervisor/cliente/trabajador (ADR-022): fase 3, con las asignaciones de Operaciones; aquí las capacidades declaran `portales` y el `Contexto` lleva `principal`.
- Portal Cliente emitiendo keys de cuenta (ADR-033): fase 3; aquí queda el modelo.
- Previsión, cuentas bancarias, anticipos, tallas (Nómina/Operaciones), PIN, Face ID y jornada (Asistencia/Portales).
- WhatsApp, push, DTE, banco, factoring, biometría, Slack: aparecen en el catálogo de integraciones como "próximamente", sin adaptador.
- Editor visual de correos con bloques y asistente de IA (ADR-028): brief propio; aquí plantillas de texto con variables y vista previa.
- Sentry y la CSP: ver sección 15.

## 4. Arquitectura relevante

Lo que fija este brief y los módulos heredan:

1. **Transacción con tenant fijado** (`packages/db/src/transaccion.ts`): `enTransaccion(tenantId, fn)` abre `clienteApp().$transaction(async (tx) => { set_config('app.tenant_id', id, true); return fn(tx) })`. Dentro, `tx` (`TenantTx`) es un cliente plano con el tenant fijado para toda la transacción (la política RLS lee `current_setting`, que es local a la transacción). El `Contexto` gana `transaccion(fn)`. Toda capacidad que escribe **y emite evento** usa `ctx.transaccion` y `ctx.eventos.emitir(tx, …)` en la misma transacción (ADR-029). Las escrituras simples pueden seguir usando `ctx.db`.
2. **Eventos de dominio y outbox**: `core.eventos` es el outbox. Un evento es `{ tipo: "<modulo>.<evento>", entidad, payload, actor }`. El catálogo de eventos sale de los manifests (`eventos`) y del núcleo (`EVENTOS_CORE`). Un trabajo `core.eventos.despachar` (cada 5 minutos y además encolado tras cada escritura) entrega cada evento a los **consumidores registrados** (`defineConsumidor({ evento, id, handler })`) con idempotencia por `(evento_id, consumidor)`; en este brief los consumidores son Comunicaciones (ruteo) y Consumos (umbrales). Los módulos nunca se importan entre sí: se suscriben a eventos.
3. **Trabajos** (`core.trabajos`): `defineTrabajo({ tipo, handler })` en el registro; `encolar(tx|db, { tipo, payload, programadoPara, claveUnica })`. Runner `GET /api/cron/trabajos` (Vercel cron cada 5 minutos, `Authorization: Bearer ${CRON_SECRET}`): por cada tenant activo (`listarTenants()`, tabla sin RLS) reclama hasta N trabajos vencidos con `UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED)` dentro de `enTransaccion`, ejecuta con límite de tiempo y marca `hecho`/`fallido` con reintentos exponenciales (`maxIntentos` 5). Un cron `programador` (diario 06:00 America/Santiago) encola los trabajos periódicos: vencimientos de documentos, verificación de la bitácora, consolidación de consumos, expiración de aprobaciones, limpieza de subidas pendientes. **Ningún cron hace trabajo directo.**
4. **Medidor de consumos** (`core.consumos`, ADR-031): reemplaza a `Telemetria`. `Medidor.registrar(consumo)` recibe `{ recurso, unidad, cantidad, costoUnitarioMicro?, modulo, capability?, actor, apiKeyId?, portal?, referencia?, duracionMs?, ok? }`. `executeCapability` registra `capacidad.ejecucion` (cantidad 1, costo 0) por cada ejecución (como hoy `usage_events`); los adaptadores registran `ia.tokens_entrada/salida`, `geo.autocompletado`, `geo.geocodificacion`, `geo.mapa`, `correo.enviado`, `almacenamiento.bytes`, `mcp.llamada`, `api.llamada`. El costo unitario sale de `core.precios_recursos` (lista de plataforma en micro-USD, vigente por fecha); sin precio, costo 0 y aviso en Plataforma. El trabajo diario consolida en `core.consumos_diarios` y purga filas crudas de más de 90 días. `usage_events` deja de escribirse; la tabla se conserva hasta una migración de limpieza posterior.
5. **Secretos** (`packages/integrations/src/secretos`): envelope encryption. `OPAI_SECRETS_KEY` (KEK, 32 bytes base64, versión 1) cifra una DEK por tenant (`core.claves_tenant`); cada secreto se cifra con la DEK (AES-256-GCM, iv 12 bytes, tag 16). Rotar la KEK recifra solo las DEK. API: `guardarSecreto(tenantId, integracionId, nombre, valor)`, `leerSecreto(...)` (solo adaptadores del servidor), `rotarKek()`. Ningún secreto sale por capacidad, API, MCP ni logs; las capacidades devuelven solo `••••` + últimos 4.
6. **Catálogo de integraciones** (`core.integraciones`): proveedores con modalidad `plataforma | propia`. El adaptador se obtiene con `integraciones(tenantId).correo()` / `.geo()` / `.ia()`; cada uno resuelve credencial (propia cifrada o de plataforma en `process.env` **solo dentro de `packages/integrations`**), ejecuta por `fetch` (sin SDKs de proveedor) y **mide** en consumos. IA por clase de tarea (`economica | estandar | potente`) con proveedor y modelo configurables por tenant y valores por defecto de plataforma (`ajustes_plataforma`, clave `ia.modelos`). `probar()` en cada adaptador alimenta `core.integraciones.test`.
7. **Configuración declarativa** (ADR-018): un esquema de ajustes es un `z.object` cuyos campos llevan `.meta({ etiqueta, ayuda?, grupo?, ambito: "tenant" | "usuario" | "plataforma", permiso?, control?: "texto" | "numero" | "switch" | "seleccion" | "lista" | "color" | "fecha" })` (Zod 4 `.meta()`). `defineAjustes(modulo, schema)` lo registra; el núcleo declara los suyos (`core`: empresa, comunicaciones, preferencias de usuario) y cada manifest el suyo (`configuracion`). `core.config.get` devuelve los valores efectivos (por defecto del esquema → plataforma → tenant → usuario), `core.config.set` valida con el mismo Zod y audita, `core.config.schema` devuelve `z.toJSONSchema` con los metadatos para que la UI (`AjustesForm`) y los agentes rendericen o pregunten. Ámbitos fijos del centro: Empresa, Marca, Preferencias, Usuarios y permisos, Agentes y API keys, Aprobaciones, Módulos, Integraciones, Comunicaciones, Documentos, Consumos, Auditoría y una sección por módulo activo con `configuracion` no vacía (ADR-038).
8. **Comunicaciones** (ADR-020): cada evento comunicable se declara con `variables` (lista con tipo y ejemplo) y `plantillasPorDefecto` por canal en código; `core.plantillas` guarda solo versiones editadas por el tenant. Render en `packages/domain/src/plantillas.ts`: `{{ruta.variable}}` contra las variables declaradas, escape HTML, fallo si la variable no existe. Correo HTML con un layout mínimo del núcleo que aplica la marca del tenant (logo servido por `/api/marca/<slug>/logo`, colores, pie legal). Ruteo: `core.notificacion_reglas` (evento × canal → roles o usuarios) y preferencias de usuario (silencio, resumen); **sin regla, nada se envía**. Excepción: eventos `transaccionales` (invitación, recuperación, comprobante de documento) siempre se envían a su destinatario directo. Todo envío queda en `core.envios` con la versión de plantilla usada.
9. **Agentes** (ADR-032, ADR-033): `api_keys` gana `principal_tipo` (`usuario | cuenta | persona`, por ahora solo `usuario`), `principal_id`, `presupuesto_mensual_micro` y la tabla `api_keys_autonomia` (capability → `directo | aprobacion`). `executeCapability`, cuando el actor es agente: (a) comprueba el presupuesto del mes de la key (`BUDGET_EXCEEDED`, HTTP 402) y emite `core.agente.presupuesto_80/100`; (b) si la capacidad es `irreversible` y no hay autonomía `directo` para ella, **no ejecuta**: crea `core.aprobaciones` (pendiente, 72 h) y responde `{ ok: false, error: { code: "APPROVAL_REQUIRED", aprobacionId } }` (HTTP 202); `preview_` sigue funcionando. `core.aprobaciones.aprobar` ejecuta la capacidad original como el usuario aprobador (actor `user`) y guarda `aprobacionId` y la key en el payload de auditoría. Cada `Capacidad` declara `portales` (por defecto `["erp"]`; plataforma `["platform"]`); `esVisible`/`denegar` lo aplican cuando el contexto trae `principal` ≠ usuario (fase 3).
10. **Documentos** (ADR-019, ADR-039): subida directa del navegador o del agente a R2 con URL firmada PUT (10 min) sobre `t/<tenantId>/d/<documentoId>/v<version>/<nombre-seguro>`; el documento nace `pendiente` y pasa a `disponible` con `confirmar_subida`, que hace `HEAD` al objeto, valida tamaño (por defecto 50 MB, ajuste `documentos.tamano_maximo_mb`) y tipo MIME permitido por `documento_tipo`, calcula o acepta el SHA-256 y **registra el hecho en la bitácora** (`documento.registrado`). Descarga por URL firmada GET (5 min, `response-content-disposition`). Firma con `aws4fetch` (sin AWS SDK). Vencimientos: estado derivado en dominio (`vigente | por_vencer | vencido | sin_fecha`) y escalera de hitos por tipo; el trabajo diario emite `core.documento.por_vencer` y `core.documento.vencido` una vez por hito.
11. **Bitácora y comprobantes** (ADR-023): `core.bitacora` encadenada por tenant (`seq`, `hash_previo`, `hash = sha256(hash_previo + "\n" + payload_canon)`, `payload_canon` = JSON canónico con claves ordenadas), cabeza en `core.bitacora_cabezas` bloqueada con `FOR UPDATE` dentro de la transacción del hecho; triggers que rechazan `UPDATE`, `DELETE` y `TRUNCATE`. `core.comprobantes` emite tokens públicos verificables en `/verificar/<token>` (sin PII: tipo, fecha, hash, válido/inválido). `core.bitacora.verificar` recorre la cadena; el trabajo diario la verifica y, si se rompe, emite `core.bitacora.rota` (a plataforma).
12. **Rendimiento y presupuesto de JS** (ADR-037): (a) `@opai/ds`, `@opai/domain`, `@opai/auth` y `@opai/capabilities` declaran `"sideEffects": ["**/*.css"]`; `next.config.ts` agrega `experimental.optimizePackageImports: ["@opai/ds"]` (lucide-react ya está optimizado por defecto); (b) **sin cliente de Better Auth en el bundle**: login, Google, cierre de sesión y cambio de contraseña pasan por Server Actions que llaman a `auth.api.*` con `headers()` (el plugin `nextCookies` fija las cookies); el rate limit "5 intentos / 15 minutos" se aplica en la acción con `lib/rate-limit.ts` (por IP y por correo); `packages/auth/src/client.ts` se elimina; (c) **server-first**: listas y detalles son Server Components; `ListScreen` acepta `href(item)` (renderiza `Link`) además de `onSeleccionar`; `Tabs` por ruta (`href`); solo son islas cliente los formularios (`useActionState`), menús, sheets, uploader, paleta y campana, estos tres cargados con `next/dynamic` al primer uso; (d) `scripts/presupuesto-js.ts` mide igual que la tabla de la sección 2 y falla si una ruta supera `apps/web/presupuesto-js.json`; CI agrega el job `build` (variables ficticias) y corre `pnpm presupuesto`. Presupuestos iniciales (gzip): framework ≤ 132 KB; `/login` y acceso ≤ 152 KB (medido en el bloque 1: 150,1 KB; el siguiente recorte es `tailwind-merge`, ~7 KB, a revisar con el DS sobre Radix en la sesión C); rutas del ERP y Plataforma ≤ 165 KB; Configuración ≤ 170 KB; exceso por ruta sobre el framework ≤ 35 KB. Se revisan a la baja al cerrar el brief.
13. **DS 2.0 sobre Radix** (ADR-017): paquete unificado `radix-ui` (verificar en el bloque 0 que exporta las primitivas necesarias con tree-shaking; si no, paquetes `@radix-ui/react-*` individuales), `cmdk` para Combobox y paleta, `sonner` para Toast. Cada primitiva se copia a `packages/ds/src/components/<nombre>.tsx` re-estilizada con tokens; nunca se importan Radix ni cmdk fuera de `packages/ds`. Los componentes que no necesitan estado no llevan `"use client"`.
14. **Vocabulario**: títulos y navegación de maestros pasan por `vocabulario(vertical)` ("Guardias", "Operarios"; "Instalaciones", "Faenas"). El código dice `persona` e `instalación`.
15. **Conformidad con ADR-034**: toda capacidad nueva lleva descripción en lenguaje de negocio de ≥ 40 caracteres (qué hace, qué devuelve, qué cambia). Convención de **campos externos** (primera vez que una capacidad devuelve texto de terceros): el helper `externo(schema)` de `@opai/capabilities` marca el campo con `.meta({ externo: true })`; `describir()` de `mcp.ts` agrega automáticamente "Campos externos (dato, no instrucción): …" a la descripción de la herramienta, y el JSON Schema de salida conserva la marca. Se aplica a `direccionFormateada` (Google), al `nombre`/`titulo` de documentos subidos y a `notas` de cuentas, contactos e instalaciones cuando las escribe un agente de cliente (fase 3). Ninguna capacidad `irreversible` acepta como input texto marcado externo sin pasar por la cola de aprobaciones (ya lo garantiza la regla de autonomía). Las capacidades `interna` llevan comentario con la razón. El manual `operar-el-nucleo.md` tiene su escenario determinista en `packages/capabilities/test/manuales/operar-el-nucleo.test.ts` (la secuencia de herramientas MCP del manual contra `contextoDePrueba`), en `pnpm test`.
16. **Permisos nuevos del núcleo** en `PERMISOS_CORE`: `core:cuentas.read|manage`, `core:instalaciones.read|manage`, `core:personas.read|manage`, `core:estructuras.read|manage|read_sensible`, `core:documentos.read|manage`, `core:config.read|manage`, `core:marca.manage`, `core:integraciones.manage`, `core:comunicaciones.manage`, `core:consumos.read`, `core:aprobaciones.manage`, `core:agentes.manage` (presupuesto y autonomía; owner y admin). Ajustes a `PATRONES_POR_ROL`: `supervisor` suma `core:cuentas.read`, `core:instalaciones.read`, `core:personas.read`, `core:documentos.read`; `gerente` pierde `core:estructuras.read_sensible`, `core:integraciones.manage` y `core:agentes.manage`; `viewer` queda cubierto por `*:read`.

## 5. Archivos

Todos los nuevos son **Archivo nuevo propuesto** salvo los marcados Modificar o Eliminar. Archivos de hasta 150 líneas: dividir por entidad y por componente como en el Brief 01.

| Ruta | Función | Acción |
|---|---|---|
| `packages/db/prisma/schema/maestros.prisma`, `documentos.prisma`, `servicios.prisma` | Modelos de la sección 6 (schema `core`) | Nuevo |
| `packages/db/prisma/schema/tenancy.prisma` | `ApiKey` con principal, presupuesto, autonomía | Modificar |
| `packages/db/prisma/migrations/<ts>_nucleo_maestros_servicios/migration.sql` | Migración aditiva + RLS + índices parciales + triggers de bitácora + `CHECK` de estructuras | Nuevo |
| `packages/db/src/transaccion.ts`, `src/index.ts` | `enTransaccion`, `TenantTx`, tipos nuevos | Nuevo / Modificar |
| `packages/db/scripts/seed-dev-tenant.ts`, `scripts/seed-maestros-demo.ts` | Cargos y tipos de documento por vertical; maestros ficticios para `dev` | Modificar / Nuevo |
| `packages/db/test/rls-maestros.test.ts`, `rls-servicios.test.ts`, `bitacora.test.ts`, `transaccion.test.ts` | Aislamiento de todas las tablas nuevas, triggers, transacción | Nuevo |
| `packages/domain/src/{rut,telefono,direccion,estructuras,vigencia,canon,plantillas,presupuesto,turnos}.ts` + tests | Dominio puro de la sección 11, bloque 3 | Nuevo |
| `packages/domain/src/permisos.ts` + test | Permisos nuevos y patrones por rol | Modificar |
| `packages/capabilities/src/types.ts`, `execute.ts`, `contexto.ts`, `mcp.ts`, `http.ts`, `module.ts`, `define.ts` | `transaccion`, `eventos`, `trabajos`, `medidor`, `principal`, `portales`, aprobaciones, presupuesto, códigos `APPROVAL_REQUIRED`/`BUDGET_EXCEEDED`, recursos MCP | Modificar |
| `packages/capabilities/src/{eventos,trabajos,consumos,bitacora,ajustes}/*.ts` | Outbox, registro de trabajos y consumidores, medidor, bitácora y comprobantes, `defineAjustes` | Nuevo |
| `packages/capabilities/src/core/{cuentas,contactos,instalaciones,puestos,personas,vinculos,cargos,estructuras,buscar,documentos,documento-tipos,config,empresa,marca,comunicaciones,plantillas,notificaciones,integraciones,geo,ia,consumos,aprobaciones,agentes,bitacora,platform-servicios}*.ts` | Capacidades de la sección 7 (un archivo por entidad, dividido si supera 150 líneas) | Nuevo |
| `packages/capabilities/src/core/{invitar,aceptar,apikeys,consultas,index}.ts` | Invitación y recuperación por plantillas; keys con principal y presupuesto; `usage.summary` → `consumos.resumen`; registro | Modificar |
| `packages/capabilities/src/testing/db-memoria.ts`, `contexto.ts` | Modelos nuevos, `transaccion`, `eventos`, `medidor`, `almacenamiento` falso | Modificar |
| `packages/capabilities/test/*.test.ts` | Un archivo por entidad y servicio (sección 12) | Nuevo |
| `packages/integrations/src/{secretos,almacenamiento,geo,ia,correo}/*.ts` + tests | Secretos (envelope), R2 (`aws4fetch`), Google Maps, IA (Anthropic, OpenAI, Google por `fetch`), correo con BYOK y layout de marca | Nuevo / Modificar (`email`) |
| `packages/integrations/src/catalogo.ts` | Catálogo de proveedores, modalidades, estados, `probar()` | Nuevo |
| `packages/auth/src/{auth.ts,acciones.ts,index.ts}`, `src/client.ts`, `package.json` | Recuperación por plantilla; helpers de servidor para login/logout/password/Google; eliminar el cliente | Modificar / Eliminar |
| `packages/ds/package.json`, `src/components/*.tsx`, `src/patterns/{split-screen,list-screen,detail-screen,ajustes-form}.tsx`, `src/shell/*.tsx`, `src/index.ts` | `sideEffects`; primitivas Radix y componentes nuevos; `SplitScreen`; `href` en `ListScreen`; `Tabs` por ruta; shell con `Menu`, campana con `Popover`, ⌘K | Modificar / Nuevo |
| `apps/web/app/(auth)/**` | Login, recuperación, invitación y selector con Server Actions (sin cliente de auth) | Modificar |
| `apps/web/app/_acciones/{auth,capacidad}.ts` | Acciones de servidor de acceso; `ejecutarCapacidad` con `APPROVAL_REQUIRED` | Nuevo / Modificar |
| `apps/web/app/_components/{shell,pagina-portal,iconos,paleta,campana,...}.tsx` | Shell con Configuración única, campana real, ⌘K lazy, iconos nuevos | Modificar / Nuevo |
| `apps/web/app/(erp)/{cuentas,instalaciones,personas}/**` | Listas, detalles con tabs por ruta, formularios, ficha de documentos | Nuevo |
| `apps/web/app/(erp)/personas/cargos/**` | Cargos y estructuras | Nuevo |
| `apps/web/app/(erp)/configuracion/**` | Centro de Configuración (índice + 13 secciones); `usuarios`, `api-keys`, `empresa` se mueven adentro | Modificar / Nuevo |
| `apps/web/app/(erp)/configuracion/_renderer/*.tsx` | `AjustesForm` conectado a `core.config.*` | Nuevo |
| `apps/web/app/(platform)/platform/tenants/[id]/**` | Tabs Consumos, Trabajos, Integraciones de plataforma, Agentes | Modificar / Nuevo |
| `apps/web/app/(platform)/platform/{ajustes,trabajos}/**` | Ajustes de plataforma (precios, modelos de IA), cola global de trabajos | Nuevo |
| `apps/web/app/verificar/[token]/page.tsx` | Verificación pública de comprobantes (sin sesión, rate limit) | Nuevo |
| `apps/web/app/api/cron/{trabajos,programador}/route.ts` | Runner y programador (`CRON_SECRET`) | Nuevo |
| `apps/web/app/api/marca/[slug]/[asset]/route.ts`, `api/geo/mapa/route.ts` | Logo público del tenant (caché 1 h); mapa estático por proxy (clave de plataforma, caché). No hay ruta de subida de archivos: la subida va directo a R2 con la URL firmada | Nuevo |
| `apps/web/lib/{actor,api-key,mcp,navegacion,servidor,registro,telemetria→medidor}.ts` | Principal y presupuesto en el contexto; recursos MCP; navegación de maestros y Configuración única; registro de ajustes, trabajos y consumidores | Modificar |
| `apps/web/presupuesto-js.json`, `scripts/presupuesto-js.ts`, `package.json` (`presupuesto`) | Presupuesto por ruta y script de medición | Nuevo |
| `apps/web/next.config.ts`, `vercel.json` | `optimizePackageImports`; crons | Modificar |
| `apps/web/eslint.config.mjs` | Regla de elementos crudos en **error** para `app/**` | Modificar |
| `apps/web/e2e/{maestros,configuracion}.spec.ts` | Flujos críticos a 375 y 1024 con capturas | Nuevo |
| `.github/workflows/{ci.yml,preview.yml}` | Job `build` + `presupuesto`; previews con rama Neon efímera | Modificar / Nuevo |
| `scripts/templates/module/manifest.ts.tpl` | `configuracion` con `.meta()` de ejemplo; `eventos` con variables y plantilla | Modificar |
| `docs/2.0/agentes/operar-el-nucleo.md`, `docs/2.0/agentes/README.md` | Primer manual | Nuevo / Modificar |
| `docs/2.0/{ESTADO.md,01-decisiones.md,CONTEXTO-agentes.md}`, `CLAUDE.md`, `.env.example` | Estado, ADR-036 a 039, contexto, reglas, variables | Modificar |

## 6. Modelo de datos y migraciones

Todo en schema `core`, aditivo. Convenciones de `CLAUDE.md`: `uuid(7)`, `snake_case`, `tenant_id`, `created_at`/`updated_at`, RLS `tenant_isolation` en toda tabla con `tenant_id`. Notación compacta (como el Brief 01); los tipos de fecha de calendario son `@db.Date`, los instantes `@db.Timestamptz(6)`, el dinero `Int` en CLP, los porcentajes `Int` en `PCT_ESCALA`, los costos `Int` en micro-USD.

### Maestros (`maestros.prisma`)

```prisma
model Cuenta {            // cuentas · unique [tenantId, rut] (índice parcial rut IS NOT NULL)
  id, tenantId, nombre, razonSocial?, rut? /* canónico 76543210-K */, giro?,
  estado String @default("prospecto") /* prospecto | cliente_activo | cliente_inactivo */,
  origen?, sitioWeb?, calle?, comuna?, region?, pais String @default("CL"),
  escrituraFecha? @db.Date, escrituraNotaria?, notas?,
  clienteDesde? @db.Date, clienteHasta? @db.Date, archivadaEn?, createdAt, updatedAt
  contactos Contacto[]; instalaciones Instalacion[]; representantes CuentaRepresentante[]
}
model CuentaRepresentante { id, tenantId, cuentaId, nombre, rut, email?, createdAt, updatedAt }  // cuentas_representantes
model Contacto {          // contactos · unique parcial [tenantId, cuentaId, email] email IS NOT NULL
  id, tenantId, cuentaId, nombres, apellidos, email?, telefono? /* E.164 */, cargo?,
  esPrincipal Boolean @default(false), roles String[] /* comercial | operacional | facturacion | cobranza */,
  estado String @default("activo") /* activo | inactivo */, notas?, archivadoEn?, createdAt, updatedAt
}
model Instalacion {       // instalaciones · unique [tenantId, cuentaId, nombre]
  id, tenantId, cuentaId, nombre, estado String @default("prospecto") /* prospecto | activa | inactiva */,
  calle?, comuna?, region?, pais @default("CL"), direccionFormateada?, placeId?,
  lat? Decimal(10,7), lng? Decimal(10,7), geocercaM Int @default(1000),
  vigenteDesde? @db.Date, vigenteHasta? @db.Date, notas?, archivadaEn?, createdAt, updatedAt
  puestos Puesto[]
}
model Cargo {             // cargos · unique [tenantId, nombre]
  id, tenantId, nombre, descripcion?, clase String @default("operativo") /* operativo | administrativo */,
  sueldoSensible Boolean @default(false), activo Boolean @default(true), orden Int @default(0), createdAt, updatedAt
}
model Puesto {            // puestos · unique [tenantId, instalacionId, nombre]
  id, tenantId, instalacionId, cargoId, nombre,
  diasTrabajo Int, diasDescanso Int, horaInicio String /* "08:00" */, horaFin String /* "20:00"; fin <= inicio cruza medianoche */,
  jornada String @default("dia") /* dia | noche | rotativa */, dotacion Int @default(1),
  estado String @default("activo") /* activo | inactivo */, vigenteDesde? @db.Date, vigenteHasta? @db.Date, notas?, createdAt, updatedAt
}
model Persona {           // personas · unique [tenantId, rut] · unique parcial [tenantId, usuarioId]
  id, tenantId, nombres, apellidos, rut /* canónico */, emailPersonal?, emailLaboral?, telefono?,
  fechaNacimiento? @db.Date, sexo? /* femenino | masculino | otro | no_declara */, nacionalidad String @default("CL"),
  calle?, comuna?, region?, pais @default("CL"), direccionFormateada?, placeId?, lat? Decimal(10,7), lng? Decimal(10,7),
  estado String @default("activa") /* activa | inactiva */, bloqueada Boolean @default(false), bloqueoMotivo?, bloqueadaEn?,
  usuarioId? @db.Uuid, archivadaEn?, createdAt, updatedAt
  vinculos VinculoLaboral[]
}
model VinculoLaboral {    // vinculos_laborales · unique parcial [tenantId, personaId] WHERE estado = 'vigente'
  id, tenantId, personaId, cargoId, tipo String /* indefinido | plazo_fijo | por_obra | honorarios */,
  inicio @db.Date, termino? @db.Date, motivoTermino?, estado String @default("vigente") /* vigente | terminado */, createdAt, updatedAt
}
model EstructuraSueldo {  // estructuras_sueldo · CHECK: exactamente una referencia según nivel
  id, tenantId, nivel String /* cargo | puesto | persona */, cargoId?, puestoId?, personaId?,
  sueldoBase Int, colacion Int @default(0), movilizacion Int @default(0),
  gratificacion String @default("legal_25") /* legal_25 | monto_fijo | ninguna */, gratificacionMonto Int?,
  vigenteDesde @db.Date, vigenteHasta? @db.Date, motivo?, estado String @default("vigente") /* vigente | anulada */,
  creadoPor?, createdAt, updatedAt
  items EstructuraItem[]
  @@index([tenantId, nivel, cargoId]) @@index([tenantId, nivel, puestoId]) @@index([tenantId, nivel, personaId])
}
model EstructuraItem {    // estructuras_items
  id, tenantId, estructuraId, tipo String /* bono_fijo | bono_porcentual */, nombre, monto Int?, porcentaje Int? /* PCT_ESCALA */,
  imponible Boolean @default(true), tributable Boolean @default(true), orden Int @default(0), createdAt, updatedAt
}
model IdExterno { id, tenantId, entidadTipo, entidadId @db.Uuid, sistema /* "opai1" */, idExterno, createdAt  @@unique([tenantId, sistema, entidadTipo, idExterno]) }  // ids_externos
```

### Documentos (`documentos.prisma`)

```prisma
model DocumentoTipo {     // documento_tipos · unique [tenantId, codigo]
  id, tenantId, codigo, nombre, descripcion?, capa String /* empresa | cuenta | instalacion | persona | puesto */,
  obligatorio Boolean @default(false), tieneVencimiento Boolean @default(false), diasAlerta Int @default(30),
  hitos Int[] @default([30, 14, 7, 3, 1, 0]), normativa?, mimesPermitidos String[] @default([]) /* vacío = cualquiera permitido por el núcleo */,
  visiblePortalDefault String[] @default([]), activo Boolean @default(true), orden Int @default(0), createdAt, updatedAt
}
model Documento {         // documentos · unique [storageKey]
  id, tenantId, tipoId?, nombre /* archivo */, titulo?, mime, tamano Int, storageKey, sha256?,
  estado String @default("pendiente") /* pendiente | disponible | archivado */, version Int @default(1), reemplazaAId? @db.Uuid,
  emitidoEn? @db.Date, venceEn? @db.Date, etiquetas String[] @default([]), visibleEn String[] @default([]) /* portales */,
  origen String @default("subida") /* subida | generado */, moduloOrigen?,
  creadoPorTipo /* user | agent | system */, creadoPorId?, viaUserId?, confirmadoEn?, archivadoEn?, bitacoraSeq Int?, hitoNotificado Int?,
  createdAt, updatedAt
  vinculos DocumentoVinculo[]
  @@index([tenantId, venceEn]) @@index([tenantId, tipoId]) @@index([tenantId, estado])
}
model DocumentoVinculo {  // documento_vinculos · unique [tenantId, documentoId, entidadTipo, entidadId]
  id, tenantId, documentoId, entidadTipo /* tenant | cuenta | instalacion | persona | puesto | … */, entidadId @db.Uuid,
  rol String @default("propietario") /* propietario | referencia */, createdAt
  @@index([tenantId, entidadTipo, entidadId])
}
```

### Servicios (`servicios.prisma`)

```prisma
model PerfilEmpresa {     // perfil_empresa · unique [tenantId]
  id, tenantId, razonSocial?, rut?, giro?, calle?, comuna?, region?, pais @default("CL"),
  representanteNombre?, representanteRut?, representanteEmail?,
  correoComercial?, correoOperaciones?, correoFinanzas?, correoContacto?, telefono?, whatsapp?, sitioWeb?,
  nombreComercial?, eslogan?, colorPrimario? /* "#RRGGBB" como dato */, colorSecundario?,
  logoPrincipalId? @db.Uuid, logoClaroId?, logoOscuroId?, isotipoId?, faviconId?, createdAt, updatedAt
}
model Ajuste {            // ajustes · unique [tenantId, ambito, sujetoId, modulo, clave]
  id, tenantId, ambito String /* tenant | usuario */, sujetoId @db.Uuid /* tenantId o userId */, modulo, clave, valor Json, version Int @default(1), actualizadoPor?, createdAt, updatedAt
}
model AjustePlataforma { id, modulo, clave, valor Json, version Int @default(1), actualizadoPor?, createdAt, updatedAt  @@unique([modulo, clave]) }  // ajustes_plataforma · sin tenant ni RLS; escribe solo platform.*
model Evento {            // eventos (outbox)
  id, tenantId, tipo, entidadTipo?, entidadId?, payload Json, actorTipo, actorId?, viaUserId?, idempotencyKey?,
  estado String @default("pendiente") /* pendiente | publicado | error */, intentos Int @default(0), publicadoEn?, error?, createdAt
  entregas EventoEntrega[]
  @@index([tenantId, estado, createdAt])
}
model EventoEntrega { id, tenantId, eventoId, consumidor, estado /* ok | error */, error?, createdAt  @@unique([tenantId, eventoId, consumidor]) }  // eventos_entregas
model Trabajo {           // trabajos · unique parcial [tenantId, claveUnica] claveUnica IS NOT NULL
  id, tenantId, tipo, payload Json, estado String @default("pendiente") /* pendiente | en_curso | hecho | fallido | cancelado */,
  programadoPara, intentos Int @default(0), maxIntentos Int @default(5), bloqueadoHasta?, ultimoError?, resultado Json?, claveUnica?, createdAt, updatedAt
  @@index([tenantId, estado, programadoPara])
}
model Plantilla { id, tenantId, evento, canal /* correo | whatsapp | push | inapp */, version Int, asunto?, cuerpo, activa Boolean @default(true), creadoPor?, createdAt  @@unique([tenantId, evento, canal, version]) }  // plantillas
model NotificacionRegla { id, tenantId, evento, canal, destinatariosRoles String[] @default([]), destinatariosUsuarios String[] @default([]), activa Boolean @default(false), createdAt, updatedAt  @@unique([tenantId, evento, canal]) }  // notificacion_reglas
model Notificacion { id, tenantId, usuarioId @db.Uuid, eventoId?, titulo, cuerpo?, enlace?, leidaEn?, createdAt  @@index([tenantId, usuarioId, leidaEn]) }  // notificaciones
model Envio { id, tenantId, eventoId?, canal, destinatario, plantillaEvento?, plantillaVersion Int?, estado /* enviado | fallido | omitido */, proveedorId?, error?, createdAt  @@index([tenantId, createdAt]) }  // envios
model Integracion {       // integraciones · unique [tenantId, proveedor]
  id, tenantId, proveedor /* resend | google_maps | ia_anthropic | ia_openai | ia_google | … */, modalidad String @default("plataforma") /* plataforma | propia */,
  estado String @default("no_configurada") /* no_configurada | configurada | error */, config Json @default("{}") /* nunca secretos */,
  ultimoTestEn?, ultimoError?, actualizadoPor?, createdAt, updatedAt
  secretos Secreto[]
}
model Secreto { id, tenantId, integracionId, nombre, cifrado Bytes, iv Bytes, tag Bytes, kekVersion Int, creadoPor?, createdAt, updatedAt  @@unique([tenantId, integracionId, nombre]) }  // secretos
model ClaveTenant { id, tenantId, dekCifrada Bytes, iv Bytes, tag Bytes, kekVersion Int, createdAt, updatedAt  @@unique([tenantId]) }  // claves_tenant
model Consumo {           // consumos
  id, tenantId, recurso, unidad, cantidad Int, costoUnitarioMicro Int @default(0), costoTotalMicro Int @default(0),
  modulo, capability?, actorTipo, actorId?, viaUserId?, apiKeyId? @db.Uuid, portal?, referenciaTipo?, referenciaId?, duracionMs Int?, ok Boolean?, createdAt
  @@index([tenantId, createdAt]) @@index([tenantId, recurso, createdAt]) @@index([tenantId, apiKeyId, createdAt])
}
model ConsumoDiario { id, tenantId, dia @db.Date, recurso, modulo, apiKeyId String @default("") /* "" = sin key */, cantidad Int, costoTotalMicro Int, createdAt, updatedAt  @@unique([tenantId, dia, recurso, modulo, apiKeyId]) }  // consumos_diarios
model PrecioRecurso { id, recurso, unidad, costoUnitarioMicro Int, vigenteDesde @db.Date, createdAt  @@unique([recurso, vigenteDesde]) }  // precios_recursos · sin tenant
model Aprobacion {        // aprobaciones
  id, tenantId, apiKeyId @db.Uuid, viaUserId @db.Uuid, capability, input Json, idempotencyKey?, resumen,
  estado String @default("pendiente") /* pendiente | aprobada | rechazada | vencida */, venceEn, resueltaPor?, resueltaEn?, motivo?, resultado Json?, createdAt, updatedAt
  @@index([tenantId, estado, createdAt])
}
model ApiKeyAutonomia { id, tenantId, apiKeyId, capability, nivel /* directo | aprobacion */, createdAt, updatedAt  @@unique([tenantId, apiKeyId, capability]) }  // api_keys_autonomia
model Bitacora {          // bitacora · unique [tenantId, seq] · triggers inmutables
  id, tenantId, seq Int, tipo, entidadTipo?, entidadId?, payloadCanon String, hashPrevio String, hash String, createdAt
}
model BitacoraCabeza { id, tenantId, ultimoSeq Int @default(0), ultimoHash String, verificadaEn?, verificacionOk Boolean?, createdAt, updatedAt  @@unique([tenantId]) }  // bitacora_cabezas
model Comprobante { id, tenantId, tipo, entidadTipo, entidadId, hash, token @unique, emitidoA?, emitidoEn, bitacoraSeq Int?, createdAt }  // comprobantes
```

`ApiKey` (`tenancy.prisma`) gana `principalTipo String @default("usuario")`, `principalId String? @db.Uuid`, `presupuestoMensualMicro Int?` y la relación `autonomia ApiKeyAutonomia[]`. `UsageEvent` se mantiene sin cambios (deja de escribirse).

**SQL manual de la migración** (además del bloque RLS por tabla de `CLAUDE.md`):

- Índices únicos parciales: `cuentas (tenant_id, rut) WHERE rut IS NOT NULL`; `contactos (tenant_id, cuenta_id, email) WHERE email IS NOT NULL`; `personas (tenant_id, usuario_id) WHERE usuario_id IS NOT NULL`; `vinculos_laborales (tenant_id, persona_id) WHERE estado = 'vigente'`; `trabajos (tenant_id, clave_unica) WHERE clave_unica IS NOT NULL`.
- `estructuras_sueldo`: `CHECK ((nivel = 'cargo' AND cargo_id IS NOT NULL AND puesto_id IS NULL AND persona_id IS NULL) OR (nivel = 'puesto' AND puesto_id IS NOT NULL AND cargo_id IS NULL AND persona_id IS NULL) OR (nivel = 'persona' AND persona_id IS NOT NULL AND cargo_id IS NULL AND puesto_id IS NULL))` y `CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde)`.
- Bitácora: función `core.bitacora_inmutable()` que lanza excepción, triggers `BEFORE UPDATE OR DELETE` (por fila) y `BEFORE TRUNCATE` (por sentencia) sobre `core.bitacora`; `GRANT INSERT, SELECT` (sin `UPDATE`/`DELETE`) a `opai_app` sobre `core.bitacora`.
- `ajustes_plataforma` y `precios_recursos`: sin RLS; `GRANT SELECT` a `opai_app` y `INSERT/UPDATE` (las escriben capacidades `platform.*` con `clienteApp()` a través de un helper de `packages/db` igual que `listarTenants`).
- Los `tenant_id` de las nuevas FK a `tenants` siguen el patrón de `audit_events` (`ON DELETE RESTRICT`).

La migración se crea con `pnpm db:migrate` contra `dev`, se aplica con `pnpm db:deploy` contra `dev`, se prueba con `pnpm test:db` y solo en el bloque 13 contra `main`.

## 7. Capacidades a registrar

Todas con `portales: ["erp"]` salvo indicación; `platform.*` con `["platform"]`. Toda escritura: `dryRun` sí e `idempotencyKey`. Los `id` siguen `core.<entidad>.<verbo>`.

| Capacidad | Permiso | Efecto | Evento emitido | Notas |
|---|---|---|---|---|
| `core.cuentas.list` / `.get` | `core:cuentas.read` | lectura | — | búsqueda por nombre/RUT, filtros estado, paginación por cursor; `get` incluye contactos, instalaciones y conteo de documentos |
| `core.cuentas.create` / `.update` | `core:cuentas.manage` | escritura | `core.cuenta.creada` / `.actualizada` | RUT normalizado y validado; duplicado → `CONFLICT` |
| `core.cuentas.set_estado` | `core:cuentas.manage` | escritura | `core.cuenta.estado_cambiado` | transiciones `prospecto → cliente_activo → cliente_inactivo → cliente_activo`; `cliente_desde` se fija al activar la primera vez |
| `core.cuentas.archive` | `core:cuentas.manage` | escritura | `core.cuenta.archivada` | soft; bloquea si tiene instalaciones activas |
| `core.cuentas.representantes.set` | `core:cuentas.manage` | escritura | — | reemplaza la lista |
| `core.contactos.list` / `.get` | `core:cuentas.read` | lectura | — | por cuenta |
| `core.contactos.create` / `.update` / `.archive` | `core:cuentas.manage` | escritura | `core.contacto.creado` / `.actualizado` | `esPrincipal` único por cuenta (desmarca al anterior); email único por cuenta |
| `core.instalaciones.list` / `.get` | `core:instalaciones.read` | lectura | — | filtros cuenta, estado, región; `get` incluye puestos y resumen de documentos |
| `core.instalaciones.create` / `.update` | `core:instalaciones.manage` | escritura | `core.instalacion.creada` / `.actualizada` | geocodifica si viene dirección sin coordenadas (si falla, guarda sin geo y lo informa) |
| `core.instalaciones.set_estado` / `.archive` | `core:instalaciones.manage` | escritura | `core.instalacion.estado_cambiado` / `.archivada` | archivar exige cero puestos activos |
| `core.puestos.list` / `.get` | `core:instalaciones.read` | lectura | — | por instalación |
| `core.puestos.create` / `.update` / `.set_estado` | `core:instalaciones.manage` | escritura | `core.puesto.creado` / `.actualizado` | valida horario con `packages/domain/turnos` (cruce de medianoche, patrón ≥ 1×1) |
| `core.personas.list` / `.get` | `core:personas.read` | lectura | — | búsqueda nombre/RUT; filtros cargo, estado; la columna instalación muestra "—" hasta que Operaciones asigne puestos (fase 3); `get` devuelve la ficha completa (contacto, dirección, nacimiento) a quien tiene `read`; los sueldos van por `core.estructuras.*` (sección 9) |
| `core.personas.create` / `.update` | `core:personas.manage` | escritura | `core.persona.creada` / `.actualizada` | RUT obligatorio, único; `create` admite `vinculo` inicial |
| `core.personas.bloquear` / `.desbloquear` | `core:personas.manage` | escritura | `core.persona.bloqueada` / `.desbloqueada` | motivo obligatorio |
| `core.personas.archive` | `core:personas.manage` | escritura | `core.persona.archivada` | exige vínculo terminado |
| `core.personas.vincular_usuario` | `core:personas.manage` | escritura | — | 1:1; el usuario debe tener membresía |
| `core.vinculos.list` | `core:personas.read` | lectura | — | historial por persona |
| `core.vinculos.create` | `core:personas.manage` | escritura | `core.vinculo.creado` | termina el vigente si `inicio` ≥ hoy y no se terminó antes → error claro: primero `terminar` |
| `core.vinculos.update` / `.terminar` | `core:personas.manage` | escritura / **irreversible** | `core.vinculo.terminado` | `terminar` exige `termino` y motivo; persona pasa a `inactiva` si no quedan vínculos |
| `core.cargos.list` / `.get` | `core:estructuras.read` | lectura | — | con conteos (personas con vínculo vigente, puestos activos) y estructura vigente |
| `core.cargos.create` / `.update` / `.set_activo` | `core:estructuras.manage` | escritura | `core.cargo.creado` / `.actualizado` | desactivar no borra; nombre único |
| `core.estructuras.list` / `.get` | `core:estructuras.read` | lectura | — | por nivel y referencia; cargos `sueldoSensible` exigen `core:estructuras.read_sensible` (si no, montos `null` y `sensible: true`) |
| `core.estructuras.create` | `core:estructuras.manage` | escritura | `core.estructura.creada` | nueva versión: cierra la vigente anterior el día anterior a `vigenteDesde`; solapes → `UNPROCESSABLE`; nivel `persona` exige `motivo` |
| `core.estructuras.anular` | `core:estructuras.manage` | **irreversible** | `core.estructura.anulada` | motivo obligatorio |
| `core.estructuras.efectiva` | `core:estructuras.read` | lectura | — | `{ personaId, fecha }` → resolución persona → puesto (solo si se pasa `puestoId`; sin asignaciones en este brief) → cargo, con los tres niveles y el que aplica; usa `packages/domain/estructuras` |
| `core.buscar` | `null` (sesión) | lectura | — | `q` → cuentas, instalaciones, personas, contactos (máximo 5 cada uno, por permisos del actor) y ajustes (por etiqueta) |
| `core.documento_tipos.list` / `.create` / `.update` | `core:documentos.read` / `core:documentos.manage` | lectura / escritura | — | por capa |
| `core.documentos.iniciar_subida` | `core:documentos.manage` | escritura | — | `{ entidad, tipoId?, nombre, mime, tamano, reemplazaAId? }` → documento `pendiente` + URL PUT firmada (10 min); `dryRun` valida y no firma |
| `core.documentos.confirmar_subida` | `core:documentos.manage` | escritura | `core.documento.registrado` | HEAD al objeto, tamaño y MIME, SHA-256, vínculo `propietario`, entrada en bitácora; versión N+1 si reemplaza |
| `core.documentos.list` / `.get` | `core:documentos.read` | lectura | — | por entidad, tipo, estado de vigencia; `get` incluye vínculos y versiones |
| `core.documentos.update` | `core:documentos.manage` | escritura | `core.documento.actualizado` | título, tipo, emisión, vencimiento, etiquetas, `visibleEn` |
| `core.documentos.vincular` / `.desvincular` | `core:documentos.manage` | escritura | — | rol `referencia`; el `propietario` no se desvincula |
| `core.documentos.archive` | `core:documentos.manage` | escritura | `core.documento.archivado` | soft; el objeto se conserva |
| `core.documentos.url_descarga` | `core:documentos.read` | lectura | — | URL GET firmada 5 min; mide `almacenamiento.descarga` |
| `core.documentos.vencimientos` | `core:documentos.read` | lectura | — | por vencer en N días y vencidos, por capa y entidad |
| `core.config.schema` / `.get` / `.buscar` | `core:config.read` (`usuario`: cualquiera con sesión) | lectura | — | esquema con metadatos (JSON Schema), valores efectivos por ámbito, búsqueda por etiqueta |
| `core.config.set` | `core:config.manage` (`usuario`: propio) | escritura | `core.config.cambiada` | valida con el Zod del esquema; ajustes `plataforma` → `FORBIDDEN` |
| `core.empresa.get` / `.update` | `core:tenant.read` / `core:tenant.manage` | lectura / escritura | `core.empresa.actualizada` | perfil legal y contacto |
| `core.marca.get` / `.update` | `core:tenant.read` / `core:marca.manage` | lectura / escritura | `core.marca.actualizada` | logos por `documentoId` (tipo `marca.logo`), colores validados |
| `core.comunicaciones.eventos` | `core:comunicaciones.manage` | lectura | — | catálogo de eventos comunicables con variables, canales y plantilla vigente |
| `core.plantillas.get` / `.update` / `.preview` / `.enviar_prueba` | `core:comunicaciones.manage` | lectura / escritura / lectura / escritura | `core.plantilla.actualizada` | `update` crea versión; `preview` renderiza con los ejemplos; `enviar_prueba` al correo del actor |
| `core.notificacion_reglas.list` / `.set` | `core:comunicaciones.manage` | lectura / escritura | — | evento × canal → roles/usuarios, activa |
| `core.notificaciones.list` / `.marcar_leida` / `.marcar_todas` | `null` (sesión) | lectura / escritura | — | inbox del usuario; `marcar_*` sin auditoría de payload (escritura de bajo valor: auditar solo el id) |
| `core.integraciones.list` / `.get` | `core:integraciones.manage` | lectura | — | catálogo con estado por tenant; nunca secretos |
| `core.integraciones.configurar` | `core:integraciones.manage` | escritura | `core.integracion.actualizada` | modalidad y `config` por proveedor (validada por su esquema) |
| `core.integraciones.set_secreto` | `core:integraciones.manage` | escritura | — | valor una sola vez; `dryRun` solo valida formato; auditoría sin el valor |
| `core.integraciones.probar` | `core:integraciones.manage` | escritura (fija `estado`) | `core.integracion.error` si falla | ejecuta `probar()` del adaptador; mide |
| `core.geo.autocompletar` / `.geocodificar` | `null` (sesión) | lectura | — | mide `geo.*`; rate limit por usuario |
| `core.ia.probar` | `core:integraciones.manage` | lectura | — | una llamada corta por clase; mide tokens |
| `core.consumos.resumen` / `.por_recurso` / `.por_agente` | `core:consumos.read` | lectura | — | mes actual o indicado; reemplaza `core.usage.summary` (se mantiene como alias deprecado hasta el Brief 03) |
| `core.apikeys.create` / `.update` | `core:apikeys.manage` (+ `core:agentes.manage` para presupuesto) | escritura | — | `create` gana `presupuestoMensualUsd?`; `update` cambia nombre, presupuesto, `expiraEn` |
| `core.apikeys.set_autonomia` | `core:agentes.manage` | escritura | `core.agente.autonomia_cambiada` | solo capacidades `irreversible` o `escritura`; nivel `directo` lo da owner/admin |
| `core.aprobaciones.list` / `.get` | `core:aprobaciones.manage` | lectura | — | pendientes e historial |
| `core.aprobaciones.aprobar` / `.rechazar` | `core:aprobaciones.manage` | **irreversible** / escritura | `core.aprobacion.resuelta` | `aprobar` ejecuta la capacidad original; no la puede aprobar una API key (`FORBIDDEN`) |
| `core.bitacora.verificar` | `core:audit.read` | lectura | — | recorre la cadena y devuelve `{ ok, seq, primeraRota? }` |
| `core.comprobantes.get` | público por ruta, no capacidad | — | — | `/verificar/<token>` |
| `core.me` | — | lectura | — | ampliar con `principal`, `notificacionesNoLeidas`, `vocabulario` |
| `platform.ajustes.get` / `.set` | `platform:tenants.read` / `platform:tenants.manage` | lectura / escritura | — | `ajustes_plataforma` (precios de recursos, modelos de IA por clase, límites) |
| `platform.trabajos.list` / `.reintentar` / `.cancelar` | `platform:tenants.read` / `.manage` | lectura / escritura / irreversible | — | por tenant objetivo |
| `platform.eventos.list` | `platform:tenants.read` | lectura | — | outbox por tenant (estado, errores) |
| `platform.consumos.summary` | `platform:tenants.read` | lectura | — | por tenant y recurso, con costo; reemplaza `platform.usage.summary` |
| `platform.integraciones.estado` | `platform:tenants.read` | lectura | — | qué credenciales de plataforma existen (sí/no por proveedor), nunca valores |
| `platform.bitacora.estado` | `platform:tenants.read` | lectura | — | última verificación por tenant |

Reglas transversales que se agregan a `executeCapability`: `APPROVAL_REQUIRED` y `BUDGET_EXCEEDED` (sección 4.9); escrituras que emiten eventos lo hacen en transacción; el medidor reemplaza a la telemetría; `tenantObjetivo` sigue igual para plataforma.

## 8. Interfaz y responsive

Referencia obligatoria: export aprobado en `docs/2.0/design/export-maestros/` (nombres de archivo de la sección 7 del Design Prompt). Abrir los HTML como referencia de layout y jerarquía; nunca copiar su código. Todo con componentes de `@opai/ds`; sin hex ni estilos propios.

- **Navegación del ERP** (`lib/navegacion.ts`): Inicio · Cuentas · Instalaciones (vocabulario) · Personas (vocabulario) con subentrada "Cargos y sueldos" · entradas de módulos activos · **Configuración** (una sola entrada, `/configuracion`). Desaparecen las tres entradas del Brief 01.
- **Cuentas, Instalaciones, Personas**: `SplitScreen` en md+ (lista 360/400 px + `DetailScreen`), `ListScreen` y detalle como pantallas separadas en teléfono. Tabs por ruta: `/cuentas/[id]/{resumen,contactos,instalaciones,documentos,actividad}` (el segmento `resumen` es el índice), `/instalaciones/[id]/{resumen,puestos,documentos,actividad}` (tab "Personas" deshabilitada con tooltip hasta Operaciones), `/personas/[id]/{resumen,laboral,documentos,actividad}`. Formularios de creación en `Sheet` lateral (md+) o pantalla completa (teléfono) con `FormScreen` y validación inline; edición en `Sheet`. Actividad con `Timeline` desde `core.audit.list` filtrado por entidad.
- **Cargos y sueldos**: `/personas/cargos` (`ListScreen`) y `/personas/cargos/[id]` (`DetailScreen`: datos, estructura vigente con ítems, versiones en `Timeline`, "Nueva versión"). La estructura efectiva de una persona vive en `/personas/[id]/laboral` como cascada de tres niveles con el nivel aplicable resaltado; "Definir excepción" exige motivo.
- **Ficha de documentos** (componente compartido `FichaDocumentos` en `apps/web/app/_components/documentos/`): resumen de vigencias, tipos obligatorios faltantes como filas punteadas, lista agrupada por tipo con `Vigencia`, `Uploader` con subida directa a R2 (progreso real por `XMLHttpRequest` o `fetch` con `ReadableStream`; ambos dentro del componente del DS), confirmación, vista previa en `Dialog` (PDF en `<iframe>` con la URL firmada; imágenes con `<img>`), menú por documento.
- **Centro de Configuración**: `/configuracion` con `SplitScreen` (índice por ámbitos con descripción e iconos; búsqueda; en teléfono, lista) y una ruta por sección: `empresa`, `marca`, `preferencias`, `usuarios`, `agentes` (+ `agentes/[id]`, `agentes/conectar`), `aprobaciones`, `modulos`, `integraciones` (+ `integraciones/[proveedor]`), `comunicaciones` (+ `comunicaciones/[evento]`), `documentos`, `consumos`, `auditoria`, `modulo/[id]`. `AjustesForm` renderiza desde `core.config.schema`; cada campo muestra "Fijado por OPAI" cuando el ámbito es plataforma.
- **Shell**: menú de usuario y selector de portal sobre `Menu` (Radix); campana con `Popover` y lista de notificaciones (contador real desde `core.me`); búsqueda ⌘K y botón de lupa en teléfono abren `CommandPalette` (carga diferida) con `core.buscar`.
- **Plataforma**: detalle de tenant con tabs Consumos, Trabajos, Agentes e Integraciones; páginas `/platform/ajustes` y `/platform/trabajos`. Patrones existentes; sin diseño nuevo.
- **Viewports**: verificar a 375 y 1024 con Playwright (capturas en `apps/web/e2e/__screenshots__/maestros/` y `configuracion/`) y revisar a 1280; claro y oscuro en las pantallas marcadas en el Design Prompt. Touch targets ≥ 44 px; foco visible; skeletons con forma; estados vacío/error/sin permisos en todas.

## 9. Seguridad y tenant

- Toda tabla nueva con `tenant_id` y RLS; el test `rls-maestros`/`rls-servicios` itera la lista de tablas del schema `core` con `tenant_id` y prueba cero fuga y escritura cruzada rechazada para **cada una** (falla si aparece una tabla con `tenant_id` sin política).
- Datos personales (Ley 21.719): `core.personas.get` devuelve dirección, teléfono y nacimiento solo con `core:personas.read` (es el propósito de la ficha); el inventario de campos personales se documenta en `docs/2.0/privacidad/inventario-datos-personales.md` (tabla por columna) para el momento del segundo tenant (ADR-029.6). Sueldos: `read_sensible` solo owner y admin.
- Secretos: `OPAI_SECRETS_KEY` solo en Vercel y `.env.local`; nunca en logs ni en respuestas; las capacidades devuelven enmascarado. `set_secreto` audita sin el valor. Rotación con `pnpm --filter @opai/integrations rotar-kek` (requiere la clave nueva y la anterior por variables, no por argumentos).
- R2: bucket privado; URLs firmadas de 10 min (PUT) y 5 min (GET); CORS solo para `https://test.opai.cl` y `http://localhost:3000`; nombres de objeto generados (nunca el nombre del archivo del usuario sin sanitizar); MIME y tamaño validados en `confirmar_subida`; objetos de subidas no confirmadas en 24 h se eliminan por trabajo. Vista previa de PDF con `sandbox` en el iframe.
- Crons: `CRON_SECRET` obligatorio; sin él, 503. Las rutas de cron no tienen tenant propio: iteran tenants activos con `forTenant`.
- Verificación pública `/verificar/<token>`: rate limit por IP; muestra solo tipo, fecha, hash y validez.
- `/api/marca/<slug>/<asset>` sirve solo documentos vinculados a la marca del tenant (tipos `marca.*`), con caché; nunca otro documento.
- Agentes: `APPROVAL_REQUIRED` y `BUDGET_EXCEEDED` se auditan como intentos (`core.audit_events` con `payload.resultado`); una key no puede aprobar aprobaciones; el aprobador necesita `core:aprobaciones.manage` y queda registrado.
- Server Actions de acceso: rate limit 5/15 min por IP y por correo; mensajes idénticos para usuario inexistente y contraseña incorrecta; `BETTER_AUTH_SECRET` sin cambios.
- Las cabeceras de seguridad del Brief 01 se mantienen; la CSP sigue pendiente (ver sección 15).

## 10. Casos límite

- RUT con formato libre (`16.234.567-8`, `16234567-8`, `162345678`): se normaliza a `16234567-8`; dígito verificador inválido → `INVALID_INPUT` con mensaje "RUT inválido". RUT duplicado en cuentas o personas → `CONFLICT` con el nombre del registro existente.
- Contacto principal: marcar uno desmarca al anterior; archivar al principal deja la cuenta sin principal (permitido, con aviso en la UI).
- Instalación con dirección que no geocodifica: se guarda sin coordenadas; la ficha muestra "Sin ubicación" y la acción "Ubicar en el mapa" (reintento manual).
- Puesto con `horaFin ≤ horaInicio`: cruza medianoche; la UI lo muestra ("20:00–08:00 (+1)"). Patrón 0×N o N×0 → `INVALID_INPUT`.
- Vínculo vigente ya existente al crear otro: error claro; primero `terminar`. Persona sin vínculo vigente puede existir (`inactiva`), y puede tener estructura nivel persona igualmente (se resuelve solo con vínculo y puesto).
- Estructuras: solape de vigencias en el mismo nivel y referencia → `UNPROCESSABLE`; nueva versión con `vigenteDesde` anterior a la vigente actual → `UNPROCESSABLE`; nivel `persona` sin motivo → `INVALID_INPUT`. Gratificación legal con tope: `min(25 % del base, 4,75 × IMM / 12)`; el IMM es ajuste de plataforma con vigencia (`remuneraciones.imm`) y la UI muestra el valor usado.
- Documento subido pero nunca confirmado: queda `pendiente`, no aparece en listas; trabajo diario borra el objeto y archiva el registro a las 24 h. Objeto más grande que lo declarado o MIME distinto → `confirmar_subida` falla y borra el objeto.
- Dos subidas con el mismo SHA-256 en el tenant: se permite y se informa `duplicadoDe` (no se bloquea: el mismo certificado puede vincularse a dos entidades por `referencia`).
- Tipo de documento sin vencimiento con `venceEn` → `INVALID_INPUT`. Vencimiento en el pasado al subir → permitido con aviso (ya vencido).
- Evento sin reglas ni plantilla activa: se publica al outbox y se marca `omitido` en envíos (silencio por defecto); los transaccionales siempre se envían. Variable no declarada en una plantilla → `INVALID_INPUT` al guardar y al previsualizar.
- Consumos sin precio en `precios_recursos`: costo 0 y aviso en Plataforma; presupuesto 0 o nulo = sin límite. Presupuesto alcanzado a mitad de una ejecución: la ejecución en curso termina; la siguiente recibe `BUDGET_EXCEEDED`. El 1 del mes se reinicia.
- Aprobación de una capacidad cuyo input ya no es válido (la entidad cambió): `aprobar` devuelve el error de la capacidad y la aprobación queda `rechazada` con ese motivo. Aprobaciones vencen a las 72 h por trabajo.
- Outbox: un consumidor que falla no bloquea a los demás; reintentos exponenciales hasta 5; después `error` visible en Plataforma con "reintentar". Idempotencia por `(evento, consumidor)`.
- Bitácora: dos hechos simultáneos del mismo tenant serializan por el `FOR UPDATE` de la cabeza; si la cadena se rompe, `verificar` devuelve `primeraRota` y el trabajo emite `core.bitacora.rota`.
- Integración en modalidad `propia` sin secreto: `estado = no_configurada`; el adaptador cae a plataforma solo si la modalidad es `plataforma`. Sin credencial de plataforma (variable ausente): `probar` falla con mensaje claro y la UI muestra "No disponible en este entorno".
- Transacción con `set_config`: si una capacidad abre `ctx.transaccion` y dentro usa `ctx.db` (que abre otra transacción), funciona pero no es atómico; la regla (`CLAUDE.md`) dice: dentro de `transaccion`, solo `tx`. Un test lo cubre con un espía que falla si `ctx.db` se usa dentro de `transaccion`.
- Next 16: `after()` para el medidor sigue valiendo; los route handlers de cron se marcan `runtime = "nodejs"` y `maxDuration = 60`.
- Vercel cron: si el plan no permite `*/5`, usar `*/15` y anotarlo.

## 11. Plan de implementación

Un commit por bloque con gate verde (`pnpm typecheck && pnpm lint && pnpm test`; `pnpm test:db` en los bloques que tocan base, en CI si el entorno no tiene Postgres). Prefijos: `core:`, `ds:`, `infra:`, `docs:`. Todo en la rama `brief/02-maestros-y-servicios`; push al final de cada bloque. Al cerrar cada sesión: revisión del diff por un subagente independiente contra este brief, los criterios de aceptación y `CLAUDE.md`; correcciones; PR (uno por sesión, o el mismo PR actualizado) e integración a `main` por rebase cuando CI pasa, conservando los commits por bloque (ADR-035). Nunca push directo a `main`.

### Sesión A — base (bloques 0 a 4)

#### Bloque 0 · Lectura y verificación

Leer `CLAUDE.md`, `ESTADO.md`, ADR-017 a ADR-033, `docs/2.0/extraccion/maestros.md` e `integraciones-y-configuracion-por-tenant.md`. Verificar en `node_modules` o el registro: Zod 4 `.meta()` y `z.toJSONSchema`; `radix-ui` unificado (exports y tree-shaking) o paquetes individuales; `cmdk`, `sonner`, `aws4fetch` (versiones estables); Next 16 `after()`, `experimental.optimizePackageImports`, `runtime`/`maxDuration` en route handlers, cron de Vercel (`vercel.json` `crons`). Registrar versiones en `ESTADO.md` al cerrar.

#### Bloque 1 · Rendimiento base (`core:` / `infra:`)

1. `sideEffects` en `@opai/ds`, `@opai/domain`, `@opai/auth`, `@opai/capabilities`; `experimental.optimizePackageImports: ["@opai/ds"]`.
2. Acceso sin cliente de Better Auth: `packages/auth/src/acciones.ts` (`iniciarSesionConPassword`, `iniciarSesionGoogle`, `cerrarSesion`, `cambiarPassword`, `pedirRecuperacion`, `restablecerPassword`) sobre `auth.api.*` con `headers()`; Server Actions en `apps/web/app/_acciones/auth.ts` con rate limit; formularios con `useActionState`; eliminar `packages/auth/src/client.ts` y su export; `Shell` usa la acción de cerrar sesión.
3. `ListScreen` con `href(item)`; `Tabs` con `href`/`activa` (sin estado interno cuando hay `href`); patrones sin `"use client"` salvo donde haya hooks.
4. `scripts/presupuesto-js.ts` (lee `.next/build-manifest.json` y `server/app/**/page_client-reference-manifest.js`, gzip con `node:zlib`, imprime tabla y compara con `apps/web/presupuesto-js.json`; falla si los manifests no existen) y `pnpm presupuesto`; job `build` en CI con variables ficticias (`DATABASE_URL` inválida pero bien formada, `BETTER_AUTH_SECRET` de prueba) seguido de `pnpm presupuesto`.
5. Medir y anotar en `ESTADO.md` el antes/después de `/login`, `/` y `/configuracion/usuarios`. Criterio: `/login` ≤ 152 KB.

#### Bloque 2 · Base de datos (`core:`)

Modelos de la sección 6, `enTransaccion`/`TenantTx`, migración con el SQL manual, seeds (cargos y tipos de documento por vertical en `seed-dev-tenant.ts`; `seed-maestros-demo.ts` con los datos ficticios del Design Prompt, solo `dev`), `precios_recursos` iniciales (correo, geo, IA por 1.000 tokens, almacenamiento por GB·mes, mcp/api por 1.000 llamadas; valores en `docs/2.0/precios-recursos.md`). Tests de RLS por tabla, triggers de bitácora, transacción. Aplicar en `dev`; `pnpm test:db` verde.

#### Bloque 3 · Dominio (`core:`)

- `rut.ts`: `normalizarRut`, `formatearRut`, `rutValido`, `digitoVerificador` (módulo 11, K).
- `telefono.ts`: normalización chilena a E.164 (`+56 9 …`, fijos con código de área) y formato visible.
- `direccion.ts`: tipos y `formatearDireccion`.
- `turnos.ts`: `intervaloTurno(horaInicio, horaFin)` → minutos y cruce de medianoche; `patronValido`.
- `estructuras.ts`: `resolverEstructura(fecha, { persona, puesto, cargo })`, `gratificacionLegal(base, imm)`, `haberes(estructura)` (base + colación + movilización + gratificación + ítems; imponible/no imponible), `solapan(a, b)`.
- `vigencia.ts`: `estadoVigencia(venceEn, hoy, diasAlerta)` → `vigente | por_vencer | vencido | sin_fecha` y `hitoAlcanzado(venceEn, hoy, hitos, ultimoNotificado)`.
- `canon.ts`: `jsonCanonico(valor)` (claves ordenadas, sin `undefined`), `sha256Hex`, `hashEncadenado(previo, canon)`.
- `plantillas.ts`: `renderizar(plantilla, variables, declaradas)` con escape HTML y error por variable desconocida; `variablesUsadas`.
- `presupuesto.ts`: `umbralAlcanzado(usado, presupuesto, previo)` → `80 | 100 | null`.
- `permisos.ts`: permisos nuevos y patrones (sección 4.16).
Tests por archivo (sección 12).

#### Bloque 4 · Servicios del núcleo I (`core:`)

`Contexto` con `transaccion`, `eventos`, `trabajos`, `medidor`, `principal`; `executeCapability` mide con el medidor (`capacidad.ejecucion`) y mantiene auditoría; `Capacidad.portales`; `EVENTOS_CORE`; outbox (`emitir`, despacho con consumidores e idempotencia); trabajos (`defineTrabajo`, `encolar`, runner con `SKIP LOCKED`, reintentos, programador); medidor en base con `after()` en el borde; bitácora (`registrarHecho(tx, …)`, `verificarCadena`) y comprobantes (`emitirComprobante`, ruta `/verificar/[token]`); `core.bitacora.verificar`, `platform.trabajos.*`, `platform.eventos.list`, `platform.consumos.summary`, `core.consumos.*`; rutas de cron con `CRON_SECRET`; `telemetriaDiferida` → `medidorDiferido`. Tests con contexto falso (sección 12). `CLAUDE.md`: regla "dentro de `transaccion`, solo `tx`".

### Sesión B — maestros y servicios (bloques 5 a 9)

#### Bloque 5 · Secretos e integraciones (`core:`)

`packages/integrations/src/secretos` (envelope AES-256-GCM, KEK por variable, DEK por tenant, rotación con script), `catalogo.ts`, adaptadores `correo` (Resend por `fetch`, BYOK o plataforma; layout HTML con marca), `geo` (Places autocompletado, Geocoding, Static Maps por proxy; clave de plataforma o propia), `ia` (Anthropic, OpenAI, Google por `fetch`; `completar({ clase, system, prompt, maxTokens })` con proveedor/modelo por clase desde ajustes; tokens y costo al medidor), `almacenamiento` (R2 con `aws4fetch`: `urlSubida`, `urlDescarga`, `head`, `eliminar`). Capacidades `core.integraciones.*`, `core.geo.*`, `core.ia.probar`, `platform.integraciones.estado`. Contexto falso con `almacenamiento` y `geo` en memoria. Tests de cifrado (ida y vuelta, tag alterado, rotación) y de medición.

#### Bloque 6 · Maestros (`core:`)

Capacidades de cuentas, contactos, instalaciones, puestos, personas, vínculos, cargos, estructuras y `core.buscar` (sección 7) con eventos en transacción, `ids_externos` (helper `registrarIdExterno`), geocodificación al crear/actualizar instalación (adaptador falso en tests). Tests por entidad: validación (RUT, email, teléfono), permisos por rol (incluido `read_sensible`), `dryRun` sin escribir, auditoría y evento emitido, reglas (principal único, vínculo vigente único, solapes, archivar con dependencias).

#### Bloque 7 · Documentos (`core:`)

Tipos (seed por capa: empresa: `os10_empresa`, `patente`, `seguro_rc`; cuenta: `contrato_servicio`, `orden_compra`; instalación: `protocolo`, `plano`, `autorizacion`; persona: `cedula`, `contrato_laboral`, `os10`, `antecedentes`, `examen_preocupacional`, `foto`; puesto: `descripcion_puesto`; marca: `marca.logo`, `marca.favicon` en capa `empresa`), flujo de subida y confirmación con bitácora, vínculos, descarga firmada, `update`, `archive`, `vencimientos`, trabajo diario de vencimientos con hitos y eventos `core.documento.por_vencer/vencido`, trabajo de limpieza de pendientes. Tests con almacenamiento falso (confirmación valida tamaño y MIME; versión; duplicado por hash informado; hitos no se repiten).

#### Bloque 8 · Configuración, empresa, marca y comunicaciones (`core:`)

`defineAjustes` con `.meta()` y registro; ajustes del núcleo (empresa, comunicaciones: remitente y CCO por área, documentos: `tamano_maximo_mb`, preferencias de usuario: tema, silencio, resumen); `core.config.*`; `core.empresa.*`, `core.marca.*` y `/api/marca/[slug]/[asset]`; catálogo de eventos comunicables con variables y plantillas por defecto (`core.usuario.invitado`, `core.usuario.recuperacion`, `core.documento.por_vencer`, `core.documento.vencido`, `core.aprobacion.pendiente`, `core.agente.presupuesto_80`, `core.agente.presupuesto_100`, `core.integracion.error`, `core.bitacora.rota`); plantillas, reglas, inbox, envíos; consumidor de Comunicaciones (evento → reglas → destinatarios → plantilla → canal → `envios`), con `inapp` siempre disponible; migrar invitación y recuperación a plantillas transaccionales (misma información que hoy, con marca). `platform.ajustes.*` (precios, `ia.modelos`, `remuneraciones.imm`). Tests: render y validación de plantillas, ruteo (sin regla → omitido; transaccional → enviado), valores efectivos por ámbito, `set` con permiso de usuario propio.

#### Bloque 9 · Agentes (`core:` / `docs:`)

`api_keys` con principal, presupuesto y autonomía; `contextoDeApiKey` con `principal` y presupuesto; `executeCapability` con `BUDGET_EXCEEDED` (402) y `APPROVAL_REQUIRED` (202) + auditoría de intentos; `core.apikeys.update/set_autonomia`, `core.aprobaciones.*`, trabajo de expiración; eventos de presupuesto; `herramientasMcp` sin cambios de nombres, con `portales`; **recursos MCP**: `opai://manuales/operar-el-nucleo` (contenido de `docs/2.0/agentes/operar-el-nucleo.md`) y `opai://ajustes/schema`; escribir el manual (objetivo, autenticación, `core_me`, cómo leer maestros, cómo crear cuenta/instalación/persona con `preview_`, cómo subir un documento con la URL firmada, cómo leer y cambiar configuración, qué devuelve `APPROVAL_REQUIRED` y qué hacer, qué devuelve `BUDGET_EXCEEDED`, cuándo detenerse). Escenario determinista del manual en `packages/capabilities/test/manuales/operar-el-nucleo.test.ts` (ADR-034): ejecuta, con `contextoDePrueba` y `herramientasMcp`, la misma secuencia que el manual describe (`core_me` → `core_cuentas_list` → `preview_core_cuentas_create` → `core_cuentas_create` → `core_documentos_iniciar_subida` → `core_config_get` → una irreversible que devuelve `APPROVAL_REQUIRED`) y falla si una herramienta nombrada en el manual no existe o cambia de forma. Tests: presupuesto (umbrales, corte), aprobación (crea pendiente sin ejecutar; `aprobar` ejecuta y audita; `rechazar`; key no puede aprobar; vencida), `preview_` de una irreversible no crea aprobación, `externo()` aparece en la descripción MCP.

### Sesión C — diseño (bloques 10 a 12) — **STOP si no existe `docs/2.0/design/export-maestros/`**

#### Bloque 10 · DS 2.0 sobre Radix y componentes nuevos (`ds:`)

Instalar `radix-ui` (o individuales), `cmdk`, `sonner` solo en `packages/ds`. Reescribir `Menu`, `Dialog`, `Sheet`, `Switch`, `Tabs` (por ruta), `PortalSwitcher` (sobre `Menu`); crear `Select`, `Combobox`, `CommandPalette`, `Popover`, `Tooltip`, `Checkbox`, `RadioGroup`, `Toast` (+ `Toaster` en el layout), `FilaSeleccionable`, `InputFecha`, `Uploader`, `CampoSecreto`, `CampoDireccion`, `MapaEstatico`, `Timeline`, `Vigencia`, `AjustesForm`; patrón `SplitScreen`. `/ds` muestra cada uno con estados en claro y oscuro (capturas). Regla de ESLint a **error** en `apps/web/app/**` y corregir lo que quede (fila de `elegir-empresa` → `FilaSeleccionable`). Verificar que ningún componente sin hooks lleve `"use client"` y que el presupuesto no suba más de 10 KB en `/`.

#### Bloque 11 · Pantallas de maestros (`core:`)

Navegación nueva; cuentas, contactos, instalaciones y puestos, personas, vínculos y estructura efectiva, cargos y sueldos, ficha de documentos con subida directa y vista previa, actividad; ⌘K y campana en el shell; `core.me` ampliado. Playwright `maestros.spec.ts`: crear cuenta → contacto → instalación → puesto → persona con vínculo → subir documento (archivo pequeño generado) → ver vigencia; a 375 y 1024 con capturas; comparar con el export.

#### Bloque 12 · Centro de Configuración y Plataforma (`core:`)

Índice y 13 secciones (sección 8), `AjustesForm` conectado, migración de Usuarios, API keys y Empresa (redirecciones desde las rutas viejas), "Conectar tu IA" con snippets (Claude, ChatGPT, Grokbot, Codex) y enlace al manual; Plataforma ampliada. Playwright `configuracion.spec.ts`: índice, Marca (subir logo), Agentes (presupuesto, autonomía), Aprobaciones (aprobar una creada en test), Integraciones (correo: probar con adaptador de consola), Comunicaciones (editar plantilla y previsualizar), Consumos; a 375 y 1024.

### Sesión D — infraestructura y cierre (bloques 13 a 15)

#### Bloque 13 · Infraestructura (`infra:`) — **STOP** para aprobar en el navegador

Desde el Mac con las CLIs: crear el bucket R2 `opai-2-test` (`wrangler r2 bucket create`) con CORS (`wrangler r2 bucket cors put` con `test.opai.cl` y `localhost:3000`) y un token de API con permiso solo a ese bucket; generar `OPAI_SECRETS_KEY` (`openssl rand -base64 32`) y `CRON_SECRET`; crear en Vercel (production y preview) `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `OPAI_SECRETS_KEY`, `CRON_SECRET`, `GOOGLE_MAPS_SERVER_KEY` (clave nueva en Google Cloud restringida a Places, Geocoding y Static Maps; si Carlos no la tiene a mano, dejar la integración "no disponible" y anotarlo), y opcionalmente `ANTHROPIC_API_KEY` de plataforma; `vercel.json` con crons (`/api/cron/trabajos` `*/5 * * * *`, `/api/cron/programador` `0 9 * * *` UTC = 06:00 Santiago); workflow `preview.yml` (en `pull_request` abierto/sincronizado: crea o reutiliza la rama Neon `preview/pr-<n>` desde `main` con la acción oficial de Neon, corre `prisma migrate deploy` contra ella con la URL propietaria, fija `DATABASE_URL` de preview para la rama git con `vercel env add`; en cerrado: borra la rama Neon y la variable) con secretos `NEON_API_KEY`, `NEON_PROJECT_ID`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` creados con `gh secret set` (valores tecleados localmente, nunca impresos); aplicar la migración en Neon `main` (`pnpm db:deploy`); correr seeds de cargos, tipos y precios en `main`; `vercel --prod` y verificar `/api/health`, `/login` (200 y presupuesto), `/configuracion` (302 a login), `/api/cron/trabajos` sin secreto (503/401), `/verificar/x` (404 limpio).

#### Bloque 14 · Verificación guiada — **STOP**

Pedir a Carlos que en `test.opai.cl`: (1) entre como owner de Gard y recorra Configuración (Empresa, Marca con un logo, Comunicaciones: active "Documento por vencer" para owners, Integraciones: pruebe correo); (2) cree una cuenta, una instalación con dirección real geocodificada y un puesto, una persona con vínculo y una excepción de sueldo con motivo; (3) suba un documento con vencimiento y vea la vigencia; (4) desde Grokbot (key existente): `core_me` (debe traer `principal`), `core_cuentas_list`, `preview_core_personas_create`, `core_personas_create` real (auditado "agente vía Carlos"), `core_vinculos_terminar` → debe recibir `APPROVAL_REQUIRED`; Carlos aprueba desde Configuración → Aprobaciones y verifica que se ejecutó a su nombre con referencia al agente; (5) fije un presupuesto de US$ 1 a una key de prueba y compruebe `BUDGET_EXCEEDED` al superarlo (con `core_ia_probar` si hay key de IA; si no, bajar el precio de `capacidad.ejecucion` en ajustes de plataforma durante la prueba y restaurarlo). Anotar hallazgos; corregir lo que sea del brief antes del bloque 15.

#### Bloque 15 · Estado y reporte (`docs:`)

`ESTADO.md` (hecho, versiones, decisiones, pendientes, medición de presupuesto antes/después), ADR-036 a ADR-039 en `01-decisiones.md`, `CLAUDE.md` (comandos nuevos: `presupuesto`, `seed:maestros-demo`, `rotar-kek`; reglas: transacción y `tx`, eventos y consumidores, ajustes con `.meta()`, documentos solo por `core.documentos`, nada de SDKs de proveedores, Server Actions para acceso, `href` en listas, tabs por ruta), `.env.example`, `CONTEXTO-agentes.md` (recursos MCP, `APPROVAL_REQUIRED`, `BUDGET_EXCEEDED`, manual), `docs/2.0/agentes/README.md`, plantilla de módulo (`manifest.ts.tpl` con `configuracion` y `eventos` de ejemplo).

Textos de los ADR (resumen; redactar en el formato del registro):

- **ADR-036 · Puestos de servicio y vínculos laborales en el núcleo.** El puesto (instalación + cargo + patrón + horario + dotación) lo necesitan CPQ, Operaciones, Asistencia y Nómina → núcleo; el patrón de turno va en el puesto, no en una entidad aparte. El vínculo laboral (cargo, tipo, inicio, término) lo necesitan Operaciones, Asistencia, Nómina, Documentos y portales → núcleo; previsión y bancos son de Nómina. Las estructuras de sueldo se versionan por vigencia sin solapes; el nivel persona exige motivo.
- **ADR-037 · Presupuesto de JavaScript por ruta.** Medición por manifests del build (gzip, sin polyfills) con gate en CI; presupuestos por ruta; server-first; acceso por Server Actions sin cliente de auth; `sideEffects` y `optimizePackageImports`; islas cliente diferidas; cualquier dependencia de cliente nueva se justifica en el brief con su tamaño.
- **ADR-038 · Ámbitos del centro de Configuración y ajustes declarativos.** Se agregan Marca, Preferencias, Agentes y API keys, Aprobaciones, Consumos y Auditoría a ADR-018; los esquemas de ajustes llevan metadatos con Zod `.meta()`; `core.config.*` es la única vía (UI, API, MCP).
- **ADR-039 · Documentos con subida directa, verificación y bitácora.** URL firmada PUT/GET de corta duración con `aws4fetch`; `pendiente → disponible` con verificación de tamaño, MIME y SHA-256; registro del hecho en la bitácora encadenada; versiones por `reemplazaA`; duplicados por hash permitidos e informados.

## 12. Tests obligatorios

- **Dominio** (`packages/domain/src/*.test.ts`): `rut` (normalizar, formatear, DV, K, inválidos), `telefono`, `turnos` (cruce de medianoche, patrones), `estructuras` (resolución en los tres niveles y por fecha; gratificación legal con tope; haberes con ítems imponibles; solapes), `vigencia` (estados e hitos sin repetición), `canon` (orden de claves, `undefined`, cadena de hashes reproducible), `plantillas` (variables, escape, desconocidas), `presupuesto` (80/100 una vez), `permisos` (tabla actualizada por rol; supervisor lee maestros; gerente sin sensibles).
- **Base** (`packages/db/test`): RLS en **todas** las tablas nuevas (iterando el catálogo de Postgres), triggers de bitácora (UPDATE/DELETE/TRUNCATE rechazados para el propietario y para `opai_app`), `enTransaccion` fija el tenant y revierte en error, índices parciales (duplicado de RUT, segundo vínculo vigente) rechazados, `CHECK` de estructuras.
- **Capacidades** (`packages/capabilities/test`): un archivo por entidad y servicio: `cuentas`, `contactos`, `instalaciones`, `puestos`, `personas`, `vinculos`, `cargos`, `estructuras`, `buscar`, `documentos`, `documento-tipos`, `config`, `empresa-marca`, `comunicaciones`, `notificaciones`, `integraciones`, `geo-ia`, `consumos`, `eventos` (outbox, consumidores, idempotencia), `trabajos` (reclamo, reintentos, programador), `bitacora` (cadena, verificación, comprobante), `aprobaciones`, `presupuesto`, `execute` ampliado (medidor, `APPROVAL_REQUIRED`, `BUDGET_EXCEEDED`, `portales`), `mcp` (recursos, `preview_` de irreversibles sin aprobación, campos `externo()` en la descripción), `define` (todas las capacidades nuevas cumplen `DESCRIPCION_MINIMA`), `manuales/operar-el-nucleo` (escenario determinista del manual, ADR-034).
- **Integraciones** (`packages/integrations`): secretos (ida y vuelta, tag alterado falla, rotación de KEK), firma de URLs (forma y expiración), adaptadores con `fetch` simulado (correo, geo, IA por proveedor, medición de tokens).
- **Web** (`apps/web/test`): acciones de acceso (login correcto, incorrecto, rate limit, suspendida), `presupuesto-js` (lee manifests de ejemplo y falla al exceder), cron sin secreto, `/verificar/[token]` válido e inválido, `/api/marca` solo sirve tipos de marca.
- **Playwright**: `maestros.spec.ts`, `configuracion.spec.ts` (bloques 11 y 12) y `acceso.spec.ts` actualizado al flujo con Server Actions; a 375 y 1024 con capturas.

## 13. Validación

- Gate verde local y en CI (typecheck, lint con la regla en error, test, test:db contra `dev`, build + presupuesto).
- `pnpm presupuesto` dentro de los límites de `presupuesto-js.json`; registrar la tabla antes/después en `ESTADO.md`.
- Revisión visual a 375, 1024 y 1280 en claro y oscuro de: cuentas (lista y detalle), instalación (detalle con mapa y puestos), persona (resumen, laboral con cascada, documentos), cargos, ficha de documentos (subida, vista previa), Configuración (índice, Empresa, Marca, Agentes, Aprobaciones, Integraciones, Comunicaciones, Consumos), comparadas lado a lado con `export-maestros`. Auditoría de accesibilidad (contraste AA, foco, nombres accesibles) en esas pantallas; Lighthouse ≥ 90 en `/login`, `/cuentas` y `/configuracion` a 375 (manual, anotar valores).
- `grep` de hex fuera de `tokens.css` vacío; ningún archivo > 150 líneas; ningún secreto en repo ni consola; ningún `process.env` de credencial de tenant fuera de `packages/integrations`; ningún import de `radix-ui`/`cmdk`/`sonner` fuera de `packages/ds`.
- MCP manual (bloque 14) y verificación de la cadena de bitácora en `main` (`core_bitacora_verificar` → `ok: true`).
- Previews: abrir un PR de prueba y comprobar que el preview de Vercel usa su rama Neon (en `/api/health` devolver el nombre de la rama solo fuera de producción).

## 14. Criterios de aceptación

- [ ] Cuentas, contactos, instalaciones, puestos, personas, vínculos, cargos y estructuras en tres niveles operables por UI, `/api/v1` y MCP con los mismos permisos, `preview_` y auditoría; RUT validado; resolución efectiva correcta por fecha.
- [ ] Documentos: subir, confirmar (tamaño, MIME, SHA-256), vincular, versionar, descargar con URL firmada, vigencias con hitos y eventos; registro en bitácora verificable; ficha en cuentas, instalaciones y personas.
- [ ] Configuración: una sola entrada, índice por ámbitos, secciones de la sección 8 funcionando, `AjustesForm` desde esquemas con `.meta()`, Usuarios/API keys/Empresa migrados con redirecciones; `core.config.*` por MCP.
- [ ] Empresa y marca persistidas; el logo del tenant aparece en los correos.
- [ ] Comunicaciones: plantillas con versiones, vista previa y prueba; reglas de ruteo; silencio por defecto; invitación y recuperación por plantillas; inbox in-app con campana real; `envios` registra versión.
- [ ] Outbox y trabajos: eventos en la misma transacción, despacho con consumidores e idempotencia, runner por cron con `SKIP LOCKED` y reintentos, programador diario; observables en Plataforma.
- [ ] Integraciones: catálogo con estados; correo, geolocalización e IA con modalidad plataforma/propia; secretos cifrados (envelope) nunca expuestos; `probar` y consumo medido.
- [ ] Consumos: toda ejecución y todo recurso medido en `core.consumos`; consolidación diaria; resumen por recurso y agente; `usage_events` ya no se escribe.
- [ ] Agentes: `principal` en keys, `portales` en capacidades, presupuesto con avisos 80/100 y corte, autonomía por capacidad, `APPROVAL_REQUIRED` con cola de aprobaciones que ejecuta a nombre del aprobador, recursos MCP con el manual.
- [ ] DS: primitivas Radix, componentes nuevos y `SplitScreen` en `/ds` con estados; regla de ESLint en error; sin `<select>`/`<dialog>` nativos.
- [ ] Rendimiento: `/login` ≤ 152 KB gzip (≤ 140 KB tras la sesión C), rutas del ERP ≤ 165 KB, Configuración ≤ 170 KB; `pnpm presupuesto` en CI; sin cliente de Better Auth en el bundle.
- [ ] Infra: R2 con CORS, variables, crons, previews por PR con rama Neon efímera, migración y seeds en `main`, deploy verificado.
- [ ] Verificación guiada del bloque 14 completada por Carlos, incluida una aprobación de agente y un corte por presupuesto.
- [ ] `ESTADO.md`, ADR-036 a 039, `CLAUDE.md`, `.env.example`, `CONTEXTO-agentes.md`, manual de agentes y plantilla de módulo actualizados.

## 15. Riesgos y rollback

- **Tamaño del brief**: cuatro sesiones; cada bloque es un commit y deja el repo en verde. Si una sesión se corta, el siguiente brief parte de `ESTADO.md`.
- **Radix/cmdk/sonner con API distinta a la conocida** o `radix-ui` unificado sin tree-shaking: usar paquetes individuales y reportar; el presupuesto decide.
- **Better Auth por Server Actions**: si `auth.api.signInEmail` no fija la cookie en una acción con esta versión, aislar en un route handler propio (`/api/acceso/entrar`) que devuelva `Set-Cookie` y mantener el objetivo (sin cliente en el bundle); reportar.
- **Transacciones con `set_config`**: validar con `test:db` que la política RLS ve el valor dentro de `$transaction` interactiva antes de construir el outbox encima.
- **Cron de Vercel**: límites del plan; alternativa `*/15` o invocación por GitHub Actions `schedule` con el secreto.
- **Google Maps**: sin clave, la integración queda "no disponible"; nada más depende de ella (coordenadas opcionales).
- **Sentry y CSP**: no entran por presupuesto de JS y alcance; se registran en `ESTADO.md` como pendientes de Brief 03 (errores de servidor con `instrumentation.ts` y logs estructurados con `tenant_id` y `capability` sí entran aquí, dentro del medidor).
- **Rollback**: migración aditiva (revertir el commit deja tablas vacías; `usage_events` sigue intacta); R2 y variables se pueden retirar sin tocar datos; las redirecciones de Configuración se conservan si se revierte el centro.
- No tocar OPAI 1.0 ni Grokbot más allá de la verificación del bloque 14.

## 16. Reporte de ejecución

Reglas de ejecución (ADR-035): sesión por sesión y bloque por bloque, en orden, sobre `brief/02-maestros-y-servicios`. Antes de editar: `CLAUDE.md`, `ESTADO.md`, ADR-017 a ADR-035 y `docs/2.0/extraccion/maestros.md`; confirmar los hechos técnicos del bloque 0. El repositorio y la documentación instalada de cada librería son la fuente final de verdad: ante contradicción, conservar el objetivo funcional, adaptar y reportar. Sin acciones destructivas ni cambios en OPAI 1.0; sin secretos impresos. Detenerse solo en los **STOP** (sesión C sin export aprobado; bloques 13 y 14) y antes de cualquier acción de alto impacto (migración en `main`, infraestructura, gasto). Gate antes de cada commit; `ESTADO.md` actualizado al cerrar cada sesión, no solo al final.

Al cerrar cada sesión se reporta en cuatro líneas y se anota en `ESTADO.md`:

1. **Qué se implementó:** bloques cerrados y lo que cambió de forma funcional (capacidades, tablas, pantallas, servicios).
2. **Commits integrados:** hash y mensaje por bloque; PR y estado de CI (typecheck, lint, test, test:db, build + presupuesto).
3. **Validaciones y resultado:** tests por paquete (cantidad y verde/rojo), `pnpm presupuesto` (tabla antes/después), capturas y revisión visual cuando aplica, revisión del subagente (hallazgos y correcciones).
4. **Pendiente o riesgo material:** lo que quedó fuera, desvíos respecto del brief con su justificación, decisiones tomadas durante la ejecución (que van también a `ESTADO.md` → "Decisiones tomadas durante la ejecución") y el siguiente paso propuesto.

| Sesión | Bloques | Commits | CI | Reporte |
|---|---|---|---|---|
| A | 0–4 | `2c9eb6f`, `7c41289`, `ebdba13`+`1120bff`, `92d5ee5`, `4241a2f`, `6eef282` | PR #2 verde | hecha; integración a `main` espera las migraciones en Neon |
| B | 5–9 | `9828a1f`, `98fe0d8`, `9d344d4`, `996c243`, `1091967`, `6f841d4`, `169ebbc`, docs | PR sobre A | hecha; misma condición |
| C | 10–12 | — | — | pendiente (exige export aprobado) |
| D | 13–15 | `169ebbc` (preparación sin secretos) | — | detenida en 13: pasos de Carlos en `ESTADO.md` → En curso |

### Sesiones A y B (23-oct)

1. **Qué se implementó:** bloques 0–9 completos (ver `ESTADO.md` → Hecho). Además de lo pedido: idempotencia real (antes solo se anotaba en auditoría), trigger de mismo tenant para referencias, `soloPersonas` para el gobierno de agentes y rotación de KEK.
2. **Commits:** tabla de arriba. CI de A (PR #2): typecheck, lint, test, test:db, build y presupuesto en verde.
3. **Validaciones:** 310 tests en `pnpm test`; `test:db` con 24 tests de base y 6 archivos de capacidades contra Postgres 16 (RLS con rol sin BYPASSRLS, triggers, transacciones, idempotencia, documentos con bitácora, comunicaciones desde el outbox, aprobación de agentes, rotación de KEK); presupuesto de JS sin cambios de peso (`/login` 150,1 KB); Playwright 48/51 local. Dos revisiones independientes: A (7 importantes) y B (1 crítico, 9 importantes), corregidas.
4. **Pendiente:** sesión C (sin export de diseño); sesión D detenida antes de infraestructura y de la migración en `main`; menores de la revisión B en `ESTADO.md` → Riesgos; verificar con R2 real la huella firmada en el PUT.
