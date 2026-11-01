# BRIEF DE IMPLEMENTACIÓN — 10 CPQ · COTIZADOR Y PROPUESTA

**Repositorio:** `Cryptobal/opai-2` · **Rama de ejecución:** `brief/10-cpq-cotizador` (desde `main` actualizado, cuando llegue su turno) · **Fecha:** 29-oct-2026 · **Tarea Linear:** CAR-66 (`Fixes CAR-66` en el PR). · **Estado:** **escrito; la construcción va después de Puestos (Brief 11) y Comercial (Briefs 06 y 07); no se construye en este PR (solo documentos).**

> **Aprobación del diseño (textual).** Carlos aprobó el diseño final del CPQ (mockup v3, flujo cotización → envío) el 29-oct-2026 (mensaje `t908u` «ok vamos», chat con OPAI 2.0, registrada por el bot OPAI 2.0). Lo aprobado es el **diseño**; la construcción de este brief respeta el orden del `ROADMAP.md` (va después de Puestos y Comercial) y empieza cuando Carlos dé el turno. No hay cita de Carlos que autorice construir ahora: este PR solo deja la especificación, las decisiones y el brief.

> **Especificación:** `docs/2.0/modulos/cpq.md` (reglas R1–R68, criterios CA1–CA26; las decisiones del flujo cotización → envío están en §5.M). **Diseño aprobado (referencia visual y funcional):** export v3 de Claude Design hecho con el DS de OPAI 2.0 V2, en [`docs/2.0/diseño/export-cpq/`](../diseño/export-cpq/). **Reglas:** `AGENTS.md`, `docs/2.0/REGLAS-codigo.md`, ADR-004/ADR-034 (paridad UI↔MCP), ADR-021 (reglas de negocio como configuración versionada), ADR-022 (alcance en la consulta), ADR-036 (capas de sueldo y puesto), ADR-040 (modelo comercial), ADR-042 (CPQ), ADR-045 (rendimiento), ADR-047 (ciclo del módulo), ADR-048 (dependencias), ADR-049 (agente interno), ADR-052 (auditoría atómica), ADR-055 (todo por MCP), ADR-014/ADR-017 (DS 2.0), ADR-037 (presupuesto de JS), ADR-020 (comunicaciones), ADR-019 (documentos), ADR-028 (marca del tenant).

---

## 1. Objetivo

Construir el **cotizador** de CPQ y el flujo **cotización → envío**: la planilla viva por secciones (instalaciones + Común), el resumen con costos por categoría y margen, los instrumentos financieros editables por cotización, versiones congeladas al enviar, aprobación por margen, cotización rápida, la vista cliente, el envío (con el formato de CAR-68) y el agente interno sobre las mismas capacidades. El precio sale del **modelo de costeo del tenant** (motor del Brief 08) y cada monto se explica con su traza. Todo lo que se hace en pantalla se hace por MCP con vista previa; lo irreversible (aprobar margen, enviar, confirmar puestos, guardar la configuración) lo decide una persona.

**Se nota que funciona** cuando Gard cotiza y envía **solo en 2.0** (criterio de término de la fase 2, `ROADMAP.md`), las cinco cotizaciones reales elegidas (R39) dan el mismo precio al peso que 1.0, y una cotización rápida de 1 posición 24/7 sale en menos de 3 minutos, a 375, 1024 y 1280 px, con paridad MCP.

## 2. Qué cubre el Brief 08 y qué el Brief 10

El `ROADMAP.md`/`PLAN-desarrollo.md` asignan al CPQ los **Briefs 08 y 10**. El reparto:

- **Brief 08 — Motor CPQ (sin pantallas).** El lenguaje de fórmulas acotado y determinista (R10), el **modelo de costeo versionado** del tenant copiado de la plantilla de la vertical (R6–R14), el cálculo puro del dominio con **traza por monto** (R24–R30), el **costo laboral** desde las capas de ADR-036 (R28) y las personas por posición desde el patrón (R21), el **margen financiero** (R31–R37) y los **casos dorados** CD-1, CD-2, los tests portados de 1.0 y las cinco cotizaciones reales + el caso compuesto (R38, R39, §14 pregunta 14). Sin UI. Es la base que el Brief 10 pinta y expone.
- **Brief 10 — Cotizador y propuesta (este brief).** Las **pantallas y capacidades** del cotizador: planilla viva, secciones, líneas, resumen por categoría, instrumentos financieros editables, versiones y estados, aprobación por margen, cotización rápida, vista cliente, envío, oferta de puestos al ganar, configuración en 3 pestañas, **línea base al aceptar** (R68) y el **agente interno** sobre CPQ. Expone por MCP toda acción de pantalla (ADR-055).

Las migraciones de datos propias del motor (modelo, variables, fórmulas, ítems, paquetes, categorías) pueden entrar con el Brief 08 o con el primer PR del Brief 10 según convenga; este brief asume que el motor existe y declara las tablas que le faltan (cotización, versión, sección, línea, aprobación, instrumentos por cotización, **línea base**).

## 3. Orden y dependencias (requisito, no recomendación)

- **CPQ se construye DESPUÉS de Puestos (Brief 11) y Comercial (Briefs 06 y 07).** La cotización **cuelga de un negocio** (ADR-040 §4) y la cuenta y las instalaciones son las del negocio; sin Comercial no hay dónde colgarla. Los **puestos** al ganar (R1–R5) se crean sobre el catálogo de puestos de Puestos (`core.puestos`, Brief 11). Es dependencia dura de ADR-048, no una recomendación.
- **Fuentes opcionales (ADR-048):** sin Puestos, R2 crearía el puesto del núcleo sin PPC ni asignaciones (no es el caso: Puestos va antes). Sin el agente interno (ADR-049), los agentes externos usan el mismo MCP. Documentos es del núcleo (ADR-019): sin plantilla propia, se usa la base.
- **1.0 es el piso en capacidades:** nada que 1.0 haga (por pantalla o por MCP, §11 de `cpq.md`) puede faltar en 2.0. El Brief 08 lo asegura con los casos dorados y los tests portados; el Brief 10, igualando las herramientas MCP de 1.0 (§11).
- **Todo lo automático se configura por tenant** (ADR-021): modelo de costeo, catálogo, categorías, instrumentos financieros, condiciones, márgenes y parámetros son configuración versionada del tenant, nunca código por tenant. Nada global se consulta al calcular (R6).
- **DS de OPAI 2.0** en todas las pantallas, también en prototipos; nunca el de 1.0.

## 4. Alcance por PRs pequeños y verificables

Cada PR deja el gate en verde, su autorrevisión y paridad MCP; se trae `main` con merge (sin rebase). Propuesta de corte (ajustable al construir):

1. **PR 10.1 · Datos y capacidades base.** Schema `cpq` (si no lo creó el Brief 08): `cotizaciones`, `versiones`, `secciones`, `lineas`, `aprobaciones`, con `tenant_id`, RLS `tenant_isolation`, `uuid(7)`, `@map` snake_case y los GRANT del schema. Capacidades `cpq.cotizaciones.list/get/create`, `cpq.cotizaciones.ajustar` (lote tipado, R? §9), estados (R40), con `dryRun`, `idempotencyKey` y auditoría atómica (ADR-052). Correlativo `CPQ-AAAA-NNN` atómico por tenant y año (R54). Paridad MCP y snapshot.
2. **PR 10.2 · Planilla viva y resumen.** Pantalla del cotizador (planilla por secciones, líneas de puesto/ítem/adicional), resumen con **costos por categoría directos/indirectos** (R55) y semáforo de margen, cálculo en el navegador + recálculo en servidor como autoridad. **`cpq:costos.ver` aplicado en el servidor** (R59): las capacidades no devuelven costo, margen ni sueldos sin el permiso.
3. **PR 10.3 · Instrumentos financieros, condiciones y moneda.** `DetalleInstrumentos` (R57, R60), selector UF/CLP (R62), condiciones y reajuste editables con «sobrescrito»/«volver al valor por defecto» (R63). **Las fórmulas de pólizas y RC se dejan detrás de valores configurables y NO se activan hasta la confirmación del corredor (R66, §6 de este brief).**
4. **PR 10.4 · Versiones, aprobación y envío.** Versiones congeladas (R43), estados y aprobación por margen (R34, R35, R42), envío (R43, formato de CAR-68), vencimiento diario (R44) por trabajo/cron (ADR-029). Nombre editable con auditoría y evento `cpq.cotizacion.renombrada` (R67).
5. **PR 10.5 · Cotización rápida, vista cliente y comparar.** Cotización rápida (R47, también en teléfono), vista cliente (sin costos), comparar versiones/alternativas (R23).
6. **PR 10.6 · Ganar → línea base y oferta de puestos.** Al aceptar (R45) se escribe la **línea base inmutable** (R68) y se ofrecen los puestos (R2) sobre Puestos (Brief 11); confirmación de RRHH (`APPROVAL_REQUIRED`).
7. **PR 10.7 · Configuración (3 pestañas) y novedades de la plantilla.** Catálogo, Pólizas y finanzas, Márgenes (R58); categorías editables (R61); «Ver impacto» (R9) y adoptar novedades (R7). `cpq:modelo.manage`.
8. **PR 10.8 · Agente interno sobre CPQ.** Flujos de §9 de `cpq.md` (desde solicitud, desde negocio, ajustes en lenguaje natural, explicar el costo), con plan confirmado; escenario de prueba `docs/2.0/agentes/operar-cpq.md` (ADR-034).

## 5. Permisos, alcance y paridad

- Permisos (R? §7): `cpq:cotizaciones.read`/`.manage`, **`cpq:costos.ver`**, `cpq:aprobar`, `cpq:modelo.manage`. En `packages/domain/src/permisos.ts`, el gerente (`permitir: ["*"]`) lleva denegados `cpq:aprobar` y `cpq:modelo.manage`; `cpq:costos.ver` no le abre la lectura de estructuras sensibles del núcleo (R20).
- **`cpq:costos.ver` en los tres bordes (R59, CA15):** la regla se aplica en el **servidor**. Sin el permiso, las capacidades no devuelven costo, margen (ni su porcentaje), resumen por categoría, sueldos ni semáforo; el cálculo corre solo en el servidor y al navegador, `/api/v1` y el MCP solo viajan los totales visibles (venta, únicos, dotación, UF, estado). Hay **tests negativos**: un rol sin `cpq:costos.ver` recibe la cotización sin esos campos por pantalla, API y MCP; el agente tampoco los recibe.
- **Alcance de filas (ADR-022):** toda lectura y escritura filtra por `tenant_id` y, cuando aplique, por el alcance del usuario, **en la consulta, nunca en la UI**. Una cotización de otro tenant o fuera de alcance responde **NOT_FOUND** (sin revelar que existe; sin enumeración por mensaje ni por tiempo). En la v1 quien ve Comercial ve todas las cotizaciones del tenant (R? §7), pero las capacidades igual filtran por tenant y nadie se concede más alcance que el propio.
- **Paridad (ADR-004, ADR-034, ADR-055):** cada capacidad produce su herramienta MCP y su `preview_`; `cpq.cotizaciones.aprobar`/`rechazar_aprobacion` son `soloPersonas` y van en `paridad-excepciones.ts` con el motivo «es el control humano sobre lo que propone un agente». El gate `paridad.test.ts` y el snapshot `herramientas-mcp.txt` quedan en verde; `pnpm mcp:verificar` tras desplegar.

## 6. Reglas que el brief exige verificar (criterios y pruebas)

- **Línea base inmutable (R68, CA24).** Al aceptar se escribe una línea base por **instalación y mes** (venta, costo de personal, costo por categoría, instrumentos y margen, con la **UF congelada a la fecha de aceptación**) en una tabla propia del schema `cpq` (p. ej. `cpq.lineas_base`), **append-only para `opai_app`** (sin UPDATE/DELETE, como `core.audit_events`), con RLS por tenant. **Test:** no se puede modificar ni recalcular la línea base (un intento falla); un cambio posterior del negocio crea una **versión o adenda** sin tocarla; la escritura de la línea base y la aceptación comparten transacción (no hay aceptación sin presupuesto, ni presupuesto sin aceptación). La comparación cotizado vs real **no** se construye aquí: es de Finanzas (fase 5), con centro de costo = cliente + instalación. **No hay multi-país.**
- **Auditoría del renombre (R67, CA26).** Renombrar deja el cambio en `core.audit_events` (actor, antes/después, misma transacción, ADR-052) y emite `cpq.cotizacion.renombrada` por outbox; aparece en el Historial. **Test:** el evento y el registro de auditoría quedan con el antes/después; el código `CPQ-AAAA-NNN` no cambia; sin `cpq:cotizaciones.manage` no se puede renombrar.
- **`cpq:costos.ver` en UI, servidor y MCP (R59, CA15).** Ver §5. **Tests negativos** por los tres bordes.
- **Fórmulas de pólizas con prima mínima y gastos de emisión, detrás de valores configurables (R66, CA20).** Los parámetros de pólizas y RC (incluidas **prima mínima** y **gastos de emisión**) viven en Configuración (Pólizas y finanzas), con valor por defecto y sobrescribibles por cotización; el costo de la póliza **no baja de la prima mínima** y **suma los gastos de emisión**. **PENDIENTE DE CONFIRMAR con el corredor (Luis Cornejo)** y con cómo cotizan las aseguradoras en Chile: las **fórmulas exactas** (garantía/cumplimiento = monto × % × prima × plazo ÷ 12; RC = valor UF × monto asegurado × prima × meses ÷ 12; reparto en los meses del contrato) y el detalle de la prima mínima, la base de días y los meses extra de vigencia. **No se implementan las pólizas sin esa confirmación**; hasta entonces R33–R34 quedan como referencia y los casos dorados con póliza (CPQ-2026-340, el compuesto) se recalculan cuando el corredor confirme. Test: con los valores del tenant y la fórmula confirmada, el precio cuadra con el caso dorado; la prima mínima y los gastos de emisión se reflejan en la traza.
- **Concurrencia (autorrevisión).** El correlativo `CPQ-AAAA-NNN`, la aceptación + línea base, y el paso de estados que dependen entre sí van en **una sola transacción** (o con advisory lock), sin TOCTOU. La edición concurrente de una versión usa control optimista (gana la primera; la segunda recarga sin perder su cambio, caso borde de §12).
- **Casos dorados (R38, R39, CA2).** El Brief 10 no se integra con cálculo visible si el motor del Brief 08 no pasa CD-1, CD-2, los tests de 1.0 y las cinco cotizaciones reales + el compuesto al peso.

## 7. Interfaz (DS 2.0 en `main`)

Se reproduce fiel el **export v3** (pantallas, flujos, estados, textos y jerarquía) construido con el DS de `main`: tokens de `packages/ds/src/tokens.css`, componentes de `packages/ds` y el shell 2.0 (`PaginaPortal`, `SplitScreen`, `ListScreen`, `DetailScreen` con pestañas por ruta, `PlanillaScreen`, `FormScreen`). No se copia el CSS ni el JS del export. Los componentes que el Design Prompt marca como nuevos (`PlanillaCotizacion`, `ResumenCostosCategoria`, `DetalleInstrumentos`, `SemaforoMargen`, `TrazaMonto`, `SimuladorMargen`, `DiffVersiones`, `SelectorRateo`, origen del sueldo) se agregan al **DS** con diseño aprobado, nunca al módulo (ADR-017). Pulido obligatorio (foco visible, skeleton con la forma de la planilla, vacío con acción, transiciones 150–200 ms con `prefers-reduced-motion`, contraste AA, touch ≥ 44 px). **Mobile e iPad first:** se verifica a 375, 768 (iPad vertical, solo el cotizador), 1024 y 1280; modo oscuro al menos en el cotizador y la aprobación. Rendimiento (ADR-045): shell persistente, skeleton inmediato, ≤ 8 consultas por navegación; presupuesto de JS por ruta (ADR-037), declarado y medido antes y después.

**Referencia del diseño v3 aprobado:** [`docs/2.0/diseño/export-cpq/`](../diseño/export-cpq/) (17 archivos `.dc.html`, `cpq-data.js`, `support.js`, `github.md` y el bundle `_ds/`, copiados del export v3; el `_ds/` se **duplica** como en `export-crm` porque difiere del suyo en 6 archivos pese a compartir el id de versión; de `shots/` se guardan solo `shots/crops/D1h-titulo-editable.png`, `shots/D15.png` y `shots/D16.png`, no las capturas `.cjs` ni el resto de `shots/`).

## 8. Pendientes de diseño (se resuelven al construir)

Detalles menores que el export v3 dejó para resolver al implementar, con el DS 2.0:

1. **Inputs de P6 (Aceptar en el teléfono)** a **44 px de alto mínimo** (hoy 42 px), para cumplir el touch target de REGLAS-codigo.md.
2. **Tooltip del DS** en lugar del atributo `title` nativo (p. ej. el botón «Enviar» deshabilitado), para foco y accesibilidad.
3. **Estilos `:focus-visible`** en todos los controles interactivos.
4. **Prima mínima y gastos de emisión** de las pólizas en la pantalla de Pólizas y finanzas y en el detalle de la cotización (campos y traza), según R66, una vez que el corredor confirme.
5. **Guardar la línea base inmutable al aceptar** (R68): la pantalla del negocio ganado / la cotización aceptada muestra el presupuesto resultante (solo lectura); la escritura es automática.
6. **Auditoría del renombre y evento «renombrada» en el Historial** (R67): el título editable en el cotizador y la entrada en el Historial.

## 9. Riesgos

- **Pólizas pendientes del corredor (R66):** el bloque de pólizas no se puede cerrar hasta la confirmación de Luis Cornejo y de cómo cotizan las aseguradoras en Chile. Si llega tarde, el cotizador se puede integrar con el resto (mano de obra, ítems, margen, costo financiero) y las pólizas detrás de un interruptor «sin confirmar», sin bloquear el envío que no las use. Se anota en el PR.
- **Motor del Brief 08 primero:** el Brief 10 asume el motor y los casos dorados. Si el Brief 08 no está, el cotizador no calcula; no se integra con cálculo a medias.
- **Nombres y parámetros del tenant:** categorías, instrumentos y condiciones de fábrica salen de la plantilla `seguridad`; Carlos los ajusta en Configuración sin migración.

## 10. Tests y gate

- **Dominio (Brief 08, se consume aquí):** cálculo con traza, margen financiero, casos dorados.
- **Capacidades:** validación, autorización por rol y por `cpq:costos.ver`, alcance por tenant (NOT_FOUND fuera de alcance), `dryRun`, idempotencia, auditoría atómica, aprobación humana de lo irreversible (contexto falso y `*-db.test.ts` con Postgres real y rol sin BYPASSRLS).
- **Base (`pnpm test:db`):** RLS por tenant en todas las tablas nuevas; **línea base append-only** (no UPDATE/DELETE); correlativo atómico; dos empresas sin fuga (CA16).
- **Paridad** (`paridad.test.ts` + snapshot) y **presupuesto de JS** (ADR-037) en verde; `pnpm mcp:verificar` tras desplegar.
- **e2e** a 375, 1024 y 1280 px con capturas comparadas con el export v3: crear rápida, editar planilla, pedir/aprobar margen, enviar, renombrar (evento en Historial), ganar → línea base, `cpq:costos.ver` oculta costos por los tres bordes.
- Gate local antes de cada push: `pnpm typecheck && pnpm lint && pnpm test` (+ `test:db` por tocar base, + `build`/`presupuesto` por tocar la web) y los e2e afectados. Autorrevisión con un subagente antes del PR.

## 11. Entregables de documentación por PR

Cada PR actualiza `docs/2.0/ESTADO.md` (qué entró, qué quedó pendiente, qué se decidió), deja `ROADMAP.md`/`PLAN-desarrollo.md` al día si cambia el plan, y trae el resumen ejecutivo para Carlos. El escenario del agente va en `docs/2.0/agentes/operar-cpq.md` con su prueba en `pnpm test` (ADR-034).


## 12. Cierre 10.2a (CAR-132, Refs CAR-119)

El encargo de cierre del 1-nov-2026 limita este PR a la entrada «Cotizaciones»,
la lista y la creación desde el Negocio y desde la lista, sobre #187 ya integrado.
Se retoma el trabajo sin commitear y se conserva el merge normal de main.
El corte lo aplica Codex conforme al encargo, sin nuevas decisiones de negocio.
El resto de 10.2 (planilla y resumen de costos) queda pendiente del motor.

**Decisión de Carlos del 1-nov-2026 00:57 CLT, citada en el encargo:**
«Construye ya las pantallas de CRM y CPQ con Codex, con el design system de 2.0, y revisamos el diseño después en vivo».
**Diseño no aprobado: se revisa en vivo.** Esta excepción específica prevalece
sobre la referencia general al export aprobado de las secciones 1 y 7.

- Entrada `/cotizaciones`, lista paginada y pestaña del Negocio con permisos efectivos.
- Alta CLP sobre negocio abierto: título y validez, vista previa sin escribir,
  confirmación con clave de idempotencia y navegación de regreso a la lista.
- Lista: código, título, negocio, estado, versión, validez, vigente/alternativa y venta;
  si falta cálculo se muestra «Pendiente del motor de costeo». No presenta costos ni margen.
- El enlace de una fila abre las cotizaciones del negocio; la ficha individual y la planilla
  no forman parte de este corte. No se modifica el backend de creación.
- Sin migraciones, permisos nuevos ni cambios en topes. No se incluyen pantallas de CRM.

**Pendientes heredados de #187:** carrera en `modules/cpq/capabilities/crear.ts`
al validar negocio abierto y elegir vigente antes de escribir: cierre/archivo concurrente
u otra primera cotización pueden invalidar lo leído; la restricción de vigente puede
responder `CONFLICT`. Se anota y no se corrige en CAR-132 por instrucción expresa.
La clave de idempotencia del formulario evita duplicados del mismo envío, pero no resuelve
esa carrera de backend. El filtro de estado de la lista conserva la semántica de #187
(cualquier versión coincidente); revisar al implementar el ciclo de versiones.

Recorrido de los CA de la especificación: **entrega parcial**, no cierre del Brief 10.

| CA | Estado en 10.2a |
|---|---|
| CA1 | Fuera de este corte: plantilla y configuración. |
| CA2 | Pendiente: motor y casos dorados; sin cálculo visible. |
| CA3 | Pendiente: secciones, líneas, subtotales y condiciones. |
| CA4 | Fuera de este corte: copias del catálogo. |
| CA5 | Pendiente: validación del modelo y ver impacto. |
| CA6 | Pendiente: traza y explicación de montos. |
| CA7 | Pendiente: estados y aprobación por margen. |
| CA8 | Pendiente: precio subvalorado y aprobación. |
| CA9 | Pendiente: envío y nuevas versiones. |
| CA10 | Pendiente: vencimiento y renovación. |
| CA11 | Pendiente: ganar y ofrecer puestos a RRHH. |
| CA12 | Parcial: alta desde negocio existente; sin cotización rápida ni negocio nuevo. |
| CA13 | Parcial: lista y formulario con DS adaptable; sin planilla, comparar ni aprobar. Evidencia visual pendiente. |
| CA14 | Parcial: create/list/get usan capacidades MCP existentes con vista previa; sin ajustes, guardias ni envío. |
| CA15 | Parcial: no se serializan costos ni margen para la lista; regresiones unitarias de UI y capacidades. API/MCP en vivo pendiente. |
| CA16 | Heredado de #187, sin cambios de schema; prueba real de dos empresas pendiente fuera de Codex. |
| CA17 | Acciones sobre capacidades existentes; gate de paridad incluido en pnpm test. |
| CA18 | Pendiente: costos por categoría y motor. |
| CA19 | Pendiente: catálogo y rateo. |
| CA20 | Pendiente: instrumentos, confirmación del corredor y fórmulas. |
| CA21 | Pendiente: las tres pestañas de configuración. |
| CA22 | Pendiente: valores por defecto y sobrescrituras de pólizas. |
| CA23 | Pendiente: edición de categorías. |
| CA24 | Pendiente: aceptación y línea base inmutable. |
| CA25 | Parcial: el alta usa CLP por defecto; selector UF, condiciones y reajustes pendientes. |
| CA26 | Pendiente: renombre e historial. |

Validación del cierre: se ejecutan typecheck y lint con `--concurrency=1`,
unitarios, build y presupuesto; los resultados efectivos se consignan en el PR.
**test:db: se corre fuera de Codex** (no se ejecuta por instrucción expresa).
El spec `apps/web/e2e/cpq-cotizaciones.spec.ts` cubre ambas entradas, vista previa,
validez, permisos y capturas a 375/1024/1280; su fixture exige `opai_e2e` local
para ambas URLs de base y no aplica migraciones. Ejecución y capturas pendientes
si ese entorno no está completo. Rendimiento por navegación (≤8) y revisión visual
de foco, contraste y estados quedan pendientes de medición en navegador.


Resultados observados en Codex para este cierre:

- `pnpm typecheck --concurrency=1`: 18 tareas correctas.
- `pnpm lint --concurrency=1`: 18 tareas correctas, sin errores (advertencias existentes).
- `pnpm test`: 266 archivos y 1.722 pruebas correctas en la corrida final.
  Se regeneró el inventario de paridad tras la primera corrida; 359 pares, 0 faltantes.

- Build de producción: correcto, tras corregir el tipo del área en el test de navegación.
- Presupuesto CPQ: lista 158,6 KB, nueva 164,2 KB y pestaña del negocio 163,8 KB
  (tope 165 KB en las tres). El gate global falla en `/(erp)/configuracion/modulo/[id]`:
  180,9 KB frente a 180 KB. No se suben topes ni se modifica esa pantalla fuera de alcance.
  No se ha medido esa ruta sobre una compilación separada de main para atribuir el origen.
- E2e intentado con `--workers=1 --max-failures=1`: 1 fallo de preparación y 8 sin ejecutar;
  la fixture no pudo prepararse. `DATABASE_URL_MIGRATE` no está cargada y la guardia local
  exige esa URL junto con `DATABASE_URL`. Sin capturas ni validación visual efectiva.
- Autorrevisión con subagente completada: sin bloqueos nuevos de seguridad/migraciones/datos;
  corregidos el test de creación desde la lista, la aserción del título del negocio y el
  comentario del buscador. La carrera heredada de #187 sigue pendiente.
