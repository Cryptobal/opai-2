# CPQ — Especificación funcional

**Estado:** **borrador; las 15 preguntas del §14 las decidió Carlos el 29-oct-2026 tal como venían recomendadas** (ADR-047) · **Fase:** 2 · **Fecha:** 29-oct-2026 · **Insumos:** `extraccion/comercial-y-cpq.md` (P1–P18, §3.7–§3.9, §6), ADR-021, ADR-036 (capas de sueldo y reglas del puesto), ADR-040, ADR-042 (con las decisiones de Carlos del 23 y 24-oct en `PREGUNTAS-carlos.md`, 4–11), ADR-048 (respuesta 3), ADR-049 (agente interno), ADR-055 (todo por MCP), `modulos/comercial.md`, `NAVEGACION.md`, `DISENO.md` · **Autor:** Claude · **Tareas:** CAR-66 (este documento; antes CAR-10)

> Lenguaje de negocio, sin código (ADR-047). El diseño y los Briefs 08 y 10 citan las reglas (R1…) y los criterios (CA1…). Lo que ya decidió Carlos se marca **[decidido]** con su fuente; las preguntas del §14 las decidió Carlos el 29-oct-2026. El Design Prompt está en [`../design/DESIGN-PROMPT-cpq.md`](../design/DESIGN-PROMPT-cpq.md).

> **Sobre las «8 preguntas de la Page de CPQ».** La Page de CPQ (propuesta de Carlos, fuera del repo) **no está en el repositorio y no la encontré** en Notion (búsqueda del 29-oct-2026 por «CPQ», «OPAI 2.0», «propuesta», «preguntas» y «modelo de costeo»). **Las 8 preguntas del §14.A son una reconstrucción** hecha desde este archivo, `extraccion/comercial-y-cpq.md` (P1–P18 y tablas de 1.0), ADR-021 y ADR-042, cubriendo lo que esos documentos dejan abierto. Si la Page existe y alguna pregunta suya no está aquí, se agrega sin renumerar las de este documento.

## 1. Objetivo

Que cualquier empresa de servicios con personal (Gard primero, con la vertical **seguridad**) cotice en minutos y sin errores un servicio de una o varias instalaciones, con un precio que sale de **su propio modelo de costeo**, que se explica monto por monto, que respeta su margen mínimo y que se reproduce igual años después. Una persona o un agente arma, ajusta y explica la cotización por las mismas capacidades; lo irreversible (aprobar margen, enviar al cliente, crear puestos) lo decide siempre una persona.

**1.0 es el piso:** 2.0 calcula lo mismo que 1.0 (casos dorados al peso, §5.F) y hace todo lo que 1.0 hace por pantalla y por MCP (§11). **El techo:** una sola cotización por negocio con secciones por instalación, versiones congeladas, aprobación por margen, explicación de cada monto, simulación instantánea y un modelo que cada tenant ajusta sin programar.

**Cómo se nota que funciona:**
- Las cotizaciones reales de Gard elegidas para validar (§5.F, R39) dan el **mismo precio de venta mensual al peso** que 1.0.
- Una cotización de un puesto 24/7 en una instalación conocida sale en **menos de 3 minutos** (cotización rápida) y una multi-instalación de 5 secciones en menos de 20 minutos.
- Durante dos semanas seguidas Gard cotiza y envía **solo en 2.0** (criterio de término de la fase 2, `ROADMAP.md`).
- El 100 % de las cotizaciones bajo el margen mínimo pasa por aprobación antes de salir.

## 2. Entidades y relaciones

| Entidad | Qué es | Se relaciona con | Dónde vive |
|---|---|---|---|
| Plantilla de vertical | Modelo de partida de OPAI para una vertical (`seguridad` en la v1 **[decidido, ADR-042 (10)]**; `aseo` y `facility` en backlog): variables, categorías, fórmulas, ítems y paquetes | Se **copia** al tenant al activar CPQ; nunca se consulta al calcular | Plataforma |
| Modelo de costeo | Definición del tenant, **versionada**: variables, categorías, fórmulas, paquetes y los valores por defecto de las 3 pestañas de configuración (R58). Cada versión guardada es inmutable | Ítems; cotizaciones (cada versión de cotización guarda qué versión del modelo usó) | CPQ (por tenant) |
| Variable | Dato con tipo (`entero`, `clp`, `uf`, `porcentaje`, `booleano`, `opcion`), unidad, valor por defecto y **ámbito** (`tenant`, `cuenta`, `instalacion`, `cotizacion`, `linea`); dice si el cliente la ve | Fórmulas; valores usados en cada versión | Modelo |
| Fórmula | Expresión con nombre en el lenguaje acotado de ADR-042 (aritmética, `min`, `max`, `redondear`, `si`; sin código ni acceso a datos) | Variables, campos de la línea, otras fórmulas | Modelo |
| Categoría de costo | Mano de obra, equipamiento, insumos, logística, infraestructura, seguros, otros (editables), cada una marcada como costo **directo** o **indirecto** (R55) | Ítems y líneas; subtotales y resumen por categoría | Modelo |
| Ítem de catálogo | Algo que se cotiza: código, nombre, categoría, unidad, moneda, **costo unitario**, **rateo por defecto** (R56), **modo de cálculo** (`mensual_fijo`, `por_persona_mes`, `por_puesto_mes`, `por_hora`, `por_rotacion`, `unico`, `formula`; el antiguo `amortizable` es ahora el rateo de R56), visible al cliente, por defecto. Los «incluye» de 1.0 son ítems sin costo y visibles | Líneas (que guardan **copia** del ítem) | CPQ (por tenant) |
| Paquete | Combinación guardada del tenant para cotizar rápido (p. ej. «1 posición 24/7 4x4 con uniforme y radio») | Cotización rápida; agente | Modelo |
| Cotización | Oferta a un cliente con **código** `CPQ-AAAA-NNN` y **versiones**; cuelga siempre de **un negocio** **[decidido, ADR-040 §4]** | 1 negocio (y por él, la cuenta); N secciones; condiciones; aprobaciones | CPQ |
| Versión | Una foto de la cotización: líneas, valores de variables, versión del modelo, UF usada, totales. Solo una versión editable por código; enviar la congela | Cotización | CPQ |
| Sección | Agrupación de líneas por **instalación del negocio**, más una sección **Común** para lo compartido (supervisión, vehículo de ronda) | Instalación del núcleo (vía el negocio) | CPQ |
| Línea | Lo cotizado dentro de una sección: **puesto** (posición de servicio), **ítem** o **adicional** (con margen propio). Puede llevar un **grupo** (etiqueta libre, p. ej. «Ítem A · Control de acceso») | Ítem (copia), `core.puestos` (opcional, en ampliaciones y renovaciones), cargo, patrón | CPQ |
| Condiciones comerciales | Pago, reajuste (ninguno, IPC, IMO, polinómico), duración, inicio, validez, moneda de presentación | Versión | CPQ (valores por defecto en la pestaña Pólizas y finanzas, R58) |
| Pólizas y costo financiero | Póliza de garantía o fiel cumplimiento, responsabilidad civil y costo financiero, con su detalle editable (R57) | Versión | CPQ (valores por defecto del tenant en Pólizas y finanzas) |
| Aprobación | Pedido y decisión sobre una versión que queda bajo el margen mínimo o subvalorada | Versión; usuario que pide y que decide | CPQ |
| Oferta de puestos | Lista que se arma al ganar el negocio con una propuesta de puesto por línea de guardias (R1–R5) | Negocio ganado; cotización aceptada; `core.puestos` | CPQ → núcleo |

**Relaciones centrales:** negocio 1—N cotizaciones (una **vigente**); cotización 1—N versiones (una editable); versión 1—N secciones; sección 1—N líneas; sección N—1 instalación del negocio (o Común). La cuenta **no** se guarda en la cotización: es la del negocio (corrige P2 y P3).

## 3. Pantallas y pestañas

Área **Comercial** (`NAVEGACION.md` §2): Solicitudes · Negocios · **Cotizaciones**. El Modelo de costeo es una acción secundaria de Cotizaciones, solo owner y admin **[decidido, ADR-042 (8); NAVEGACION §2]**.

| Pantalla | Ruta | Portal | Patrón | Menú o pestaña |
|---|---|---|---|---|
| Lista de cotizaciones | `/cotizaciones` | ERP | Lista (`ListScreen`; `SplitScreen` en iPad y escritorio) con filtros: estado, vigente, vence pronto, bajo margen, responsable del negocio, etiqueta del negocio | Comercial → Cotizaciones |
| Pestaña Cotizaciones del negocio | `/negocios/[id]/cotizaciones` | ERP | Lista dentro de la ficha (ADR-041): vigente arriba, alternativas, historial | Pestaña de la ficha del negocio |
| Cotizador | `/cotizaciones/[id]` (versión editable o la última) | ERP | **Planilla viva** (`PlanillaScreen`) con resumen fijo a la derecha | Desde la lista, la pestaña o ⌘K |
| Versión congelada | `/cotizaciones/[id]/v/[n]` | ERP | Ficha de solo lectura | Historial de versiones |
| Comparar | `/cotizaciones/[id]/comparar?a=&b=` | ERP | Comparación lado a lado (versiones o alternativas) | Acción de la ficha |
| Cotización rápida | Hoja sobre Negocios, Cotizaciones, la ficha del negocio o ⌘K («Nueva cotización») | ERP | Formulario corto | Acción principal de Cotizaciones |
| Aprobaciones pendientes | Bandeja de Inicio (ítem «Cotización por aprobar») y filtro «Por aprobar» de la lista | ERP | Lista + hoja de decisión | — |
| Ofrecer puestos | Hoja desde el negocio ganado o la cotización aceptada | ERP | Formulario por línea | Acción «Crear puestos» |
| Modelo de costeo (configuración del CPQ) | `/cotizaciones/modelo` con **solo 3 pestañas: Catálogo · Pólizas y finanzas · Márgenes** **[decidido, Carlos 29-oct, R58]** | ERP | Ficha con pestañas | Acción secundaria de Cotizaciones |
| Vista cliente | Interruptor «Vista interna / Vista cliente» en el cotizador | ERP | Misma planilla sin costos internos | — |

**Teléfono frente a iPad y escritorio:** en el teléfono se **ven, comparan y aprueban** cotizaciones **[decidido, ADR-042 (9)]**, se hace la **cotización rápida** **[decidido, pregunta 7]** y se habla con el agente. La edición completa de la planilla y la configuración del CPQ son de iPad (incluido vertical, desde 768 px) y escritorio. En el teléfono el cotizador muestra el resumen (venta, margen con semáforo, estado, vence) y las secciones plegadas en solo lectura.

**Resumen fijo del cotizador (iPad y escritorio):** **resumen de costos por categoría, con subtotal de directos y de indirectos, como en 1.0** (R55), costo mensual, venta mensual, pagos únicos, margen efectivo con semáforo contra el mínimo, efecto de los instrumentos financieros (costo financiero, póliza, RC), dotación (posiciones y personas), UF usada y advertencias. El cálculo corre en el navegador con el mismo dominio y el servidor recalcula al guardar y manda (ADR-042 (9)). **Sin `cpq:costos.ver`** (pregunta 9) el resumen muestra solo venta mensual, pagos únicos, dotación, UF y estado: sin resumen por categoría, costo, margen (ni su porcentaje), semáforo ni instrumentos, y la lista no ofrece el filtro «Bajo margen». En ese caso el cálculo corre solo en el servidor: al navegador, a `/api/v1` y al MCP no se envían los operandos (costos, sueldos, valores de variables de costo ni traza con montos), solo los totales visibles.

## 4. Campos y validaciones

**Cotización y versión**

| Campo | Tipo | Oblig. | Validación | Quién lo edita | Visible al cliente |
|---|---|---|---|---|---|
| Código | `CPQ-AAAA-NNN` | Sí | Correlativo atómico por tenant y año; continúa desde 1.0 **[decidido, ADR-042 (11)]** | Sistema | Sí |
| Versión | Entero desde 1 | Sí | Una sola editable por código | Sistema | Sí («v3») |
| Título | Texto ≤ 160 | Sí | — | `cpq:cotizaciones.manage` | Sí |
| Negocio | Referencia | Sí | Negocio abierto del tenant; no cambia después de creada | Al crear | No |
| Alternativa de | Referencia a otra cotización del mismo negocio | No | Mismo negocio (pregunta 2) | `manage` | Sí, como «Opción A/B» |
| Estado | Ver §6 | Sí | Máquina de estados | Sistema por acciones | No |
| Vigente | Marca | — | Una por negocio | `manage` | No |
| Versión del modelo | Referencia | Sí | Publicada | Sistema; «actualizar al modelo vigente» la cambia (R27) | No |
| Moneda de presentación | `CLP` o `UF` | Sí | Ajuste por defecto del tenant | `manage` | Sí |
| UF usada | Valor y fecha | Si hay montos en UF o se presenta en UF | Del servicio de indicadores del núcleo; se congela al enviar (R30) | Sistema | Sí |
| Válida hasta | Fecha | Sí | ≥ hoy; por defecto hoy + validez del tenant (30 días, pregunta 10) | `manage` | Sí |
| Margen objetivo y modo | Porcentaje escalado; `margen_sobre_venta` (por defecto **[decidido (7)]**), `markup`, `margen_sobre_mano_de_obra` | Sí | 0 ≤ m < 100 % en pantalla, API y MCP (la guarda `m ≥ 100 %` de R31 queda en el dominio) | `manage` | No |
| Precio manual | CLP o UF por mes | No | Si se fija, el margen se calcula al revés y se muestra (R36) | `manage` | Sí (es el precio) |
| Condiciones comerciales | Estructuradas (§2) | Sí | Valores por defecto de la pestaña Pólizas y finanzas (R58); reajuste polinómico: pesos que suman 100 % | `manage` | Sí |
| Totales | Costo, venta mensual, únicos, margen efectivo, instrumentos | — | Calculados; nunca se editan | Sistema | Solo venta y únicos |

**Línea de puesto (posición de servicio)** — sigue las reglas del puesto de ADR-036 (1 puesto = 1 posición; rol, horario y horas por separado; colación en el puesto).

| Campo | Tipo | Oblig. | Validación | Visible al cliente |
|---|---|---|---|---|
| Sección | Instalación del negocio o Común | Sí | La instalación pertenece al negocio | Sí |
| Grupo | Texto ≤ 120 | No | — | Sí |
| Nombre | Texto ≤ 120 | Sí | — | Sí |
| Cargo | Catálogo del núcleo | Sí | Activo | Sí |
| Funciones | Catálogo por tenant y vertical (ADR-036 (5)) | No | — | Sí |
| Patrón (rol) | Catálogo de patrones del tenant (4x4, 7x7, 14x14, 5x2, 2x5, 3x4 de fábrica) | Sí | — | Sí |
| Días y horario | Días de la semana y tramos `[inicio, fin)` con cruce de medianoche | Sí | Tramos sin solape | Sí |
| Horas semanales | Calculadas | — | Aviso si superan la jornada legal vigente (parámetro de plataforma con vigencia por fecha; 42 h desde el 26-abr-2026) | No |
| Posiciones | Entero ≥ 1 | Sí | 1 posición = 1 puesto al ganar | Sí |
| Personas por posición | Decimal sugerido por el motor según patrón y horario | Sí | Sobrescribir exige motivo (pregunta 15) | No |
| Sueldo bruto cotizado | CLP | No (R3) | ≥ ingreso mínimo vigente; origen visible (R20) | No |
| Puesto existente | `core.puestos` | No | Del negocio, en ampliación o renovación | No |
| Colación, movilización y otros conceptos | Según la estructura | No | No imponibles fuera de la base de cotizaciones legales | No |

**Línea de ítem o adicional**

| Campo | Tipo | Oblig. | Validación | Visible al cliente |
|---|---|---|---|---|
| Ítem | Catálogo del tenant | Sí (ítem) | Activo al agregarlo; la línea guarda su **copia** | Según el ítem |
| Cantidad, precio sobrescrito | Número, moneda del ítem | Según modo | Sobrescribir el precio exige permiso `manage` y queda en la traza | No |
| Recurrencia | `mensual` o `unico` | Sí | — | Sí |
| Rateo | `pago único`, `N meses` o `plazo del contrato` (R56) | Sí, si el ítem es una inversión | Toma el del catálogo; se puede sobrescribir en la línea y queda en la traza | No |
| Margen propio | Porcentaje | Solo adicional | 0 ≤ m < 100 % | No |
| Visible al cliente · habilitada | Booleanos | Sí | Deshabilitar no borra | — |

**Modelo de costeo:** cada variable con clave única, tipo, unidad, defecto y ámbito; cada fórmula valida al guardar una versión referencias, tipos, unidades, ciclos y división por cero (ADR-042 (3)); cada ítem con código único por tenant, costo unitario ≥ 0, rateo por defecto y, si el rateo es `N meses`, N entre 1 y 120.

## 5. Reglas de negocio

**Puestos y sueldos al ganar el negocio** — Decisión de Carlos, 25-oct-2026 23:08–23:10 (t263u–t265u), chat con OPAI 2.0 (registrada por el bot OPAI 2.0); ADR-048, respuesta 3; ADR-040, nota del punto 3. **[decidido; se mantiene sin cambios]**

- **R1.** El disparador es **ganar el negocio**, no la cotización.
- **R2.** Al ganar, cada **línea de guardias** de la cotización vigente aceptada se **ofrece** para crear su puesto (un puesto por posición, en PPC; `modulos/operaciones.md`, R1 y R10) con el **sueldo bruto cotizado** en esa línea. **RRHH confirma** cada puesto; nada se crea sin esa confirmación.
- **R3.** Si la línea de guardias **no tiene sueldo**, el puesto se crea igual y toma el **sueldo de la instalación** (capa de instalación, ADR-036), que RRHH completa.
- **R4.** Una cotización **sin guardias** (por ejemplo, solo cámaras) **no crea puestos ni sueldos**.
- **R5.** Ofrecer de nuevo los puestos de un negocio ya ganado no duplica los que ya existen.

### A. Modelo de costeo y plantilla de la vertical

- **R6.** Cada tenant tiene **su** modelo de costeo, versionado. Al activar CPQ se **copia** la plantilla de la vertical del tenant (v1: `seguridad`) con sus variables, categorías, fórmulas, ítems y paquetes. **Nada global se consulta al calcular** (corrige P13): un cambio de la plataforma nunca mueve el precio de un tenant.
- **R7.** Una actualización de la plantilla de la vertical se **ofrece** al tenant como novedad con sus diferencias (qué agrega y qué cambia); el tenant la adopta en un borrador de su modelo o la ignora. Nunca se aplica sola (pregunta 13).
- **R8.** Guardar un cambio en las pestañas de configuración (R58) valida todo (R10) y crea una versión nueva e inmutable del modelo. Solo owner y admin con `cpq:modelo.manage` cambian la configuración **[decidido, ADR-042 (8)]**.
- **R9.** Antes de guardar, «Ver impacto» recalcula con los cambios las últimas cotizaciones enviadas (hasta 20, elegibles) y muestra la diferencia de venta y margen de cada una, sin tocarlas.
- **R10.** El lenguaje de fórmulas es acotado y determinista: aritmética, `min`, `max`, `redondear`, `si` y referencias a variables, campos de la línea y otras fórmulas. Sin bucles, sin código y sin leer datos. Publicar falla con el detalle si hay una referencia rota, un tipo o unidad incompatible, un ciclo o una división que puede ser cero.
- **R11.** Las variables tienen ámbito: `tenant` (vale para todo), `cuenta` (p. ej. días de pago pactados con ese cliente), `instalacion` (p. ej. colación local, zona extrema), `cotizacion` y `linea`. El valor más específico que exista manda; cada versión guarda **los valores usados**. **En la v1 se usan `tenant`, `cotizacion` y `linea`**: los valores por cuenta o instalación no tienen pantalla y quedan en backlog, porque todo lo que no está en las 3 pestañas se decide en la cotización (R58).
- **R12.** Los parámetros **legales** de Chile (ingreso mínimo, topes imponibles, AFP, SIS, AFC, salud, mutual básica, aporte del empleador de la reforma de pensiones, jornada legal, gratificación legal) son **de plataforma**, con vigencia por fecha, y no los edita el tenant; la tasa adicional de mutual y los supuestos (AFP de referencia, salud de referencia) sí son del tenant (ADR-042 (4)).
- **R13.** La plantilla `seguridad` reproduce lo que costea 1.0 (`extraccion` §3.8): mano de obra con costo empleador, ajuste por feriados (12 al año, colchón 10 %), uniformes por rotación, exámenes por permanencia o por rotación de uniformes, ítems de costo por mes o por persona, amortizables, vehículos (arriendo + combustible + mantención), infraestructura (arriendo + combustible), colación, adicionales con margen propio y pagos únicos. Cada uno es un ítem con su modo o una fórmula, no una tabla aparte (corrige P14).
- **R14.** Una vertical nueva es **datos, no código**: otra plantilla con su vocabulario (ADR-006), sus funciones de puesto y sus ítems. `aseo` y `facility` quedan en backlog hasta que haya un tenant real **[decidido, ADR-042 (10)]**.

### B. Catálogo de ítems y paquetes

- **R15.** El catálogo es del tenant (corrige P13). Cambiar el precio de un ítem no mueve ninguna cotización: cada línea guarda la copia del ítem que usó (P16). Un ítem archivado no se ofrece, pero las líneas que ya lo tienen siguen igual.
- **R16.** Un ítem «por defecto» se agrega solo a toda cotización nueva (p. ej. uniforme básico, radio por posición) y se puede deshabilitar en la línea sin borrarlo.
- **R17.** Un **paquete** agrega de una vez una línea de puesto con sus ítems (p. ej. «Guardia 24/7 4x4»). Es la base de la cotización rápida y del agente.

### C. Cotización, secciones y líneas

- **R18.** Toda cotización cuelga de un negocio; la cuenta es la del negocio. Una cotización tiene **una sección por instalación del negocio** que se cotiza y, si hace falta, una sección **Común**. **No hay bundles** (corrige P4): las condiciones comerciales son una sola por versión.
- **R19.** Solo se cotizan instalaciones vinculadas al negocio. Agregar una instalación nueva a la cotización la vincula antes al negocio por la capacidad de Comercial (tipo `nueva`, `ampliacion`, `renovacion`, `reemplazo`).
- **R20.** **Sueldo de la línea de puesto.** Orden de origen, siempre visible en la línea: (1) si la línea referencia un puesto existente, la capa que rige ese puesto (puesto o instalación, ADR-036); (2) si la instalación ya tiene capa de instalación, esa; (3) si es una instalación nueva, el **sueldo de referencia para cotizar** del modelo por cargo (pregunta 1); (4) el que la persona escriba. El sueldo de capa (1) y (2) solo se muestra a quien tiene también el permiso del núcleo para leer estructuras sensibles; sin él, la línea muestra solo «sueldo cotizado» si lo hay, o «—», y el costo se calcula igual en el servidor. Leerlo es una lectura sensible auditada (no se duplica la auditoría de `core.estructuras.read_sensible`).
- **R21.** Las **personas por posición** las sugiere el motor desde el patrón y el horario con el dominio de turnos (4x4 y 7x7 de 12 h: 2 personas por posición). Sobrescribirlas exige motivo y queda en la traza.
- **R22.** La sección Común se presenta como tal. Mostrar un precio por instalación con lo común prorrateado es una opción de presentación (pregunta 3), no cambia el total.
- **R23.** Varias **alternativas** para el mismo negocio (Opción A, B, C; en 1.0 son cotizaciones sueltas) son cotizaciones hermanas marcadas como alternativa; se comparan lado a lado y una es la vigente (pregunta 2).

### D. Cálculo

- **R24.** El cálculo es una función pura del dominio que recibe la versión (líneas, valores, modelo) y devuelve totales y **traza**: no lee la base (corrige P17). Corre en el navegador para respuesta instantánea y en el servidor, que es la autoridad al guardar.
- **R25.** Dinero en **CLP enteros**; UF y porcentajes como enteros escalados (corrige P15). Los resultados intermedios llevan escala fina y se redondea al peso solo en los totales de línea y en la venta final, con la regla de redondeo de `@opai/domain` (pregunta 12).
- **R26.** **Cada monto se explica**: la traza dice qué fórmula, qué variables (y de qué ámbito salió cada valor) y qué ítem lo produjeron. La traza es la misma para la pantalla, el PDF interno y el agente.
- **R27.** Una versión editable conserva su versión del modelo. Si se publica un modelo nuevo, el cotizador avisa «hay un modelo nuevo» y muestra la diferencia; **actualizar al modelo vigente** es una acción explícita (pregunta 6). Una versión enviada nunca se recalcula.
- **R28.** **Costo laboral** por posición = costo empleador mensual de las personas por posición (imponible + aportes del empleador + provisión de vacaciones 8,33 % + indemnización 4,166 % + no imponibles) × personas por posición. El ajuste por feriados es una fórmula del modelo sobre ese costo (ADR-042 (4)).
- **R29.** Los ítems por persona se multiplican por las **personas**; los ítems por puesto, por las **posiciones** (en 1.0 se confundía `numGuards × numPuestos`).
- **R30.** Si un monto necesita UF y no hay valor del día, la versión queda con advertencia «falta valor UF», no se puede enviar y el instrumento queda en cero, como en 1.0. Al enviar, la UF usada se congela.

### E. Margen y costo financiero (se porta el cálculo de 1.0, `extraccion` §3.9)

- **R31.** Modos de margen sobre la base de costos `C` (sin líneas adicionales): margen sobre venta `C / (1 − m)` (por defecto **[decidido (7)]**), markup `C × (1 + m)`, margen sobre mano de obra `MO / (1 − m) + (C − MO)`, donde `MO` = costo mensual de los puestos + ajuste de feriados. Si `m ≥ 100 %` no se aplica margen (guarda del dominio; la entrada ya lo impide).
- **R32.** Las **líneas adicionales** no pasan por el modo: llevan su margen propio `base / (1 − m_línea)` y se suman antes de los instrumentos.
- **R33.** Instrumentos sobre la venta `S`: `k = f + kG`, con `f` = costo financiero mensual (2,5 % por defecto, si está habilitado) y `kG = pG × (Mg × rG / 12 + eG)` para la póliza de garantía en porcentaje (`pG` % garantizado, `rG` tasa anual, `eG` gasto administrativo, `Mg` meses del contrato). Si `0 ≤ k < 0,35`: `S = (B + RC + Gfijo + únicos) / (1 − k)`. Póliza en monto fijo UF: `Gfijo = garantía × rG / 12 + garantía × eG / Mg`. RC = prima anual en UF × UF × % asignado / 12, o tasa sobre el monto asegurado, independiente de `S`. Los pagos únicos entran a la base de la póliza solo si el ajuste lo pide (por defecto no).
- **R34.** **Guarda `k ≥ 0,35`:** `S = (…) × (1 + k)` con advertencia visible «precio subvalorado»; la versión no pasa a `lista` ni se envía sin aprobación de owner o admin con `cpq:aprobar` **[decidido, ADR-042 (5)]**.
- **R35.** **Margen efectivo** = `(S − costos − adicionales − instrumentos) / S`. Si queda **bajo el mínimo del tenant** (Gard: **10 % sobre venta [decidido (6)]**, ajuste declarativo), la versión pasa a `en_aprobacion` al pedir dejarla lista. El semáforo es verde sobre el mínimo más un **umbral de alerta** (ajuste del tenant, propuesto 3 puntos), amarillo entre el mínimo y ese umbral, y rojo bajo el mínimo.
- **R36.** **Precio manual** (modo `manual` de 1.0): la persona fija la venta y el sistema muestra el margen resultante; si queda bajo el mínimo, aplica R35.
- **R37.** El **simulador de margen** (deslizador o «precio objetivo») muestra en vivo venta, margen efectivo y semáforo sin guardar; aplicar es una escritura normal.

### F. Casos dorados

- **R38.** El motor del Brief 08 no se integra sin pasar, al peso: **CD-1** (gross-up cerrado, `S` = $10.279.605) y **CD-2** (rama `k ≥ 0,35`, `S` = $13.500.000 con advertencia), obtenidos del código de 1.0 (`extraccion` §3.9); los tests de 1.0 `financial-policy` y `cost-lines`; y casos nuevos de los modos `markup` y `margen_sobre_mano_de_obra`, que 1.0 no prueba, construidos desde las fórmulas de R31–R33.
- **R39.** Y **cinco cotizaciones reales de Gard** enviadas en 2026, elegidas por Claude con variedad (póliza de garantía, varias instalaciones, margen bajo) y **confirmadas por Carlos [decidido, ADR-042 (4)]**: mismas entradas en 2.0, misma venta mensual que 1.0; más un caso compuesto de varias instalaciones, porque en 1.0 cada cotización es una sola. Preselección en la pregunta 14.

### G. Versiones, estados y aprobación

- **R40.** Estado único (corrige P5): `borrador` → `en_aprobacion` (solo si R34 o R35) → `lista` → `enviada` → `aceptada` | `rechazada` | `vencida` | `reemplazada` (ADR-042 (7)); **propuesta:** más `archivada` para borradores abandonados, en vez de la papelera de 1.0. «Abierta» = `borrador`, `en_aprobacion`, `lista` o `enviada`.
- **R41.** Una versión aprobada que se edita vuelve a `borrador`; si sigue bajo el mínimo, pide aprobación de nuevo. La aprobación vale para **esa** versión y su venta.
- **R42.** Quien aprueba no puede ser quien pidió la aprobación, salvo que el tenant tenga un solo usuario con `cpq:aprobar` (aviso en la auditoría) (pregunta 5). Pedir aprobación admite un comentario; rechazar exige motivo. Quien pidió puede retirar el pedido.
- **R43.** **Enviar congela** la versión: modelo, valores usados, copias de ítems, UF y totales. Cambiar algo después crea la **versión siguiente** (`v+1`, borrador) con la misma numeración; al enviarla, la anterior queda `reemplazada` (P16).
- **R44.** Una versión `enviada` pasa sola a `vencida` el día siguiente a «válida hasta». Una vencida se puede **renovar** como versión nueva (con la UF y el modelo del día, mostrando la diferencia).
- **R45.** **Aceptada** es consecuencia de **ganar el negocio** (una sola fuente de verdad): la cotización vigente enviada pasa a `aceptada` y las demás abiertas del negocio, a `rechazada` (propagación de `extraccion` §3.2 como consumidor de `comercial.negocio.ganado`). Perder el negocio rechaza las abiertas.
- **R46.** Al cambiar la vigente o enviarla, CPQ informa al negocio su **valor mensual** y la **fecha de envío** por la capacidad de Comercial (ADR-042 (7)); el negocio no copia nada más.

### H. Cotización rápida

- **R47.** La cotización rápida pide lo mínimo: cuenta (o nombre del prospecto), instalación (existente o nueva con dirección opcional), uno o más **paquetes** con posiciones y horario, y opcionalmente el margen. Si no hay negocio, lo crea en la primera etapa por la capacidad de Comercial, en la misma transacción **[decidido, ADR-042 (7)]**.
- **R48.** Una cotización rápida es una cotización normal (mismo motor, estados, aprobación y versiones): se puede abrir después en el cotizador y completar.

### I. Agente (detalle en §9)

- **R49.** El agente interno (ADR-049) y cualquier agente externo usan **las mismas capacidades** que la pantalla, con los permisos y el alcance del usuario (o de la key). No hay atajos ni herramientas propias de CPQ para el agente.
- **R50.** El agente **siempre** trabaja con vista previa y deja un **plan** que la persona confirma («aprobar todo» o «paso a paso», ADR-049 (4)). Lo que el agente supone (patrón, horario, sueldo, margen) aparece como **supuesto** en el plan, nunca escondido.
- **R51.** Un agente **no** aprueba márgenes (la capacidad es solo de personas). **Enviar**, **confirmar puestos** y **guardar la configuración del modelo** son irreversibles: el agente solo los prepara y quedan en la cola de aprobación humana (`APPROVAL_REQUIRED`), donde decide una persona con el permiso (RRHH en el caso de los puestos) (pregunta 8).
- **R52.** El texto de una solicitud o de un correo del cliente es **externo**: el agente lo usa para proponer, nunca para habilitar una escritura irreversible (ADR-034).

### J. Convivencia con 1.0 e importación

- **R53.** Se importan de 1.0 solo las cotizaciones **vigentes** (enviadas y no vencidas) y el historial de **ganadas**, como registro de solo lectura (totales y PDF en Documentos), sin recalcular (`extraccion` §6). Una importada se puede **continuar** como versión nueva en 2.0, recalculada con el modelo y mostrando la diferencia (pregunta 11).
- **R54.** El correlativo de 2.0 sigue desde el último número de 1.0 **[decidido (11)]**. Los códigos de 1.0 con sufijo (p. ej. `CPQ-2026-159-defe`) se importan tal cual y no cuentan para el siguiente número.

### K. Ajustes de alcance de Carlos (29-oct-2026, tras la primera tanda de Claude Design) **[decidido]**

- **R55.** **Resumen de costos por categoría, directos e indirectos, como en 1.0.**
  - **Contenido:** el cotizador muestra el costo mensual de cada categoría y el subtotal de costos directos e indirectos. Debajo vienen el margen, los instrumentos financieros y la venta.
  - **Clase de cada categoría:** directa o indirecta. La define el catálogo; la plantilla `seguridad` trae de partida:
    - **directos:** mano de obra con feriados, uniformes, exámenes, colación y movilización;
    - **indirectos:** equipamiento, vehículos, infraestructura y otros.
  - **Pólizas, RC y costo financiero:** van en su bloque propio (R57).
  - **Permiso:** el resumen respeta `cpq:costos.ver` igual que el resto de los costos (R59).
- **R56.** **Catálogo con costo unitario y rateo por defecto.**
  - **Qué guarda cada ítem:** su costo unitario y su **rateo por defecto**, que puede ser:
    - **pago único:** se cobra una vez y va en el subtotal de pagos únicos;
    - **N meses:** costo ÷ N, mensual;
    - **plazo del contrato:** costo ÷ meses de duración de la cotización.
  - **Por línea:** el rateo se puede **sobrescribir en cada línea** de la cotización. La traza muestra el rateo usado y si vino del catálogo o se cambió en la línea.
  - **Ítems recurrentes:** los ítems de costo mensual (arriendos, servicios) no se ratean.
  - **Qué reemplaza:** el modo `amortizable` de ADR-042 (2) pasa a ser este rateo.
- **R57.** **Pólizas y costo financiero con detalle editable.**
  - **Póliza de garantía o fiel cumplimiento:** en porcentaje del contrato (% garantizado, tasa anual, gasto administrativo, meses) o en monto fijo UF.
  - **Responsabilidad civil:** prima anual en UF con % asignado, o tasa sobre el monto asegurado, y su **plazo** (R60).
  - **Costo financiero:** tasa mensual, activado o no, y si los pagos únicos entran a la base de la póliza.
  - **En la cotización:** cada instrumento muestra su detalle y se edita en la propia cotización, partiendo de los **valores por defecto del tenant**. El cálculo es el de R33–R34. Cómo se activa, se sobrescribe y se restablece está en R60.
- **R58.** **La configuración del CPQ queda en solo 3 pestañas.** Todo lo demás se decide en la cotización.
  - **Las 3 pestañas:**
    - **Catálogo:** ítems con categoría y clase directo/indirecto, costo unitario, unidad, modo de cálculo, rateo por defecto, visible al cliente y por defecto. Incluye también las categorías (editables, R61) y los paquetes.
    - **Pólizas y finanzas:** valores por defecto de póliza de garantía o fiel cumplimiento, RC y costo financiero, cada uno con su «activado por defecto» (R60), más las condiciones comerciales por defecto (forma y días de pago, reajuste, duración, validez y moneda).
    - **Márgenes:** modo de margen por defecto, margen por defecto, margen mínimo, umbral de alerta del semáforo y margen por defecto de las líneas adicionales.
  - **Lo que pasa a la cotización:**
    - patrón, horario, sueldo, personas por posición, cantidades y rateo por línea;
    - los supuestos de la plantilla, que se ven y se cambian en la cotización: horas estándar, cambios de uniforme al año, permanencia promedio, feriados y su colchón;
    - el detalle de pólizas y finanzas, y las condiciones.
  - **Variables y fórmulas:** no tienen pestaña en la v1. Vienen de la plantilla de la vertical (R6, R13), y sus cambios llegan como novedades de la plantilla (R7). Las novedades se avisan en la cabecera de la configuración y se adoptan desde ahí. Por eso el editor de fórmulas y la pestaña de variables quedan fuera de la v1.
- **R59.** **Margen y costo solo con `cpq:costos.ver`** (pregunta 9).
  - **Qué se oculta:** quien no tiene el permiso no ve el porcentaje de margen, el costo, el resumen por categoría, los sueldos ni el semáforo.
  - **Dónde se aplica:** en el **servidor**. Las capacidades no devuelven esos campos, así que vale igual en la pantalla, `/api/v1` y el MCP, y el agente tampoco los recibe.

### L. Instrumentos financieros por cotización y categorías editables (decisión de Carlos, 29-oct-2026) **[decidido]**

- **R60.** **Cada cotización decide sus instrumentos financieros.** Son tres: costo financiero, póliza de garantía o cumplimiento, y RC.
  - **En Configuración** (Pólizas y finanzas): cada instrumento tiene sus **valores por defecto** y un interruptor **«activado por defecto»**.
  - **Al crear la cotización:** cada instrumento parte activado o desactivado según ese interruptor y con los valores del tenant.
  - **En cada cotización**, cada instrumento:
    - se **activa o desactiva**;
    - se **edita** campo por campo. El plazo de la RC puede ser **12 meses, anual, plazo del contrato o N meses**.
  - **Marca y vuelta atrás:** todo valor distinto del de Configuración, incluido el estado activado o desactivado, lleva la marca **«sobrescrito»**. Hay una opción **«volver al valor por defecto»** por campo y por instrumento.
  - **Cambios en Configuración:** no mueven las cotizaciones existentes (R27). Una cotización nueva toma los valores vigentes.
  - **Cálculo:** un instrumento desactivado no entra al cálculo (vale 0 en `k`, `RC` o `Gfijo` de R33). La traza dice si estaba activo y de dónde salió cada valor: Configuración o sobrescrito.
- **R61.** **Las categorías del catálogo son editables por tenant.**
  - **Qué se puede hacer:** agregar, renombrar, desactivar y marcar cada una como **directa o indirecta** (R55).
  - **Desactivar** una categoría la saca de la lista para ítems nuevos. Los ítems que ya la usan y las cotizaciones existentes no cambian.
  - **No se borra** una categoría en uso.
  - **Cambiar su clase** directo/indirecto solo cambia los resúmenes de las cotizaciones nuevas o recalculadas. Cada versión enviada guarda la clase que usó.
  - **Plantilla:** la plantilla de la vertical entrega las categorías de partida (R6).

## 6. Estados y transiciones

| Desde | Hacia | Quién (rol, agente) | Condición | Efecto | ¿Reversible? |
|---|---|---|---|---|---|
| (crear) | borrador | `manage`; agente con vista previa | Negocio abierto | Código y v1 | — |
| borrador | lista | `manage`; agente con vista previa | Margen ≥ mínimo, sin subvaloración, sin «falta UF», al menos una línea habilitada | — | Sí, vuelve a borrador al editar |
| borrador | en_aprobacion | `manage`; agente con vista previa | Margen < mínimo o `k ≥ 0,35` | `cpq.cotizacion.aprobacion_solicitada` | Sí (retirar el pedido) |
| en_aprobacion | lista | `cpq:aprobar` (persona) | R42 | `cpq.cotizacion.aprobada` | Sí, editar vuelve a borrador (R41) |
| en_aprobacion | borrador | `cpq:aprobar` (rechaza con motivo) o quien pidió (retira) | Motivo | `cpq.cotizacion.aprobacion_rechazada` | — |
| lista | enviada | `manage`; agente **solo con aprobación humana** | Formato de salida elegido (CAR-68) | Congela (R43); informa al negocio (R46) | **No** |
| enviada | (v+1) borrador | `manage`; agente con vista previa | — | Nueva versión | — |
| enviada | vencida | Sistema (diario) | Pasó «válida hasta» | `cpq.cotizacion.vencida` | Renovar crea versión nueva |
| enviada | aceptada | Sistema | Negocio ganado y es la vigente (R45) | Oferta de puestos (R2) | No (reabrir el negocio la devuelve a enviada) |
| borrador · en_aprobacion · lista · enviada | rechazada | Sistema | Negocio ganado con otra vigente o negocio perdido | — | Reabrir el negocio |
| enviada | reemplazada | Sistema | Se envió la versión siguiente | — | No |
| borrador | archivada | `manage`; agente con vista previa | — | Fuera de las listas por defecto | Sí |

## 7. Permisos por rol y portal

Permisos nuevos: `cpq:cotizaciones.read`, `cpq:cotizaciones.manage`, `cpq:costos.ver` **[decidido, pregunta 9]**, `cpq:aprobar` **[decidido]**, `cpq:modelo.manage` **[decidido]**.

| Acción | owner | admin | gerente | supervisor | viewer | Portal Cliente | Portal Trabajador | Agente (scope `cpq`) |
|---|---|---|---|---|---|---|---|---|
| Ver cotizaciones (venta y estado) | ✓ | ✓ | ✓ | — | ✓ | Fase 3: las enviadas de su cuenta, vista cliente (CAR-68) | — | Lectura |
| Ver costos, sueldos y margen (incluido el semáforo) | ✓ | ✓ | ✓ **[decidido, pregunta 9]** | — | — | — | — | Solo si el usuario tiene `cpq:costos.ver`; el servidor omite esos campos |
| Crear, editar, versionar, simular, archivar | ✓ | ✓ | ✓ | — | — | — | — | ✓ con vista previa y plan |
| Pedir aprobación | ✓ | ✓ | ✓ | — | — | — | — | ✓ con vista previa |
| Aprobar o rechazar margen y subvaloración | ✓ | ✓ | — **[decidido, ADR-042 (5)]** | — | — | — | — | **Nunca** (`soloPersonas`) |
| Enviar | ✓ | ✓ | ✓ | — | — | — | — | Aprobación humana |
| Confirmar puestos ofrecidos al ganar | RRHH (rol configurable, ADR-036 (8)) | | | | | | | Solo prepara; decide RRHH (`APPROVAL_REQUIRED`, ADR-048 (7)) |
| Cambiar la configuración del CPQ (Catálogo, Pólizas y finanzas, Márgenes) | ✓ | ✓ | — | — | — | — | — | Vista previa e impacto sí; guardar con aprobación humana |

**Nota para el brief:** el gerente tiene `permitir: ["*"]` en `packages/domain/src/permisos.ts`; hay que agregar `cpq:aprobar` y `cpq:modelo.manage` a sus denegaciones (ADR-042 (5) y (8)). Hoy también tiene denegada la lectura de estructuras sensibles: `cpq:costos.ver` no se la abre (R20).

**Alcance de filas:** en la v1, quien ve Comercial ve todas las cotizaciones (igual que los negocios, `comercial.md` §7). El supervisor sigue sin `cpq:*` (`packages/domain/src/permisos.ts`). Ver montos de venta no está sujeto al bloqueo financiero de ADR-016; los **sueldos** sí son sensibles y se rigen por `cpq:costos.ver` y la auditoría de lecturas.

## 8. Eventos y notificaciones

Silencio por defecto (ADR-020). «Recomendado» = propuesta para Gard; se activa en Configuración → Comunicaciones.

| Evento | Cuándo ocurre | Quién se entera (recomendado) | Canal | Plantilla |
|---|---|---|---|---|
| `cpq.cotizacion.creada` / `version_creada` | Al crear o versionar | — | — | — |
| `cpq.cotizacion.aprobacion_solicitada` | Pasa a `en_aprobacion` | Usuarios con `cpq:aprobar` (recomendado) | In-app (Bandeja de Inicio), push | Sí |
| `cpq.cotizacion.aprobada` / `aprobacion_rechazada` | Decisión | Quien pidió (recomendado) | In-app, push | Sí |
| `cpq.cotizacion.enviada` | Al enviar | Responsable del negocio | In-app | Sí |
| `cpq.cotizacion.por_vencer` / `vencida` | 3 días antes / al vencer | Responsable del negocio (recomendado) | In-app | Sí (insumo de CAR-67) |
| `cpq.cotizacion.aceptada` | Negocio ganado | RRHH (oferta de puestos, recomendado) | In-app | Sí |
| `cpq.puestos.ofrecidos` / `confirmados` | R2 | RRHH / responsable | In-app | Sí |
| `cpq.modelo.publicado` | Nueva versión del modelo | Owner y admin | In-app | Sí |
| `cpq.plantilla.novedad` | La plataforma publica una versión de la plantilla de la vertical | Owner y admin | In-app | Sí |

## 9. Herramientas MCP y agente

Toda capacidad de CPQ sale por MCP con los mismos permisos (ADR-055); las de escritura tienen su `preview_…`, aceptan `idempotency_key` y quedan en la auditoría. Nombres de herramienta según la convención vigente (`<modulo>_<entidad>_<verbo>`).

| Herramienta | Qué hace | Efecto | Vista previa | Aprobación humana |
|---|---|---|---|---|
| `cpq_cotizaciones_list` / `get` | Lista con filtros; ficha con versiones, secciones, líneas y totales; resumen por categoría, costos y margen solo con `cpq:costos.ver` (R59) | Lectura | — | — |
| `cpq_cotizaciones_explicar` | Traza de un monto o del total en lenguaje de negocio | Lectura | — | — |
| `cpq_cotizaciones_comparar` | Diferencias entre dos versiones o alternativas | Lectura | — | — |
| `cpq_cotizaciones_simular` | Calcula una cotización completa desde una especificación, **sin escribir** (ADR-042 (10)) | Lectura | — | — |
| `cpq_cotizaciones_create` / `create_rapida` | Crear desde un negocio; o rápida con paquetes, creando el negocio si falta | Escritura | ✓ | — |
| `cpq_cotizaciones_marcar_vigente` | Elegir la vigente del negocio (R46) | Escritura | ✓ | — |
| `cpq_cotizaciones_ajustar` | **Lote de cambios tipados** sobre la versión editable: agregar o quitar sección, agregar línea de puesto o de ítem (o paquete), cambiar posiciones, horario, patrón o sueldo, cambiar el rateo de una línea (R56), activar, desactivar o editar el detalle de pólizas, RC o costo financiero y volverlos al valor por defecto (R57, R60), fijar margen o precio objetivo, cambiar condiciones, mostrar u ocultar al cliente. Devuelve el **antes y después** de venta y margen | Escritura | ✓ | — |
| `cpq_cotizaciones_nueva_version` / `renovar` / `actualizar_modelo` / `duplicar` / `archivar` | R27, R43, R44, R23 | Escritura | ✓ | — |
| `cpq_cotizaciones_marcar_lista` / `solicitar_aprobacion` / `retirar_aprobacion` | R40, R42 | Escritura | ✓ | — |
| *(sin herramienta)* `cpq.cotizaciones.aprobar` / `rechazar_aprobacion` | Decisión de margen. `soloPersonas`, en `paridad-excepciones.ts` con el motivo «es el control humano sobre lo que propone un agente» | — | — | Solo personas |
| `cpq_cotizaciones_enviar` | Congela y envía en el formato elegido (CAR-68) | **Irreversible** | ✓ | **Sí** |
| `cpq_puestos_ofrecer` / `confirmar` | Arma la oferta de puestos (R2) / RRHH la confirma | Escritura / irreversible | ✓ | Confirmar: **sí** (decide RRHH) |
| `cpq_modelo_get` / `diferencias` | Configuración vigente (las 3 pestañas) y su historial de versiones; diferencias con la plantilla de la vertical | Lectura | — | — |
| `cpq_catalogo_*` (`list`, `create`, `update`, `archivar` para ítems y paquetes; `create`, `update` y `desactivar` para categorías) | Pestaña **Catálogo**: costo unitario, rateo por defecto, categorías editables con su clase directo/indirecto (R55, R56, R61) | Lectura / escritura | ✓ | — |
| `cpq_polizas_finanzas_get` / `set` | Pestaña **Pólizas y finanzas**: valores por defecto y «activado por defecto» de póliza de garantía o cumplimiento, RC y costo financiero, y condiciones (R57, R60) | Lectura / escritura | ✓ | — |
| `cpq_margenes_get` / `set` | Pestaña **Márgenes**: modo, margen por defecto, mínimo, umbral de alerta y margen de adicionales | Lectura / escritura | ✓ | — |
| `cpq_modelo_impacto` / `adoptar_novedad` | «Ver impacto» de un cambio antes de guardarlo (R9); adoptar una novedad de la plantilla (R7) | Lectura / escritura | ✓ | — |
| `cpq_modelo_guardar` | Guarda los cambios de configuración como versión nueva del modelo (R8; lo que antes se llamaba «publicar») | Irreversible | ✓ | **Sí** |

**El agente interno en CPQ (ADR-049; el ADR figura como «Propuesto (PR #38)», pero su servidor ya está integrado por la enmienda NÚCLEO-E2).** Actúa como «agente interno vía <usuario>», con sus permisos y alcance. Arma un **plan** con lecturas y vistas previas; la persona lo confirma entero o paso a paso; cada escritura lleva clave de idempotencia; se detiene antes de aprobar, enviar, confirmar puestos o publicar el modelo.

**Flujo 1 · desde una solicitud** («cotiza lo que pide esta solicitud»):
1. Lee la solicitud (texto **externo**) y propone una interpretación: instalación, posiciones, días y horario, patrón sugerido. Si algo es ambiguo (¿24/7 o solo noche? ¿4x4 o 7x7?), **pregunta**; no adivina.
2. Previsualiza la conversión de Comercial (cuenta, contacto, negocio, instalación prospecto) y `cpq_cotizaciones_create_rapida` con los paquetes del tenant.
3. Muestra el plan: «Se creará el negocio X y la cotización CPQ-2026-NNN v1: 2 posiciones 24/7 4x4 · venta $ 8,4 M · margen 12,1 % 🟢», con los **supuestos** (sueldo de referencia del cargo, margen por defecto, UF del día).
4. La persona confirma; el agente ejecuta y deja la cotización en `borrador`. No la envía.

**Flujo 2 · desde un negocio** («arma la cotización del negocio de la planta Pudahuel»): lee el negocio, sus instalaciones y la vigente; si hay una vigente enviada, propone **versión nueva** en vez de otra cotización.

**Flujo 3 · ajustes en lenguaje natural** (sobre la cotización abierta o nombrada):
- «Sube el margen a 18 %» → `ajustar` {fijar margen 18 %} → vista previa: venta $ 9,1 M → $ 9,8 M; margen 13 % → 18 %.
- «Agrega un guardia nocturno» → si hay más de una instalación, pregunta cuál; propone `agregar línea de puesto` con 20:00–08:00 L–D, patrón 4x4 (supuesto), 1 posición = 2 personas, sueldo de referencia del cargo → muestra el delta.
- «Deja el precio en 330 UF» → `ajustar` {precio objetivo} → si el usuario tiene `cpq:costos.ver`, muestra el margen resultante y, si queda bajo el mínimo, ofrece pedir aprobación; si no lo tiene, solo dice que la versión requiere aprobación antes de enviarse, sin mostrar margen ni costo (pregunta 9).

**Flujo 4 · explicar el costo** («¿por qué cuesta tanto?», «¿de dónde salen los $ 336 mil de feriados?») → `explicar`: responde con la traza (fórmula, variables y su ámbito, ítems), y señala los tres mayores componentes. Si el usuario no tiene `cpq:costos.ver`, nombra los componentes (categorías e ítems) sin montos, porcentajes ni sueldos, para que no se pueda deducir el costo desde la venta.

**Flujo 5 · dejar lista y enviar:** el agente puede pedir la aprobación y preparar el envío; el envío queda en la cola de aprobación humana con la vista previa del documento (formato de CAR-68).

**Escenario de prueba:** `docs/2.0/agentes/operar-cpq.md`, con su escenario en `pnpm test` (ADR-034), se escribe en el Brief 10.

## 10. Integraciones

- **Indicadores (UF, IPC, IMO, ingreso mínimo):** servicio del núcleo con valores por fecha (de plataforma). Si hoy no existe como capacidad del núcleo, el Brief 08 lo agrega o lo pide; CPQ nunca consulta un proveedor directo.
- **Documentos (ADR-019, Brief 09):** PDF de la propuesta con plantillas del tenant y su marca (ADR-028). **Formatos de salida: CAR-68** (§15).
- **Comunicaciones (ADR-020):** envío por correo y avisos. **Seguimiento posterior al envío: CAR-67** (§15).
- **IA:** CPQ no llama modelos. El agente interno usa el adaptador del núcleo y mide en `core.consumos` (ADR-031, ADR-049): con la key de IA del tenant, si su proveedor falla nunca pasa a la key de OPAI (falla y avisa al tenant, ADR-049 (6)); el consumo no tiene tope por defecto y el tenant puede fijar un presupuesto opcional (ADR-049 (9)). La redacción asistida de secciones de la propuesta (en 1.0, «proposalAi») va con los formatos de salida (CAR-68).

**Sin la fuente X (ADR-048).** CPQ **depende de Comercial** (dura): no se vende sin él. **Puestos (Operaciones I)** es fuente opcional: sin él, R2 crea el puesto del núcleo (`core.puestos`) sin estado PPC ni asignaciones, y la oferta lo dice. **Agente interno** es opcional: sin él, los agentes externos usan el mismo MCP. **Documentos** es parte del núcleo: sin plantilla propia, se usa la base del sistema.

## 11. Mejoras respecto de 1.0 y lo que no se porta

| En 1.0 | En 2.0 | Por qué |
|---|---|---|
| 1 cotización = 1 instalación; bundles que duplican condiciones (P4) | Una cotización con secciones por instalación y una sección Común | Una sola fuente de verdad para condiciones y total |
| Catálogos con `tenantId` nulo y consulta `OR tenantId null` (P13) | Plantilla de vertical **copiada**; nada global al calcular | Un cambio de plataforma no mueve precios |
| Borradores recalculados con el catálogo del día; enviadas sin modelo (P16) | Versiones congeladas al enviar; actualizar al modelo es explícito | Reproducible años después |
| Dos estados (`status` y `proposalStatus`) (P5) | Un estado con aprobación por margen | Sin combinaciones ambiguas |
| Sin aprobación por margen | `en_aprobacion` bajo el mínimo (Gard 10 %) y con subvaloración | Control del precio |
| Una tabla por tipo de costo, cableada a seguridad (P14) | Ítems con modo de cálculo y fórmulas por tenant y vertical | Multi-vertical sin migraciones |
| Floats y redondeo solo al final (P15) | Enteros escalados y regla única de redondeo | Sin diferencias de centavos |
| Motor que lee la base (P17) | Motor puro, en navegador y servidor, con traza | Probable, instantáneo y explicable |
| Tablas de CPQ sin `tenant_id` (P12) | Toda tabla con `tenant_id` y RLS | Aislamiento real |
| `numGuards × numPuestos` manual | Posiciones + personas sugeridas por patrón (ADR-036) | Menos errores de dotación |
| «Opción A/B/C» como cotizaciones sueltas sin relación | Alternativas hermanas con comparación | Lo que Gard ya hace, ordenado |
| Sin explicación del costo | Traza por monto, en pantalla y para el agente | Confianza y venta consultiva |
| Herramientas MCP de 1.0: `create_quote`, `add_quote_position`, `update_quote_position`, `remove_quote_position`, `manage_quote_lines`/`extras`/`includes`, `update_quote_margin`, `update_quote_parameters`, `update_quote_status`, `clone_quote`, `list_cpq_roles`, `list_salary_structures`, `get_quote_detail`, `send_quote_proposal`, `export_quote_proposal_pdf`, `get_quote_share_link` | `cpq_*` de §9 (ajuste en lote con antes y después, simular, explicar, comparar); el envío y el PDF van con CAR-68 | Piso agéntico igualado y mejorado |

**No se porta:** bundles (`CpqProposalBundle`), papelera (`CpqQuoteTrash`; se archiva), `proposalStatus`, `CrmDealQuote` y `activeQuotationId`, `CpqServiceGroup` como entidad (pasa a «grupo» de línea), tablas por tipo de costo, catálogos globales, ajustes en `Setting` clave-valor (`cpq.holidayAnnualCount`), adjuntos propios (van a Documentos), campos de IA en la cotización (`aiDescription`, `proposalAiContent`: un agente escribe por capacidad).

## 12. Casos borde

- Falta el valor UF del día: advertencia, no se envía (R30).
- `k ≥ 0,35` o margen ≥ 100 %: R34 y R31.
- Sueldo bajo el ingreso mínimo vigente: bloquea la línea. Horas semanales sobre la jornada legal: advertencia (la persona decide si son horas extra pactadas).
- Se quita una instalación del negocio con líneas en una cotización abierta: se impide, pero sin que Comercial lea tablas de CPQ (ADR-040): CPQ publica por contrato del núcleo «instalación en uso por una cotización abierta» y la capacidad de Comercial lo consulta antes de desvincular; primero se quita la sección.
- Se publica un modelo mientras alguien edita: la versión sigue con su modelo y se avisa (R27).
- Ítem archivado en un borrador: la línea conserva su copia; no se puede agregar de nuevo.
- Dos personas editan la misma versión: gana la primera; la segunda ve «la cotización cambió» y recarga sin perder su cambio pendiente (control de versión optimista).
- El agente repite un ajuste: la clave de idempotencia evita duplicar líneas.
- Se gana un negocio cuya vigente está vencida: si Carlos aprueba la pregunta 7 de `comercial.md` (ganar exige cotización enviada), la vencida se renueva antes de ganar.
- Reabrir un negocio ganado: la aceptada vuelve a `enviada`; los puestos ya confirmados no se borran (R5).
- Cotización sin guardias (solo cámaras o suministros, como CPQ-2026-298 de 1.0): sin oferta de puestos (R4).
- Contrato corto (60 días, 3 meses): un ítem con rateo «plazo del contrato» se divide por esa duración, no por 12 (como en 1.0); si la línea tiene rateo `N meses` mayor que el contrato, se avisa.
- Cotización de licitación con ítems A, B, C: se usan grupos de línea; el motor sirve a Licitaciones (fase 6) sin cambios.

## 13. Criterios de aceptación

- **CA1.** Activar CPQ en un tenant de vertical seguridad copia la plantilla; cambiar la plantilla en la plataforma no cambia la venta de ninguna cotización del tenant.
- **CA2.** CD-1, CD-2, los tests de 1.0 y las cinco cotizaciones de Gard confirmadas por Carlos dan la misma venta mensual al peso.
- **CA3.** Una cotización con tres instalaciones y una sección Común muestra subtotales por sección y un total; las condiciones se editan una sola vez.
- **CA4.** Cambiar el precio de un ítem del catálogo no cambia ninguna cotización existente.
- **CA5.** Guardar una configuración que deja una referencia rota falla con el detalle; «Ver impacto» muestra la diferencia de venta de las últimas enviadas.
- **CA6.** Pasar el cursor (o tocar) sobre cualquier monto muestra su traza; el agente explica el mismo monto con los mismos números.
- **CA7.** Con margen 9 % en Gard, «Dejar lista» pasa a `en_aprobacion` y aparece en la Bandeja de Inicio de owner y admin; aprobar la deja `lista`; editarla la devuelve a `borrador`.
- **CA8.** Una versión con `k ≥ 0,35` muestra «precio subvalorado» y no se envía sin aprobación.
- **CA9.** Enviar congela la versión; editar después crea `v+1`; al enviar `v+1`, la `v` queda reemplazada y el negocio recibe el nuevo valor mensual.
- **CA10.** Una enviada vence sola al día siguiente de su validez; renovarla crea versión nueva con la diferencia visible.
- **CA11.** Ganar el negocio deja la vigente aceptada, rechaza las demás y ofrece un puesto por posición de cada línea de guardias, con el sueldo cotizado; nada se crea hasta que RRHH confirma; repetir no duplica.
- **CA12.** Una cotización rápida de 1 posición 24/7 se crea en menos de 3 minutos, con negocio nuevo si no existía (también en el teléfono, pregunta 7).
- **CA13.** En el teléfono (bajo 768 px) se ve, compara y aprueba, y la planilla es de solo lectura; en iPad vertical (768 px) y horizontal (1024 px) y en escritorio se edita completa.
- **CA14.** Por MCP, un agente crea una cotización, sube el margen, agrega un guardia nocturno y explica el costo, siempre con vista previa; `enviar` devuelve `APPROVAL_REQUIRED` y `aprobar` no existe para él.
- **CA15.** Un usuario sin `cpq:costos.ver` no ve sueldos, costos ni margen (ni el porcentaje ni «sobre o bajo el mínimo») en pantalla, `/api/v1` ni MCP: las capacidades no devuelven esos campos; la explicación nombra componentes sin montos.
- **CA16.** Toda tabla de CPQ tiene `tenant_id`, RLS y política `tenant_isolation`; la prueba de dos empresas pasa.
- **CA17.** El inventario de paridad no tiene faltantes: toda acción de pantalla de CPQ tiene herramienta MCP o excepción con motivo (aprobar margen).
- **CA18.** El cotizador muestra el costo por categoría y los subtotales de directos e indirectos. En una cotización de 1.0 recalculada en 2.0, cada categoría cuadra con el desglose de 1.0.
- **CA19.** Un ítem del catálogo con rateo «12 meses» entra a la cotización con ese rateo. Cambiarlo en la línea a «plazo del contrato» recalcula la línea, sin tocar el catálogo ni otras cotizaciones.
- **CA20.** La póliza de garantía, la RC y el costo financiero parten de los valores del tenant y se editan en la cotización con su detalle. El precio resultante cuadra con R33.
- **CA21.** La configuración del CPQ tiene exactamente 3 pestañas: Catálogo, Pólizas y finanzas, y Márgenes. Un usuario sin `cpq:modelo.manage` no la ve.
- **CA22.** Con la RC «activada por defecto» y la póliza de garantía no, una cotización nueva parte así. Desactivar la RC en la cotización la marca «sobrescrito» y la saca del precio; «volver al valor por defecto» la reactiva con los valores del tenant. Cambiar el plazo de la RC a «plazo del contrato» recalcula su efecto mensual.
- **CA23.** Un owner agrega la categoría «Tecnología» como indirecta, renombra «Logística» y desactiva «Insumos». Desactivar no cambia los ítems ni las cotizaciones existentes, y una categoría en uso no se puede borrar.

## 14. Preguntas para Carlos — decididas

**Decisión de Carlos, 29-oct-2026 (PR #123, CAR-66): aprueba las 15 preguntas tal como vienen recomendadas**, con un ajuste en la 9 (el margen solo con `cpq:costos.ver`). Cada pregunta conserva su texto como historia; «Decidido» marca la opción aprobada. Lo ya respondido en `PREGUNTAS-carlos.md` (4–11) y en ADR-048 (respuesta 3) no se repite.

### A. Las 8 preguntas de la Page de CPQ (reconstruidas; ver la nota del inicio)

> Si la Page de CPQ aparece y trae una pregunta que no está aquí, se agrega como pregunta nueva sin reabrir estas.

1. **¿De dónde sale el sueldo de una línea de puesto en una instalación nueva**, que todavía no tiene capa de sueldo? (a) un **sueldo de referencia para cotizar** por cargo, variable del modelo del tenant, que se puede cambiar en la línea; (b) se escribe siempre a mano; (c) se copia de la instalación más parecida. **Decidido (Carlos, 29-oct): (a).** No es una capa de sueldo (ADR-036 sacó al cargo de las capas): es un supuesto de venta, visible en la línea y en el plan del agente. **Y para R2 y R3:** ¿el sueldo de referencia cuenta como «sueldo cotizado» (el puesto nace con ese sueldo y RRHH lo confirma) o como «sin sueldo» (el puesto toma el de la instalación)? **Decidido (Carlos, 29-oct): cuenta como sueldo cotizado**, porque es el precio que se vendió; RRHH lo ve marcado como «referencia del cargo» al confirmar y puede cambiarlo. Si prefieres lo contrario, R3 se aplica a toda línea con sueldo de referencia.
2. **¿Cómo se manejan las «Opción A/B/C» de un mismo negocio** (hoy son cotizaciones sueltas en 1.0, p. ej. CPQ-2026-307/308/309)? (a) **cotizaciones hermanas marcadas como alternativas**, comparables lado a lado, con una vigente y enviables juntas; (b) opciones dentro de una sola cotización. **Decidido (Carlos, 29-oct): (a).** Cada opción tiene su propio precio, margen y aprobación, y al ganar queda clara cuál se aceptó; (b) mezcla precios en un mismo documento y complica las versiones.
3. **¿Lo común a varias instalaciones** (supervisor, vehículo de ronda) se prorratea? (a) **sección Común propia, y el precio por instalación con prorrateo es solo una opción de presentación** (por posiciones); (b) se reparte siempre en las instalaciones. **Decidido (Carlos, 29-oct): (a).** El costo real es uno; algunos clientes piden precio por sitio y otros no. Cómo se muestra lo decide CAR-68.
4. **¿En qué moneda se presenta?** **[decidido, ADR-042 (7)]:** la UF del día se congela al enviar. Resuelto el 29-oct: la moneda de presentación por defecto. **Decidido (Carlos, 29-oct):** cálculo siempre en CLP enteros y **presentación en UF por defecto** para Gard (todas sus cotizaciones de 1.0 están en UF), configurable por tenant y por cotización.
5. **¿Puede aprobar quien pidió la aprobación?** **[decidido, ADR-042 (5) y (7)]:** aprueban owner o admin con `cpq:aprobar`, no el gerente; el precio manual pide aprobación solo si queda bajo el mínimo. Resuelto el 29-oct: la auto-aprobación. **Decidido (Carlos, 29-oct): no**, salvo que el tenant tenga una sola persona con `cpq:aprobar` (queda marcado en la auditoría), porque una aprobación propia no es control (R42).
6. **¿Qué pasa con los borradores cuando se publica un modelo nuevo?** **[decidido, ADR-042 (1)]:** publicar no mueve cotizaciones existentes. Resuelto el 29-oct: si además se avisa. **Decidido (Carlos, 29-oct):** el borrador muestra «hay un modelo nuevo» con la diferencia, y actualizar es una acción explícita que la persona elige (R27).
7. **¿La cotización rápida se puede hacer desde el teléfono?** ADR-042 (9) dejó la edición completa en iPad y escritorio y en el celular solo ver, comparar y aprobar. **Decidido (Carlos, 29-oct): sí**, solo la rápida (cuenta, negocio o «crear», instalación, paquetes y margen), porque el vendedor en terreno la necesita y no toca la planilla.
8. **¿Hasta dónde llega el agente en CPQ?** **Decidido (Carlos, 29-oct):** crea y ajusta borradores, simula, explica, compara, versiona y pide aprobación, siempre con plan confirmado (ADR-049); **nunca aprueba márgenes** (capacidad solo de personas); **enviar**, **confirmar puestos** y **publicar el modelo** los prepara y quedan en la cola de aprobación humana (R51). La aprobación de margen es justamente el control humano sobre lo que propone un agente.

### B. Preguntas nuevas de esta especificación

9. **¿Quién ve costos y margen?** **Decidido (Carlos, 29-oct, con ajuste a la recomendación):** permiso nuevo `cpq:costos.ver` para owner, admin y gerente. **El margen en porcentaje y el costo solo los ve quien tiene `cpq:costos.ver`.** Sin ese permiso no se ve ni el margen (tampoco «sobre o bajo el mínimo») ni el costo: solo venta, estado y vencimiento. La regla se aplica **en el servidor**: las capacidades no devuelven costo, margen ni sueldos a quien no tiene el permiso, así que vale igual en pantalla, `/api/v1` y MCP. El gerente no ve el sueldo de las capas del núcleo (R20) mientras tenga denegada la lectura de estructuras sensibles.
10. **¿Validez por defecto y vencimiento?** **Decidido (Carlos, 29-oct):** 30 días, ajuste del tenant; vencimiento automático diario y aviso 3 días antes. El seguimiento que se hace con esos avisos es de CAR-67.
11. **¿Cotizaciones abiertas de 1.0 durante la convivencia?** **Decidido (Carlos, 29-oct):** se importan de solo lectura (R53) y se **continúan** en 2.0 como versión nueva recalculada, mostrando la diferencia; no se editan en 1.0 después del corte. Evita dos precios vivos del mismo negocio.
12. **¿«Al peso» es exacto?** **Decidido (Carlos, 29-oct):** exacto en la venta mensual final redondeada; si una diferencia de $ 1 viene del redondeo en coma flotante de 1.0, se documenta caso a caso y tú la aceptas. 1.0 calcula en floats (P15) y 2.0 en enteros.
13. **¿Las mejoras de la plantilla de la vertical llegan solas?** **Decidido (Carlos, 29-oct): nunca solas**; se ofrecen con sus diferencias y el tenant las adopta en un borrador (R7). El modelo es del tenant.
14. **¿Confirmas estas cinco cotizaciones de 1.0 como casos dorados?** (Preselección de Claude, 29-oct-2026, lectura de 1.0 por MCP; respuesta (c) de la pregunta 4 de `PREGUNTAS-carlos.md`.)
    1. **CPQ-2026-340**: póliza de garantía y costo financiero, 6 líneas (incluido supervisor 5x2), vehículo, colación, exámenes, movilización no imponible, **margen 10 %, justo en el mínimo** (detalle verificado).
    2. **CPQ-2026-360**: vehículos y equipamiento (camionetas y enlace satelital).
    3. **CPQ-2026-353**: horario mixto (nocturno L–V + 24 h fin de semana).
    4. **CPQ-2026-298**: sin guardias (solo suministros), que prueba R4.
    5. **CPQ-2026-321**: el caso base de Gard, 1 posición 24/7 4x4 (el mismo precio aparece en otras cuatro cotizaciones de 2026).

    **Varias instalaciones:** en 1.0 una cotización es una instalación (P4), así que no hay un caso real de una sola cotización con varias. Se agrega un **caso compuesto**: una cotización 2.0 con dos secciones (las instalaciones de la 340 y la 353, con condiciones comunes) cuya venta se compara con la suma de las dos de 1.0, con la diferencia que explique la RC en monto fijo. **Decidido (Carlos, 29-oct): sí** a las cinco y al compuesto. Cubren póliza, margen en el mínimo, vehículos, horarios raros, el caso sin guardias y el caso más frecuente. Salvo la 340, se eligieron por su nombre: el Brief 08 verifica el detalle de cada una y te avisa si alguna no sirve.
15. **¿Se pueden sobrescribir las personas por posición?** **[decidido, ADR-042 (4)]:** el motor las calcula con el dominio de turnos. Resuelto el 29-oct: si se pueden cambiar a mano. **Decidido (Carlos, 29-oct): sí, con motivo** (relevo de colación, cobertura de vacaciones), visible en la traza (R21). En 1.0 se escriben siempre a mano (`numGuards`) y es una fuente de error.

## 15. Lo que toca a temas hermanos (no se resuelve aquí)

- **CAR-67 · Seguimiento.** CPQ entrega los hechos: `enviada` (fecha), `por_vencer`, `vencida`, `aceptada`, `rechazada`, y el valor mensual en el negocio. La cadencia de seguimiento después del envío (Comercial R29, `extraccion` §3.6), las alertas de negociación y el «proponer perdido» son de CAR-67. Pregunta para allá: si la apertura del enlace o del PDF por el cliente es un evento de seguimiento.
- **CAR-68 · Formatos de salida.** CPQ entrega la **vista cliente** (líneas visibles, grupos, ítems «incluye», condiciones, alternativas, versión) y la traza interna. El PDF de propuesta con plantillas de Documentos y marca del tenant, las secciones redactadas (en 1.0, 12 secciones de propuesta asistida por IA en licitaciones), el enlace para compartir, la exportación a planilla, el precio por instalación con prorrateo (pregunta 3) y la aceptación desde el Portal Cliente (fase 3) son de CAR-68. `cpq_cotizaciones_enviar` recibe el formato elegido allí.

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
| 25-oct-2026 23:10 | Borrador con la regla de puestos y sueldos al ganar (respuesta 3 de Carlos a ADR-048; CAR-10) | — (decisión de Carlos 23:08–23:10) |
| 29-oct-2026 | Instrumentos financieros por cotización (activar o desactivar, editar, plazo de RC, «sobrescrito», volver al valor por defecto, «activado por defecto» en Configuración) y categorías editables por tenant (R60, R61, CA22, CA23) | Carlos |
| 29-oct-2026 | Ajustes de alcance de Carlos tras la primera tanda de Claude Design (R55–R59): resumen por categoría directos/indirectos, catálogo con costo unitario y rateo sobrescribible por línea, pólizas y costo financiero con detalle, configuración en 3 pestañas (Catálogo, Pólizas y finanzas, Márgenes); valores por cuenta e instalación y editor de fórmulas fuera de la v1 | Carlos |
| 29-oct-2026 | Carlos decide las 15 preguntas del §14 tal como venían recomendadas; ajuste en la 9: margen y costo solo con `cpq:costos.ver`, también en servidor y MCP (PR #123) | Carlos |
| 29-oct-2026 | Especificación completa (CAR-66): modelo y plantilla por vertical, catálogo, secciones por instalación, cálculo con traza, margen financiero de 1.0, casos dorados, versiones y aprobación, cotización rápida, agente y MCP; 8 preguntas de la Page **reconstruidas** y 7 nuevas; notas para CAR-67 y CAR-68; Design Prompt aparte. R1–R5 sin cambios | — (pendiente de aprobación) |
