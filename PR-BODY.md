# Título

docs: Brief 07d · Ley 21.719 por diseño (propuesto) — brecha Alta B4

# Cuerpo

## Qué hace

Agrega el **Brief 07d · Ley 21.719 por diseño** (`docs/2.0/briefs/BRIEF-07d-ley-21719.md`), un documento de implementación **sin código**, marcado **propuesto, pendiente de la aprobación de Carlos**. Cierra la brecha **Alta B4** de `docs/2.0/paridad/nucleo.md` (protección de datos personales de la Ley 21.719, por diseño), que es **criterio de término de la fase 1** y debe estar en `main` **antes del 30-nov-2026** (la ley rige el 1-dic-2026), según `ROADMAP.md` y `ESTADO.md`.

Encargo de Carlos: «avanzamos con esto entonves? […] las brechas de paridad con 1.0 (Briefs 07c y 07d)» (Carlos, 26-oct-2026 11:36 CLT, chat con el bot OPAI 2.0, t303u). La decisión de cubrir la ley «siempre y por diseño» es del 24-oct-2026 (`ESTADO.md`, Decisiones de Carlos sobre paridad, punto 2).

El brief sigue la estructura de los briefs existentes (00, 01, 02, 05, 07c) y fue escrito verificando el estado real del código sobre `main` `c391de1`:

- **Verificado:** no hay en `main` campos DPA/DPO, ni tablas de consentimiento, solicitudes ARCO o retención (confirmado en `packages/db/prisma/schema/`). La infraestructura que el brief reutiliza sí existe: `core.audit_events`, `core.perfil_empresa`, documentos con bitácora y comprobante (ADR-019/039), Configuración por ámbitos (ADR-018/038), outbox y trabajos (ADR-029), comunicaciones (ADR-020) y el almacén cifrado por tenant (ADR-027).

Alcance del brief: DPA/DPO en el perfil del tenant; inventario de datos personales (RAT) declarativo en el manifest; consentimientos; atención de solicitudes del titular (acceso, rectificación, cancelación, oposición, portabilidad, bloqueo) con exportación como documento del Núcleo; retención y borrado por política respetando los hechos regulados (ADR-023); cifrado de sensibles (ADR-027). Todo por capacidad (ADR-004), con auditoría, `dryRun` e `idempotencyKey`, y `soloPersonas` en el gobierno (ADR-034).

**Coordinación con el Brief 07c** (acceso y permisos, PR #39, rama `docs/brief-07c-acceso-permisos`): **no duplica** B1, B2 ni B3. El 07d **usa** las capacidades de gobierno (`soloPersonas`) y el alcance del supervisor (B3) del 07c para acotar quién ve los datos de una solicitud, y **fija la política de retención** del registro de intentos de login que el 07c dejó pendiente «a B4/B5». Recomienda ir después del 07c.

Las decisiones de producto y legales abiertas **no se deciden aquí**: están reunidas en §16 «Decisiones para Carlos» (texto y versión del DPA, bases de licitud y consentimiento, canal/plazo/formato de las solicitudes, periodos de retención, notificación de brechas, alcance del gate del inventario), cada una con opciones y una recomendación, señalando dónde hace falta criterio legal.

## Bloques (un commit)

- **`docs:`** Brief 07d (`BRIEF-07d-ley-21719.md`) + actualización de `ROADMAP.md` y `ESTADO.md` **solo con el enlace** al brief (fila 07d y §3b del ROADMAP; punto 4 de «Pendientes del Núcleo» del ESTADO).

Es un único encargo de documentación, por lo que va en un solo commit.

## Tests y gate

Documentación solamente; no toca código, web, base ni capacidades.

- `pnpm typecheck` → verde (FULL TURBO, 10/10).
- `pnpm lint` → verde (10/10).
- `pnpm test` → verde: 449 pasados, 30 omitidos (79 archivos pasados, 11 omitidos).
- `pnpm build` / `pnpm presupuesto`: no aplica (no se tocó `apps/web`).
- `pnpm test:db`: no aplica (no se tocó base, RLS ni capacidades).

## Riesgos

- **Es un documento, no una implementación:** no cambia comportamiento ni toca `main`. El brief debe ser **aprobado por Carlos** antes de ejecutarse.
- **Plazo legal duro (30-nov-2026):** el plan base cubre **B4 completo —los tres PR, incluido retención/cifrado— en `main` antes del plazo**; el orden es solo de secuencia, no una postergación de PR 3. Si Carlos juzga que el calendario no alcanza, escalonar parte de B4 es decisión suya (§16.7 del brief), no un supuesto.
- **Materia legal fuera del alcance de Claude:** textos del DPA, bases de licitud, plazos y periodos de retención los confirma Carlos con revisión legal (§16); el brief deja el mecanismo y valores por defecto propuestos.
- **Hechos regulados (ADR-023):** el brief traduce la «cancelación» en anonimización/bloqueo donde la ley lo permita, sin romper la inmutabilidad de marcas/firmas/bitácora.

## Tarea de Linear

Fixes CAR-?

Por asignar en el equipo **CAR** (el issue aún no existe; Carlos lo crea y reemplaza el `CAR-?` de arriba por el ID real, obligatorio por `AGENTS.md` «Tareas (Linear)»). Sin datos personales en la tarea ni en los comentarios (Ley 21.719, regla 6).

## Resumen ejecutivo para Carlos

- **Qué se hizo:** el brief de la Ley 21.719 por diseño (B4), propuesto y listo para tu aprobación; sin código.
- **Qué cambia para Gard:** cuando se ejecute, 2.0 cumplirá la Ley 21.719 por diseño (DPA/DPO, consentimiento, solicitudes ARCO con exportación, retención y cifrado), antes del 1-dic-2026.
- **Qué decides tú:** las de §16 «Decisiones para Carlos» (varias con criterio legal): texto/forma del DPA, bases de licitud, plazo y formato de las solicitudes, periodos de retención, si entra la notificación de brechas y el alcance del gate del inventario.
- **Qué sigue:** aprobar el brief → ejecución en `brief/07d-ley-21719` (PR con migraciones, etiqueta `migracion-pendiente`). Con B1–B4 en `main`, el Núcleo cierra; sigue Puestos y guardias (Brief 11).
