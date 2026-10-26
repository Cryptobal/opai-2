## Brief 07d · PR 3 — Retención y cifrado (Ley 21.719)

Depende de #56 (PR 2 del 07d, rama `brief/07d-pr2-consentimientos-arco`) y, por esa cadena, de #48 (PR 1). Refs CAR-17.

**Etiqueta `migracion-pendiente`**: trae la migración aditiva e idempotente `20261027070000_cumplimiento_retencion`. Carlos la aplica en Neon `dev` y `main` y quita la etiqueta.

### Resumen ejecutivo para Carlos

- **Qué se hizo.** La política de retención de datos personales por cada tabla del inventario, un trabajo diario que anonimiza o elimina lo vencido, la anonimización puntual de un titular (la única «purga forzada») y el cifrado a nivel de campo para salud y biometría. Los hechos regulados (vínculos, remuneraciones, auditoría, consentimientos, solicitudes) no se tocan.
- **Qué cambia para Gard hoy: nada visible.** La política **parte apagada**: el trabajo diario solo simula y anota cuántas filas habría tocado. Nada se anonimiza hasta que tú la actives. El Núcleo todavía no guarda salud ni biometría (llegan con Asistencia, fase 4), así que no hay datos que cifrar ni recifrar hoy.
- **Qué decides tú (con el abogado).**
  1. Los **periodos de retención** (son una propuesta mía, marcada como tal en el código y en cada ajuste): envíos 365 días desde que se crean · invitaciones cerradas 90 días · contactos archivados 730 días · personas 1825 días (5 años) desde el término de su último vínculo.
  2. **Cuándo activar** la política por empresa (ajuste «Aplicar la política de retención»).
  3. Qué hacer con lo que quedó **sin política** (`pendiente`): cuentas y representantes de clientes, usuarios, sesiones y documentos (archivos en R2).
  4. Confirmar los campos sensibles que se cifran (hoy ninguno existe en el Núcleo).
- **Qué sigue.** Pantalla de Configuración → Cumplimiento (política, activar, registro de lo hecho) y la anonimización desde la ficha: **pendientes de diseño en Claude Design con el Design System de OPAI 2.0** (regla fija de Carlos). Luego, la confirmación de los periodos y la activación.

### Qué trae

| Bloque | Contenido |
| --- | --- |
| B9 `domain:` | Catálogo de retención por tabla del inventario (periodos **propuestos**), evaluación pura (vigente / vencido / se conserva por ley), elegibilidad de la persona frente a hechos regulados, ajustes de tenant (`cumplimiento_retencion_activa` y los días de cada regla). |
| B10 `core:` | Migración, trabajo diario `core.cumplimiento.retencion`, lectura `core.cumplimiento.retencion_politica` (herramienta MCP `core_cumplimiento_retencion_politica`) y la purga forzada `core.cumplimiento.titular_anonimizar` (`soloPersonas`, `dryRun`, idempotencia, auditoría, evento). El RAT ahora muestra la retención efectiva de cada tabla. |
| B11 `core:` | `cifradoDeCampos`: cifra solo los campos que el inventario declara sensibles, con la DEK del tenant y la KEK existente. El RUT no se cifra. |
| B12 `docs:` | Brief §19, `ESTADO.md`, `ROADMAP.md`, `paridad/nucleo.md`. |

### Variables de entorno

**Ninguna nueva.** El cifrado reutiliza `OPAI_SECRETS_KEY` (y `OPAI_SECRETS_KEY_VERSION` / `OPAI_SECRETS_KEY_ANTERIOR` para la rotación), que ya existen para el almacén de secretos (ADR-027). Sin ella, cifrar falla con un error claro; no degrada a texto en claro.

### Decisiones de implementación (Claude, constructor; no vienen de un ADR)

- La política parte **apagada** y simula (salvaguarda para no anonimizar antes de tu confirmación legal).
- Una persona solo vence si **todos** sus vínculos terminaron antes del corte; quien nunca tuvo vínculo no vence por política. Con una solicitud ARCO abierta no se anonimiza.
- La purga forzada aplica **la misma regla** que el trabajo: una persona con vínculo vigente o dentro del periodo de conservación se rechaza (la vista previa dice desde cuándo procede). Un contacto sí se puede anonimizar a pedido.
- Anonimizar persona deja el vínculo laboral, la remuneración y la bitácora **íntegros**; el RUT pasa a `ANON-<id>` (es único por tenant).

### Criterios de aceptación (§14)

- **CA-4 retención y hechos regulados:** cumplido en mecanismo; **parcial en alcance** (política apagada por defecto; `cuentas`, `usuarios`, `sesiones` y `documentos` sin política todavía).
- **CA-5 cifrado y aislamiento:** mecanismo, gate y RLS cumplidos; **parcial en datos** (aún no existen campos de salud ni biometría).
- **CA-3:** sigue parcial en el PDF de la exportación (PR 2, §18). CA-1, CA-2 y CA-paridad sin cambios.

### Pendiente de diseño

Configuración → Cumplimiento (política, interruptor de activación, registro de ejecuciones) y la acción «anonimizar» en la ficha de persona/contacto. No hay pantallas en este PR; todo es accesible por capacidad, API y MCP.

### Verificación de la migración

```sql
-- columnas nuevas
SELECT table_name, column_name FROM information_schema.columns
 WHERE table_schema = 'core' AND column_name IN ('anonimizada_en', 'anonimizado_en');       -- 2 filas
-- RLS activa y una sola política para opai_app
SELECT relrowsecurity FROM pg_class WHERE oid = 'core.retencion_ejecuciones'::regclass;      -- t
SELECT polname, polroles::regrole[] FROM pg_policy
 WHERE polrelid = 'core.retencion_ejecuciones'::regclass;                                    -- tenant_isolation, {opai_app}
-- append-only para la aplicación
SELECT has_table_privilege('opai_app', 'core.retencion_ejecuciones', 'UPDATE') AS upd,
       has_table_privilege('opai_app', 'core.retencion_ejecuciones', 'DELETE') AS del;       -- f, f
-- el rol de la aplicación no se salta la RLS
SELECT rolbypassrls FROM pg_roles WHERE rolname = 'opai_app';                                -- f
```

La migración se aplicó dos veces seguidas sin error (usa `IF NOT EXISTS`, `DROP POLICY/TRIGGER IF EXISTS` y `ADD CONSTRAINT` con captura de duplicado). Inversa manual al pie del `.sql`.

### Verificación hecha

`pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm test:db` en verde en este head; `pnpm --filter @opai/web build` y `pnpm presupuesto`. No se tocó `apps/web`, así que no hay cambio de presupuesto de JS ni e2e afectado. `tools/list`: una herramienta nueva (`core_cumplimiento_retencion_politica`); `titular_anonimizar` es `soloPersonas` y va en las excepciones de paridad con su motivo. Tras desplegar: `OPAI_MCP_KEY=<key> pnpm mcp:verificar` (Carlos).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WQ6ApdqFFhCEp1MjrwkEW1
