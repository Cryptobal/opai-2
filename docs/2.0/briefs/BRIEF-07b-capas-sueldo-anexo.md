# BRIEF DE IMPLEMENTACIÓN — 07b CAPAS DE SUELDO Y ANEXO DE CONTRATO (Núcleo, paso 3)

**Repositorio:** `Cryptobal/opai-2` · **Rama de ejecución:** `brief/07b-capas-sueldo` (desde `main` actualizado) · **Fecha:** 26-oct-2026 · **Estado:** **diseño aprobado, brief en revisión** · **Tarea de Linear:** CAR-19 (<https://linear.app/carlos-irigoyen/issue/CAR-19>); cada PR la vincula con `Fixes CAR-19` (obligatorio, `AGENTS.md` «Tareas (Linear)») · **Depende de:** Brief 02 A–C integrado (maestros, `core.estructuras_sueldo`, `core.vinculos_laborales`, `core.documentos`, fichas de Instalación, Persona y `/cargos`, outbox, auditoría, configuración), y del diseño por áreas del Brief 05 y la base PWA del Brief 04 para el shell y las pestañas · **Va antes del brief de Puestos (Operaciones I, Brief 11)**, porque el puesto usa la capa «sueldo propio del puesto» (`ROADMAP.md`, fila 07b; ADR-048 respuesta 1) · **Reglas:** ADR-036 (actualización del 25-oct: capas de sueldo, «Jornada pactada», «Consecuencias de la actualización» y reglas del puesto), ADR-048 (módulos vendibles, anexo de contrato, jornada pactada), ADR-016 (roles y bloqueo financiero), ADR-022 (permisos vs. alcance; permisos finos al 07c), ADR-028 (marca del tenant), ADR-034 (paridad UI↔MCP y gobierno de agentes), ADR-039 (documentos con bitácora y SHA-256), ADR-041 (fichas con pestañas), ADR-045 (rendimiento), `NAVEGACION.md` · **Diseño aprobado:** [Brief 07b · Capas de sueldo y anexo](https://claude.ai/design/p/18f2f703-5dcf-4e59-aff6-626fdad34d09), archivo «Brief 07b - Capas de sueldo y anexo.dc.html» (34 pantallas en una sola sábana, con el tablero «Decide Carlos» D1–D16), **aprobado** (fuente: «aprobado todo con las recomendaciones tuyas» — Carlos, 26-oct-2026 14:27 CLT, chat con el bot OPAI 2.0, t340u). El pedido de diseño está en `docs/2.0/design/07b/pedido-diseno.md` (primer commit de este PR); de ahí salen las reglas R1–R15, los puntos «decide Carlos», las 34 pantallas (§8 del pedido) y las piezas nuevas del DS (§9 del pedido). El tablero «Decide Carlos» (pantalla 33) está transcrito en texto plano en `docs/2.0/design/07b/decisiones-D1-D16.txt` y el export HTML completo del proyecto en `docs/2.0/design/07b/export/`, ambos agregados al repo sin modificarlos; §16 recoge la resolución de los 16 puntos D1–D16 en la opción aprobada por Carlos.

> **Pedido y aprobaciones.** El diseño lo aprobó Carlos el 26-oct-2026 a las 14:27 CLT (t340u): «aprobado todo con las recomendaciones tuyas». Con esa aprobación, **todos los puntos «decide Carlos» del pedido de diseño quedan resueltos en la opción que el pedido propone como propuesta** (o en lo que el diseño dibujó), y **R11 «cambio de rol» se entiende como el rol de turno** (días del patrón, ADR-036 reglas del puesto, punto 3). El orden de trabajo es el de ADR-048 modificación del 25-oct (Brief 05 → Brief 04 → Brief 07b, antes del brief de Puestos) y la fila 07b de `ROADMAP.md`. Este documento es **solo el brief** (sin código). Estado: aprobado por OPAI 2.0 con autoridad delegada de Carlos (t500u, 26-oct-2026 22:51 CLT: "quédate esta noche avanzando con todo hasta que la fase 1 quede lista; no me pidas autorizaciones, toma tú todas las decisiones"); Carlos puede vetarlo; el texto legal del anexo queda pendiente de su revisión. Codex gpt-6.1-sol lo ejecuta en la rama `brief/07b-capas-sueldo`, con un commit por bloque y el gate en verde, autorrevisión con un subagente, PR y revisión del «Revisor OPAI 2.0»; integra el bot «OPAI 2.0» con squash (ADR-043 v3). **Trae migraciones:** quien abre cada PR con migración pone la etiqueta `migracion-pendiente`; Carlos la aplica en Neon `dev` y `main` y la quita.

> **Decisiones de producto.** Los 16 puntos «decide Carlos» del tablero del diseño (D1–D16) quedaron resueltos por la aprobación del diseño, cada uno en su opción **«Recomendada»** (§16.a transcribe título, opción elegida con su texto y pantallas desde `docs/2.0/design/07b/decisiones-D1-D16.txt`). El único insumo de negocio que D1–D16 no cierra —el **texto legal de la plantilla base del anexo**, que según D15 define Carlos— queda en §16.b «pendiente de Carlos» con la recomendación de Claude, sin darlo por resuelto. Las decisiones técnicas que surgieron al escribir el brief van en §16.c con opciones y recomendación de Claude, sin inventar decisiones de Carlos.

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
- **Retiro del nivel cargo** como capa de sueldo, **sin borrar datos**: las estructuras `cargo` existentes quedan **archivadas** (solo lectura, ya no se usan para pagar; **D10**, no se convierten), sin alterar los montos vigentes; la lista de cargos pierde los montos (R3, R6).
- **Vínculo laboral** con **instalación**, **puesto (opcional)** y **jornada pactada** (R8, R9); migración aditiva de `core.vinculos_laborales`.
- **Anexo de contrato en borrador**: tabla del núcleo para el borrador, su generación por cambio de capa/monto/instalación/rol (R11), la plantilla base del sistema con la marca del tenant (R12, ADR-028), la aprobación y el rechazo por RRHH (R13, R14), y el documento final en `core.documentos` con bitácora y SHA-256 (R15, ADR-039).
- Capacidades nuevas y ampliadas con **paridad MCP**, `dry_run`, `idempotencyKey`, auditoría y `APPROVAL_REQUIRED` para agentes (R13, R14); las de gobierno con `soloPersonas: true`.
- Pantallas del portal ERP (las 34 del pedido mapeadas a rutas y pestañas reales, §8) y las piezas nuevas del DS (§9 del pedido), pasando por Claude Design (ya aprobado).
- Tests de dominio, de capacidades (incl. `*-db.test.ts`), de base (`pnpm test:db`), e2e (375/1024/1280) y gate de paridad en verde; presupuesto de JS de ADR-037/045.

### Excluido (otros briefs, backlog o fuera de alcance)

- **«Grupo de sueldo» (R4):** backlog (ADR-036 punto 4); no se diseña ni se construye.
- **Editor de plantillas del anexo:** llega con el **Brief 09** (Documentos); aquí solo la **plantilla base del sistema**, no editable por el tenant (R12, ADR-048 punto 5).
- **Flujo de CPQ** (ofrecer puestos al ganar el negocio, sueldo cotizado) y **modelo del puesto** (1 puesto = 1 posición, patrones, tramos): Brief 11 (Puestos) y fase 2 (ADR-040, ADR-042, ADR-048). Aquí solo el **bloque de sueldo** del puesto; no se rediseña el puesto.
- **Permisos finos** de quién crea o cambia capas (instalación, puesto, RUT) y edita el vínculo: **owner y admin hasta el 07c** (**D8**); el refinamiento por rol personalizado depende del **Brief 07c** (B2, roles y permisos finos; ADR-022, nota del 26-oct). Este brief usa las familias de permisos que ya existen y el diseño solo muestra el estado «sin permiso».
- **Alcance por filas** del supervisor (B3): Brief 07c. Este brief solo apoya al 07c dejando la **instalación en el vínculo** (de la que 07c deriva el alcance de personas con vínculo vigente).
- **Firma electrónica** del anexo: fuera de alcance (Brief 28). El 07b termina en «Aprobado y guardado en Documentos» (R15; **D15**).
- **Portales Trabajador, Supervisor y Cliente:** no cambian; el trabajador verá su anexo cuando llegue su portal (fase 3).

## 4. Arquitectura

### 4.1 Capas de sueldo (R1–R3, R5)

- **Tres capas:** **instalación** (por defecto), **puesto** (cuando el puesto tiene su propio sueldo) y **sueldo por RUT** (persona; la excepción, con **motivo obligatorio y auditoría**). El cargo **deja de ser capa** (R3): no define montos.
- **Una sola capa por asignación, sin herencia (R2).** Rige la **más específica que exista** (RUT → puesto → instalación) y **su estructura se aplica completa**. No hay valor `null` que herede: **toda estructura de cualquier capa define todos sus conceptos** (sueldo base, colación, movilización, gratificación —legal 25 % · monto fijo · ninguna— y bonos fijos o porcentuales con su marca de imponible). Se retira `combinarPorConcepto` y la semántica de herencia de `estructuras.ts`.
- **Versionado (R5).** Las estructuras siguen versionadas por vigencia, **sin solapes en la misma capa y referencia**. La resolución **devuelve la capa y la versión que rigió** (para que liquidación y costeo la guarden): el tipo de resolución pasa a exponer `capa` (`instalacion | puesto | persona`) y la estructura completa de esa capa, más el estado de cada capa (rige / existe pero no rige / no definida). La resolución vive en `packages/domain` (pura, con tests); las capacidades la invocan.
- **Instalación o puesto sin sueldo (R7).** Un puesto puede nacer **sin sueldo propio** (usa el de la instalación) y una instalación puede estar **sin sueldo definido** (estado a mostrar). El flujo de CPQ que ofrece los puestos no es de este brief; aquí solo importa que la capa se resuelva desde la instalación y el puesto del vínculo (ADR-048 respuestas 1 y 3). Una instalación sin sueldo **solo avisa, no bloquea** (**D2**): las personas quedan «sin sueldo resuelto».

### 4.2 Vínculo laboral (R8–R10)

- `core.vinculos_laborales` gana **instalación** (**obligatoria**, **D12**), **puesto (opcional)** y **jornada pactada** (ADR-036 «Jornada pactada»; ADR-048 punto 7 «Aislamiento»). La jornada pactada es parte del contrato y vive en el núcleo; **PIN y Face ID siguen en Asistencia** (no van aquí).
- El vínculo usa la **instalación** (y el **puesto**, opcional) para **resolver la capa de sueldo** sin Operaciones (ADR-048 Consecuencias): sin puesto, rige la capa instalación; con puesto que tiene sueldo propio, rige la del puesto; un sueldo por RUT vigente gana a ambas.
- **Uno vigente por persona** (ADR-036); se conserva el índice parcial.
- **Composición de la jornada pactada** (horas semanales, distribución, horario, tipo): **horas semanales y distribución** (lunes a viernes, 4×4…; **D11**). La convivencia del puesto del vínculo con la asignación de Operaciones de la fase 3 queda como **nota** (§16.c), no se construye.

### 4.3 Anexo de contrato en borrador (R11–R15)

- **Qué lo genera (R11).** Un cambio de **rol** (rol de turno, ADR-036 reglas del puesto punto 3), **de capa de sueldo**, **de monto** o **de instalación** de una persona **genera solo el borrador** del anexo; en particular, todo cambio de la capa vigente o del monto. Las capacidades que producen ese cambio **emiten un evento de dominio por outbox** (ADR-029) en la misma transacción; el **consumidor del anexo** crea el borrador. Así el borrador se genera igual lo dispare la pantalla, la API o el MCP, y el disparo no se acopla al orden de merge de los PR (§11).
- **Dónde vive.** El borrador vive en el núcleo, junto a `core.vinculos_laborales` y `core.documentos`, y **funciona aunque el tenant no tenga Nómina** (ADR-048 punto 5). Se propone una tabla del tenant `core.anexos_contrato` (con RLS) para el borrador y su estado; el **documento aprobado** se materializa en `core.documentos` con su bitácora y SHA-256 (R15, ADR-039). No se crea una tabla de adjuntos propia (ADR-019).
- **Plantilla base (R12).** El borrador usa la **plantilla base del sistema** con la **marca del perfil del tenant** (ADR-028: logo, colores de marca, nombre comercial, datos legales); el **texto** de la plantilla base lo fija Carlos (§16.b: estructura dibujada —encabezado con marca, partes, qué cambia y desde cuándo, firmas—, con texto de relleno). El editor de plantillas por tenant es del Brief 09: aquí **no hay editor**.
- **Aprobación (R13, R14).** Lo aprueba por defecto **admin**, **configurable por tenant** (**D13**: no existe un rol «RRHH» base, ADR-016; el refinamiento por rol personalizado llega con el 07c). **Generar, aprobar y rechazar** son capacidades con `dry_run`, `idempotencyKey` y auditoría; **rechazar pide motivo obligatorio** (**D14**, como el rechazo de Aprobaciones). **Un agente no lo aprueba**: aprobar y rechazar llevan `soloPersonas: true`, y para agentes la acción pide **aprobación humana** (`APPROVAL_REQUIRED`, ADR-034). Ningún agente ve «Aprobar» como acción directa.
- **Aprobado (R15).** El 07b **termina en «Aprobado y guardado en Documentos», sin firma** (**D15**; la firma es Brief 28). El documento queda en `core.documentos` con su bitácora y el comprobante de integridad SHA-256 (ADR-039); aparece en la pestaña Documentos de la persona con su vigencia. En modo oscuro el documento conserva su papel claro (D15).
- **Lote (R11).** Cuando una **nueva versión de capa instalación o de puesto** cambia el monto de todas las personas que la usan, se genera **un borrador por persona afectada** con **vista de lote «Revisar uno por uno»** (**D3**; pantallas 06 y 30).

### 4.4 Permisos y sensibilidad (ADR-016, ADR-022)

- Los **montos de sueldo** los ven **owner y admin** (bloqueo financiero, ADR-016); el gerente ve Personas «sin Nómina ni montos», el viewer «lectura sin montos», el supervisor lectura con alcance y sin Nómina (`NAVEGACION.md` §5). La variante «sin permiso» muestra montos **«••••»** y la nota «Solo owner y admin ven los montos», pero **el origen de la capa sí se ve** (**D7**: no se oculta el origen). El filtro se aplica en la **consulta** de la capacidad, nunca en la UI (ADR-022).
- El cargo conserva la **sensibilidad del sueldo** (`sueldoSensible`), pero **la marca del cargo no cambia la regla de ADR-016** (**D7**): los montos los siguen viendo solo owner y admin; `sueldoSensible` añade restricción, nunca la relaja (el gerente **no** ve montos de cargos no sensibles).
- **Permisos finos** de crear/cambiar capas y editar el vínculo: **owner y admin hasta el 07c** (**D8**). Este brief usa las familias de permiso existentes (`core:estructuras.*`, `core:vinculos.*` y el permiso del anexo); el refinamiento por rol personalizado llega con el Brief 07c (B2, ADR-022). El diseño muestra el estado «sin permiso».

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
  - **Backfill:** ninguno (columna nueva nulable). Las filas `nivel = 'cargo'` existentes **no se borran** (R6); se **archivan** (solo lectura, **D10**: no se convierten) con un **script idempotente aparte** (con `--dry-run` y reporte), no en esta migración de esquema. Convertir una estructura `cargo` a capa instalación podría ofrecerse más adelante como **acción explícita por instalación** (recomendación de D10), fuera de este brief.
  - Se agrega `instalacion_id` al trigger de mismo tenant (`core.verificar_mismo_tenant`).
- **PR 2 — `20261028110000_vinculo_instalacion_jornada`** (sobre `core.vinculos_laborales`, con RLS):
  - `instalacion_id uuid` (**obligatoria**, **D12**; se crea nulable y se endurece tras el backfill), `puesto_id uuid NULL` (FK a `core.puestos`), y los campos de **jornada pactada** (`horas_semanales int` y `distribucion`; **D11**: horas semanales + distribución). FKs e índices; ambas referencias al trigger de mismo tenant.
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
- **Anexo (`core.anexos.*`, nuevas):** `generar` (lo dispara el consumidor del evento de cambio; también manual con `dry_run`), `aprobar`, `rechazar` (motivo obligatorio; **D14**), `list`, `get`. **`aprobar` y `rechazar` son `soloPersonas: true`** (gobierno; un agente no aprueba, ADR-034) y se declaran en `paridad-excepciones.ts` con motivo; para agentes, `APPROVAL_REQUIRED`. Descripción de capacidad en lenguaje de negocio ≥ 40 caracteres.
- **Paridad:** toda capacidad `core.*` nueva no interna ni solo-personas produce herramienta MCP; el brief cierra con `tools/list` en `main`, el snapshot `herramientas-mcp.txt` actualizado y el gate de paridad (`packages/capabilities/test/paridad.test.ts` y `apps/web/test/paridad-registro.test.ts`) en verde. Tras desplegar, `OPAI_MCP_KEY=<key> pnpm mcp:verificar` (Carlos).

## 8. Interfaz y responsive — mapa de las 34 pantallas a rutas reales

Estados obligatorios en cada superficie (R de §8 del pedido): **vacío** (con acción), **cargando** (skeleton con la forma del contenido), **error** (ErrorState con «Reintentar»), **sin permiso** (Forbidden compacto o montos «••••») y **confirmación** (Dialog con vista previa y Toast). Solo tokens y componentes de `@opai/ds`; 375/1024/1280; contraste AA; touch ≥ 44 px; presupuesto de JS por ruta (ADR-037, ADR-045). El título va en el `AppShell` en iPad/escritorio y en el patrón en teléfono; la acción principal va en el patrón (Brief 05).

> **Enmienda a ADR-041.9 (D1).** ADR-041.9 fija las pestañas de la ficha de Instalación (Resumen → Puestos → Contactos → Negocios → Documentos → Actividad) y no tiene una de sueldo. Por **D1** (aprobado por Carlos el 26-oct-2026 14:27 CLT, t340u), la ficha de Instalación gana una **pestaña propia «Sueldo» después de Puestos**: Resumen → Puestos → **Sueldo** → Contactos → Negocios → Documentos → Actividad. Esta enmienda queda registrada aquí; al ejecutar, se anota también en ADR-041 / `NAVEGACION.md`.

| # (pedido) | Pantalla | Ruta / superficie real |
|---|---|---|
| 01–03 | Capa instalación vigente, uso y versiones (1280/oscuro/375) | pestaña **«Sueldo»** de la ficha de Instalación tras Puestos: `/(erp)/instalaciones/[id]/sueldo` *(D1: pestaña propia tras Puestos; enmienda a ADR-041.9)* |
| 04 | Instalación sin sueldo (vacío, «Definir sueldo») | misma ruta, estado vacío |
| 05 | Sheet «Nueva versión» (solape inline, vista previa de impacto) | misma ruta, Sheet (lateral 1024/1280, inferior 375) |
| 06 | Dialog de confirmación: antes/después y borradores (lote) | misma ruta, Dialog |
| 07 | Pestaña Puestos con el badge de capa por puesto | `/(erp)/instalaciones/[id]/puestos` |
| 08–09 | Hoja del puesto: «Usa el de la instalación» / «Sueldo propio» | bloque **«Sueldo»** de la hoja del puesto dentro de Puestos (el modelo del puesto es Brief 11; aquí solo su bloque de sueldo) |
| 10–13 | Persona: tres capas, la que rige resaltada, origen por monto; a otra fecha | pestaña **«Sueldo»** de la Persona: `/(erp)/personas/[id]/sueldo` *(D5: se mantiene como pestaña)* |
| 14–15 | Sheet «Definir sueldo por RUT» (motivo obligatorio) + confirmar | misma ruta, Sheet y Dialog |
| 16 | Persona sin capa definida, con acciones a la capa que falta | misma ruta, estado vacío |
| 17 | Persona sueldo sin permiso (montos «••••») | misma ruta, variante sin permiso |
| 18 | Lista de cargos sin montos, aviso del cambio, candado de sensible | `/(erp)/cargos` *(D9: la entrada se llama **«Cargos»**)* |
| 19–20 | Cargo: estructuras antiguas **archivadas** (solo lectura) | `/(erp)/cargos/[id]` *(D10: archivar, no convertir)* |
| 21 | Persona: historial con «Capa cargo (retirada)» en solo lectura | `/(erp)/personas/[id]/sueldo` (historial) |
| 22–23 | Vínculo vigente con instalación, puesto y jornada pactada; historial | pestaña **«Laboral»** de la Persona: `/(erp)/personas/[id]/laboral` |
| 24–25 | Sheet de edición del vínculo (vista previa de cambio de capa; errores) | misma ruta, Sheet |
| 26–28 | Anexo en borrador: documento con plantilla base y marca + panel de aprobación | vista del borrador del anexo de la persona: `/(erp)/personas/[id]/anexos/[anexoId]` *(D16: también en la Bandeja y la ficha de la persona)* |
| 29 | Dialogs de aprobar/rechazar; anexo ya en Documentos con SHA-256 | misma ruta (Dialogs) → `/(erp)/personas/[id]/documentos` |
| 30 | Lista de anexos pendientes (variante de agente con `APPROVAL_REQUIRED`) | Bandeja de Inicio `/(erp)` **y** ficha de la persona *(D16; D3: un borrador por persona con vista de lote «Revisar uno por uno»)* |
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

- **Instalación sin sueldo** y **puesto sin sueldo propio:** la persona queda «sin sueldo resuelto»; **solo avisa, no bloquea** (**D2**): el aviso aparece en la instalación y en cada persona afectada con la acción para definir el sueldo; el bloqueo de confirmar puestos es del Brief 11.
- **Solape de vigencias** en la misma capa y referencia: se rechaza con mensaje inline (R5); la resolución a una fecha elige la vigente a esa fecha.
- **Cambio de capa instalación/puesto** que afecta a muchas personas: **un borrador por persona** y vista de lote «Revisar uno por uno» (R11; **D3**).
- **Sueldo por RUT sin motivo:** el botón no se activa (R1); terminar o anular un RUT también pide motivo y genera borrador.
- **Vínculo:** puesto que no pertenece a la instalación → error inline; ya hay un vínculo vigente → error (uno vigente por persona).
- **Datos antiguos del nivel cargo:** quedan **archivados** en solo lectura (**D10**, no se convierten); en la ficha de la persona, un periodo pagado con la capa cargo se ve como «Capa cargo (retirada)» para no perder la trazabilidad (R5).
- **Agente que intenta aprobar** el anexo: «Requiere aprobación de una persona» (`APPROVAL_REQUIRED`); nunca ve «Aprobar» directo.
- **Sin permiso de montos:** se muestran «••••» pero el origen de la capa sí (**D7**: el origen no se oculta).

## 11. Plan por bloques y división en PRs (un commit por bloque)

**Cuatro PR**, para revisar y mergear por partes; cada uno con `Fixes CAR-19`. Orden de ejecución, revisión y merge: **PR 1 → PR 2 → PR 3 → PR 4** (el retiro del cargo puede ir en paralelo; no tiene migración de esquema). El 07b va **antes** del 07c y del 07d (`ROADMAP.md`), así que normalmente **07b merge primero**; aun si el orden cambiara, las migraciones aditivas con timestamp posterior y las tablas disjuntas evitan el choque.

**PR 1 — Capa instalación y resolución sin herencia.**
- Bloque 1 · `core:` migración `20261028100000_capa_instalacion_sueldo` (`migracion-pendiente`).
- Bloque 2 · `domain:` reescritura de `estructuras.ts` (capas sin herencia, devuelve la capa que rigió); tipos y tests.
- Bloque 3 · `core:` capacidades de capas (instalación, resolución, vista previa de impacto, emisión del evento de anexo); paridad y snapshot.
- Bloque 4 · `ds:`/`core:` pantallas 01–17 y piezas del DS de capas (`BadgeCapa`, `PilaCapas`, `OrigenMonto`, `TablaEstructura`, `VersionesVigencia`, `AntesDespues`, `ImpactoCambio`), tras el diseño aprobado.

**PR 2 — Retiro del nivel cargo (sin migración de esquema).**
- Bloque 5 · `core:`/`ds:` lista de cargos (entrada **«Cargos»**, D9) sin montos, aviso del cambio, estructuras antiguas en solo lectura (`DatoArchivado`); pantallas 18–21; script idempotente de **archivado** de los datos `cargo` de `dev` (D10, no convierte; con `--dry-run`).

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
| `permisos-catalogo.ts` | **07c define los permisos finos** (B2) | — | usa familias existentes | 07b deja capas/vínculo en **owner y admin hasta el 07c** (D8); el refinamiento por rol es del 07c (§16.c); solo usa las familias ya presentes. |
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
- **CA-2 (retiro del cargo sin perder datos).** La entrada pasa a llamarse **«Cargos»** (D9) y la lista no muestra montos; las estructuras antiguas del cargo quedan **archivadas** en solo lectura (D10, no se convierten) y el historial de la persona conserva «Capa cargo (retirada)»; **no se borra nada**.
- **CA-3 (vínculo laboral).** El vínculo guarda instalación, puesto (opcional) y jornada pactada, con uno vigente por persona; al cambiar instalación o puesto se ve cómo cambia la capa que rige.
- **CA-4 (anexo de contrato).** Un cambio de capa, monto, instalación o rol genera el borrador del anexo con la plantilla base y la marca del tenant; RRHH lo aprueba o lo rechaza; aprobado queda en `core.documentos` con SHA-256; un agente no lo aprueba (`APPROVAL_REQUIRED`). *(ADR-048 puntos 5 y 7; ADR-036 punto 5; ADR-039.)*
- **CA-paridad.** Gate de paridad y presupuesto de JS en verde; `tools/list` en `main` sin capacidades de pantalla sin herramienta; todo por capacidad con `dryRun`, `idempotencyKey` y auditoría.

## 15. Riesgos y rollback

- **Cambio en la resolución de sueldo:** reescribir `estructuras.ts` afecta a toda lectura de estructura efectiva. Mitigación: tests de dominio que fijan el comportamiento nuevo; la vista «Capa cargo (retirada)» conserva la trazabilidad de lo pagado con el modelo anterior (R5).
- **Choque con 07c/07d:** mitigado por §11 (tablas y schemas disjuntos, timestamps posteriores, snapshot regenerado por el que merge después). El **permiso fino** de capas/vínculo depende del 07c: mientras no esté, rige **owner y admin** (D8), 07b usa las familias existentes y el diseño muestra «sin permiso» (§16.c).
- **Anexo acoplado a varios PR:** el disparo del borrador va por evento de outbox (ADR-029); el consumidor llega en PR 4. Antes de PR 4, el cambio emite el evento sin consumidor (sin efecto), no rompe nada.
- **Datos de `dev` del nivel cargo (R6, D10):** se **archivan** (no se convierten) con script idempotente y `--dry-run`, nunca en la migración de esquema.
- **Migraciones:** las aplica Carlos en Neon `dev` y `main`; cada PR con migración lleva `migracion-pendiente`.
- **Rollback:** las columnas y la tabla son nuevas y aditivas; al revertir el PR quedan huérfanas sin efecto. La capa `cargo` nunca se borra en este brief, así que revertir no pierde datos.

## 16. Resolución de decisiones del diseño y decisiones abiertas

Los **16 puntos D1–D16** del tablero «Decide Carlos» (pantalla 33) quedaron **resueltos** con la aprobación del diseño: Carlos, 26-oct-2026 14:27 CLT (t340u), «aprobado todo con las recomendaciones tuyas». Cada uno queda en su opción marcada **«Recomendada»**. **16.a** transcribe los D1–D16 (título, opción elegida con su texto y pantallas) desde `docs/2.0/design/07b/decisiones-D1-D16.txt`. **16.b** deja el único insumo de negocio que D1–D16 no cierra —el texto legal de la plantilla base del anexo— como **pendiente de Carlos**, con la recomendación de Claude y sin darlo por resuelto. **16.c** recoge las decisiones técnicas que surgieron al escribir el brief, con opciones y recomendación de Claude, sin inventar decisiones de Carlos.

### 16.a — Decisiones D1–D16 del tablero «Decide Carlos» (resueltas en la opción «Recomendada»; Carlos, 26-oct-2026 14:27 CLT, t340u)

| D | Título | Opción elegida (texto del tablero) | Pantallas |
|---|---|---|---|
| **D1** | Dónde vive la capa instalación | **(a)** Pestaña propia **«Sueldo» después de Puestos** en la ficha de Instalación *(enmienda a ADR-041.9; ver §8)* | 01, 02, 03, 04, 05 |
| **D2** | Instalación sin sueldo: ¿bloquea algo más? | **(a)** **Solo avisa**: las personas quedan «Sin sueldo resuelto» (no frena Operaciones; aviso en la instalación y en cada persona, con la acción para definir el sueldo) | 04, 16 |
| **D3** | Borradores en lote al cambiar instalación o puesto | **(a)** **Un borrador por persona** + vista de lote **«Revisar uno por uno»** (el anexo es individual por contrato; el lote solo agrupa la revisión en la Bandeja) | 05, 06, 09, 30 |
| **D4** | ¿«Rol» en R11 es el rol de turno? | **(a)** **Sí: rol de turno** (días del patrón, ADR-036 reglas del puesto punto 3); el cargo ya no mueve montos *(fijado en (a) por el encargo)* | 26, 27, 28 |
| **D5** | Sueldo en la ficha de la persona | **(a)** **Se mantiene la pestaña «Sueldo»** (la resolución de capas necesita espacio y su propio permiso de montos; Laboral queda para el vínculo) | 10, 11, 12, 13, 21 |
| **D6** | Sueldo por RUT: ¿parte prellenado? | **(a)** **Prellenado con la capa que rige hoy, solo como punto de partida**; al guardar, cada concepto queda definido en la capa RUT (sin herencia) | 14 |
| **D7** | Montos sin permiso y sensibilidad del cargo | **(a)** **«••••» en montos**; el **origen de la capa se ve**; la marca del cargo **no cambia la regla** de ADR-016 (montos solo owner/admin) | 17, 18, 19, 31, 32 |
| **D8** | Permiso para crear o cambiar capas y editar el vínculo | **(a)** **Owner y admin hasta el 07c**; el diseño ya muestra el estado «sin permiso» (los permisos finos llegan con el Brief 07c) | 31, 32 |
| **D9** | Nombre de la entrada «Cargos y sueldos» | **(b)** Pasa a **«Cargos»** (evita prometer montos que ya no están ahí; el sueldo vive en instalación, puesto y persona) | 18 |
| **D10** | Filas `cargo` existentes en dev: ¿convertir o archivar? | **(a)** **Archivar**: solo lectura, ya no se usan para pagar (no altera montos vigentes; convertir podría ofrecerse después como acción explícita por instalación) | 19, 20, 21 |
| **D11** | Campos de la jornada pactada | **(a)** **Horas semanales + distribución** (lunes a viernes, 4×4…); el horario lo da la pauta | 22, 23, 24, 25 |
| **D12** | Instalación del vínculo: obligatoria u opcional | **(a)** **Obligatoria**; **puesto opcional** (sin instalación no se resuelve la capa por defecto, R9/R10; la fase 3 se resuelve aparte) | 22, 23, 24, 25 |
| **D13** | Rol que aprueba el anexo por defecto | **(a)** **admin** por defecto, **configurable por tenant**; ningún agente aprueba (`APPROVAL_REQUIRED`) | 26, 27, 28, 29, 30 |
| **D14** | ¿Rechazar pide motivo? | **(a)** **Sí, obligatorio** (como Aprobaciones): queda en la bitácora y quien generó el cambio sabe qué corregir | 29 |
| **D15** | Firma, cláusulas y documento en oscuro | **(a)** El **07b termina en «Aprobado y guardado en Documentos»; firma después** (Brief 28); texto de ejemplo hasta tener cláusulas; en modo oscuro el documento conserva su papel claro | 26, 27, 28, 29 |
| **D16** | Dónde se ven los anexos pendientes | **(a)** **Bandeja de Inicio + ficha de la persona** (Bandeja para quien aprueba y ficha para el contexto; una lista propia duplicaría la Bandeja) | 30 |

### 16.b — Pendiente de Carlos (insumo de negocio fuera de D1–D16)

| Punto | Fuente | Recomendación de Claude (no es decisión de Carlos) | Pantallas |
|---|---|---|---|
| **Texto y cláusulas legales de la plantilla base del anexo** | R12, **D15** | D15 cierra el **flujo** (termina en «Aprobado») y define la **estructura** dibujada (encabezado con marca, partes, qué cambia y desde cuándo, firmas) con **texto de ejemplo**; el **texto legal definitivo lo fija Carlos** (el editor por tenant es del Brief 09). Hasta entonces se usa el texto de relleno del diseño. | 26, 27, 28 |

### 16.c — Decisiones técnicas de este brief (opciones y recomendación de Claude; no son decisiones de Carlos)

1. **Refinamiento por rol personalizado de los permisos de capas, vínculo y aprobación del anexo.** D8 y D13 fijan el interino (**owner y admin** para capas/vínculo; **admin configurable** para aprobar el anexo). El **refinamiento por rol personalizado depende del Brief 07c** (B2, ADR-022). Opciones: (A) 07b usa las familias existentes (`core:estructuras.*`, `core:vinculos.*`, permiso del anexo) y 07c refina por rol; (B) 07b define permisos nuevos ahora. **Recomendación: A** (no adelantar el modelo de permisos del 07c; aprobar/rechazar el anexo con `soloPersonas: true` por gobierno).
2. **Dónde vive el borrador del anexo.** Opciones: (A) tabla `core.anexos_contrato` para el borrador y `core.documentos` solo al aprobar (recomendada: el borrador tiene estado y antes/después, no es aún un documento verificable); (B) todo en `core.documentos` desde el borrador. **Recomendación: A**.
3. **Convivencia del puesto del vínculo con la asignación de Operaciones (fase 3).** Solo **nota**, no se construye (pedido §2). **Recomendación:** cuando exista Operaciones, la asignación vigente manda sobre el puesto del vínculo para resolver la capa (ADR-048 pregunta abierta 1); se define en el Brief 11/12.
4. **Timestamps de las migraciones de 07b.** **Recomendación:** posteriores a los de 07c/07d (`20261028…`), aditivas y sobre tablas disjuntas, para ordenar siempre al final sin importar el orden de merge (§6, §11).

### 16.d — Precisiones para PR 1 (encargo de relanzamiento, 27-oct)

Estado del brief: aprobado por OPAI 2.0 con autoridad delegada de Carlos (t500u, 26-oct-2026 22:51 CLT: "quédate esta noche avanzando con todo hasta que la fase 1 quede lista; no me pidas autorizaciones, toma tú todas las decisiones"); Carlos puede vetarlo; el texto legal del anexo queda pendiente de su revisión.

Precisiones de OPAI 2.0 comunicadas en el encargo:

1. **Impacto sin vínculo de instalación ni puesto.** La resolución de dominio es
   pura y recibe instalación, puesto y RUT explícitamente, sin depender del vínculo.
   `core.estructuras.efectiva` para una persona usa la capa RUT y solo usa puesto o
   instalación cuando el llamador los proporciona; si ninguna capa se resuelve,
   devuelve «sin capa definida». La vista previa calcula puestos afectados por
   `core.puestos.instalacion_id`, personas con capa RUT afectadas, diferencias por
   concepto de esas filas y número de borradores. Las personas cuyo impacto depende
   del vínculo se cuentan aparte como «pendiente de vínculo con instalación (PR 3)»
   sin calcular montos. Así no se inventan relaciones y PR 3 puede ampliar la fuente
   sin cambiar la API.
2. **Estructuras históricas incompletas.** Sin backfill ni montos inventados; la
   migración no modifica la nulabilidad histórica. Una estructura antigua con algún
   concepto nulo se devuelve como incompleta, con su capa y conceptos faltantes,
   sin rellenarlos desde otra capa. La UI muestra el aviso del DS 2.0 «Estructura
   incompleta: define los conceptos faltantes en una nueva versión». Toda estructura
   nueva o nueva versión exige todos los conceptos, validada en capacidad y dominio;
   el CHECK de conceptos completos solo aplica al nivel instalación. Las filas cargo
   se archivan mediante el script idempotente aparte (D10). Así se respeta R2 sin
   herencia ni backfill y se conservan los datos sin mostrar montos falsos.

El timestamp asignado por el encargo para PR 1 es
`20261028180000_capa_instalacion_sueldo`, en lugar del sugerido en §6 y §11.

## 17. Reporte de ejecución

Al cerrar: commits integrados por PR, capturas a 375 y 1280 de las pantallas nuevas, resultado de los tests y de `pnpm test:db`, estado del gate de paridad y del presupuesto de JS, `tools/list` en `main`, y resumen ejecutivo para Carlos: qué se hizo, qué cambia para Gard (el sueldo sale de la instalación, el puesto o el RUT, sin herencia; el vínculo guarda instalación, puesto y jornada; el anexo en borrador que aprueba RRHH), qué decide él (el texto legal de la plantilla base del anexo, §16.b, y las decisiones técnicas de §16.c) y qué sigue (Brief 07c y 07d para cerrar el Núcleo; luego Puestos, Brief 11).


## 18. Construcción del PR 1 · Codex, 27-oct-2026

Rama `brief/07b-capas-sueldo`, apilada sobre #49, con merge normal de su avance.
Se conservó íntegro el trabajo recibido y se empujaron checkpoints WIP, sin reescribir historia.

- **Bloques 1–3 implementados:** migración `20261028180000_capa_instalacion_sueldo`, FK/índice/CHECK/trigger y RLS forzada; dominio sin herencia; capacidades existentes ampliadas para instalación, impacto y anulación, expuestas por el mismo registro UI/API/MCP. No se agrega una herramienta de impacto separada: se obtiene en `preview_core_estructuras_create` (`dryRun`). El snapshot ya contiene estas herramientas.
- **Bloque 4 implementado, validación pendiente:** pestaña Sueldo de instalación; acceso a capas de puesto desde esa pestaña; Sueldo de persona con contexto explícito; nueva versión completa, bonos, preview, historial por vigencia y anulación con motivo. Piezas del DS disponibles también en `/ds`. La ubicación de la capa puesto adapta las pantallas 06–09 al modelo de Puestos del padre, sin rediseñarlo. El aviso de incompletitud usa metadata del servidor para no confundir conceptos ausentes con montos ocultos.
- **Decisiones técnicas de Codex:** lock por tenant/capa/referencia dentro de la transacción para cerrar carreras de versión/anulación; los bonos nuevos necesitan su valor y nombres únicos; los bonos históricos sin valor quedan incompletos; diferencias de modalidad de gratificación y banderas imponible/tributable, además de montos. Selector de contexto diferido para mantener el presupuesto. Son implementaciones del objetivo del encargo, sin atribuirlas a Carlos.
- **CA-1:** funcionalidad construida; pendiente cerrar validación visual y rendimiento de la navegación completa. Se conserva la limitación explícita de §16.d hasta PR 3.
- **CA-2:** fuera de alcance, PR 2 (incluido el script de archivado de cargo). No se borran ni convierten filas cargo aquí.
- **CA-3:** fuera de alcance, PR 3.
- **CA-4:** fuera de alcance, PR 4; PR 1 emite `core.estructura.creada`/`core.estructura.anulada` mediante outbox, sin generar documentos.
- **CA-paridad:** registro y snapshot conservan las capacidades compartidas; pendiente el gate final. `tools/list` remoto se verifica tras despliegue, no desde esta construcción.

Evidencia inicial: las 109 pruebas de base pasaron; las dos pruebas nuevas de capacidades contra Postgres verificaron aislamiento, preview, auditoría y creación concurrente. Pasaron 13 pruebas focalizadas de capacidades. Un build y typecheck completos pasaron antes de los últimos ajustes. Los e2e de iPad y escritorio pasaron inicialmente; teléfono falló por timeout de captura. Las repeticiones completas encontraron timeouts de inicialización, test de documentos y transacción. No se desactivan pruebas ni se modifican sus expectativas para obtener verde. Resultados finales se actualizarán después de ejecutar el gate sobre el último código.

Pendiente confirmar ≤8 consultas por navegación (ADR-045): la auditoría de lecturas por versión puede exceder el límite. No se declara este criterio cumplido sin medición. El refinamiento de agregación de consultas no debe quitar la auditoría de lecturas sensibles que ya exige main.


Actualización de validación del mismo PR 1:

- `pnpm test:db` completo: **109 + 134 + 25 pruebas en verde**, sin omitir suites.
- Playwright contra el build de producción, puerto local 3107: **3/3 en verde**, a 375, 1024 y 1280 px; definición de instalación y RUT con motivo, preview, guardado, historial y prioridad RUT con contexto explícito. Capturas `07b-*` actualizadas.
- `pnpm build` completo en verde. `pnpm presupuesto` en verde; tope propio de **166 KB** para la nueva ruta de sueldo de persona, medida **165,7 KB**, alineado con las otras pestañas de persona de 166 KB. Es 1 KB sobre el valor por defecto; decisión técnica de Codex justificada por el selector explícito y el historial con anulación. No modifica otras rutas ni exime de ADR-043.
- Auditoría de lectura por respuesta para las capas activas: registra todos los IDs y referencias en el payload, sin montos. La capa cargo conserva su auditoría individual. Prueba de lote incluida; ocho pruebas del archivo de capacidades nuevas pasaron.
- Autorrevisión por subagente sobre `617ce60`: sin nuevos defectos bloqueantes en los cambios inspeccionados; no sustituye al Revisor ni al CI.
- **ADR-045 pendiente:** el marcador existente midió **12 consultas** en instalación y **11 en persona**. Sus totales fueron 102–311 ms y 97–500 ms respectivamente en esas corridas locales de producción. El marcador toma una instantánea antes de completar todos los Suspense: esos conteos no prueban el total definitivo de la ficha y ya exceden 8. No se declara cumplida esa meta. Optimizar los cargadores compartidos y medir toda la navegación sigue pendiente; no se cambia la instrumentación para ocultarlo.
- La suite general detectó dos fixtures con el modelo anterior: inspector efectivo basado en cargo y capa RUT con conceptos omitidos. Se actualizaron a capa RUT completa, conservando las comprobaciones de auditoría y ocultación; las pruebas afectadas pasaron. La repetición completa se mantiene pendiente hasta conocer su resultado.


### Resultado del gate local al cierre de esta construcción

- `pnpm typecheck`: 11 tareas en verde. `pnpm lint`: 11 tareas en verde, con warnings de longitud de archivos (sin errores).
- `pnpm test --no-file-parallelism --testTimeout=30000 --hookTimeout=120000`, con `VITEST_MAX_WORKERS=1`: **203 archivos, 1.158 pruebas en verde**. Misma suite completa, sin desactivar tests ni omitir proyectos.
- `pnpm test:db`, con `VITEST_MAX_WORKERS=1`: **109 base + 134 capacidades + 25 auth**, todo en verde.
- `pnpm build` y `pnpm presupuesto`: en verde, con el tope propio de ruta justificado arriba.
- E2E contra `next start` local en 3107: **3/3**, 375/1024/1280, capturas actualizadas y sin desborde horizontal.
- Paridad focalizada: **12/12** comprobaciones en verde. No se verificó `tools/list` remoto porque no hubo despliegue.
- Fixtures de inspector y panel revisados también por el subagente: conservan pruebas de ocultación, revelación auditada y denegación de escrituras.

**Diferencia pendiente respecto al encargo:** no se cumple la meta de ≤8 consultas de ADR-045. Los conteos 12/11 ya superan la meta y el marcador no abarca necesariamente todos los Suspense. El gate funcional pasa, pero CA-1/validación de rendimiento permanece parcial. No hay aprobación del Revisor sobre el head final ni CI de PR (no se abrió PR por instrucción del encargo); no se declara listo para integrar. No hay nuevas dudas de negocio: las decisiones t500u siguen resueltas. No se aplicó nada en Neon.

## 19. Cierre de la revisión pr80-rev-1619-cx

Este cierre sustituye el pendiente de rendimiento de §18; conserva sus resultados como historial.
El encargo pr80-rev-1619-cx exige ≤8 operaciones por navegación y auditoría de los montos persistidos.
Codex consolida ficha, listas, contexto, vencimientos y banda de aprobaciones en
`core.estructuras.panel`, con los permisos y filtros de alcance de las capacidades originales.
Las aprobaciones se incluyen solo con `aprobaciones.manage` y alcance global; sus IDs revelados
se auditan junto a los demás IDs de la respuesta. El resumen de vencimientos se mantiene puro.
La carga de vencimientos personales abarca el tenant para resumir la página; no se devuelve ese
conjunto ni se habilita para actores con alcance acotado. Puede requerir paginación interna con
volúmenes mayores. Es una limitación técnica de esta consolidación, no otra decisión de negocio.

La banda de aprobaciones generaba consultas adicionales en paralelo. Recibe ahora los datos
precargados, también cuando están vacíos. El registro diferido de ejecuciones humanas agrupa
precio vigente e inserción de consumo en una sentencia, sin agregar caché entre requests ni alterar
agentes, prepago o presupuesto. Decisión de implementación de Codex para cumplir el encargo;
no se atribuye a Carlos. Se verifica con Postgres real (precio futuro, ausente y sin costo,
trazabilidad, UUIDv7, aislamiento y rechazo de agentes/keys).

`list`, `get` y `efectiva` declaran `auditarLectura`; la revelación de montos conserva
`read_sensible`. Anulación y preview de impacto ocultan y auditan montos guardados.
Las pruebas recorren tres referencias reales y exigen el ID correcto para cada una.
La migración se llama `20261028180000_capa_instalacion_sueldo`, posterior a la última de main;
conserva SQL activo, agrega `lock_timeout` y reversión comentada. No se aplicó en Neon.

Playwright contra producción local, un worker: seis casos pasan (capas y protocolo de rendimiento
a 375, 1024 y 1280 px); tres casos `fixme` preexistentes del spec de rendimiento siguen sin ejecutar.
Ambas rutas de sueldo registran **7 operaciones** en los tres tamaños, con aserción real ≤8.
El contador sigue midiendo operaciones lógicas de Prisma y append de auditoría; los `include`
no demuestran una sola sentencia SQL ni una cantidad equivalente de viajes a Postgres.
No se alteraron topes ni el contador para obtener este resultado. Las capturas se conservan locales,
fuera del commit; las pantallas siguen usando el Design System de OPAI 2.0.

- **CA-1:** implementado y comprobado por e2e, incluyendo el límite de consultas; conserva el contexto explícito de §16.d hasta PR 3.
- **CA-2, CA-3 y CA-4:** fuera del PR 1; siguen en PR 2, PR 3 y PR 4 respectivamente.
- **CA-paridad:** capacidad panel expuesta por UI/API/MCP y snapshots actualizados; `tools/list` remoto y CI del head siguen pendientes de despliegue/revisión.
- **Autorrevisión:** subagente revisó alcance, transacciones, auditoría, carga consolidada, banda y consumo; sin bloqueantes. No sustituye al Revisor independiente.

Los resultados finales del gate y el head se dejan en `PR-BODY.md`, sin versionarlo, conforme al encargo.

### Corrección de montos de QA del PR #80

Encargo de corrección: los montos nuevos se validan como pesos enteros entre 0 y 100.000.000 por concepto (ADR-053), sin reinterpretar texto inválido; los porcentajes conservan su regla. Codex implementa el tope indicado en el encargo y acepta puntos únicamente como separadores chilenos de miles. La vista previa identifica conceptos nuevos y muestra los montos en pesos. La validación y pruebas del cambio quedan detalladas en el PR.

## Construcción del PR 3 — vínculo laboral y jornada pactada (27-oct-2026)

Implementación de Codex en `brief/07b-pr3-vinculo-jornada`, encargo de continuidad
CAR-19. No modifica el retiro de cargo (PR 2) ni construye el anexo (PR 4).

- **Bloque 6:** migración aditiva `20261028190000_vinculo_instalacion_jornada`,
  posterior a `20261028180000_capa_instalacion_sueldo` de main. Sustituye el
  timestamp previsto `20261028110000`, ya ocupado. Agrega instalación, puesto
  opcional, horas semanales enteras y distribución. Conserva `tenant_id`, RLS
  ENABLE/FORCE, `tenant_isolation` e índice único parcial de vínculo vigente.
  FKs y triggers comprueban tenant y pertenencia del puesto a la instalación;
  un puesto referenciado no se traslada silenciosamente. Sin backfill inventado:
  columnas históricas nulables; toda alta/edición por capacidad exige instalación
  y jornada completas. Carlos aplica en Neon; etiqueta lógica `migracion-pendiente`.
- **Bloque 7:** `core.vinculos.list/create/update/terminar` usa las familias
  `core:vinculos.read/manage`; edición owner/admin (D8), respetando denegaciones y
  concesiones de 07c. El alta embebida en `core.personas.create` verifica también
  el permiso del vínculo. Nueva lectura `core.vinculos.previsualizar`, con permiso
  de estructuras adicional, compara capa/versión/conceptos actuales y propuestos,
  ocultando los montos con el criterio salarial existente. Snapshot MCP actualizado.
  La resolución y el panel toman instalación/puesto del vínculo vigente por defecto;
  el contexto explícito sigue disponible como simulación. Se levanta §16.d para
  esta fuente real. El impacto cuenta personas relacionadas sin capa más específica;
  solo contratos sin instalación quedan en `pendientesVinculo`.
- **Bloque 8:** Laboral muestra instalación, puesto, jornada, capa e historial;
  Sheet de edición con validación, vista previa, guardando y error, DS OPAI 2.0.
  La carga consolidada conserva los estados de ficha y las hojas se descargan al
  abrirlas. Nuevas altas también recogen instalación y jornada. Supervisor obtiene
  personas/documentos por vínculo vigente de una instalación a cargo, sin atribuir
  alcance por cargo, correo ni vínculo documental secundario. Se reactiva el caso
  positivo NÚCLEO-D2 y se conserva el negativo fuera de alcance.

**Decisiones técnicas de Codex en este encargo (no son decisiones de Carlos):**

1. Horas enteras entre 1 y 168 y distribución de 1–200 caracteres: límite físico
   y de entrada, no certificación de cumplimiento laboral ni catálogo de patrones.
   Se guardan las horas pactadas, sin inferirlas de Operaciones.
2. Bloqueo de vínculo al editar/terminar y bloqueo compartido de referencias dentro
   de la transacción auditada. La UI envía la versión `updatedAt` que revisó y se
   rechaza una edición obsoleta; los controles no cambian durante la comparación.
3. `core.vinculo.actualizado` lleva snapshots contractuales antes/después en outbox,
   atómicos con la escritura. PR 4 consumirá el evento; aquí no se promete un
   borrador ya generado ni se inventa un texto legal.
4. La migración no endurece columnas históricas sin backfill: no hay fuente válida
   para asignar instalaciones a contratos anteriores. No se ejecuta en Neon.

**Criterios de aceptación de este PR:** CA-3 se cubre con persistencia, un vínculo
vigente y comparación de capa al cambiar instalación/puesto; CA-1 se amplía al
contexto real del vínculo. CA-2 pertenece al PR 2 y CA-4 al PR 4; no se declaran
cumplidos por este PR. Las pruebas y la evidencia definitiva del gate se registran
al cierre en `PR-BODY.md` (local, sin commitear).

**Precisiones de autorrevisión:** el flujo documental del Supervisor comprueba
alcance también al iniciar/vincular/confirmar una subida y al listar duplicados por
huella. Una referencia documental secundaria no amplía acceso. La fecha «Desde»
de la hoja corresponde al `inicio` del vínculo existente; no introduce una cola de
traslados futuros ni modifica el modelo de Operaciones. La prueba de conflicto
muestra un error recuperable ante una versión obsoleta. La autorrevisión por
subagente cerró los hallazgos de seguridad; no sustituye al Revisor externo.


**Evidencia local de cierre:** Node 22.23.4; typecheck de todos los workspaces
(concurrencia 1), lint, 1.021 pruebas unitarias, 328 de base (117 db, 186
capacidades, 25 auth), build y presupuesto sin subir topes. Playwright: 24/24 en
los dos specs afectados con un worker, sin skips ni reintentos, en producción
local. Laboral: 7 consultas en los tres tamaños. JS inicial: 164,8 KB Laboral y
165,8 KB Sueldo (tope 166 KB). Capturas claras y error oscuro en
`docs/2.0/design/07b/evidencia-pr3/`. Esto no declara CI remoto, revisión externa
ni aplicación en Neon.

## Construcción del PR 2 · Codex, 27-oct-2026

Bloque 5, rama `brief/07b-pr2-retiro-cargo`, sin migración de esquema.
Se conservaron y completaron los cambios sin commit recibidos del encargo anterior.

- **Pantalla 18 / D9:** entrada «Cargos» y catálogo sin montos en UI, API v1 y MCP.
  `core.cargos.list` ya no consulta estructuras ni devuelve `sueldoVigente`;
  conserva clase, sensibilidad, estado y conteos. El aviso informativo se cierra
  con «Entendido» y se recuerda en el navegador (si no hay almacenamiento,
  durante la visita). Crear/editar el catálogo sigue disponible según permisos.
- **Pantallas 19–20 / D10:** `DatoArchivado` del DS 2.0, también en `/ds`,
  muestra todas las versiones originales, plegadas inicialmente, con vigencias,
  conceptos, bonos, motivo y señal de anulación cuando corresponde. Sin edición,
  borrado ni creación de versiones; `?version=1` no abre ningún formulario.
  El export 20 representa la alternativa de conversión descartada por D10:
  en teléfono se implementa la misma variante archivada del export 19.
- **Pantalla 21:** «Capa cargo (retirada)» en Sueldo de persona muestra los cargos
  de sus vínculos actuales y terminados, con sus fechas originales y enlaces a
  las estructuras archivadas. La carga consolidada `core.estructuras.panel`
  mantiene el vínculo vigente y audita los IDs de vínculos y cargos revelados.
  **Adaptación necesaria:** el Núcleo no guarda periodos pagados ni snapshots de
  liquidación/costeo. No se pueden reconstruir pagos desde una estructura o un
  vínculo. Se conserva el historial existente y se explica que las fechas son
  contractuales; no se inventa el historial de pagos dibujado en el export.
- **Capacidades:** `core.estructuras.create` rechaza nivel cargo con `FORBIDDEN`
  tanto en ejecución como en preview; `anular` también lo bloquea. `list/get`
  conservan lectura de filas antiguas vigentes, archivadas y anuladas (estas
  últimas con `incluirAnuladas`). D7 aplica `read_sensible` también al archivo,
  incluso si el catálogo no está marcado sensible; la revelación agrupa IDs
  en una auditoría por respuesta y falla cerrada. El catálogo no revela montos.
  UI/API/MCP comparten registro y ejecutor. No cambia el conjunto de herramientas,
  por lo que la instantánea de nombres permanece igual.
- **Script:** `packages/db/scripts/archivar-cargos.ts --tenant <uuid> --dry-run`
  simula; `--apply` cambia únicamente `estado=vigente` a `archivada` para nivel
  cargo del tenant indicado. Conserva IDs, montos, conceptos, ítems, fechas y
  motivos; no convierte capas ni modifica las activas. `updateMany` con predicado
  es atómico e idempotente. CLI ejecutado solo en Postgres local de prueba:
  simulación 1 candidato / 0 cambios; aplicación 1; segunda aplicación 0.
  No se ejecutó sobre Neon.

**Decisiones de implementación de Codex, sin atribuirlas a Carlos:** representar
el archivo mediante el campo `estado` textual existente, con valor `archivada` y bloquear toda
mutación de nivel cargo incluso antes de ejecutar mantenimiento; agrupar la
lectura auditada del archivo para evitar N+1; consolidar los conteos del detalle
en una consulta; recordar el aviso localmente; usar los vínculos históricos como
contexto de acceso al archivo, sin deducir sueldos pagados. No cambia el plan del
ROADMAP ni se adelanta el trabajo de los PR 3–4.

**Criterios:** CA-2 implementado para los datos existentes, con la adaptación
explícita de pantalla 21 anterior. CA-1 corresponde al PR 1 integrado y se conserva
su resolución sin cargo; CA-3 y CA-4 pertenecen respectivamente a los PR 3 y 4,
fuera de este encargo. CA-paridad se verifica localmente; `tools/list` remoto y
CI del PR corresponden al despliegue y revisión posteriores. No se abre PR por
instrucción del encargo.

Los resultados finales del gate, las capturas sintéticas de 375/1024/1280 px y la
autorrevisión se registran en `PR-BODY.md`, conservado sin commit. La integración
requiere CI y la revisión independiente del head según ADR-043; esta construcción
no equivale a su aprobación.


### Evidencia local del PR 2

Node 22, Postgres 16 local: `pnpm typecheck` y `pnpm lint` pasan (warnings
preexistentes de longitud); `pnpm test --maxWorkers=1`: 171 archivos, 1.021 pruebas;
`pnpm test:db`: 119 base + 181 capacidades + 25 auth, sin suites omitidas.
`pnpm build` y `pnpm presupuesto` pasan sin elevar topes: lista 162,7/165 KB,
detalle 161,8/167 KB, Sueldo persona 165,8/166 KB y `/ds` 221,9/222 KB.

E2E de las pantallas 18–21 e Inspector a 375/1024/1280 con un worker: pasan,
incluyendo teclado, ausencia de creación/versionado, aviso persistido, archivo
claro/oscuro y enlaces del historial. Los cinco specs afectados terminaron con 17 casos en verde y 13 saltos
preexistentes por viewport (ninguno en retiro/Inspector), cero fallos y cero flaky.
Lista/detalle/persona registran **5/8/6 operaciones**, con aserción `≤8` en los
tres tamaños. Capturas sintéticas `apps/web/e2e/__screenshots__/07b-*cargo*.png`.
Pruebas del CLI: 1/0, 1/1 y 0/0 candidatos/archivados, solo base local.
Verificación SQL local: cero ítems huérfanos; RLS ENABLE/FORCE y una política
`tenant_isolation` para `opai_app`. No hay migración ni ejecución sobre Neon.

Autorrevisión de subagente: sin bloqueantes en las capacidades, el script, el DS,
el historial y sus pruebas. Los hallazgos de aviso y formulario antiguo se
resolvieron. La revisión del SHA final se registra en `PR-BODY.md`; no es la
aprobación del Revisor independiente ni evidencia de CI remoto.

### Puesta al día del PR #89 con #87 (encargo del 28-oct-2026)

Codex fusiona `origin/main` `3e1682df08c061ec786b01e2b4eb4d717f19ef15`
mediante merge normal. Conserva el rechazo de mutaciones del nivel cargo, su
archivo e historial y el permiso de lectura sensible en las capas vigentes,
junto con instalación, puesto y jornada del vínculo. Laboral mantiene la vista
consolidada del PR 3; el panel conserva el vínculo vigente y el historial del PR 2.
Se conservan las dos entradas documentales y ambos fixtures de pruebas.
No hay funcionalidad ni decisión de negocio nueva; no cambia el ROADMAP.
CA-1/CA-2/CA-3 se conservan con las adaptaciones ya descritas; CA-4 sigue
pendiente del PR 4 y `tools/list` remoto requiere despliegue. Autorrevisión
por subagente sin hallazgos bloqueantes; resultados reales del gate y e2e en
`PR-BODY.md` local, sin commit. No se aplica la migración en Neon.

El gate detectó una expectativa desactualizada en la fusión automática de
`maestros-db.test.ts`: con instalación en el vínculo ahora corresponde resolver
la capa de instalación. Codex adapta la aserción a la versión de 600.000 del
fixture, estado completo y cargo nulo; no modifica la resolución de negocio.

## Construcción del PR 4 — anexo de contrato en borrador (Claude, 28-oct-2026)

Rama `brief/07b-pr4-anexo-borrador`, sobre #87/#89, con merge de `main` `4337a53`
(#90, Inicio/Vencimientos) a mitad de la construcción.

- **Bloque 9 (migración):** `20261028200000_anexo_contrato_borrador`, tabla
  nueva `core.anexos_contrato`. RLS ENABLE/FORCE, política `tenant_isolation`,
  trigger de mismo tenant y un CHECK de consistencia por estado (borrador sin
  resolución; aprobado con `documento_id`; rechazado con motivo). Es
  `CREATE TABLE`, no `ALTER` sobre una tabla existente: sin `BEGIN`/`COMMIT`
  propios, a diferencia de los PR 1 y 3.
- **Bloque 10 (capacidades):** `core.anexos.generar/list/get/aprobar/rechazar`.
  Permisos `core:anexos.read`/`manage`, mismo bloqueo financiero que capas y
  vínculo (D8: denegados a gerente, por los montos del snapshot). Consumidor de
  `core.estructura.creada/anulada` y `core.vinculo.actualizado` que genera el
  borrador por persona, idempotente por evento (R11, D3); la jornada pactada
  sola no genera anexo. Aprobar materializa el documento en `core.documentos`
  reutilizando el layout de marca de Comunicaciones (ADR-028), con SHA-256 y
  bitácora; bloqueo `FOR UPDATE` contra la carrera aprobar/rechazar.
  `aprobar`/`rechazar` son `soloPersonas` (un agente recibe `FORBIDDEN`, igual
  que `core.aprobaciones.aprobar`). Eventos `core.anexo.generado/aprobado/rechazado`
  declarados en `EVENTOS_CORE`.
- **Bloque 11 (pantallas y DS):** pestaña «Anexos» en la ficha de persona y
  `/personas/[id]/anexos/[anexoId]` (documento + panel de aprobación, D16).
  Piezas nuevas del DS: `AvisoAnexo`, `DocumentoBorrador` (conserva su papel
  claro en oscuro, D15) y `PanelAprobacion`, las tres en `/ds`.

**Decisiones técnicas de Claude (no son decisiones de Carlos):** `soloPersonas`
da `FORBIDDEN` a un agente antes de llegar a `APPROVAL_REQUIRED` (mecanismo ya
existente, `core.aprobaciones.aprobar`); D13 «admin configurable por tenant» se
implementa solo en su mitad interina (owner/admin estático), igual que D8,
hasta el refinamiento por rol del Brief 07c (§16.c-1); el documento final
muestra sueldo base, colación, movilización, gratificación y, para el motivo
instalación, los nombres de instalación y puesto, sin editor de plantilla (R12
lo deja para el Brief 09).

**CA-4:** cumplido. El motivo "rol" no tiene fuente hoy (Operaciones es fase 3,
§16.c-3): la capacidad y la UI lo soportan, pero el consumidor no lo dispara
todavía. **Pendiente de Carlos (§16.b):** el texto legal definitivo de la
plantilla base; el documento usa texto de ejemplo hasta entonces (D15).

**Gate local:** typecheck, lint (0 errores), test (173 archivos, 1.036
pruebas), test:db (122+200+25, incluye `anexos-db.test.ts` contra Postgres
real: aislamiento por tenant, bloqueo financiero, `soloPersonas` y el documento
final con SHA-256 y bitácora verificable), build y presupuesto en verde (dos
rutas nuevas a 166 KB; `/ds` de 222 a 224 KB). e2e `anexo-contrato.spec.ts`
(375/1024/1280, claro y oscuro) en verde; aprobar no se prueba de punta a punta
en este entorno por falta de credenciales de R2 (igual que en CI): se verifica
el mensaje de error, y el flujo completo ya se prueba contra Postgres real con
almacenamiento en memoria en `anexos-db.test.ts`. Sin migración aplicada en
Neon. No se abre PR (lo abre el bot «OPAI 2.0»); evidencia completa en
`PR-BODY.md`, sin commitear.

### Corrección QA del PR #91 (Codex)

B1: la relación existente del documento con `AnexoContrato` identifica el documento sensible; Documentos exige `anexos.read` o `estructuras.read_sensible` para leerlo y no permite reemplazarlo mediante subida, para evitar que una versión pierda esa protección. Se aplica también a documentos ya generados. M1 comprueba la persona de la URL y M4 pide confirmación antes de aprobar. Sin migración nueva.

Autorrevisión de Codex: queda pendiente validar que las estructuras referenciadas en snapshots correspondan a la persona o a las capas aplicables de su vínculo. CA-4 sigue parcial también por el disparador de rol pendiente indicado arriba.

### Corrección S1 del PR #91 (Claude, 28-oct-2026, revisión 5679644747)

El Revisor bloqueó por S1: `core.anexos.generar` aceptaba `estructuraId`, `instalacionId` y `puestoId` de otra persona (sus sueldos podían terminar en el contrato aprobado de esta persona); `core.anexos.aprobar` no revalidaba. Claude termina la validación que Codex dejó pendiente (párrafo anterior) en `validar-snapshots.ts`: exige siempre el mismo tenant y la misma persona del anexo.

**Decisión de implementación** (OPAI 2.0, con la autoridad delegada por Carlos en t500u, "Pedido y aprobaciones" al inicio de este brief): `instalacionId`/`puestoId` se aceptan si pertenecieron a cualquier vínculo de esa persona, **vigente o anterior** (terminado), no solo al vigente; un anexo puede documentar el cambio desde un vínculo previo y no se rechaza. `core.anexos.aprobar` revalida dentro de la misma transacción que materializa el documento final (ADR-052) y bloquea antes de leer (`SELECT ... FOR SHARE`, el patrón de `vinculos-validacion.ts`) los vínculos y estructuras referenciados, cerrando la ventana de concurrencia que la autorrevisión de Codex había detectado.

Tests nuevos en `anexos-db.test.ts`: generar con instalación de un vínculo anterior de la misma persona crea el borrador (caso legítimo); aprobar un borrador insertado directo en la base con una referencia de otra persona falla y no genera documento. Gate (`typecheck`, `lint`, `test`, `test:db`, build, presupuesto) y e2e `anexo-contrato.spec.ts` en verde; detalle en `PR-BODY.md` (sin commitear). CA-4 se mantiene cumplido; esta corrección no cambia los criterios de aceptación, solo cierra la brecha de datos que señaló el Revisor.
