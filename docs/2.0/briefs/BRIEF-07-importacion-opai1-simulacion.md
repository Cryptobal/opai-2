# BRIEF 07 — Importación comercial desde OPAI 1.0: simulación (Bloque B)

**Repositorio:** `Cryptobal/opai-2` · **Rama:** `brief/car-importacion-opai1-simulacion` (desde `main` `b1612ab`) · **Fecha:** 28-oct-2026 · **Estado:** encargado por Carlos el 28-oct-2026 (Bloque B: «solo la simulación; la carga real cuando el CRM esté completo y con mi OK; se importa todo el historial, son menos de 24 meses; cotizaciones fuera») · **Tarea:** CAR-n por asignar (`Fixes CAR-n` en el PR) · **Reglas:** ADR-010, ADR-040 §5, R28 de `modulos/comercial.md`, `extraccion/comercial-y-cpq.md` §6, `REGLAS-codigo.md` («Migraciones de datos después de FORCE RLS», `dbAdmin()`), Ley 21.719.

## 1. Objetivo

Tener un script que **simula** la importación de los datos comerciales de 1.0 (cuentas, contactos, instalaciones y, cuando exista el schema comercial, negocios, etapas e historial) sobre un tenant de 2.0 y entrega un **plan** y un **reporte** sin escribir nada. Se nota que funciona cuando, con un origen de prueba, el reporte dice cuántas filas se crearían, actualizarían, quedarían sin cambios, en conflicto u omitidas (con motivo), qué fusiones se proponen y qué falta resolver, sin un solo dato personal en la consola ni en el JSON; y cuando, con los ids externos ya mapeados, todo sale «sin cambios» (CA10, R28).

## 2. Estado actual del repo (verificado en `b1612ab`)

1. `core.cuentas`, `core.contactos` y `core.instalaciones` existen (`packages/db/prisma/schema/maestros.prisma`). `Contacto` tiene **un solo** `cuentaId`; `core.contacto_cuentas` (persona N–N, ADR-040 §5) llega con el CRM PR 2. `Contacto.roles` documenta `comercial | operacional | facturacion | cobranza` (sin `cesion`).
2. `core.ids_externos` (`IdExterno`: `entidadTipo`, `entidadId`, `sistema`, `idExterno`, único por tenant+sistema+tipo+id) existe y sirve para el mapeo `opai1`.
3. `@opai/domain` tiene `normalizarRut` y `normalizarTelefono` (E.164 Chile). **No** existe un `canon` de nombres: el `canon.ts` de dominio es el JSON canónico de la bitácora. La extracción (§6) cita «`canon` de `@opai/domain`»; este brief define `nombreCanonico` dentro del script y deja la pregunta de si sube al dominio.
4. El schema comercial (`comercial.prisma`: pipelines, etapas, negocios, puentes) **no está en `main`**; llega con el CRM PR 1.
5. No hay lector de 1.0. La key dedicada de 1.0 no existe todavía en 2.0.

## 3. Alcance

### Incluido

- `packages/db/scripts/importar-opai1/**`: lector de origen abstracto con implementación por **fixtures JSON** (validadas con Zod) y un **stub** del lector por API/MCP de 1.0 que falla con «no configurado».
- Transformación **pura**: normalización (RUT, correo, teléfono, nombre canónico, distancia), cuentas (dedupe por RUT; sin RUT → propuesta de fusión por nombre canónico, nunca automática), contactos (correo en minúsculas, teléfono E.164, roles desde `recibe*`, principal repetido → gana el más reciente y se reporta; mismo correo en cuentas distintas → **conflicto «requiere N–N (CRM PR 2)»**, no se resuelve), instalaciones (dedupe por `place_id` o < 50 m dentro de la cuenta; sin cuenta → omitida y reportada).
- Negocios, etapas, historial y contactos del negocio: tipos y funciones puras de mapeo con tests, **detrás de la bandera** `COMERCIAL_EN_MAIN = false`: el plan solo cuenta esas filas como «pendiente de CRM PR 1». No se importa nada de `comercial.prisma`.
- **Plan** (crear / actualizar / sin cambios / conflicto / omitido con motivo) contra el estado 2.0 y `core.ids_externos` (sistema `opai1`), determinista e idempotente.
- **Reporte** JSON y resumen en consola **solo con conteos, motivos e IDs de 1.0** (ni nombres, ni RUT, ni correos, ni teléfonos).
- CLI `pnpm --filter @opai/db importar:opai1 --dry-run --tenant <slug> --origen fixtures:<ruta> [--salida <reporte.json>]`. Sin `--dry-run` se niega y explica que la carga real requiere el OK de Carlos.
- Lectura del estado 2.0 por `enTransaccion(tenantId, …)` con el rol `opai_app` (RLS), detrás de una interfaz inyectable para los tests. **Sin `dbAdmin()`**: la simulación no escribe ni cruza tenants.
- Tests Vitest sin base en `packages/db/test/importar-opai1/`, incluidos en `pnpm test` (proyecto `db-unitarios`).

### Fuera de alcance

- La **carga real** (escrituras, `ids_externos`, auditoría): otro PR, cuando el CRM esté completo y con el OK de Carlos.
- Cotizaciones/CPQ, actividades (`CrmNote`, reuniones, tareas), etiquetas de rubro/segmento/tamaño (solo se listan sus valores normalizados para que Carlos los confirme), leads y la cuenta prospecto desde `leadId`.
- El lector real por API/MCP de 1.0 (necesita la key dedicada).
- Migraciones, pantallas, capacidades, `modules/**`, `apps/web/**`, `packages/db/prisma/schema/**`.

## 4. Diseño

| Archivo | Responsabilidad |
|---|---|
| `origen.ts` | Esquemas Zod de las filas de 1.0, `LectorOrigen`, `lectorFixtures(ruta)`, `lectorApiOpai1()` (stub) |
| `normalizar.ts` | `rut`, `correo`, `telefono`, `nombreCanonico`, `distanciaMetros` |
| `destino.ts` | `EstadoDestino` (cuentas, contactos, instalaciones e ids `opai1` del tenant) y su lector por `enTransaccion` |
| `cuentas.ts`, `contactos.ts`, `instalaciones.ts` | Plan por entidad (puro) |
| `comercial-pendiente.ts` | Mapeo puro de etapas, negocios, historial y contactos del negocio; bandera `COMERCIAL_EN_MAIN` |
| `plan.ts` | Orquesta el plan completo |
| `reporte.ts` | Reporte sin datos personales y resumen legible |
| `argumentos.ts`, `cli.ts` | Argumentos (puro) y punto de entrada |

**Reglas del plan.** Cada fila de 1.0 produce una decisión con `idOpai1`, acción y motivo. Con id externo `opai1` ya mapeado: compara campos y da `sin_cambios` o `actualizar` (solo nombres de campos, nunca valores). Sin mapeo: busca la coincidencia determinista en 2.0 (RUT para cuentas, correo dentro de la cuenta para contactos, `place_id`/distancia/nombre para instalaciones) y da `actualizar` (vincula) o `crear`. Si la coincidencia ya está mapeada a otro id de 1.0, o el contacto existe en otra cuenta, da `conflicto`. Los duplicados de 1.0 por RUT, correo en la misma cuenta o ubicación se dan como `omitido` con `fusionaCon` (la carga real les registrará el id externo apuntando a la fila canónica). El orden es estable (por `createdAt` e id), así que el mismo estado da el mismo plan.

**Migración de datos después de FORCE RLS.** La simulación no escribe. La carga real deberá correr como `opai_app` con `enTransaccion` por tenant y verificar filas afectadas (o con un rol BYPASSRLS confirmado), según `REGLAS-codigo.md`.

## 5. Tests

Normalización (RUT de prueba con DV válido, correo, teléfono, nombre canónico, distancia), dedupe de cuentas por RUT, propuestas de fusión por nombre, contactos (fusión en la misma cuenta, conflicto N–N, principal repetido, roles), instalaciones (`place_id`, < 50 m, sin cuenta, nombre repetido), mapeos comerciales pendientes, idempotencia (dos planes iguales; tras aplicar el plan en memoria, todo «sin cambios»), reporte sin datos personales y negativa sin `--dry-run`.

## 6. Riesgos

- **Datos personales:** el plan en memoria tiene nombres y correos; el reporte y la consola no. Un test lo verifica sobre la salida serializada.
- **Fixtures ≠ 1.0 real:** los nombres de campo siguen el schema de 1.0 citado en la extracción; se validan contra la copia anonimizada antes de la carga real.
- **Contactos N–N:** hasta el CRM PR 2 quedan en conflicto; si son muchos, la carga real debe esperar al PR 2.
- **Consistencia del estado 2.0:** se lee en una sola transacción `RepeatableRead`.

## 7. Preguntas para Carlos

1. **Key dedicada de 1.0:** ¿la creas tú en 1.0 y la guardas en el almacén cifrado del tenant de 2.0 (ADR-027), para que el lector la tome de ahí y nunca de `.env` ni del chat?
2. **Copia anonimizada de 1.0:** ¿nos das un volcado anonimizado (RUT, nombres, correos y teléfonos reemplazados de forma consistente) para probar la simulación con volúmenes reales antes de la carga?
3. **Mismo correo en N cuentas antes del CRM PR 2:** ¿esperamos al PR 2 (recomendado: la carga real va después del CRM completo), o se importa un contacto por cuenta y se unifica después?
4. **Nombre canónico:** ¿subimos `nombreCanonico` a `@opai/domain` para que la UI de deduplicación use la misma regla?
5. **Instalaciones de leads (sin cuenta):** ¿se crean cuentas prospecto desde el lead en la carga real o quedan en el reporte?
6. **Rol `cesion`:** `recibeCesion` no tiene rol en el `Contacto` de `main`; ¿se espera al vínculo del PR 2?
