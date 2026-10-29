# DESIGN PROMPT — MOTOR DE SUELDOS: INDICADORES, VARIABLES DEL TENANT Y SIMULADOR DE COSTO (OPAI 2.0)

**Tarea:** CAR-71 · **Especificación:** [`docs/2.0/modulos/motor-sueldos.md`](../modulos/motor-sueldos.md) (**aprobada por Carlos el 29-oct-2026**, decisiones en su §16; ADR-056) · **Estado:** listo para copiar.

Para pegar completo en Claude Design, en un proyecto nuevo «Motor de sueldos», **con el Design System de OPAI 2.0 V2** (el oficial de la organización; en el repo: `packages/ds/src/tokens.css` y `docs/2.0/design/export-ds-2.0/`). **Nunca el estilo de OPAI 1.0.** No crees colores, tipografías, radios ni componentes nuevos salvo los de la sección 3; todo lo demás se compone con los existentes (`AppShell`, `Cabecera`, `SplitScreen`, `FilaSeleccionable`, `Seccion`, `SeccionTarjeta`, `Pares`, `Table`, `Sheet`, `Dialog`, `Popover`, `Tooltip`, `Select`, `Combobox`, `Input`, `InputFecha`, `RadioGroup`, `Switch`, `Badge`, `Chip`, `ChipToggle`, `Segmentado`, `Tabs`, `Timeline`, `Vigencia`, `KpiTile`, `Alerta` (hoy exportada desde `acceso`; si no sirve fuera del acceso, proponer su variante general), `avisar` + `Toaster`, `Empty`, `ErrorState`, `Forbidden`, `Loading`).

Resultado esperado: el **export HTML standalone**, una pantalla por archivo, nombrado como en la sección 6, más una captura por pantalla y viewport. Es la referencia de contenido y jerarquía, no código a copiar.

---

## 1. Contexto

OPAI 2.0 es un SaaS operacional multi-tenant y agent-first para empresas intensivas en personal (seguridad primero; tenant de ejemplo en el export: «Atlas Seguridad SpA»; nunca la marca Gard). Todo lo que se ve en pantalla existe también como capacidad por API y MCP, y el agente interno (ADR-049) puede hacer lo mismo con los permisos del usuario.

El **motor de sueldos** es un servicio del Núcleo que calcula, desde el sueldo bruto de una capa (instalación, puesto o RUT; ADR-036), el **costo empresa** por persona, por puesto, por día y por hora, con los **indicadores legales** (UF, UTM, ingreso mínimo, topes, AFP, SIS, cesantía, mutual, reforma de pensiones, gratificación) y las **variables propias del tenant**, todo **versionado por vigencia**. Lo usan el cotizador (CPQ) y, más adelante, Nómina.

Tres públicos:
- **Administrador, owner o alguien en quien deleguen:** ve y edita **todos los valores** de la empresa en una sola página (UF, UTM, IMM, tasas, topes y variables propias). Confirma solo, sin segunda firma, los valores que OPAI publica como propuestos o retenidos. Antes de confirmar, ve el impacto.
- **Vendedor:** simula el costo de un puesto (4x4, 5x2…) y entiende de dónde sale cada peso.
- **Operador de Plataforma (OPAI):** solo vigila el estado de las fuentes y sus alertas. No confirma valores de las empresas.

**Nombres de ejemplo:** todos son ficticios («Ana Rojas», «Atlas Seguridad SpA»); nunca personas ni empresas reales.

**Formatos:** español de Chile; `dd-mm-aaaa`; `HH:mm`; CLP `$ 553.553`; UF `UF 41.237,01` (dos decimales al mostrar); porcentajes `10,49 %`; montos con `t-numeric`, RUT en `t-mono`. Cifras de ejemplo: las de §13 y el anexo A de la especificación (sin datos personales).

**Viewports:** 375, 1024 y 1280 en todas las pantallas; modo oscuro al menos en Remuneraciones, Simulador y la hoja «Cambiar valor».

**Principios (ADR-014, ADR-017):** una acción principal por pantalla; color solo para estado; foco visible, skeleton con la forma del contenido, vacío con acción, movimiento 150–200 ms con `prefers-reduced-motion`; touch ≥ 44 px; en iPad y escritorio el título vive en la barra del shell. En el teléfono se **ve, se simula y se aprueba**; editar variables y comparar escenarios en paralelo es de iPad y escritorio (en el teléfono, un escenario a la vez).

## 2. Navegación

- **Configuración → Remuneraciones** (un ámbito nuevo del centro de Configuración, ADR-018; no es una entrada del menú): pestañas **Valores** (todos los indicadores legales y las variables de la empresa en una sola página) e **Historial**.
- **Personas → Cargos y sueldos**: acción secundaria «Simular costo» en la cabecera y en cada capa de sueldo («Simular con esta capa»).
- **⌘K**: acciones «Simular costo de un puesto» y «Ver indicadores vigentes».
- **Plataforma → Fuentes** (portal de plataforma, solo `platformRole`): estado de las fuentes y alertas, solo lectura.
- **Bandeja de Inicio**: las alertas que le tocan al tenant (valor propuesto o retenido por confirmar, indicador atrasado, cambio de un agente pendiente de aprobación, cotizaciones con valores desactualizados).

## 3. Componentes que faltan (definirlos con sus estados)

| Componente | Qué es | Especificación |
|---|---|---|
| `TrazaMonto` | «De dónde sale» un monto | `Popover` (escritorio: al pasar o enfocar; teléfono: al tocar) con la fórmula en palabras («Sueldo imponible × 3,5 % cotización del empleador, reforma de pensiones»), los valores usados con su vigencia y fuente, y el resultado. Reutilizable por CPQ y Nómina. Estados: normal, con valor manual (badge `warning` «Manual»), con valor faltante (`danger`). |
| `EstadoFuente` | Salud de la fuente de un indicador | `Badge` con tono del DS: **Al día** (`success`), **Atrasado** (`warning`, «última captura hace 3 días»), **Anómalo, por confirmar** (`danger`), **Propuesto, por confirmar** (`info`, para lo que no se lee por máquina, como el IMM), **Propio de la empresa** (`accent`: escrito a mano, ya no sigue la fuente). Con `Tooltip` que dice la fuente y la última captura. |
| `CambioValor` | Antes → después de un valor | Valor anterior tachado en `fg-subtle`, flecha, valor nuevo en `t-numeric`, variación en % con tono (`warning` si supera el umbral). Para historial, impacto y avisos. |
| `AvisoRecalculo` | Aviso en una cotización abierta cuyos valores cambiaron | `Alerta` `warning` con «Cambiaron 2 valores desde que calculaste esta cotización (UF, IMM). Costo +$ 41.300/mes.» y acciones «Ver cambios» (abre hoja con `CambioValor`) y «Recalcular». Variante congelada `info` para cotizaciones enviadas: «Valores congelados al 14-10-2026». CPQ lo usará; aquí se diseña aislado. |

## 4. Pantallas

### 4.1 Valores: todos en una sola página (`/configuracion/remuneraciones`)
Una sola lista agrupada por sección, con los **indicadores legales** y las **variables de la empresa** juntos:
- **Unidades:** UF del día y UTM del mes.
- **Ingreso mínimo y topes:** IMM, tope imponible AFP y salud, tope AFC y tope de gratificación.
- **Previsión:** comisión por AFP, SIS y aporte del empleador de la reforma.
- **Cesantía:** empleador indefinido y plazo fijo, y trabajador.
- **Accidentes del trabajo:** cotización básica y adicional de la mutual o el ISL, con la fecha de su resolución.
- **Impuesto único:** tramos en UTM.
- **Supuestos de costeo:** AFP y salud para cotizar, días de feriado al año, colchón de feriados y forma de las provisiones.
- **Jornada:** horas semanales por defecto.
- **Gratificación:** modalidad por defecto.
- **Personalizadas.**

Cada fila: nombre, valor vigente, «vigente desde», `EstadoFuente` (o «Propio de la empresa»), fuente con enlace externo, próximo cambio programado si lo hay (chip `info`) y quién lo cambió por última vez.

Arriba, un resumen con `KpiTile` (UF hoy, UTM del mes, IMM) y, si hay valores por confirmar, una `Alerta` con «Confirmar» que lleva a cada uno.

Las acciones de cada fila, para owner, admin o quien tenga la delegación:
- **Cambiar valor**, en todos los valores, también la UF, el IMM y las tasas.
- **Confirmar** o **Rechazar**, en los valores propuestos o retenidos.
- **Volver a seguir la fuente**, en los valores propios.

Filtro por fecha («Ver valores al…», `InputFecha`). Vacío de «Personalizadas»: «Aún no tienes variables propias» con «Crear variable».

Teléfono: lista por sección con valor y estado; ahí se ve y se confirma. Cambiar un valor se hace en iPad o escritorio.

### 4.2 Detalle de un indicador (hoja o panel derecho)
- Valor vigente, unidad, periodicidad, **fuente oficial** con enlace y fuente de contraste.
- **Historial por vigencia** (`Table`: vigente desde, hasta, valor, `CambioValor` respecto del anterior, origen «sigue la fuente» o «propio», quién lo confirmó o lo cambió: persona, agente vía persona u «OPAI · actualización automática»).
- Si el valor es propio, el valor publicado por la fuente al lado (`CambioValor`) y la acción «Volver a seguir la fuente».
- **Registro de capturas** (`Timeline`): cada intento del trabajo diario con resultado (capturado igual, capturado nuevo, fuente sin respuesta, valor fuera de rango y retenido).
- «Qué usa este valor»: cuántas cotizaciones abiertas, capas de sueldo y simulaciones guardadas lo usan (con enlaces).

### 4.3 Confirmar un valor propuesto o retenido (hoja)
Valor publicado por OPAI frente al vigente (`CambioValor`), fuente y norma con enlace, motivo de la retención (por ejemplo, «variación de 4 % en un día») y vista previa del impacto. Acciones: **Confirmar** y **Rechazar** (este último con motivo). Una sola persona basta, sin segunda firma. Si lo pidió un agente sin autonomía para eso, la hoja aparece en la cola de aprobaciones con «Propuesto por el agente de Ana Rojas».

### 4.4 Cambiar valor (hoja), para cualquier indicador o variable
Campos: valor nuevo (con unidad), **vigente desde** (hoy o futuro; pasado solo con permiso especial y motivo), motivo (obligatorio), adjunto opcional (resolución de la mutual, por ejemplo). Antes de confirmar, **vista previa de impacto** (dry-run): cotizaciones abiertas afectadas con su diferencia mensual (`CambioValor`), capas de sueldo cuyo costo cambia y total mensual estimado. Si es un indicador legal, aviso de que el valor pasa a ser **propio de la empresa** y deja de seguir la fuente. Estados: vista previa, confirmando, éxito («Regirá desde 01-11-2026»), error de regla (solape de vigencias, valor fuera de rango) y **pendiente de aprobación**, solo cuando lo pidió un agente sin autonomía para ese cambio («Propuesto por el agente de Ana Rojas · espera aprobación»). No hay segunda firma para las personas. En el teléfono: solo aprobar o rechazar una propuesta existente, con su vista previa.

### 4.5 Historial (pestaña)
`Timeline` de todo cambio: valores capturados de la fuente, confirmados, rechazados o cambiados a mano, y variables programadas, con autor (persona, agente vía persona, o «OPAI · actualización automática»), filtros por tipo y por variable, y enlace a la auditoría.

### 4.6 Simulador de costo (`/cargos/simular`, también hoja desde Cargos y sueldos)
- **Entrada** (columna izquierda en 1024/1280; pasos en el teléfono):
  - *Sueldo:* «Usar una capa existente» (`Combobox` de instalación o puesto) o «Ingresar a mano»: sueldo base, gratificación (legal con tope, monto fijo, ninguna), colación, movilización, bonos (imponible sí/no).
  - *Contrato:* indefinido o plazo fijo; AFP y salud (por defecto, las de Variables de la empresa).
  - *Turno:* patrón del catálogo del tenant (`Select`: 4x4, 5x2, 7x7, 14x14, 2x5, 3x4…), horario (`InputHora` inicio y fin, con cruce de medianoche), horas semanales resultantes con aviso si superan la jornada legal vigente.
  - *Fecha de cálculo* (hoy por defecto; futura para ver el efecto de un cambio programado).
- **Resultado** (columna derecha fija):
  - `KpiTile`: **costo empresa por persona/mes**, **personas por puesto**, **costo del puesto/mes**, **costo por día** y **por hora**.
  - Desglose en `Seccion`: haberes (base, gratificación, no imponibles), descuentos del trabajador (solo para mostrar el líquido estimado), aportes del empleador (SIS, cesantía, mutual básica y adicional, reforma de pensiones) y provisiones (vacaciones como el promedio mensual de los días de feriado del año; indemnización por años de servicio con su tope), calculadas como lo hace contabilidad, sin colación, movilización ni aportes en la base. Cada monto lleva `TrazaMonto`.
  - **Líquido estimado** del trabajador, marcado «estimado, sin descuentos personales».
- **Comparar escenarios** (iPad y escritorio): hasta tres columnas (por ejemplo 4x4 de 12 h vs 5x2 de 8,4 h vs 7x7), con las diferencias resaltadas. En el teléfono, un escenario y un `Segmentado` para cambiar.
- Acciones: **Guardar simulación** (opcional, con nombre), «Copiar como línea de cotización» (capacidad de CPQ; deshabilitada con `Tooltip` «Disponible con CPQ» mientras CPQ no esté activo), «Exportar PDF» con la marca del tenant.
- Estados: sin datos suficientes («Elige un patrón y un sueldo»), con un indicador faltante (bloquea el resultado y explica cuál falta y qué hacer), con valores manuales (aviso `warning`), resultado.

### 4.7 Plataforma → Fuentes (`/platform/indicadores`)
Estado de cada fuente oficial: última captura, resultado, alertas abiertas (fuente sin respuesta, valor anómalo publicado como retenido, ley nueva publicada como propuesta) y cuántas empresas tienen el valor pendiente de confirmar. Es de **solo lectura**: Plataforma no confirma valores de las empresas. Teléfono: ver.

### 4.8 Bandeja y avisos
- Ítem de Bandeja «UF sin actualizar desde hace 2 días · se usa el último valor publicado».
- Ítem «IMM $ 553.553 publicado por OPAI (Ley 21.830) · por confirmar».
- Ítem «El agente de Ana Rojas propone cambiar “Cotización adicional mutual” · pendiente de tu aprobación».
- `AvisoRecalculo` en sus dos variantes, aislado, con la hoja «Ver cambios».

## 5. Estados obligatorios por pantalla
Loading (skeleton con la forma), vacío con acción, error con «Reintentar», sin permisos (sin `core:estructuras.read_sensible` no aparece «Usar una capa existente»: solo se simula con sueldo ingresado a mano, R28; sin `core:remuneraciones.simular`, `Forbidden`), y en las hojas: vista previa (dry-run), pendiente de aprobación, confirmando, éxito y error de regla con el texto del servidor.

## 6. Archivos del export
`Valores.dc.html`, `ValorDetalle.dc.html`, `ConfirmarValor.dc.html`, `CambiarValor.dc.html`, `HistorialRemuneraciones.dc.html`, `Simulador.dc.html`, `SimuladorComparar.dc.html`, `PlataformaFuentes.dc.html`, `AvisosMotor.dc.html` (Bandeja + `AvisoRecalculo`), `Componentes.dc.html` (`TrazaMonto`, `EstadoFuente`, `CambioValor`, `AvisoRecalculo` con todos sus estados), y `shots/` con 375/1024/1280 (claro y, donde se pide, oscuro).
