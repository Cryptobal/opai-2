# DESIGN PROMPT — CENTRAL DE MONITOREO OPERABLE POR UN AGENTE, CON HUMANO A CARGO (OPAI 2.0)

Para pegar completo en Claude Design, en un proyecto nuevo «Central de monitoreo», **con el Design System de OPAI 2.0 V2** (el oficial de la organización; en el repo: `packages/ds/src/tokens.css` y `docs/2.0/design/export-ds-2.0/`). **Nunca el estilo de OPAI 1.0.** No crees colores, tipografías, radios ni sombras nuevos; compón con los existentes (`AppShell`; los patrones `ListScreen`, `SplitScreen`, `DetailScreen` con `Seccion` y `Pares`, `FormScreen`, `DashboardScreen`; `FilaSeleccionable`, `Table`, `Sheet`/`Dialog`, `Select`, `Combobox`, `Checkbox`, `Switch`, `Badge`, `ChipToggle`, `Segmentado`, `Tabs`, `Timeline`, `KpiTile`, `BarraProgreso`, `avisar`/`Toaster`, `Empty`, `Alerta`, `MapaEstatico`, `Avatar`, `InputFechaRango`, `AccionFijaTelefono`) y define solo los componentes de la sección 3.

Especificación que manda: `docs/2.0/modulos/central.md` (reglas R1–R21). Si este prompt y la especificación chocan, manda la especificación.

Resultado esperado: el **export HTML standalone**, una pantalla por archivo con los nombres de la sección 6, y `shots/` con capturas a 375, 1024 y 1280 px. Es referencia de contenido y jerarquía, no código a copiar.

---

## 1. Contexto

OPAI 2.0 es un SaaS operacional multi-tenant y agent-first para empresas intensivas en personal (seguridad primero; en el export usa el tenant ficticio «Atlas Seguridad SpA», con instalaciones como «Bodega Lo Boza», «Edificio Apoquindo 4500» y «Planta Quilicura»; nombres de personas ficticios). Todo lo que se ve existe también como herramienta MCP: la UI no inventa flujos.

La **central** vigila en tiempo real rondas, asistencia, puestos sin cubrir y mensajes del terreno. **La opera un agente de IA** («Agente de central») y **siempre hay un humano a cargo** (el operador de turno o el responsable de respaldo). El agente hace solo lo reversible (contactar, escalar, avisar con plantilla, registrar), **propone** lo que necesita juicio (resolver, falsa alarma, instrucción libre, pedir reemplazo) y **pide aprobación humana** para lo irreversible (avisar al cliente, llamar a emergencias, descartar un pánico). El operador puede **tomar el control** de una alerta o **pausar al agente**.

**No hay chat.** En su lugar hay dos canales estructurados: **«Mensaje a la central»** (el guardia elige novedad, consulta o urgencia; queda ligado a su instalación y turno; la central responde en el mismo hilo) y **«Avisos de la central»** (consignas, cambios de turno, instrucciones) con **acuse de recibo**.

**Formatos:** español de Chile; `dd-mm-aaaa`; `HH:mm`; tiempos relativos «hace 4 min»; RUT en `t-mono`; teléfonos `+56 9 8765 4321`. Vocabulario de la vertical reemplazable (instalación, guardia, ronda): sin escudos ni iconos policiales como identidad.

**Principios (ADR-014, ADR-017):** una acción principal por pantalla; **color solo para estado** (crítica = `danger`, alta = `warning`, media = `info`, baja = neutro; agente = `accent`); foco visible; skeleton con la forma del contenido; vacío con acción; movimiento 150–200 ms con `prefers-reduced-motion`; touch ≥ 44 px; contraste AA en claro y oscuro; en iPad y escritorio el título va en la barra del shell. Lo urgente se distingue también **sin color** (ícono y texto), por daltonismo y pantallas al sol.

**Viewports y temas:** teléfono 375, iPad 1024 (horizontal) y escritorio 1280, todas las pantallas. **Modo oscuro obligatorio** en la cola, el detalle de alerta y la pantalla de central (se usa de noche); claro en el resto, oscuro opcional.

## 2. Navegación

- ERP: área **Operaciones**, entrada **«Central»** (séptima entrada del área, decidida por Carlos el 29-oct-2026) (pestañas por ruta: Cola · Mensajes · Avisos · Bitácora). La campana del shell muestra un punto cuando hay alertas críticas sin atender o aprobaciones de la central en la Bandeja.
- Ficha de Instalación: pestaña de módulo **«Central»** con la bitácora de esa instalación, filtrable por turno (orden ADR-041: Resumen → propias → de módulos → Documentos → Actividad).
- Portal **Supervisor** (barra inferior): «Hoy» muestra arriba las alertas de sus instalaciones y los escalamientos dirigidos a él.
- Portal **Trabajador** (app del guardia, barra inferior): botón fijo **«Central»** en Inicio; avisos sin acuse arriba de todo.
- Portal **Terreno** (dispositivo compartido, tarea única): «Mensaje a la central» junto a Novedad y los avisos dentro de «Instrucciones del puesto».
- Configuración (pie del menú): sección **Central** dentro del centro de Configuración, con ámbitos Tenant e Instalación (este último decidido el 29-oct-2026, pregunta 15 de la especificación). No hay página de configuración propia del módulo.

## 3. Componentes que faltan (definirlos con sus estados en una página «Componentes Central»)

| Componente | Qué es | Especificación |
|---|---|---|
| `TarjetaAlerta` | Una alerta en la cola | Severidad (ícono + `Badge` con texto), título en lenguaje de negocio («No inició ronda 02:00»), instalación y turno, tiempo abierto, paso actual de la cadena («Paso 2 de 4 · supervisor»), quién la tiene (agente, persona o «tomada por <operador>»), contador de señales agrupadas. Estados: nueva (borde izquierdo de severidad), en contacto, escalada, en atención, resuelta (atenuada), seleccionada, con aprobación pendiente (chip «Requiere aprobación»). |
| `CadenaEscalamiento` | Pasos de la cadena dentro de una alerta | Lista vertical de pasos con destinatario, canal y espera; paso hecho (con resultado: «no contestó», «se hizo cargo»), paso actual con **temporizador** hasta el siguiente, pasos futuros atenuados. Variante editable para Configuración (agregar, reordenar, quitar paso; canal; espera; «exige confirmación»). |
| `IndicadorAgente` | Estado del agente en la cabecera y en cada alerta | «Agente activo · atendiendo 3», «Agente en pausa (Bodega Lo Boza)», «Sin responsable: solo lee y avisa a los administradores». Acción secundaria «Pausar»/«Reanudar». Siempre muestra al lado **quién es el humano a cargo** (`Avatar` + nombre + «a cargo desde 22:00»). El agente es una identidad de servicio: en la bitácora aparece como «Agente de central (servicio)» con el responsable de turno anotado. |
| `PropuestaAgente` | Acción que el agente sugiere | Texto de la propuesta, por qué (señales que la sustentan), **vista previa** del efecto, botones «Aceptar» (principal) y «Rechazar» (con motivo opcional). Variante «Requiere aprobación» con candado y explicación de por qué es irreversible. |
| `EntradaBitacora` | Una línea de la bitácora | Hora de servidor (`t-mono`), actor («Agente de central (servicio) · a cargo: M. Rojas», persona, sistema), tipo (alerta, contacto, llamada, respuesta, propuesta, aprobación, toma de control, mensaje, aviso, acuse), texto y vínculos. Las entradas de texto de terceros se marcan como **externas** (cita con borde, etiqueta «Texto del guardia» o «Transcripción»). Correcciones como entrada nueva «Corrige a 02:14». Es inmutable: sin editar ni borrar. |
| `HiloCentral` | Un hilo de Mensaje a la central | Cabecera con tipo (`Badge`: Novedad, Consulta, Urgencia), instalación, turno y estado (abierto, respondido, cerrado). Mensajes del guardia a la izquierda, de la central a la derecha (con «Agente de central» o el nombre del operador), fotos en miniatura, «pendiente de envío» para lo encolado sin conexión. Respuestas rápidas sugeridas. Al cerrar, una línea «Cerrado por <quién> · motivo». **No es un chat**: sin indicador de «escribiendo», sin emojis, sin hilos sueltos. |
| `TarjetaAviso` | Aviso de la central en la app del guardia | Tipo (Consigna, Cambio de turno, Instrucción), texto, vigencia, quién lo envió, botón grande **«Leído y entendido»** (acuse) y estado acusado con hora. Las consignas vigentes quedan fijas arriba. |
| `AcusesAviso` | Estado de acuses en el ERP | `BarraProgreso` «12 de 15 acusaron», lista de personas con acusó / pendiente / vencido, «Recordar a pendientes». |

## 4. Pantallas

### 4.1 Cola en vivo (`/central`) — `Cola`
- **Escritorio 1280 e iPad 1024:** `SplitScreen`. Cabecera con `IndicadorAgente` + humano a cargo + «Entregar turno»; fila de `KpiTile` (Críticas abiertas, Sin primer contacto, En atención, Aprobaciones pendientes, Avisos sin acuse), cada uno filtra la lista. Lista de `TarjetaAlerta` agrupada por severidad, filtros con `ChipToggle` (severidad, estado, instalación, fuente: Rondas, Asistencia, Operaciones, Terreno, Manual; «Tomadas por mí»). A la derecha, el detalle de la alerta elegida (4.2) o «Elige una alerta».
- **Teléfono 375:** lista de `TarjetaAlerta` con los KPI en una fila desplazable; la barra superior muestra el `IndicadorAgente` compacto. Acción principal flotante en el patrón: «Abrir alerta» (manual).
- Estados: cargando (skeleton de tarjetas), **vacío «Todo en orden»** con la hora de la última señal revisada y acceso a la bitácora, error con «Reintentar», sin permisos, **agente en pausa** (banda `Alerta` warning arriba), **sin responsable** (banda `danger`: «Nadie está a cargo de la central. El agente solo lee y avisó a los administradores.» + «Tomar el turno»). Una alerta nueva entra arriba con una transición breve, sin sonido en el diseño (el sonido es ajuste del usuario).

### 4.2 Detalle de alerta (`/central/alertas/[id]`) — `Alerta`
- Cabecera: severidad, título, instalación (enlace a la ficha), turno y puesto, tiempo abierto, estado y quién la tiene. Acciones: **«Tomar el control»** (principal si la tiene el agente) o «Devolver al agente», «Llamar», «Escalar», «Resolver», menú con «Falsa alarma», «Derivar a ticket», «Avisar al cliente» (con candado: requiere aprobación).
- Bloques (`Seccion`): **Qué pasó** (señales agrupadas con su fuente y hora); **Contexto del turno** (guardia y su teléfono, supervisor, última marca o punto de ronda con `MapaEstatico`, trust score de la última ronda, consignas vigentes); **Cadena** (`CadenaEscalamiento` con temporizador); **Propuestas del agente** (`PropuestaAgente`, varias apiladas); **Bitácora de esta alerta** (`Timeline` de `EntradaBitacora`).
- Hoja **«Registrar contacto»** (tras «Llamar»): a quién, canal, resultado (contestó y se hizo cargo · contestó sin resolver · no contestó · número equivocado) y nota.
- Hoja **«Resolver»**: causa (catálogo del tenant), nota, cerrar hilos ligados; vista previa del efecto.
- Teléfono: cabecera compacta, bloques en acordeón con «Qué pasó» y «Propuestas» abiertos, acciones en `AccionFijaTelefono` («Tomar el control» o «Me hago cargo» si soy el destinatario del paso).
- Estados: alerta tomada por otro operador («La tiene P. Soto desde 02:16», acción «Pedir el control»), aprobación pendiente, resuelta (solo lectura + «Reabrir»), 404.

### 4.3 Aprobación de la central (en la Bandeja de Inicio y como `Dialog` desde la alerta) — `Aprobacion`
Qué pidió el agente, por qué, **vista previa exacta** (texto que recibirá el cliente, número al que se llamará), quién más puede aprobar y «Aprobar» / «Rechazar con motivo». Estados: aprobando, aprobada, rechazada, vencida.

### 4.4 Mensajes a la central (`/central/mensajes`) — `Mensajes`, `Hilo`
- Lista: filtros por tipo, estado e instalación; cada fila con tipo, guardia, instalación, primera línea, «hace N min» y plazo de respuesta (consulta por vencer en `warning`). Urgencias arriba y ligadas a su alerta.
- Hilo: `HiloCentral` con caja de respuesta (respuestas rápidas + texto), «Abrir alerta desde este hilo», «Pasar a novedad», «Cerrar». Teléfono: lista y hilo en pantallas separadas.

### 4.5 Avisos de la central (`/central/avisos`) — `Avisos`, `NuevoAviso`
- Lista de avisos enviados con tipo, destinatarios, vigencia y `AcusesAviso` resumido.
- Hoja **Nuevo aviso** (iPad y escritorio; en el teléfono, hoja completa): tipo (`Segmentado`: Consigna · Cambio de turno · Instrucción), texto o plantilla, destinatarios (`Combobox` múltiple: personas, puestos, instalaciones, «turno de hoy de…»), acuse obligatorio (`Switch`) y plazo, vigencia (`InputFechaRango`). Vista previa con el número de personas que lo recibirán; aviso de que a más de una instalación pide aprobación si lo prepara el agente.
- Detalle del aviso con `AcusesAviso` completo.

### 4.6 Turno de central y entrega (`/central/turno`) — `Turno`
Quién está a cargo y desde cuándo, responsable de respaldo, agente activo o en pausa por instalación. **Entregar turno**: resumen (alertas abiertas y en atención, propuestas y aprobaciones pendientes, avisos sin acuse, hilos sin responder) con nota de entrega y a quién; el que recibe ve «Aceptar turno». Estado «sin responsable».

### 4.7 Pantalla de central (escritorio, pantalla completa) — `PantallaCentral`
Para un monitor fijo, **modo oscuro**: cola a la izquierda, mapa estático de instalaciones con alertas (puntos por severidad, sin mapa interactivo), KPI grandes arriba, `IndicadorAgente` y humano a cargo siempre visibles, reloj. Legible a 3 metros (usa `t-display`/`t-title`, sin tamaños nuevos). Salir con Esc.

### 4.8 Bitácora (pestaña «Central» de la Instalación y pestaña Bitácora de Central) — `Bitacora`
`Timeline` de `EntradaBitacora` filtrable por turno (`Select` con turnos de la pauta o franjas del día), tipo y actor; exportar PDF con la marca del tenant (acción secundaria). Vacío: «Sin registros en este turno».

### 4.9 Configuración → Central (ámbitos Tenant e Instalación) — `ConfigCentral`
Secciones del centro de Configuración: **Reglas de vigilancia** (ámbito Instalación decidido, pregunta 15; tabla: señal, umbral con unidad, severidad, activa; en ámbito Instalación, marca «Distinto del tenant» y «Volver al valor del tenant»; las señales de módulos no activos no aparecen); **Cadenas de escalamiento** (por severidad, con `CadenaEscalamiento` editable); **Autonomía del agente** (no es un formulario nuevo: muestra la autonomía de la key «Agente de central» que vive en Configuración → Agentes y API keys, con enlace para editarla allí; tabla de acciones con `Segmentado` Solo · Propone · Aprobación; las tres acciones de piso fijas con candado y texto «Siempre requiere una persona»); **Humano a cargo** (responsable de respaldo, horario de la central); **Canales** (qué sale hacia afuera; silencio por defecto, con aviso «Hoy la central solo alerta dentro de OPAI»); **Mensajes del terreno** (subtipos, plazo de consulta, respuestas rápidas). Solo iPad y escritorio; en el teléfono, lectura con «Edita desde el computador».

### 4.10 App del guardia (portal Trabajador) — `GuardiaInicio`, `GuardiaNuevoMensaje`, `GuardiaHilo`, `GuardiaAvisos` (teléfono 375, claro y oscuro; verifica contraste AA a pleno sol con los tokens existentes y, si no alcanza, propónlo como variante del DS en una nota aparte, sin inventar colores en la pantalla)
- **Inicio**: avisos sin acuse arriba (`TarjetaAviso`), consignas vigentes, botón grande **«Central»**.
- **Nuevo mensaje**: tres botones grandes (Novedad, Consulta, **Urgencia** en `danger`), texto, «Agregar foto» (hasta 5), instalación y turno ya puestos (solo lectura), «Enviar». Urgencia pide confirmación con un toque largo o deslizar y muestra «Llamar a la central» con el número del tenant.
- **Hilo** del guardia y lista **Mis mensajes**.
- **Sin conexión**: banda «Sin conexión: se enviará al volver la señal», mensajes «pendiente de envío».
- Estados: enviado, recibido por la central, respondido, cerrado.
- **Variante dispositivo de Terreno** (`TerrenoCentral`): el dispositivo es compartido, de tarea única y sin menú (`NAVEGACION.md` §4). Solo «Mensaje a la central» y «Avisos del puesto» dentro de «Instrucciones del puesto», sin «Mis mensajes»; el acuse pide identificar a la persona en turno (deja un marcador «identificación según Brief 16»).

### 4.11 Supervisor · Hoy con alertas — `SupervisorHoy`
Teléfono: arriba «Te necesitan» con los escalamientos dirigidos a él (`TarjetaAlerta` con «Me hago cargo» y «No puedo»), luego alertas abiertas de sus instalaciones y avisos sin acuse de su gente.

## 5. Estados obligatorios por pantalla

Loading (skeleton con la forma), vacío con acción, error con «Reintentar», sin permisos (`Forbidden`, sin datos parciales) y 404 en las rutas con id. En las hojas y propuestas: **vista previa (dry-run)**, confirmando, éxito, error de regla de negocio con el texto del servidor y **«Requiere aprobación»** (la acción queda en la Bandeja del responsable). En terreno: sin conexión y pendiente de envío.

## 6. Archivos del export

`ComponentesCentral.dc.html`, `Cola.dc.html`, `ColaDark.dc.html`, `Alerta.dc.html`, `AlertaDark.dc.html`, `Aprobacion.dc.html`, `Mensajes.dc.html`, `Hilo.dc.html`, `Avisos.dc.html`, `NuevoAviso.dc.html`, `Turno.dc.html`, `PantallaCentral.dc.html`, `Bitacora.dc.html`, `ConfigCentral.dc.html`, `GuardiaInicio.dc.html`, `GuardiaNuevoMensaje.dc.html`, `GuardiaHilo.dc.html`, `GuardiaAvisos.dc.html`, `TerrenoCentral.dc.html`, `SupervisorHoy.dc.html`, y `shots/` con 375, 1024 y 1280 (las del guardia y el supervisor, solo 375).
