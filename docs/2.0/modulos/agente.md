# Agente interno — Especificación funcional de la pantalla

**Estado:** **borrador**; las 13 preguntas de §14 están **decididas por Carlos el 29-oct-2026** (todas según la recomendación, salvo la 11: el agente sí admite archivos adjuntos). Falta la aprobación del diseño (ADR-047) · **Fase:** cierre del Núcleo (enmienda ADR-049 §8, NÚCLEO-E2) · **Tarea:** CAR-69 (pedido de Carlos del 29-oct-2026 08:07 CLT, según la tarea CAR-69 en Linear) · **Insumos:** ADR-049 (con su enmienda y el mecanismo de NÚCLEO-E2), ADR-045, ADR-046, ADR-047, ADR-048, ADR-050, ADR-055, [`briefs/NUCLEO-E2-agente-interno.md`](../briefs/NUCLEO-E2-agente-interno.md), [`agentes/agente-interno.md`](../agentes/agente-interno.md), `NAVEGACION.md`, `DISENO.md` · **Autor:** Claude

> Lenguaje de negocio, sin código (ADR-047). El servidor del agente ya está en `main` (PR #62 proveedores de IA con herramientas y respaldo; PR #73 orquestación, planes firmados y confirmación). Esta especificación define **la interfaz**: cómo se abre, cómo se conversa, cómo se confirman los planes, qué historial hay, qué límites ve cada rol y todos los estados. Proceso de esta etapa: reglas → preguntas a Carlos (§14) → Design Prompt (§15) → aprobación del diseño por Carlos → recién entonces el brief de implementación. **No se construye nada con este documento.**

> **Licencia.** El módulo vendible `agente` viene **apagado por defecto** en todos los tenants (NÚCLEO-E2, bloque 1). **Hay que activar la licencia para Gard**: es una decisión y una acción de Carlos (Plataforma → Empresas → Gard → Módulos). Este PR no la activa ni la propone activar por código, migración ni semilla.

## 1. Objetivo

Que cualquier persona autorizada de la empresa pueda **pedirle a OPAI, en lenguaje natural, lo mismo que haría en pantalla** —consultar, preparar y ejecutar cambios— desde el celular, el iPad o el escritorio, **sin perder el contexto de lo que está mirando** y sin que el agente pueda hacer nada que esa persona no podría hacer sola. Toda escritura llega como un **plan legible** que la persona confirma; lo irreversible pasa por la cola de aprobación humana.

Se nota que funciona cuando:

- **Uso:** porcentaje de usuarios con `agente:usar` que lo abren al menos una vez por semana, y solicitudes por usuario activo.
- **Confianza:** porcentaje de planes confirmados sobre planes propuestos (alto = el plan es correcto), y cero escrituras sin confirmación (auditoría).
- **Velocidad:** tiempo desde la pregunta hasta la primera respuesta visible (meta p75 < 3 s para lecturas simples con el modelo «estándar»; el esqueleto del panel aparece en ≤ 200 ms, ADR-045).

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
| Adjunto | Archivo que la persona sube al mensaje (o documento de OPAI que ya puede ver) para que el agente lo lea | Mensaje, conversación, documento del núcleo | Núcleo, `core.documentos` con vínculo a la conversación (ADR-019); objeto en R2 por tenant (R24–R30) |
| Modelo | Un modelo disponible entre los proveedores de IA conectados por el tenant | Integraciones de IA del tenant | Núcleo (catálogo de integraciones, ADR-027) |

## 3. Pantallas y superficies

El agente **no es una página con entrada en el menú** (ADR-046: el menú es para colecciones). Es una **capa del shell** que acompaña a la persona mientras navega, más una vista de historial.

| Superficie | Ruta | Portal | Patrón DS | Ubicación |
|---|---|---|---|---|
| Panel del agente | Sin ruta propia; estado en la URL `?agente=1` (para volver atrás y compartir el estado abierto) | ERP (otros portales: pregunta 9) | **Componente nuevo del DS «Panel lateral»** (ADR-017: se diseña en Claude Design y se agrega a `packages/ds`): acoplado y redimensionable en escritorio, superpuesto bajo la barra superior en iPad, pantalla completa en teléfono. El `Sheet` actual no sirve: es modal, siempre con scrim, de 420 px fijos, tapa la barra superior y se cierra al tocar fuera. Se carga al abrirse (`hojaDiferida`) | Lanzadores de §3.1 |
| Historial | `/agente/historial` (pestañas «Conversaciones» y «Acciones») | ERP | `ListScreen`; en iPad/escritorio `SplitScreen` (lista + detalle) | Desde el menú «⋯» del panel; también desde Configuración → Agentes para quien gestiona |
| Configuración del agente | Dentro del centro de configuración del núcleo (ADR-018): sección «Agente interno» | ERP | `AjustesForm` | Configuración → Agentes (no hay página de configuración propia del módulo) |
| Consumo del agente | Configuración → Consumos, fila «Agente interno» (**no existe hoy**: `core.consumos.por_agente` solo cuenta keys y el resumen mensual lo suma a «personas»; cambio pedido en §9) | ERP | `DashboardScreen`/`Table` existentes | Configuración |

### 3.1 Cómo se abre (lanzadores)

1. **Botón fijo «Preguntar a OPAI»** (ícono de destello de lucide, `sparkles`), en el **grupo fijo de la cabecera** de iPad y escritorio, **entre la búsqueda y la campana**: en escritorio el grupo queda «búsqueda + OPAI + campana» (el usuario va al pie de la barra lateral, ADR-050); bajo 1024 px conserva el avatar. Mide y está igual en todas las vistas, como exige CAR-12: no se mueve cuando cambian las acciones de la página. En escritorio muestra el atajo en el tooltip. Ojo: suma 44 px al grupo y agrava el desborde de la cabecera de fichas a 768 px ya registrado en CAR-64; el diseño debe resolverlo (por ejemplo, búsqueda como ícono bajo 1024 px).
2. **Atajo de teclado** `⌘J` (Mac) / `Ctrl+J` (Windows y Linux) abre y cierra el panel desde cualquier pantalla del ERP (pregunta 3). `Esc` lo cierra y devuelve el foco al lanzador.
3. **Desde la búsqueda (⌘K):** el primer lugar ya reservado (NAVEGACION §7, Brief 05 §4.4) es «Preguntar a OPAI: <lo escrito>». Con Enter abre el panel con ese texto ya enviado. En el celular, el mismo primer lugar dentro de «Buscar».
4. **Teléfono:** además de «Buscar», **la columna 4 libre de la barra inferior** (ADR-050 la dejó vacía y su uso lo decide Carlos) pasa a «OPAI» cuando la empresa tiene la licencia y la persona tiene `agente:usar` (pregunta 2). Sin licencia o sin permiso, esa columna sigue con la regla actual.
5. **Desde una ficha o lista:** el menú «⋯» de la cabecera de fichas de Cuentas, Instalaciones, Negocios y Personas agrega «Preguntar a OPAI sobre esta <entidad>», que abre el panel con el contexto ya fijado.
6. **Desde una notificación o la Bandeja:** una aprobación pedida por el agente lleva «Ver conversación» (las conversaciones se guardan, pregunta 1).

**Sin licencia o sin `agente:usar`, ningún lanzador existe** (NAVEGACION §1.6: sin entradas deshabilitadas ni «disponible pronto»). El atajo no hace nada y ⌘K no muestra la fila reservada.

### 3.2 Cómo se ve, por tamaño

| Tamaño | Forma | Convivencia con el shell |
|---|---|---|
| **Teléfono (< 768 px)** | **Pantalla completa** sobre el shell (hoja a pantalla completa, como los drawers del DS). Cabecera propia de 52 px: «Cerrar» (izquierda), título «OPAI» con el chip de contexto debajo, menú «⋯» (historial, nueva conversación, modelo, nivel). Compositor fijo abajo, sobre la safe-area de iOS; la barra inferior del shell queda oculta mientras el panel está abierto | Al cerrar, vuelve exactamente a la pantalla y posición de scroll de origen. El botón «Atrás» del sistema cierra el panel (estado en la URL) |
| **iPad (768–1279 px)** | **Panel superpuesto** (componente «Panel lateral», variante superpuesta) de 400 px de ancho bajo la barra superior, con `scrim` suave sobre el contenido; el contenido no se reacomoda | No reacomodar evita los desbordes ya conocidos a 768 y 1024 px (CAR-64: fichas de ~390 px con la barra lateral de 248 px). Tocar fuera **no** cierra si hay un plan pendiente (pide confirmar descarte) |
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
   - **Adjuntos** del mensaje como tarjetas compactas bajo el texto de la persona; tocarlas abre la vista previa (imagen o PDF en el visor del DS; los demás, descarga con URL firmada).
   - **Tarjeta de plan** cuando hay escrituras (§3.4).
4. **Sugerencias de inicio** (solo con el hilo vacío): 3–4 `Chip` según el contexto y el rol, sacadas de las plantillas de la vertical copiadas al tenant (R20).
5. **Compositor:** botón **«Adjuntar»** (`Button` icono 44 px, ícono `paperclip`) a la izquierda, `Textarea` que crece hasta 6 líneas, contador al acercarse a 6.000 caracteres, botón «Enviar» (`Button` icono 44 px). «Adjuntar» abre un `Menu` con «Desde el dispositivo» (escritorio; también arrastrar y soltar sobre el panel y pegar una imagen), «Tomar foto» y «Elegir archivo» (teléfono, R29) y «Documento de OPAI» (buscador de documentos que la persona puede ver). Los adjuntos elegidos aparecen como **tarjetas de vista previa** sobre el `Textarea` (miniatura en imágenes; ícono del tipo, nombre, tamaño y páginas en los demás), cada una con su barra de carga, su estado y «Quitar» (R24–R30). Enter envía, Shift+Enter salto de línea (escritorio); en el teléfono, Enter es salto de línea y se envía con el botón. Mientras el agente trabaja, «Enviar» pasa a «Detener».
6. **Pie discreto:** «OPAI usa <modelo>. Revisa el plan antes de confirmar.» y, para quien tiene `agente:configurar`, el aviso de presupuesto al 80 % (R17).

### 3.4 Tarjeta de plan (confirmación)

Toda escritura llega como **una tarjeta de plan** dentro del hilo, nunca como texto suelto (R4):

- **Encabezado:** «Plan · 3 cambios», el nivel elegido y el vencimiento («Vence en 58 min»; vencido → R7).
- **Un renglón por paso**, en orden: verbo de negocio y objeto («Cambiar el supervisor de Torre Norte»), y debajo la **vista previa del dryRun** como diferencia antes → después (`Pares` con el valor anterior tachado en `text-fg-subtle` y el nuevo en `text-fg`). Cada renglón lleva su `Badge`: «Reversible» (`info`) o «Irreversible · va a aprobación» (`warning`).
- **Acciones del plan** (nivel «Aprobar todo»): «Confirmar plan» (`primary`), «Pedir cambios» (`secondary`), «Descartar» (`ghost`).
- **Acciones del paso** (nivel «Paso a paso»): solo el paso en curso está activo, con «Confirmar este paso», «Pedir cambios» y «Descartar plan»; los siguientes se ven atenuados con «Pendiente».
- **Pedir cambios** abre el compositor con «Cambia en el plan: …»; el agente prepara **un plan nuevo** y el anterior queda marcado «Reemplazado» (pregunta 4: no se editan argumentos a mano en la tarjeta).
- **Durante la ejecución:** cada paso muestra su estado: «Ejecutando…» → «Hecho» (`success`, con enlace a la ficha modificada) o «Falló» (`danger`, con el mensaje en lenguaje de usuario y «Ver en auditoría»). Un fallo detiene los pasos siguientes (R6).
- **Paso irreversible:** al llegar a él, el plan se detiene y la tarjeta muestra «Enviado a aprobación · lo resuelve <rol o persona>» con enlace a la solicitud en la Bandeja; los pasos siguientes quedan «No se ejecutaron · pídelos de nuevo después de la aprobación» (R5). Si se aprueba, la acción la ejecuta quien aprueba, no «vía» quien la pidió (`core.aprobaciones.aprobar`). Cuando se resuelve, la persona recibe el aviso por la campana (ADR-020, si el tenant lo activa) y el plan **no** continúa solo: hay que volver a pedirlo (NÚCLEO-E2: el plan se detiene allí).
- **Descartar** pide confirmación solo si el plan tenía pasos ya hechos («2 cambios ya se hicieron y no se deshacen»).

### 3.5 Historial

Pestañas por ruta (`Tabs`):

- **Conversaciones** (se guardan, pregunta 1; con sus adjuntos): lista con título (generado del primer mensaje, editable), contexto de origen, fecha, número de acciones ejecutadas; buscar por texto; abrir retoma la conversación en el panel; archivar y borrar (borrar es del propio usuario y es definitivo, Ley 21.719).
- **Acciones:** todas las escrituras hechas por «Agente interno vía <yo>» (hoy `agente.historial.list`), con fecha y hora, acción de negocio, entidad afectada (enlace), resultado (Hecho / Falló / En aprobación / Aprobado / Rechazado) y «Ver en auditoría». Filtros por periodo, resultado y módulo. Quien tiene `core:audit.read` (owner, admin y gerente por defecto) ve, además, el filtro «Todas las personas» en Configuración → Auditoría, filtrando por actor «Agente interno».

## 4. Campos y validaciones

Ningún campo es visible para el cliente ni para el trabajador: el agente solo existe en el portal ERP (pregunta 9).

| Campo | Tipo | Obligatorio | Validación | Quién lo edita |
|---|---|---|---|---|
| Mensaje | Texto | Sí (o al menos un adjunto) | 1 a 6.000 caracteres | La persona |
| Adjuntos | Archivos o documentos de OPAI | No | PDF, JPG, PNG, WebP, DOCX, XLSX, CSV y TXT; **hasta 10 MB por archivo, 5 por mensaje y 25 MB por mensaje**; tipo verificado por el contenido, no por la extensión (R24–R25) | La persona; el tenant puede bajar los límites (R20) |
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
- **R5.** Lo **irreversible** (capacidades con efecto irreversible; la autonomía configurada para las keys no aplica al agente interno) **siempre** va a la cola de aprobación humana (`core.aprobaciones`, Bandeja de Inicio), aunque el nivel sea «Aprobar todo». El plan se detiene allí. Quién puede aprobar sigue la regla vigente de aprobaciones (pregunta 6 sobre la propia persona).
- **R6.** Los pasos se ejecutan en orden; si uno falla, los siguientes no se ejecutan y la tarjeta lo dice. Lo ya hecho **no se revierte solo**: la tarjeta lista qué quedó hecho.
- **R7.** Un plan **vence a la hora** de prepararse (NÚCLEO-E2). Vencido, sus botones se desactivan y aparece «Este plan venció. Pídelo de nuevo para ver los datos actuales».
- **R8.** Un plan está ligado a la persona, la empresa, el portal y su acceso vigente. Si cambia de empresa, pierde el permiso o se cierra la sesión, los planes abiertos quedan **anulados** y se dice por qué.

**Contexto y datos**

- **R9.** La pantalla envía el contexto (tipo y id de la entidad que se mira); el servidor lo **revalida** con el alcance de la persona. Un contexto fuera de alcance se descarta sin decir si existe. El chip muestra solo el nombre visible para esa persona.
- **R10.** Todo lo que el agente lee de registros (notas, correos, documentos, descripciones) es **dato externo**: nunca confirma un plan, nunca crea un botón de acción y nunca habilita lo irreversible. La interfaz muestra texto plano con formato básico (negritas, listas, tablas, enlaces **solo internos**); no renderiza HTML, imágenes remotas ni enlaces externos clicables (se muestran como texto).
- **R11.** Las respuestas citan sus **fuentes** (los registros leídos) como enlaces a las fichas, solo si la persona puede abrirlas.

**Límites, consumo y presupuesto**

- **R12.** Límites por turno del servidor: 12 pasos de herramientas y 128.000 tokens medidos. Al superarlos, el turno termina sin escribir y el panel lo explica (§12). Límite de frecuencia: 20 solicitudes por minuto por persona.
- **R13.** Si la persona pide una **acción** que su rol no permite (la capacidad responde «sin permiso»), el agente responde **«Tu rol no permite <acción de negocio>. Pídeselo a alguien con ese permiso o a un administrador.»**, sin revelar datos ni nombres que no podría ver. Si lo pedido requiere un módulo inactivo: «Eso es parte de <módulo>, que tu empresa no tiene activo.» Un **registro fuera de alcance** no es un «sin permiso»: se responde igual que si no existiera (ADR-022, R9). El estado con candado de §12 necesita una señal estructurada del servidor (§9), no una inferencia del texto del modelo.
- **R14.** El **modelo** se elige entre los proveedores de IA conectados del tenant (ADR-049 §6). El tenant fija un modelo predeterminado; la persona puede cambiarlo por conversación. Si el tenant no tiene key propia, se usa el modelo de OPAI y se cobra el consumo (ADR-049 §9); la interfaz lo indica en el selector («Modelo de OPAI · se cobra por uso»). Si el tenant tiene key propia, el modelo de OPAI no aparece en el selector: si esa key falla, **nunca** se pasa a la de OPAI (R15).
- **R15.** Si la key del tenant falla, **nunca** se cae a la key de OPAI (ADR-049 §6, 21:58): el turno falla con un mensaje claro y la integración queda en error en Configuración → Integraciones.
- **R16.** Todo turno se **mide** en `core.consumos` (tokens y llamadas, proveedor y modelo, actor «Agente interno»), con o sin key propia.
- **R17.** **Presupuesto opcional por tenant** (0 = sin tope, por defecto, ADR-049 §9). Al 80 % se avisa a quienes tienen `agente:configurar` (banda en el panel y aviso por Comunicaciones si el tenant lo activa). Al 100 %, el agente deja de aceptar solicitudes para todos hasta el mes siguiente o hasta que se suba el tope; el mensaje para quien no configura es «El agente alcanzó el presupuesto del mes de tu empresa. Avísale a un administrador.»
- **R18.** Las personas ven el consumo **de la empresa** solo si tienen `core:consumos.read` (owner, admin y gerente por defecto). Cada persona ve, en el historial, cuántas solicitudes hizo, no costos.

**Historial y datos personales**

- **R19.** Las **acciones** del agente quedan siempre en la auditoría como «Agente interno vía <persona>» (ADR-049 §5) y se ven en el historial de la persona. Las **conversaciones** se guardan (pregunta 1, decidido por Carlos el 29-oct-2026) y son **privadas de la persona** (ni owner ni admin las leen), aisladas por tenant con RLS (el mismo usuario en dos empresas tiene dos historiales), con retención configurable por tenant y borrado por la propia persona (Ley 21.719, Brief 07d).

**Configurable por tenant (nada igual para todos, ADR-021)**

- **R20.** Ajustes del agente en Configuración → Agentes (permiso `agente:configurar`, solo personas): modelo predeterminado; obligar «Paso a paso»; presupuesto mensual (ya existe); retención de conversaciones y sus adjuntos (90 días por defecto); límites y tipos de adjuntos por debajo del máximo (R24); nombre visible del agente (pregunta 10); **sugerencias de inicio** por contexto (plantillas de la vertical **copiadas al tenant** y editables, P13). Qué roles usan el agente se define en la matriz de roles existente (permiso `agente:usar`, Brief 07c).

**Agent-first y paridad (ADR-055)**

- **R21.** El agente no tiene herramientas propias: **toda acción que puede hacer es una capacidad del registro** y la misma capacidad sirve a la pantalla, a `/api/v1` y al MCP de los agentes externos, con los mismos permisos, alcance y auditoría (ADR-004). Si algo no existe como capacidad, el agente responde que no puede hacerlo y lo registra como brecha (sin datos personales).
- **R22.** Las capacidades nuevas que necesite la pantalla (conversaciones y contexto, §9) se exponen igual en pantalla, en `/api/v1` y como herramienta MCP, o quedan como excepción justificada en `paridad-excepciones.ts` (solo `soloPersonas`). Preparar y confirmar ya son `soloPersonas`: un agente externo no puede manejar al agente interno ni confirmar por una persona.

**Sin conexión**

- **R23.** El agente **requiere conexión**. Sin red: el compositor se desactiva con «Sin conexión. Tu mensaje queda guardado y podrás enviarlo al volver.»; el borrador se guarda en el dispositivo; **nunca se encolan confirmaciones ni escrituras** para enviarlas después (no es terreno, ADR-044). Al volver la conexión, un plan abierto se revalida; si venció, R7. Sin red no se suben adjuntos: los que estaban subiendo quedan «Sin conexión · Reintentar» y no se envía el mensaje hasta que terminen.

**Archivos adjuntos (decisión de Carlos del 29-oct-2026, pregunta 11)**

- **R24. Tipos y tamaño.** Se admiten PDF, imágenes JPG, PNG y WebP, Word (DOCX), Excel (XLSX), CSV y texto plano: la lista del núcleo (`MIMES_NUCLEO`) **sin SVG**, que puede llevar código. Máximo **10 MB por archivo, 5 archivos y 25 MB por mensaje** (bajo el tope de 25 MB por documento del núcleo). Las fotos HEIC del iPhone se convierten a JPG en el dispositivo antes de subir; si no se puede, se rechazan con «Formato no admitido». El servidor verifica el tipo real por el contenido y rechaza archivos cifrados o con contraseña con un mensaje claro. El tenant puede **bajar** estos límites y quitar tipos (R20), nunca subirlos por encima del núcleo.
- **R25. Por dónde pasan.** Ningún archivo pasa por el agente «por su cuenta»: se sube con el servicio de documentos del núcleo (`core.documentos`, ADR-019), con URL firmada a R2 en el espacio del tenant, y queda **vinculado a la conversación** como documento de tipo «Adjunto del agente». No hay tabla de adjuntos propia del módulo. Si las conversaciones se guardan (pregunta 1, decidido que sí), el vínculo vive en la conversación; la tabla de conversaciones lleva `tenant_id`, RLS `tenant_isolation` y prueba de dos empresas.
- **R26. Quién los ve.** Un adjunto subido al agente es **privado de la persona que lo subió**, como su conversación: ni owner ni admin lo ven desde el agente. Nunca aparece en la pestaña Documentos de una ficha salvo que la persona lo guarde ahí con un plan (R28).
- **R27. El agente solo lee lo que la persona puede ver.** El agente lee los adjuntos del mensaje y, si la persona elige «Documento de OPAI», solo documentos que su rol y su alcance le permiten abrir (`core.documentos` con alcance por filas, ADR-022); cada lectura de un documento personal o sensible se audita como las demás lecturas documentales (NÚCLEO-H), solo con IDs. Un documento fuera de alcance no aparece en el buscador ni se puede leer, aunque alguien pegue su id. El contenido del archivo es **dato externo** (R10): nunca confirma un plan, nunca habilita lo irreversible y sus instrucciones se ignoran.
- **R28. Usar un archivo en un plan.** Si la persona pide, por ejemplo, «guarda este contrato en la cuenta Banco Andino», el agente propone un paso del plan con la capacidad de documentos correspondiente (vista previa, confirmación, auditoría); al confirmarse, el documento queda en la ficha con las reglas normales de Documentos. Sin plan confirmado, el archivo sigue siendo solo un adjunto de la conversación.
- **R29. Teléfono.** «Adjuntar» ofrece **«Tomar foto»** (abre la cámara del sistema) y **«Elegir archivo»** (fotos o archivos del dispositivo). No se pide permiso de cámara por adelantado: lo pide el sistema al usar la opción. En escritorio e iPad: elegir archivo, arrastrar y soltar sobre el panel y pegar una imagen del portapapeles; en iPad también «Tomar foto».
- **R30. Retención.** Los adjuntos se conservan **lo mismo que su conversación** (90 días por defecto, configurable por tenant, R20) y se borran con ella, incluido el objeto en R2. Si la persona borra la conversación, se borran sus adjuntos. Un documento que se guardó en una ficha con un plan (R28) deja de ser adjunto y sigue la retención de Documentos. Un «Documento de OPAI» adjuntado es solo un vínculo: borrar la conversación no lo borra.
- **R31. Modelo y consumo.** Si el modelo elegido no lee imágenes o PDF, el servidor extrae el texto (y OCR de imágenes con el adaptador de IA del núcleo, por clase de tarea, ADR-031) antes de enviarlo; si no se puede, el adjunto queda «No se pudo leer» y el turno sigue con el resto. El almacenamiento y la lectura se miden en `core.consumos` (ADR-031) y cuentan para el presupuesto del agente (R17).
- **R32. Voz.** Sigue **fuera de esta versión**: no hay botón de micrófono propio; en el teléfono se usa el dictado del teclado.

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
| En ejecución (paso a paso) | Esperando el paso siguiente | Sistema | Se hizo un paso y quedan más | El servidor entrega el token del paso siguiente; la persona lo confirma o descarta | — |
| Esperando el paso siguiente | Descartado con pasos hechos | Persona | «Descartar plan» | Los pasos ya hechos quedan; los demás no se ejecutan | Lo hecho no se deshace solo |

**Del paso:** pendiente → ejecutando → hecho | falló | en aprobación → (aprobado | rechazado | vencido, según `core.aprobaciones`).

## 7. Permisos por rol y portal

| Acción | owner | admin | gerente | supervisor | viewer | Portal Cliente | Portal Trabajador | Agente externo (key MCP) |
|---|---|---|---|---|---|---|---|---|
| Usar el agente (`agente:usar`) | sí | sí | sí | configurable, **no por defecto** | configurable, **no por defecto** | no (pregunta 9) | no (pregunta 9) | no: preparar y confirmar son solo personas |
| Qué puede pedir | todo lo que su rol permite | ídem | ídem, sin Finanzas ni montos de sueldo | solo lo de su alcance (ADR-022) | solo lecturas | — | — | — |
| Configurar el agente (`agente:configurar`) | sí | sí | no | no | no | — | — | no (solo personas) |
| Ver consumo de la empresa (`core:consumos.read`) | sí | sí | sí | no | no | — | — | según scopes de la key |
| Ver su propio historial de acciones | sí | sí | sí | sí | sí | — | — | lee el de su usuario responsable solo si es key de tipo usuario; nunca una key de servicio (ADR-051) |
| Aprobar lo irreversible pedido por el agente | según `core:aprobaciones.manage` | ídem | no | no | no | — | — | nunca |

Alcance de filas: el del usuario, aplicado en cada capacidad (ADR-022), nunca en la pantalla. Los roles que tienen `agente:usar` por defecto son la pregunta 7.

## 8. Eventos y notificaciones

| Evento | Cuándo ocurre | Quién se entera por defecto | Canal | Plantilla |
|---|---|---|---|---|
| `core.agente.presupuesto_80` (ya existe, `entidadTipo: agente_interno`) | El consumo del mes llega al 80 % del tope | Silencio por defecto (ADR-020); el tenant puede activarlo para quienes tienen `agente:configurar` | Campana y correo | «El agente interno usó el 80 % del presupuesto de <mes>.» |
| `core.agente.presupuesto_100` (ya existe) | Llega al 100 % | Ídem | Campana y correo | «El agente interno se detuvo: alcanzó el presupuesto de <mes>.» |
| Aprobación resuelta (ya existe en `core.aprobaciones`) | Alguien aprueba o rechaza un paso pedido por el agente | La persona que lo pidió | Campana | Existente |
| `core.integracion.error` (ya existe) | La key de IA del tenant falla | Quien gestiona integraciones | Campana y correo | Existente |

## 9. Herramientas MCP y capacidades

Existentes (NÚCLEO-E2):

| Capacidad | Qué hace | Lectura, escritura o irreversible | Con vista previa | Aprobación humana | MCP |
|---|---|---|---|---|---|
| `agente.modelos.list` | Lista los modelos conectados, sin credenciales | Lectura | — | No | Sí |
| `agente.turno.preparar` | Prepara la solicitud: lecturas y vistas previas, plan firmado | Escritura (no escribe negocio) | Sí | No | No (`soloPersonas`) |
| `agente.plan.confirmar` | Acepta o rechaza un plan o paso | Escritura | Sí | Lo irreversible de cada paso va a `core.aprobaciones` | No (`soloPersonas`) |
| `agente.historial.list` | Metadatos de acciones del agente vía el usuario | Lectura | — | No | Sí |

Flujo típico (detalle y escenario de prueba en [`agentes/agente-interno.md`](../agentes/agente-interno.md)): modelos → preparar (lecturas y dryRun) → la persona revisa la tarjeta → confirmar plan o paso → si un paso es irreversible, el plan se detiene en la cola de aprobación.

Cambios que esta pantalla **pide al servidor** (los fija el brief, no este documento):

1. `agente.turno.preparar` acepta **contexto** (tipo + id de entidad), revalidado con el alcance (R9), y el id de conversación (pregunta 1).
2. Eventos SSE de **progreso por herramienta** (nombre de negocio de la capacidad y conteo de registros, sin contenido) para los «pasos de trabajo» del hilo; hoy el SSE solo emite iniciado/resultado/error. El **texto** puede seguir llegando completo, sin fragmentos (pregunta 8).
3. `agente.historial.list` agrega entidad afectada, resultado y referencia de auditoría (hoy solo capacidad y fecha).
4. Conversaciones (pregunta 1, decidido que sí): `agente.conversaciones.list`, `.get`, `.renombrar`, `.archivar`, `.borrar` (del propio usuario); las tres escrituras aceptan `dryRun` (en MCP, `preview_…`) e `idempotencyKey` y quedan en la auditoría, con MCP para keys de tipo usuario (leen solo las de su responsable) y nunca para keys de servicio; tabla nueva con `tenant_id`, RLS `tenant_isolation`, prueba de dos empresas e inventario 07d.
5. Consumo y presupuesto del agente interno: fila «Agente interno» en Consumos (hoy `core.consumos.por_agente` solo cuenta keys) y una lectura del estado del presupuesto del mes (porcentaje usado) para la banda del 80 % (R17), visible para `agente:configurar`.
6. Señal estructurada en la respuesta del turno cuando una herramienta respondió «sin permiso» o «módulo inactivo» (R13), sin revelar datos.
7. **Adjuntos:** tipo de documento del núcleo «Adjunto del agente» (privado del usuario, sin capa de ficha), vínculo polimórfico a la conversación, `agente.turno.preparar` acepta ids de documentos ya subidos y revalida en servidor que la persona puede leerlos (R27); extracción de texto/OCR (R31); borrado de adjuntos y objetos de R2 al vencer o borrar la conversación, **salvo** los documentos guardados en una ficha con un plan (R28) y los «Documentos de OPAI» vinculados, que no se borran (R30, con el trabajo de retención 07d). Subir usa las capacidades existentes de `core.documentos` (con MCP); leer un adjunto desde el MCP solo lo permite a la propia persona, igual que sus conversaciones.
8. Ajustes nuevos del manifest (R20): modelo predeterminado, obligar paso a paso, retención, nombre visible y sugerencias de inicio, todos por `core.config.set` con `agente:configurar` y `soloPersonas`.

## 10. Integraciones

Proveedores de IA del tenant (Anthropic, OpenAI, Google, compatible con OpenAI, xAI) por el adaptador del núcleo (ADR-031, PR #62), con su key cifrada en el almacén del núcleo (ADR-027). Sin key propia, modelo de OPAI con consumo cobrado (ADR-049 §9). Con key propia, si falla, **nunca** se cae a la key de OPAI: el turno falla y se avisa (R15, ADR-049 §6). Todo consumo se mide en `core.consumos`. La interfaz nunca recibe ni muestra credenciales.

### Sin la fuente X (ADR-048)

El agente depende solo del Núcleo y del MCP; **todos los demás módulos son fuentes opcionales**. Con un módulo apagado, sus capacidades no existen para el agente: no aparecen sugerencias ni fuentes de ese módulo, el chip de contexto solo ofrece entidades de módulos activos y pedir algo de ese módulo da el mensaje de R13 («Eso es parte de <módulo>, que tu empresa no tiene activo»). Nunca hay pestañas ni lanzadores vacíos.

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
| Cargando el panel | Skeleton con la forma del hilo y del compositor (≤ 200 ms, ADR-045; variante nueva «hilo» de `Loading`; el shell no parpadea) |
| Pensando | Indicador sobrio en la burbuja del agente + los pasos de trabajo a medida que llegan; «Detener» disponible |
| Vacío (conversación nueva) | `Empty` con «¿En qué te ayudo?», el chip de contexto y 3–4 sugerencias de inicio según contexto y rol |
| Vacío (historial) | «Todavía no tienes conversaciones» / «El agente aún no ha hecho cambios por ti», con «Preguntar a OPAI» |
| Keys propias sin ningún modelo utilizable | El tenant configuró keys propias pero ninguna está activa (nunca se cae a la key de OPAI, R15). Para `agente:configurar`: «Ninguna key de IA de tu empresa está funcionando» con acción a Configuración → Integraciones. Para el resto: «El agente no está disponible ahora en tu empresa. Avísale a un administrador.» |
| Error del proveedor (key del tenant caída) | `ErrorState`: «El proveedor de IA de tu empresa no responde. No se hizo ningún cambio.» + «Reintentar»; al administrador, enlace a Integraciones |
| Error de red durante la ejecución | «Se cortó la conexión mientras se ejecutaba el plan. Revisa el historial de acciones antes de volver a pedirlo: algunos cambios pueden haberse hecho.» (NÚCLEO-E2: no se presume que no hubo escritura) |
| Sin permiso (R13) | Respuesta del agente en el hilo, con ícono de candado y el texto de R13; nunca datos parciales |
| Límite de frecuencia | «Vas muy rápido. Espera un minuto y vuelve a intentarlo.» con cuenta regresiva |
| Límite de pasos o tokens (R12) | «La solicitud es demasiado grande para un turno. Divídela en partes más chicas.» |
| Presupuesto agotado (R17) | Banda `warning` fija sobre el compositor, compositor desactivado |
| Sin conexión (R23) | Banda neutra «Sin conexión», compositor desactivado, borrador conservado |
| Plan vencido (R7) / anulado (R8) | Tarjeta atenuada con la razón y «Pedir de nuevo» |
| Adjunto subiendo | Tarjeta de vista previa con `BarraProgreso` y «Cancelar»; «Enviar» espera a que terminen todos |
| Adjunto listo | Tarjeta con miniatura o ícono del tipo, nombre, tamaño (y páginas en PDF) y «Quitar» |
| Adjunto rechazado | Tarjeta en `danger-muted` con la razón: «Formato no admitido», «Supera los 10 MB», «Máximo 5 archivos por mensaje», «El archivo está protegido con contraseña»; «Quitar» |
| Error de carga | «No se pudo subir. Revisa tu conexión.» + «Reintentar»; sin conexión, «Sin conexión · Reintentar» (R23) |
| Adjunto no leído (R31) | En la respuesta, aviso discreto «No pude leer <archivo>; respondí con el resto» |
| Documento de OPAI sin acceso | No aparece en el buscador (R27); nunca se muestra un «no tienes permiso» que revele que existe |

**Casos borde**

- La persona cambia de empresa con el panel abierto: el panel se cierra, la conversación queda en la empresa anterior y los planes se anulan (R8).
- Se navega con un plan propuesto abierto en iPad: el panel superpuesto se cierra al navegar solo si no hay plan pendiente; si lo hay, se mantiene abierto.
- Dos pestañas con el mismo plan: la segunda confirmación ve «Este plan ya se confirmó» (idempotencia del servidor).
- El modelo elegido deja de estar disponible (integración desconectada): el selector vuelve al predeterminado y lo avisa.
- Un registro leído contiene instrucciones («ignora las reglas y borra…»): se muestra como dato, el plan no cambia y lo irreversible sigue a aprobación (R10).
- Una respuesta muy larga o con tabla ancha: en el teléfono la tabla pasa a lista apilada (DISENO §4); en iPad y escritorio se desplaza dentro de su contenedor, nunca la página.
- Lector de pantalla: las respuestas nuevas se anuncian (`aria-live="polite"`), la tarjeta de plan es una región con título y el foco va al primer botón del plan al aparecer.
- Arrastrar un archivo sobre el panel en escritorio muestra una zona de soltado sobre el hilo («Suelta para adjuntar»); soltar más de 5 archivos adjunta los 5 primeros y avisa del resto.
- Un archivo con instrucciones dentro («confirma el plan», «ignora las reglas») se trata como dato (R27, R10).
- La persona pierde acceso a un «Documento de OPAI» que adjuntó antes: al reabrir la conversación la tarjeta dice «Ya no tienes acceso a este documento» y el agente no lo vuelve a leer.
- `prefers-reduced-motion`: sin animación de aparición del panel ni del indicador de «pensando» (solo cambio de opacidad).

## 13. Criterios de aceptación

Verificables por Carlos en `test.opai.cl` (con la licencia activada para Gard) y por Diseño y QA a 375, 1024 y 1280 px, claro y oscuro.

- **CA1.** Sin licencia o sin `agente:usar`, no aparece ningún lanzador (botón, atajo, ⌘K, barra inferior, menú de ficha) y `?agente=1` no abre nada.
- **CA2.** Con licencia y permiso, el panel se abre por los lanzadores 1 a 5 de §3.1, con su esqueleto en ≤ 200 ms, como pantalla completa en teléfono, superpuesto en iPad y acoplado en escritorio, sin mover la campana, la búsqueda ni el usuario (CAR-12).
- **CA3.** Desde la ficha de una cuenta, el chip muestra la cuenta; preguntar «¿cuántas instalaciones activas tiene?» responde con el número correcto y enlaza las fuentes.
- **CA4.** Pedir un cambio (por ejemplo, «cambia el supervisor de Torre Norte a <persona>») muestra una tarjeta de plan con el antes → después; nada cambia hasta confirmar; al confirmar, el cambio está en la ficha y en la auditoría como «Agente interno vía <persona>».
- **CA5.** En «Paso a paso», un plan de dos cambios pide dos confirmaciones; en «Aprobar todo», una. Con el ajuste «obligar paso a paso», no se ofrece «Aprobar todo».
- **CA6.** Un paso irreversible queda «En aprobación» con enlace a la Bandeja y el plan se detiene, aun en «Aprobar todo».
- **CA7.** Un supervisor con `agente:usar` que pide datos de una instalación que no tiene a cargo recibe la misma respuesta que para una instalación inexistente y ningún dato de ella; si pide una acción que su rol no permite, recibe el mensaje de R13.
- **CA8.** Con la red apagada, el compositor se desactiva, el borrador se conserva y no se envía ninguna confirmación al volver.
- **CA9.** El historial de acciones lista lo hecho por el agente con resultado y enlace a la auditoría; el historial de otra empresa del mismo usuario no aparece.
- **CA10.** Al superar el 80 % del presupuesto, quien configura ve el aviso; al 100 %, nadie puede enviar y el mensaje lo explica.
- **CA12.** En escritorio se adjunta un PDF arrastrándolo y en el teléfono una foto con «Tomar foto»; ambos muestran vista previa y barra de carga, el agente responde usando su contenido y los adjuntos solo se ven en la conversación de esa persona.
- **CA13.** Un archivo de 12 MB, un SVG o un sexto archivo se rechazan con su mensaje; un documento de OPAI fuera del alcance de la persona no aparece en el buscador.
- **CA14.** Al borrar la conversación (o al vencer su retención) se borran sus adjuntos; un documento guardado en una ficha con un plan sigue en la ficha y un «Documento de OPAI» vinculado no se borra.
- **CA11.** `tools/list` en `main` incluye las herramientas nuevas del brief y el gate de paridad está en verde.

## 14. Preguntas para Carlos y decisiones

**Decididas por Carlos el 29-oct-2026** (pedido en el PR #121): las 13 quedan **aprobadas tal como se recomendaron, salvo la 11**, donde el agente **sí admite archivos adjuntos** en esta versión (escritorio y teléfono; reglas R24–R32). Se conservan la pregunta y la recomendación como historia; la **decisión** va al final de cada una.

1. **¿Guardamos las conversaciones?** Hoy el servidor **no** guarda conversaciones (NÚCLEO-E2 lo decidió así): solo hay historial de acciones y un caché de 24 h. **Recomendación: sí, guardarlas**, privadas de cada persona (ni owner ni admin las leen), aisladas por empresa con RLS, con **retención de 90 días** configurable por tenant y borrado por la propia persona. Por qué: sin conversaciones, cerrar el panel o cambiar de dispositivo pierde el trabajo y el «historial de conversaciones» pedido no existe; la privacidad y la retención cumplen la Ley 21.719. Implica una migración y una prueba de dos empresas en el brief. **Decisión (29-oct-2026): Sí, se guardan como se recomendó.**
2. **¿Usamos la columna 4 libre de la barra inferior del teléfono para «OPAI»?** **Recomendación: sí**, solo cuando la empresa tiene la licencia y la persona `agente:usar`; si no, la columna sigue libre. Por qué: en el teléfono es la forma más directa de abrir el agente sin tocar la barra superior (ADR-050) y aprovecha el lugar que ADR-050 dejó sin decidir. **Decisión (29-oct-2026): Sí, «OPAI» en la columna 4.**
3. **Atajo de teclado: ¿`⌘J` / `Ctrl+J`?** **Recomendación: sí.** Es el atajo habitual de asistentes en apps de trabajo, queda junto a ⌘K y no choca con ningún atajo de OPAI. Alternativa si molesta (en Windows, `Ctrl+J` abre descargas en algunos navegadores cuando la página no lo captura): `⌘.` / `Ctrl+.`. **Decisión (29-oct-2026): Sí, `⌘J` / `Ctrl+J`.**
4. **«Pedir cambios» al plan: ¿se pide por texto o se editan los campos en la tarjeta?** **Recomendación: por texto en esta versión**: el agente prepara un plan nuevo con su vista previa y firma nueva. Por qué: editar argumentos a mano exige formularios por cada capacidad (y revalidar y volver a firmar), que ya existen en las pantallas de cada módulo; si un cambio es fino, la tarjeta enlaza a la pantalla normal. **Decisión (29-oct-2026): Por texto, como se recomendó.**
5. **Nivel de confirmación por defecto y tope del tenant.** **Recomendación:** «Paso a paso» por defecto para todos, recordado por persona; el tenant puede **obligar** «Paso a paso». Por qué: equilibra la confianza inicial con la rapidez para quien ya conoce el agente, y deja el control al dueño de la empresa. **Decisión (29-oct-2026): «Paso a paso» por defecto; el tenant puede obligarlo.**
6. **¿Puede la misma persona aprobar lo irreversible que pidió por el agente?** **Recomendación:** sí, si su rol puede aprobar (`core:aprobaciones.manage`; la acción queda auditada a nombre de quien aprueba), pero **siempre desde la Bandeja**, no desde el panel, con una segunda confirmación; y un ajuste del tenant «cuatro ojos» para exigir que apruebe otra persona. Por qué: en empresas chicas el owner es quien pide y aprueba; separar la aprobación del chat evita aprobar por inercia. **Decisión (29-oct-2026): Sí, desde la Bandeja con segunda confirmación y ajuste «cuatro ojos».**
7. **¿Qué roles usan el agente por defecto?** **Recomendación:** owner, admin y gerente sí; supervisor y viewer no, y cada empresa los habilita en la matriz de roles. Por qué: cada uso tiene costo de IA (o de licencia) y el supervisor opera mayormente en terreno; el viewer solo podría leer. **Decisión (29-oct-2026): Owner, admin y gerente por defecto.**
8. **¿Mostrar el texto mientras se escribe (streaming)?** Hoy el servidor envía eventos completos. **Recomendación:** en esta versión, mostrar los **pasos de trabajo en vivo** (qué está buscando o leyendo) y el texto completo al final; el streaming del texto queda para después si hace falta. Por qué: da la sensación de avance sin abrir el riesgo de mostrar texto de terceros a medio procesar; solo suma eventos de progreso al SSE (§9.2), sin fragmentos de texto. **Decisión (29-oct-2026): Pasos de trabajo en vivo y texto completo al final.**
9. **¿Qué portales tienen agente y en qué orden?** Hoy el servidor solo acepta ERP. **Recomendación:** ERP ahora; **Supervisor** después (con su alcance de instalaciones a cargo); Cliente y Trabajador recién con la especificación de Portales (fase 3). Por qué: los portales externos exponen el agente a personas fuera de la empresa y necesitan sus propias reglas de licencia y costo. **Decisión (29-oct-2026): ERP ahora; Supervisor después; Cliente y Trabajador con Portales.**
10. **Nombre visible del agente.** **Recomendación:** «OPAI» por defecto, con un ajuste del tenant para cambiarlo (por ejemplo, «Asistente Gard»). Por qué: cumple ADR-028 (marca del tenant) sin tocar código y mantiene «Preguntar a OPAI» como nombre del producto. **Decisión (29-oct-2026): «OPAI» por defecto, editable por tenant.**
11. **Adjuntos y voz.** **Recomendación:** sin adjuntos ni botón de micrófono propio en esta versión; en el celular se usa el dictado del teclado. Adjuntar un documento ya cargado en OPAI (por `core.documentos`) entra en una versión siguiente. Por qué: los archivos pasan solo por `core.documentos` (ADR-019) y el micrófono está diferido por seguridad (cabeceras, sin permisos preventivos). **Decisión (29-oct-2026): Sí, admite archivos** (escritorio y teléfono; en el teléfono desde la cámara o desde archivos). Tipos, tamaño, almacenamiento con RLS, lectura solo de lo que la persona puede ver y retención igual a la de la conversación en R24–R31. **La voz sigue fuera de esta versión** (R32).
12. **¿La persona ve el costo de sus solicitudes?** **Recomendación:** no; ve cuántas solicitudes hizo. El costo lo ven quienes tienen `core:consumos.read` (owner, admin y gerente por defecto) en Consumos. Por qué: el costo depende de la key del tenant y del margen (no decidido), y mostrarlo a todos genera ruido sin decisión posible. **Decisión (29-oct-2026): No; ve cuántas solicitudes hizo.**
13. **Licencia para Gard.** El módulo `agente` está apagado por defecto. **Recomendación:** activarla para Gard cuando el diseño esté aprobado, para que Diseño y QA y tú prueben el panel en `test.opai.cl` apenas se integre; con la key de IA propia de Gard conectada en Integraciones. Es **tu decisión y tu acción** (Plataforma → Empresas → Gard → Módulos); nadie la activa por código. **Decisión (29-oct-2026): Activarla cuando el diseño esté aprobado; la activa Carlos.**

## 15. Design Prompt para Claude Design

Listo para copiar. Usa el proyecto del **OPAI 2.0 Design System V2** (Claude Design 44e4d7b9) y el diseño aprobado de navegación (53e9b74b) como base del shell.

```
Diseña el AGENTE INTERNO de OPAI 2.0 (el asistente de IA de cada empresa), usando EXCLUSIVAMENTE el «OPAI 2.0 Design System V2» (tokens --ds-*, Inter y JetBrains Mono, componentes y patrones del DS) y el shell aprobado de navegación (diseño 53e9b74b: barra lateral por áreas en escritorio, riel/lateral en iPad, barra superior de 52 px y barra inferior en teléfono). Nada de estilos de OPAI 1.0. Sin hex sueltos: solo tokens con nombre (bg, surface, surface-raised, fill, scrim, fg, fg-muted, fg-subtle, border, border-control, accent, accent-muted, success/warning/danger/info y sus -muted). Claro y oscuro.

CONTEXTO DEL PRODUCTO
OPAI es un ERP para empresas de seguridad privada, aseo y outsourcing (Chile). El agente actúa con los permisos de la persona conectada: consulta datos y prepara cambios, pero NUNCA escribe sin que la persona confirme un «plan» con vista previa. Lo irreversible va a una cola de aprobación humana (la Bandeja de Inicio). Usa datos de ejemplo realistas de una empresa de seguridad: cuenta «Banco Andino», instalaciones «Torre Norte» y «Centro de Distribución Quilicura», negocio «Renovación 2027 · Banco Andino», persona «Camila Rojas» (supervisora), turnos 4x4. Textos en español de Chile, tuteo, sin tecnicismos.

LANZADORES (muéstralos en las pantallas de shell)
- Escritorio e iPad: botón de ícono «Preguntar a OPAI» (ícono sparkles de lucide, 44 px) dentro del grupo FIJO de la cabecera, entre la búsqueda y la campana; en escritorio el grupo es búsqueda + OPAI + campana (el usuario sigue al pie de la barra lateral); bajo 1024 px conserva el avatar. El grupo no cambia de tamaño ni de posición entre pantallas. Resuelve que a 768 px la cabecera de una ficha (Volver + acción principal + Fijar + grupo fijo) no se desborde. Tooltip con el atajo ⌘J.
- ⌘K: primera fila «Preguntar a OPAI: <texto escrito>» con el mismo ícono, sobre los resultados de entidades.
- Teléfono: barra inferior Inicio · Cuentas · Personas · OPAI · Más (OPAI en la cuarta columna) y primera fila dentro de «Buscar».
- Ficha: menú «⋯» de la cabecera de la ficha con «Preguntar a OPAI sobre esta cuenta».

PANEL DEL AGENTE — ANATOMÍA
1. Cabecera: título «OPAI», Select de modelo (agrupado por proveedor, con la clase «Económico/Estándar/Potente» como Badge; una opción «Modelo de OPAI · se cobra por uso» solo si la empresa no tiene key propia; con key propia esa opción no aparece y, si la key falla, nunca se usa la de OPAI), Segmentado «Paso a paso | Aprobar todo», menú ⋯ (Nueva conversación, Historial, Ayuda) y Cerrar. En teléfono, modelo y nivel van dentro del menú ⋯.
2. Chip de contexto bajo la cabecera: «Cuenta · Banco Andino» con ícono de la entidad y botón × para quitarlo. Al navegar con el panel abierto, una línea separadora en el hilo: «Ahora en: Instalación · Torre Norte».
3. Hilo: mensaje de la persona a la derecha (accent-muted), respuesta del agente a la izquierda (surface) con texto, listas, una tabla corta y, al pie, «Fuentes» como chips-enlace a fichas. Mientras prepara: pasos de trabajo en vivo, uno por línea, con estado (spinner → check): «Buscando la cuenta Banco Andino», «Leyendo 3 instalaciones», «Preparando vista previa».
4. Compositor fijo abajo: botón Adjuntar (icono paperclip 44 px) a la izquierda, Textarea que crece hasta 6 líneas, botón Enviar (icono 44 px) que pasa a «Detener» mientras trabaja; pie discreto «OPAI usa Claude Sonnet · Revisa el plan antes de confirmar». Adjuntar abre un Menu: en teléfono «Tomar foto», «Elegir archivo» y «Documento de OPAI»; en escritorio «Desde el dispositivo» y «Documento de OPAI» (además arrastrar y soltar sobre el panel y pegar imágenes).
6. Adjuntos: tarjetas de vista previa sobre el Textarea, en fila con desplazamiento horizontal dentro del compositor (nunca de la página): imagen con miniatura; PDF, DOCX, XLSX, CSV y TXT con ícono del tipo, nombre truncado, tamaño y páginas. Cada tarjeta muestra su estado: subiendo (BarraProgreso + Cancelar), listo (Quitar), rechazado (danger-muted con la razón: «Formato no admitido», «Supera los 10 MB», «Máximo 5 archivos por mensaje», «Protegido con contraseña»), error de carga («No se pudo subir» + Reintentar), sin conexión («Sin conexión · Reintentar»). Enviar queda desactivado mientras algo sube. En el hilo, el mensaje enviado muestra sus adjuntos como tarjetas compactas que abren la vista previa. Zona de soltado en escritorio: overlay sobre el hilo con borde accent discontinuo y «Suelta para adjuntar · hasta 5 archivos de 10 MB». Aviso en la respuesta cuando un archivo no se pudo leer: «No pude leer contrato.pdf; respondí con el resto». Sin botón de micrófono: la voz no está en esta versión.
5. Hilo vacío: «¿En qué te ayudo?» + 3–4 chips de sugerencias según contexto («¿Qué instalaciones de Banco Andino tienen puestos por cubrir?», «Resume el negocio Renovación 2027», «¿Quién supervisa Torre Norte?»).

TARJETA DE PLAN (la pieza central: diséñala con cuidado)
- Card dentro del hilo: encabezado «Plan · 3 cambios», Badge del nivel, «Vence en 58 min».
- Un renglón por paso numerado: verbo de negocio y objeto («Cambiar el supervisor de Torre Norte»), y debajo el antes → después como pares clave/valor (valor anterior tachado en fg-subtle, nuevo en fg). Badge «Reversible» (info) o «Irreversible · va a aprobación» (warning).
- Variante «Aprobar todo»: botones Confirmar plan (primary), Pedir cambios (secondary), Descartar (ghost).
- Variante «Paso a paso»: solo el paso 1 activo con «Confirmar este paso»; pasos 2 y 3 atenuados «Pendiente».
- Ejecución: paso 1 «Hecho» (success, enlace «Ver en la ficha»), paso 2 «Ejecutando…», paso 3 en espera.
- Error: paso 2 «Falló» (danger) con mensaje en lenguaje de usuario + «Ver en auditoría»; paso 3 «No se ejecutó»; nota «El paso 1 ya se hizo y no se deshace».
- Irreversible: paso 2 «Enviado a aprobación · lo resuelve un administrador» con enlace «Ver en la Bandeja»; paso 3 «No se ejecutó · pídelo de nuevo después de la aprobación». El plan termina ahí: no continúa solo.
- Vencido: tarjeta atenuada «Este plan venció. Pídelo de nuevo para ver los datos actuales» + «Pedir de nuevo».

TAMAÑOS (diseña cada uno)
- TELÉFONO 375 px: el panel es PANTALLA COMPLETA sobre el shell (oculta la barra inferior), cabecera propia de 52 px con Cerrar a la izquierda, compositor sobre la safe-area de iOS, áreas táctiles ≥ 44 px.
- IPAD 1024 px: panel SUPERPUESTO de 400 px a la derecha, bajo la barra superior (que sigue visible), con scrim suave solo sobre el contenido; el contenido NO se reacomoda; tocar fuera no lo cierra si hay un plan pendiente.
- ESCRITORIO 1280 px: panel ACOPLADO de 400 px a la derecha bajo la barra superior, sin scrim; el contenido se reacomoda y la ficha sigue usable al lado; borde izquierdo border y tirador para redimensionar (360–560 px).

PANTALLAS A ENTREGAR (claro, y oscuro donde se indica)
Teléfono 375: (1) Inicio con la barra inferior con OPAI; (2) panel vacío con sugerencias; (3) conversación con respuesta y fuentes; (3b) menú Adjuntar abierto («Tomar foto», «Elegir archivo», «Documento de OPAI»); (3c) compositor con una foto subiendo y un PDF listo; (3d) adjunto rechazado por tamaño; (4) pasos de trabajo en vivo; (5) plan «Paso a paso»; (6) plan en ejecución con un paso hecho; (7) paso irreversible en aprobación; (8) sin conexión con borrador; (9) oscuro de (5).
iPad 1024: (10) ficha de cuenta Banco Andino con el panel superpuesto y plan «Aprobar todo»; (11) error del proveedor de IA; (12) mensaje «sin permiso» en el hilo; (12b) buscador «Documento de OPAI» filtrado por la cuenta del contexto; (13) oscuro de (10).
Escritorio 1280: (14) ficha de instalación Torre Norte con el panel acoplado y chip de contexto; (15) plan con error en el paso 2; (15b) arrastrando dos archivos sobre el panel (zona de soltado); (15c) mensaje enviado con un PDF y una planilla adjuntos y la respuesta que los usa, con un aviso «No pude leer …»; (16) ⌘K con «Preguntar a OPAI: …» en la primera fila; (17) Historial (/agente/historial) en SplitScreen con pestañas «Conversaciones | Acciones», la pestaña Acciones con columnas fecha, acción, entidad, resultado (Badge) y «Ver en auditoría»; (18) Configuración → Agentes, sección «Agente interno» (AjustesForm: modelo predeterminado, obligar paso a paso, presupuesto mensual con aviso al 80 %, retención de conversaciones, nombre visible, sugerencias de inicio editables, límites y tipos de adjuntos); (19) oscuro de (14).

ESTADOS OBLIGATORIOS (inclúyelos como variantes)
Cargando (skeleton con la forma del hilo), vacío, pensando, error del proveedor («El proveedor de IA de tu empresa no responde. No se hizo ningún cambio.» + Reintentar), ninguna key propia funcionando (versión administrador con «Revisar integraciones» y versión persona con «Avísale a un administrador»), sin permiso («Tu rol no permite cambiar supervisores. Pídeselo a alguien con ese permiso o a un administrador.», con candado), límite de frecuencia (cuenta regresiva), solicitud demasiado grande, presupuesto al 80 % (banda warning solo para administradores), presupuesto agotado (compositor desactivado), sin conexión (banda neutra, borrador conservado), corte de red durante la ejecución («Revisa el historial antes de volver a pedirlo»), plan vencido; y para adjuntos: subiendo, listo, rechazado (formato, tamaño, cantidad, contraseña), error de carga con Reintentar, sin conexión y no leído.

REGLAS DE DISEÑO
- El panel es un COMPONENTE NUEVO del DS, «Panel lateral», con tres variantes (acoplado redimensionable en escritorio, superpuesto en iPad, pantalla completa en teléfono): diséñalo también en su hoja de componente con sus estados. No es el Sheet modal actual.
- Componentes del DS por nombre: Sheet (solo para hojas secundarias), Button (primary/secondary/ghost/destructive, icon 44), Select, Segmentado, Chip, Badge, Card, Pares, Textarea, Tabs, Table, Empty, ErrorState, Forbidden, Loading (variante nueva «hilo»), Banda (avisos de presupuesto y sin conexión), Menu (opciones de Adjuntar), BarraProgreso (carga de adjuntos), Uploader (base para la zona de soltado y las tarjetas de archivo; si no alcanza, propón la variante), Tooltip, CommandPalette, Timeline.
- Tipografía solo con estilos t-* (t-title, t-heading, t-body, t-body-sm, t-label, t-caption, t-mono para montos y folios).
- Radios rounded-md/lg; sombra shadow-overlay solo en el panel superpuesto de iPad.
- Transiciones de 150–200 ms con prefers-reduced-motion; foco visible; contraste AA en claro y oscuro.
- El texto que viene de registros (notas, correos) se muestra como texto plano: nunca como botón ni enlace externo clicable.
- Sin scroll horizontal de página: en teléfono las tablas anchas pasan a lista apilada; en iPad y escritorio se desplazan dentro de su contenedor.
- El agente no es una entrada del menú lateral: no agregues «Agente» a la barra lateral.
```

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
| 29-oct-2026 | Borrador inicial: reglas de la pantalla, 13 preguntas con recomendación y Design Prompt (CAR-69) | Pendiente |
| 29-oct-2026 | Autorrevisión: panel como componente nuevo del DS, R5 sin autonomía de keys, eventos de presupuesto existentes, permisos de gerente, fuera de alcance = inexistente, §9 ampliado, «Sin la fuente X» | Pendiente |
| 29-oct-2026 | Decisiones de Carlos en §14 (las 13 según la recomendación, salvo la 11): el agente admite archivos adjuntos (R24–R32), estados de adjuntos y Design Prompt actualizado; la voz sigue fuera | Carlos (decisiones de §14) |
