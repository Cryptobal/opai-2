# Seguimiento comercial — Especificación funcional

**Estado:** borrador con las 18 preguntas decididas por Carlos (29-oct-2026, §16); pendiente su aprobación de la especificación completa · **Fase:** 2 (módulo Comercial) · **Fecha:** 29-oct-2026 · **Tarea:** CAR-67 · **Insumos:** `modulos/comercial.md` (R29, §8, §9), `extraccion/comercial-y-cpq.md` §3.6, código vivo de OPAI 1.0 (`Cryptobal/opai` @ `40d19a5`, solo lectura), ADR-020, ADR-021, ADR-029, ADR-032, ADR-040, ADR-047, ADR-048 y ADR-049 · **Autor:** Claude

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
| Cierre sin respuesta | Al terminar: si el monto mensual es menor a un umbral fijo en el código, cierra como **perdido** solo, con motivo «sin respuesta»; si no, crea la tarea **«Proponer perdido»** el día hábil 15. Nunca cierra un negocio en Negociación o posterior. **No se porta** (decisión 4) |
| Reenvío | Enviar una nueva propuesta cancela los pasos pendientes y reprograma desde el nuevo envío |
| Pausa | Pausar, reanudar y cancelar a mano |
| Estado visible | «Sin iniciar», «Activo», «Con atrasos», «Automatización pausada», «Con fallos», «Fallido», «Completado» |
| Negocios detenidos | Alerta de negocios en Negociación sin actividad por **14 días** (ajuste del tenant) |
| WhatsApp | Botón «Enviar + abrir WhatsApp» |

**Problemas de 1.0 que se corrigen:** cadencia fija en el código (solo cambian la hora y las plantillas); un cierre automático por monto cableado en el código, regla arbitraria que no se porta; etapas buscadas por nombre («Negociación», «Primer seguimiento»), que se rompen si el tenant las renombra; la respuesta del cliente depende de leer Gmail; seguimientos solo para cotizaciones, no para negocios; registro en tablas propias (`CrmFollowUpLog`) separado de la actividad; el correo «automático» mezcla bandera del tenant y variable de entorno.

**Principio (Carlos, 29-oct-2026):** 1.0 es el piso en **capacidades**, no en **reglas**. Lo que 1.0 sabe hacer (agendar, recordar, detectar respuestas, proponer cerrar) se iguala y se mejora; las reglas arbitrarias de 1.0 (umbrales fijos, etapas buscadas por nombre, días cableados) no se repiten.

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
| Al terminar sin respuesta | `proponer_cierre` (por defecto) · `aplicar_cierre_propuesto` · `solo_avisar` | Sí | `aplicar_cierre_propuesto` aplica solo el cierre propuesto, sin confirmación (R15); sin umbrales de monto | owner, admin |
| No cerrar desde la etapa | Etapa abierta | No | Desde esa etapa en adelante, el plan nunca aplica un cierre solo | owner, admin |
| Activo | Sí/no | Sí | Apagar no cancela los seguimientos en curso: los deja terminar o se cancelan en lote con vista previa | owner, admin |

«owner, admin» en esta tabla incluye cualquier rol con `comercial:config.manage` (por ejemplo, un rol personalizado de jefe comercial). Activar «OPAI automático» en un paso o `aplicar_cierre_propuesto` queda en la auditoría con quién, cuándo y qué versión del plan. La única excepción es el envío del agente sin aprobación, que solo activa el owner (R18).

**Paso del plan**

| Campo | Tipo | Oblig. | Validación |
|---|---|---|---|
| Orden | Entero | Sí | 1..20 pasos por plan |
| Cuándo | Días (entero ≥ 0) | Sí | Creciente si se cuenta desde el inicio |
| Hora | Hora | No | Si falta, la del plan; dentro de la ventana del plan y de su canal |
| Canal | `correo` · `whatsapp` · `llamada` · `interno` | Sí | `interno` no contacta al cliente |
| Quién lo ejecuta (R29) | `persona` (por defecto) · `opai_automatico` · `agente` | Sí | `opai_automatico` solo en `correo`, con plantilla aprobada y dominio de correo verificado; nunca en `llamada` ni `interno` |
| Con aprobación | Sí/no | Si es `agente` | Por defecto sí; «sin aprobación» solo lo activa el owner (R18) |
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
- **R1.** Todo es configuración del tenant, entera: pasos, días, canal, hora, quién ejecuta y qué pasa al responder y al terminar. Al activar Comercial, OPAI **copia** al tenant un plan base editable de su vertical y sus plantillas; desde ahí el tenant lo edita, lo duplica o crea otros. La plantilla de vertical no cambia sola en el tenant (ADR-021, P13). La cadencia de 1.0 (días hábiles 3, 7, 14 y 15, a las 9:00) es **solo la plantilla de partida de Gard**, cargada como configuración propia de Gard; ningún otro tenant la recibe por defecto (decisión 2).
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
  - **OPAI automático:** a la hora del paso, OPAI envía la plantilla al destinatario por el adaptador de correo del tenant, registra la interacción y mide el consumo. **Apagado por defecto** en todo plan; lo activa por paso el owner, los administradores del tenant o un rol con `comercial:config.manage` (decisión de Carlos del 29-oct-2026), después de ver la vista previa (`dryRun`) de la plantilla y de a quiénes saldría. Es una capacidad vendible del plan de OPAI (su precio va al ADR de planes y precios, ADR-049 punto 9). Cada envío queda auditado como «OPAI automático · plan vN · activado por <usuario>».
  - **Agente:** a la hora del paso, OPAI lo deja **«por preparar»** (los trabajos programados solo encolan, ADR-029; OPAI no tiene lógica de agente propia, ADR-049 punto 2). Un agente lo toma: el externo por MCP desde `comercial_seguimientos_list`, o el agente interno cuando el usuario se lo pide («prepara mis seguimientos de hoy»), con la confirmación de su nivel (ADR-049 punto 4). El agente **prepara un borrador** personalizado a partir de la plantilla y del negocio, que queda en la cola de aprobaciones; una persona lo aprueba (tal cual o editado) o lo descarta, y recién al aprobarlo sale. **Respaldo:** si nadie lo preparó al vencer el plazo del paso, pasa a tarea de persona con el borrador base de la plantilla. Que el agente envíe sin aprobación es una opción del paso, apagada por defecto (R18).
- **R10.** Antes de contactar al cliente, OPAI revisa que el negocio siga abierto, que el seguimiento siga activo y que el destinatario tenga el dato del canal. Si falta algo, el paso queda **fallido** con el motivo («contacto sin correo») y se avisa al asignado; no se reintenta solo. Una persona o un agente lo reintenta después de corregir (por ejemplo, cambiar el destinatario por otro contacto con rol en el negocio).
- **R11.** Una persona puede **posponer** un paso (nueva fecha, mueve o no los siguientes), **omitirlo** con motivo o **hacerlo antes** (ejecutarlo ahora; los siguientes se recalculan solo si se cuentan desde el paso anterior). Si el paso declara «mover a etapa», al hacerse el negocio se mueve con las reglas de entrada de la etapa (R9 de `comercial.md`); si no cumple los requisitos, no se mueve y se avisa.

**Cuando el cliente responde**
- **R12.** Solo cuentan como respuesta del cliente (decisión 5): **(a)** un registro explícito de tipo **«respuesta del cliente»** (un tipo de actividad del núcleo, con canal y resumen), hecho por una persona o un agente desde el negocio, el paso o la vista Pendientes; una nota, un comentario o una llamada registrada sin ese tipo **no** cuentan; y **(b)** la respuesta por correo a un envío hecho desde OPAI. OPAI no lee buzones (ADR-032). Para eso:
  - **Remitente (From):** el nombre del vendedor con la dirección verificada del dominio del tenant (por ejemplo, «Camila Rojas · Atlas Seguridad»). Sin dominio verificado, el correo sale por el remitente por defecto del adaptador y el vendedor queda en copia.
  - **Responder a (Reply-To):** la dirección de entrada del tenant con un identificador del seguimiento, más el correo del vendedor, para que la respuesta le llegue igual a su buzón.
  - **Al llegar:** OPAI busca primero ese identificador y asocia la respuesta al negocio **antes** de tratarla como solicitud nueva (no crea una solicitud duplicada, `comercial.md` R1). La registra en la Actividad como «respuesta del cliente» con el texto marcado como externo y aplica R13. Si no la puede asociar, sigue el camino de Solicitudes.
- **R13.** Por defecto (decisión 6), al responder el cliente **se detiene la cadencia** y el negocio **pasa a la etapa configurada** (Gard: «Negociación», elegida por id, no por nombre); nunca baja un negocio que ya está en esa etapa o más adelante. **No se crea una tarea fija**: el responsable elige el próximo paso entre **responder**, **cotizar** (nueva versión, si CPQ está activo) o **agendar** (llamada o reunión), y cada opción deja su actividad. Si no elige nada en **1 día hábil**, recibe un recordatorio (una vez) y el negocio aparece en Pendientes como «Respuesta sin próximo paso». El tenant puede configurar otro efecto en el plan: pausar hasta una fecha o reiniciar desde un paso en vez de detener, otra etapa destino y el plazo del recordatorio.

**Cierre**
- **R14.** Ganar sigue siendo una acción humana (o de agente con aprobación) con los requisitos de su etapa (R9 y R18 de `comercial.md`). Ganar o perder el negocio **termina** su seguimiento y cancela los pasos pendientes.
- **R15.** Al terminar los pasos sin respuesta, el plan hace lo configurado:
  - **proponer el cierre** (por defecto): un cierre propuesto («Proponer perdido», motivo `sin_respuesta` sugerido) que **confirma una persona** (R16); cerrar es la acción «Perder» de siempre, con motivo;
  - **aplicar el cierre propuesto** (si el tenant lo configura, decisión 14; lo activa el owner, los administradores del tenant o un rol con `comercial:config.manage` y la activación queda en la auditoría con quién y cuándo): OPAI pierde el negocio con el motivo propuesto, lo deja en la Actividad como hecho por «OPAI automático · plan vN», avisa al responsable y se puede reabrir desde el aviso con el motivo prellenado («cerrado por la cadencia sin respuesta») y confirmación (R20 de `comercial.md`). Aplica a todo negocio del plan por igual: **no hay umbrales de monto** (decisión 4);
  - **solo avisar.**
  Ningún plan aplica un cierre solo en un negocio que está en la etapa «no cerrar desde» o más adelante, ni en uno con una «respuesta del cliente» posterior al último paso.
- **R16.** Por defecto, lo propuesto lo confirma **una persona**: el responsable del negocio o cualquiera con `comercial:negocios.manage`. Si lo propone un agente, va a la cola de aprobaciones, aunque el plan aplique los cierres propuestos de OPAI.
- **R17.** **Vencidos**, que avisan pero no son un estado del negocio (R8 de `comercial.md`: abierto, ganado o perdido):
  - **cierre estimado vencido:** la fecha de cierre estimada pasó con el negocio abierto; se avisa al responsable para actualizarla o cerrar;
  - **cotización vencida:** con CPQ, cuando vence la validez de la oferta de la vigente, CPQ lo publica (evento, por ejemplo `cpq.cotizacion.vencida`) y el consumidor de Comercial agrega un paso interno «Renovar o perder». Comercial no consulta la validez: la define y la avisa CPQ.

**Envío por agentes y autonomía**
- **R18.** Contactar a un cliente es **irreversible**: para un agente pide aprobación humana (`APPROVAL_REQUIRED`). El **owner** puede configurar, por paso, que el agente envíe sin aprobación (decisiones 7 y 8; capacidad vendible del plan de OPAI), y solo si además la key del agente tiene autonomía «directo» sobre esa capacidad (autorización explícita del owner por capacidad, ADR-032 punto 3); ambas cosas apagadas por defecto, y la autorización queda en la auditoría con quién y cuándo la dio. Todo envío lleva clave de idempotencia: un paso nunca sale dos veces.
- **R19.** El agente actúa con la identidad, los permisos y el alcance del usuario (ADR-049 punto 3). Lo que el agente lee del cliente (respuestas, texto de terceros) vuelve marcado como externo y nunca habilita por sí solo un envío ni un cierre.

**Negocios detenidos y pendientes del vendedor**
- **R20.** Cada etapa abierta puede declarar **días máximos sin actividad** (hábiles o corridos). Un negocio que los supera queda **detenido**: aparece en Pendientes, lleva el indicador en el tablero y avisa al responsable una vez (no todos los días). Deja de estar detenido con cualquier actividad nueva o cambio de etapa. El umbral es configurable por etapa (decisión 13). Gard parte solo con Negociación a 14 días; las demás etapas, sin umbral hasta que el tenant lo fije.
- **R21.** **Pendientes** muestra, para el usuario conectado (o el responsable que elija quien puede ver a todos): pasos vencidos, de hoy y de los próximos 7 días; borradores del agente esperando su aprobación; cierres propuestos; respuestas del cliente sin próximo paso (R13); negocios detenidos y con cierre estimado vencido. Cada fila se resuelve ahí mismo sin abrir la ficha.
- **R22.** Todo **aviso interno** respeta el silencio por defecto (ADR-020): Pendientes y el tablero muestran todo siempre, pero correos y push internos solo salen si el tenant activó el evento. El **contacto al cliente** de un paso no es un aviso: sale solo por la acción explícita de una persona, de un agente aprobado o de un paso «OPAI automático» o de agente sin aprobación que el tenant activó; usa la plantilla y la variante de Comunicaciones, pero no su ruteo ni su silencio.

**Auditoría e historial**
- **R23.** Todo lo que hace el seguimiento queda en la Actividad del negocio y en la auditoría: quién (persona, OPAI automático o «agente vía usuario»), qué paso, qué versión de plantilla y qué resultado. Nada se borra; corregir es registrar un hecho nuevo.

**Plantillas y etapas del embudo**
- **R24.** Las plantillas viven en Comunicaciones del núcleo, nunca en tablas de Comercial. Cada variante de un evento de seguimiento puede declarar las **etapas del embudo** en que aplica (por id). Al ejecutar un paso, la hoja ofrece primero la variante del paso; si el negocio está en una etapa que esa variante no cubre y existe otra variante del mismo evento para esa etapa, la propone (por ejemplo, «Seguimiento en Negociación» en vez de «Seguimiento 3»). Una variante sin etapas aplica a todas.

**Aislamiento y paridad**
- **R25.** Planes, versiones, pasos, seguimientos y pasos agendados son datos del tenant: toda tabla lleva `tenant_id` con RLS y la política `tenant_isolation` (ADR-002), y toda referencia (plantilla y variante, contacto, etapa, negocio, usuario asignado, cotización) se valida del mismo tenant al guardarla. El tenant sale de la sesión o de la key, nunca del cuerpo.
- **R26.** Cada acción es una capacidad: pantalla, `/api/v1` y MCP llaman a la misma, con los mismos permisos y auditoría. Toda escritura acepta `dryRun` (en MCP, `preview_…`) e `idempotencyKey`.

## 7. Estados y transiciones

**Seguimiento**

| Desde | Hacia | Quién | Condición | Efecto | ¿Reversible? |
|---|---|---|---|---|---|
| (iniciar) | activo | Comercial, agente, CPQ al enviar, entrada a etapa | Negocio abierto, plan activo, sin otro activo (R6) | Agenda los pasos | — |
| activo | pausado | Comercial o agente; respuesta del cliente (R13 b) | Motivo | Congela los pasos pendientes | Sí, reanudar (reprograma desde hoy) |
| activo / pausado | terminado | Sistema | Pasos hechos u omitidos, respuesta del cliente con «detener», o negocio ganado o perdido | Cancela los pendientes; con respuesta, pide el próximo paso (R13) | No (se inicia otro) |
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
| Registrar una «respuesta del cliente» y elegir el próximo paso | ✓ | ✓ | ✓ | — | — | — | — | ✓ con vista previa |
| Proponer el cierre | ✓ | ✓ | ✓ | — | — | — | — | ✓ |
| Confirmar el cierre (perder) | ✓ | ✓ | ✓ | — | — | — | — | Como «Perder» de `comercial.md` (o lo aplica OPAI si el plan lo configura, R15) |
| Configurar planes, envío «OPAI automático», cierre aplicado automáticamente y negocios detenidos (también un rol con `comercial:config.manage`; envío del agente sin aprobación: solo owner); pasar seguimientos a una versión nueva; cancelar en lote | ✓ | ✓ | — | — | — | — | — | ✓ con vista previa, solo si el usuario de la key tiene `comercial:config.manage` |

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
| `comercial.seguimiento.respuesta_sin_proximo_paso` | Pasa 1 día hábil sin elegir el próximo paso (R13) | El responsable, una vez | In-app, push | Sí |
| `comercial.seguimiento.cierre_propuesto` | Terminan los pasos sin respuesta | El responsable (recomendado) | In-app | Sí |
| `comercial.seguimiento.cierre_aplicado` | OPAI aplica un cierre propuesto porque el plan lo configura (R15) | El responsable y el owner (recomendado) | In-app, correo | Sí |
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
| `comercial_seguimientos_registrar_respuesta` | Registrar una «respuesta del cliente», con canal y resumen | Escritura | ✓ (efecto del plan: detener, etapa) | — |
| `comercial_seguimientos_elegir_proximo_paso` | Elegir el próximo paso tras la respuesta: responder, cotizar o agendar | Escritura | ✓ | — |
| `comercial_seguimientos_proponer_cierre` | Proponer perder con motivo sugerido | Escritura | ✓ | Queda en la cola para que una persona confirme |
| `comercial_negocios_detenidos` | Negocios detenidos y con cierre vencido | Lectura | — | — |
| `comercial_negocios_perder` / `ganar` (existentes) | Confirmar el cierre | Escritura / Ganar con aprobación | ✓ | Como en `comercial.md` |
| `comercial_config_*` (las existentes, ampliadas con el catálogo «planes de seguimiento» y la columna de días sin actividad de las etapas) | Leer y editar planes y umbrales | Escritura | ✓ | — (solo con `comercial:config.manage`) |

**Flujo típico del agente (para `docs/2.0/agentes/seguir-cotizaciones.md`, con su escenario de prueba, ADR-034):**
1. Cada mañana, `comercial_seguimientos_list` con «hoy y vencidos» del usuario.
2. Por cada paso de correo: leer el negocio y la última actividad, `preview_comercial_seguimientos_preparar_paso` y luego prepararlo.
3. Por cada paso de llamada: agregar a la tarea que ya existe (R9) un resumen del negocio para la persona, sin crear otra.
4. Si en la Actividad ve algo que parece una respuesta del cliente pero no está registrado como «respuesta del cliente», lo propone con `preview_comercial_seguimientos_registrar_respuesta`; nunca infiere la respuesta de una nota por su cuenta.
5. Para los seguimientos que terminaron sin respuesta, `proponer_cierre`.
6. Se detiene antes de enviar, ganar o perder: eso queda en la cola de aprobaciones.

## 11. Integraciones

- **Correo saliente:** por el adaptador de correo del tenant (Resend por defecto, dominio propio verificado para el envío automático), con la marca del tenant (ADR-028). Medido en consumos.
- **Correo de entrada:** la dirección de entrada del tenant (la de Solicitudes, `comercial.md` §10) recibe las respuestas a los correos enviados desde OPAI; OPAI las asocia al negocio por el identificador del seguimiento antes de tratarlas como solicitud (R12, pregunta 5).
- **CPQ:** no se lee. CPQ inicia el seguimiento por capacidad al enviar (R4) y publica el vencimiento de la oferta por evento (R17).
- **WhatsApp:** en la v1, enlace con el texto preparado que la persona envía desde su teléfono y luego registra (piso de 1.0, «Enviar + abrir WhatsApp»). En el plan queda la integración formal por Twilio o la API de WhatsApp Business, como integración del tenant con consumo medido (decisión 10; ver `ROADMAP.md`).
- **IA:** el agente prepara borradores por el adaptador de IA del núcleo, por clase de tarea (`estandar`), con la key del tenant si la tiene (ADR-031, ADR-049). Si el tenant tiene key propia y falla, el respaldo prueba solo otras keys del mismo tenant; si todas fallan, el paso queda sin borrador (pasa al respaldo de persona de R9) y se avisa al tenant; nunca se usa la key de OPAI (ADR-049 punto 6).
- **Calendario hábil:** del núcleo (pregunta 3).
- **OPAI 1.0:** durante la convivencia, los seguimientos de negocios que siguen en 1.0 siguen allí; ver pregunta 16.

## 12. Sin las fuentes CPQ y agente interno (ADR-048)

**Sin CPQ.** Comercial no depende de CPQ. Sin CPQ activo: no aparece la opción de iniciar al enviar ni el paso «cotización vencida»; los planes usan los disparadores `entra_a_etapa` o `manual`; el correo de seguimiento no adjunta enlace a la cotización (la plantilla no ofrece esa variable). Todo lo demás funciona igual.

**Sin el agente interno (módulo aparte, ADR-049 punto 7).** El ejecutor `agente` sigue disponible para agentes externos por MCP con una key del tenant. Si el tenant no tiene agente interno ni ninguna key de agente con scope `comercial`, el editor del plan lo avisa y los pasos `agente` usan desde el primer día el respaldo de R9 (tarea de persona con el borrador base). Sin el módulo no aparece «prepara mis seguimientos de hoy».

## 13. Mejoras respecto de 1.0 y lo que no se porta

| En 1.0 | En 2.0 | Por qué |
|---|---|---|
| Cadencia fija en el código (3, 7, 14, 15) | Planes por tenant con pasos editables, copiados de la plantilla de la vertical | Cada empresa vende distinto |
| Cierre automático por monto cableado | Sin umbrales de monto: el plan propone el cierre (por defecto) o, si el tenant lo configura, lo aplica | 1.0 es el piso en capacidades, no en reglas (decisión 4) |
| Etapas buscadas por nombre | Etapas elegidas por id en el plan | Renombrar una etapa no rompe nada |
| Solo cotizaciones | También negocios (por etapa o a mano) y negocios detenidos en cualquier etapa | Ningún negocio olvidado |
| Respuesta detectada leyendo Gmail | Registro explícito de persona o agente, más respuestas a la dirección de entrada | OPAI no es cliente de correo (ADR-032) |
| Correo automático por bandera de entorno | Ejecutor por paso: persona, OPAI automático o agente (R29) | Decisión explícita y auditada |
| `CrmFollowUpLog` aparte del historial | Pasos en la Actividad unificada | Una línea de tiempo |
| Tareas al dueño de la cuenta | Asignación por paso (responsable, usuario o rol) | Equipos con preventa |
| Sin vista diaria del vendedor | Vista Pendientes y tarjeta en Inicio | El trabajo del día en un lugar |
| Sin agente en el seguimiento | Agente interno o externo por MCP, con borrador y aprobación | Paridad y control |

**No se porta:** el cierre automático bajo un monto (ni como opción ni para Gard, decisión 4); la alerta de 48 h; la lectura de Gmail para detectar respuestas; las etapas «Primer seguimiento» y «Segundo seguimiento» como etapas obligatorias (el tenant puede crearlas y apuntar los pasos a ellas); la variable de entorno del correo automático.

## 14. Casos borde

- Se envía la versión 2 de la cotización el día hábil 5: el seguimiento anterior se cancela (pasos 2–4) y empieza otro desde hoy; la Actividad muestra ambos.
- El cliente responde por teléfono y el vendedor lo anota como nota común: no cuenta como respuesta (R12) y el paso 3 sale igual. El agente puede proponer convertirlo en una «respuesta del cliente», con vista previa.
- Un feriado nuevo cae sobre un paso agendado: se mueve al siguiente día hábil (R8).
- El contacto principal no tiene correo: el paso de correo queda fallido con «contacto sin correo» y la persona elige otro contacto del negocio.
- El responsable del negocio cambia: los pasos por hacer pasan al nuevo responsable; los hechos no.
- El negocio está en «Negociación» al llegar el paso final: no se cierra solo (R15) y queda la propuesta.
- El cliente responde y el vendedor no elige el próximo paso: al día hábil siguiente recibe un recordatorio, una sola vez, y el negocio queda en Pendientes como «Respuesta sin próximo paso».
- El plan se desactiva con 30 seguimientos en curso: siguen hasta terminar, salvo que el owner los cancele en lote con vista previa.
- Un agente intenta enviar dos veces el mismo paso: la clave de idempotencia devuelve el primer resultado y no envía otra vez.
- La empresa tiene dos vendedores sobre el mismo negocio: Pendientes muestra el paso solo a quien lo tiene asignado; el gerente ve a todos con el filtro.
- El correo automático falla porque el dominio dejó de estar verificado: el paso queda fallido, se avisa y la integración queda en error en Configuración → Integraciones.
- Un negocio ganado no se reabre; si hay que corregirlo se crea un negocio de reemplazo (R20 de `comercial.md`), que empieza sin seguimiento.
- Un cliente responde al correo de seguimiento y su respuesta llega a la dirección de entrada: se asocia al negocio por el identificador y no crea una solicitud nueva; el vendedor la recibe igual en su buzón por el Reply-To.
- Ningún agente prepara el borrador de un paso `agente` antes de su vencimiento: pasa a tarea de persona (respaldo de R9).

## 15. Criterios de aceptación

- **CA1.** Gard parte con su plantilla «Post-cotización» (días hábiles 3, 7, 14 y 15, a las 9:00) cargada como configuración propia. El owner cambia el paso 3 de día hábil 14 a 12 y la hora a 10:00; los seguimientos nuevos usan la versión nueva y los en curso conservan la suya.
- **CA2.** Al enviar una cotización en CPQ, la hoja ofrece iniciar el seguimiento con las fechas exactas (sin fines de semana ni feriados) y avisa si cancela pasos anteriores.
- **CA3.** El día del paso 1, el vendedor ve en Pendientes «Seguimiento 1 · correo», abre la hoja con el borrador de la plantilla, lo edita y lo envía desde OPAI; queda en la Actividad del negocio con la versión de la plantilla y la tarea se cierra sola.
- **CA4.** Con el paso 2 de WhatsApp, en el celular el vendedor toca «Abrir WhatsApp», envía y registra; con un paso de llamada registra el resultado «no contestó» y pospone.
- **CA5.** Registrar una «respuesta del cliente» detiene la cadencia y mueve el negocio a Negociación (sin bajarlo si ya está más adelante); el vendedor elige responder, cotizar o agendar, y si no elige nada en 1 día hábil recibe un recordatorio. Una nota común no cuenta como respuesta.
- **CA6.** Al terminar sin respuesta, por defecto queda un «Proponer perdido» que confirma una persona, sea cual sea el monto. Con el plan configurado para aplicar el cierre propuesto, OPAI lo pierde con motivo «sin respuesta», avisa, y se reabre desde el aviso con motivo y confirmación.
- **CA7.** Un negocio en Negociación sin actividad por 15 días aparece como «Detenido · 15 días» en el tablero y en Pendientes, y el aviso sale una sola vez.
- **CA8.** Un agente con scope `comercial` prepara por MCP el borrador del paso 1; el envío queda en la cola de aprobaciones; al aprobarlo sale una vez, y la auditoría dice «agente vía <usuario>».
- **CA9.** Con el envío automático de OPAI apagado (por defecto), ningún correo sale sin una persona; con el paso en «OPAI automático», sale a la hora dentro de la ventana de envío y queda medido en consumos.
- **CA10.** Sin CPQ activo, un plan con disparador «entra a la etapa Propuesta» empieza al mover el negocio a esa etapa.
- **CA11.** Pendientes, la hoja de ejecutar paso y el bloque del negocio se ven bien a 375, 1024 y 1280 px, con estados de carga, vacío, error y sin permisos, y la navegación cumple ADR-045.

## 16. Preguntas para Carlos — decididas el 29-oct-2026

Carlos decidió las 18 el 29-oct-2026. Se conserva cada pregunta con la decisión; donde cambia lo recomendado, se dice qué reglas se ajustaron.

1. **¿Dónde vive esta especificación?** **Decidido: como venía**, documento propio enlazado desde R29 de `comercial.md`.
2. **¿Qué cadencia trae Gard?** **Decidido:** la cadencia 3/7/14/15 días hábiles (código vivo de 1.0, `40d19a5`) es **solo la plantilla de partida de Gard**. Cada tenant configura su plan entero: pasos, días, canal y hora. *Ajusta R1 y CA1.*
3. **¿Días hábiles con qué calendario?** **Decidido: como venía**, calendario hábil en el núcleo (feriados nacionales precargados por país más los propios del tenant), que también usan Nómina y Asistencia. Hasta que exista, los planes de días hábiles cuentan lunes a viernes y lo avisan en Configuración.
4. **¿Se mantiene el cierre automático como perdido bajo $3.000.000?** **Decidido: se elimina.** No se porta, ni como opción ni para Gard. Principio: **1.0 es el piso en capacidades, no en reglas**; las reglas arbitrarias de 1.0 no se repiten. *Ajusta §2, §5, R15, §9, §13, §14 y CA6.*
5. **¿Qué cuenta como respuesta del cliente?** **Decidido:** solo un **registro explícito de tipo «respuesta del cliente»** (no un comentario ni una nota), hecho por una persona o un agente, más las **respuestas por correo a envíos de OPAI**. *Ajusta R12, la herramienta `registrar_respuesta`, el flujo del agente y §14.*
6. **¿Qué pasa cuando el cliente responde?** **Decidido:** se detiene la cadencia y el negocio pasa a Negociación. **No se crea la tarea fija «Responder al cliente»**: el vendedor elige el próximo paso (responder, cotizar o agendar), con un recordatorio si no elige nada en 1 día hábil. *Ajusta R13, R21, §9 (evento `respuesta_sin_proximo_paso`), §10 (`elegir_proximo_paso`), §14 y CA5.*
7. y 8. **¿Quién ejecuta cada paso y puede el agente enviar sin aprobación?** **Decidido:** por defecto, una persona con el borrador listo. El modo «OPAI automático» y el envío del agente sin aprobación vienen **apagados**, pero el tenant puede configurarlos **por paso** (con o sin aprobación); el «sin aprobación» del agente lo activa solo el owner. **Quién activa «OPAI automático» (decisión de Carlos del 29-oct-2026):** el owner, los administradores del tenant o un rol con `comercial:config.manage`, por paso, y queda auditado. Es una **capacidad vendible del plan** de OPAI (precio en el ADR de planes y precios). *Ajusta §5, R9, R18 y R22.*
9. **¿Cómo se tienen varias plantillas del mismo evento?** **Decidido: como venía**, variantes de plantilla en Comunicaciones, ligadas a etapas (R24); se anota como precisión de ADR-020.
10. **¿WhatsApp en la v1?** **Decidido:** v1 con un **enlace de WhatsApp con el texto listo**. En el plan queda integrar **Twilio o la API de WhatsApp Business** para que sea formal. *Ajusta §11 y `ROADMAP.md`.*
11. **¿Dónde ve el vendedor sus pendientes?** **Decidido: como venía**, vista Pendientes en Negocios (Tablero · Lista · Pendientes) y tarjeta en Inicio.
12. **¿Se porta la alerta de 48 h de 1.0?** **Decidido: no.** Ni la alerta de 48 h ni ninguna integración de mensajería de equipo: se quitan de esta especificación y del Design Prompt. *Ajusta §2, §11 y §13.*
13. **¿Qué umbrales de negocio detenido trae Gard?** **Decidido:** el umbral es **configurable por etapa**; Gard parte **solo con Negociación a 14 días**. Se edita como una columna del editor del Embudo. *Ajusta R20.*
14. **¿Quién confirma un cierre propuesto?** **Decidido:** por defecto **confirma una persona**. El tenant puede configurar que el cierre propuesto **se aplique automático**; lo activa el owner, los administradores del tenant o un rol con `comercial:config.manage` (decisión de Carlos del 29-oct-2026), y queda auditado. *Ajusta §5 (opción `aplicar_cierre_propuesto`), §8, R15, R16 y CA6.*
15. **¿Hace falta un permiso nuevo?** **Decidido: como venía**, no; se usan `comercial:negocios.manage` y `comercial:config.manage`.
16. **¿Qué pasa con los seguimientos en curso de 1.0?** **Decidido: como venía**, no se migran los pasos pendientes; los hechos llegan como actividades históricas y cada negocio en 2.0 empieza con un seguimiento nuevo desde su último envío.
17. **¿Cuándo se construye?** **Decidido: como venía**, como PR 4 del CRM, después del PR 2 (CAR-26), con tres piezas previas del núcleo: calendario hábil, variantes de plantilla con etapas y el catálogo declarativo con colección hija y versiones.
18. **¿La validez de la oferta la define CPQ?** **Decidido: como venía**, sí; el seguimiento solo agrega «Renovar o perder» cuando CPQ avisa el vencimiento.

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
| 29-oct-2026 | Borrador inicial (CAR-67): reglas, piso verificado en 1.0 `40d19a5`, preguntas y Design Prompt | — |
| 29-oct-2026 | Decisión de Carlos: «OPAI automático» y `aplicar_cierre_propuesto` los activa el owner, un administrador o un rol con `comercial:config.manage`, con auditoría (preguntas 7, 8 y 14; R9, R15, §5 y §8) | Carlos (decisión) |
| 29-oct-2026 | Decisiones de Carlos sobre las 18 preguntas (§16): sin cierre automático por monto, sin la alerta de 48 h, «respuesta del cliente» explícita, próximo paso elegido por el vendedor, cadencia 3/7/14/15 solo de Gard, envío automático y del agente configurables por paso, cierre propuesto aplicable si el tenant lo configura, WhatsApp formal (Twilio o API de WhatsApp Business) en el plan | Carlos (decisiones) |
| 29-oct-2026 | Revisor OPAI 2.0 (no bloqueante): autorización del owner y auditoría en R18 y R9; R25 aislamiento por tenant; R26 paridad con `/api/v1` y `dryRun`; respaldo de IA solo entre keys del tenant | — |
| 29-oct-2026 | Autorrevisión: CPQ entrega datos por capacidad y evento (Comercial no lee CPQ); herramientas MCP para todas las acciones de pantalla; ejecutor agente con respaldo; remitente y Responder a; sin evento duplicado de tarea; contacto al cliente fuera del silencio; plantillas por etapa (R24); sección «Sin el agente interno» | — |
