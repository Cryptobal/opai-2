# DESIGN PROMPT — MOTOR DE SUELDOS: INDICADORES, VARIABLES DEL TENANT Y SIMULADOR DE COSTO (OPAI 2.0)

**Tarea:** CAR-71 · **Especificación:** [`docs/2.0/modulos/motor-sueldos.md`](../modulos/motor-sueldos.md) (borrador, pendiente de aprobación de Carlos; este prompt se usa **solo después** de esa aprobación, ADR-047) · **Estado:** listo para copiar.

Para pegar completo en Claude Design, en un proyecto nuevo «Motor de sueldos», **con el Design System de OPAI 2.0 V2** (el oficial de la organización; en el repo: `packages/ds/src/tokens.css` y `docs/2.0/design/export-ds-2.0/`). **Nunca el estilo de OPAI 1.0.** No crees colores, tipografías, radios ni componentes nuevos salvo los de la sección 3; todo lo demás se compone con los existentes (`AppShell`, `Page`, `PageHeader`, `SplitScreen`, `SelectableRow`, `DetailSection`, `Pares`, `Table`, `Sheet`, `Dialog`, `Popover`, `Tooltip`, `Select`, `Combobox`, `Input`, `InputFecha`, `RadioGroup`, `Switch`, `Badge`, `Chip`, `FilterChip`, `Segmented`, `Tabs`, `Timeline`, `Vigencia`, `KpiTile`, `Alerta`, `Toast`, `Empty`, `ErrorState`, `Forbidden`, `Loading`).

Resultado esperado: el **export HTML standalone**, una pantalla por archivo, nombrado como en la sección 6, más una captura por pantalla y viewport. Es la referencia de contenido y jerarquía, no código a copiar.

---

## 1. Contexto

OPAI 2.0 es un SaaS operacional multi-tenant y agent-first para empresas intensivas en personal (seguridad primero; tenant de ejemplo en el export: «Atlas Seguridad SpA»; nunca la marca Gard). Todo lo que se ve en pantalla existe también como capacidad por API y MCP, y el agente interno (ADR-049) puede hacer lo mismo con los permisos del usuario.

El **motor de sueldos** es un servicio del Núcleo que calcula, desde el sueldo bruto de una capa (instalación, puesto o RUT; ADR-036), el **costo empresa** por persona, por puesto, por día y por hora, con los **indicadores legales** (UF, UTM, ingreso mínimo, topes, AFP, SIS, cesantía, mutual, reforma de pensiones, gratificación) y las **variables propias del tenant**, todo **versionado por vigencia**. Lo usan el cotizador (CPQ) y, más adelante, Nómina.

Tres públicos:
- **Administrador o RRHH del tenant:** revisa indicadores, edita las variables del tenant con vigencia y ve el impacto antes de confirmar.
- **Vendedor:** simula el costo de un puesto (4x4, 5x2…) y entiende de dónde sale cada peso.
- **Operador de Plataforma (OPAI):** atiende las alertas de fuentes caídas o valores anómalos y confirma cargas manuales con evidencia.

**Formatos:** español de Chile; `dd-mm-aaaa`; `HH:mm`; CLP `$ 553.553`; UF `UF 41.237,01` (dos decimales al mostrar); porcentajes `10,49 %`; montos con `t-numeric`, RUT en `t-mono`. Cifras de ejemplo: las de la sección 5 de la especificación (sin datos personales).

**Viewports:** 375, 1024 y 1280 en todas las pantallas; modo oscuro al menos en Indicadores, Simulador y la hoja de cambio de variable.

**Principios (ADR-014, ADR-017):** una acción principal por pantalla; color solo para estado; foco visible, skeleton con la forma del contenido, vacío con acción, movimiento 150–200 ms con `prefers-reduced-motion`; touch ≥ 44 px; en iPad y escritorio el título vive en la barra del shell. En el teléfono se **ve, se simula y se aprueba**; editar variables y comparar escenarios en paralelo es de iPad y escritorio (en el teléfono, un escenario a la vez).

## 2. Navegación

- **Configuración → Remuneraciones** (un ámbito nuevo del centro de Configuración, ADR-018; no es una entrada del menú): pestañas **Indicadores legales · Variables de la empresa · Historial**.
- **Personas → Cargos y sueldos**: acción secundaria «Simular costo» en la cabecera y en cada capa de sueldo («Simular con esta capa»).
- **⌘K**: acciones «Simular costo de un puesto» y «Ver indicadores vigentes».
- **Plataforma → Indicadores** (portal de plataforma, solo `platformRole`): cola de alertas y cargas manuales.
- **Bandeja de Inicio**: las alertas que le tocan al tenant (indicador atrasado, cambio de variable pendiente de aprobación, cotizaciones con valores desactualizados).

## 3. Componentes que faltan (definirlos con sus estados)

| Componente | Qué es | Especificación |
|---|---|---|
| `TrazaMonto` | «De dónde sale» un monto | `Popover` (escritorio: al pasar o enfocar; teléfono: al tocar) con la fórmula en palabras («Sueldo imponible × 1,49 % SIS»), los valores usados con su vigencia y fuente, y el resultado. Reutilizable por CPQ y Nómina. Estados: normal, con valor manual (badge `warning` «Manual»), con valor faltante (`danger`). |
| `EstadoFuente` | Salud de la fuente de un indicador | `Badge` con tono del DS: **Al día** (`success`), **Atrasado** (`warning`, «última captura hace 3 días»), **Anómalo, en revisión** (`danger`), **Manual** (`info`). Con `Tooltip` que dice la fuente y la última captura. |
| `CambioValor` | Antes → después de un valor | Valor anterior tachado en `fg-subtle`, flecha, valor nuevo en `t-numeric`, variación en % con tono (`warning` si supera el umbral). Para historial, impacto y avisos. |
| `AvisoRecalculo` | Aviso en una cotización abierta cuyos valores cambiaron | `Alerta` `warning` con «Cambiaron 2 valores desde que calculaste esta cotización (UF, IMM). Costo +$ 41.300/mes.» y acciones «Ver cambios» (abre hoja con `CambioValor`) y «Recalcular». Variante congelada `info` para cotizaciones enviadas: «Valores congelados al 14-10-2026». CPQ lo usará; aquí se diseña aislado. |

## 4. Pantallas

### 4.1 Indicadores legales (`/configuracion/remuneraciones`)
Lista agrupada por sección: **Unidades** (UF del día, UTM del mes), **Ingreso mínimo y topes** (IMM, tope imponible AFP y salud, tope AFC, tope de gratificación), **Previsión** (comisión por AFP, SIS, aporte del empleador de la reforma), **Cesantía** (empleador indefinido y plazo fijo, trabajador), **Accidentes del trabajo** (cotización básica; la adicional va en Variables de la empresa), **Impuesto único** (tramos en UTM). Cada fila: nombre, valor vigente, «vigente desde», `EstadoFuente` y fuente con enlace externo. Arriba, un resumen con `KpiTile` (UF hoy, UTM del mes, IMM) y, si hay, una `Alerta` del estado de las fuentes. Solo lectura para el tenant (los valores legales los mantiene OPAI). Filtro por fecha («Ver valores al…», `InputFecha`) para ver lo que regía en una fecha pasada o lo que regirá en una futura ya publicada.
Teléfono: lista por sección con valor y estado; el detalle se abre en pantalla completa.

### 4.2 Detalle de un indicador (hoja o panel derecho)
- Valor vigente, unidad, periodicidad, **fuente oficial** con enlace y fuente de contraste.
- **Historial por vigencia** (`Table`: vigente desde, hasta, valor, `CambioValor` respecto del anterior, origen automático o manual, quién confirmó).
- **Registro de capturas** (`Timeline`): cada intento del trabajo diario con resultado (capturado igual, capturado nuevo, fuente sin respuesta, valor fuera de rango y retenido).
- «Qué usa este valor»: cuántas cotizaciones abiertas, capas de sueldo y simulaciones guardadas lo usan (con enlaces).

### 4.3 Variables de la empresa (pestaña)
Lista de las variables propias del tenant, agrupadas: **Supuestos de costeo** (AFP para cotizar, salud para cotizar, provisión de vacaciones, provisión de indemnización, colchón de feriados, días de feriado al año), **Accidentes del trabajo** (cotización adicional de la mutual o del ISL, con su fecha de resolución), **Jornada** (horas semanales por defecto), **Gratificación** (modalidad por defecto) y **Personalizadas** (las que crea el tenant, con unidad). Cada fila: valor vigente, «vigente desde», próximo cambio programado (chip `info` «Cambia el 01-01-2027 a …»), quién la cambió por última vez. Acción principal: **Programar cambio** (en la fila o en la ficha). Vacío de «Personalizadas»: «Aún no tienes variables propias» con «Crear variable».

### 4.4 Programar cambio de una variable (hoja)
Campos: valor nuevo (con unidad), **vigente desde** (hoy o futuro; pasado solo con permiso especial y motivo), motivo (obligatorio), adjunto opcional (resolución de la mutual, por ejemplo). Antes de confirmar, **vista previa de impacto** (dry-run): cotizaciones abiertas afectadas con su diferencia mensual (`CambioValor`), capas de sueldo cuyo costo cambia y total mensual estimado. Estados: vista previa, **pendiente de aprobación** (si el tenant exige segunda firma o si lo propuso un agente: «Propuesto por el agente de Ana Rojas · espera aprobación»), confirmando, éxito («Regirá desde 01-11-2026»), error de regla (solape de vigencias, valor fuera de rango). En el teléfono: solo aprobar o rechazar una propuesta existente, con su vista previa.

### 4.5 Historial (pestaña)
`Timeline` de todo cambio: indicadores capturados, variables del tenant programadas, aprobadas o rechazadas, con autor (persona, agente vía persona, o «OPAI · actualización automática»), filtros por tipo y por variable, y enlace a la auditoría.

### 4.6 Simulador de costo (`/personas/cargos/simular`, también hoja desde Cargos y sueldos)
- **Entrada** (columna izquierda en 1024/1280; pasos en el teléfono):
  - *Sueldo:* «Usar una capa existente» (`Combobox` de instalación o puesto) o «Ingresar a mano»: sueldo base, gratificación (legal con tope, monto fijo, ninguna), colación, movilización, bonos (imponible sí/no).
  - *Contrato:* indefinido o plazo fijo; AFP y salud (por defecto, las de Variables de la empresa).
  - *Turno:* patrón del catálogo del tenant (`Select`: 4x4, 5x2, 7x7, 14x14, 2x5, 3x4…), horario (`InputHora` inicio y fin, con cruce de medianoche), horas semanales resultantes con aviso si superan la jornada legal vigente.
  - *Fecha de cálculo* (hoy por defecto; futura para ver el efecto de un cambio programado).
- **Resultado** (columna derecha fija):
  - `KpiTile`: **costo empresa por persona/mes**, **personas por puesto**, **costo del puesto/mes**, **costo por día** y **por hora**.
  - Desglose en `DetailSection`: haberes (base, gratificación, no imponibles), descuentos del trabajador (solo para mostrar el líquido estimado), aportes del empleador (SIS, cesantía, mutual básica y adicional, reforma de pensiones) y provisiones (vacaciones, indemnización); cada monto con `TrazaMonto`.
  - **Líquido estimado** del trabajador, marcado «estimado, sin descuentos personales».
- **Comparar escenarios** (iPad y escritorio): hasta tres columnas (por ejemplo 4x4 de 12 h vs 5x2 de 8,4 h vs 7x7), con las diferencias resaltadas. En el teléfono, un escenario y un `Segmented` para cambiar.
- Acciones: **Guardar simulación** (opcional, con nombre), «Copiar como línea de cotización» (deshabilitada con `Tooltip` «Disponible con CPQ» mientras CPQ no esté activo), «Exportar PDF» con la marca del tenant.
- Estados: sin datos suficientes («Elige un patrón y un sueldo»), con un indicador faltante (bloquea el resultado y explica cuál falta y qué hacer), con valores manuales (aviso `warning`), resultado.

### 4.7 Plataforma → Indicadores (portal de plataforma)
Cola de alertas: fuente sin respuesta, valor anómalo retenido, ley publicada pendiente de cargar. Cada ítem: indicador, valor capturado vs esperado (`CambioValor`), fuentes consultadas, desde cuándo. Acciones: **Confirmar valor** (con evidencia), **Rechazar y mantener el vigente**, **Cargar valor manual** (valor, vigente desde, enlace a la norma o documento adjunto, motivo). Confirmar o cargar a mano pide **segunda firma** de otro operador si el valor afecta a todos los tenants. Teléfono: ver y confirmar.

### 4.8 Bandeja y avisos
- Ítem de Bandeja «UF sin actualizar desde hace 2 días · se usa el último valor publicado».
- Ítem «Variable “Cotización adicional mutual” pendiente de tu aprobación».
- `AvisoRecalculo` en sus dos variantes, aislado, con la hoja «Ver cambios».

## 5. Estados obligatorios por pantalla
Loading (skeleton con la forma), vacío con acción, error con «Reintentar», sin permisos (`Forbidden`: un vendedor sin `core:sueldos.montos.read` ve el simulador sin el desglose del sueldo de capas sensibles), y en las hojas: vista previa (dry-run), pendiente de aprobación, confirmando, éxito y error de regla con el texto del servidor.

## 6. Archivos del export
`Indicadores.dc.html`, `IndicadorDetalle.dc.html`, `VariablesEmpresa.dc.html`, `ProgramarCambio.dc.html`, `HistorialRemuneraciones.dc.html`, `Simulador.dc.html`, `SimuladorComparar.dc.html`, `PlataformaIndicadores.dc.html`, `AvisosMotor.dc.html` (Bandeja + `AvisoRecalculo`), `Componentes.dc.html` (`TrazaMonto`, `EstadoFuente`, `CambioValor`, `AvisoRecalculo` con todos sus estados), y `shots/` con 375/1024/1280 (claro y, donde se pide, oscuro).
