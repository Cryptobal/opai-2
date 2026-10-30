# BRIEF — Personas y Cargos 2.0

**Rama:** `feat/personas-cargos-pr1` (desde `main`) · **Fecha:** 30-oct-2026 · **Encargo:** Carlos, 30-oct 14:15 («construye Personas y Cargos y Tickets en paralelo»), límite 60 min · **Diseño:** `docs/2.0/diseño/export-personas-cargos/` (aprobado, `origin/docs/diseno-personas-cargos`, 01–07 + README) y `alcance/design-prompt-ficha-persona.md` / `alcance/design-prompt-personas-cargos.md` · **Decisiones previas:** `alcance/PLAN-diseno-modulos.md` §D1, §G.

## 1. Hoja de alcance (1.0 → 2.0, aprobación única por módulo)

1.0 es el piso, no el techo. Lo que ya construyó `main` antes de este PR no se repite aquí (ver §2).

### Pasa de 1.0 a 2.0 (ya construido en `main` antes de este PR)

- Personas: ficha con pestañas Resumen · Laboral · Sueldo · Anexos · Documentos · Privacidad ·
  Actividad; bloqueo/desbloqueo con motivo; archivado; vínculo laboral único vigente.
- Cargos: catálogo (nombre, clase, descripción), switch «Sueldo sensible», historial de estructuras
  archivadas, capas de sueldo versionadas por instalación/puesto/persona (ADR-005, R3: el cargo ya no
  define montos).

### Pasa de 1.0 a 2.0 (en este PR 1)

- **P1 «No recontratar» (marca P1, `isBlacklisted` de 1.0):** marca con motivo, fecha de marca y
  vencimiento obligatorio, visible y editable solo para RRHH y administradores; el resto no ve ni que
  la sección existe. Base de interés legítimo (art. 13 d) de la Ley 19.628, modificada por la Ley
  21.719, vigente desde el 01-12-2026; §21). Apagada en producción hasta esa fecha.

### Pasa de 1.0 a 2.0 (queda para PR 2, ver §3)

- Previsión (AFP, salud, APV, cargas familiares, discapacidad) y datos bancarios (cuentas, cambio
  pendiente de aprobación RRHH) — decisión de Carlos del 30-oct 11:46: pasan al núcleo y se leen desde
  la ficha del guardia.
- Tallas y uniforme, jornada DT (Art. 22, resolución, horas semanales), plazo fijo con 3 períodos,
  OS-10 y acreditaciones, contacto (estado civil, contacto de emergencia, segundo teléfono).

### No pasa (decisión ya registrada, fuera de alcance de este módulo)

- Cálculo de liquidaciones (Nómina/motor de sueldos).
- PIN de marcación y Face ID (Terreno/Asistencia).
- ATS / reclutamiento.

### Mejoras que se suman (no estaban en 1.0)

- Estado civil, cargas familiares con tramo, contacto de emergencia, APV, discapacidad/pensión de
  invalidez (decisión de Carlos, 30-oct 11:46) — quedan para PR 2/3, con la nota «Campo por verificar
  contra LRE / Previred» hasta validarse.
- Auditoría explícita de la marca P1 (Ley 21.719: base de interés legítimo anotada, entra en las
  solicitudes de acceso y oposición de la persona) — este PR.

## 2. Brecha `main` vs. diseño aprobado (export-personas-cargos v1, PR #159)

| Pantalla del diseño | Estado en `main` antes de este PR | Qué falta |
|---|---|---|
| 01 Lista de Personas | Ya está (SplitScreen, segmento Personas\|Vencimientos) | Nada bloqueante |
| 02 Ficha de persona | Ya está (7 pestañas) | Previsión, Pago/bancos, Uniforme, Jornada DT, OS-10, Contacto (PR 2) |
| 03 Vencimientos 375 | Ya está | Nada bloqueante |
| 04 P1 No recontratar | No existía | **Este PR**: capacidad + badge/acción en Resumen, solo RRHH/admin |
| 05 Cargos | Ya está, sin montos | Nada bloqueante |
| 06 Ficha del cargo | Ya está (switch sensible, versiones) | Montos por instalación en solo lectura (D-C del diseño) — PR 2/3 |
| 07 Config Personas | No existía ruta propia | Sección en Configuración › Módulos › Personas (D-D) — PR 3 |

## 3. Plan de PRs

- **PR 1 (esta rama):** P1 «No recontratar» completo (migración, permiso, 3 capacidades con MCP,
  pantalla en Resumen gateada por permiso, tests, snapshot MCP y paridad).
- **PR 2 (siguiente):** Previsión y datos bancarios en el Núcleo, con el cambio de cuenta pendiente de
  aprobación de RRHH (aprobar / rechazar con motivo, auditado) — prioridad sugerida del encargo. Motivo
  de dividir: trae cifrado de campos sensibles, catálogos (AFP, isapres, bancos) y un flujo de
  aprobación con estados; no cabía con rigor completo en los 60 min junto con P1, y el encargo autoriza
  dividir cuando el tiempo no alcanza. Decisión tomada por Claude (constructor) dentro del encargo, para
  entregar P1 con el mismo rigor que el resto de `main` en vez de apurar la pieza más grande.
- **PR 3:** Tallas/uniforme, jornada DT, plazo fijo, OS-10, Contacto; montos del cargo por instalación
  en solo lectura (D-C); Configuración › Módulos › Personas (D-D).

## 4. Diseño de este PR (P1)

- **Permiso nuevo:** `core:personas.no_recontratar.manage` (catálogo en `permisos-catalogo.ts`).
  Denegado explícitamente a `gerente` (antes tenía todo por el comodín `*`); fuera del allowlist de
  `supervisor`; `viewer` no lo matchea (`*:read`/`*:*.read` no cubre `.manage`). Por defecto solo
  `owner`/`admin`; el tenant puede agregarlo a su rol personalizado «RRHH» si quiere delegarlo (B2,
  roles personalizados), igual que otros permisos sensibles del núcleo (`firmasConfig`, `anexosRead`).
  **Decisión de Claude (constructor), documentada aquí**: el diseño pide «visible solo para RRHH y
  administradores», pero `RRHH` no es un rol base de OPAI 2.0 (`ROLES = [owner, admin, gerente,
  supervisor, viewer]`); es una plantilla de rol personalizado sin `personas.manage` por defecto
  (`roles-base-plantillas.ts`). Se modela como permiso de owner/admin por defecto, extensible por el
  tenant, en vez de inventar un rol base nuevo que el repositorio no tiene.
- **Capacidades** (`packages/capabilities/src/core/maestros/personas-no-recontratar.ts`):
  `core.personas.no_recontratar_ver` (lectura, auditada con `auditarLectura`), `core.personas.
  marcar_no_recontratar` y `core.personas.quitar_no_recontratar` (escritura, `dryRun`, motivo
  obligatorio 5–500 caracteres). Las tres requieren el permiso nuevo: sin él, `executeCapability`
  devuelve `FORBIDDEN` antes del handler, así que quien no tiene el permiso no distingue «no existe la
  sección» de «no tengo acceso».
- **Motivo de la marca**: el diseño pide «motivo de una lista cerrada más nota»; las categorías de esa
  lista cerrada no están en ningún brief, ADR ni mensaje de Carlos citado en este encargo. **No se
  inventan.** Este PR usa texto libre (5–500 caracteres), igual que el motivo de bloqueo existente
  (`core.personas.bloquear`); la lista cerrada queda pendiente de que Carlos la defina (CA parcial, ver
  §5).
- **Pantalla**: `apps/web/app/(erp)/personas/_componentes/marca-no-recontratar.tsx`, Server Component
  async montado en `/personas/[id]` (Resumen). Resuelve la identidad del request y el permiso efectivo
  (`puedeDeIdentidad`, ADR-022) **antes** de llamar a la capacidad de lectura: sin el permiso, el
  componente no se renderiza — ni la sección ni una llamada de red delatan que existe. Con permiso,
  muestra una `Alerta` (danger si está marcada, neutral si no) y el menú de acciones (`AccionesEntidad`,
  reutiliza el patrón de confirmación + motivo de `core.personas.bloquear`/`desbloquear`).
- **RUT enmascarado (CAR-82):** esta pantalla no muestra el RUT; no aplica `enmascararRun` aquí (ya se
  usa en Resumen/firma). Sin cambios sobre esa lógica.

## 5. Criterios de aceptación (recorridos uno a uno)

1. Marcar/quitar con motivo obligatorio, auditado — **OK** (tests `maestros-personas-no-recontratar.test.ts`).
2. Visible solo para RRHH/admin, el resto no sabe que existe — **OK**: permiso deniega explícitamente a
   gerente/supervisor/viewer (tests de permisos + capacidad); la UI no renderiza la sección sin permiso.
3. Base de interés legítimo anotada (Ley 21.719) — **Parcial**: el motivo queda en texto libre y en la
   auditoría; falta el campo explícito «base legal» y la integración con las solicitudes ARCO de
   `core.cumplimiento.*` (no estaba en el alcance de los 60 min; se deja para PR 2/3 y se anota en
   `ESTADO.md`).
4. Motivo de lista cerrada — **Parcial**: implementado como texto libre con `TODO(decisión Carlos)`
   (ver §4); la lista cerrada necesita que Carlos la defina. No se inventa.
5. Alerta al crear/contratar el mismo RUT — **No implementado en este PR** (requiere cruzar el alta de
   persona o vínculo con el historial de marcas por RUT, incluidas personas archivadas/anonimizadas;
   queda para PR 2/3). Confirmado con test que, mientras no exista esa alerta, ningún alta, vínculo ni
   asignación se bloquea por la marca (art. 8° bis: la alerta nunca puede bloquear sola).
6. Vencimiento obligatorio y limpieza automática — **OK** (corrección del 30-oct 15:35, §8): «Vence
   el» es obligatorio al marcar; un trabajo diario limpia la marca, el motivo y las fechas al vencer.
   El plazo MÁXIMO de vigencia (tope de negocio) queda como ajuste en Configuración › Módulos ›
   Personas, sin valor decidido (`TODO(decisión Carlos)`).

## 8. Correcciones del Revisor y del abogado (30-oct 15:33 CLT, misma rama)

Encargo de Carlos: «corrige ya lo técnico (textos, vencimiento obligatorio, borrado del motivo,
apagado hasta el 01-12) y espera mis decisiones». Resumen (detalle en `docs/2.0/ESTADO.md`):

1. **Motivo nunca en claro en la auditoría:** `sensibles: ["motivo"]` en las capacidades de marcar y
   quitar; `core.actividad.list` y `core.audit.list` ocultan la fila completa a quien no tiene el
   permiso. Al quitar, el motivo anterior no sobrevive en ningún lado.
2. **Anonimización:** `retencion-anonimizar.ts` limpia las 4 columnas `no_recontratar*` del titular.
   No se borra nada de `core.audit_events` (cadena inmutable por contrato); como el motivo nunca se
   escribió en claro, no queda nada que borrar ahí.
3. **Vencimiento obligatorio:** columna `no_recontratar_vence_en` (agregada dentro de la misma
   migración `20261030170000`, todavía no aplicada); al vencer, `core.personas.no_recontratar_vencer`
   (trabajo diario) limpia las 4 columnas. Plazo máximo: ajuste sin valor decidido (`TODO(decisión
   Carlos)`), Configuración › Módulos › Personas.
4. **Apagada hasta el 01-12-2026 en producción:** un solo punto de decisión
   (`noRecontratarHabilitadaAhora`), con override exclusivo de tests/e2e.
5. **Textos exactos** del abogado en el diálogo de marcar, el de quitar, la alerta, la etiqueta y el
   placeholder del motivo; «lista negra» → «marca P1» en descripciones MCP y en este brief; el ejemplo
   de motivo pasa a un hecho no penal.

**Pendientes de decisión de Carlos (no implementados, por instrucción expresa):** la lista cerrada de
motivos, la integración con ARCO (vista del trabajador y oposición), la declaración en la política de
privacidad y el RAT, y el plazo máximo de vigencia de la marca.

## 6. Decisiones registradas en este PR

| # | Decisión | Quién | Dónde se aplicó |
|---|---|---|---|
| D1 | P1 se modela con permiso de owner/admin por defecto (extensible al rol RRHH del tenant), no con un rol base «RRHH» nuevo | Claude (constructor), dentro del encargo | `permisos-catalogo.ts`, `permisos.ts` |
| D2 | Motivo de la marca en texto libre (no lista cerrada): las categorías no están citadas en ningún brief/ADR/mensaje de Carlos de este encargo | Claude (constructor) | `personas-no-recontratar.ts` |
| D3 | PR 2 queda con previsión + datos bancarios + aprobación RRHH (la pieza más grande); PR 1 se queda con P1 completo con rigor | Claude (constructor), autorizado por «si no cabe, divide» del encargo | Este documento, §3 |

## 7. Pendiente explícito para PR 2 y PR 3

Ver §1 (mejoras) y §5 (CA parciales). Ninguno de estos pendientes es un bloqueo de seguridad, RLS o
mezcla de datos entre tenants: son alcance funcional diferido.
