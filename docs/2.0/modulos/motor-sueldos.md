# Motor de sueldos — Especificación funcional (servicio del Núcleo)

**Estado:** **aprobada por Carlos el 29-oct-2026** (ADR-047; decisiones en §16; registrada en ADR-056) · **Fase:** Brief 07e, entre Puestos (Brief 11) y el Motor CPQ (Brief 08), ver §15 · **Insumos:** ADR-021, ADR-036 (capas de sueldo, 25-oct), ADR-042 (punto 4), ADR-047, ADR-048, ADR-049, ADR-053, ADR-055; `briefs/BRIEF-07b-capas-sueldo-anexo.md`; `modulos/cpq.md`; `extraccion/comercial-y-cpq.md` §3.8–3.9; payroll de OPAI 1.0 (`Cryptobal/opai`, ver §11) · **Autor:** Claude · **Tarea:** CAR-71 · **Design Prompt:** [`design/DESIGN-PROMPT-motor-sueldos.md`](../design/DESIGN-PROMPT-motor-sueldos.md)

> Lenguaje de negocio, sin código. **`extraccion/nomina.md` no existe en `main`** (verificado el 29-oct-2026 sobre `671899d`; ROADMAP fase 6 dice «extracción hecha fuera del repo, sin verificar»). Por eso la referencia de 1.0 es su código de payroll leído directamente (§11, commit citado), no una extracción aprobada.

## 1. Objetivo

Hoy el paso de **sueldo bruto a costo empresa** está previsto dentro de Nómina (Brief 25, fase 6), pero el CPQ lo necesita antes para cotizar. Este servicio del Núcleo lo adelanta y lo deja **único** para todos:

- **Un solo cálculo** de costo empresa (por persona, puesto, día y hora) que usan el CPQ, Nómina, Finanzas (flujo de caja) y los agentes, con el mismo resultado al peso.
- **Indicadores legales al día solos** (UF, UTM, ingreso mínimo, topes, AFP, SIS, cesantía, mutual, reforma de pensiones, gratificación, impuesto único), con fuente, registro de cada captura y alerta si la fuente falla o el valor es raro.
- **Variables propias de cada tenant** (supuestos de costeo, cotización adicional de su mutual, jornada, personalizadas) editables con vigencia, aprobación y auditoría.
- **Todo versionado por vigencia**: una cotización o una simulación de hace dos años se recalcula igual (ADR-021).

**Cómo se nota que funciona:** (1) los casos dorados de §13 cuadran al peso con 1.0 o con la diferencia explicada; (2) ninguna cotización se envía con un indicador atrasado sin que el vendedor lo vea; (3) cero cargas manuales de UF/UTM en el mes (hoy en 1.0 dependen de un tercero no oficial, §11).

## 2. Entidades y relaciones

| Entidad | Qué es | Se relaciona con | Dónde vive |
|---|---|---|---|
| **Indicador legal** | Catálogo cerrado de lo que fija la ley o un organismo: clave, nombre, unidad (CLP, UF, UTM, %, horas), periodicidad (diaria, mensual, anual, por ley), **fuente oficial** y fuente de contraste, regla de validación (rango y variación máxima) | Valores publicados y valores del tenant | Núcleo, nivel plataforma (el catálogo es el mismo para todos) |
| **Valor publicado** | Lo que OPAI leyó de la fuente oficial, con vigencia, evidencia (enlace a la norma o documento) y resultado de la validación (R7) | Indicador; capturas | Núcleo, plataforma (captura compartida, solo lectura para los tenants) |
| **Valor del tenant** | El valor que **rige en cada empresa**, con vigencia, origen (`sigue_fuente` o `propio`), estado (`propuesto`, `vigente`, `retenido`, `rechazado`), motivo y quién lo confirmó (persona o agente vía persona) | Indicador; valor publicado | Núcleo, con `tenant_id` y RLS (decisión 4 de Carlos: cada empresa ve y edita todos sus valores) |
| **Captura** | Cada intento del trabajo diario de actualización: fuente, resultado, valor leído, diferencia con el vigente, alerta emitida | Indicador | Núcleo, plataforma (append-only) |
| **Variable del tenant** | Supuesto propio: clave, nombre, unidad, ámbito (empresa; instalación solo para las que lo declaren), valor por defecto de la plantilla de la vertical | Valores de la variable | Núcleo, con `tenant_id` y RLS |
| **Valor de variable** | Valor con vigencia, motivo, adjunto opcional, estado (`programado`, `pendiente_aprobacion`, `vigente`, `rechazado`), autor (persona o agente vía persona) | Variable; auditoría | Núcleo, con `tenant_id` |
| **Juego de valores** | La «foto» de todos los indicadores y variables que rigen en una fecha, con su huella; lo que guarda quien calcula | Cotización (CPQ), liquidación (Nómina), simulación | Se calcula; quien lo usa guarda su identificador y huella |
| **Simulación** | Entrada (sueldo o capa, contrato, patrón, horario, fecha) y resultado con traza; se guarda solo si el usuario lo pide | Capas de sueldo (ADR-036), patrones del tenant (`modulos/operaciones.md`) | Núcleo, con `tenant_id` |

**Aislamiento:** las tablas de plataforma (catálogo de indicadores, valores publicados y capturas) no tienen `tenant_id`: son datos públicos de la ley, de solo lectura para `opai_app`, y las escribe solo el trabajo de captura. Todo lo del tenant (valores del tenant, variables, valores de variable, simulaciones guardadas) lleva `tenant_id`, RLS con la política `tenant_isolation` y acceso solo por `forTenant`/`enTransaccion` (ADR-002, AGENTS.md). Un tenant nunca modifica lo publicado ni lo que rige en otro tenant.

Relaciones: indicador 1–N valores; variable 1–N valores; una simulación o una línea de cotización referencia **un juego de valores** (por fecha y huella) y **una capa de sueldo** (o un sueldo ingresado a mano). Las capas siguen siendo las de ADR-036 (instalación, puesto, RUT; rige una sola, sin herencia): el motor no las cambia, las **lee**.

## 3. Pantallas y pestañas

| Pantalla | Ruta | Portal | Patrón | Entrada |
|---|---|---|---|---|
| Remuneraciones: **todos los valores en una sola página** (indicadores legales y variables de la empresa) | `/configuracion/remuneraciones` | ERP | Lista agrupada por sección + ficha en `SplitScreen` + hoja «Cambiar valor» | Configuración → ámbito **Remuneraciones** (nuevo, ADR-018), pestaña 1 (decisión 4) |
| Historial | `/configuracion/remuneraciones/historial` | ERP | Timeline | Misma, pestaña 2 |
| Simulador de costo | `/cargos/simular` (y hoja desde Cargos y sueldos) | ERP | Formulario + resumen fijo | Personas → Cargos y sueldos (acción); ⌘K |
| Fuentes (plataforma) | `/platform/indicadores` | Plataforma | Estado de las fuentes y alertas (solo lectura) | Portal de plataforma |
| Avisos | Bandeja de Inicio y `AvisoRecalculo` en CPQ | ERP | Ítems de bandeja | — |

Configuración → Remuneraciones es un catálogo del Núcleo, como «catálogos (embudo, etiquetas)» en `NAVEGACION.md` §2: no es una página de configuración de un módulo (ADR-018). Sus escrituras son capacidades propias (§9), no `core.config.set`. No hay segunda firma (decisiones 4 y 5).

Celular: ver indicadores, simular un escenario y **aprobar o rechazar** propuestas (en la Bandeja). Editar variables y comparar escenarios en paralelo: iPad y escritorio (DISENO.md §4). Detalle visual en el Design Prompt.

## 4. Campos y validaciones

**Valor del tenant para un indicador legal**

| Campo | Tipo | Obligatorio | Validación | Quién lo edita |
|---|---|---|---|---|
| Valor | entero escalado (CLP entero; UF con 2 decimales; % con `PCT_ESCALA`) | Sí | Rango del indicador y variación máxima respecto del anterior (R7) | Trabajo automático (si sigue la fuente) u owner, admin o rol con `core:remuneraciones.manage` |
| Vigente desde / hasta | fecha | Desde, sí | Sin solapes por indicador y tenant; hasta abierto | Ídem |
| Motivo | texto | Sí si es propio | ≥ 10 caracteres | Ídem |
| Evidencia | enlace o documento | No (recomendada si es propio) | URL o documento en `core.documentos` | Ídem |
| Origen | `sigue_fuente` \| `propio` | Sí | Volver a `sigue_fuente` es una acción explícita | Sistema / persona con permiso |

**Valor de variable del tenant**

| Campo | Tipo | Obligatorio | Validación | Quién lo edita |
|---|---|---|---|---|
| Valor | según unidad de la variable | Sí | Rango declarado por la variable (por ejemplo, mutual adicional de 0 % al máximo del DS 67; el tope exacto, *por verificar*) | Owner, admin o rol con `core:remuneraciones.manage` |
| Vigente desde | fecha | Sí | Hoy o futuro; pasado solo con `core:remuneraciones.retroactivo` y motivo (R12) | Ídem |
| Motivo | texto | Sí | ≥ 10 caracteres | Ídem |
| Adjunto | documento | No | Va por `core.documentos` (ADR-019) | Ídem |

Montos: CLP en enteros, nunca float (REGLAS-codigo); tope por concepto de 100.000.000 CLP (ADR-053).

## 5. Reglas de negocio

### 5.1 Indicadores legales

- **R1. Catálogo y fuente.** Cada indicador tiene una fuente oficial primaria y una de contraste. Fuentes propuestas (benchmark §14; **ninguna página pudo abrirse desde la sesión: verificar antes del brief**):

| Indicador | Fuente primaria | Contraste | Periodicidad | ¿Lectura automática? |
|---|---|---|---|---|
| UF | Banco Central, API BDE (requiere cuenta y token) | SII, tabla UF del año | Diaria (se conoce por adelantado) | Sí (API) |
| UTM | Banco Central, API BDE | SII, tabla UTM | Mensual | Sí (API) |
| Ingreso mínimo mensual | Ley publicada en el Diario Oficial (hoy, según el buscador, Ley 21.830: $553.553 desde el 1-may-2026, publicada el 22-jun-2026 con efecto retroactivo; coincide con el valor de 1.0; *por verificar* en el texto) | Dirección del Trabajo | Por ley | Desde CAR-183 se lee de Previred y lo aprueba un owner de plataforma; el caso retroactivo (Ley 21.830) y la ley como fuente primaria los confirma una persona del tenant (R5) |
| Topes imponibles (AFP/salud/Ley 16.744 y seguro de cesantía) | Superintendencia de Pensiones (2026: 90,0 UF y 135,2 UF desde el 1-feb-2026, iguales a 1.0; que la Res. Ex. 237 reemplazó a la 27 viene del buscador, *por verificar*) | Previred, indicadores del mes | Anual, con correcciones | Semiautomática: se lee y se confirma |
| Comisión por AFP | Superintendencia de Pensiones | Previred | Cambia por AFP | Semiautomática |
| SIS | Superintendencia de Pensiones | Previred | Por licitación | Semiautomática |
| Cotización adicional del empleador (Ley 21.735) | Ley 21.735, art. transitorio (1 % desde ago-2025 y 3,5 % desde ago-2026, iguales a 1.0; 4,25 % desde ago-2027 y la escala hasta 8,5 %, *por verificar*) | Superintendencia de Pensiones | Cada agosto | Calendario cargado por adelantado (R4) |
| Seguro de cesantía (empleador 2,4 % indefinido, 3 % plazo fijo; trabajador 0,6 %) | Ley 19.728 | AFC / Dirección del Trabajo | Por ley | Desde CAR-183 se lee de Previred (AFC) y lo aprueba un owner de plataforma; el resto lo confirma una persona del tenant (R5) |
| Cotización básica Ley 16.744 (0,90 %; 1.0 usa 0,93 %, que podría ser la básica más la extraordinaria de 0,03 % (Ley SANNA), *por verificar*) | Ley 16.744 / SUSESO | ISL | Por ley | OPAI lo publica como propuesto con la norma; lo confirma una persona del tenant (R5) |
| Tope de gratificación (4,75 IMM al año) | Código del Trabajo art. 50 | Dirección del Trabajo | Sigue al IMM | Derivado (no se carga) |
| Jornada legal semanal (44 → 42 h el 26-abr-2026 → 40 h el 26-abr-2028) | Ley 21.561 | Mintrab | Por tramos | Calendario por adelantado (R4) |
| Tramos del impuesto único (en UTM) | SII | — | Por ley | Manual; el monto en CLP se deriva de la UTM |

- **R2. Actualización automática.** Un trabajo diario del Núcleo (ADR-029: el cron encola, el trabajo hace) consulta cada fuente automática, compara con el valor publicado y: si es igual, registra la captura; si es nuevo y pasa la validación (R7), lo publica y queda **vigente en cada tenant que sigue la fuente** (lo audita «OPAI · actualización automática»); si no pasa, lo publica como **retenido** y alerta (R6). Toda captura queda registrada (R3), haya o no cambio.
- **R3. Registro de cada actualización.** Cada captura guarda: fecha y hora del servidor, fuente consultada, valor leído, valor vigente, diferencia, resultado y alerta emitida. Es append-only: una corrección es un valor nuevo, nunca una sobreescritura (como ADR-023 para hechos regulados).
- **R4. Valores futuros conocidos.** Lo que la ley ya fijó a futuro (calendario de la reforma de pensiones, tramos de la jornada de 40 horas, UF ya publicada) se carga por adelantado como valores con vigencia futura. Así una cotización de 12 meses puede mostrar el costo que viene.
- **R5. Confirma una persona, sin segunda firma** (decisión 4 de Carlos, 29-oct-2026). Lo que no tiene fuente legible por máquina (ingreso mínimo, tasas por ley, topes) OPAI lo publica como **propuesto**, con el enlace a la norma. En cada empresa lo confirma **una sola persona**: el owner, un administrador o alguien en quien deleguen (rol con `core:remuneraciones.manage`). Esa misma persona puede escribir cualquier valor a mano. Se admite **vigencia retroactiva**: caso real, la Ley 21.830 subió el IMM el 22-jun con efecto desde el 1-may; el efecto se describe en R16 y R24.
  - **Adenda 3-nov-2026 (CAR-183):** los indicadores que sí tienen fuente legible (ingreso mínimo, topes, AFP, SIS, cesantía; Previred) los captura el trabajo `core.remuneraciones.captura_previsional`, que solo **propone**; el cambio lo aprueba una persona **owner de plataforma** en Plataforma → Valores legales y rige para todas las empresas desde su vigencia (solo hacia adelante: la vigencia retroactiva sigue por la confirmación del tenant). Reforma, mutual, jornada e impuesto no se leen de Previred.
- **R6. Alertas.** Se emiten eventos del Núcleo `core.remuneraciones.fuente_fallida` (la fuente no responde o responde algo ilegible durante más de N horas, ajuste de plataforma), `core.remuneraciones.valor_anomalo` (valor retenido) y `core.remuneraciones.indicador_atrasado` (el valor que rige debió renovarse y no se renovó: por ejemplo, UTM del mes nuevo). Llegan siempre a Plataforma, que vigila las fuentes, y a quienes confirman en cada tenant, en la Bandeja de Inicio, cuando hay algo que confirmar o el atraso afecta sus cálculos. Correo y otros canales: silencio por defecto, configurables (ADR-020).
- **R7. Valor anómalo.** Se retiene si sale del rango del indicador o si su variación supera la máxima declarada (propuesta: UF ±1 % diario; UTM ±3 % mensual; tasas ±20 % relativo; IMM solo baja con alerta). Mientras está retenido, en cada tenant rige el último valor vigente y los cálculos muestran «valor en revisión». La persona que confirma en el tenant lo acepta o lo rechaza (R5).
- **R8. Sin fuente no hay invento.** Si falta un indicador para la fecha pedida (por ejemplo, UF de mañana no publicada), el cálculo usa el último valor vigente **y lo dice** en la traza («UF del 29-10-2026; la de la fecha pedida aún no se publica»). Si no existe ningún valor, el cálculo se bloquea con un error que nombra lo que falta.
- **R9. mindicador.cl no es fuente de verdad** (no es oficial ni tiene compromiso de servicio); se puede usar solo como tercer contraste. Previred se usa como contraste de tasas y topes, no como única fuente (solo publica PDF y HTML).

### 5.2 Variables del tenant

- **R10. Plantilla por vertical, copiada al tenant.** Al activar el servicio (o CPQ o Nómina), el tenant recibe una copia de la plantilla de su vertical (ADR-021; ADR-042 punto 5): AFP para cotizar, salud para cotizar (Fonasa 7 % o plan en UF), base y forma de las provisiones de vacaciones e indemnización (R17, paso 5), cotización adicional de la mutual o ISL (la notifica su organismo cada dos años, DS 67), jornada semanal por defecto, modalidad de gratificación por defecto, días de feriado al año y colchón de feriados (12 y 10 % en 1.0, `extraccion/comercial-y-cpq.md` §3.8). Nada global se consulta al calcular, salvo los indicadores legales.
- **R11. Personalizadas.** El tenant puede crear variables propias (por ejemplo, «bono de asistencia promedio»), con unidad y rango. Las usan las fórmulas del modelo de costeo de CPQ (ADR-042) y las estructuras.
- **R12. Siempre con vigencia y motivo.** Un cambio se **programa** con «vigente desde» (hoy o futuro), motivo y adjunto opcional; nunca se pisa el valor anterior. El pasado solo con un permiso aparte y queda marcado como retroactivo (efecto en R16).
- **R13. Vista previa de impacto obligatoria.** Antes de confirmar, la pantalla, la API y el MCP devuelven el impacto (`dryRun`). El Núcleo calcula el de las capas de sueldo cuyo costo cambia. Cada módulo activo que guarda juegos de valores (CPQ con sus cotizaciones abiertas; Nómina, más adelante) aporta el suyo por un **contrato del Núcleo** («proveedor de impacto», tipo en `packages/domain`), como las fuentes opcionales de ADR-048 punto 2. El Núcleo nunca lee tablas de CPQ: sin CPQ activo, el impacto muestra solo las capas.
- **R14. Sin segunda firma** (decisión 5 de Carlos). El cambio de una persona con permiso (owner, admin o rol con `core:remuneraciones.manage`) se aplica directo, con su vista previa y su auditoría. El cambio de un agente sigue la **autonomía que el tenant le dio a su key** (ADR-034, ADR-049). Por defecto va a la **cola de aprobaciones del Núcleo** (Bandeja y Configuración → Aprobaciones), que es la única cola. Todo cambio queda en `core.audit_events`.
- **R15. Todos los valores se ven y se editan en una sola página** (decisión 4). La UF, la UTM, el IMM, las tasas, los topes y las variables propias están en Configuración → Remuneraciones. Por defecto, cada indicador **sigue la fuente** (R2). Si una persona con permiso lo cambia a mano, el valor pasa a ser **propio** de la empresa y deja de seguir la fuente: el cambio lleva vigencia, motivo y auditoría, y la página lo marca con «Propio» y lo compara con el valor publicado. «Volver a seguir la fuente» es una acción explícita. Un agente puede hacer lo mismo por el MCP, según R14.

### 5.3 Cálculo

- **R16. Un solo motor, puro y determinista.** El cálculo vive en el dominio (sin base de datos) y recibe: el sueldo (capa ADR-036 o a mano), el contrato, el patrón y horario, y un **juego de valores**. Devuelve el resultado y la **traza** de cada monto. Mismo juego + misma entrada = mismo resultado, en el navegador (respuesta instantánea del cotizador, ADR-042 punto 9) y en el servidor (autoridad).
- **R17. Pasos del costo empresa por persona** (detalle con los valores de 1.0 en §11):
  1. **Haberes imponibles:** sueldo base + gratificación (legal del art. 50: 25 % con tope 4,75 IMM anual, prorrateado al mes; o monto fijo; o ninguna) + bonos imponibles. 1.0 calcula el 25 % sobre el sueldo base solo; si los bonos imponibles entran en la base queda como regla del brief, verificada con la DT.
  2. **No imponibles:** colación, movilización y bonos no imponibles (sin monto legal; deben ser razonables, art. 41 del Código del Trabajo). El CPQ los costea con los montos de la capa **cuando la cotización los incluye** (decisión 16).
  3. **Bases con tope:** imponible para AFP/salud/Ley 16.744 con tope en UF; imponible para cesantía con su tope.
  4. **Aportes del empleador:** SIS, seguro de cesantía según contrato, Ley 16.744 (básica + adicional del tenant), cotización adicional de la reforma (con su tramo vigente).
  5. **Provisiones, como las calculan finanzas y contabilidad** (decisión 14). Nunca se infla la base con colación, movilización ni aportes del empleador, como hace 1.0.
     - **Vacaciones:** la base es la remuneración del feriado (sueldo base y remuneraciones fijas, art. 71 del Código del Trabajo). Para el costo, el CPQ suma el **promedio mensual de los días de feriado al año**: la base diaria × los días de feriado del año (15 hábiles, más el progresivo si corresponde, convertidos a días corridos según el calendario) ÷ 12. La conversión a días corridos y el trato del progresivo se fijan en el brief con el contador de Gard.
     - **Indemnización por años de servicio:** la base es la última remuneración mensual con tope de 90 UF (art. 172). La provisión mensual es 1/12 de esa base, hasta 11 años (330 días, art. 163). Si el tenant provisiona con otra probabilidad, la fija en una variable propia.
     - El detalle contable (cuentas y ajuste por rotación) lo valida contabilidad en el brief.
  6. **Costo empresa mensual** = haberes + no imponibles + aportes + provisiones.
  7. **Líquido estimado** (solo informativo): menos AFP (10 % + comisión), salud, cesantía del trabajador e impuesto único, sin descuentos personales.
- **R18. Costo por turno.** Desde el patrón del catálogo del tenant (`modulos/operaciones.md`; 4x4, 5x2, 7x7, 14x14, 2x5, 3x4 de fábrica) y el horario:
  - **Personas por puesto** (1 puesto = 1 posición, ADR-036): para cubrir la posición todos los días del ciclo, personas = (días de trabajo + días de descanso) / días de trabajo (4x4 → 2; 7x7 → 2; 14x14 → 2); para una posición que no se cubre todos los días (5x2 de lunes a viernes), 1. El cotizador puede sobrescribir con motivo.
  - **Horas semanales promedio** = horas del turno × días de trabajo × 7 / (días de trabajo + descanso). Ejemplo: 4x4 de 12 h = 42 h (justo la jornada legal desde el 26-abr-2026). Si superan la jornada vigente, el resultado avisa y propone horas extra (R19).
  - **Costo del puesto/mes** = costo empresa por persona × personas por puesto (+ ajuste de feriados, fórmula del modelo de CPQ).
  - **Costo por día** = costo del puesto / días del mes del cálculo (30 por defecto, ajuste); **por hora** = costo del puesto / horas cubiertas en el mes.
- **R19. Horas extra: fórmula legal con la jornada pactada** (decisión 15). Valor de la hora = sueldo base ÷ 30 × 28 ÷ (4 × jornada semanal pactada), con el recargo legal mínimo de 50 % (art. 32; la base es el IMM si el sueldo es menor). Con 42 h, una hora extra vale 0,008333 × sueldo base. **1.0 usa base/30/8 × 1,5 (0,00625 × base)**; esa fórmula no se porta.
- **R20. Jornada parcial.** Si la jornada pactada es ≤ 30 h (art. 40 bis), el sueldo base mínimo es el IMM proporcional (caso real de Gard: $237.237 = $553.553 × 18/42).
- **R20b. Sueldo base atado al ingreso mínimo.** Una capa puede declarar su sueldo base como «igual al ingreso mínimo» (o a una fracción por jornada parcial) en vez de un monto. Al subir el IMM, el costo se recalcula solo y RRHH recibe la lista de capas afectadas para generar los anexos de contrato (ADR-036 punto 5; el anexo lo aprueba RRHH). Caso real: la mayoría de los puestos de Gard en 1.0 tiene base $553.553 = IMM vigente, y $237.237 = IMM × 18/42.
- **R20c. Contadores para el finiquito (en Nómina).** Nómina lleva por cada trabajador un **contador acumulado de vacaciones** (días ganados, tomados y saldo) y otro de **indemnización por años de servicio** (años y base acumulada con sus topes), para calcular el finiquito (decisión 14). El motor entrega la regla del cálculo; el contador y su historia viven en Nómina (§15).
- **R21. La capa que rigió y el juego de valores se guardan.** Toda liquidación, cotización o simulación guardada registra la capa de sueldo usada (ADR-036 punto 6) y el juego de valores (fecha + huella), para reproducirla años después.

### 5.4 Efecto en cotizaciones (contrato con CPQ)

Estas reglas las implementa **CPQ** como consumidor del evento `core.remuneraciones.valores_vigentes` (un valor de indicador o variable empezó a regir). El Núcleo no conoce las cotizaciones (ADR-048). Se dejan aquí para que el Brief 08/10 las tome tal cual.


- **R22. Cotizaciones abiertas** (`borrador`, `en_aprobacion`, `lista`; ADR-042 punto 7) guardan el juego de valores con que se calcularon. Cuando entra en vigencia un valor que las afecta:
  - en **`borrador`**: al abrirla se muestra `AvisoRecalculo` con lo que cambió y la diferencia; **no se recalcula sola**; el vendedor pulsa «Recalcular» (una acción, con `dryRun`);
  - en **`en_aprobacion` o `lista`**: además, recalcular la devuelve a `borrador` si cambia el precio o el margen efectivo cae bajo el mínimo (10 % en Gard, ADR-042), y vuelve a pedir aprobación si corresponde;
  - en las tres, la cotización **no puede enviarse** con valores que ya no rigen sin una confirmación explícita del vendedor («Enviar con los valores del 14-10-2026»), que queda auditada.
- **R23. Cotizaciones emitidas** (`enviada`, `aceptada`, `rechazada`, `vencida`, `reemplazada`) quedan **congeladas** con su juego de valores (ADR-042: «enviar congela la versión»). Nunca cambian. Si el cambio es relevante para una **aceptada** (por ejemplo, sube el IMM), el motor genera un **informe de impacto en contratos vigentes** para Comercial (insumo para el reajuste del contrato), sin tocar la cotización.
- **R24. Cómo se avisa al vendedor.** (a) `AvisoRecalculo` dentro de la cotización; (b) un ítem en la Bandeja de Inicio del responsable del negocio con la lista de sus cotizaciones abiertas afectadas («3 cotizaciones con valores desactualizados»); (c) el evento `cpq.cotizaciones.valores_desactualizados`, que emite CPQ, para el agente interno y los agentes externos; correo apagado por defecto (ADR-020). Un **valor retroactivo** (R5, R12) además marca la cotización con «cambio retroactivo» para que se vea en la comparación de versiones.
- **R25. UF vs CLP.** En cotizaciones en UF, el precio al cliente no cambia con la UF del día; cambia el **costo en CLP** y, por lo tanto, el margen: el aviso muestra el margen nuevo, no un precio nuevo.

### 5.5 Agentes

- **R26. Todo por capacidad y MCP** (ADR-004, ADR-055): consultar, simular, proponer, aprobar y rechazar existen por pantalla, `/api/v1` y MCP, con los mismos permisos, alcance y auditoría. El agente interno (ADR-049) los usa con la identidad del usuario.
- **R27. Agentes según la autonomía de su key** (decisiones 4 y 5). Un agente o el MCP puede cambiar cualquier valor del tenant (indicadores legales y variables), confirmar o rechazar un valor propuesto o retenido, y crear o anular variables, siempre con vista previa y auditoría. Por defecto todo eso va a la cola de aprobaciones del Núcleo (`APPROVAL_REQUIRED`). El tenant puede darle más autonomía a una key (ADR-034), salvo en el cambio retroactivo, que es **irreversible** y siempre pide aprobación humana. Plataforma no confirma valores: solo vigila las fuentes.
- **R28. Lecturas sensibles.** Simular con una capa de sueldo concreta revela montos de sueldo: exige `core:estructuras.read_sensible` (el permiso de montos de sueldo de ADR-016) y se audita como la lectura sensible ya existente (`core.estructuras.read_sensible`), sin duplicarla (NÚCLEO-H). Simular con un sueldo ingresado a mano no revela datos de personas y no se audita como sensible.

## 6. Estados y transiciones

| Desde | Hacia | Quién | Condición | Efecto | ¿Reversible? |
|---|---|---|---|---|---|
| (nuevo) | Valor del tenant `vigente` (sigue la fuente) | Trabajo automático | El valor publicado pasa la validación R7 | Rige desde su fecha; aviso a cotizaciones abiertas (R22) | Con otro valor nuevo |
| (nuevo) | `retenido` o `propuesto` | Trabajo automático | Falla R7, o la fuente no se lee por máquina | Alerta R6; rige el anterior | Sí (confirmar o rechazar) |
| `retenido` / `propuesto` | `vigente` | **Una** persona con `core:remuneraciones.manage`, o un agente según su autonomía | — | Igual que vigente | Con otro valor nuevo |
| `retenido` / `propuesto` | `rechazado` | Ídem | Motivo | Sigue el valor anterior | No (se escribe otro) |
| (cualquiera) | `vigente` propio | Persona con permiso (directo) o agente (según autonomía; por defecto, cola) | Vigencia y motivo | Deja de seguir la fuente | Sí: «Volver a seguir la fuente» |
| Valor de variable (nuevo) | `programado` | Persona con permiso | Vista previa revisada | Rige en su fecha | Sí, hasta que rija (anular) |
| (nuevo) | `pendiente_aprobacion` | Agente sin autonomía para ese cambio (el defecto), y siempre en un retroactivo | — | Cola de aprobaciones del Núcleo | Sí |
| `programado` | `anulado` | Persona con `core:remuneraciones.manage` (un agente lo propone) | Antes de su fecha de vigencia | No llega a regir; auditoría | No (se programa otro) |
| `pendiente_aprobacion` | `programado` / `rechazado` | Persona con `core:remuneraciones.aprobar`, desde la cola de aprobaciones | — | Auditoría | No (se crea otro) |
| `programado` | `vigente` | Sistema, al llegar la fecha | — | Aviso R22 | Con otro valor nuevo |

## 7. Permisos por rol y portal

| Acción | owner | admin | gerente | supervisor | viewer | Cliente | Trabajador | Agente |
|---|---|---|---|---|---|---|---|---|
| Ver todos los valores (indicadores y variables) | sí | sí | sí (consulta) | no | no | no | no | `core:remuneraciones.read` |
| Simular con sueldo a mano | sí | sí | sí | no | no | no | no | `core:remuneraciones.simular` |
| Simular con una capa (montos) | sí | sí | no (sin montos, NAVEGACION §5) | no | no | no | no | + `core:estructuras.read_sensible` |
| Cambiar cualquier valor (indicador legal o variable), crear o anular variables | sí | sí | no, salvo delegación (rol personalizado) | no | no | no | no | según la autonomía de su key; por defecto, cola de aprobaciones |
| Confirmar o rechazar un valor propuesto o retenido | sí (una persona basta) | sí | no, salvo delegación | no | no | no | no | ídem |
| Aprobar o rechazar lo que propuso un agente | sí | sí | no, salvo delegación | no | no | no | no | nunca |
| Cambio retroactivo | sí | sí | no, salvo delegación con `core:remuneraciones.retroactivo` | no | no | no | no | siempre a aprobación humana |
| Ver el estado de las fuentes (Plataforma) | solo `platformRole` | | | | | | | key `platform`, lectura |

Gerente, supervisor y viewer siguen `NAVEGACION.md` §5: en Configuración, el gerente solo consulta lo de sueldos, y supervisor y viewer ven solo sus preferencias. La delegación de la decisión 4 es un rol personalizado (Brief 07c) con `core:remuneraciones.manage`, al que se puede sumar `.aprobar` o `.retroactivo`.

Alcance de filas: no aplica a los valores, que son de la empresa; la simulación con capa respeta el alcance del supervisor (ADR-022) si en el futuro se le concede.

## 8. Eventos y notificaciones

| Evento | Cuándo | Quién se entera por defecto | Canal |
|---|---|---|---|
| `core.remuneraciones.valores_vigentes` | Empieza a regir un valor de indicador o de variable | Nadie (silencio, ADR-020); consumidores: CPQ (R22), Nómina | — |
| `core.remuneraciones.fuente_fallida` | Fuente sin respuesta más de N horas | Plataforma; quien confirma en el tenant si le afecta | Bandeja |
| `core.remuneraciones.valor_anomalo` | Valor retenido o propuesto por confirmar | Plataforma y quien confirma en cada tenant | Bandeja |
| `core.remuneraciones.indicador_atrasado` | Debió renovarse y no se renovó | Plataforma y admins del tenant | Bandeja |
| `core.remuneraciones.variable_propuesta` | Cambio pendiente de aprobación | Aprobadores del tenant | Bandeja |
| `core.remuneraciones.variable_programada` | Cambio confirmado | Autor | Bandeja |
| `cpq.cotizaciones.valores_desactualizados` (lo emite CPQ) | R22 | Responsable del negocio | Bandeja (correo apagado) |

## 9. Herramientas MCP

Toda acción de pantalla tiene su capacidad y su herramienta (ADR-055). El nombre de la herramienta MCP se deriva del id de la capacidad según la convención del registro; las escrituras también tienen su `preview_…`. Las herramientas quedan en la instantánea `herramientas-mcp.txt` y en `paridad/mcp-inventario.md` cuando se construyan.

| Capacidad | Qué hace | Tipo | Vista previa | Aprobación humana |
|---|---|---|---|---|
| `core.remuneraciones.indicadores.listar` | Indicadores vigentes en una fecha, con fuente, estado y vigencia | Lectura | — | — |
| `core.remuneraciones.indicadores.historial` | Historial de valores y capturas de un indicador | Lectura | — | — |
| `core.remuneraciones.variables.listar` | Variables del tenant con valor vigente y programados | Lectura | — | — |
| `core.remuneraciones.indicadores.cambiar` | Escribe el valor propio de la empresa para un indicador legal, con vigencia y motivo, o lo vuelve a «seguir la fuente» | Escritura (retroactivo: irreversible) | Sí | Según la autonomía de la key (por defecto, sí); retroactivo, siempre |
| `core.remuneraciones.indicadores.confirmar` / `.rechazar` | Confirma o rechaza un valor propuesto o retenido (una persona basta) | Escritura | Sí | Según la autonomía de la key (por defecto, sí) |
| `core.remuneraciones.costo.simular` | Costo empresa por persona, puesto, día y hora con traza, para un sueldo (o una capa), contrato, patrón, horario y fecha; hasta 3 escenarios | Lectura (auditada si usa capa, R28) | — | — |
| `core.remuneraciones.impacto.calcular` | Impacto de un juego de valores nuevo: capas del Núcleo y lo que aporten los módulos activos (R13) | Lectura | — | — |
| `core.remuneraciones.simulaciones.guardar` | Guarda una simulación con nombre | Escritura | Sí | No |
| `core.remuneraciones.simulaciones.exportar` | PDF de la simulación con la marca del tenant, en `core.documentos` | Escritura | Sí | No |
| `core.remuneraciones.variables.crear` | Crea una variable personalizada (R11) | Escritura | Sí | Según la autonomía de la key (por defecto, sí) |
| `core.remuneraciones.variables.programar` | Programa un valor con vigencia y motivo y devuelve el impacto | Escritura | Sí | Ídem (R27) |
| `core.remuneraciones.variables.anular` | Anula un valor programado antes de que rija | Escritura | Sí | Ídem |
| `platform.remuneraciones.fuentes.listar` | Estado de las fuentes, capturas y alertas (key `platform`) | Lectura | — | — |

Toda escritura acepta `dryRun` (en MCP, su `preview_…`) e `idempotencyKey` (AGENTS.md, «Paridad y escrituras»). «Copiar como línea de cotización» del simulador es una capacidad de CPQ (crear una línea desde una simulación) y se define en su brief; mientras CPQ no esté activo, el botón queda deshabilitado.

Aprobar o rechazar una propuesta se hace con la **capacidad existente de la cola de aprobaciones del Núcleo**, no con herramientas nuevas. La parte de CPQ (ver qué cotizaciones cambian y recalcularlas) son capacidades de CPQ y se definen en su brief.

**Flujo típico del agente interno:** «¿cuánto cuesta un guardia 4x4 de 12 horas con el sueldo de la instalación X?» → `core.remuneraciones.costo.simular` con la capa (si el usuario no tiene `core:estructuras.read_sensible`, ofrece simular con sueldo a mano) → muestra la traza. «Sube la mutual adicional a 1,7 % desde enero» → `preview_…` de `variables.programar` → muestra el impacto → `variables.programar` → con la autonomía por defecto se detiene en la cola de aprobaciones. «Confirma el IMM nuevo» → `preview_…` de `indicadores.confirmar` → muestra el valor publicado, la ley y el impacto → `indicadores.confirmar` → según la autonomía, rige o queda en la cola.

## 10. Integraciones

- **Banco Central (API BDE):** credencial **de plataforma** (no del tenant, porque el dato es público e igual para todos), en el almacén cifrado (ADR-027). Requiere que Carlos cree la cuenta y el token (decisión 3: la crea).
- **Superintendencia de Pensiones, SII y Previred:** lectura de páginas públicas con validación humana cuando no hay API (semiautomática).
- **Consumo medido** (ADR-031): cada captura y cada simulación se mide en `core.consumos`.

## 11. Mejoras respecto de 1.0 y lo que no se porta

Referencia: código de payroll de 1.0 leído en `Cryptobal/opai` `40d19a5` (solo lectura). Detalle con rutas en el anexo A.

| En 1.0 | En 2.0 | Por qué |
|---|---|---|
| UF y UTM desde la API de la CMF con respaldo en mindicador.cl, dos veces al día (`src/lib/fx-sync.ts:197-215`) | Banco Central como primaria, SII o CMF como contraste, mindicador.cl solo tercer contraste (R1, R9) | Fuente oficial, contraste y registro de cada captura |
| El motor de costo empleador vive en el módulo de payroll y CPQ lo llama | Servicio del Núcleo, puro y compartido por CPQ, Nómina y Finanzas (R16) | Un solo cálculo; CPQ no depende de Nómina (ADR-048) |
| Parámetros legales en un JSON global por versión; el motor usa la versión marcada «activa», **no la vigente en la fecha**, y se cargan a mano con un script (anexo A §1) | Cada indicador con su propia vigencia; el cálculo pide el juego de valores de una fecha (R2–R7, R16) | Reproducir cálculos pasados y no depender de un script |
| Tramos del impuesto único fijos en CLP (calculados con UTM $69.611) | Tramos en UTM; el monto en CLP sale de la UTM del mes (R1) | En 1.0 el impuesto de GC-F sale $2.309; con la UTM vigente serían ≈ $938 (calculado a mano) |
| Mutual distinta según el camino: 0,93 % en la liquidación, 1,20 % en CPQ, 0,95 % en Finanzas; AFP por defecto «habitat» o «modelo» según el camino | Una sola variable del tenant para cada supuesto (R10) | El mismo puesto costaba distinto según quién preguntara |
| La liquidación no suma la cotización de la reforma ni provisiones; CPQ no pasa colación ni movilización al motor; las provisiones se calculan sobre colación, movilización y aportes | Un solo cálculo con todos los conceptos (R17); CPQ manda la colación y la movilización cuando la cotización las incluye; provisiones como las calcula contabilidad, con contadores por trabajador en Nómina (R20c) | El costo cotizado quedaba bajo en unos conceptos e inflado en otros (anexo A §4) |
| Parámetros legales globales que solo se cambian con un script | Todos los valores de la empresa en una sola página, editables por una persona con permiso o por un agente según su autonomía (R15, R27) | Decisión 4 de Carlos |
| Valores de respaldo en el código (IMM $500.000, mutual 0,93 %, Fonasa 7 %) | Sin respaldos fijos: falta un valor ⇒ se dice o se bloquea (R8) | Un respaldo silencioso esconde un error |
| Montos en float hasta el final, con `floor` y `round` mezclados | Enteros escalados y una regla de redondeo por concepto (REGLAS-codigo) | Resultado igual al peso en navegador y servidor |
| Sin vista previa del impacto de un cambio | Impacto obligatorio antes de confirmar (R13) | Ningún competidor lo documenta (§14) |
| Supuestos del tenant mezclados con la ley | Separados: legal (plataforma, lectura) y del tenant (editable con vigencia) (R10–R15) | Configurable por tenant sin tocar la ley |
| Sin aviso al vendedor cuando cambian los valores | `AvisoRecalculo`, Bandeja y evento (R22–R24) | Evitar cotizar con valores viejos |

**No se porta:** el código de 1.0 (solo se rescatan reglas y casos dorados), mindicador.cl como fuente principal, cualquier valor legal fijo en el código.

## 12. Casos borde

- Ley publicada con efecto retroactivo (Ley 21.830): valor nuevo con vigencia pasada (R5); cotizaciones emitidas no cambian (R23); las abiertas muestran «cambio retroactivo» (R24); Nómina reliquida diferencias como hechos nuevos (cuando exista).
- Res. Ex. que reemplaza a otra en el mismo año (topes 2026: 89,9 → 90,0 UF): valor nuevo con la misma vigencia que el anterior; el anterior queda como historia, nunca se borra.
- Fuente caída en el cambio de mes (UTM nueva no llega): rige la anterior, `indicador_atrasado`, y la traza lo dice (R8).
- Cotización de 12 meses que cruza agosto (tramo nuevo de la reforma) o el 26-abr-2028 (40 h): la simulación puede mostrar el costo por tramo (R4); el precio se costea con el juego de valores de la **fecha de cálculo** y muestra aparte el costo a la fecha de inicio y por tramo (decisión 6 de Carlos).
- Turno de 12 h en 4x4: supera el máximo diario ordinario; en Chile requiere jornada excepcional autorizada por la DT. El motor no lo valida legalmente: avisa y deja la responsabilidad en el tenant; la resolución de jornada excepcional de la DT se registra en Asistencia (decisión 8).
- Sueldo base bajo el IMM vigente: se calcula, pero el resultado avisa en `danger` y CPQ no deja enviar sin aprobación.
- Gratificación con tope: con sueldo base ≥ 4,75 IMM / 12 / 25 % el tope rige (anexo A, GC-F).
- Patrón que no divide el mes exacto (4x4 = ciclo de 8 días): se usa el promedio mensual (30/8 ciclos), no el mes calendario, salvo en Nómina, que usa días reales.

## 13. Criterios de aceptación y casos dorados

- **CA1.** Con la fuente automática disponible, la UF del día y la UTM del mes rigen sin intervención y cada captura aparece en Historial.
- **CA2.** Si se simula una caída de la fuente, aparece la alerta en Plataforma y en la Bandeja de quien confirma en el tenant, y los cálculos siguen con el último valor y lo dicen.
- **CA3.** Un valor fuera de rango queda retenido y no rige hasta que **una** persona con permiso del tenant lo confirma. No hay segunda firma.
- **CA3b.** Un admin cambia a mano el IMM o una tasa en la misma página de los demás valores. El valor queda «Propio», con auditoría, y deja de seguir la fuente hasta que alguien pulsa «Volver a seguir la fuente».
- **CA4.** Un admin programa la mutual adicional desde una fecha futura, ve el impacto en sus cotizaciones abiertas, y el día de la vigencia las cotizaciones muestran `AvisoRecalculo`.
- **CA5.** Un agente hace el mismo cambio por MCP. Con la autonomía por defecto queda en la cola de aprobaciones, con su vista previa, y el agente no puede aprobarlo. Con autonomía «directo» para esa capacidad, rige y queda auditado como «agente vía <usuario>».
- **CA6.** Una cotización enviada no cambia ni un peso tras un cambio de UF, IMM o variable.
- **CA7.** El simulador da, para cada caso dorado del anexo A, el resultado de 1.0 al peso o la diferencia explicada por regla (por ejemplo, la tasa de la reforma vigente o la fuente de la UF).
- **CA8.** Todo lo anterior funciona igual por pantalla, `/api/v1` y MCP, y queda en la auditoría.

**Casos dorados (ejecutados sobre el motor de 1.0, anexo A §5).** Son las estructuras de puesto reales de Gard en 1.0 (montos de capa, sin datos de personas), con UF $41.237,01 (29-10-2026), UTM $72.151 (oct-2026), IMM $553.553, contrato indefinido, AFP Modelo, Fonasa 7 %, mutual 1,20 % y reforma 3,5 %. En el brief, cada uno es un test con el resultado esperado **en 2.0**, y la diferencia con 1.0 queda explicada por regla (decisiones 13 a 16).

| Caso | Capa de sueldo (puesto) | Costo empresa/mes en 1.0 | Líquido en 1.0 |
|---|---|---|---|
| GC-A | Base $553.553, gratificación legal, colación $20.000, movilización $20.000 | $878.671 | $606.148 |
| GC-B | Base $553.553, gratificación legal, sin colación ni movilización | $833.673 | $566.148 |
| GC-C | Base $553.553, gratificación legal, colación y movilización de $220.000 cada una | $1.328.655 | $1.006.148 |
| GC-D | Base $237.237 (parcial 18 h), colación y movilización de $40.000 cada una | $447.285 | $322.635 |
| GC-E | Base $900.000 (gratificación con tope) | $1.348.345 | $915.661 |
| GC-F | Base $1.000.000 (gratificación con tope; paga impuesto) | $1.468.829 | $995.172 |

**Costo por turno con GC-A** (como cotiza hoy 1.0, que no pasa colación ni movilización: $833.673 por guardia; feriados = costo/30 × 0,5 × 12/12 × 1,10):

| Puesto | Personas | Mano de obra/mes en 1.0 | Con la regla R18 |
|---|---|---|---|
| 4x4 24 h (día + noche) = 2 posiciones | 4 | $3.395.828 | Igual en personas; sube con la colación y la movilización (R17) |
| 4x4 de 12 h, solo día o solo noche | 2 | $1.697.914 | Igual (42 h semanales, dentro de la jornada) |
| 5x2 diurno de 08:00 a 18:00 | 1 (plantilla de CPQ) o 2 (regla de dotación de CRM) | $848.957 o $1.697.914 | 1 persona, pero son 50 h semanales: el motor avisa que excede las 42 h y propone horas extra o un horario de 8,4 h (regla de la decisión 9) |

- **CA10.** Las provisiones de vacaciones e indemnización de cada caso dorado se calculan como en R17, paso 5, sin colación, movilización ni aportes en la base. Su diferencia con 1.0 queda explicada, caso por caso, en el test.
- **CA9.** Para cada caso dorado, el brief fija el resultado esperado de 2.0 y una prueba que reproduce el de 1.0 con los supuestos de 1.0 (para demostrar que la diferencia es solo la regla nueva).

## 14. Benchmark

> **Cómo se verificó.** La red de la sesión no permitió abrir las páginas (fallaron sii.cl, previred.com, api.cmfchile.cl, si3.bcentral.cl, mindicador.cl, spensiones.cl y developer.deel.com). Cada dato viene del **resultado del buscador** (título, URL y extracto indexado), no de leer la página completa. Las cifras legales se cruzaron además con lo que tiene cargado 1.0. **Antes del brief hay que abrir cada fuente oficial y confirmar el texto**. Carlos habilita esos dominios y los que hagan falta (decisión 17). Lo que no apareció se marca *no verificable*.

### 14.1 Proveedores

| Tema | Buk (Chile) | Talana (Chile) | Rex+ (Chile) | Deel | Rippling | ADP |
|---|---|---|---|---|---|---|
| Indicadores al día | Dice que se integra con los oficiales y se actualiza cuando publican Previred o el SII ([buk.cl](https://www.buk.cl/blog/indicadores-previsionales-previred-actualizados)) | Dice estar conectado a Previred, el Banco Central y el SII ([talana](https://web.talana.com/software-remuneraciones)) | Genera Previred y ya incorporó la reforma ([rexmas](https://rexmas.com/blog/como-un-sistema-de-rh-puede-impulsar-el-cumplimiento-de-la-reforma-previsional/)); cómo se actualiza: *no verificable* | *No verificable* | Monitorea cambios tributarios, solo en EE. UU. ([rippling](https://www.rippling.com/payroll-compliance)) | *No verificable* |
| Vigencias y recálculo retroactivo | *No verificable* | *No verificable* | *No verificable* | *No verificable* | Calcula la diferencia de un sueldo con fecha pasada y la suma a la nómina siguiente ([oct-2024](https://rippling.com/blog/october-2024-product-updates)) | *No verificable* |
| Simulador de costo | Calculadoras de líquido, bruto y costo ([buk.cl](https://www.buk.cl/recursos/calculadora)) | Calculadora de costo empresa, sin líquido, impuestos ni regímenes especiales ([talana](https://web.talana.com/calculadora-de-costo-empresa-2027-en-chile)) | *No verificable* | **Calculadora de costo por API** ([developer.deel.com](https://developer.deel.com/api/employer-of-record/employment-cost-calculator)) | *No verificable* | *No verificable* |
| Auditoría de cambios | *No verificable* | *No verificable* | *No verificable* | *No verificable* | Registro inmutable según un tercero ([erpresearch](https://erpresearch.com/erp-add-ons/payroll/rippling-payroll-vs-sap-successfactors-employee-central-payroll)); en el sitio del proveedor, *no verificable* | Un agente detecta variaciones y una persona aprueba la corrección ([ADP, ene-2026](https://mediacenter.adp.com/2026-01-28-ADP-R-Accelerates-AI-Leadership-with-Launch-of-New-AI-Agents-Designed-to-Solve-Workforce-Challenges)) |
| API | Con API key, según terceros ([Dataddo](https://docs.dataddo.com/docs/buk.md)) | Existe, sin documentación pública ([talana](https://web.talana.com/)) | REST, sin endpoints públicos ([rexmas](https://rexmas.com/software-de-remuneraciones)) | Pública ([developer.deel.com](https://developer.deel.com/)) | Citada por terceros; *no verificable* | API Central, US$2 por empleado al mes ([adp.com](https://www.adp.com/what-we-offer/integrations/api-central.aspx)) |
| IA, agentes y MCP | *No verificable* | Solo un chatbot ([talana](https://web.talana.com/blog/extensiones-talana)) | Su `llms.txt` habla de «documentación para agentes IA» ([rexmas](https://rexmas.com/llms.txt)) | **MCP oficial** ([developer.deel.com/mcp](https://developer.deel.com/mcp)) | Solo MCP de terceros ([glama](https://glama.ai/mcp/servers/@bifrost-mcp/rippling-mcp/blob/d03029cca2c5be91e71ac380f019ddba0a8125e4/README.md)) | Agentes ADP Assist con supervisión humana; MCP oficial: *no verificable* |
| Precio público | Por colaborador; monto en Chile *no verificable* ([buk.co](https://www.buk.co/precios)) | *No verificable* | 0,035 UF por colaborador para Remuneraciones (mínimo 3,5 UF) y 0,05 UF con Asistencia, más IVA ([rexmas.com/precios](https://rexmas.com/precios/)) | EOR Chile desde US$599 al mes ([deel.com](https://www.deel.com/ko-kr/hiring/employees/chile/)) | *No verificable* | Solo el de API Central |

### 14.2 Fuentes legales citadas (resultado del buscador, por confirmar)

- UF del año: [SII](https://www.sii.cl/valores_y_fechas/uf/uf2026.htm). API del Banco Central (cuenta, token y tope de 5 series por segundo): [acceso](https://si3.bcentral.cl/estadisticas/Principal1/Web_Services/acceso_api.html), [términos](https://si3.bcentral.cl/estadisticas/Principal1/Web_Services/terminos_condiciones.html). API de la CMF: *no verificable* desde el buscador (1.0 la usa, `src/lib/fx-sync.ts`).
- Ingreso mínimo $553.553 desde el 1-may-2026, Ley 21.830: [Diario Oficial (PDF)](https://www.diariooficial.interior.gob.cl/publicaciones/2026/06/22/44481-B/01/2829298.pdf). El tramo de menores de 18 y mayores de 65: *no verificable*.
- Topes 2026 (90,0 UF y 135,2 UF, Res. Ex. 237): [Superintendencia de Pensiones](https://spensiones.cl/portal/institucional/594/w3-article-16921.html), [AAFP](https://www.aafp.cl/noticias/alza-topes-imponibles-2026-90-uf/).
- Comisiones AFP y SIS: [Superintendencia de Pensiones](https://www.spensiones.cl/portal/institucional/594/w3-article-8046.html), [folleto Habitat ago-2026](https://www.afphabitat.cl/wp-content/uploads/2026/08/Folleto_N15_Comisiones_Agosto2026.pdf).
- Reforma, Ley 21.735 (1 % desde ago-2025, 3,5 % desde ago-2026, hasta 8,5 %): [Previsión Social](https://previsionsocial.gob.cl/?p=4700), [Hacienda](https://www.hacienda.cl/noticias-y-eventos/noticias/implementacion-de-la-reforma-previsional-nueva-cotizacion-del-empleador-regira), [AAFP](https://www.aafp.cl/noticias/reforma-previsional-cotizacion-adicional-35-agosto-2026/).
- Seguro de cesantía: [Dirección del Trabajo](https://dt.gob.cl/portal/1628/w3-article-95306.html). Ley 16.744 y DS 67: [SUSESO](https://www.suseso.gob.cl/612/w3-article-34081.html).
- Indicadores de Previred (PDF mensual, sin API encontrada): [julio de 2026](https://www.previred.com/wp-content/uploads/2026/07/Indicadores-Previsionales-Previred-Julio-2026.pdf).
- Gratificación del art. 50: [Dirección del Trabajo](https://dt.gob.cl/legislacion/1624/w3-article-62430.html). Colación y movilización: [Dirección del Trabajo](https://www.dt.gob.cl/legislacion/1611/w3-article-112157.html). Horas extra del art. 32: [Dirección del Trabajo](https://dt.gob.cl/legislacion/1624/w3-article-117932.html). Ley 21.561 (40 horas): [Mintrab](https://www.mintrab.gob.cl/40horas-implementacion/).

**Discrepancia que hay que resolver antes del brief:** según el buscador, el SIS de agosto a octubre de 2026 es **1,78 %** (Buk y Habitat), mientras que 1.0 lo tiene en **0 % desde agosto**, con la reforma de 3,5 % «con el SIS incluido». Si 1.0 se equivoca, su costo empresa queda bajo en ≈ 1,78 % del imponible (≈ $12.300 por guardia en GC-A). Ver la pregunta 13.

### 14.3 Qué adoptamos, qué mejoramos y qué descartamos

- **Adoptamos:** el simulador de costo como capacidad expuesta por API y MCP (como Deel); el patrón «el agente detecta y una persona aprueba» (ADP); el Banco Central como fuente de UF y UTM, y Previred y la Superintendencia de Pensiones como fuentes de tasas, con validación humana (como dicen hacer Buk y Talana).
- **Mejoramos** (ningún proveedor lo documenta en público): la vigencia por indicador con la norma de origen y las **correcciones retroactivas como hechos nuevos** (la Ley 21.830 y la Res. Ex. 237 muestran que pasan); el registro de cada captura con su diferencia; la **vista previa del impacto** sobre cotizaciones abiertas antes de cambiar una variable; los calendarios futuros conocidos (reforma, 40 horas); la mutual del tenant con su vigencia bienal; todo agent-first por el MCP propio y el agente interno, con aprobación humana.
- **Descartamos:** mindicador.cl como fuente de verdad; el scraping de Previred como única vía; copiar los porcentajes de «costo empleador» de los EOR (se contradicen entre sus propias páginas); montos legales de colación y movilización (no existen: son variables del tenant con criterio de razonabilidad).

## 15. Lugar en el ROADMAP y qué queda en Nómina

**Decidido (decisiones 1 y 12):** un brief propio del Núcleo, **«07e · Motor de sueldos»** (el 07c y el 07d ya están ocupados), que va **después de Puestos (Brief 11) y antes del Motor CPQ (Brief 08)**, en paralelo con Comercial (Briefs 06 y 07), con los que no comparte código. No necesita Comercial; necesita las capas de sueldo (07b: PR 1 a 3 integrados según ROADMAP; el PR 4, el anexo, en curso) y el catálogo de patrones de Puestos (Brief 11) para el costo por turno. Sus pantallas pasan por Claude Design con este Design Prompt.

| Queda en el motor (Núcleo, 07e) | Queda en Nómina (Briefs 25 y 26) |
|---|---|
| Indicadores legales con fuentes, capturas, alertas y vigencia | Periodo de remuneraciones y su cierre |
| Variables del tenant con vigencia, aprobación e impacto | Días trabajados, ausencias, licencias, horas extra reales (resumen del periodo, ADR-048) |
| Cálculo bruto → imponible → aportes → provisiones → costo empresa | Liquidación real por persona con sus datos (AFP y salud reales, cargas, APV, anticipos, préstamos, descuentos voluntarios) |
| Costo por persona, puesto, día y hora; líquido **estimado** | Impuesto único real, reliquidaciones y finiquitos, con el **contador acumulado de vacaciones y de indemnización por trabajador** (R20c) |
| Simulador y herramientas MCP de consulta y simulación | Libro de remuneraciones, LRE, archivo Previred y archivos de pago |

## 16. Preguntas para Carlos y sus decisiones (29-oct-2026)

Numeradas, cada una con su recomendación y, al final, la decisión de Carlos del 29-oct-2026. Quedan cerradas las 18.

1. **¿El motor va como servicio del Núcleo, en un brief propio 07e, antes del Motor CPQ (Brief 08) y en paralelo con Comercial?** Recomendación: **sí**. CPQ lo necesita antes de su primera línea de guardias; ponerlo dentro del Brief 08 lo haría muy grande y a Nómina le tocaría reescribirlo. Por ADR-048 debe ser Núcleo para no crear una dependencia CPQ → Nómina. **Decisión: como viene.** Servicio del Núcleo, Brief 07e, antes del Brief 08 y en paralelo con Comercial.
2. **¿Dónde viven las pantallas?** Recomendación: **Configuración → Remuneraciones** (indicadores, variables, historial) y el **Simulador como acción de Personas → Cargos y sueldos** y de ⌘K. Es un catálogo del Núcleo, como el embudo y las etiquetas: no rompe ADR-018 (sin páginas de configuración por módulo) y no agrega entradas al menú (NAVEGACION.md). Alternativa: pestañas dentro de Cargos y sueldos, pero eso obliga a cambiar NAVEGACION.md, que hoy la deja sin pestañas. **Decisión: como viene**, con el ajuste de la decisión 4: indicadores y variables en **una sola página** de Configuración → Remuneraciones; el simulador, en Cargos y sueldos y en ⌘K.
3. **¿Creas la cuenta y el token de la API del Banco Central (BDE) como credencial de plataforma?** Recomendación: **sí**; es gratis, oficial y es la única fuente de UF y UTM con API verificada en el benchmark. Mientras no exista, el trabajo usa el SII como primaria y mindicador.cl solo como contraste. **Decisión: como viene.** Carlos crea la cuenta y el token del Banco Central como credencial de plataforma.
4. **¿Quién confirma los indicadores manuales (IMM, tasas por ley) y los valores retenidos?** Recomendación: un operador de Plataforma con **segunda firma de otro operador** (hoy, tú y el bot «OPAI 2.0» no cuentan como dos personas: propongo que la segunda firma seas tú desde el celular hasta que haya otro operador humano). **Decisión: cambia.** Sin segunda firma. Confirma **una** persona: el owner, un administrador o alguien en quien deleguen. Todos los valores (IMM, tasas, UF y UTM, topes y los demás) se ven y se editan en una sola página. Un agente o el MCP también puede modificarlos, con auditoría y según la autonomía de su key. Queda en R5, R15 y R27, y en las secciones 2, 3, 6, 7 y 9.
5. **¿Un cambio de variable del tenant pide segunda firma por defecto?** Recomendación: **no** para personas con permiso (owner, admin o rol con permiso) y **siempre** cuando lo propone un agente; el tenant puede activar la segunda firma para todos con un ajuste. **Decisión: no se pide segunda firma.** Los cambios de una persona con permiso se aplican directo. Los de un agente siguen la autonomía que el tenant le dio (por defecto, la cola de aprobaciones). Queda en R14.
6. **¿Con qué fecha se costea una cotización?** Recomendación: con el juego de valores de la **fecha de cálculo**, y la simulación muestra además el costo en la fecha de inicio del servicio y en los tramos futuros conocidos (reforma, 40 horas), para que el vendedor decida el reajuste. Alternativa: costear siempre a la fecha de inicio. **Decisión: como viene.** Se costea con la fecha de cálculo y se muestran aparte la fecha de inicio y los tramos futuros.
7. **Cotizaciones abiertas: ¿recalcular solas o con un clic?** Recomendación: **con un clic** («Recalcular»), con aviso y bloqueo de envío con valores viejos sin confirmación (R22). Un recálculo silencioso puede mover un precio que el cliente ya conversó. **Decisión: como viene.** Con un clic, y sin enviar con valores viejos sin confirmación.
8. **Turnos de 12 horas (4x4, 7x7):** ¿el motor solo avisa, o exige registrar la resolución de jornada excepcional de la DT por instalación? Recomendación: **solo avisar** en el motor y dejar el registro de la resolución para Asistencia (fase 4, ADR-023), que es donde la fiscaliza la DT. **Decisión: como viene.** El motor solo avisa de la jornada excepcional; la resolución de la DT se registra en Asistencia.
9. **Personas por puesto:** ¿adoptamos la regla (trabajo + descanso) / trabajo, con sobrescritura por línea y motivo? Recomendación: **sí**, porque reproduce 1 puesto = 1 posición (ADR-036) y es auditable. Confirmar contra la regla que use hoy Gard en 1.0 (anexo A, sección 3). **Decisión: como viene.**
10. **¿El líquido estimado del trabajador se muestra en el simulador y en el CPQ?** Recomendación: **sí, en el simulador y como dato interno del CPQ** (nunca en la vista del cliente), marcado «estimado»; 1.0 ya lo muestra al cotizar y sirve para ofrecer sueldos competitivos. **Decisión: como viene.**
11. **Casos dorados:** ¿apruebas usar como referencia las 6 estructuras de puesto reales de Gard del anexo A (montos de capa, sin datos personales) y que la diferencia aceptada contra 1.0 sea **$0**, salvo diferencias explicadas por regla (por ejemplo, tramo de la reforma)? Recomendación: **sí**; y que elijas 2 liquidaciones reales de octubre para validarlas en Nómina (se citan por enlace, no se copian). **Decisión: como viene.** Se usan las 6 estructuras de puesto de Gard del anexo A.
12. **¿Se registra este diseño como un ADR nuevo (ADR-056 · Motor de sueldos del Núcleo)** que modifica la fase 6 (el costo empresa sale de Nómina) y ADR-042 punto 4 (los parámetros legales pasan del CPQ al motor)? Recomendación: **sí**, al aprobar esta especificación. **Decisión: sí.** Se crea ADR-056 y Carlos aprueba esta especificación.

13. **SIS desde agosto de 2026: ¿0 % (como 1.0, con la reforma de 3,5 % que lo incluiría) o 1,78 % aparte (como publican Buk y Habitat)?** Recomendación: **verificarlo en la Superintendencia de Pensiones antes del brief** y cargar lo que diga la norma. Si el 1,78 % se cobra aparte, 1.0 está cotizando bajo en ≈ $12.300 por guardia en GC-A; tú decides si eso amerita una corrección crítica en 1.0 (AGENTS.md solo permite tocar 1.0 si la pides). **Decisión: como viene.** Antes del brief se verifica en la Superintendencia de Pensiones y se carga lo que diga la norma.
14. **¿Sobre qué base se calculan las provisiones de vacaciones e indemnización?** 1.0 las aplica al costo directo completo (incluye colación, movilización y aportes), lo que infla el costo. Recomendación: dejarlo como **variable del tenant** con dos opciones; para Gard, **«como 1.0» al partir**, para que los precios no cambien sin que lo decidas, y revisarlo contigo y tu contador para pasar a «solo haberes». **Decisión: cambia.** Las provisiones de vacaciones y de indemnización por años de servicio se calculan como lo hacen finanzas y contabilidad, sin inflarlas con colación, movilización ni aportes. Para el costo, el CPQ suma el promedio mensual de los días de feriado del año. Nómina lleva un contador acumulado de vacaciones y de indemnización por trabajador para los finiquitos. Queda en R17 (paso 5) y R20c.
15. **Valor de la hora extra:** ¿la fórmula legal con la jornada pactada (sueldo/30 × 28 / (4 × 42) ≈ base/180) o la de 1.0 (base/240)? Recomendación: **la legal con la jornada pactada**. La de 1.0 paga las horas extra un 25 % más bajo con 42 h, y eso es un riesgo ante la DT. **Decisión:** la fórmula legal con la jornada pactada (R19).
16. **¿El CPQ de 2.0 costea con la colación y la movilización de la capa?** 1.0 no las manda al motor: en GC-A el costo por guardia pasa de $833.673 a $878.671 (+5,4 %). Recomendación: **sí**, porque es el costo real. Para las cinco cotizaciones de validación de ADR-042, la diferencia se explica por esta regla y no por un error. **Decisión: sí.** El CPQ costea con la colación y la movilización de la capa cuando la cotización las incluye (R17, paso 2).
17. **Verificación de fuentes:** esta sesión no pudo abrir las páginas oficiales (red restringida). ¿Habilitas esos dominios (sii.cl, bcentral.cl, cmfchile.cl, spensiones.cl, previred.com, dt.gob.cl, bcn.cl, diariooficial.interior.gob.cl) en la configuración de red del entorno para que el brief parta confirmándolas? Recomendación: **sí**. El trabajo automático de actualización también los va a necesitar en Vercel (allí la red está abierta). **Decisión: sí.** Carlos habilita esos dominios y todos los que hagan falta.
18. **¿Una capa puede declarar su sueldo base «igual al ingreso mínimo»** (R20b), para que al subir el IMM se recalcule sola y RRHH reciba los anexos en borrador? Recomendación: **sí**. Hoy casi todos los puestos de Gard en 1.0 están en el mínimo y cada alza obliga a editarlos a mano. **Decisión: sí** (R20b).

## Anexo A. Payroll de 1.0 y casos dorados

Fuente: `Cryptobal/opai` en `40d19a5`, solo lectura. Los casos dorados se **ejecutaron** sobre las funciones reales de 1.0 (`computeEmployerCost` y `simulatePayslip`), reemplazando solo el acceso a la base por los parámetros de la semilla `prisma/seeds/payroll-params-chile-2026.ts` (versión de agosto de 2026). **Supuesto no verificado:** la versión activa en la base de producción de 1.0 es igual a esa semilla. Los scripts quedaron en el scratchpad de la sesión, fuera del repo.

### A.1 Variables legales en 1.0

- Parámetros como JSON en `payroll.parameter_versions` (`prisma/schema.prisma:1302-1321`): **globales, sin `tenantId`**, con `effectiveFrom`/`effectiveUntil`/`isActive`; el motor usa la marcada activa (`parameter-loader.ts:13-33`), no la vigente en la fecha (`loadParametersByDate` existe en `:63` y no se usa). Se actualizan con `scripts/update-payroll-parameters-2026.ts`. No hay lectura de Previred.
- Valores de agosto de 2026: AFP 10 % + comisión (uno 0,46 %, modelo 0,58 %, planvital 1,16 %, habitat 1,27 %, capital y cuprum 1,44 %, provida 1,45 %); Fonasa 7 %; AFC indefinido 0,6 % trabajador y 2,4 % empleador, plazo fijo 0 % y 3,0 %; topes 90 UF y 135,2 UF; mutual básica 0,93 % con niveles (*security_industry* 1,20 %); gratificación 25 % con tope 4,75 IMM; IMM $553.553; **SIS 2 % en julio y 0 % desde agosto; reforma 1 % en julio y 3,5 % desde agosto «con el SIS incluido»**.
- UF y UTM en `fx.uf_rates`/`fx.utm_rates` (`Decimal(10,2)`), con cron a las 12:00 y 18:00 UTC: CMF primero, mindicador.cl de respaldo. La UTM no se usa en el impuesto.
- Fijo en el código: IMM de respaldo $500.000, provisiones 8,33 % y 4,166 %, divisor 30 días, jornada 42 h. La tabla `PayrollAssumption` existe y nadie la lee.

### A.2 Fórmula de costo empresa de 1.0 (`compute-employer-cost.ts`)

1. Topes en CLP = tope UF × UF (float). 2. Gratificación = mín(base × 25 %, IMM × 4,75 / 12), sobre la base sola. 3. Horas extra = horas × base/30/8 × 1,5. 4. Imponible = base + gratificación + horas extra + otros imponibles, con tope. 5. No imponibles = colación + movilización + asignación familiar + otros. 6. Empleador: AFC sobre el imponible con tope AFC; SIS, reforma y mutual sobre el imponible con tope. 7. Directo = imponible + no imponible + aportes. 8. **Provisiones sobre el directo completo** (incluye colación, movilización y aportes). 9. Total, redondeado solo al final.

La liquidación (`simulate-payslip.ts`) usa base proporcional por días, valor hora base/30/8 (extra 50 % y 100 %), mutual 0,93 %, y **no suma la reforma ni provisiones** (`:256-281`).

### A.3 CPQ de 1.0

- `buildCpqStyleEmployerCostInput` (`src/lib/cpq/cpq-employer-cost-input.ts:14-45`): indefinido, AFP modelo, Fonasa, mutual 1,20 %, provisiones; **solo manda el sueldo base** (sin colación ni movilización).
- Costo del puesto = costo empleador × guardias × puestos (`quote-position-write.service.ts:69`). Plantillas: 24/7 = 2 de día + 2 de noche en 4x4; 12 h = 2 en 4x4; 5x2 diurno = **1 guardia de 08:00 a 18:00** (`coverage-patterns.ts:64-73`). La regla de dotación del CRM (`coverage-to-staffing.ts:82-144`) da **2** para ese mismo 5x2 (50 h / 42 h): las dos reglas no coinciden.
- Feriados (`compute-quote-costs.ts:270-296`): suma de puestos / 30 × 0,5 × feriados/12 × (1 + colchón), con 12 y 10 % por defecto, aplicado también a los puestos de lunes a viernes. Sin recargo nocturno.

### A.4 Problemas verificados en 1.0

Liquidación sin reforma; mutual y AFP por defecto distintas según el camino; tabla de impuesto en CLP fijos (UTM $69.611); provisiones sobre colación, movilización y aportes; CPQ sin colación ni movilización; valor hora base/30/8 sin jornada pactada; versión activa en vez de vigente; tabla global sin tenant; float hasta el final; respaldos fijos (IMM $500.000, factor 1,45 en Finanzas, `payroll-from-dotacion.ts:43`); plantilla 5x2 de 50 h.

### A.5 Resultados ejecutados (UF $41.237,01, UTM $72.151, IMM $553.553; tope imponible $3.711.330,90; tope AFC $5.575.243,75; tope mensual de gratificación $219.115)

Costo empresa (`computeEmployerCost` con los supuestos de CPQ y pasando colación y movilización: SIS 0, reforma 3,5 %, AFC 2,4 %, mutual 1,20 %):

| Caso | Reforma | AFC | Mutual | Directo | Vacaciones | Indemnización | Costo mensual |
|---|---|---|---|---|---|---|---|
| A | 24.218 | 16.607 | 8.303 | 781.069 | 65.063 | 32.539 | **878.671** |
| B | 24.218 | 16.607 | 8.303 | 741.069 | 61.731 | 30.873 | **833.673** |
| C | 24.218 | 16.607 | 8.303 | 1.181.069 | 98.383 | 49.203 | **1.328.655** |
| D | 10.379 | 7.117 | 3.559 | 397.601 | 33.120 | 16.564 | **447.285** |
| E | 39.169 | 26.859 | 13.429 | 1.198.572 | 99.841 | 49.933 | **1.348.345** |
| F | 42.669 | 29.259 | 14.629 | 1.305.672 | 108.762 | 54.394 | **1.468.829** |

Como lo llama CPQ (sin colación ni movilización): A y C = $833.673; D = $357.288. Con los supuestos de Finanzas (habitat y mutual 0,95 %): A a C = $831.727; D = $356.454; E = $1.345.198; F = $1.465.400.

Liquidación (`simulatePayslip`, AFP Modelo 10,58 %, Fonasa, indefinido):

| Caso | Gratificación | Imponible | No imponible | AFP | Salud | AFC | Impuesto | Líquido |
|---|---|---|---|---|---|---|---|---|
| A | 138.388 | 691.941 | 40.000 | 73.207 | 48.435 | 4.151 | 0 | **606.148** |
| B | 138.388 | 691.941 | 0 | 73.207 | 48.435 | 4.151 | 0 | **566.148** |
| C | 138.388 | 691.941 | 440.000 | 73.207 | 48.435 | 4.151 | 0 | **1.006.148** |
| D | 59.309 | 296.546 | 80.000 | 31.374 | 20.758 | 1.779 | 0 | **322.635** |
| E | 219.115 | 1.119.115 | 0 | 118.402 | 78.338 | 6.714 | 0 | **915.661** |
| F | 219.115 | 1.219.115 | 0 | 128.982 | 85.338 | 7.314 | 2.309 | **995.172** |

Con los tramos del impuesto en UTM vigente, el impuesto de F sería ≈ $938 (calculado a mano, no ejecutado). El costo por turno de §13 está ejecutado, salvo el ajuste de feriados, calculado a mano con la fórmula de `compute-quote-costs.ts:292`.

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
| 29-oct-2026 | Borrador: reglas, benchmark, preguntas y Design Prompt (CAR-71) | — |
| 29-oct-2026 | Decisiones de Carlos a las 18 preguntas (§16). Una sola persona confirma, sin segunda firma; todos los valores en una página, editables también por un agente según su autonomía; provisiones como contabilidad, con contadores por trabajador en Nómina; fórmula legal de horas extra; colación y movilización en el CPQ. Se registra ADR-056 | Carlos (29-oct-2026) |
