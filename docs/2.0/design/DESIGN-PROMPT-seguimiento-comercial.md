# DESIGN PROMPT — SEGUIMIENTO DE COTIZACIONES Y NEGOCIOS (OPAI 2.0)

> **Estado:** listo para copiar, **pendiente de la aprobación de Carlos de `docs/2.0/modulos/seguimiento-comercial.md`** (ADR-047: primero las reglas, luego el diseño). Tarea: CAR-67. Se diseña con las recomendaciones de la §16 de la especificación; si Carlos decide otra cosa, se ajusta antes de pegarlo.

Para pegar completo en Claude Design, en el proyecto del CRM v3 (`09192972-8bd5-4ed8-a86a-3308e220a07b`), **con el Design System de OPAI 2.0 V2** (el mismo del export `docs/2.0/diseño/export-crm/`; tokens de `packages/ds/src/tokens.css`, sistema y patrones de `docs/2.0/design/export-ds-2.0/`). **Nunca el estilo de OPAI 1.0.** No crees colores, tipografías, radios ni componentes nuevos salvo los de la sección 3; todo lo demás se compone con los existentes (`AppShell` —el título va en su barra en iPad y escritorio—, `SplitScreen`, `FilaSeleccionable`, `Seccion`, `Pares`, `Table`, `Sheet`, `Dialog`, `Select`, `Combobox`, `Checkbox`, `RadioGroup`, `Switch`, `InputFecha`, `InputHora`, `Badge`, `Chip`, `ChipToggle`, `Segmentado`, `Tabs`, `Timeline`, `Vigencia`, `KpiTile`, `Card`, `Alerta`, `avisar`/`Toaster`, `Empty`, `ErrorState`, `Forbidden`, `Loading`).

Resultado esperado: el **export HTML standalone**, una pantalla por archivo, nombrado como en la sección 7, más una captura por pantalla y viewport. Es la referencia de contenido y jerarquía del seguimiento comercial, no código a copiar.

---

## 1. Contexto

OPAI 2.0 es un SaaS operacional multi-tenant y agent-first para empresas intensivas en personal (seguridad primero; en el export, la empresa de ejemplo es «Atlas Seguridad SpA» y el vendedor «Camila Rojas»; nada de Gard fijo). Todo lo que se ve existe también como capacidad por API y MCP: un agente puede hacer lo mismo con vista previa, y lo irreversible (enviar al cliente, ganar) espera la aprobación de una persona.

El CRM ya tiene aprobados Negocios (tablero y lista), la ficha del negocio y Configuración → Comercial; el PR 2 (actividad unificada, contactos en varias cuentas) está en `DESIGN-PROMPT-crm-pr2.md`. Este prompt cubre **lo que pasa después de enviar una cotización**: el seguimiento por pasos configurable por empresa, la respuesta del cliente, el cierre y los negocios detenidos. Especificación: `docs/2.0/modulos/seguimiento-comercial.md` (reglas R1–R26).

**Idea central para el vendedor:** «abro OPAI y sé qué me toca hoy; cada pendiente se resuelve con uno o dos toques, sin abrir la ficha».

**Formatos:** español de Chile; `dd-mm-aaaa`; `HH:mm`; días relativos («hoy», «mañana», «hace 3 días hábiles»); CLP `$ 2.500.000`; teléfonos `+56 9 8765 4321`. Vocabulario de la vertical reemplazable.

**Viewports:** **375 (teléfono), 1024 (iPad) y 1280 (escritorio)** en todas las pantallas; modo oscuro al menos en Pendientes y en la hoja «Ejecutar paso · correo».

**Principios (ADR-014, ADR-017):** una acción principal por pantalla; color solo para estado (vencido = `danger`, hoy = `warning`, hecho = `success`, borrador del agente = `info`, pausado = neutro); foco visible; skeleton con la forma del contenido; vacío con acción; movimiento 150–200 ms con `prefers-reduced-motion`; touch ≥ 44 px; en iPad y escritorio el título vive en la barra del shell; en el teléfono la acción principal queda fija abajo con safe-area.

## 2. Navegación

Área **Comercial**: Solicitudes · Negocios · Cotizaciones (`NAVEGACION.md`). **Sin entrada nueva de menú:** Negocios gana una tercera vista en su `Segmentado`: **Tablero · Lista · Pendientes**. Inicio gana la tarjeta «Mis seguimientos de hoy». La configuración va en **Configuración → Comercial → Seguimiento** (centro de configuración del núcleo, nunca una página propia del módulo).

## 3. Componentes que faltan (definirlos con sus estados)

| Componente | Qué es | Especificación |
|---|---|---|
| `LineaPasos` | Los pasos de un seguimiento en orden | Horizontal en iPad y escritorio, vertical en el teléfono. Cada paso: número, canal (ícono lucide: `Mail`, `MessageCircle`, `Phone`, `ClipboardCheck`), fecha relativa y estado (programado, por hacer, borrador del agente, hecho, pospuesto, omitido, fallido, cancelado). El paso actual destacado. Tocar un paso abre su hoja. |
| `FilaPendiente` | Un pendiente del vendedor | Canal, «Seguimiento 2 de 4», negocio y cuenta, monto mensual en `t-numeric`, cuándo («vence hoy 09:00», «vencido hace 2 días») y **una acción principal según el canal** («Enviar correo», «Abrir WhatsApp», «Registrar llamada», «Revisar») más un menú (Posponer, Omitir, El cliente respondió, Pausar). En el teléfono, la fila completa abre la hoja; el menú de la fila (no un gesto de deslizar) trae Posponer. |
| `IndicadorSeguimiento` | Señal corta en la tarjeta del tablero y en la fila de la lista | `Badge` pequeño: «Seg. 2/4 · hoy», «Vencido», «Pausado», «Detenido · 16 d», «Cierre propuesto». Uno solo por tarjeta, el más urgente. |
| `EditorPasos` | Pasos de un plan, ordenables | Fila por paso: arrastrar (con alternativa de teclado «subir/bajar»), «Día hábil 3 · 09:00», canal, quién lo ejecuta (Persona · OPAI automático · Agente), plantilla (variante), mover a etapa (opcional); «+ Agregar paso». Vista previa a la derecha (escritorio) o abajo (iPad): «Si envías hoy, jueves 29-10-2026, los pasos caen: mar 03-11 · lun 09-11 · mié 18-11 · jue 19-11», saltando fines de semana y feriados. |

## 4. Pantallas

### 4.1 Pendientes del vendedor (`/negocios?vista=pendientes`)
- `SplitScreen` en 1024 y 1280 (lista a la izquierda, el negocio con su seguimiento a la derecha); lista sola en el teléfono.
- Grupos con contador: **Vencidos · Hoy · Próximos 7 días · Esperan tu aprobación** (borradores del agente y cierres propuestos) **· Detenidos** (negocios sin actividad y con cierre vencido).
- Filtros con chips: responsable («Yo» por defecto; el gerente elige otro o «Todos»), canal, etapa.
- Encabezado con tres `KpiTile` compactos (vencidos, hoy, detenidos) que filtran al tocarlos; en el teléfono, en una fila desplazable dentro de su contenedor (sin scroll horizontal de página). No duplica la Bandeja de Inicio: las mismas tareas y aprobaciones siguen allí; aquí se agrupan por negocio.
- Vacío: «No tienes seguimientos para hoy» con la acción «Ver negocios abiertos».
- Mostrar al menos una fila de cada canal y una de un borrador preparado por el agente («Preparado por el agente · revisa y envía»).

### 4.2 Tarjeta «Mis seguimientos de hoy» (Inicio)
`Card` con los tres conteos y los tres primeros pendientes; «Ver todos» va a Pendientes. Vacío amable, sin ilustración grande.

### 4.3 Bloque «Seguimiento» en el Resumen de la ficha del negocio (`/negocios/[id]`)
- Estado (Sin iniciar · Activo · Con atrasos · Pausado · Con fallos · Terminado con motivo), plan y versión, desde cuándo se cuenta («cotización CPQ-2026-142 enviada el 29-10-2026») y destinatario.
- `LineaPasos`.
- Acciones: principal según el estado («Hacer paso 2», «Iniciar seguimiento» si no hay), y secundarias El cliente respondió · Pausar/Reanudar · Cambiar plan · Cancelar.
- Estado «Sin iniciar» con cotización enviada: `Alerta` warning «Esta cotización no tiene seguimiento» con «Iniciar».
- Los pasos hechos aparecen en la pestaña **Actividad** (no hay pestaña nueva); mostrar un ejemplo en la `Timeline` con «Hecho por OPAI automático» y otro «Agente vía Camila Rojas».

### 4.4 Iniciar seguimiento al enviar la cotización (hoja, último paso del envío de CPQ)
Tres opciones con `RadioGroup` de tarjetas (piso de 1.0): **Iniciar seguimiento** (marcada; muestra el plan, las fechas exactas y el destinatario), **Mover a otra etapa sin seguimiento** (selector de etapa) y **Solo enviar**. Si ya había un seguimiento: `Alerta` «Se cancelarán 2 pasos pendientes del seguimiento anterior». Estados: vista previa, confirmando, éxito (toast con «Ver seguimiento»), error de regla con el texto del servidor.

### 4.5 Ejecutar un paso (hoja; en el teléfono, pantalla completa con la acción fija abajo)
Cuatro variantes:
- **Correo:** De (nombre del vendedor con el dominio del tenant) y Responder a (solo lectura, con nota «las respuestas llegan a tu correo y al negocio»); Para (contacto del negocio, cambiable entre los contactos con rol), CC; variante de plantilla (la del paso, o la sugerida para la etapa actual del negocio); asunto y cuerpo con la plantilla y las variables ya resueltas, editables; enlace a la cotización como bloque; vista del correo con la marca del tenant. Acción: **Enviar desde OPAI**; secundaria «Ya lo envié por fuera» (registra). Variante «Preparado por el agente»: banda `info` con quién lo preparó y **Aprobar y enviar** · Editar · Descartar (el paso vuelve a la persona).
- **WhatsApp:** texto preparado editable, número del contacto; acción **Abrir WhatsApp**; después, «¿Lo enviaste?» Sí (registra) / No.
- **Llamada:** número con «Llamar», guion, y resultado con `RadioGroup` (Contestó con interés · Contestó sin interés · No contestó · Pidió que lo llamen el…, con `InputFecha` + `InputHora`) y nota. Acción: **Registrar**.
- **Interno («Proponer perdido» / «Renovar o perder»):** resumen del negocio (días desde el envío, pasos hechos, última actividad) y dos caminos: **Perder** (motivo sugerido «Sin respuesta», editable) o **Seguir** (pospone o inicia otro plan).
- En todas: Posponer (fecha y hora, «mover también los siguientes») y Omitir (motivo), en un menú secundario.
- Estados: cargando, enviando, enviado (toast), fallido («El contacto no tiene correo» con «Elegir otro contacto»), sin permisos.

### 4.6 El cliente respondió (hoja)
Canal (correo, llamada, WhatsApp, reunión, otro), cuándo y resumen. Debajo, **«Qué va a pasar»** con lo que hará el plan: «Se detiene el seguimiento · El negocio pasa a Negociación · Se crea la tarea Responder al cliente para Camila, vence hoy 14:30». Cuando una respuesta llegó por correo a la dirección de entrada, la hoja aparece prellenada con el texto del cliente **como cita marcada «externo»**, nunca como instrucción.

### 4.7 Cierre propuesto y cierre automático
- Fila en «Esperan tu aprobación»: «Proponer perdido · sin respuesta en 15 días hábiles», con Perder · Seguir.
- Aviso de cierre automático en la Actividad y como notificación: «OPAI cerró como perdido «Condominio Los Robles» (sin respuesta, $ 2.500.000 < $ 3.000.000)» con **Reabrir**, que abre la hoja de reapertura con el motivo prellenado («cerrado por la cadencia sin respuesta») y pide confirmación.

### 4.8 Tablero de negocios con indicadores
El tablero aprobado con `IndicadorSeguimiento` en varias tarjetas (uno de cada estado) y un negocio «Detenido · 16 d» en Negociación. En el teléfono, la lista agrupada por etapa con el mismo indicador.

### 4.9 Configuración → Comercial → Seguimiento (iPad y escritorio; en el teléfono solo lectura)
- **Lista de planes** (catálogo declarativo): nombre, disparador («Cuando se envía una cotización», «Cuando entra a Propuesta», «A mano»), por defecto, activo, versión y seguimientos en curso. Plan base copiado de la vertical: «Post-cotización (base Seguridad)».
- **Editor del plan:** nombre y disparador; «Cómo se cuentan los días» (`Segmentado`: Hábiles · Corridos) con enlace al calendario hábil del núcleo; desde dónde se cuenta; hora y ventana de envío; `EditorPasos` con la vista previa de fechas; **Cuando el cliente responde** (casillas: detener, pausar hasta, reiniciar desde; mover a etapa; crear tarea con plazo); **Al terminar sin respuesta** (`RadioGroup`: Proponer el cierre · Cerrar como perdido bajo $ … · Solo avisar; «Nunca cerrar solo desde la etapa…»).
- **Envío automático:** cada paso con «OPAI automático» o «Agente» muestra una `Alerta` que explica qué sale sin una persona; los interruptores van **apagados por defecto** y «Agente envía sin aprobación» solo lo puede activar el owner, con confirmación; activar «OPAI automático» muestra antes la vista previa de la plantilla y los destinatarios.
- **Ventana por canal** (opcional): llamadas y WhatsApp con su propio rango de horas.
- Un paso con ejecutor «Agente» sin agente disponible en el tenant muestra una `Alerta` «Sin agente conectado: este paso pasará a una persona al vencer».
- Guardar crea una versión nueva: diálogo «Hay 12 seguimientos en curso con la versión 3. ¿Pasarlos a la versión 4?» con la vista previa de fechas que cambian (No · Sí, pasarlos).

### 4.10 Plantillas por variante (Configuración → Comunicaciones, núcleo)
Solo la parte nueva: en el evento «Seguimiento · correo al cliente», una lista de **variantes** (Seguimiento 1, Seguimiento 3, Seguimiento en Negociación, Renovar oferta) con «usada en: Post-cotización paso 1» y «aplica en las etapas: …» (chips de etapas del embudo; vacío = todas); la edición es el editor de plantillas que ya existe.

### 4.11 Días sin actividad en el editor del Embudo (Configuración → Comercial → Embudo)
El editor del embudo ya aprobado gana una columna «Detenido después de» (días, hábiles o corridos; vacío = sin alerta) por etapa abierta. No es una pantalla aparte.

## 5. Estados obligatorios por pantalla
Cargando (skeleton con la forma), vacío con acción, error con «Reintentar», sin permisos (`Forbidden`), y en las hojas: vista previa (dry-run), confirmando, éxito y error de regla con el texto del servidor. En Pendientes, además, «sin conexión» en el teléfono (muestra lo último cargado y deshabilita enviar).

## 6. Qué demostrar con datos de ejemplo
- Un negocio con el paso 1 hecho por persona, el paso 2 vencido (WhatsApp) y los pasos 3 y 4 programados.
- Un borrador de correo preparado por el agente esperando aprobación.
- Un negocio que respondió y pasó a Negociación con la tarea «Responder al cliente».
- Un cierre automático bajo el umbral y un cierre propuesto sobre el umbral.
- Un negocio detenido en Negociación.
- Un paso fallido por contacto sin correo.

## 7. Archivos del export
`Pendientes.dc.html`, `InicioSeguimientos.dc.html`, `NegocioSeguimiento.dc.html`, `IniciarSeguimiento.dc.html`, `PasoCorreo.dc.html`, `PasoCorreoAgente.dc.html`, `PasoWhatsApp.dc.html`, `PasoLlamada.dc.html`, `PasoInterno.dc.html`, `ClienteRespondio.dc.html`, `TableroIndicadores.dc.html`, `ConfigSeguimientoPlanes.dc.html`, `ConfigSeguimientoEditor.dc.html`, `ConfigEmbudoDetenidos.dc.html`, `ComunicacionesVariantes.dc.html`, y `shots/` con 375, 1024 y 1280 (más oscuro en Pendientes y PasoCorreo).
