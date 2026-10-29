# Seguimiento comercial — Especificación funcional

**Estado:** borrador para aprobación de Carlos · **Fase:** 2 (módulo Comercial) · **Fecha:** 29-oct-2026 · **Tarea:** CAR-67 · **Insumos:** `modulos/comercial.md` (R29, §8, §9), `extraccion/comercial-y-cpq.md` §3.6, código vivo de OPAI 1.0 (`Cryptobal/opai` @ `40d19a5`, solo lectura), ADR-020, ADR-021, ADR-029, ADR-032, ADR-040, ADR-047, ADR-048 y ADR-049 · **Autor:** Claude

> Lenguaje de negocio, sin código (ADR-047). Es una parte del módulo **Comercial** (R29 de `comercial.md`), escrita en un documento propio porque cruza Comercial, CPQ, Comunicaciones y el agente interno, y porque `comercial.md` ya pasa las 390 líneas. `comercial.md` R29 apunta aquí. Las reglas se citan como «Seguimiento R1…» y los criterios como «Seguimiento CA1…» para no confundirlas con las de `comercial.md`. Después de que Carlos la apruebe viene el Design Prompt (`design/DESIGN-PROMPT-seguimiento-comercial.md`), el diseño aprobado y recién entonces el brief.

## 1. Objetivo

Que ninguna cotización enviada ni ningún negocio abierto quede olvidado: cada empresa (tenant) define **cuándo, por qué canal y quién** hace cada seguimiento; OPAI lo agenda, lo recuerda, lo prepara (o lo envía, si la empresa lo permite), se detiene cuando el cliente responde y propone cerrar cuando el cliente no responde. El vendedor abre una sola vista y sabe qué le toca hoy. Un agente puede programar, pausar, preparar y proponer cerrar seguimientos por MCP con los mismos permisos del usuario, y lo irreversible (enviar a un cliente, ganar) pasa por la aprobación humana.

**Cómo se nota que funciona:**
- 100 % de las cotizaciones enviadas en 2.0 con la opción «iniciar seguimiento» tienen un seguimiento activo, pausado con motivo o terminado; las enviadas con «solo enviar» o «mover sin seguimiento» se cuentan aparte, y ninguna queda «sin iniciar» sin esa decisión explícita.
- Ningún paso de seguimiento queda vencido más de un día hábil sin hacerse, posponerse u omitirse con motivo.
- Ningún negocio abierto supera el umbral de días sin actividad de su etapa sin que el responsable lo haya visto (alerta leída o negocio actualizado).

## 2. Qué hace hoy OPAI 1.0 (piso verificado en el código)

Verificado en `Cryptobal/opai` @ `40d19a5` (`src/lib/crm/followup-cadence.ts`, `followup-scheduler.ts`, `followup-outcome.ts`, `on-client-engagement.ts`, `deal-hygiene-config.ts`, `components/cpq/FollowUpDecisionModal.tsx`), «playbook Gard» del 21-oct-2026. **Difiere de la extracción del 23-oct** (`extraccion/comercial-y-cpq.md` §3.6 dice «3/7/3 días»): el código vivo usa días hábiles **3, 7 y 14** contados desde el envío, más un paso interno el día hábil **15**. Ver pregunta 2.

| Regla de 1.0 | Detalle |
|---|---|
| Disparador | Enviar la cotización (portal o correo) o mover el negocio a «Cotización enviada». Al enviar, la persona elige: **incluir en seguimiento**, **mover a otra etapa sin seguimiento** (avisa cuántos pasos pendientes se cancelan) o **no hacer nada** |
| Cadencia | Paso 1: día hábil 3, correo. Paso 2: día hábil 7, llamada o WhatsApp. Paso 3: día hábil 14, correo. Paso 4: día hábil 15, revisión interna «Proponer perdido». El día de envío no cuenta |
| Días hábiles | Lunes a viernes menos los feriados del tenant (tabla de feriados de Nómina) |
| Hora | Hora local fija del tenant (por defecto 9:00, America/Santiago) |
| Quién envía | Correo automático **apagado por defecto** (bandera del tenant y del entorno); lo envía una persona desde su Gmail. Cada paso crea una **tarea** al dueño de la cuenta |
| Plantillas | Una plantilla de correo por paso (1, 2 y 3) |
| Avance de etapa | Opcional: paso 1 mueve a «Primer seguimiento», paso 2 a «Segundo seguimiento» |
| Cliente responde | Un correo entrante del hilo (Gmail sincronizado) o del contacto mueve el negocio a **«Negociación»** y cancela los seguimientos. No baja un negocio que ya está en Negociación o más adelante |
| Cierre sin respuesta | Al terminar: si el monto mensual es **menor a $3.000.000**, cierra como **perdido** solo, con motivo «sin respuesta»; si es igual o mayor, crea la tarea **«Proponer perdido»** el día hábil 15. Nunca cierra un negocio en Negociación o posterior |
| Reenvío | Enviar una nueva propuesta cancela los pasos pendientes y reprograma desde el nuevo envío |
| Pausa | Pausar, reanudar y cancelar a mano |
| Estado visible | «Sin iniciar», «Activo», «Con atrasos», «Automatización pausada», «Con fallos», «Fallido», «Completado» |
| Negocios detenidos | Alerta de negocios en Negociación sin actividad por **14 días** (ajuste del tenant) |
| Otros | Tarjeta en Slack para cotizaciones enviadas sin respuesta a las 48 h; botón «Enviar + abrir WhatsApp» |

**Problemas de 1.0 que se corrigen:** cadencia fija en el código (solo cambian la hora y las plantillas); umbral de $3.000.000 cableado; etapas buscadas por nombre («Negociación», «Primer seguimiento»), que se rompen si el tenant las renombra; la respuesta del cliente depende de leer Gmail; seguimientos solo para cotizaciones, no para negocios; registro en tablas propias (`CrmFollowUpLog`) separado de la actividad; el correo «automático» mezcla bandera del tenant y variable de entorno.

## 3. Entidades y relaciones

| Entidad | Qué es | Se relaciona con | Dónde vive |
|---|---|---|---|
| Plan de seguimiento | Receta configurable de la empresa: disparador, pasos, qué pasa al responder y cómo se cierra. **Versionado**: un seguimiento en curso conserva la versión con la que empezó | Pasos del plan (1..N); plantillas de Comunicaciones | Comercial (configuración). El catálogo declarativo de ADR-040 punto 7 es una lista plana; el plan necesita una colección hija (pasos), versiones y vista previa de fechas, así que el núcleo extiende el catálogo declarativo con eso (pregunta 17) en vez de crear una página propia del módulo (ADR-018) |
| Paso del plan | Un toque de la cadencia: cuándo, por qué canal, quién lo ejecuta y con qué plantilla | Plan; variante de plantilla; etapa destino opcional | Comercial (dentro del plan) |
| Seguimiento | La aplicación de un plan a **un negocio** (y, si nace de una cotización, a esa cotización): ancla, estado y pasos agendados | 1 negocio; 0..1 referencia a la cotización que **CPQ entrega** al iniciar (id, código y fecha de envío; Comercial no lee tablas de CPQ, ADR-040 punto 2); 1 versión de plan | Comercial |
| Paso agendado | Un paso del plan con su fecha y hora reales y su resultado | Seguimiento; actividad del núcleo (tarea o interacción); envío de Comunicaciones; aprobación (si lo propuso un agente) | Comercial (el registro de lo hecho queda en `core.actividades`) |
| Regla de negocio detenido | Días máximos sin actividad por etapa del embudo | Etapas del embudo | Comercial (atributo de la etapa; se edita como columna del editor del Embudo) |
| Calendario hábil | Días hábiles y feriados de la empresa | Planes con días hábiles; también Nómina y Asistencia | Núcleo (no existe hoy; ver pregunta 3) |
| Plantilla | Texto por evento comunicable, canal y **variante** | Pasos del plan | Núcleo, Comunicaciones (ADR-020) |

Relación central: **negocio 1—N seguimientos** (a lo más **uno activo o pausado** a la vez, R6); **seguimiento 1—N pasos agendados**; **plan 1—N versiones**. Comercial no crea tablas de plantillas ni de tareas: usa Comunicaciones y Actividad del núcleo (R29 de `comercial.md`; extracción §3.6: «automatización sobre eventos y plantillas de Comunicaciones, no tablas de Comercial»).

## 4. Pantallas y pestañas

| Pantalla | Ruta | Portal | Patrón | Entrada |
|---|---|---|---|---|
| Pendientes del vendedor | `/negocios?vista=pendientes` | ERP | Lista agrupada (Vencidos · Hoy · Próximos 7 días · Esperan tu aprobación · Detenidos, R21) con vista dividida en iPad y escritorio | Tercera vista de Comercial → Negocios (Tablero · Lista · **Pendientes**), sin entrada nueva de menú (pregunta 11) |
| Tarjeta «Mis seguimientos de hoy» | Inicio | ERP | Tarjeta del tablero con conteos que llevan a la vista Pendientes. No es una segunda bandeja: las tareas de seguimiento y las aprobaciones siguen apareciendo en la Bandeja de Inicio como cualquier tarea asignada o aprobación; Pendientes es la vista comercial de esos mismos datos, agrupada por negocio | Inicio |
| Bloque «Seguimiento» de la ficha del negocio | `/negocios/[id]` (Resumen) | ERP | Sección de ficha: estado, plan, próximo paso, línea de pasos y acciones | Ficha del negocio |
| Ejecutar un paso | Hoja sobre Pendientes o la ficha | ERP | Hoja (`Sheet`) según el canal: correo (borrador editable con la plantilla), WhatsApp (texto y «Abrir WhatsApp»), llamada (guion y resultado), interno (revisar y decidir) | Desde la fila o el bloque |
| Iniciar seguimiento al enviar la cotización | Paso final del envío de CPQ, o hoja desde el negocio | ERP | Hoja con tres opciones (como 1.0) y la vista previa de las fechas | CPQ «Enviar» / ficha del negocio |
| El cliente respondió | Hoja | ERP | Hoja con el efecto configurado y lo que cambia | Bloque o fila |
| Proponer o confirmar el cierre | Hoja | ERP | Hoja con motivo de pérdida y efecto (R19 de `comercial.md`) | Paso interno, bloque o cola |
| Cola de aprobaciones | La existente del núcleo | ERP | Lista (núcleo) | Borradores y cierres propuestos por un agente |
| Configuración → Comercial → Seguimiento | Centro de Configuración | ERP | Catálogo declarativo (lista de planes) y editor de plan (pasos ordenables) | Solo owner y admin |
| Configuración → Comunicaciones | Existente del núcleo | ERP | Editor de plantillas por evento, canal y variante | Ya existe; gana variantes (pregunta 9) |

**Ficha del negocio:** el bloque Seguimiento va en el Resumen, junto a «próximo paso» y «último contacto» (R13 de `comercial.md`). Los pasos hechos aparecen en la pestaña **Actividad** como interacciones (correo, llamada, WhatsApp) o tareas; no hay pestaña nueva.

**Tablero de negocios:** cada tarjeta muestra, si corresponde, un indicador corto: «Seguimiento 2 de 4 · hoy», «Vencido», «Pausado» o «Detenido · 16 días».

**Celular frente a iPad y escritorio:**
- En el celular: Pendientes, ejecutar un paso (enviar el correo preparado, abrir WhatsApp, registrar la llamada), «El cliente respondió», pausar, posponer y confirmar un cierre. Es el uso diario del vendedor en terreno.
- En iPad y escritorio: además, el editor de planes y los umbrales de negocios detenidos (en el editor del Embudo).

## 5. Campos y validaciones

**Plan de seguimiento** (ningún campo visible para el cliente ni el trabajador)

| Campo | Tipo | Oblig. | Validación | Quién lo edita |
|---|---|---|---|---|
| Nombre | Texto | Sí | 3–60 caracteres, único en la empresa | owner, admin |
| Disparador | `cotizacion_enviada` · `entra_a_etapa` (elige etapa abierta) · `manual` | Sí | Etapa activa y abierta | owner, admin |
| Por defecto para su disparador | Sí/no | — | Uno por disparador (y por etapa en `entra_a_etapa`) | owner, admin |
| Cómo se cuentan los días | `habiles` · `corridos` | Sí | `habiles` usa el calendario hábil del núcleo; mientras no exista, cuenta lunes a viernes y Configuración lo avisa (pregunta 3) | owner, admin |
| Desde dónde se cuenta | `desde_el_inicio` (ancla) · `desde_el_paso_anterior` | Sí | — | owner, admin |
| Hora local por defecto | Hora | Sí | Zona del tenant; dentro de la ventana de envío | owner, admin |
| Ventana de envío | Rango de horas | Sí | Por defecto 08:00–19:00; OPAI nunca envía al cliente fuera de ella | owner, admin |
| Ventana por canal | Rango de horas por canal | No | Opcional, dentro de la ventana del plan (por ejemplo, llamadas 09:00–18:00, WhatsApp 09:00–20:00); las tareas de persona vencen dentro de la ventana de su canal | owner, admin |
| Al responder el cliente | Ver R13 | Sí | Etapa destino activa y abierta | owner, admin |
| Al terminar sin respuesta | `proponer_cierre` · `cerrar_perdido_bajo_umbral` · `solo_avisar` | Sí | El umbral es CLP entero > 0 | owner, admin |
| Umbral para cerrar solo | CLP entero mensual | Si eligió cerrar bajo umbral | > 0 | owner, admin |
| No cerrar desde la etapa | Etapa abierta | No | Desde esa etapa en adelante, el plan nunca cierra solo (1.0: «Negociación») | owner, admin |
| Activo | Sí/no | Sí | Apagar no cancela los seguimientos en curso: los deja terminar o se cancelan en lote con vista previa | owner, admin |

**Paso del plan**

| Campo | Tipo | Oblig. | Validación |
|---|---|---|---|
| Orden | Entero | Sí | 1..20 pasos por plan |
| Cuándo | Días (entero ≥ 0) | Sí | Creciente si se cuenta desde el inicio |
| Hora | Hora | No | Si falta, la del plan; dentro de la ventana del plan y de su canal |
| Canal | `correo` · `whatsapp` · `llamada` · `interno` | Sí | `interno` no contacta al cliente |
| Quién lo ejecuta (R29) | `persona` · `opai_automatico` · `agente` | Sí | `opai_automatico` solo en `correo`, con plantilla aprobada y dominio de correo verificado; nunca en `llamada` ni `interno` |
| A quién se asigna | `responsable_del_negocio` · usuario fijo · rol | Si es `persona` | Debe tener `comercial:negocios.manage` |
| Plantilla | Variante de plantilla de Comunicaciones | Si es `correo` o `whatsapp` | De un evento comunicable de seguimiento y del mismo canal; si la variante declara etapas, R24 |
| Guion | Texto | No | Para `llamada` |
| Mover a etapa al hacerse | Etapa abierta | No | Nunca a la ganada ni a la perdida |
| Vencimiento para la persona | Horas hábiles | No | Por defecto, al cierre del mismo día hábil |

**Seguimiento (por negocio)**

| Campo | Tipo | Validación |
|---|---|---|
| Plan y versión | Referencia | Se congela al iniciar |
| Ancla | Fecha y hora | Envío de la cotización, entrada a la etapa o inicio manual |
| Cotización | Referencia que entrega CPQ (id, código, fecha de envío) | Solo con disparador `cotizacion_enviada` |
| Destinatarios | Contactos del negocio | Por defecto el principal del negocio; deben tener rol en el negocio (R16 de `comercial.md`) y correo o teléfono según el canal |
| Estado | Ver §7 | Calculado por acciones |
| Motivo de pausa o cancelación | Texto | Obligatorio al pausar o cancelar a mano |

**Paso agendado:** fecha y hora programadas, canal, ejecutor, asignado, estado (§7), versión de plantilla usada, quién lo hizo, resultado (para llamadas: `contesto_interesado`, `contesto_sin_interes`, `no_contesto`, `pidio_volver_a_llamar` con fecha) y vínculo a la actividad que lo registra.

## 6. Reglas de negocio

**Planes y configuración**
- **R1.** Todo es configuración del tenant. Al activar Comercial, OPAI **copia** al tenant el plan base de su vertical (seguridad: «Post-cotización» con los pasos de 1.0 de §2 —días hábiles 3, 7, 14 y 15— y **«proponer el cierre»** al terminar) y sus plantillas; desde ahí el tenant lo edita, lo duplica o crea otros. La plantilla de vertical no cambia sola en el tenant (ADR-021, P13). Ningún valor propio de una empresa (como el umbral de $3.000.000 de Gard) va en la plantilla de la vertical: Gard lo carga como configuración propia (pregunta 4).
- **R2.** Los planes se versionan. Editar un plan crea una versión nueva; los seguimientos en curso siguen con la suya, salvo que una persona los pase a la nueva con vista previa de las fechas que cambian.
- **R3.** Hay a lo más un plan por defecto por disparador (y por etapa, en `entra_a_etapa`). Una persona puede elegir otro plan al iniciar.

**Inicio**
- **R4.** Con CPQ activo, CPQ inicia el seguimiento por capacidad de Comercial (`comercial.seguimientos.iniciar` con el id, el código y la fecha de envío de la cotización), igual que ya escribe el valor del negocio (ADR-040 punto 2). Enviar una cotización ofrece iniciar el plan por defecto de `cotizacion_enviada`, con tres opciones (piso de 1.0): **iniciar seguimiento** (opción marcada), **mover a otra etapa sin seguimiento** o **solo enviar**. Muestra las fechas que quedarán y cuántos pasos pendientes se cancelan si ya había un seguimiento.
- **R5.** Sin CPQ (ADR-048, fuente opcional), el seguimiento se inicia al entrar a la etapa configurada (`entra_a_etapa`) o a mano desde el negocio.
- **R6.** Un negocio tiene a lo más **un seguimiento activo o pausado**. Iniciar otro (por ejemplo, al enviar una nueva versión de la cotización) cancela los pasos pendientes del anterior con motivo «reemplazado» y reprograma desde el nuevo envío (piso de 1.0). Lo ya hecho se conserva en la Actividad.

**Agenda**
- **R7.** Cada paso se agenda en la **hora local** del tenant (o la del paso) del día que resulta de contar los días configurados. En días hábiles cuentan lunes a viernes menos los feriados del calendario del tenant y **el día del ancla no cuenta** (piso de 1.0). En días corridos, si el resultado cae fuera de la ventana de envío, se corre al siguiente momento dentro de ella.
- **R8.** Si cambia el calendario (se agrega un feriado), los pasos pendientes se reprograman solos; los hechos no se tocan.

**Ejecución**
- **R9.** Según quién lo ejecuta:
  - **Persona:** a la hora del paso se crea una **tarea** en la Actividad del negocio, asignada según el paso, con el borrador listo (correo con la plantilla y las variables resueltas; WhatsApp con el texto; llamada con el guion). La persona lo envía **desde OPAI** con un clic, o lo hace fuera y lo registra. Hecho el paso, la tarea se cierra sola.
  - **OPAI automático:** a la hora del paso, OPAI envía la plantilla al destinatario por el adaptador de correo del tenant, registra la interacción y mide el consumo. **Apagado por defecto** en todo plan; el tenant lo activa por paso.
  - **Agente:** a la hora del paso, OPAI lo deja **«por preparar»** (los trabajos programados solo encolan, ADR-029; OPAI no tiene lógica de agente propia, ADR-049 punto 2). Un agente lo toma: el externo por MCP desde `comercial_seguimientos_list`, o el agente interno cuando el usuario se lo pide («prepara mis seguimientos de hoy»), con la confirmación de su nivel (ADR-049 punto 4). El agente **prepara un borrador** personalizado a partir de la plantilla y del negocio, que queda en la cola de aprobaciones; una persona lo aprueba (tal cual o editado) o lo descarta, y recién al aprobarlo sale. **Respaldo:** si nadie lo preparó al vencer el plazo del paso, pasa a tarea de persona con el borrador base de la plantilla. Que el agente envíe sin aprobación es una opción aparte, apagada por defecto (R18).
- **R10.** Antes de contactar al cliente, OPAI revisa que el negocio siga abierto, que el seguimiento siga activo y que el destinatario tenga el dato del canal. Si falta algo, el paso queda **fallido** con el motivo («contacto sin correo») y se avisa al asignado; no se reintenta solo. Una persona o un agente lo reintenta después de corregir (por ejemplo, cambiar el destinatario por otro contacto con rol en el negocio).
- **R11.** Una persona puede **posponer** un paso (nueva fecha, mueve o no los siguientes), **omitirlo** con motivo o **hacerlo antes** (ejecutarlo ahora; los siguientes se recalculan solo si se cuentan desde el paso anterior). Si el paso declara «mover a etapa», al hacerse el negocio se mueve con las reglas de entrada de la etapa (R9 de `comercial.md`); si no cumple los requisitos, no se mueve y se avisa.

**Cuando el cliente responde**
- **R12.** «El cliente respondió» es un hecho que registra una persona o un agente desde el negocio, el paso o la vista Pendientes (canal y resumen), o que OPAI detecta cuando el cliente responde a un correo enviado desde OPAI (pregunta 5). OPAI no lee buzones (ADR-032). Para eso:
  - **Remitente (From):** el nombre del vendedor con la dirección verificada del dominio del tenant (por ejemplo, «Camila Rojas · Atlas Seguridad»). Sin dominio verificado, el correo sale por el remitente por defecto del adaptador y el vendedor queda en copia.
  - **Responder a (Reply-To):** la dirección de entrada del tenant con un identificador del seguimiento, más el correo del vendedor, para que la respuesta le llegue igual a su buzón.
  - **Al llegar:** OPAI busca primero ese identificador y asocia la respuesta al negocio **antes** de tratarla como solicitud nueva (no crea una solicitud duplicada, `comercial.md` R1). La registra en la Actividad como interacción del cliente con el texto marcado como externo y aplica R13. Si no la puede asociar, sigue el camino de Solicitudes.
- **R13.** El efecto lo configura el plan, combinable: **(a) detener** la cadencia (por defecto), **(b) pausar** hasta una fecha, **(c) reiniciar** desde un paso; además **mover a una etapa** (Gard: «Negociación», elegida por id, no por nombre) y **crear una tarea** «Responder al cliente» al responsable con plazo en horas hábiles (por defecto 4). Nunca baja un negocio que ya está en esa etapa o más adelante (piso de 1.0).

**Cierre**
- **R14.** Ganar sigue siendo una acción humana (o de agente con aprobación) con los requisitos de su etapa (R9 y R18 de `comercial.md`). Ganar o perder el negocio **termina** su seguimiento y cancela los pasos pendientes.
- **R15.** Al terminar los pasos sin respuesta, el plan hace lo configurado:
  - **proponer el cierre** (por defecto): una tarea «Proponer perdido» al responsable con motivo `sin_respuesta` sugerido; cerrar es la acción «Perder» de siempre, con motivo;
  - **cerrar como perdido bajo un umbral** (piso de 1.0, Gard < $3.000.000 mensuales): OPAI pierde el negocio con motivo `sin_respuesta`, lo deja en la Actividad como hecho por «OPAI automático», avisa al responsable y se puede reabrir desde el aviso con el motivo prellenado («cerrado por la cadencia sin respuesta») y confirmación (R20 de `comercial.md`). Sobre el umbral, o sin monto, propone;
  - **solo avisar.**
  Ningún plan cierra solo un negocio que está en la etapa «no cerrar desde» o más adelante, ni uno con una actividad del cliente posterior al último paso.
- **R16.** Lo propuesto lo confirma **el responsable del negocio o cualquier persona con `comercial:negocios.manage`**. Si lo propone un agente, va a la cola de aprobaciones.
- **R17.** **Vencidos**, que avisan pero no son un estado del negocio (R8 de `comercial.md`: abierto, ganado o perdido):
  - **cierre estimado vencido:** la fecha de cierre estimada pasó con el negocio abierto; se avisa al responsable para actualizarla o cerrar;
  - **cotización vencida:** con CPQ, cuando vence la validez de la oferta de la vigente, CPQ lo publica (evento, por ejemplo `cpq.cotizacion.vencida`) y el consumidor de Comercial agrega un paso interno «Renovar o perder». Comercial no consulta la validez: la define y la avisa CPQ.

**Envío por agentes y autonomía**
- **R18.** Contactar a un cliente es **irreversible**: para un agente pide aprobación humana (`APPROVAL_REQUIRED`). El tenant puede permitir que el agente envíe solo un paso determinado, y solo si además la key del agente tiene autonomía «directo» sobre esa acción; ambas cosas apagadas por defecto. Todo envío lleva clave de idempotencia: un paso nunca sale dos veces.
- **R19.** El agente actúa con la identidad, los permisos y el alcance del usuario (ADR-049 punto 3). Lo que el agente lee del cliente (respuestas, texto de terceros) vuelve marcado como externo y nunca habilita por sí solo un envío ni un cierre.

**Negocios detenidos y pendientes del vendedor**
- **R20.** Cada etapa abierta puede declarar **días máximos sin actividad** (hábiles o corridos). Un negocio que los supera queda **detenido**: aparece en Pendientes, lleva el indicador en el tablero y avisa al responsable una vez (no todos los días). Deja de estar detenido con cualquier actividad nueva o cambio de etapa. Gard parte con Negociación = 14 días (piso de 1.0); las demás etapas, sin umbral hasta que el tenant lo fije.
- **R21.** **Pendientes** muestra, para el usuario conectado (o el responsable que elija quien puede ver a todos): pasos vencidos, de hoy y de los próximos 7 días; borradores del agente esperando su aprobación; cierres propuestos; negocios detenidos y con cierre estimado vencido. Cada fila se resuelve ahí mismo sin abrir la ficha.
- **R22.** Todo **aviso interno** respeta el silencio por defecto (ADR-020): Pendientes y el tablero muestran todo siempre, pero correos y push internos solo salen si el tenant activó el evento. El **contacto al cliente** de un paso no es un aviso: sale solo por la acción explícita de una persona, de un agente aprobado o de un paso «OPAI automático» que el tenant activó; usa la plantilla y la variante de Comunicaciones, pero no su ruteo ni su silencio.

**Auditoría e historial**
- **R23.** Todo lo que hace el seguimiento queda en la Actividad del negocio y en la auditoría: quién (persona, OPAI automático o «agente vía usuario»), qué paso, qué versión de plantilla y qué resultado. Nada se borra; corregir es registrar un hecho nuevo.

**Plantillas y etapas del embudo**
- **R24.** Las plantillas viven en Comunicaciones del núcleo, nunca en tablas de Comercial. Cada variante de un evento de seguimiento puede declarar las **etapas del embudo** en que aplica (por id). Al ejecutar un paso, la hoja ofrece primero la variante del paso; si el negocio está en una etapa que esa variante no cubre y existe otra variante del mismo evento para esa etapa, la propone (por ejemplo, «Seguimiento en Negociación» en vez de «Seguimiento 3»). Una variante sin etapas aplica a todas.

## 7. Estados y transiciones

**Seguimiento**

| Desde | Hacia | Quién | Condición | Efecto | ¿Reversible? |
|---|---|---|---|---|---|
| (iniciar) | activo | Comercial, agente, CPQ al enviar, entrada a etapa | Negocio abierto, plan activo, sin otro activo (R6) | Agenda los pasos | — |
| activo | pausado | Comercial o agente; respuesta del cliente (R13 b) | Motivo | Congela los pasos pendientes | Sí, reanudar (reprograma desde hoy) |
| activo / pausado | terminado | Sistema | Pasos hechos u omitidos, respuesta con «detener», o negocio ganado o perdido | Cancela los pendientes | No (se inicia otro) |
| activo / pausado | cancelado | Comercial o agente; reemplazo (R6) | Motivo | Cancela los pendientes | No (se inicia otro) |

Estado visible en la ficha (piso de 1.0): **Sin iniciar · Activo · Con atrasos · Pausado · Con fallos · Terminado** (con el motivo: cliente respondió, ganado, perdido, sin respuesta, cancelado).

**Paso agendado**

| Desde | Hacia | Quién | Condición | Efecto |
|---|---|---|---|---|
| programado | por hacer | Sistema, a su hora | Ejecutor persona | Tarea al asignado |
| programado | por preparar | Sistema, a su hora | Ejecutor agente | Visible para los agentes y en Pendientes |
| por preparar | borrador por aprobar | Agente | — | Entra a la cola de aprobaciones |
| por preparar | por hacer | Sistema | Nadie lo preparó al vencer (respaldo de R9) | Tarea de persona con el borrador base |
| borrador por aprobar | por hacer | Persona | Descarta el borrador | El paso vuelve a la persona; el borrador descartado queda en la auditoría |
| programado / por hacer / borrador por aprobar | hecho | Persona, OPAI automático, agente aprobado | R10 cumple | Registra la interacción; mueve de etapa si corresponde |
| programado / por hacer | pospuesto → programado | Persona o agente | Nueva fecha | Reagenda |
| programado / por hacer / borrador por aprobar | omitido | Persona o agente | Motivo | Sigue el siguiente paso |
| programado / por hacer | fallido | Sistema | R10 no cumple o falla el envío | Aviso al asignado |
| fallido | por hacer | Persona o agente | Reintentar tras corregir (destinatario, dato del canal) | Vuelve a la persona o al envío |
| cualquiera pendiente | cancelado | Sistema | Seguimiento terminado o cancelado | Cierra la tarea |

## 8. Permisos por rol y portal

| Acción | owner | admin | gerente | supervisor | viewer | Portal Cliente | Portal Trabajador | Agente |
|---|---|---|---|---|---|---|---|---|
| Ver seguimientos, Pendientes y negocios detenidos | ✓ | ✓ | ✓ | — | ✓ | — | — | scope `comercial` |
| Iniciar, pausar, reanudar, cancelar, posponer, omitir | ✓ | ✓ | ✓ | — | — | — | — | ✓ con vista previa |
| Ejecutar un paso como persona (enviar desde OPAI) | ✓ | ✓ | ✓ | — | — | — | — | — (el agente envía con `enviar_paso`, abajo) |
| Registrar un paso hecho fuera de OPAI, cambiar destinatario, reintentar | ✓ | ✓ | ✓ | — | — | — | — | ✓ con vista previa |
| Preparar, editar o descartar el borrador de un paso | ✓ | ✓ | ✓ | — | — | — | — | ✓ con vista previa (descartar, solo el propio) |
| Enviar al cliente | ✓ | ✓ | ✓ | — | — | — | — | Aprobación humana (R18) |
| Registrar «el cliente respondió» | ✓ | ✓ | ✓ | — | — | — | — | ✓ con vista previa |
| Proponer el cierre | ✓ | ✓ | ✓ | — | — | — | — | ✓ |
| Confirmar el cierre (perder) | ✓ | ✓ | ✓ | — | — | — | — | Como «Perder» de `comercial.md` |
| Configurar planes, umbrales y negocios detenidos; pasar seguimientos a una versión nueva; cancelar en lote | ✓ | ✓ | — | — | — | — | — | ✓ con vista previa, solo si el usuario de la key tiene `comercial:config.manage` |

Los permisos son los de Comercial: ver con `comercial:negocios.read`, operar con `comercial:negocios.manage` y configurar con `comercial:config.manage` (pregunta 15). Alcance de filas igual que los negocios: en la v1 quien tiene Comercial ve todos (pregunta 5 de `comercial.md`); Pendientes filtra por responsable, que es un filtro, no un alcance.

## 9. Eventos y notificaciones

Silencio por defecto (ADR-020) para los avisos internos. Los dos primeros eventos son el **contacto al cliente**: llevan plantilla por canal y **variante** (una por paso del plan, R24), pero no tienen ruteo ni silencio: salen solo por la acción explícita de R22. El aviso de «paso por hacer» a la persona **no es un evento nuevo**: es el `core.actividad.tarea_asignada` que ya dispara la tarea (`comercial.md` §8), con el tipo «seguimiento».

| Evento | Cuándo ocurre | Quién se entera (recomendado para Gard) | Canal | Plantilla |
|---|---|---|---|---|
| `comercial.seguimiento.correo_cliente` | Un paso de correo se envía al cliente | — (destinatarios del seguimiento, R22) | Correo | Sí, por variante (Seguimiento 1, Seguimiento 3…) |
| `comercial.seguimiento.whatsapp_cliente` | Un paso de WhatsApp se prepara | — (lo envía la persona desde su teléfono) | WhatsApp | Sí, por variante |
| `comercial.seguimiento.borrador_por_aprobar` | Un agente dejó un borrador | El responsable del negocio (recomendado) | In-app, push | Sí |
| `comercial.seguimiento.paso_fallido` | Un paso falla (R10) | El asignado (recomendado) | In-app | Sí |
| `comercial.seguimiento.cliente_respondio` | Se registra o detecta la respuesta | El responsable (recomendado) | In-app, push | Sí |
| `comercial.seguimiento.cierre_propuesto` | Terminan los pasos sin respuesta | El responsable (recomendado) | In-app | Sí |
| `comercial.seguimiento.cerrado_automatico` | OPAI pierde el negocio bajo el umbral | El responsable y el owner (recomendado) | In-app, correo | Sí |
| `comercial.negocio.detenido` | Supera los días sin actividad de su etapa | El responsable (recomendado), una vez | In-app | Sí |
| `comercial.negocio.cierre_vencido` | Pasa la fecha de cierre estimada | El responsable | In-app | Sí |
| `comercial.seguimiento.resumen_diario` | Cada día hábil a la hora que fije el tenant (por defecto, 08:30) | Cada vendedor con pendientes (opcional) | Correo, push | Sí |

Los eventos de dominio `comercial.seguimiento.iniciado`, `.pausado`, `.reanudado`, `.terminado`, `.cancelado`, `.paso_hecho` y `.paso_omitido` salen por el outbox en la misma transacción (ADR-029) para que otros consumidores (reportes, sincronización con 1.0) los usen; no son comunicables.

## 10. Herramientas MCP

| Herramienta | Qué hace | Efecto | Vista previa | Aprobación humana |
|---|---|---|---|---|
| `comercial_seguimientos_list` | Pasos pendientes con filtros (responsable, estado, vencidos, hoy, próximos, negocio) | Lectura | — | — |
| `comercial_seguimientos_get` | Seguimiento de un negocio con su plan, pasos y resultados | Lectura | — | — |
| `comercial_seguimientos_iniciar` | Iniciar un plan en un negocio (o reemplazar el activo) | Escritura | ✓ (fechas que quedan y lo que se cancela) | — |
| `comercial_seguimientos_pausar` / `reanudar` / `cancelar` | Pausar con motivo, reanudar o cancelar (cancelar acepta varios a la vez, por ejemplo al desactivar un plan) | Escritura | ✓ | — |
| `comercial_seguimientos_cambiar_version` | Pasar uno o varios seguimientos en curso a la versión nueva de su plan (R2) | Escritura | ✓ (fechas que cambian) | — (exige `comercial:config.manage`) |
| `comercial_seguimientos_set_destinatarios` | Cambiar los contactos destinatarios del seguimiento | Escritura | ✓ | — |
| `comercial_seguimientos_posponer_paso` / `omitir_paso` | Mover un paso (a una fecha posterior o a ahora, «hacer antes») o saltarlo con motivo | Escritura | ✓ | — |
| `comercial_seguimientos_reintentar_paso` | Reintentar un paso fallido después de corregir | Escritura | ✓ | — |
| `comercial_seguimientos_preparar_paso` | Dejar o editar el borrador de un paso de correo o WhatsApp (texto, destinatarios, variante) | Escritura | ✓ | — |
| `comercial_seguimientos_descartar_borrador` | Descartar un borrador preparado; el paso vuelve a la persona | Escritura | ✓ | — |
| `comercial_seguimientos_enviar_paso` | Enviar al cliente el paso preparado | **Irreversible** | ✓ (texto final y destinatarios) | **Sí**, salvo R18 |
| `comercial_seguimientos_registrar_paso` | Registrar un paso hecho fuera de OPAI (llamada con resultado, WhatsApp enviado) | Escritura | ✓ | — |
| `comercial_seguimientos_registrar_respuesta` | «El cliente respondió», con canal y resumen | Escritura | ✓ (efecto del plan: etapa, tarea, pausa) | — |
| `comercial_seguimientos_proponer_cierre` | Proponer perder con motivo sugerido | Escritura | ✓ | Queda en la cola para que una persona confirme |
| `comercial_negocios_detenidos` | Negocios detenidos y con cierre vencido | Lectura | — | — |
| `comercial_negocios_perder` / `ganar` (existentes) | Confirmar el cierre | Escritura / Ganar con aprobación | ✓ | Como en `comercial.md` |
| `comercial_config_*` (las existentes, ampliadas con el catálogo «planes de seguimiento» y la columna de días sin actividad de las etapas) | Leer y editar planes y umbrales | Escritura | ✓ | — (solo con `comercial:config.manage`) |

**Flujo típico del agente (para `docs/2.0/agentes/seguir-cotizaciones.md`, con su escenario de prueba, ADR-034):**
1. Cada mañana, `comercial_seguimientos_list` con «hoy y vencidos» del usuario.
2. Por cada paso de correo: leer el negocio y la última actividad, `preview_comercial_seguimientos_preparar_paso` y luego prepararlo.
3. Por cada paso de llamada: agregar a la tarea que ya existe (R9) un resumen del negocio para la persona, sin crear otra.
4. Si en la Actividad hay una respuesta del cliente sin registrar como tal, proponer `registrar_respuesta` con vista previa.
5. Para los seguimientos que terminaron sin respuesta, `proponer_cierre`.
6. Se detiene antes de enviar, ganar o perder: eso queda en la cola de aprobaciones.

## 11. Integraciones

- **Correo saliente:** por el adaptador de correo del tenant (Resend por defecto, dominio propio verificado para el envío automático), con la marca del tenant (ADR-028). Medido en consumos.
- **Correo de entrada:** la dirección de entrada del tenant (la de Solicitudes, `comercial.md` §10) recibe las respuestas a los correos enviados desde OPAI; OPAI las asocia al negocio por el identificador del seguimiento antes de tratarlas como solicitud (R12, pregunta 5).
- **CPQ:** no se lee. CPQ inicia el seguimiento por capacidad al enviar (R4) y publica el vencimiento de la oferta por evento (R17).
- **WhatsApp:** en la v1, enlace con el texto preparado que la persona envía desde su teléfono y luego registra (piso de 1.0, «Enviar + abrir WhatsApp»). La API de WhatsApp Business por integración del tenant, con consumo medido, queda para después (pregunta 10).
- **IA:** el agente prepara borradores por el adaptador de IA del núcleo, por clase de tarea (`estandar`), con la key del tenant si la tiene (ADR-031, ADR-049).
- **Calendario hábil:** del núcleo (pregunta 3).
- **Slack:** solo como canal opcional de notificaciones del núcleo; no se porta la tarjeta de 48 h (pregunta 12).
- **OPAI 1.0:** durante la convivencia, los seguimientos de negocios que siguen en 1.0 siguen allí; ver pregunta 16.

## 12. Sin las fuentes CPQ y agente interno (ADR-048)

**Sin CPQ.** Comercial no depende de CPQ. Sin CPQ activo: no aparece la opción de iniciar al enviar ni el paso «cotización vencida»; los planes usan los disparadores `entra_a_etapa` o `manual`; el correo de seguimiento no adjunta enlace a la cotización (la plantilla no ofrece esa variable). Todo lo demás funciona igual.

**Sin el agente interno (módulo aparte, ADR-049 punto 7).** El ejecutor `agente` sigue disponible para agentes externos por MCP con una key del tenant. Si el tenant no tiene agente interno ni ninguna key de agente con scope `comercial`, el editor del plan lo avisa y los pasos `agente` usan desde el primer día el respaldo de R9 (tarea de persona con el borrador base). Sin el módulo no aparece «prepara mis seguimientos de hoy».

## 13. Mejoras respecto de 1.0 y lo que no se porta

| En 1.0 | En 2.0 | Por qué |
|---|---|---|
| Cadencia fija en el código (3, 7, 14, 15) | Planes por tenant con pasos editables, copiados de la plantilla de la vertical | Cada empresa vende distinto |
| Umbral de $3.000.000 cableado | Umbral y comportamiento al terminar configurables por plan | Sin código por cliente |
| Etapas buscadas por nombre | Etapas elegidas por id en el plan | Renombrar una etapa no rompe nada |
| Solo cotizaciones | También negocios (por etapa o a mano) y negocios detenidos en cualquier etapa | Ningún negocio olvidado |
| Respuesta detectada leyendo Gmail | Registro explícito de persona o agente, más respuestas a la dirección de entrada | OPAI no es cliente de correo (ADR-032) |
| Correo automático por bandera de entorno | Ejecutor por paso: persona, OPAI automático o agente (R29) | Decisión explícita y auditada |
| `CrmFollowUpLog` aparte del historial | Pasos en la Actividad unificada | Una línea de tiempo |
| Tareas al dueño de la cuenta | Asignación por paso (responsable, usuario o rol) | Equipos con preventa |
| Sin vista diaria del vendedor | Vista Pendientes y tarjeta en Inicio | El trabajo del día en un lugar |
| Agente de Slack | Agente interno o externo por MCP, con borrador y aprobación | Paridad y control |

**No se porta:** la tarjeta de Slack de 48 h; la lectura de Gmail para detectar respuestas; las etapas «Primer seguimiento» y «Segundo seguimiento» como etapas obligatorias (el tenant puede crearlas y apuntar los pasos a ellas); la variable de entorno del correo automático.

## 14. Casos borde

- Se envía la versión 2 de la cotización el día hábil 5: el seguimiento anterior se cancela (pasos 2–4) y empieza otro desde hoy; la Actividad muestra ambos.
- El cliente responde por teléfono y nadie lo registra: el paso 3 sale igual. Por eso el agente sugiere `registrar_respuesta` si ve una actividad del cliente (R15 tampoco cierra solo si hay actividad del cliente posterior al último paso).
- Un feriado nuevo cae sobre un paso agendado: se mueve al siguiente día hábil (R8).
- El contacto principal no tiene correo: el paso de correo queda fallido con «contacto sin correo» y la persona elige otro contacto del negocio.
- El responsable del negocio cambia: los pasos por hacer pasan al nuevo responsable; los hechos no.
- El negocio está en «Negociación» al llegar el paso final: no se cierra solo (R15) y queda la propuesta.
- El monto mensual es exactamente $3.000.000 con umbral de $3.000.000: no se cierra solo (estrictamente menor, piso de 1.0).
- El plan se desactiva con 30 seguimientos en curso: siguen hasta terminar, salvo que el owner los cancele en lote con vista previa.
- Un agente intenta enviar dos veces el mismo paso: la clave de idempotencia devuelve el primer resultado y no envía otra vez.
- La empresa tiene dos vendedores sobre el mismo negocio: Pendientes muestra el paso solo a quien lo tiene asignado; el gerente ve a todos con el filtro.
- El correo automático falla porque el dominio dejó de estar verificado: el paso queda fallido, se avisa y la integración queda en error en Configuración → Integraciones.
- Un negocio ganado no se reabre; si hay que corregirlo se crea un negocio de reemplazo (R20 de `comercial.md`), que empieza sin seguimiento.
- Un cliente responde al correo de seguimiento y su respuesta llega a la dirección de entrada: se asocia al negocio por el identificador y no crea una solicitud nueva; el vendedor la recibe igual en su buzón por el Reply-To.
- Ningún agente prepara el borrador de un paso `agente` antes de su vencimiento: pasa a tarea de persona (respaldo de R9).

## 15. Criterios de aceptación

- **CA1.** Gard parte con el plan «Post-cotización» copiado de la vertical (pasos de §2). El owner cambia el paso 3 de día hábil 14 a 12 y la hora a 10:00; los seguimientos nuevos usan la versión nueva y los en curso conservan la suya.
- **CA2.** Al enviar una cotización en CPQ, la hoja ofrece iniciar el seguimiento con las fechas exactas (sin fines de semana ni feriados) y avisa si cancela pasos anteriores.
- **CA3.** El día del paso 1, el vendedor ve en Pendientes «Seguimiento 1 · correo», abre la hoja con el borrador de la plantilla, lo edita y lo envía desde OPAI; queda en la Actividad del negocio con la versión de la plantilla y la tarea se cierra sola.
- **CA4.** Con el paso 2 de WhatsApp, en el celular el vendedor toca «Abrir WhatsApp», envía y registra; con un paso de llamada registra el resultado «no contestó» y pospone.
- **CA5.** Registrar «el cliente respondió» detiene la cadencia, mueve el negocio a la etapa configurada (sin bajarlo si ya está más adelante) y crea la tarea «Responder al cliente».
- **CA6.** Al terminar sin respuesta, un negocio de $2.500.000 mensuales con cierre automático activo queda perdido con motivo «sin respuesta» y aviso; uno de $3.000.000 queda con «Proponer perdido» y lo confirma el responsable.
- **CA7.** Un negocio en Negociación sin actividad por 15 días aparece como «Detenido · 15 días» en el tablero y en Pendientes, y el aviso sale una sola vez.
- **CA8.** Un agente con scope `comercial` prepara por MCP el borrador del paso 1; el envío queda en la cola de aprobaciones; al aprobarlo sale una vez, y la auditoría dice «agente vía <usuario>».
- **CA9.** Con el envío automático de OPAI apagado (por defecto), ningún correo sale sin una persona; con el paso en «OPAI automático», sale a la hora dentro de la ventana de envío y queda medido en consumos.
- **CA10.** Sin CPQ activo, un plan con disparador «entra a la etapa Propuesta» empieza al mover el negocio a esa etapa.
- **CA11.** Pendientes, la hoja de ejecutar paso y el bloque del negocio se ven bien a 375, 1024 y 1280 px, con estados de carga, vacío, error y sin permisos, y la navegación cumple ADR-045.

## 16. Preguntas abiertas para Carlos

Cada una con mi recomendación y el porqué. Ninguna bloquea el Design Prompt: el diseño se hace con la opción recomendada y se ajusta si decides otra.

1. **¿Dónde vive esta especificación?** (a) sección nueva de `comercial.md`; (b) documento propio enlazado desde R29. **Recomendación: (b)**, este documento. Cruza Comercial, CPQ, Comunicaciones y el agente, y `comercial.md` ya es largo; R29 apunta aquí y el brief citará ambos.
2. **¿Qué cadencia trae Gard de partida?** La extracción del 23-oct dice 3/7/3; el código vivo de 1.0 (`40d19a5`, playbook del 21-oct) usa días hábiles **3 (correo), 7 (llamada o WhatsApp), 14 (correo) y 15 (proponer perdido)**, a las 9:00. **Recomendación: la del código vivo**, porque es lo que Gard opera hoy y el piso es igualar 1.0. La extracción se corrige con una nota en este PR.
3. **¿Días hábiles con qué calendario?** Hoy 2.0 no tiene calendario de feriados. **Recomendación: un calendario hábil en el núcleo** (feriados nacionales de Chile precargados por país, más los propios del tenant), porque también lo necesitan Nómina y Asistencia y no debe vivir en Comercial. Hasta que exista, los planes de días hábiles cuentan solo lunes a viernes y lo avisan en Configuración.
4. **¿Se mantiene el cierre automático como perdido bajo $3.000.000?** **Recomendación: sí, como opción del plan, activa para Gard con $3.000.000** (estrictamente menor, igual a 1.0), con aviso al responsable y al owner y reapertura desde el aviso con motivo prellenado y confirmación (R20 de `comercial.md`). El umbral se carga como configuración propia de Gard, nunca en la plantilla de la vertical. Para los demás tenants, la plantilla de la vertical trae «proponer el cierre». Es el piso de 1.0, perder es reversible y deja de cargar al vendedor con negocios chicos muertos.
5. **¿Qué cuenta como «el cliente respondió»?** (a) solo lo que registra una persona o un agente; (b) además, las respuestas a correos enviados desde OPAI que llegan a la dirección de entrada del tenant; (c) además, conectar Gmail o Outlook. **Recomendación: (a) + (b)**, con el remitente y el Responder a de R12 (el vendedor sigue recibiendo la respuesta en su buzón). (b) reutiliza la entrada de correo de Solicitudes y cubre el caso más común; (c) convierte a OPAI en cliente de correo (ADR-032; pregunta 10 de `comercial.md` decidió no hacerlo) y queda al backlog.
6. **¿Qué pasa por defecto cuando el cliente responde?** **Recomendación: detener la cadencia, mover a «Negociación» si está antes y crear la tarea «Responder al cliente» al responsable con plazo de 4 horas hábiles.** Es 1.0 más la tarea, que hoy falta: en 1.0 el negocio se mueve, pero nadie queda a cargo de contestar.
7. **¿Quién ejecuta cada paso por defecto?** **Recomendación: persona en todos los pasos** (como 1.0), con el borrador listo en OPAI para enviarlo con un clic. «OPAI automático» queda apagado y el tenant lo activa por paso; el agente prepara borradores si el tenant tiene el módulo del agente interno.
8. **¿Puede un agente enviar al cliente sin aprobación?** **Recomendación: solo si el tenant lo activa en ese paso del plan y la key del agente tiene autonomía «directo»; ambas apagadas por defecto.** Contactar a un cliente no se deshace (ADR-032 punto 3), pero un tenant con confianza en su agente debe poder delegar el primer recordatorio.
9. **¿Cómo se tienen varias plantillas del mismo evento** (Seguimiento 1 y Seguimiento 3 son correos distintos)? ADR-020 tiene una plantilla por evento y canal. **Recomendación: «variantes» con nombre dentro de Comunicaciones** (el evento `comercial.seguimiento.correo_cliente` con variantes «Seguimiento 1», «Seguimiento 3», «Renovar oferta»…), que cada paso elige y que se pueden filtrar por etapa del embudo. Es un cambio chico al núcleo, sirve a otros módulos (cobranza, Finanzas) y evita inventar un evento por paso. Se anota como precisión de ADR-020.
10. **¿WhatsApp en la v1?** **Recomendación: enlace con el texto preparado** (la persona envía desde su teléfono y registra), igual que 1.0. La API de WhatsApp Business se suma después como integración del tenant con consumo medido, cuando haya una cuenta verificada.
11. **¿Dónde ve el vendedor sus pendientes?** (a) tercera vista de Negocios (Tablero · Lista · Pendientes) más una tarjeta en Inicio; (b) entrada nueva «Seguimientos» en el área Comercial. **Recomendación: (a)**: no cambia `NAVEGACION.md` (Solicitudes · Negocios · Cotizaciones), y el vendedor ya trabaja desde Negocios.
12. **¿Se porta la alerta de 48 h de Slack?** **Recomendación: no.** El primer paso del plan la cubre (y el tenant puede poner un paso interno a las 48 h si lo quiere); Slack queda como canal opcional de notificaciones del núcleo.
13. **¿Qué umbrales de negocio detenido trae Gard?** **Recomendación: Negociación 14 días corridos (como 1.0) y las demás etapas sin umbral** hasta que el gerente comercial las fije. Se editan como una columna más del editor del Embudo (Configuración → Comercial → Embudo), no en una pantalla aparte. Poner umbrales a todas desde el día uno genera ruido (ADR-020).
14. **¿Quién confirma un cierre propuesto?** **Recomendación: el responsable del negocio o cualquier persona con `comercial:negocios.manage`**; si lo propuso un agente, la cola de aprobaciones. No hace falta un aprobador especial porque perder se puede reabrir.
15. **¿Hace falta un permiso nuevo?** **Recomendación: no.** Operar seguimientos es parte de gestionar negocios (`comercial:negocios.manage`) y configurarlos, de `comercial:config.manage`. Si más adelante quieres un rol que solo siga sin editar negocios, se agrega `comercial:seguimientos.manage`.
16. **¿Qué pasa con los seguimientos en curso de 1.0 durante la convivencia?** **Recomendación: no se migran los pasos pendientes.** Los negocios que se siguen gestionando en 1.0 terminan su cadencia allí; la importación trae los pasos hechos como actividades históricas, y desde el corte cada negocio en 2.0 empieza con un seguimiento nuevo desde su último envío. Migrar pasos pendientes duplicaría correos.
17. **¿Cuándo se construye?** **Recomendación: como PR 4 del CRM, después del PR 2** (CAR-26: actividad unificada, contacto N–N y la entrada de correo), porque usa tareas, actividades y contactos con rol; funciona sin CPQ (disparadores por etapa o manual) y se engancha a «cotización enviada» cuando llegue CPQ. Antes de él, el núcleo necesita tres piezas: el calendario hábil (pregunta 3), las variantes de plantilla con etapas (pregunta 9, R24) y el catálogo declarativo con colección hija y versiones para el editor de planes (§3); si prefieres no extender el catálogo, la alternativa es una sección propia dentro de Configuración → Comercial, que pide una excepción a ADR-018.
18. **¿La validez de la oferta la define CPQ?** **Recomendación: sí**: es un dato de la cotización (`modulos/cpq.md`), y el seguimiento solo agrega el paso «Renovar o perder» cuando vence. Se agrega a las preguntas de CPQ si aún no está.

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
| 29-oct-2026 | Borrador inicial (CAR-67): reglas, piso verificado en 1.0 `40d19a5`, preguntas y Design Prompt | — |
| 29-oct-2026 | Autorrevisión: CPQ entrega datos por capacidad y evento (Comercial no lee CPQ); herramientas MCP para todas las acciones de pantalla; ejecutor agente con respaldo; remitente y Responder a; sin evento duplicado de tarea; contacto al cliente fuera del silencio; plantillas por etapa (R24); sección «Sin el agente interno» | — |
