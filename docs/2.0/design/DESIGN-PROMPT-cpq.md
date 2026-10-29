# DESIGN PROMPT — CPQ: COTIZADOR, VERSIONES, APROBACIÓN, COTIZACIÓN RÁPIDA, MODELO DE COSTEO Y AGENTE (OPAI 2.0)

> **No enviar a Claude Design hasta que Carlos apruebe `docs/2.0/modulos/cpq.md` (ADR-047).** Si sus respuestas a las preguntas del §14 cambian algo, se ajusta este prompt antes de usarlo. Tarea: CAR-66.

Para pegar completo en Claude Design, en el proyecto del CRM de OPAI 2.0, **con el Design System de OPAI 2.0 V2** (`packages/ds/src/tokens.css` y `docs/2.0/design/export-ds-2.0/`; el mismo del export `docs/2.0/diseño/export-crm/`). **Nunca el estilo de OPAI 1.0.** No crees colores, tipografías, radios ni componentes nuevos salvo los de la sección 3; todo lo demás se compone con los existentes (`AppShell`, `ListScreen`, `SplitScreen`, `DetailScreen`, `PlanillaScreen`, `FormScreen`, `Seccion`, `Pares`, `Table`, `Sheet`/`Dialog`, `Popover`, `Tooltip`, `Select`, `Combobox`, `Segmentado`, `Tabs`, `Badge`, `Chip`, `KpiTile`, `BarraProgreso`, `Timeline`, `Alerta`, `Estado`, `CommandPalette`, `avisar`).

Resultado esperado: el **export HTML standalone**, una pantalla por archivo, nombrado como en la sección 7, más una captura por pantalla y viewport. Es la referencia de contenido y jerarquía de los Briefs 08 y 10 de CPQ, no código a copiar.

---

## 1. Contexto

OPAI 2.0 es un SaaS operacional multi-tenant y agent-first para empresas intensivas en personal (seguridad primero; en el export usa «Atlas Seguridad SpA», nunca Gard). Todo lo que se ve en pantalla existe también como capacidad por API y MCP, y el **agente interno** de OPAI opera las mismas acciones con vista previa y confirmación. La UI no inventa flujos.

**CPQ** (cotizador) cuelga del CRM: toda cotización pertenece a un **negocio** y puede cubrir **varias instalaciones** del negocio (una **sección** por instalación y una sección **Común**). El precio sale del **modelo de costeo del tenant** (variables, fórmulas, ítems y paquetes copiados de la plantilla de su vertical) y del **margen financiero** (margen, costo financiero, póliza de garantía, responsabilidad civil). Cada monto se puede **explicar** (traza). Especificación: `docs/2.0/modulos/cpq.md` (reglas R1–R54, criterios CA1–CA17).

**Formatos:** español de Chile; `dd-mm-aaaa`; `HH:mm`; CLP `$ 9.527.767`; UF `UF 241,35`; porcentajes `12,4 %`; códigos `CPQ-2026-412 · v3` en `t-mono`; montos de planilla en `t-numeric`/`t-mono` alineados a la derecha. Vocabulario de la vertical reemplazable (instalación, guardia, posición): nada de escudos ni íconos de seguridad como identidad.

**Viewports:** 375, 768 (iPad vertical, solo el cotizador), 1024 y 1280 en todas las pantallas; modo oscuro al menos en el cotizador y la aprobación.

**Principios (ADR-014, ADR-017, ADR-042 (9)):** una acción principal por pantalla; color solo para estado; foco visible; skeleton con la forma del contenido; vacío con acción; movimiento 150–200 ms con `prefers-reduced-motion`; touch ≥ 44 px; en iPad y escritorio el título vive en la barra del shell. **Edición completa solo en iPad (también vertical, 768 px) y escritorio**; en el teléfono se ve, compara, aprueba y se habla con el agente. La cotización rápida en el teléfono es una propuesta pendiente de Carlos (pregunta 7 de `cpq.md`): diséñala igual, marcada como tal.

## 2. Navegación

Área **Comercial**: Solicitudes · Negocios · **Cotizaciones** (`NAVEGACION.md` §2). La ficha del negocio tiene la pestaña **Cotizaciones**. «Modelo de costeo» es una acción secundaria de Cotizaciones, visible solo para owner y admin. ⌘K ofrece «Nueva cotización» y «Preguntar a OPAI».

## 3. Componentes que faltan (definirlos con sus estados)

| Componente | Qué es | Especificación |
|---|---|---|
| `PlanillaCotizacion` | Árbol editable sección → (grupo) → línea | Filas plegables por sección con subtotal; columnas: nombre, detalle (patrón, horario, posiciones/personas o cantidad), sueldo o precio unitario, costo mensual, venta mensual; edición en celda con teclado (Tab, Enter, Esc), arrastrar para reordenar, «+ Puesto», «+ Ítem», «+ Paquete» al final de cada sección; línea deshabilitada atenuada (no borrada); ícono de «oculto al cliente». Estados: cargando, recalculando (la cifra cambia con transición suave, sin saltos de layout), error de validación en la celda, solo lectura (versión enviada). |
| `ResumenCotizacion` | Panel fijo a la derecha (escritorio) o arriba plegable (iPad vertical) | Costo mensual, **venta mensual** (lo más visible), pagos únicos, `SemaforoMargen`, instrumentos financieros desplegables (costo financiero, póliza, RC) con su efecto, dotación (posiciones · personas), UF usada con fecha, advertencias (`Alerta`). Acción principal según estado: «Dejar lista» / «Pedir aprobación» / «Enviar». |
| `SemaforoMargen` | Margen efectivo contra el mínimo del tenant | Valor grande + barra con marca del mínimo; `success` sobre el mínimo más el umbral de alerta del tenant (p. ej. 3 puntos), `warning` entre el mínimo y ese umbral, `danger` bajo el mínimo; texto siempre presente (no solo color). |
| `TrazaMonto` | «¿De dónde sale?» de un monto | `Popover` al pasar el cursor o tocar un monto: fórmula en lenguaje de negocio, variables con su valor y **de dónde salió** (tenant, cuenta, instalación, cotización, línea), ítem y su copia, enlace «ver todo» que abre un `Sheet` con el árbol completo. |
| `SimuladorMargen` | Deslizador de margen o «precio objetivo» | Cambia en vivo venta, margen y semáforo sin guardar; «Aplicar» es explícito; muestra el modo de margen (sobre venta, markup, sobre mano de obra). |
| `DiffVersiones` | Comparación lado a lado | Dos columnas (versiones o alternativas), filas emparejadas, agregado/quitado/cambiado con `Badge` y tono, deltas de venta y margen arriba. En el teléfono: una columna que **reutiliza `AntesDespues`** del DS. |
| Origen del sueldo (**extiende `BadgeCapa`/`OrigenMonto`** del DS, no crea otro) | Chip en la línea de puesto | Agrega a las capas existentes «Referencia del cargo» y «Escrito a mano»; tono neutro; tooltip con la vigencia. Sin permiso, el monto se muestra como «—». |
| `TarjetaPlanAgente` (**componente del agente interno del núcleo**, no de CPQ; aquí solo se muestra su uso en CPQ y debe coincidir con el export propio del agente cuando exista) | Plan del agente interno | Lista de pasos (lectura · vista previa · escritura · requiere aprobación) con el delta de cada uno («venta $ 9,1 M → $ 9,8 M · margen 13 % → 18 %»), **supuestos** destacados (patrón, sueldo, margen, UF) editables antes de confirmar, botones «Aprobar todo» / «Paso a paso» / «Cancelar»; pasos irreversibles con candado y «queda para aprobación humana». |
| `EditorFormula` | Editar una fórmula del modelo | Campo monoespaciado con autocompletado de variables y funciones (`min`, `max`, `redondear`, `si`), validación en vivo (referencia rota, unidad incompatible, división que puede ser cero) y vista de prueba con valores de ejemplo y su traza. |

## 4. Pantallas

### 4.1 Lista de cotizaciones (`/cotizaciones`)
`SplitScreen` en 1024/1280; lista en el teléfono. Filtros con chips: estado (Borrador, Por aprobar, Lista, Enviada, Aceptada, Vencida…), «Vigente», «Vence en 7 días», «Bajo margen», responsable del negocio, etiqueta. Fila: código y versión, título, cuenta · negocio, venta mensual, margen con punto de semáforo (si puede ver costos), estado (`Badge`), vence. Acción principal **«Nueva cotización»** (abre la cotización rápida). Acción secundaria «Modelo de costeo» (owner/admin). Vacío: «Aún no hay cotizaciones» con «Nueva cotización».

### 4.2 Pestaña Cotizaciones del negocio
Vigente arriba en una `Card` (código, versión, estado, venta, margen, vence, «Abrir»); debajo alternativas («Opción A/B/C», con «Comparar») e historial de versiones y cotizaciones rechazadas o reemplazadas. Acciones: «Nueva cotización», «Nueva alternativa», «Marcar como vigente».

### 4.2 b Valores del modelo en la cuenta y la instalación
En las fichas de cuenta e instalación, una sección «Valores para cotizar» (solo si CPQ está activo) con las variables de ámbito cuenta o instalación (p. ej. días de pago pactados, colación local, zona extrema): valor propio o «usa el del tenant».

### 4.3 Cotizador (`/cotizaciones/[id]`) — la pantalla clave
- **Escritorio 1280:** cabecera con código · versión, título editable, estado, negocio y cuenta (enlaces), `Segmentado` «Vista interna / Vista cliente», menú (Duplicar, Nueva alternativa, Comparar, Historial, Actualizar al modelo vigente, Archivar). Cuerpo: `PlanillaCotizacion` a la izquierda (≈ 2/3) y `ResumenCotizacion` fijo a la derecha. Debajo de la planilla, sección plegable **Condiciones comerciales** (pago, reajuste IPC/IMO/polinómico con pesos, duración, inicio, validez, póliza de garantía, RC, moneda de presentación).
- **iPad 1024 horizontal y 768 vertical:** misma planilla a ancho completo; el resumen como barra superior fija y plegable; edición completa.
- **Teléfono 375:** solo lectura. Arriba, el resumen (venta, semáforo, estado, vence); debajo, secciones plegadas con subtotal; tocar un monto abre su traza en hoja. Acciones: «Aprobar» (si corresponde), «Comparar», «Preguntar a OPAI». Aviso discreto: «Para editar, usa iPad o escritorio».
- **Avisos en la cabecera** (`Alerta`): «Hay un modelo de costeo nuevo · ver diferencia · actualizar», «Precio subvalorado: requiere aprobación», «Falta el valor UF de hoy», «Versión enviada: editar crea la v4».
- Muestra **Vista cliente**: misma estructura sin costos, sueldos ni margen, solo lo marcado visible; las líneas ocultas no aparecen.

### 4.4 Agregar o editar línea de puesto (hoja)
Sección (instalación o Común) y grupo; nombre; cargo (`Combobox`); funciones; **patrón** (4x4, 7x7, 14x14, 5x2, 2x5, 3x4 del catálogo del tenant); días (chips L M M J V S D) y tramos horarios (con cruce de medianoche visible: «20:00 → 08:00 +1»); horas semanales calculadas con aviso sobre la jornada legal; **posiciones** y **personas por posición** sugeridas («2 · sugerido por 4x4 de 12 h», sobrescribir pide motivo); sueldo bruto con `OrigenSueldo`; colación y otros conceptos. Pie: costo mensual y venta de la línea en vivo. Estados: sueldo bajo el mínimo legal (error), vista previa, guardando.

### 4.5 Agregar ítem o paquete (hoja)
`Combobox` del catálogo por categoría con precio y modo de cálculo («por persona/mes», «por rotación», «amortizable en 12 meses», «pago único»); cantidad; precio sobrescrito (queda marcado); visible al cliente; para adicionales, margen propio. Pestaña «Paquetes»: tarjetas de paquetes del tenant.

### 4.6 Traza y simulador
`TrazaMonto` sobre: costo de una línea de puesto (sueldo → costo empleador → × personas → + feriados), un ítem por rotación, el costo financiero y la venta total. `SimuladorMargen` abierto desde el semáforo del resumen.

### 4.7 Versiones y comparar (`/cotizaciones/[id]/comparar`)
Historial en `Timeline` (v1 enviada 12-10-2026 · v2 reemplazada · v3 borrador) con quién y por qué. `DiffVersiones` entre dos versiones o dos alternativas. Teléfono: una columna.

### 4.8 Aprobación por margen
- **Pedir aprobación** (hoja): margen actual vs. mínimo, comentario opcional, quién aprueba; «Retirar pedido» mientras esté pendiente.
- **Decidir** (hoja, también en el teléfono, abierta desde la Bandeja de Inicio; **reutiliza `PanelAprobacion`** del DS): resumen de la versión, margen y semáforo, advertencia de subvaloración si aplica, motivo del pedido, diff contra la versión anterior si existe; «Aprobar» (principal) y «Rechazar» (con motivo). Mensaje cuando quien pide es quien aprueba.
- **Ítem en la Bandeja de Inicio**: «CPQ-2026-412 v3 · margen 8,7 % · pide Ana Rojas».

### 4.9 Cotización rápida (hoja; en el teléfono, propuesta de la pregunta 7)
Paso único: cuenta (`Combobox`, o «prospecto nuevo» con nombre), negocio (existente o «crear en Prospección»), instalación (existente o nueva con dirección opcional), uno o más **paquetes** con posiciones y horario, margen (por defecto del tenant). Pie fijo con venta y semáforo en vivo y «Crear cotización». Estados: vista previa («Se creará el negocio X y la cotización CPQ-2026-NNN v1»), éxito con «Abrir en el cotizador».

### 4.10 Enviar
Hoja con la versión que se congela, UF que se fija, validez, vista previa del documento (placeholder: el formato lo define CAR-68) y destinatarios del negocio. Confirmación explícita: «Enviar congela esta versión». Si lo pidió el agente: estado «Esperando aprobación humana» con quién debe aprobar.

### 4.11 Crear puestos al ganar (hoja, para RRHH)
Lista por línea de guardias de la cotización aceptada: instalación, nombre, patrón, horario, **un puesto por posición**, sueldo cotizado (o «tomará el de la instalación»), casilla por puesto, ya creados marcados (no se duplican). Acción «Confirmar N puestos». Vacío: «Esta cotización no tiene guardias: no se crean puestos».

### 4.12 Modelo de costeo (`/cotizaciones/modelo`, iPad y escritorio, owner/admin)
Cabecera: versión publicada (v7 · 12-10-2026) y borrador en curso; acciones «Probar» y «Publicar». Pestañas:
- **Variables:** tabla (nombre, clave, tipo, unidad, defecto, ámbito, visible al cliente); parámetros legales de plataforma en una sección aparte, de solo lectura, con vigencia.
- **Fórmulas:** lista con nombre y descripción; `EditorFormula` al abrir.
- **Ítems:** catálogo por categoría (código, nombre, unidad, precio, modo de cálculo, por defecto, visible); archivar en vez de borrar.
- **Paquetes:** tarjetas editables (línea de puesto + ítems).
- **Versiones:** historial de publicaciones y **Novedades de la plantilla de la vertical** con sus diferencias y «Adoptar en el borrador».
- **Probar** (hoja o pantalla): las últimas cotizaciones enviadas recalculadas con el borrador, con venta antes/después y delta de margen; errores de validación que impiden publicar, cada uno con enlace a la fórmula o variable.

### 4.13 Agente interno sobre CPQ
Panel lateral (escritorio/iPad) u hoja completa (teléfono) del agente con la conversación y la `TarjetaPlanAgente`. Diseña tres momentos: (a) «Cotiza lo que pide esta solicitud» → plan de 2 pasos (convertir solicitud + crear cotización) con supuestos; (b) «Sube el margen a 18 % y agrega un guardia nocturno» → pregunta de aclaración («¿En qué instalación? Planta Norte / Bodega Sur») y después plan con deltas; (c) «¿Por qué cuesta tanto?» → respuesta con los tres mayores componentes y enlaces a la traza. El texto de la solicitud del cliente se muestra como **cita externa**, nunca como instrucción.

## 5. Estados obligatorios por pantalla
Loading (skeleton con la forma de la planilla), vacío con acción, error, sin permisos (incluido «sin permiso para ver costos»: montos de costo y sueldo como «—» y margen en porcentaje), solo lectura (enviada, aceptada, vencida), recalculando, desactualizada (modelo nuevo), subvalorada, falta UF; y en las hojas: vista previa (dry-run), confirmando, éxito y error de regla de negocio con el texto del servidor.

## 6. Datos de ejemplo
Cuenta «Atlas Seguridad SpA» como empresa propia y clientes ficticios («Logística Andina SpA», «Constructora Pacífico Ltda.»). Una cotización de 3 secciones (Planta Norte: 2 posiciones 24/7 4x4; Bodega Sur: 1 posición nocturna 20:00–08:00; Común: supervisor 5x2 y una camioneta de ronda), venta ≈ $ 18,9 M/mes, margen 10,4 % con mínimo 10 %, póliza de garantía activa. Una alternativa «Opción B» sin camioneta. Nunca RUT, nombres ni sueldos reales.

## 7. Archivos del export
`Cotizaciones.dc.html`, `NegocioCotizaciones.dc.html`, `Cotizador.dc.html`, `CotizadorVistaCliente.dc.html`, `LineaPuesto.dc.html`, `ItemPaquete.dc.html`, `Traza.dc.html`, `Comparar.dc.html`, `Aprobacion.dc.html`, `CotizacionRapida.dc.html`, `Enviar.dc.html`, `CrearPuestos.dc.html`, `ModeloCosteo.dc.html`, `ModeloProbar.dc.html`, `ValoresCotizar.dc.html`, `AgenteCPQ.dc.html`, y `shots/` con 375/1024/1280 (oscuro: Cotizador y Aprobación).
