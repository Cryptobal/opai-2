# Agente interno — Especificación funcional de la pantalla

**Estado:** **borrador**, pendiente de aprobación de Carlos (ADR-047) · **Fase:** cierre del Núcleo (enmienda ADR-049 §8, NÚCLEO-E2) · **Tarea:** CAR-69 (pedido de Carlos del 29-oct-2026 08:07 CLT) · **Insumos:** ADR-049 (con su enmienda y el mecanismo de NÚCLEO-E2), ADR-045, ADR-046, ADR-047, ADR-048, ADR-050, ADR-055, [`briefs/NUCLEO-E2-agente-interno.md`](../briefs/NUCLEO-E2-agente-interno.md), [`agentes/agente-interno.md`](../agentes/agente-interno.md), `NAVEGACION.md`, `DISENO.md` · **Autor:** Claude

> Lenguaje de negocio, sin código (ADR-047). El servidor del agente ya está en `main` (PR #62 proveedores de IA con herramientas y respaldo; PR #73 orquestación, planes firmados y confirmación). Esta especificación define **la interfaz**: cómo se abre, cómo se conversa, cómo se confirman los planes, qué historial hay, qué límites ve cada rol y todos los estados. Proceso de esta etapa: reglas → preguntas a Carlos (§14) → Design Prompt (§15) → aprobación del diseño por Carlos → recién entonces el brief de implementación. **No se construye nada con este documento.**

> **Licencia.** El módulo vendible `agente` viene **apagado por defecto** en todos los tenants (NÚCLEO-E2, bloque 1). **Hay que activar la licencia para Gard**: es una decisión y una acción de Carlos (Plataforma → Empresas → Gard → Módulos). Este PR no la activa ni la propone activar por código, migración ni semilla.

## 1. Objetivo

Que cualquier persona autorizada de la empresa pueda **pedirle a OPAI, en lenguaje natural, lo mismo que haría en pantalla** —consultar, preparar y ejecutar cambios— desde el celular, el iPad o el escritorio, **sin perder el contexto de lo que está mirando** y sin que el agente pueda hacer nada que esa persona no podría hacer sola. Toda escritura llega como un **plan legible** que la persona confirma; lo irreversible pasa por la cola de aprobación humana.

Se nota que funciona cuando:

- **Uso:** porcentaje de usuarios con `agente:usar` que lo abren al menos una vez por semana, y solicitudes por usuario activo.
- **Confianza:** porcentaje de planes confirmados sobre planes propuestos (alto = el plan es correcto), y cero escrituras sin confirmación (auditoría).
- **Velocidad:** tiempo desde la pregunta hasta la primera respuesta visible (meta p75 < 3 s para lecturas simples con el modelo «estándar»; el panel abre en < 100 ms, ADR-045).

## 2. Entidades y relaciones

| Entidad | Qué es | Se relaciona con | Dónde vive |
|---|---|---|---|
| Solicitud (turno) | Un mensaje de la persona y la respuesta del agente: texto, lecturas hechas y, si corresponde, un plan | Conversación, plan, modelo elegido, consumo | Hoy: solo el caché temporal de idempotencia (24 h). Ver pregunta 1 |
| Conversación | Serie de turnos de **una persona en una empresa**, con título y contexto de origen | Usuario, tenant, ficha de contexto | **No existe hoy** (NÚCLEO-E2 decidió no guardar conversaciones). Ver pregunta 1 |
| Contexto | La ficha o lista donde está la persona al preguntar (cuenta, instalación, negocio, persona…) | Entidad del registro de entidades (ADR-041.7) | Lo manda la pantalla; el servidor lo **revalida** con el alcance del usuario (R9) |
| Plan | Lista ordenada de escrituras propuestas, cada una con su vista previa (`dryRun`), firmada por el servidor | Pasos, nivel de confirmación, vencimiento (1 h) | Servidor (token firmado, NÚCLEO-E2) |
| Paso del plan | Una escritura concreta (capacidad + argumentos) con su vista previa y su marca de reversible o irreversible | Capacidad del registro, aprobación | Servidor |
| Aprobación | Solicitud de un paso irreversible a la cola humana (`APPROVAL_REQUIRED`) | Paso, usuario que pidió, aprobador | Núcleo, `core.aprobaciones` (Bandeja de Inicio) |
| Acción ejecutada | Una escritura real hecha por «Agente interno vía <usuario>» | Auditoría | Núcleo, `core.audit_events` |
| Consumo | Tokens y llamadas de IA de cada turno | Tenant, proveedor/modelo, agente interno | Núcleo, `core.consumos` (ADR-031) |
| Modelo | Un modelo disponible entre los proveedores de IA conectados por el tenant | Integraciones de IA del tenant | Núcleo (catálogo de integraciones, ADR-027) |

## 3. Pantallas y superficies

El agente **no es una página con entrada en el menú** (ADR-046: el menú es para colecciones). Es una **capa del shell** que acompaña a la persona mientras navega, más una vista de historial.

| Superficie | Ruta | Portal | Patrón DS | Ubicación |
|---|---|---|---|---|
| Panel del agente | Sin ruta propia; estado en la URL `?agente=1` (para volver atrás y compartir el estado abierto) | ERP (otros portales: pregunta 9) | `Sheet` lateral derecho (iPad/escritorio) y pantalla completa (teléfono), cargado al abrirse (`hojaDiferida`) | Lanzadores de §3.1 |
| Historial | `/agente/historial` (pestañas «Conversaciones» y «Acciones») | ERP | `ListScreen`; en iPad/escritorio `SplitScreen` (lista + detalle) | Desde el menú «⋯» del panel; también desde Configuración → Agentes para quien gestiona |
| Configuración del agente | Dentro del centro de configuración del núcleo (ADR-018): sección «Agente interno» | ERP | `AjustesForm` | Configuración → Agentes (no hay página de configuración propia del módulo) |
| Consumo del agente | Configuración → Consumos, fila «Agente interno» (ya existe `core.consumos.por_agente`) | ERP | `DashboardScreen`/`Table` existentes | Configuración |

### 3.1 Cómo se abre (lanzadores)

1. **Botón fijo «Preguntar a OPAI»** (ícono de destello de lucide, `sparkles`), en el **grupo fijo de la cabecera** (búsqueda, campana, usuario) de iPad y escritorio, **a la izquierda de la búsqueda**. Mide y está igual en todas las vistas, como exige CAR-12: no se mueve cuando cambian las acciones de la página. En escritorio muestra el atajo en el tooltip.
2. **Atajo de teclado** `⌘J` (Mac) / `Ctrl+J` (Windows y Linux) abre y cierra el panel desde cualquier pantalla del ERP (pregunta 3). `Esc` lo cierra y devuelve el foco al lanzador.
3. **Desde la búsqueda (⌘K):** el primer lugar ya reservado (NAVEGACION §7, Brief 05 §4.4) es «Preguntar a OPAI: <lo escrito>». Con Enter abre el panel con ese texto ya enviado. En el celular, el mismo primer lugar dentro de «Buscar».
4. **Teléfono:** además de «Buscar», **la columna 4 libre de la barra inferior** (ADR-050 la dejó vacía y su uso lo decide Carlos) pasa a «OPAI» cuando la empresa tiene la licencia y la persona tiene `agente:usar` (pregunta 2). Sin licencia o sin permiso, esa columna sigue con la regla actual.
5. **Desde una ficha o lista:** el menú «⋯» de la cabecera de fichas de Cuentas, Instalaciones, Negocios y Personas agrega «Preguntar a OPAI sobre esta <entidad>», que abre el panel con el contexto ya fijado.
6. **Desde una notificación o la Bandeja:** una aprobación pedida por el agente lleva «Ver conversación» (si hay conversaciones guardadas, pregunta 1).

**Sin licencia o sin `agente:usar`, ningún lanzador existe** (NAVEGACION §1.6: sin entradas deshabilitadas ni «disponible pronto»). El atajo no hace nada y ⌘K no muestra la fila reservada.

### 3.2 Cómo se ve, por tamaño

| Tamaño | Forma | Convivencia con el shell |
|---|---|---|
| **Teléfono (< 768 px)** | **Pantalla completa** sobre el shell (hoja a pantalla completa, como los drawers del DS). Cabecera propia de 52 px: «Cerrar» (izquierda), título «OPAI» con el chip de contexto debajo, menú «⋯» (historial, nueva conversación, modelo, nivel). Compositor fijo abajo, sobre la safe-area de iOS; la barra inferior del shell queda oculta mientras el panel está abierto | Al cerrar, vuelve exactamente a la pantalla y posición de scroll de origen. El botón «Atrás» del sistema cierra el panel (estado en la URL) |
| **iPad (768–1279 px)** | **Panel superpuesto** (`Sheet` derecho) de 400 px de ancho con `scrim` suave; el contenido no se reacomoda | No reacomodar evita los desbordes ya conocidos a 768 y 1024 px (CAR-64: fichas de ~390 px con la barra lateral de 248 px). Tocar fuera **no** cierra si hay un plan pendiente (pide confirmar descarte) |
| **Escritorio (≥ 1280 px)** | **Panel acoplado** a la derecha, 400 px (redimensionable 360–560 px, recordado por usuario), **sin scrim**: el contenido se reacomoda y sigue siendo usable | Se puede navegar con el panel abierto: el panel **persiste entre navegaciones** (vive en el layout del portal, ADR-045) y el chip de contexto se actualiza a la nueva ficha |
| **Pantalla de historial** | Lista/ficha normal del DS | Ruta propia dentro del shell, con su `titulo` en la barra superior (iPad/escritorio) |

El panel nunca tapa la campana ni la búsqueda en escritorio (queda bajo la barra superior, a la altura del contenido). En iPad, la barra superior sigue visible encima del panel superpuesto.

### 3.3 Anatomía del panel

De arriba abajo:

1. **Cabecera:** título «OPAI» (o el nombre configurado, pregunta 10), **selector de modelo** (`Select` con los modelos conectados agrupados por proveedor y su clase «económica / estándar / potente»), **selector de nivel** (`Segmentado`: «Paso a paso» · «Aprobar todo»), menú «⋯» (Nueva conversación, Historial, Ayuda) y «Cerrar». En el teléfono, modelo y nivel van dentro de «⋯» para no saturar la cabecera.
2. **Chip de contexto** (`Chip` con ícono de la entidad): «Cuenta · Banco Andino», «Instalación · Torre Norte», «Negocio · Renovación 2027». Se puede quitar (×) para preguntar sin contexto. Si la persona navega a otra ficha con el panel abierto, el chip cambia y la conversación muestra una línea separadora «Ahora en: Instalación · Torre Norte».
3. **Hilo:** mensajes de la persona (alineados a la derecha, `bg-accent-muted`) y respuestas del agente (izquierda, `bg-surface`), con:
   - **Pasos de trabajo** visibles mientras prepara («Buscando la cuenta…», «Leyendo 3 instalaciones…», «Preparando vista previa…»), uno por herramienta, con el nombre de negocio de la capacidad, nunca el id técnico.
   - **Fuentes:** al pie de cada respuesta, los registros leídos como enlaces internos a sus fichas («Cuenta Banco Andino», «3 instalaciones»). Abrirlos navega sin cerrar el panel en escritorio.
   - **Tarjeta de plan** cuando hay escrituras (§3.4).
4. **Sugerencias de inicio** (solo con el hilo vacío): 3–4 `Chip` según el contexto y el rol, sacadas de las plantillas de la vertical copiadas al tenant (R20).
5. **Compositor:** `Textarea` que crece hasta 6 líneas, contador al acercarse a 6.000 caracteres, botón «Enviar» (`Button` icono 44 px). Enter envía, Shift+Enter salto de línea (escritorio); en el teléfono, Enter es salto de línea y se envía con el botón. Mientras el agente trabaja, «Enviar» pasa a «Detener».
6. **Pie discreto:** «OPAI usa <modelo>. Revisa el plan antes de confirmar.» y, para quien tiene `agente:configurar`, el aviso de presupuesto al 80 % (R17).

### 3.4 Tarjeta de plan (confirmación)

Toda escritura llega como **una tarjeta de plan** dentro del hilo, nunca como texto suelto (R4):

- **Encabezado:** «Plan · 3 cambios», el nivel elegido y el vencimiento («Vence en 58 min»; vencido → R7).
- **Un renglón por paso**, en orden: verbo de negocio y objeto («Cambiar el supervisor de Torre Norte»), y debajo la **vista previa del dryRun** como diferencia antes → después (`Pares` con el valor anterior tachado en `text-fg-subtle` y el nuevo en `text-fg`). Cada renglón lleva su `Badge`: «Reversible» (`info`) o «Irreversible · va a aprobación» (`warning`).
- **Acciones del plan** (nivel «Aprobar todo»): «Confirmar plan» (`primary`), «Pedir cambios» (`secondary`), «Descartar» (`ghost`).
- **Acciones del paso** (nivel «Paso a paso»): solo el paso en curso está activo, con «Confirmar este paso», «Pedir cambios» y «Descartar plan»; los siguientes se ven atenuados con «Pendiente».
- **Pedir cambios** abre el compositor con «Cambia en el plan: …»; el agente prepara **un plan nuevo** y el anterior queda marcado «Reemplazado» (pregunta 4: no se editan argumentos a mano en la tarjeta).
- **Durante la ejecución:** cada paso muestra su estado: «Ejecutando…» → «Hecho» (`success`, con enlace a la ficha modificada) o «Falló» (`danger`, con el mensaje en lenguaje de usuario y «Ver en auditoría»). Un fallo detiene los pasos siguientes (R6).
- **Paso irreversible:** al llegar a él, el plan se detiene y la tarjeta muestra «Enviado a aprobación · lo resuelve <rol o persona>» con enlace a la solicitud en la Bandeja; los pasos siguientes quedan «En espera de la aprobación» (R5). Cuando se resuelve, la persona recibe el aviso por la campana (ADR-020, si el tenant lo activa) y el plan **no** continúa solo: hay que volver a pedirlo (NÚCLEO-E2: el plan se detiene allí).
- **Descartar** pide confirmación solo si el plan tenía pasos ya hechos («2 cambios ya se hicieron y no se deshacen»).

### 3.5 Historial

Pestañas por ruta (`Tabs`):

- **Conversaciones** (si Carlos aprueba guardarlas, pregunta 1): lista con título (generado del primer mensaje, editable), contexto de origen, fecha, número de acciones ejecutadas; buscar por texto; abrir retoma la conversación en el panel; archivar y borrar (borrar es del propio usuario y es definitivo, Ley 21.719).
- **Acciones:** todas las escrituras hechas por «Agente interno vía <yo>» (hoy `agente.historial.list`), con fecha y hora, acción de negocio, entidad afectada (enlace), resultado (Hecho / Falló / En aprobación / Aprobado / Rechazado) y «Ver en auditoría». Filtros por periodo, resultado y módulo. Owner y admin ven, además, el filtro «Todas las personas» en Configuración → Auditoría, filtrando por actor «Agente interno».

## 4. Campos y validaciones

| Campo | Tipo | Obligatorio | Validación | Quién lo edita |
|---|---|---|---|---|
| Mensaje | Texto | Sí | 1 a 6.000 caracteres, sin adjuntos en esta versión (pregunta 11) | La persona |
| Contexto | Referencia a entidad (tipo + id) | No | El servidor verifica que la entidad exista en el tenant y esté dentro del alcance de la persona; si no, se ignora sin revelar si existe (R9) | La pantalla (automático); la persona puede quitarlo |
| Modelo | Proveedor + modelo + clase | Sí | Solo modelos de proveedores conectados y activos en el tenant (`agente.modelos.list`); el servidor rechaza cualquier otro | La persona, entre los permitidos; el tenant fija el predeterminado (R14) |
| Nivel | «Paso a paso» o «Aprobar todo» | Sí | Si el tenant obliga «Paso a paso», el selector no ofrece la otra opción (R3) | La persona (recordado por persona y empresa) |
| Título de conversación | Texto | No | ≤ 80 caracteres | La persona |

## 5. Reglas de negocio

**Acceso**

- **R1.** El agente solo existe para una persona si (a) el tenant tiene **activa la licencia** del módulo `agente`, (b) su rol tiene `agente:usar` y (c) está en el portal ERP. Si falta cualquiera, no se muestra ningún lanzador ni se puede abrir por URL (`?agente=1` se ignora).
- **R2.** El agente actúa como **«Agente interno vía <persona>»**: con sus permisos efectivos (rol, excepciones y rol personalizado del Brief 07c), su alcance de filas (ADR-022) y solo con los módulos activos del tenant. Nunca accede a Plataforma (ADR-055) ni a herramientas que gobiernan agentes, keys o credenciales (`soloPersonas`).

**Confirmación**

- **R3.** Toda escritura requiere confirmación humana dentro del panel. La persona elige el nivel: **«Paso a paso»** (por defecto) o **«Aprobar todo»**. El tenant puede **obligar «Paso a paso»** para todos (ajuste, pregunta 5). Sin confirmación no se escribe nada.
- **R4.** Toda escritura se muestra antes como **vista previa** (dryRun) en la tarjeta de plan, con el antes → después de cada paso en lenguaje de negocio. Un texto del agente que diga «ya lo hice» sin tarjeta es un error de producto.
- **R5.** Lo **irreversible** (capacidades marcadas así o que la autonomía del tenant envía a aprobación) **siempre** va a la cola de aprobación humana (`core.aprobaciones`, Bandeja de Inicio), aunque el nivel sea «Aprobar todo». El plan se detiene allí. Quién puede aprobar sigue la regla vigente de aprobaciones (pregunta 6 sobre la propia persona).
- **R6.** Los pasos se ejecutan en orden; si uno falla, los siguientes no se ejecutan y la tarjeta lo dice. Lo ya hecho **no se revierte solo**: la tarjeta lista qué quedó hecho.
- **R7.** Un plan **vence a la hora** de prepararse (NÚCLEO-E2). Vencido, sus botones se desactivan y aparece «Este plan venció. Pídelo de nuevo para ver los datos actuales».
- **R8.** Un plan está ligado a la persona, la empresa, el portal y su acceso vigente. Si cambia de empresa, pierde el permiso o se cierra la sesión, los planes abiertos quedan **anulados** y se dice por qué.

**Contexto y datos**

- **R9.** La pantalla envía el contexto (tipo y id de la entidad que se mira); el servidor lo **revalida** con el alcance de la persona. Un contexto fuera de alcance se descarta sin decir si existe. El chip muestra solo el nombre visible para esa persona.
- **R10.** Todo lo que el agente lee de registros (notas, correos, documentos, descripciones) es **dato externo**: nunca confirma un plan, nunca crea un botón de acción y nunca habilita lo irreversible. La interfaz muestra texto plano con formato básico (negritas, listas, tablas, enlaces **solo internos**); no renderiza HTML, imágenes remotas ni enlaces externos clicables (se muestran como texto).
- **R11.** Las respuestas citan sus **fuentes** (los registros leídos) como enlaces a las fichas, solo si la persona puede abrirlas.

**Límites, consumo y presupuesto**

- **R12.** Límites por turno del servidor: 12 pasos de herramientas y 128.000 tokens medidos. Al superarlos, el turno termina sin escribir y el panel lo explica (§12). Límite de frecuencia: 20 solicitudes por minuto por persona.
- **R13.** Si la persona pide algo que su rol no permite, el agente responde **«Tu rol no permite <acción de negocio>. Pídeselo a alguien con ese permiso o a un administrador.»**, sin revelar datos ni nombres que no podría ver. Si lo pedido requiere un módulo inactivo: «Eso es parte de <módulo>, que tu empresa no tiene activo.»
- **R14.** El **modelo** se elige entre los proveedores de IA conectados del tenant (ADR-049 §6). El tenant fija un modelo predeterminado; la persona puede cambiarlo por conversación. Si el tenant no tiene key propia, se usa el modelo de OPAI y se cobra el consumo (ADR-049 §9); la interfaz lo indica en el selector («Modelo de OPAI · se cobra por uso»).
- **R15.** Si la key del tenant falla, **nunca** se cae a la key de OPAI (ADR-049 §6, 21:58): el turno falla con un mensaje claro y la integración queda en error en Configuración → Integraciones.
- **R16.** Todo turno se **mide** en `core.consumos` (tokens y llamadas, proveedor y modelo, actor «Agente interno»), con o sin key propia.
- **R17.** **Presupuesto opcional por tenant** (0 = sin tope, por defecto, ADR-049 §9). Al 80 % se avisa a quienes tienen `agente:configurar` (banda en el panel y aviso por Comunicaciones si el tenant lo activa). Al 100 %, el agente deja de aceptar solicitudes para todos hasta el mes siguiente o hasta que se suba el tope; el mensaje para quien no configura es «El agente alcanzó el presupuesto del mes de tu empresa. Avísale a un administrador.»
- **R18.** Las personas ven el consumo **de la empresa** solo si tienen permiso de consumos (owner, admin). Cada persona ve, en el historial, cuántas solicitudes hizo, no costos.

**Historial y datos personales**

- **R19.** Las **acciones** del agente quedan siempre en la auditoría como «Agente interno vía <persona>» (ADR-049 §5) y se ven en el historial de la persona. Las **conversaciones** solo se guardan si Carlos lo aprueba (pregunta 1); si se guardan, son **privadas de la persona** (ni owner ni admin las leen), aisladas por tenant con RLS (el mismo usuario en dos empresas tiene dos historiales), con retención configurable por tenant y borrado por la propia persona (Ley 21.719, Brief 07d).

**Configurable por tenant (nada igual para todos, ADR-021)**

- **R20.** Ajustes del agente en Configuración → Agentes (permiso `agente:configurar`, solo personas): modelo predeterminado; obligar «Paso a paso»; presupuesto mensual (ya existe); retención de conversaciones (si se guardan); nombre visible del agente (pregunta 10); **sugerencias de inicio** por contexto (plantillas de la vertical **copiadas al tenant** y editables, P13). Qué roles usan el agente se define en la matriz de roles existente (permiso `agente:usar`, Brief 07c).

**Agent-first y paridad (ADR-055)**

- **R21.** El agente no tiene herramientas propias: **toda acción que puede hacer es una capacidad del registro** y también está en el MCP para los agentes externos, con los mismos permisos. Si algo no existe como capacidad, el agente responde que no puede hacerlo y lo registra como brecha (sin datos personales).
- **R22.** Las capacidades nuevas que necesite la pantalla (conversaciones y contexto, §9) tienen su herramienta MCP o quedan como excepción justificada en `paridad-excepciones.ts` (solo `soloPersonas`). Preparar y confirmar ya son `soloPersonas`: un agente externo no puede manejar al agente interno ni confirmar por una persona.

**Sin conexión**

- **R23.** El agente **requiere conexión**. Sin red: el compositor se desactiva con «Sin conexión. Tu mensaje queda guardado y podrás enviarlo al volver.»; el borrador se guarda en el dispositivo; **nunca se encolan confirmaciones ni escrituras** para enviarlas después (no es terreno, ADR-044). Al volver la conexión, un plan abierto se revalida; si venció, R7.

## 6. Estados y transiciones

**Del plan**

| Desde | Hacia | Quién | Condición | Efecto | ¿Reversible? |
|---|---|---|---|---|---|
| — | Propuesto | Agente | La solicitud necesita escribir | Tarjeta con vista previa, sin efectos | — |
| Propuesto | En ejecución | Persona | Confirma el plan o el paso | Se ejecutan los pasos confirmados | No |
| Propuesto | Reemplazado | Persona | «Pedir cambios» | Se prepara otro plan | — |
| Propuesto | Descartado | Persona | «Descartar» | Nada se escribe | — |
| Propuesto | Vencido | Sistema | Pasó 1 h o cambió el acceso (R7, R8) | Botones desactivados | — |
| En ejecución | Completado | Sistema | Todos los pasos hechos | Enlaces a lo modificado; auditoría | No (cada cambio se corrige con otro cambio) |
| En ejecución | Detenido por error | Sistema | Un paso falla (R6) | Los siguientes no se ejecutan | — |
| En ejecución | En aprobación | Sistema | Llega un paso irreversible (R5) | Solicitud en la Bandeja; el plan se detiene | La solicitud se puede rechazar |

**Del paso:** pendiente → ejecutando → hecho | falló | en aprobación → (aprobado | rechazado | vencido, según `core.aprobaciones`).

## 7. Permisos por rol y portal

| Acción | owner | admin | gerente | supervisor | viewer | Portal Cliente | Portal Trabajador | Agente externo (key MCP) |
|---|---|---|---|---|---|---|---|---|
| Usar el agente (`agente:usar`) | sí | sí | sí | configurable, **no por defecto** | configurable, **no por defecto** | no (pregunta 9) | no (pregunta 9) | no: preparar y confirmar son solo personas |
| Qué puede pedir | todo lo que su rol permite | ídem | ídem, sin Finanzas ni montos de sueldo | solo lo de su alcance (ADR-022) | solo lecturas | — | — | — |
| Configurar el agente (`agente:configurar`) | sí | sí | no | no | no | — | — | no (solo personas) |
| Ver consumo de la empresa (`core:consumos.read`) | sí | sí | no | no | no | — | — | según scopes de la key |
| Ver su propio historial de acciones | sí | sí | sí | sí | sí | — | — | lee el de su usuario responsable solo si es key de tipo usuario; nunca una key de servicio (ADR-051) |
| Aprobar lo irreversible pedido por el agente | según `core:aprobaciones.manage` | ídem | no | no | no | — | — | nunca |

Alcance de filas: el del usuario, aplicado en cada capacidad (ADR-022), nunca en la pantalla. Los roles que tienen `agente:usar` por defecto son la pregunta 7.

## 8. Eventos y notificaciones

| Evento | Cuándo ocurre | Quién se entera por defecto | Canal | Plantilla |
|---|---|---|---|---|
| `agente.presupuesto.aviso` (nuevo, o reutilizar el aviso de presupuesto de C) | El consumo del mes llega al 80 % del tope | Silencio por defecto (ADR-020); recomendado: quienes tienen `agente:configurar` | Campana y correo | «El agente interno usó el 80 % del presupuesto de <mes>.» |
| `agente.presupuesto.agotado` | Llega al 100 % | Ídem | Campana y correo | «El agente interno se detuvo: alcanzó el presupuesto de <mes>.» |
| Aprobación resuelta (ya existe en `core.aprobaciones`) | Alguien aprueba o rechaza un paso pedido por el agente | La persona que lo pidió | Campana | Existente |
| `core.integracion.error` (ya existe) | La key de IA del tenant falla | Quien gestiona integraciones | Campana y correo | Existente |

## 9. Herramientas MCP y capacidades

Existentes (NÚCLEO-E2):

| Capacidad | Qué hace | Tipo | MCP |
|---|---|---|---|
| `agente.modelos.list` | Lista los modelos conectados, sin credenciales | Lectura | Sí |
| `agente.turno.preparar` | Prepara la solicitud: lecturas y vistas previas, plan firmado | Escritura con dryRun | No (`soloPersonas`) |
| `agente.plan.confirmar` | Acepta o rechaza un plan o paso | Escritura con dryRun | No (`soloPersonas`) |
| `agente.historial.list` | Metadatos de acciones del agente vía el usuario | Lectura | Sí |

Cambios que esta pantalla **pide al servidor** (los fija el brief, no este documento):

1. `agente.turno.preparar` acepta **contexto** (tipo + id de entidad), revalidado con el alcance (R9), y el id de conversación si se guardan (pregunta 1).
2. Eventos SSE de **progreso por herramienta** (nombre de negocio de la capacidad y conteo de registros, sin contenido) para los «pasos de trabajo» del hilo; hoy el SSE solo emite iniciado/resultado/error. El **texto** puede seguir llegando completo, sin fragmentos (pregunta 8).
3. `agente.historial.list` agrega entidad afectada, resultado y referencia de auditoría (hoy solo capacidad y fecha).
4. Si se guardan conversaciones: `agente.conversaciones.list`, `.get`, `.renombrar`, `.archivar`, `.borrar` (del propio usuario), con MCP para keys de tipo usuario (leen solo las de su responsable) y nunca para keys de servicio; tabla nueva con `tenant_id`, RLS `tenant_isolation`, prueba de dos empresas e inventario 07d.
5. Ajustes nuevos del manifest (R20): modelo predeterminado, obligar paso a paso, retención, nombre visible y sugerencias de inicio, todos por `core.config.set` con `agente:configurar` y `soloPersonas`.

## 10. Integraciones

Proveedores de IA del tenant (Anthropic, OpenAI, Google, compatible con OpenAI, xAI) por el adaptador del núcleo (ADR-031, PR #62), con su key cifrada en el almacén del núcleo (ADR-027). Sin key propia, modelo de OPAI con consumo cobrado (ADR-049 §9). Todo consumo se mide en `core.consumos`. La interfaz nunca recibe ni muestra credenciales.

## 11. Mejoras respecto de 1.0 y lo que no se porta

| En 1.0 | En 2.0 | Por qué |
|---|---|---|
| Chat de ayuda (`help-chat`) que responde preguntas sobre el uso del sistema, sin actuar sobre los datos | Agente que **lee y opera** los datos de la empresa con los permisos de la persona, con contexto de la ficha | 1.0 es el piso: responder dudas sigue posible (el agente explica cómo hacer algo), y además lo hace |
| Una sola configuración de IA para todos | Key y modelo por tenant; modelo elegible por persona | ADR-049 §6 |
| Sin confirmación estructurada | Plan con vista previa, niveles de confirmación y cola de aprobación | ADR-049 §4 |
| Sin medición por tenant | Consumo medido y presupuesto con aviso al 80 % | ADR-031, ADR-049 §9 |
| Agentes externos por MCP (OPAI 1.0) | Mismas capacidades para el agente interno y los externos | ADR-004, ADR-055 |

**No se porta:** el código y la configuración `asistente-ia` de 1.0 (paridad N7/N8), el chat entre personas y el chat por instalación (backlog).

## 12. Estados de la interfaz y casos borde

**Estados obligatorios del panel** (con los componentes de estado del DS):

| Estado | Qué se ve |
|---|---|
| Cargando el panel | Skeleton con la forma del hilo y del compositor (< 100 ms; el shell no parpadea) |
| Pensando | Indicador sobrio en la burbuja del agente + los pasos de trabajo a medida que llegan; «Detener» disponible |
| Vacío (conversación nueva) | `Empty` con «¿En qué te ayudo?», el chip de contexto y 3–4 sugerencias de inicio según contexto y rol |
| Vacío (historial) | «Todavía no tienes conversaciones» / «El agente aún no ha hecho cambios por ti», con «Preguntar a OPAI» |
| Sin proveedor de IA conectado | Para `agente:configurar`: «Conecta un proveedor de IA para usar el agente» con acción a Configuración → Integraciones. Para el resto: «El agente aún no está listo en tu empresa. Avísale a un administrador.» |
| Error del proveedor (key del tenant caída) | `ErrorState`: «El proveedor de IA de tu empresa no responde. No se hizo ningún cambio.» + «Reintentar»; al administrador, enlace a Integraciones |
| Error de red durante la ejecución | «Se cortó la conexión mientras se ejecutaba el plan. Revisa el historial de acciones antes de volver a pedirlo: algunos cambios pueden haberse hecho.» (NÚCLEO-E2: no se presume que no hubo escritura) |
| Sin permiso (R13) | Respuesta del agente en el hilo, con ícono de candado y el texto de R13; nunca datos parciales |
| Límite de frecuencia | «Vas muy rápido. Espera un minuto y vuelve a intentarlo.» con cuenta regresiva |
| Límite de pasos o tokens (R12) | «La solicitud es demasiado grande para un turno. Divídela en partes más chicas.» |
| Presupuesto agotado (R17) | Banda `warning` fija sobre el compositor, compositor desactivado |
| Sin conexión (R23) | Banda neutra «Sin conexión», compositor desactivado, borrador conservado |
| Plan vencido (R7) / anulado (R8) | Tarjeta atenuada con la razón y «Pedir de nuevo» |

**Casos borde**

- La persona cambia de empresa con el panel abierto: el panel se cierra, la conversación queda en la empresa anterior y los planes se anulan (R8).
- Se navega con un plan propuesto abierto en iPad: el panel superpuesto se cierra al navegar solo si no hay plan pendiente; si lo hay, se mantiene abierto.
- Dos pestañas con el mismo plan: la segunda confirmación ve «Este plan ya se confirmó» (idempotencia del servidor).
- El modelo elegido deja de estar disponible (integración desconectada): el selector vuelve al predeterminado y lo avisa.
- Un registro leído contiene instrucciones («ignora las reglas y borra…»): se muestra como dato, el plan no cambia y lo irreversible sigue a aprobación (R10).
- Una respuesta muy larga o con tabla ancha: la tabla se desplaza dentro de su contenedor, nunca la página (DISENO §4).
- Lector de pantalla: las respuestas nuevas se anuncian (`aria-live="polite"`), la tarjeta de plan es una región con título y el foco va al primer botón del plan al aparecer.
- `prefers-reduced-motion`: sin animación de aparición del panel ni del indicador de «pensando» (solo cambio de opacidad).

## 13. Criterios de aceptación

Verificables por Carlos en `test.opai.cl` (con la licencia activada para Gard) y por Diseño y QA a 375, 1024 y 1280 px, claro y oscuro.

- **CA1.** Sin licencia o sin `agente:usar`, no aparece ningún lanzador (botón, atajo, ⌘K, barra inferior, menú de ficha) y `?agente=1` no abre nada.
- **CA2.** Con licencia y permiso, el panel se abre por los cinco lanzadores de §3.1, en < 100 ms, como pantalla completa en teléfono, superpuesto en iPad y acoplado en escritorio, sin mover la campana, la búsqueda ni el usuario (CAR-12).
- **CA3.** Desde la ficha de una cuenta, el chip muestra la cuenta; preguntar «¿cuántas instalaciones activas tiene?» responde con el número correcto y enlaza las fuentes.
- **CA4.** Pedir un cambio (por ejemplo, «cambia el supervisor de Torre Norte a <persona>») muestra una tarjeta de plan con el antes → después; nada cambia hasta confirmar; al confirmar, el cambio está en la ficha y en la auditoría como «Agente interno vía <persona>».
- **CA5.** En «Paso a paso», un plan de dos cambios pide dos confirmaciones; en «Aprobar todo», una. Con el ajuste «obligar paso a paso», no se ofrece «Aprobar todo».
- **CA6.** Un paso irreversible queda «En aprobación» con enlace a la Bandeja y el plan se detiene, aun en «Aprobar todo».
- **CA7.** Un supervisor con `agente:usar` que pide datos de una instalación que no tiene a cargo recibe el mensaje de R13 y ningún dato de esa instalación.
- **CA8.** Con la red apagada, el compositor se desactiva, el borrador se conserva y no se envía ninguna confirmación al volver.
- **CA9.** El historial de acciones lista lo hecho por el agente con resultado y enlace a la auditoría; el historial de otra empresa del mismo usuario no aparece.
- **CA10.** Al superar el 80 % del presupuesto, quien configura ve el aviso; al 100 %, nadie puede enviar y el mensaje lo explica.
- **CA11.** `tools/list` en `main` incluye las herramientas nuevas del brief y el gate de paridad está en verde.

## 14. Preguntas abiertas para Carlos

Numeradas, cada una con recomendación. Ninguna bloquea el Design Prompt: el diseño puede mostrar la opción recomendada y ajustarse.

1. **¿Guardamos las conversaciones?** Hoy el servidor **no** guarda conversaciones (NÚCLEO-E2 lo decidió así): solo hay historial de acciones y un caché de 24 h. **Recomendación: sí, guardarlas**, privadas de cada persona (ni owner ni admin las leen), aisladas por empresa con RLS, con **retención de 90 días** configurable por tenant y borrado por la propia persona. Por qué: sin conversaciones, cerrar el panel o cambiar de dispositivo pierde el trabajo y el «historial de conversaciones» pedido no existe; la privacidad y la retención cumplen la Ley 21.719. Implica una migración y una prueba de dos empresas en el brief.
2. **¿Usamos la columna 4 libre de la barra inferior del teléfono para «OPAI»?** **Recomendación: sí**, solo cuando la empresa tiene la licencia y la persona `agente:usar`; si no, la columna sigue libre. Por qué: en el teléfono es la forma más directa de abrir el agente sin tocar la barra superior (ADR-050) y aprovecha el lugar que ADR-050 dejó sin decidir.
3. **Atajo de teclado: ¿`⌘J` / `Ctrl+J`?** **Recomendación: sí.** Es el atajo habitual de asistentes en apps de trabajo, queda junto a ⌘K y no choca con ningún atajo de OPAI. Alternativa si molesta (en Windows, `Ctrl+J` abre descargas en algunos navegadores cuando la página no lo captura): `⌘.` / `Ctrl+.`.
4. **«Pedir cambios» al plan: ¿se pide por texto o se editan los campos en la tarjeta?** **Recomendación: por texto en esta versión**: el agente prepara un plan nuevo con su vista previa y firma nueva. Por qué: editar argumentos a mano exige formularios por cada capacidad (y revalidar y volver a firmar), que ya existen en las pantallas de cada módulo; si un cambio es fino, la tarjeta enlaza a la pantalla normal.
5. **Nivel de confirmación por defecto y tope del tenant.** **Recomendación:** «Paso a paso» por defecto para todos, recordado por persona; el tenant puede **obligar** «Paso a paso». Por qué: equilibra la confianza inicial con la rapidez para quien ya conoce el agente, y deja el control al dueño de la empresa.
6. **¿Puede la misma persona aprobar lo irreversible que pidió por el agente?** **Recomendación:** sí, si su rol puede aprobar (`core:aprobaciones.manage`), pero **siempre desde la Bandeja**, no desde el panel, con una segunda confirmación; y un ajuste del tenant «cuatro ojos» para exigir que apruebe otra persona. Por qué: en empresas chicas el owner es quien pide y aprueba; separar la aprobación del chat evita aprobar por inercia.
7. **¿Qué roles usan el agente por defecto?** **Recomendación:** owner, admin y gerente sí; supervisor y viewer no, y cada empresa los habilita en la matriz de roles. Por qué: cada uso tiene costo de IA (o de licencia) y el supervisor opera mayormente en terreno; el viewer solo podría leer.
8. **¿Mostrar el texto mientras se escribe (streaming)?** Hoy el servidor envía eventos completos. **Recomendación:** en esta versión, mostrar los **pasos de trabajo en vivo** (qué está buscando o leyendo) y el texto completo al final; el streaming del texto queda para después si hace falta. Por qué: da la sensación de avance sin abrir el riesgo de mostrar texto de terceros a medio procesar ni cambiar el contrato del servidor.
9. **¿Qué portales tienen agente y en qué orden?** Hoy el servidor solo acepta ERP. **Recomendación:** ERP ahora; **Supervisor** después (con su alcance de instalaciones a cargo); Cliente y Trabajador recién con la especificación de Portales (fase 3). Por qué: los portales externos exponen el agente a personas fuera de la empresa y necesitan sus propias reglas de licencia y costo.
10. **Nombre visible del agente.** **Recomendación:** «OPAI» por defecto, con un ajuste del tenant para cambiarlo (por ejemplo, «Asistente Gard»). Por qué: cumple ADR-028 (marca del tenant) sin tocar código y mantiene «Preguntar a OPAI» como nombre del producto.
11. **Adjuntos y voz.** **Recomendación:** sin adjuntos ni botón de micrófono propio en esta versión; en el celular se usa el dictado del teclado. Adjuntar un documento ya cargado en OPAI (por `core.documentos`) entra en una versión siguiente. Por qué: los archivos pasan solo por `core.documentos` (ADR-019) y el micrófono está diferido por seguridad (cabeceras, sin permisos preventivos).
12. **¿La persona ve el costo de sus solicitudes?** **Recomendación:** no; ve cuántas solicitudes hizo. El costo lo ven owner y admin en Consumos. Por qué: el costo depende de la key del tenant y del margen (no decidido), y mostrarlo a todos genera ruido sin decisión posible.
13. **Licencia para Gard.** El módulo `agente` está apagado por defecto. **Recomendación:** activarla para Gard cuando el diseño esté aprobado, para que Diseño y QA y tú prueben el panel en `test.opai.cl` apenas se integre; con la key de IA propia de Gard conectada en Integraciones. Es **tu decisión y tu acción** (Plataforma → Empresas → Gard → Módulos); nadie la activa por código.

## 15. Design Prompt para Claude Design

Listo para copiar. Usa el proyecto del **OPAI 2.0 Design System V2** (Claude Design 44e4d7b9) y el diseño aprobado de navegación (53e9b74b) como base del shell.

```
Diseña el AGENTE INTERNO de OPAI 2.0 (el asistente de IA de cada empresa), usando EXCLUSIVAMENTE el «OPAI 2.0 Design System V2» (tokens --ds-*, Inter y JetBrains Mono, componentes y patrones del DS) y el shell aprobado de navegación (diseño 53e9b74b: barra lateral por áreas en escritorio, riel/lateral en iPad, barra superior de 52 px y barra inferior en teléfono). Nada de estilos de OPAI 1.0. Sin hex sueltos: solo tokens con nombre (bg, surface, surface-raised, fill, scrim, fg, fg-muted, fg-subtle, border, border-control, accent, accent-muted, success/warning/danger/info y sus -muted). Claro y oscuro.

CONTEXTO DEL PRODUCTO
OPAI es un ERP para empresas de seguridad privada, aseo y outsourcing (Chile). El agente actúa con los permisos de la persona conectada: consulta datos y prepara cambios, pero NUNCA escribe sin que la persona confirme un «plan» con vista previa. Lo irreversible va a una cola de aprobación humana (la Bandeja de Inicio). Usa datos de ejemplo realistas de una empresa de seguridad: cuenta «Banco Andino», instalaciones «Torre Norte» y «Centro de Distribución Quilicura», negocio «Renovación 2027 · Banco Andino», persona «Camila Rojas» (supervisora), turnos 4x4. Textos en español de Chile, tuteo, sin tecnicismos.

LANZADORES (muéstralos en las pantallas de shell)
- Escritorio e iPad: botón de ícono «Preguntar a OPAI» (ícono sparkles de lucide, 44 px) dentro del grupo FIJO de la cabecera, a la izquierda de la búsqueda; el grupo búsqueda + OPAI + campana + usuario no cambia de tamaño ni de posición entre pantallas. Tooltip con el atajo ⌘J.
- ⌘K: primera fila «Preguntar a OPAI: <texto escrito>» con el mismo ícono, sobre los resultados de entidades.
- Teléfono: barra inferior Inicio · Cuentas · Personas · OPAI · Más (OPAI en la cuarta columna) y primera fila dentro de «Buscar».
- Ficha: menú «⋯» de la cabecera de la ficha con «Preguntar a OPAI sobre esta cuenta».

PANEL DEL AGENTE — ANATOMÍA
1. Cabecera: título «OPAI», Select de modelo (agrupado por proveedor, con la clase «Económico/Estándar/Potente» como Badge; una opción «Modelo de OPAI · se cobra por uso» si no hay key propia), Segmentado «Paso a paso | Aprobar todo», menú ⋯ (Nueva conversación, Historial, Ayuda) y Cerrar. En teléfono, modelo y nivel van dentro del menú ⋯.
2. Chip de contexto bajo la cabecera: «Cuenta · Banco Andino» con ícono de la entidad y botón × para quitarlo. Al navegar con el panel abierto, una línea separadora en el hilo: «Ahora en: Instalación · Torre Norte».
3. Hilo: mensaje de la persona a la derecha (accent-muted), respuesta del agente a la izquierda (surface) con texto, listas, una tabla corta y, al pie, «Fuentes» como chips-enlace a fichas. Mientras prepara: pasos de trabajo en vivo, uno por línea, con estado (spinner → check): «Buscando la cuenta Banco Andino», «Leyendo 3 instalaciones», «Preparando vista previa».
4. Compositor fijo abajo: Textarea que crece hasta 6 líneas, botón Enviar (icono 44 px) que pasa a «Detener» mientras trabaja; pie discreto «OPAI usa Claude Sonnet · Revisa el plan antes de confirmar».
5. Hilo vacío: «¿En qué te ayudo?» + 3–4 chips de sugerencias según contexto («¿Qué instalaciones de Banco Andino tienen puestos por cubrir?», «Resume el negocio Renovación 2027», «¿Quién supervisa Torre Norte?»).

TARJETA DE PLAN (la pieza central: diséñala con cuidado)
- Card dentro del hilo: encabezado «Plan · 3 cambios», Badge del nivel, «Vence en 58 min».
- Un renglón por paso numerado: verbo de negocio y objeto («Cambiar el supervisor de Torre Norte»), y debajo el antes → después como pares clave/valor (valor anterior tachado en fg-subtle, nuevo en fg). Badge «Reversible» (info) o «Irreversible · va a aprobación» (warning).
- Variante «Aprobar todo»: botones Confirmar plan (primary), Pedir cambios (secondary), Descartar (ghost).
- Variante «Paso a paso»: solo el paso 1 activo con «Confirmar este paso»; pasos 2 y 3 atenuados «Pendiente».
- Ejecución: paso 1 «Hecho» (success, enlace «Ver en la ficha»), paso 2 «Ejecutando…», paso 3 en espera.
- Error: paso 2 «Falló» (danger) con mensaje en lenguaje de usuario + «Ver en auditoría»; paso 3 «No se ejecutó»; nota «El paso 1 ya se hizo y no se deshace».
- Irreversible: paso 3 «Enviado a aprobación · lo resuelve un administrador» con enlace «Ver en la Bandeja»; el plan muestra «Detenido hasta la aprobación».
- Vencido: tarjeta atenuada «Este plan venció. Pídelo de nuevo para ver los datos actuales» + «Pedir de nuevo».

TAMAÑOS (diseña cada uno)
- TELÉFONO 375 px: el panel es PANTALLA COMPLETA sobre el shell (oculta la barra inferior), cabecera propia de 52 px con Cerrar a la izquierda, compositor sobre la safe-area de iOS, áreas táctiles ≥ 44 px.
- IPAD 1024 px: panel SUPERPUESTO de 400 px a la derecha, con scrim suave; la barra superior sigue visible; el contenido NO se reacomoda.
- ESCRITORIO 1280 px: panel ACOPLADO de 400 px a la derecha bajo la barra superior, sin scrim; el contenido se reacomoda y la ficha sigue usable al lado; borde izquierdo border y tirador para redimensionar (360–560 px).

PANTALLAS A ENTREGAR (claro, y oscuro donde se indica)
Teléfono 375: (1) Inicio con la barra inferior con OPAI; (2) panel vacío con sugerencias; (3) conversación con respuesta y fuentes; (4) pasos de trabajo en vivo; (5) plan «Paso a paso»; (6) plan en ejecución con un paso hecho; (7) paso irreversible en aprobación; (8) sin conexión con borrador; (9) oscuro de (5).
iPad 1024: (10) ficha de cuenta Banco Andino con el panel superpuesto y plan «Aprobar todo»; (11) error del proveedor de IA; (12) mensaje «sin permiso» en el hilo; (13) oscuro de (10).
Escritorio 1280: (14) ficha de instalación Torre Norte con el panel acoplado y chip de contexto; (15) plan con error en el paso 2; (16) ⌘K con «Preguntar a OPAI: …» en la primera fila; (17) Historial (/agente/historial) en SplitScreen con pestañas «Conversaciones | Acciones», la pestaña Acciones con columnas fecha, acción, entidad, resultado (Badge) y «Ver en auditoría»; (18) Configuración → Agentes, sección «Agente interno» (AjustesForm: modelo predeterminado, obligar paso a paso, presupuesto mensual con aviso al 80 %, retención de conversaciones, nombre visible, sugerencias de inicio editables); (19) oscuro de (14).

ESTADOS OBLIGATORIOS (inclúyelos como variantes)
Cargando (skeleton con la forma del hilo), vacío, pensando, error del proveedor («El proveedor de IA de tu empresa no responde. No se hizo ningún cambio.» + Reintentar), sin proveedor conectado (versión administrador con «Conectar proveedor» y versión persona con «Avísale a un administrador»), sin permiso («Tu rol no permite cambiar supervisores. Pídeselo a alguien con ese permiso o a un administrador.», con candado), límite de frecuencia (cuenta regresiva), solicitud demasiado grande, presupuesto al 80 % (banda warning solo para administradores), presupuesto agotado (compositor desactivado), sin conexión (banda neutra, borrador conservado), corte de red durante la ejecución («Revisa el historial antes de volver a pedirlo»), plan vencido.

REGLAS DE DISEÑO
- Componentes del DS por nombre: Sheet, Button (primary/secondary/ghost/destructive, icon 44), Select, Segmentado, Chip, Badge, Card, Pares, Textarea, Tabs, Table, Empty, ErrorState, Forbidden, Loading, Alerta, Tooltip, CommandPalette, Timeline.
- Tipografía solo con estilos t-* (t-title, t-heading, t-body, t-body-sm, t-label, t-caption, t-mono para montos y folios).
- Radios rounded-md/lg; sombra shadow-overlay solo en el panel superpuesto de iPad.
- Transiciones de 150–200 ms con prefers-reduced-motion; foco visible; contraste AA en claro y oscuro.
- El texto que viene de registros (notas, correos) se muestra como texto plano: nunca como botón ni enlace externo clicable.
- Sin scroll horizontal de página: las tablas anchas se desplazan dentro de su contenedor.
- El agente no es una entrada del menú lateral: no agregues «Agente» a la barra lateral.
```

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
| 29-oct-2026 | Borrador inicial: reglas de la pantalla, 13 preguntas con recomendación y Design Prompt (CAR-69) | Pendiente |
