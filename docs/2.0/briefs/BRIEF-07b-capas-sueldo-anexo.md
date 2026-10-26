# BRIEF DE IMPLEMENTACIÓN — 07b CAPAS DE SUELDO Y ANEXO DE CONTRATO (Núcleo, paso 3)

**Repositorio:** `Cryptobal/opai-2` · **Rama de ejecución:** `brief/07b-capas-sueldo` (desde `main` actualizado) · **Fecha:** 26-oct-2026 · **Estado:** **diseño aprobado por Carlos; brief propuesto, pendiente de la aprobación de Carlos** · **Tarea de Linear:** CAR-19 (<https://linear.app/carlos-irigoyen/issue/CAR-19>); cada PR la vincula con `Fixes CAR-19` (obligatorio, `AGENTS.md` «Tareas (Linear)») · **Depende de:** Brief 02 A–C integrado (maestros, `core.estructuras_sueldo`, `core.vinculos_laborales`, `core.documentos`, fichas de Instalación, Persona y `/cargos`, outbox, auditoría, configuración), y del diseño por áreas del Brief 05 y la base PWA del Brief 04 para el shell y las pestañas · **Va antes del brief de Puestos (Operaciones I, Brief 11)**, porque el puesto usa la capa «sueldo propio del puesto» (`ROADMAP.md`, fila 07b; ADR-048 respuesta 1) · **Reglas:** ADR-036 (actualización del 25-oct: capas de sueldo, «Jornada pactada», «Consecuencias de la actualización» y reglas del puesto), ADR-048 (módulos vendibles, anexo de contrato, jornada pactada), ADR-016 (roles y bloqueo financiero), ADR-022 (permisos vs. alcance; permisos finos al 07c), ADR-028 (marca del tenant), ADR-034 (paridad UI↔MCP y gobierno de agentes), ADR-039 (documentos con bitácora y SHA-256), ADR-041 (fichas con pestañas), ADR-045 (rendimiento), `NAVEGACION.md` · **Diseño aprobado:** [Brief 07b · Capas de sueldo y anexo](https://claude.ai/design/p/18f2f703-5dcf-4e59-aff6-626fdad34d09), archivo «Brief 07b - Capas de sueldo y anexo.dc.html» (34 pantallas en una sola sábana, con el tablero «Decide Carlos» D1–D16), **aprobado** (fuente: «aprobado todo con las recomendaciones tuyas» — Carlos, 26-oct-2026 14:27 CLT, chat con el bot OPAI 2.0, t340u). El pedido de diseño está en `docs/2.0/design/07b/pedido-diseno.md` (primer commit de este PR); de ahí salen las reglas R1–R15, los puntos «decide Carlos», las 34 pantallas (§8 del pedido) y las piezas nuevas del DS (§9 del pedido). Claude **no tiene acceso** a Claude Design: este brief no afirma nada que solo viva en ese archivo; lo que está resuelto en el tablero del diseño queda marcado en §16 para que el bot lo transcriba.

> **Pedido y aprobaciones.** El diseño lo aprobó Carlos el 26-oct-2026 a las 14:27 CLT (t340u): «aprobado todo con las recomendaciones tuyas». Con esa aprobación, **todos los puntos «decide Carlos» del pedido de diseño quedan resueltos en la opción que el pedido propone como propuesta** (o en lo que el diseño dibujó), y **R11 «cambio de rol» se entiende como el rol de turno** (días del patrón, ADR-036 reglas del puesto, punto 3). El orden de trabajo es el de ADR-048 modificación del 25-oct (Brief 05 → Brief 04 → Brief 07b, antes del brief de Puestos) y la fila 07b de `ROADMAP.md`. Este documento es **solo el brief** (sin código). Lo aprueba Carlos; recién entonces Claude lo ejecuta en la rama `brief/07b-capas-sueldo`, con un commit por bloque y el gate en verde, autorrevisión con un subagente, PR y revisión del «Revisor OPAI 2.0»; integra el bot «OPAI 2.0» con squash (ADR-043 v3). **Trae migraciones:** quien abre cada PR con migración pone la etiqueta `migracion-pendiente`; Carlos la aplica en Neon `dev` y `main` y la quita.

> **Decisiones de producto.** Lo que el pedido dejaba «decide Carlos» quedó resuelto por la aprobación del diseño (§16.a y §16.b). Para los puntos en que el pedido **no trae una propuesta concreta**, el texto que rige vive en el tablero del diseño (D1–D16) y lo transcribe el bot desde Claude Design; este brief deja una recomendación de Claude **explícitamente marcada como recomendación, no como decisión de Carlos** (§16.b). Las decisiones nuevas que surgieron al escribir el brief van en §16.d con opciones y recomendación, sin inventar decisiones de Carlos.

---

## 1. Objetivo

Corregir en el Núcleo el modelo de sueldo del Brief 02 para cumplir la actualización de ADR-036 (25-oct), en cinco cambios, **sin romper datos** y con **migraciones aditivas**:

1. Nueva **capa «instalación»** del sueldo, la capa por defecto (R1).
2. **Resolución sin herencia** entre capas: rige la más específica que exista (**RUT → puesto → instalación**) y su estructura se aplica **completa**; la resolución **devuelve la capa que rigió** (R2, R5).
3. **Retiro del nivel cargo** como capa de sueldo, **sin borrar datos**: el cargo sigue como catálogo (nombre, descripción, sensibilidad del sueldo) y atributo del puesto y del vínculo, pero **no define montos** (R3, R6).
4. **Vínculo laboral** con **instalación**, **puesto (opcional)** y **jornada pactada** (R8, R9).
5. **Anexo de contrato en borrador**, con la **plantilla base del sistema** y la **marca del tenant**, que **aprueba RRHH** y queda en `core.documentos` con su bitácora (R11–R15).

Toda acción es una **capacidad** (ADR-004, ADR-034): la pantalla, `/api/v1` y el MCP invocan la misma capacidad, con los mismos permisos, vista previa (`dry_run`), clave de idempotencia y auditoría; lo irreversible y el gobierno piden aprobación humana a los agentes (`APPROVAL_REQUIRED`). Es el portal **ERP** (lo usa RRHH y la administración); los portales Trabajador, Supervisor y Cliente no cambian aquí.

Se nota que funciona cuando: una instalación define su sueldo por defecto; una persona ve qué capa rige y de dónde sale cada monto, sin mezclas ni «hereda»; el cargo ya no muestra montos y sus estructuras antiguas quedan en solo lectura sin perderse; el vínculo laboral guarda instalación, puesto y jornada pactada; y un cambio de capa, monto, instalación o rol genera un borrador de anexo que RRHH aprueba y queda como documento verificado por SHA-256.

## 2. Estado actual del repo (a verificar sobre `main` al ejecutar; verificado el 26-oct-2026 sobre `db6cd90`)

1. **Dominio.** `packages/domain/src/estructuras.ts` resuelve `persona → puesto → cargo` **con herencia por concepto** (`null` = hereda del nivel más general; `resolverEstructura`, `Resolucion`, `NivelEstructura`). Esta regla ya no vale (ADR-036, «Consecuencias de la actualización»). `haberes`, `gratificacionLegal`, `vigenteEn` y `solapan` son puros y se conservan.
2. **Base.** `core.estructuras_sueldo` (`packages/db/prisma/schema/maestros.prisma`, `model EstructuraSueldo`) tiene `nivel` (`cargo | puesto | persona`), `cargoId`/`puestoId`/`personaId`, conceptos nulables que heredan, `vigenteDesde`/`vigenteHasta`, `motivo`, `estado`, un CHECK de «exactamente una referencia» y la tabla hija `EstructuraItem`. Migración `20261023190000_estructuras_por_concepto`. `core.vinculos_laborales` (`model VinculoLaboral`) tiene `cargoId`, `tipo`, `inicio`, `termino`, `motivoTermino`, `estado` (uno vigente por persona, índice parcial) **y no tiene instalación, puesto ni jornada pactada**. `core.cargos` tiene `sueldoSensible`. `core.documentos` (ADR-039) sube directo a R2 con SHA-256 y bitácora encadenada; `model Documento` en `documentos.prisma`. **No existe** tabla de anexos de contrato.
3. **Capacidades.** `core.estructuras.list/get/create/anular/efectiva`, `core.vinculos.list/create/update/terminar`, `core.cargos.list/get/create/update/set_activo`, `core.documentos.*` (`packages/capabilities/src/core/maestros/*` y `.../documentos/*`). Los montos sensibles ya se ocultan a quien no tiene `core:estructuras.read_sensible` (verificado en `core.actividad.list`, corrección del Brief 02 C).
4. **Pantallas.** `apps/web/app/(erp)/instalaciones/[id]` (Resumen, Puestos, Documentos, Actividad), `.../personas/[id]` con pestañas **Laboral** y **Sueldo** (sueldo en tres niveles por concepto hoy), `.../cargos` y `.../cargos/[id]` (lista con montos por cargo hoy). El shell por áreas y las pestañas de ficha son del Brief 05 (ADR-041, ADR-046).
5. **Paridad.** El gate de paridad y el snapshot `packages/capabilities/test/__snapshots__/herramientas-mcp.txt` están en verde en `main`; las excepciones `interna`/`soloPersonas` viven en `packages/capabilities/test/paridad-excepciones.ts`.

## 3. Alcance

### Incluido

- Capa **instalación** del sueldo (por defecto) y su versionado por vigencia sin solapes (R1, R5).
- **Resolución sin herencia** entre capas RUT → puesto → instalación, que **devuelve la capa que rigió** y el origen por concepto (R2, R5); reescritura de `packages/domain/src/estructuras.ts`.
- **Retiro del nivel cargo** como capa de sueldo, **sin borrar datos**: las estructuras `cargo` existentes quedan en solo lectura (archivadas o convertidas según R6, decisión de Carlos sobre los datos de `dev`); la lista de cargos pierde los montos (R3, R6).
- **Vínculo laboral** con **instalación**, **puesto (opcional)** y **jornada pactada** (R8, R9); migración aditiva de `core.vinculos_laborales`.
- **Anexo de contrato en borrador**: tabla del núcleo para el borrador, su generación por cambio de capa/monto/instalación/rol (R11), la plantilla base del sistema con la marca del tenant (R12, ADR-028), la aprobación y el rechazo por RRHH (R13, R14), y el documento final en `core.documentos` con bitácora y SHA-256 (R15, ADR-039).
- Capacidades nuevas y ampliadas con **paridad MCP**, `dry_run`, `idempotencyKey`, auditoría y `APPROVAL_REQUIRED` para agentes (R13, R14); las de gobierno con `soloPersonas: true`.
- Pantallas del portal ERP (las 34 del pedido mapeadas a rutas y pestañas reales, §8) y las piezas nuevas del DS (§9 del pedido), pasando por Claude Design (ya aprobado).
- Tests de dominio, de capacidades (incl. `*-db.test.ts`), de base (`pnpm test:db`), e2e (375/1024/1280) y gate de paridad en verde; presupuesto de JS de ADR-037/045.

### Excluido (otros briefs, backlog o fuera de alcance)

- **«Grupo de sueldo» (R4):** backlog (ADR-036 punto 4); no se diseña ni se construye.
- **Editor de plantillas del anexo:** llega con el **Brief 09** (Documentos); aquí solo la **plantilla base del sistema**, no editable por el tenant (R12, ADR-048 punto 5).
- **Flujo de CPQ** (ofrecer puestos al ganar el negocio, sueldo cotizado) y **modelo del puesto** (1 puesto = 1 posición, patrones, tramos): Brief 11 (Puestos) y fase 2 (ADR-040, ADR-042, ADR-048). Aquí solo el **bloque de sueldo** del puesto; no se rediseña el puesto.
- **Permisos finos** de quién crea o cambia capas (instalación, puesto, RUT) y edita el vínculo: dependen del **Brief 07c** (B2, roles y permisos finos; ADR-022, nota del 26-oct). Este brief **no decide el permiso exacto** (§16.b/§16.d): usa las familias de permisos que ya existen y deja el refinamiento por rol al 07c, y el diseño solo muestra el estado «sin permiso».
- **Alcance por filas** del supervisor (B3): Brief 07c. Este brief solo apoya al 07c dejando la **instalación en el vínculo** (de la que 07c deriva el alcance de personas con vínculo vigente).
- **Firma electrónica** del anexo: fuera de alcance (Brief 28). El diseño termina en «Aprobado y guardado en Documentos» (R15; §16.b).
- **Portales Trabajador, Supervisor y Cliente:** no cambian; el trabajador verá su anexo cuando llegue su portal (fase 3).

## 4. Arquitectura

### 4.1 Capas de sueldo (R1–R3, R5)

- **Tres capas:** **instalación** (por defecto), **puesto** (cuando el puesto tiene su propio sueldo) y **sueldo por RUT** (persona; la excepción, con **motivo obligatorio y auditoría**). El cargo **deja de ser capa** (R3): no define montos.
- **Una sola capa por asignación, sin herencia (R2).** Rige la **más específica que exista** (RUT → puesto → instalación) y **su estructura se aplica completa**. No hay valor `null` que herede: **toda estructura de cualquier capa define todos sus conceptos** (sueldo base, colación, movilización, gratificación —legal 25 % · monto fijo · ninguna— y bonos fijos o porcentuales con su marca de imponible). Se retira `combinarPorConcepto` y la semántica de herencia de `estructuras.ts`.
- **Versionado (R5).** Las estructuras siguen versionadas por vigencia, **sin solapes en la misma capa y referencia**. La resolución **devuelve la capa y la versión que rigió** (para que liquidación y costeo la guarden): el tipo de resolución pasa a exponer `capa` (`instalacion | puesto | persona`) y la estructura completa de esa capa, más el estado de cada capa (rige / existe pero no rige / no definida). La resolución vive en `packages/domain` (pura, con tests); las capacidades la invocan.
- **Instalación o puesto sin sueldo (R7).** Un puesto puede nacer **sin sueldo propio** (usa el de la instalación) y una instalación puede estar **sin sueldo definido** (estado a mostrar). El flujo de CPQ que ofrece los puestos no es de este brief; aquí solo importa que la capa se resuelva desde la instalación y el puesto del vínculo (ADR-048 respuestas 1 y 3). Si una instalación sin sueldo **bloquea** algo más (p. ej. confirmar puestos): §16.b.

### 4.2 Vínculo laboral (R8–R10)

- `core.vinculos_laborales` gana **instalación**, **puesto (opcional)** y **jornada pactada** (ADR-036 «Jornada pactada»; ADR-048 punto 7 «Aislamiento»). La jornada pactada es parte del contrato y vive en el núcleo; **PIN y Face ID siguen en Asistencia** (no van aquí).
- El vínculo usa la **instalación** (y el **puesto**, opcional) para **resolver la capa de sueldo** sin Operaciones (ADR-048 Consecuencias): sin puesto, rige la capa instalación; con puesto que tiene sueldo propio, rige la del puesto; un sueldo por RUT vigente gana a ambas.
- **Uno vigente por persona** (ADR-036); se conserva el índice parcial.
- **Composición de la jornada pactada** (horas semanales, distribución, horario, tipo): no está en las fuentes; el diseño dibujó una propuesta con **horas semanales y distribución** (§16.a). La convivencia del puesto del vínculo con la asignación de Operaciones de la fase 3 queda como **nota** (§16.d), no se construye.

### 4.3 Anexo de contrato en borrador (R11–R15)

- **Qué lo genera (R11).** Un cambio de **rol** (rol de turno, ADR-036 reglas del puesto punto 3), **de capa de sueldo**, **de monto** o **de instalación** de una persona **genera solo el borrador** del anexo; en particular, todo cambio de la capa vigente o del monto. Las capacidades que producen ese cambio **emiten un evento de dominio por outbox** (ADR-029) en la misma transacción; el **consumidor del anexo** crea el borrador. Así el borrador se genera igual lo dispare la pantalla, la API o el MCP, y el disparo no se acopla al orden de merge de los PR (§11).
- **Dónde vive.** El borrador vive en el núcleo, junto a `core.vinculos_laborales` y `core.documentos`, y **funciona aunque el tenant no tenga Nómina** (ADR-048 punto 5). Se propone una tabla del tenant `core.anexos_contrato` (con RLS) para el borrador y su estado; el **documento aprobado** se materializa en `core.documentos` con su bitácora y SHA-256 (R15, ADR-039). No se crea una tabla de adjuntos propia (ADR-019).
- **Plantilla base (R12).** El borrador usa la **plantilla base del sistema** con la **marca del perfil del tenant** (ADR-028: logo, colores de marca, nombre comercial, datos legales); el **texto** de la plantilla base lo fija Carlos (§16.b: estructura dibujada —encabezado con marca, partes, qué cambia y desde cuándo, firmas—, con texto de relleno). El editor de plantillas por tenant es del Brief 09: aquí **no hay editor**.
- **Aprobación (R13, R14).** **RRHH lo aprueba**; el rol que aprueba es **configurable** (§16.b: no existe un rol «RRHH» base, ADR-016). **Generar, aprobar y rechazar** son capacidades con `dry_run`, `idempotencyKey` y auditoría. **Un agente no lo aprueba**: aprobar y rechazar llevan `soloPersonas: true`, y para agentes la acción pide **aprobación humana** (`APPROVAL_REQUIRED`, ADR-034). Ningún agente ve «Aprobar» como acción directa.
- **Aprobado (R15).** El documento queda en `core.documentos` con su bitácora y el comprobante de integridad SHA-256 (ADR-039); aparece en la pestaña Documentos de la persona con su vigencia.
- **Lote (R11).** Cuando una **nueva versión de capa instalación o de puesto** cambia el monto de todas las personas que la usan, se genera **un borrador por persona afectada**; cómo se revisan en lote (vista de lote con «Revisar uno por uno») es propuesta del diseño (§16.a, pantalla 06 y 30).

### 4.4 Permisos y sensibilidad (ADR-016, ADR-022)

- Los **montos de sueldo** los ven **owner y admin** (bloqueo financiero, ADR-016); el gerente ve Personas «sin Nómina ni montos», el viewer «lectura sin montos», el supervisor lectura con alcance y sin Nómina (`NAVEGACION.md` §5). La variante «sin permiso» muestra montos «••••» y la nota «Solo owner y admin ven los montos», pero **el origen de la capa sí se ve** (si también se oculta: §16.b). El filtro se aplica en la **consulta** de la capacidad, nunca en la UI (ADR-022).
- El cargo conserva la **sensibilidad del sueldo** (`sueldoSensible`). Cómo se combina esa marca por cargo con la regla general de §5 (p. ej. si el gerente ve montos de cargos no sensibles) está resuelto en el diseño (§16.b).
- **Permisos finos** de crear/cambiar capas y editar el vínculo: **dependen del Brief 07c** (§16.d). Este brief usa las familias de permiso existentes (`core:estructuras.*`, `core:vinculos.*` y el permiso del anexo) y deja el refinamiento por rol personalizado al 07c; el diseño solo muestra el estado «sin permiso».

## 5. Archivos (previstos)

- `packages/domain/src/estructuras.ts` → reescritura de la resolución (capas sin herencia, devuelve la capa que rigió); tipos nuevos (`Capa`, `ResolucionCapa`) y retiro de la herencia por concepto. `packages/domain/src/index.ts` → exporta los tipos nuevos (append aditivo).
- `packages/db/prisma/schema/maestros.prisma` → `EstructuraSueldo` gana `instalacionId` y la capa `instalacion`; `VinculoLaboral` gana `instalacionId`, `puestoId` (opcional) y los campos de jornada pactada. `packages/db/prisma/schema/documentos.prisma` (o un `anexos.prisma` nuevo) → `AnexoContrato`. **No se toca `core.prisma`** (los modelos de 07b viven en `maestros.prisma` y en documentos/anexos; §11).
- `packages/db/prisma/migrations/` → tres migraciones aditivas (§6), con RLS/grants donde haya tabla nueva, CHECK ampliado y triggers de mismo tenant.
- `packages/capabilities/src/core/maestros/estructuras*.ts` → capa instalación, resolución que devuelve la capa, vista previa de impacto; `vinculos.ts` → instalación, puesto y jornada pactada; `cargos.ts` → lista sin montos. `packages/capabilities/src/core/anexos/*` (nuevo) → generar/aprobar/rechazar/list/get del anexo; consumidor del evento de anexo en `apps/web/lib/registro.ts`.
- `packages/capabilities/test/paridad-excepciones.ts` y `.../__snapshots__/herramientas-mcp.txt` → las `soloPersonas` del anexo y el snapshot regenerado (§11).
- `apps/web/app/(erp)/instalaciones/[id]/*`, `.../personas/[id]/{sueldo,laboral,anexos}/*`, `.../cargos/*` y `apps/web/app/(erp)/page.tsx` (Bandeja) → pantallas de §8; `packages/ds/src/*` → piezas nuevas del DS (§9 del pedido) con su aparición en `/ds`.
- `docs/2.0/ROADMAP.md` y `docs/2.0/ESTADO.md` → fila/paso del 07b a «brief en revisión» con enlace al brief (§11, mínimo). `docs/2.0/agentes/operar-el-nucleo.md` → si cambian las herramientas MCP.

## 6. Modelo de datos y migraciones

**Tres migraciones aditivas**, una por PR con migración (§11). **Timestamps posteriores a los de las ramas 07c y 07d** (07c PR1 `20261026120000`, 07c PR2 `20261026160000`, 07d PR1 `20261027000000`), para que las de 07b **ordenen siempre al final** sin importar el orden de merge; al ejecutar, quien abre cada PR confirma `ls packages/db/prisma/migrations` y usa un timestamp posterior al último presente. Todas son aditivas y sobre tablas que las otras ramas **no tocan** (ellas tocan `identidad`, `core`, `permisos`, `tenancy`, `servicios`; 07b toca `maestros` y `documentos/anexos`), así que la aplicación fuera de orden es inocua.

- **PR 1 — `20261028100000_capa_instalacion_sueldo`** (sobre `core.estructuras_sueldo`, que ya tiene RLS y política):
  - Columna `instalacion_id uuid NULL` con FK a `core.instalaciones` e índice `(tenant_id, nivel, instalacion_id)`.
  - CHECK de «exactamente una referencia» **ampliado** para admitir `nivel = 'instalacion'` con `instalacion_id` presente y las otras tres nulas (y las combinaciones actuales de `puesto`/`persona`; `cargo` se conserva para los datos antiguos, R6).
  - **Backfill:** ninguno (columna nueva nulable). Las filas `nivel = 'cargo'` existentes **no se borran** (R6); su conversión a capa instalación o su archivado es una **decisión de Carlos sobre los datos de `dev`** y se aplica con un **script idempotente aparte** (con `--dry-run` y reporte), no en esta migración de esquema.
  - Se agrega `instalacion_id` al trigger de mismo tenant (`core.verificar_mismo_tenant`).
- **PR 2 — `20261028110000_vinculo_instalacion_jornada`** (sobre `core.vinculos_laborales`, con RLS):
  - `instalacion_id uuid` (obligatoriedad: **propuesta «obligatoria»**, §16.a; se crea nulable y se endurece tras el backfill), `puesto_id uuid NULL` (FK a `core.puestos`), y los campos de **jornada pactada** (propuesta: `horas_semanales int`, `distribucion`/`tipo_jornada`; §16.a). FKs e índices; ambas referencias al trigger de mismo tenant.
  - **Backfill:** los vínculos vigentes de `dev` quedan con `instalacion_id` por completar (lo completa RRHH o un script de `dev`); no se inventa instalación.
- **PR 3 — `20261028120000_anexo_contrato_borrador`** (tabla nueva `core.anexos_contrato`, con RLS):
  - `tenant_id`, `created_at`, `updated_at`, uuid v7, `@@schema("core")`, columnas `snake_case` por `@map`; `persona_id`/`vinculo_id`, `estado` (`borrador | aprobado | rechazado`), `motivo_cambio` (capa/monto/instalación/rol), `snapshot_antes`/`snapshot_despues` (JSON, sin datos personales en texto libre), generado_por (membresía/usuario o agente vía usuario), aprobado/rechazado por y cuándo, `motivo_rechazo`, `documento_id` (FK a `core.documentos` al aprobar).
  - `ENABLE ROW LEVEL SECURITY` y política `tenant_isolation` para `opai_app` (plantilla de `REGLAS-codigo.md`); grants; referencias validadas del mismo tenant por trigger.

Toda tabla con `tenant_id` lleva RLS y la política (CI falla si falta, `packages/db/test/rls-nucleo*.test.ts`). Los **PR con migración llevan la etiqueta `migracion-pendiente`** (la pone quien abre el PR; Carlos la aplica en Neon `dev` y `main` y la quita). Ninguna migración es destructiva; el retiro definitivo de la capa `cargo` (borrar columnas/filas) **no** se hace aquí.

## 7. Capacidades (paridad UI ↔ API v1 ↔ MCP)

Toda consulta o mutación de negocio es una capacidad; UI, API y MCP invocan la misma, con los mismos permisos (ADR-004, ADR-034). Toda escritura acepta `dry_run` (MCP: `preview_…`) e `idempotencyKey` y queda en `core.audit_events`.

- **Capas (ampliar `core.estructuras.*`):** `create` y `anular` aceptan la capa **instalación** (`nivel = 'instalacion'`, `instalacionId`) además de puesto y RUT; el RUT exige **motivo** (R1). `core.estructuras.efectiva` pasa a **resolver sin herencia** y a **devolver la capa que rigió** y el origen por concepto (R2, R5). Se agrega la **vista previa de impacto** (personas y puestos afectados, diferencia por concepto, número de borradores que se generarían) como parte del `dry_run` de la nueva versión. `list`/`get` reflejan la capa. Sin herramientas nuevas salvo las que falten; las de lectura cambian su consulta.
- **Vínculo (`core.vinculos.update`/`create`):** aceptan `instalacionId`, `puestoId` (opcional) y la jornada pactada; validan que el puesto pertenezca a la instalación y que siga habiendo uno vigente por persona; al cambiar instalación o puesto, el `dry_run` muestra **cómo cambia la capa que rige** (antes/después).
- **Cargos (`core.cargos.*`):** la lista deja de exponer montos (R3); se conserva `sueldoSensible`.
- **Anexo (`core.anexos.*`, nuevas):** `generar` (lo dispara el consumidor del evento de cambio; también manual con `dry_run`), `aprobar`, `rechazar` (motivo; §16.a), `list`, `get`. **`aprobar` y `rechazar` son `soloPersonas: true`** (gobierno; un agente no aprueba, ADR-034) y se declaran en `paridad-excepciones.ts` con motivo; para agentes, `APPROVAL_REQUIRED`. Descripción de capacidad en lenguaje de negocio ≥ 40 caracteres.
- **Paridad:** toda capacidad `core.*` nueva no interna ni solo-personas produce herramienta MCP; el brief cierra con `tools/list` en `main`, el snapshot `herramientas-mcp.txt` actualizado y el gate de paridad (`packages/capabilities/test/paridad.test.ts` y `apps/web/test/paridad-registro.test.ts`) en verde. Tras desplegar, `OPAI_MCP_KEY=<key> pnpm mcp:verificar` (Carlos).

## 8. Interfaz y responsive — mapa de las 34 pantallas a rutas reales

Estados obligatorios en cada superficie (R de §8 del pedido): **vacío** (con acción), **cargando** (skeleton con la forma del contenido), **error** (ErrorState con «Reintentar»), **sin permiso** (Forbidden compacto o montos «••••») y **confirmación** (Dialog con vista previa y Toast). Solo tokens y componentes de `@opai/ds`; 375/1024/1280; contraste AA; touch ≥ 44 px; presupuesto de JS por ruta (ADR-037, ADR-045). El título va en el `AppShell` en iPad/escritorio y en el patrón en teléfono; la acción principal va en el patrón (Brief 05).

| # (pedido) | Pantalla | Ruta / superficie real |
|---|---|---|
| 01–03 | Capa instalación vigente, uso y versiones (1280/oscuro/375) | pestaña **«Sueldo»** de la ficha de Instalación tras Puestos: `/(erp)/instalaciones/[id]/sueldo` *(pestaña propuesta; §16.a / §16.b la ubicación exacta)* |
| 04 | Instalación sin sueldo (vacío, «Definir sueldo») | misma ruta, estado vacío |
| 05 | Sheet «Nueva versión» (solape inline, vista previa de impacto) | misma ruta, Sheet (lateral 1024/1280, inferior 375) |
| 06 | Dialog de confirmación: antes/después y borradores (lote) | misma ruta, Dialog |
| 07 | Pestaña Puestos con el badge de capa por puesto | `/(erp)/instalaciones/[id]/puestos` |
| 08–09 | Hoja del puesto: «Usa el de la instalación» / «Sueldo propio» | bloque **«Sueldo»** de la hoja del puesto dentro de Puestos (el modelo del puesto es Brief 11; aquí solo su bloque de sueldo) |
| 10–13 | Persona: tres capas, la que rige resaltada, origen por monto; a otra fecha | pestaña **«Sueldo»** de la Persona: `/(erp)/personas/[id]/sueldo` *(se mantiene como pestaña; §16.a)* |
| 14–15 | Sheet «Definir sueldo por RUT» (motivo obligatorio) + confirmar | misma ruta, Sheet y Dialog |
| 16 | Persona sin capa definida, con acciones a la capa que falta | misma ruta, estado vacío |
| 17 | Persona sueldo sin permiso (montos «••••») | misma ruta, variante sin permiso |
| 18 | Lista de cargos sin montos, aviso del cambio, candado de sensible | `/(erp)/cargos` |
| 19–20 | Cargo: estructuras antiguas archivadas (a) / convertidas (b) | `/(erp)/cargos/[id]` *(R6: dos variantes; §16.b)* |
| 21 | Persona: historial con «Capa cargo (retirada)» en solo lectura | `/(erp)/personas/[id]/sueldo` (historial) |
| 22–23 | Vínculo vigente con instalación, puesto y jornada pactada; historial | pestaña **«Laboral»** de la Persona: `/(erp)/personas/[id]/laboral` |
| 24–25 | Sheet de edición del vínculo (vista previa de cambio de capa; errores) | misma ruta, Sheet |
| 26–28 | Anexo en borrador: documento con plantilla base y marca + panel RRHH | vista del borrador del anexo de la persona: `/(erp)/personas/[id]/anexos/[anexoId]` *(ruta propuesta; §16.b la ubicación)* |
| 29 | Dialogs de aprobar/rechazar; anexo ya en Documentos con SHA-256 | misma ruta (Dialogs) → `/(erp)/personas/[id]/documentos` |
| 30 | Lista de anexos pendientes (variante de agente con `APPROVAL_REQUIRED`) | Bandeja de Inicio `/(erp)` **y** ficha de la persona *(propuesta; ubicación §16.a)* |
| 31–32 | Estados (cargando, vacío, error, sin permiso) de capa, resolución, vínculo y anexo | transversales en las rutas anteriores |
| 33 | Tablero «Decide Carlos» | este brief, §16 |
| 34 | Piezas nuevas del DS (claro y oscuro) | `/ds` (solo fuera de producción) |

**Piezas nuevas del DS (§9 del pedido):** `BadgeCapa`, `PilaCapas`, `OrigenMonto`, `TablaEstructura`, `VersionesVigencia`, `AntesDespues`, `AvisoAnexo`, `ImpactoCambio`, `DocumentoBorrador`, `PanelAprobacion`, `DatoArchivado`. Cada una aparece en `/ds` con reposo, hover (solo puntero), foco por teclado, deshabilitado y error cuando aplique, en claro y oscuro. Si un componente existente ya sirve (p. ej. `VersionesVigencia` sobre `Timeline`/`Vigencia`, `BadgeCapa` sobre `Badge`), se reutiliza y se dice, en vez de crear uno nuevo (ADR-017); lo que sea realmente nuevo pasa por Claude Design (ya aprobado). `MarcaDecideCarlos` es una etiqueta de anotación del export, no un componente de la app.

## 9. Seguridad y tenant

- **Multi-tenant (no negociable):** `core.anexos_contrato` y los campos nuevos llevan `tenant_id`, RLS y política `tenant_isolation`; el tenant sale de la sesión o la key, nunca del body; las referencias (instalación, puesto, persona, documento) se validan del mismo tenant por trigger.
- **Permiso y alcance en la capacidad, nunca en la UI** (ADR-022): los montos solo los ven owner y admin; el menú oculta, la consulta filtra. Lo mismo por UI, API y MCP (ADR-004, ADR-034).
- **Gobierno con `soloPersonas`:** aprobar y rechazar el anexo son actos humanos; un agente no los ejecuta (`APPROVAL_REQUIRED`).
- **Marca del tenant (ADR-028):** el anexo toma logo, colores y datos legales del perfil de marca; nunca se hardcodean los de Gard. La UI del ERP no cambia de color; solo el documento.
- **Datos personales (Ley 21.719, `AGENTS.md`):** ni RUT, ni sueldos, ni datos de personas se copian a Linear ni a los PR; se enlaza la pantalla. Los `snapshot_antes/_despues` del anexo no vuelcan datos personales en texto libre fuera de la base.
- **Integridad (ADR-039):** el anexo aprobado queda con SHA-256 y bitácora; el comprobante público no expone datos personales.

## 10. Casos límite

- **Instalación sin sueldo** y **puesto sin sueldo propio:** la persona queda «sin sueldo resuelto»; la pantalla ofrece la acción a la capa que falta (R7). Si eso bloquea confirmar puestos: §16.b.
- **Solape de vigencias** en la misma capa y referencia: se rechaza con mensaje inline (R5); la resolución a una fecha elige la vigente a esa fecha.
- **Cambio de capa instalación/puesto** que afecta a muchas personas: **un borrador por persona** y vista de lote (R11; §16.a).
- **Sueldo por RUT sin motivo:** el botón no se activa (R1); terminar o anular un RUT también pide motivo y genera borrador.
- **Vínculo:** puesto que no pertenece a la instalación → error inline; ya hay un vínculo vigente → error (uno vigente por persona).
- **Datos antiguos del nivel cargo:** quedan en solo lectura (archivados o convertidos, R6); en la ficha de la persona, un periodo pagado con la capa cargo se ve como «Capa cargo (retirada)» para no perder la trazabilidad (R5).
- **Agente que intenta aprobar** el anexo: «Requiere aprobación de una persona» (`APPROVAL_REQUIRED`); nunca ve «Aprobar» directo.
- **Sin permiso de montos:** se muestran «••••» pero el origen de la capa sí (si también se oculta: §16.b).

## 11. Plan por bloques y división en PRs (un commit por bloque)

**Cuatro PR**, para revisar y mergear por partes; cada uno con `Fixes CAR-19`. Orden de ejecución, revisión y merge: **PR 1 → PR 2 → PR 3 → PR 4** (el retiro del cargo puede ir en paralelo; no tiene migración de esquema). El 07b va **antes** del 07c y del 07d (`ROADMAP.md`), así que normalmente **07b merge primero**; aun si el orden cambiara, las migraciones aditivas con timestamp posterior y las tablas disjuntas evitan el choque.

**PR 1 — Capa instalación y resolución sin herencia.**
- Bloque 1 · `core:` migración `20261028100000_capa_instalacion_sueldo` (`migracion-pendiente`).
- Bloque 2 · `domain:` reescritura de `estructuras.ts` (capas sin herencia, devuelve la capa que rigió); tipos y tests.
- Bloque 3 · `core:` capacidades de capas (instalación, resolución, vista previa de impacto, emisión del evento de anexo); paridad y snapshot.
- Bloque 4 · `ds:`/`core:` pantallas 01–17 y piezas del DS de capas (`BadgeCapa`, `PilaCapas`, `OrigenMonto`, `TablaEstructura`, `VersionesVigencia`, `AntesDespues`, `ImpactoCambio`), tras el diseño aprobado.

**PR 2 — Retiro del nivel cargo (sin migración de esquema).**
- Bloque 5 · `core:`/`ds:` lista de cargos sin montos, aviso del cambio, estructuras antiguas en solo lectura (`DatoArchivado`); pantallas 18–21; script idempotente de conversión/archivado de los datos `cargo` de `dev` según R6 (con `--dry-run`).

**PR 3 — Vínculo laboral con instalación, puesto y jornada pactada.**
- Bloque 6 · `core:` migración `20261028110000_vinculo_instalacion_jornada` (`migracion-pendiente`).
- Bloque 7 · `core:` capacidades del vínculo (instalación, puesto, jornada; vista previa de cambio de capa); paridad.
- Bloque 8 · `ds:`/`core:` pantallas 22–25, tras el diseño aprobado.

**PR 4 — Anexo de contrato en borrador.**
- Bloque 9 · `core:` migración `20261028120000_anexo_contrato_borrador` (`migracion-pendiente`).
- Bloque 10 · `core:` capacidades `core.anexos.*` (generar/aprobar/rechazar/list/get; `soloPersonas` en aprobar/rechazar), consumidor del evento de anexo en `registro.ts`, documento final en `core.documentos`; paridad, `paridad-excepciones.ts` y snapshot.
- Bloque 11 · `ds:`/`core:` pantallas 26–30 y piezas `AvisoAnexo`, `DocumentoBorrador`, `PanelAprobacion`, tras el diseño aprobado.
- Bloque 12 · `docs:` `ROADMAP.md`, `ESTADO.md`, manual de agentes si cambió, y reporte.

**Archivos compartidos y cómo se evita el choque con 07c y 07d** (revisado con `git diff origin/main...origin/<rama>`):

| Archivo compartido | 07c (`brief/07c-acceso-y-permisos`, `brief/07c-pr2-roles-permisos`) | 07d (`brief/07d-pr1-dpa-rat`) | 07b | Cómo se evita el choque |
|---|---|---|---|---|
| `schema/core.prisma` | PR2 lo toca (roles/permisos) | PR1 lo toca (DPA/DPO) | **no lo toca** | Los modelos de 07b viven en `maestros.prisma` y en `documentos.prisma`/`anexos.prisma`; 07b no edita `core.prisma`. |
| `schema/identidad.prisma`, `permisos.prisma`, `tenancy.prisma`, `servicios.prisma` | 07c los toca | 07d toca `servicios.prisma` | no los toca | Disjuntos del alcance de 07b. |
| Migraciones | `20261026120000`, `20261026160000` | `20261027000000` | `20261028100000/110000/120000` | Timestamps de 07b **posteriores**; aditivas y sobre tablas distintas → aplicación fuera de orden inocua. |
| `packages/domain/src/index.ts` | 07c amplía `permisos.ts` y sus exports | — | exporta tipos de capas | Exports aditivos al final; merge trivial; 07b merge primero (orden del ROADMAP). |
| `herramientas-mcp.txt` (snapshot) | 07c agrega herramientas | 07d agrega herramientas | 07b agrega herramientas | Es archivo **generado**; el PR que mergee **después** regenera el snapshot contra el conjunto combinado y lo commitea. |
| `paridad-excepciones.ts` | 07c agrega `soloPersonas` | 07d agrega `soloPersonas` | 07b agrega las del anexo | Entradas aditivas con ids distintos (`core.anexos.*`); se regenera el gate después. |
| `permisos-catalogo.ts` | **07c define los permisos finos** (B2) | — | usa familias existentes | 07b **no decide el permiso fino** de capas/vínculo (§16.d, dependencia del 07c); solo usa las familias ya presentes. |
| `apps/web/lib/registro.ts` | — | 07d registra consumidores | 07b registra el consumidor del anexo | Registros aditivos; merge trivial. |

## 12. Tests

- **Dominio:** resolución sin herencia (rige la más específica; cada capa aplica completa; devuelve la capa y versión que rigió; capa futura/pasada a otra fecha; sin capa definida); versionado sin solapes; `haberes` y `gratificacionLegal` conservados.
- **Capacidades (contexto falso y `*-db.test.ts` con `opai_app` sin BYPASSRLS):** capa instalación crea/anula; RUT exige motivo; `efectiva` devuelve la capa; vista previa de impacto no persiste; vínculo valida puesto↔instalación y uno vigente por persona; `core.anexos.aprobar/rechazar` rechaza a agentes (`soloPersonas`) y pide `APPROVAL_REQUIRED`; auditoría de las escrituras; `dryRun` no persiste; idempotencia no duplica; montos ocultos sin `read_sensible`.
- **Base (`pnpm test:db`):** RLS de `core.anexos_contrato` (aislamiento por tenant); CHECK ampliado de `estructuras_sueldo`; triggers de mismo tenant de las referencias nuevas.
- **Paridad (ADR-034):** toda capacidad nueva no interna ni solo-personas produce herramienta; snapshot actualizado; `apps/web` sin imports de `@opai/db` salvo `paridad-permitidos.json`.
- **e2e (375/1024/1280):** definir sueldo de instalación con nueva versión y vista previa; resolución de una persona con la capa que rige; definir sueldo por RUT con motivo; editar el vínculo con cambio de capa; generar, aprobar y rechazar un anexo; variante sin permiso con «••••».

## 13. Validación

`pnpm typecheck && pnpm lint && pnpm test` antes de cada commit; `pnpm test:db` por tocar base, RLS y capacidades con base; `pnpm --filter @opai/web build` + `pnpm presupuesto` por tocar la web (ADR-037); Playwright local a 375/1024/1280; capturas a 375 y 1280 de las pantallas nuevas; `docs/2.0/checklists/revision.md`, `qa.md` y `paridad.md`. Medición de ADR-045 (≤ 8 consultas por navegación) en las fichas de Instalación y Persona. `tools/list` en `main` y, tras desplegar, `pnpm mcp:verificar` (Carlos).

## 14. Criterios de aceptación

- **CA-1 (capa instalación y resolución).** Una instalación define su sueldo por defecto; una persona ve las tres capas, la que rige resaltada y el origen por concepto, **sin herencia ni mezcla**; la resolución devuelve la capa y versión que rigió. *(ADR-036, actualización del 25-oct.)*
- **CA-2 (retiro del cargo sin perder datos).** La lista de cargos no muestra montos; las estructuras antiguas del cargo quedan en solo lectura (archivadas o convertidas, R6) y el historial de la persona conserva «Capa cargo (retirada)»; **no se borra nada**.
- **CA-3 (vínculo laboral).** El vínculo guarda instalación, puesto (opcional) y jornada pactada, con uno vigente por persona; al cambiar instalación o puesto se ve cómo cambia la capa que rige.
- **CA-4 (anexo de contrato).** Un cambio de capa, monto, instalación o rol genera el borrador del anexo con la plantilla base y la marca del tenant; RRHH lo aprueba o lo rechaza; aprobado queda en `core.documentos` con SHA-256; un agente no lo aprueba (`APPROVAL_REQUIRED`). *(ADR-048 puntos 5 y 7; ADR-036 punto 5; ADR-039.)*
- **CA-paridad.** Gate de paridad y presupuesto de JS en verde; `tools/list` en `main` sin capacidades de pantalla sin herramienta; todo por capacidad con `dryRun`, `idempotencyKey` y auditoría.

## 15. Riesgos y rollback

- **Cambio en la resolución de sueldo:** reescribir `estructuras.ts` afecta a toda lectura de estructura efectiva. Mitigación: tests de dominio que fijan el comportamiento nuevo; la vista «Capa cargo (retirada)» conserva la trazabilidad de lo pagado con el modelo anterior (R5).
- **Choque con 07c/07d:** mitigado por §11 (tablas y schemas disjuntos, timestamps posteriores, snapshot regenerado por el que merge después). El **permiso fino** de capas/vínculo depende del 07c: mientras no esté, 07b usa las familias existentes y el diseño muestra «sin permiso» (§16.d).
- **Anexo acoplado a varios PR:** el disparo del borrador va por evento de outbox (ADR-029); el consumidor llega en PR 4. Antes de PR 4, el cambio emite el evento sin consumidor (sin efecto), no rompe nada.
- **Datos de `dev` del nivel cargo (R6):** la conversión/archivado la decide Carlos; se aplica con script idempotente y `--dry-run`, nunca en la migración de esquema.
- **Migraciones:** las aplica Carlos en Neon `dev` y `main`; cada PR con migración lleva `migracion-pendiente`.
- **Rollback:** las columnas y la tabla son nuevas y aditivas; al revertir el PR quedan huérfanas sin efecto. La capa `cargo` nunca se borra en este brief, así que revertir no pierde datos.

## 16. Resolución de decisiones del diseño y decisiones abiertas

Lista única. **(a)** y **(b)** son los puntos «decide Carlos» del pedido de diseño; quedaron resueltos con la **aprobación del diseño** (Carlos, 26-oct-2026 14:27 CLT, t340u: «aprobado todo con las recomendaciones tuyas»). La numeración **D1–D16 es la del tablero de Claude Design** y la pone el bot al transcribir; aquí la columna «D» dice **«por confirmar»**. En **(a)**, el pedido trae una propuesta concreta («propuesta» o «Dibuja …») y la aprobación la resuelve en esa opción. En **(b)**, el pedido **no** trae una propuesta concreta: el texto que rige vive en el tablero del diseño y **lo transcribe el bot desde Claude Design**; la «Recomendación de Claude» es solo eso, **no una decisión de Carlos**. **(d)** son decisiones nuevas que surgieron al escribir el brief, con opciones y recomendación de Claude, sin inventar decisiones de Carlos.

### 16.a — Puntos «decide Carlos» con propuesta concreta en el pedido → Resueltos en la opción recomendada (Carlos, 26-oct 14:27 CLT, t340u)

| D | Punto | Opción resuelta (propuesta del pedido) | Pantalla(s) |
|---|---|---|---|
| por confirmar | **R11 · «cambio de rol»** (ADR-036 punto 5) | **Resuelto: el «rol» es el rol de turno** (días del patrón, ADR-036 reglas del puesto punto 3), según el encargo; aprobado por Carlos el 26-oct 14:27 CLT (t340u) | 24, 26 |
| por confirmar | **Composición de la jornada pactada** (R10) | **Horas semanales y distribución** (p. ej. «45 h semanales · lunes a viernes»); opción recomendada, aprobada el 26-oct 14:27 CLT (t340u) | 22, 24 |
| por confirmar | **Instalación del vínculo obligatoria u opcional** | **Obligatoria** (puesto opcional); opción recomendada, aprobada el 26-oct 14:27 CLT (t340u) | 22, 24 |
| por confirmar | **Rechazar el anexo pide motivo** | **Sí**, como el rechazo de Aprobaciones; opción recomendada, aprobada el 26-oct 14:27 CLT (t340u) | 29 |
| por confirmar | **Borrador por persona y revisión en lote** (R11) | **Un borrador por persona** y vista de lote «Revisar uno por uno»; opción recomendada, aprobada el 26-oct 14:27 CLT (t340u) | 06, 30 |
| por confirmar | **Dónde se ven los anexos pendientes** | **Bandeja de Inicio + ficha de la persona**; opción recomendada, aprobada el 26-oct 14:27 CLT (t340u) | 30 |
| por confirmar | **Dónde vive la capa instalación** | **Pestaña propia «Sueldo»** tras Puestos (variantes (b) sección en Resumen y (c) solo desde «Cargos y sueldos» anotadas); opción recomendada, aprobada el 26-oct 14:27 CLT (t340u) | 01–06 |
| por confirmar | **Sueldo de la persona: pestaña propia o dentro de Laboral** | **Se mantiene la pestaña «Sueldo»**; opción recomendada, aprobada el 26-oct 14:27 CLT (t340u) | 10–17 |

### 16.b — Puntos «decide Carlos» sin propuesta concreta en el pedido → Resueltos en el diseño aprobado; texto por transcribir desde Claude Design por el bot

Cada fila queda **«Resuelto en el diseño aprobado (D por confirmar); texto por transcribir desde Claude Design por el bot»**. La recomendación es de **Claude**, no una decisión de Carlos.

| D | Punto | Fuente | Recomendación de Claude (no es decisión de Carlos) | Pantalla(s) |
|---|---|---|---|---|
| por confirmar | **R6 · ¿archivar o convertir** las filas `cargo`? | §6 pedido, ADR-036 Consecuencias | Convertir a capa **instalación** las que correspondan a una sola instalación y **archivar** el resto; decisión sobre los datos de `dev`; nunca borrar | 19, 20 |
| por confirmar | **Rol que aprueba el anexo por defecto** | R13 (no hay rol «RRHH» base, ADR-016) | **admin** por defecto, configurable; refinar con los roles personalizados del 07c | 26–30 |
| por confirmar | **Firma del anexo** (electrónica, papel, por quién) | R, §7 pedido | Fuera de alcance aquí (Brief 28); el flujo termina en «Aprobado y guardado en Documentos» | 29 |
| por confirmar | **Texto y cláusulas de la plantilla base** | R12 | Estructura dibujada (encabezado con marca, partes, qué cambia y desde cuándo, firmas); el **texto legal** lo fija Carlos | 26–28 |
| por confirmar | **Cómo se combina la sensibilidad del cargo con ADR-016** (p. ej. gerente ve montos de cargos no sensibles) | §2 pedido | Mantener el bloqueo financiero de ADR-016 (montos solo owner/admin); la marca `sueldoSensible` añade restricción, no la relaja | 17, 18 |
| por confirmar | **¿Instalación sin sueldo bloquea algo más** (p. ej. confirmar puestos)? | §3 pedido | **Avisar, no bloquear**: la persona/puesto queda «sin sueldo resuelto»; el bloqueo de confirmar puestos es del Brief 11 | 04, 16 |
| por confirmar | **¿La estructura por RUT parte prellenada** con la capa que rige hoy? | §5 pedido | Prellenar **solo como punto de partida** (sin herencia); el usuario la edita completa | 14 |
| por confirmar | **¿Se oculta también el origen de la capa** sin permiso? | §5 pedido | Mostrar el **origen** de la capa; ocultar solo los **montos** («••••») | 17 |
| por confirmar | **¿La entrada sigue llamándose «Cargos y sueldos»** si el cargo ya no define montos? | §6 pedido | Mantener el nombre (`NAVEGACION.md`); el sueldo se gestiona en Instalación, Puesto y Persona | 18 |
| por confirmar | **Ubicación de la vista del anexo** (ruta/pestaña) | §7 pedido | Bajo la persona (`/(erp)/personas/[id]/anexos/[anexoId]`), con el pendiente también en la Bandeja | 26–30 |

### 16.d — Decisiones nuevas de este brief (opciones y recomendación de Claude; no son decisiones de Carlos)

1. **Permiso fino para crear/cambiar capas y editar el vínculo.** **Depende del Brief 07c** (B2, roles y permisos finos; ADR-022, nota del 26-oct). Opciones: (A) 07b usa las familias existentes (`core:estructuras.*`, `core:vinculos.*`) y 07c refina por rol personalizado; (B) 07b define permisos nuevos ahora. **Recomendación: A** (no adelantar el modelo de permisos del 07c; el diseño ya solo muestra «sin permiso»). El **permiso exacto lo decide Carlos en el 07c**.
2. **Permiso para aprobar/rechazar el anexo.** El rol que aprueba es configurable (R13). Opciones: (A) por defecto **admin**, configurable con el 07c; (B) crear un permiso `core:anexos.approve` desde ya. **Recomendación: A** con `soloPersonas: true` (gobierno), afinando el rol con los roles personalizados del 07c.
3. **Dónde vive el borrador del anexo.** Opciones: (A) tabla `core.anexos_contrato` para el borrador y `core.documentos` solo al aprobar (recomendada: el borrador tiene estado y antes/después, no es aún un documento verificable); (B) todo en `core.documentos` desde el borrador. **Recomendación: A**.
4. **Convivencia del puesto del vínculo con la asignación de Operaciones (fase 3).** Solo **nota**, no se construye (pedido §2). **Recomendación:** cuando exista Operaciones, la asignación vigente manda sobre el puesto del vínculo para resolver la capa (ADR-048 pregunta abierta 1); se define en el Brief 11/12.
5. **Timestamps de las migraciones de 07b.** **Recomendación:** posteriores a los de 07c/07d (`20261028…`), aditivas y sobre tablas disjuntas, para ordenar siempre al final sin importar el orden de merge (§6, §11).

## 17. Reporte de ejecución

Al cerrar: commits integrados por PR, capturas a 375 y 1280 de las pantallas nuevas, resultado de los tests y de `pnpm test:db`, estado del gate de paridad y del presupuesto de JS, `tools/list` en `main`, y resumen ejecutivo para Carlos: qué se hizo, qué cambia para Gard (el sueldo sale de la instalación, el puesto o el RUT, sin herencia; el vínculo guarda instalación, puesto y jornada; el anexo en borrador que aprueba RRHH), qué decide él (los puntos de §16 pendientes de transcribir y las decisiones nuevas de §16.d) y qué sigue (Brief 07c y 07d para cerrar el Núcleo; luego Puestos, Brief 11).
