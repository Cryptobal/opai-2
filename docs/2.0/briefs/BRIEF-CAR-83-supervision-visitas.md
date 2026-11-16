# BRIEF — CAR-83 · Supervisión y visitas (Operaciones II, Brief 12)

**Sesión:** Sesión Operaciones · **Fecha:** 14-nov-2026 · **Decisiones de origen:** B6–B8 (29-oct-2026, adenda del 8-nov a ADR-083). Escrito y ejecutado por la sesión con «Autonomía de las sesiones» (ADR-114): todo lo de este brief es reversible.

## 1. Objetivo
Que el supervisor registre cada **visita** a una instalación desde el celular: llegada con ubicación (check-in GPS), lista de revisión, observaciones y, en un PR siguiente, fotos y firma del guardia. Y que abra el portal en **«Hoy»** con lo que requiere su atención: puestos sin cubrir, rondas atrasadas y faltas.

## 2. Estado actual (verificado en `main`, 14-nov-2026)
- No existe ninguna tabla ni capacidad de visitas de supervisión.
- El portal del supervisor tiene «Hoy» solo con documentos pendientes; el PR #730 (Sesión Diseño) lo pasa al diseño nuevo.
- Hay piezas para reusar: `distanciaMetros` (`@opai/domain`, rondas), `lat`/`lng`/`geocercaM` en la instalación, `dondeInstalacion` (ADR-022), `pauta.ppc.listar` y `pauta.alertas.listar`.
- Reemplazo desde el celular con turno extra por aprobar (B8) depende de CAR-96, que espera a Carlos (CAR-458).

## 3. Alcance y plan por PR
1. **PR 1 (este):** visitas en el servidor. Tabla `pauta.visitas`, capacidades `pauta.visitas.iniciar`, `.cerrar`, `.listar` y `.obtener` con MCP y vista previa, ajuste `visita_lista` (la lista de revisión por empresa) y evento `pauta.visita.cerrada`. Sin pantalla.
2. **PR 2:** pantalla de la visita en el portal del supervisor (iniciar, lista, cerrar) e historial en la ficha de la instalación, con el diseño nuevo, después de que entre #730.
3. **PR 3:** fotos y firma del guardia por `core.documentos` (vínculo a la visita, ADR-019), y «Hoy» con alertas.
4. **Después de CAR-96:** reemplazo desde el celular con turno extra por aprobar (B8).

## 4. Reglas
- **R1.** La visita la inicia el supervisor en una instalación de su alcance. Una sola visita en curso por persona.
- **R2.** La hora es la del servidor. La ubicación es opcional y **nunca bloquea**: se guarda la distancia a la instalación y si quedó dentro de su geocerca (`geocercaM`), fuera, sin GPS o sin ubicación de la instalación (como en rondas, ADR-023/ADR-024).
- **R3.** Cerrar guarda la lista de revisión (cada ítem: cumple, no cumple o no aplica, con nota opcional) y observaciones. Solo la cierra quien la inició. Una visita cerrada no se edita.
- **R4.** La lista base sale del ajuste `visita_lista` de la empresa; si está vacío, una lista genérica. Ítems de hasta 120 caracteres, máximo 30.
- **R5.** Ver visitas: `pauta:read` con alcance por instalaciones. Iniciar y cerrar: `pauta:write`.
- **R6.** El texto de la visita no lleva datos personales del guardia más allá de lo que el supervisor escriba; el cliente no ve las visitas en este PR.

## 5. Modelo de datos (migración aditiva)
`pauta.visitas`: `id`, `tenant_id`, `instalacion_id` (FK), `supervisor_id` (FK `core.users`), `estado` (`en_curso` | `cerrada`), `iniciada_en`, `cerrada_en`, `lat`, `lng`, `precision_m`, `distancia_m`, `geocerca` (`dentro` | `fuera` | `sin_gps` | `sin_ubicacion`), `checklist` (JSONB), `observaciones`, `created_at`, `updated_at`. Índice único parcial: una `en_curso` por `supervisor_id`. RLS + FORCE + `tenant_isolation`. La aplica la sesión con snapshot de Neon (ADR-104).

## 6. Capacidades
| Capacidad | Permiso | Efecto |
|---|---|---|
| `pauta.visitas.iniciar` | `pauta:write` | escritura, `dryRun`, `idempotencyKey` |
| `pauta.visitas.cerrar` | `pauta:write` (solo quien la inició) | escritura, `dryRun`, emite `pauta.visita.cerrada` |
| `pauta.visitas.listar` | `pauta:read`, alcance | lectura, `cursor`/`limite` |
| `pauta.visitas.obtener` | `pauta:read`, alcance | lectura |

## 7. Pruebas
Dominio (clasificación de geocerca y lista base), `test:db` con dos empresas, alcance del supervisor, una sola en curso, solo quien la inició la cierra, cerrada no se edita, paridad MCP.

## 8. Riesgos y rollback
Tabla nueva sin dependencias: se revierte con el revert del PR y `DROP TABLE`. Riesgo: GPS impreciso; por eso nunca bloquea y queda la precisión informada.

**Referente:** Operaciones de terreno · Connecteam y ServiceTitan (formularios con ubicación y hora del servidor desde el teléfono, `REFERENTES-saas.md`). Se aparta en que el GPS no bloquea, por la regla de la DT ya adoptada en rondas (ADR-023).
