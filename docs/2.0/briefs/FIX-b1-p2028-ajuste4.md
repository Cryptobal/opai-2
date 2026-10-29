# FIX · B1 · 4.º ajuste — P2028 restantes tras el #135

Rama `fix/b1-p2028-ajuste4`, desde `main` `d3b7ede` (merge del #135). Sin migraciones, sin tocar RLS
ni permisos. Contexto de tenant solo con `set_config('app.tenant_id', …, true)`; sin SET/SET LOCAL
nuevos. Detalle y decisiones en `docs/2.0/ESTADO.md` (entrada «Pool de Neon · P2028 restantes tras el
#135 (B1, 4.º ajuste)»).

## Origen

QA en vivo del #135 en `test.opai.cl` (29-oct-2026, 15:45–15:50 CLT; informe en
`/workspace/qa/pr135/live/informe.md`, logs en `vercel-errores.txt`). 0 «timeout exceeded», 0 55P03,
pero siguen 26 P2028 en ~5,5 min (antes 310/10 min con el #134): 20 `session.findFirst` + 6
`user.findFirst` de Better Auth y capacidades del layout de `/configuracion/*`
(`core.resumen.contadores`, `core.config.schema`, `core.modules.list`, `core.cumplimiento.rat`).

## Diagnóstico (con evidencia)

- Un render de `/configuracion/*` abre **~4 transacciones de array** (Better Auth sesión + usuario;
  `forUser` membresías; `forTenant` acceso/módulos) y **hasta 5 interactivas** (`enLectura`): el
  índice corre `core.modules.list` + `core.config.schema` + `core.resumen.contadores`
  (`_centro/datos.ts`); la sección corre `core.config.schema` + `core.config.get`
  (`_centro/ajustes-datos.ts`). Cada interactiva retiene una conexión varios viajes de ida y vuelta.
- **Amplificador 1 — precarga del riel:** `LinkIndice` precargaba por intención (hover/toque/foco).
  Al pasar el cursor por el índice de ~15 secciones, Next renderizaba en el servidor secciones que
  nadie abrió, cada una con su ráfaga de capacidades contra Neon (los picos del QA en
  `/configuracion/cumplimiento/retencion` = 27 y `/configuracion/marca` = 20, nunca visitadas).
- **Amplificador 2 — revalidación del POST:** guardar una preferencia hacía
  `revalidatePath("/", "layout")`, que re-renderiza todo el layout del ERP en el POST, incluido
  `core.cumplimiento.rat` (los 2 errores del POST `/configuracion/preferencias` del QA).
- Con el pool saturado por esas interactivas, hasta las transacciones de array de Better Auth —que
  **necesitan** `SET LOCAL ROLE opai_auth` (CAR-43), no se pueden sacar de su transacción— se quedan
  sin conexión dentro del `maxWait` ⇒ P2028.

**Reproducción local:** `packages/db/test/carga-configuracion-db.test.ts` (solo `pnpm test:db`).

## Arreglos

1. **`sinDb` en capacidades** (`packages/capabilities`): una lectura que solo filtra un catálogo en
   memoria (`core.config.schema`, `core.config.buscar`) corre sin abrir la transacción de tenant de
   `enLectura`. `defineCapability` lo exige solo en `efecto: "lectura"` sin `auditarLectura`.
   Interactivas por render: ~5 → ~3.
2. **`LinkIndice` con `prefetch={false}`:** sin precarga por intención; la respuesta inmediata al
   clic la sigue dando `EstadoEnlace`.
3. **Revalidación acotada:** `ejecutarCapacidad(..., revalidar)` acepta `"ninguna"`, que
   `usePreferencias` usa para `core.config.set`. El tema se aplica en el cliente y se relee al
   navegar; guardar no revalida el layout ni re-renderiza el formulario a mitad de una ráfaga.
4. **Documentación de `DATABASE_TX_MAX_WAIT_MS` (10000) y `DATABASE_TX_TIMEOUT_MS` (15000)** en
   `.env.example` (las variables entraron con el #135; aquí se explican con defecto y recomendado).
5. **H2** (ráfaga de tema): número de secuencia por pedido (ya existía); con (3) el formulario deja
   de re-renderizarse desde el servidor a mitad de la ráfaga. Último clic gana; una respuesta vieja
   (incluso OK) no pisa el estado; si el último falla, revierte al último tema confirmado por el
   servidor con la Alerta «No pudimos guardar el tema; volvimos a X».
6. **H4:** los controles de Preferencias no se deshabilitan durante el guardado (solo hasta hidratar).

## Criterios de aceptación

1. Diagnóstico con evidencia + reproducción local del P2028 — ✅.
2. H1: hover/prefetch sin cargas pesadas (✅ `prefetch={false}`); guardar el tema no revalida el
   layout (✅ `revalidar: "ninguna"`); lecturas en memoria fuera de las transacciones interactivas
   (✅ `sinDb`); `DATABASE_TX_*` documentadas (✅ `.env.example`). Las lecturas de Better Auth no se
   sacan de su transacción (requieren `SET LOCAL ROLE`, CAR-43; el encargo prohíbe SET nuevos): se
   resuelven dejando de saturar el pool — **parcial explícito** frente al «una por request».
3. H2: último clic gana con secuencia, descarta respuestas viejas, revierte al confirmado con Alerta
   — ✅.
4. H3/H4/H5 solo si triviales: H4 ✅; H3/H5 ✅ en lo trivial de esta pantalla (Alerta inline montada
   solo con contenido; anillo de foco con tokens DS 2.0 en riel y radios). El `role=alert` vacío del
   QA viene de la región global del Toaster (DS), no de esta pantalla → anotado para pendientes.
5. Tests: criterio de cierre (20 renders paralelos con 0 P2028, `carga-configuracion-db.test.ts`) +
   e2e de ráfaga (`preferencias-tema-rafaga.spec.ts`) — ✅.

## Decisión de Claude (constructor), no venida de brief ni ADR

Se resuelve el P2028 bajando las transacciones interactivas del layout (`sinDb`) y apagando los dos
amplificadores (precarga del riel y revalidación del POST), en vez de consolidar las interactivas en
una sola transacción por request («idealmente una por request» del encargo): la prueba de carga ya
llega a 0 P2028 con la forma reducida, y consolidar era un refactor mayor del borde (anotado como
mejora futura). Las lecturas de Better Auth se dejan en su transacción de array (CAR-43).

## Cómo correr la prueba de carga (criterio de cierre)

```
pnpm --filter @opai/db exec vitest run test/carga-configuracion-db.test.ts   # necesita DATABASE_URL_TEST
```

Resultado: ANTES (pool 2, `maxWait` 100 ms, 5 interactivas) reproduce P2028 > 0; DESPUÉS (pool 5,
`maxWait` real, 3 interactivas) 20 renders paralelos → **0 P2028, 0 rechazos**.
