# Central de monitoreo — Especificación funcional

**Estado:** **borrador con las 15 preguntas de §14 decididas** por Carlos el 29-oct-2026 (todas según la recomendación, con los ajustes de la sección «Decisiones de Carlos 29-oct-2026» de §14); la especificación completa y el diseño siguen pendientes de su aprobación (ADR-047) · **Fase:** 3 (decidido: módulo propio «Central», Brief 15b, después de Portales; §15 y pregunta 1) · **Insumos:** pedido de Carlos del 29-oct-2026 08:07 CLT (CAR-70), `extraccion/rondas-y-tickets.md`, `extraccion/operaciones.md` (esqueleto), `modulos/operaciones.md`, ADR-020, ADR-022, ADR-024, ADR-025, ADR-032, ADR-034, ADR-038, ADR-044, ADR-048, ADR-049, ADR-051, ADR-055 · **Autor:** Claude · **Tarea:** CAR-70

> Lenguaje de negocio, sin código (ADR-047). Es diseño y reglas: no autoriza código, migraciones ni pantallas hasta que Carlos apruebe esta especificación y el diseño de Claude Design (DS 2.0). El diseño y el brief citan las reglas por número (R1, R2…) y los criterios (CA1, CA2…). Lo que no está cerrado va en §14 con recomendación. El Design Prompt está en [`design/DESIGN-PROMPT-central.md`](../design/DESIGN-PROMPT-central.md).

## 1. Objetivo

Que una empresa de seguridad (y, con su vocabulario, de aseo o mantenimiento) **sepa en todo momento qué está pasando en cada instalación y turno, y actúe antes de que el cliente lo note**, sin que una persona tenga que mirar pantallas toda la noche. Un **agente de IA opera la central** (vigila, detecta, contacta, escala y registra) y **un humano está siempre a cargo** (ve la cola, aprueba lo irreversible, toma el control cuando quiere y responde por lo que pasa).

Reemplaza el chat libre de terreno por **dos canales estructurados** (ADR-025 sigue vigente: no hay chat interno): «Mensaje a la central» desde la app del guardia y «Avisos de la central» con acuse de recibo.

**Cómo se nota que funciona (métricas):**
- Tiempo desde que ocurre una anomalía hasta el **primer contacto** con alguien que puede resolverla (meta inicial: < 5 min en severidad alta o crítica).
- Porcentaje de alertas **resueltas sin intervención humana** frente a las que el humano tuvo que tomar, y porcentaje de **propuestas del agente aceptadas** por el operador.
- Puestos que empezaron el turno sin cubrir y **se cubrieron dentro de la primera hora**.
- Avisos con **acuse dentro del plazo**.

## 2. Entidades y relaciones

| Entidad | Qué es | Se relaciona con | Dónde vive |
|---|---|---|---|
| **Señal** | Un hecho que llega de otro módulo o del terreno: ronda atrasada, punto saltado, no marcó, puesto sin cubrir, mensaje urgente, botón de pánico, dispositivo sin conexión | Instalación, turno, persona, módulo de origen | Cada módulo la publica como evento (ADR-029); Central la consume |
| **Regla de vigilancia** | Qué señal, con qué umbral, abre qué alerta y con qué severidad | Plantilla de la vertical, tenant, instalación | Central (ajustes por ámbito, ADR-038) |
| **Alerta** | El **caso** que la central atiende: una o varias señales agrupadas de la misma instalación y turno | Instalación, turno, puesto, persona, regla, cadena, intentos de contacto, bitácora | Central |
| **Cadena de escalamiento** | Lista ordenada de a quién contactar, por qué canal y cuánto esperar antes de pasar al siguiente | Tenant, instalación (puede tener la suya), severidad | Central |
| **Intento de contacto** | Cada aviso, mensaje o llamada a una persona dentro de una alerta, con su resultado (contestó, no contestó, confirmó, rechazó) | Alerta, persona o contacto, canal | Central |
| **Propuesta del agente** | Una acción que el agente sugiere y el operador acepta o rechaza con un toque | Alerta, capacidad propuesta, operador | Central |
| **Turno de central** | El periodo en que un operador humano está **a cargo**, con su entrega de turno | Operador, agente, alertas abiertas | Central |
| **Mensaje a la central** | Hilo que abre un guardia desde terreno: tipo (novedad, consulta, urgencia), texto y fotos, ligado a su instalación y turno | Persona, instalación, turno, alerta (si la urgencia abre una) | Central |
| **Aviso de la central** | Consigna, cambio de turno o instrucción enviada a guardias, con o sin acuse obligatorio y vigencia | Destinatarios (persona, puesto, instalación, turno), acuses | Central |
| **Acuse de recibo** | Hecho inmutable: la persona confirmó «leído y entendido» a una hora de servidor | Aviso, persona, dispositivo | Central |
| **Entrada de bitácora** | Registro inmutable de todo lo anterior (alerta, contacto, llamada, respuesta, decisión, acuse), por instalación y turno | Instalación, turno, alerta, actor (persona, agente vía responsable) | Bitácora encadenada del núcleo (como `core.bitacora`, ADR-023/052) |

Relaciones: instalación 1–N alertas; alerta 1–N señales, 1–N intentos, 1–N propuestas; alerta N–1 cadena; aviso 1–N acuses; turno de central 1–N alertas atendidas. Todo con `tenant_id` y aislamiento por tenant (ADR-002).

**Vocabulario:** «alerta» es el caso de la central; «novedad» es el registro del **libro de novedades**, que pasa de 1.0 a 2.0 en la **app Terreno** y recibe las novedades que deja una ronda (ajuste de Carlos, 29-oct-2026; Rondas, ADR-024); «incidente» es una novedad grave con seguimiento. Una urgencia o un incidente abre una alerta; una alerta puede **derivar** a un ticket con responsable (ADR-025), nunca lo crea sola. La Central no duplica el libro: lo **muestra** en la pestaña «Central» de la ficha de la instalación (§3).

## 3. Pantallas y pestañas

| Pantalla | Ruta (propuesta) | Portal | Patrón | Entrada |
|---|---|---|---|---|
| **Central · cola en vivo** | `/central` | ERP | Tablero + lista (`SplitScreen` en iPad y escritorio) | Área **Operaciones**, entrada «Central» (queda en 7 entradas, el máximo de `NAVEGACION.md`) |
| Detalle de alerta | `/central/alertas/[id]` | ERP, Supervisor | Ficha | Desde la cola, la campana o el aviso |
| Mensajes a la central | `/central/mensajes` y `/central/mensajes/[id]` | ERP | Lista + hilo | Pestaña de Central |
| Avisos de la central | `/central/avisos`, crear en hoja | ERP | Lista + `Sheet` | Pestaña de Central |
| Turno de central y entrega | `/central/turno` | ERP | Ficha corta | Cabecera de la cola (quién está a cargo) |
| Bitácora de la instalación (con el libro de novedades de Rondas, ajuste de Carlos 29-oct-2026) | pestaña «Central» de la ficha de Instalación | ERP, Supervisor, (Cliente, si el tenant lo habilita) | Línea de tiempo filtrable por turno | Ficha de Instalación, pestaña de módulo (ADR-041) |
| Configuración → Central | centro de Configuración, ámbitos tenant e instalación (ADR-018/038; el de instalación se agrega al núcleo, pregunta 15, decidida) | ERP | Formulario por ámbitos | Configuración (sin página propia del módulo) |
| Supervisor · Hoy con alertas | `/supervisor` (Hoy) | Supervisor | Lista | Alertas abiertas de sus instalaciones y escalamientos dirigidos a él |
| **Terreno/Trabajador · Mensaje a la central** | `…/central/nuevo` | Trabajador, Terreno | Formulario de tarea única | Botón fijo en Inicio («Central») |
| Trabajador · Mis hilos y Avisos | `…/central` | Trabajador | Lista + hilo; aviso con «Acusar recibo» | Inicio (avisos sin acuse arriba) |
| Terreno · Avisos del puesto | dentro de «Instrucciones del puesto» | Terreno (dispositivo compartido, tarea única, `NAVEGACION.md` §4) | Tarea única | Sin «Mis hilos»: el hilo se ve mientras está abierto; el acuse identifica a la persona en turno con el mecanismo que defina el Brief 16 |

**Pestañas de Central (ERP):** Cola · Mensajes · Avisos · Bitácora (vista transversal). Con un filtro de instalación, la Bitácora es la misma de la ficha.

**La alerta no es una ficha maestra con pestañas** (ADR-041 rige para cuentas, instalaciones, personas, negocios): es un caso de corta vida que se ve en una sola pantalla con secciones. Sus fotos (vía `core.documentos`) aparecen en «Qué pasó» y su bitácora cumple el papel de Actividad.

**Qué se hace en cada dispositivo:**
- **Teléfono (operador o supervisor):** ver la cola, abrir la alerta, tomar el control, aceptar o rechazar propuestas, aprobar, contactar, resolver, responder hilos y acusar escalamientos («voy en camino»). La configuración de reglas y cadenas, no.
- **iPad:** todo lo del teléfono más crear avisos con destinatarios múltiples y la entrega de turno; es la «consola portátil» del jefe de turno.
- **Escritorio:** la **pantalla de central** (modo pantalla completa, pensado para un monitor fijo y modo oscuro), configuración de reglas, cadenas y autonomía.
- **App del guardia (teléfono, portal Trabajador):** mandar mensajes a la central, ver sus hilos, ver y acusar avisos. En el **dispositivo de Terreno** (compartido) solo mandar el mensaje y acusar los avisos del puesto. Funciona sin conexión con cola local (ADR-044): el mensaje se envía al volver la señal y muestra «pendiente de envío».

## 4. Campos y validaciones

**Regla de vigilancia**

| Campo | Tipo | Obligatorio | Validación | Quién lo edita | Visible para cliente o trabajador |
|---|---|---|---|---|---|
| Señal | Catálogo | Sí | Publicado por un módulo activo; sin el módulo, la regla no se ofrece (ADR-048) | owner, admin | No |
| Umbral | Entero con unidad | Según la señal | Minutos de atraso, puntaje mínimo o cantidad de puntos; ≥ 0 | owner, admin | No |
| Severidad | Lista | Sí | Crítica, alta, media, baja | owner, admin | No |
| Ámbito | Lista | Sí | Tenant (por defecto) o instalación, que manda sobre el tenant (R3) | owner, admin | No |
| Horario | Franjas `[inicio, fin)` | No | Por defecto, siempre que haya turno en la pauta o jornada pactada | owner, admin | No |
| Cadena | Referencia | Sí | Cadena del tenant o de la instalación para esa severidad | owner, admin | No |
| Activa | Sí/no | Sí | Ver R6 y pregunta 5 | owner, admin | No |

**Cadena de escalamiento:** pasos ordenados (1 a 6), cada uno con destinatario (rol relativo: «supervisor de la instalación», «jefe de operaciones», «operador de turno», o una persona), canal (push, WhatsApp, SMS, correo, llamada humana, llamada por agente de IA cuando exista), espera antes del siguiente paso (minutos) y si el paso **exige confirmación** («me hago cargo»). El último paso es siempre un humano interno; el cliente nunca es un paso automático (R14).

**Mensaje a la central**

| Campo | Tipo | Obligatorio | Validación | Quién lo edita | Visible para cliente o trabajador |
|---|---|---|---|---|---|
| Tipo | Lista | Sí | Novedad, consulta, urgencia | El guardia al crear | Trabajador (lo propio) |
| Subtipo | Catálogo del tenant | No | Activo en el catálogo | El guardia | Trabajador |
| Texto | Texto externo | Sí, salvo urgencia | Hasta 1.000 caracteres | El guardia; no se edita después | Trabajador |
| Fotos | Documentos | No | Hasta 5, vía `core.documentos` (ADR-019) | El guardia | Trabajador |
| Instalación y turno | Referencias | Sí | Los pone el sistema según la sesión y la pauta o la jornada, nunca el guardia | Sistema | Trabajador |
| Ubicación | Punto | No | Solo si el tenant la pide y el dispositivo la da (geolocalización del núcleo) | Sistema | No |

**Aviso de la central**

| Campo | Tipo | Obligatorio | Validación | Quién lo edita | Visible para cliente o trabajador |
|---|---|---|---|---|---|
| Tipo | Lista | Sí | Consigna, cambio de turno, instrucción | Central | Trabajador |
| Texto | Texto o plantilla | Sí | Hasta 2.000 caracteres | Central; enviado no se edita (se reemplaza por otro) | Trabajador |
| Destinatarios | Personas, puestos, instalaciones o «turno de hoy» | Sí | Dentro del alcance de quien envía | Central | No |
| Acuse obligatorio y plazo | Sí/no + minutos | Sí | Por defecto sí en consignas, 15 min | Central | Trabajador |
| Vigencia | Rango de fechas | No | Fin posterior al inicio | Central | Trabajador |


## 5. Reglas de negocio

**Qué vigila**

- **R1.** La central vigila **señales**, no pantallas: cada módulo activo publica sus hechos y la central los evalúa contra las reglas en el momento, no por revisión periódica de una persona.
- **R2. Señales iniciales por fuente** (cada una con umbral configurable):
  - *Rondas* (ADR-024): ronda no iniciada a la hora, ronda atrasada, punto obligatorio saltado, ronda incompleta, **trust score** bajo la banda (por defecto rojo < 60), anomalía de recorrido (velocidad imposible, salto), pánico desde la ronda.
  - *Asistencia* (fase 4): no marcó entrada a la hora del turno más el margen, llegó tarde, salió antes, marca fuera de geocerca.
  - *Operaciones* (Brief 11 y 12): **puesto sin cubrir** (PPC) en el turno de hoy, cobertura no confirmada al inicio del turno (sin Asistencia, ADR-048), relevo que no llegó.
  - *Terreno*: mensaje de tipo urgencia, botón de pánico, dispositivo de la instalación sin conexión o con batería baja, aviso sin acuse vencido.
  - *Manual*: un operador o supervisor abre una alerta a mano.
- **R3. Umbrales configurables por tenant e instalación.** Cada regla tiene un valor del tenant y la instalación puede sobrescribirlo (cadena completa del núcleo: defecto → plataforma → tenant → instalación → usuario; para los umbrales de la central rigen los niveles tenant e instalación). ADR-038 resolvía defecto → plataforma → tenant → usuario, sin ámbito Instalación; por la pregunta 15 (decidida) el núcleo lo agrega antes del brief de Central (nota del 29-oct-2026 en ADR-038). Al activar el módulo, la **plantilla de la vertical se copia al tenant** (ADR-021, P13) y desde ahí es del tenant: cambiar la plantilla de OPAI no cambia la del tenant.
- **R4. Agrupación.** Señales de la misma instalación y turno que llegan dentro de una ventana (por defecto 10 min) se agrupan en la misma alerta abierta y elevan su severidad si corresponde; no se abre una alerta por señal. Un guardia que no marcó y no responde es **una** alerta, no dos.
- **R4a. Anti-saturación (ajuste de Carlos, 29-oct-2026, pregunta 6).** Además de R4: **una sola alerta abierta por guardia y evento** (nuevas señales del mismo guardia y el mismo tipo de evento se agregan a la alerta abierta, nunca abren otra); la cola **agrupa visualmente por instalación**; el operador puede **posponer** una alerta por un plazo elegido (vuelve a la cola activa, con su cadena retomada, al vencer o antes si llega una señal nueva o más grave; queda en la bitácora con quién y hasta cuándo); los **umbrales de cada regla de vigilancia son ajustables por instalación** (R3). Posponer es una acción de persona (nivel «solo» del operador, R10); el agente puede proponerla, nunca ejecutarla solo.
- **R5. Severidad.** La severidad la fija la regla; el agente puede **subirla** solo, nunca bajarla (bajar es propuesta, R10). Pánico y urgencia son siempre crítica.
- **R6. Silencio por defecto (ADR-020) y la cola.** Las reglas de la plantilla llegan **activas solo dentro de la cola de la central** (el operador y el agente las ven); los avisos hacia afuera (push, WhatsApp, correo, llamadas a supervisores) **parten apagados** y se activan por tenant en Configuración → Central o Comunicaciones (ajuste de Carlos, 29-oct-2026, pregunta 5). Ver pregunta 5.

**Qué hace ante una anomalía**

- **R7. Cadena de escalamiento.** Abierta la alerta, se ejecuta la cadena que le corresponde: contacta el paso 1; si nadie confirma dentro de la espera, pasa al paso 2, y así. Cada intento y su resultado quedan en la bitácora (R18). La cadena es configurable por tenant, por instalación y por severidad.
- **R8. Confirmar es hacerse cargo.** Un paso que exige confirmación se cumple cuando la persona responde «me hago cargo» (o lo dice en la llamada y el operador lo registra). Con eso, la cadena se detiene y la alerta queda «en atención» a nombre de esa persona, con un plazo para resolver; si vence, se retoma la cadena desde el paso siguiente.
- **R9. Llamadas.** En la primera versión, la llamada la hace una persona (el operador o el supervisor) con «llamar» desde la alerta y registra el resultado. **Las llamadas por un agente de IA son una etapa posterior** (Central II, confirmado por Carlos el 29-oct-2026, pregunta 8), por el adaptador de telefonía del núcleo (ADR-027 y ADR-031): el agente se presenta como asistente automatizado de la empresa, sigue un guion aprobado por el tenant, la transcripción vuelve como **texto externo** (dato, nunca instrucción; ADR-034 §2) y la grabación, si el tenant la activa, va a `core.documentos` con aviso al interlocutor y retención configurable (Ley 21.719).

**Humano a cargo**

- **R10. Tres niveles de autonomía del agente** (por defecto; el tenant los ajusta, R11). La central la opera un **agente de IA del tenant, supervisado por el operador de turno** (ajuste de Carlos, 29-oct-2026, pregunta 3): el agente nunca descarta un pánico, llama a emergencias ni avisa al cliente sin que una persona lo confirme (ver también R11, piso fijo). No es un mecanismo nuevo: «solo» es la autonomía directa de la capacidad para la key del agente y «aprobación humana» es la cola de aprobaciones del núcleo (`APPROVAL_REQUIRED`, Bandeja), ambas configuradas en Configuración → Agentes y API keys (ADR-032 §3, ADR-038). Lo único propio de la central es la **propuesta**: el agente la deja en la alerta y, si el operador la acepta, la acción se ejecuta **con la identidad del operador**, no la del agente.

  | Nivel | El agente… | Acciones por defecto |
  |---|---|---|
  | **Solo** (reversible y de bajo riesgo) | Lo hace y lo registra | Leer todo su alcance; abrir, agrupar y **subir** la severidad de alertas; ejecutar la cadena (avisar y reintentar contacto a supervisores, jefe de turno y guardia del turno por los canales configurados); responder hilos con respuestas predefinidas («recibido, la central está atendiendo»); enviar un **aviso de plantilla aprobada** al turno afectado; pedir acuse; registrar en la bitácora; proponer |
  | **Propone** (el operador acepta o rechaza con un toque) | Prepara la acción con su vista previa y espera | Resolver o cerrar como falsa alarma; bajar la severidad; enviar una instrucción con texto libre a un guardia; pedir un reemplazo o turno extra a Operaciones; derivar a ticket; reabrir; cambiar la cadena de una alerta; **posponer una alerta** (R4a) |
  | **Aprobación humana** (irreversible; `APPROVAL_REQUIRED`, ADR-032) | Nunca lo ejecuta solo | Llamar a servicios de emergencia o a Carabineros; avisar al cliente; **descartar un pánico**; registrar una falta disciplinaria; confirmar un turno extra con pago; cambiar la pauta; aviso masivo a más de una instalación; cambiar reglas, cadenas o la autonomía |

- **R11. El tenant ajusta, con piso.** Un owner o admin puede mover acciones entre «solo» y «propone» desde la autonomía de la key del agente (Configuración → Agentes y API keys). Lo marcado como **aprobación humana no baja a «solo»** en la central, aunque ADR-032 permita autorizar por capacidad: descartar un pánico, llamar a emergencias y avisar al cliente quedan siempre en manos humanas (pregunta 3).
- **R12. Siempre hay un humano a cargo.** Toda hora del día tiene un **responsable de central**: el operador con turno de central abierto o, si no hay, el **responsable de respaldo** que el tenant designa (por defecto, el jefe de operaciones). **El owner o un admin asigna en Configuración de la Central el operador de cada turno y el jefe de operaciones de respaldo** (ajuste de Carlos, 29-oct-2026, pregunta 4; §4.9/`ConfigCentral`). El agente es una **identidad de servicio** (ADR-051): sus permisos salen solo de su key, con alcance de todo el tenant, y el responsable de turno es quien **gobierna** (recibe sus aprobaciones y avisos y responde por él); no hereda el rol ni el alcance de esa persona. Sin responsable nombrado, el agente **solo lee y avisa a los owner y admin** que la central está sin responsable; no contacta, no escala ni propone (pregunta 4).
- **R13. Tomar el control.** Cualquier operador con permiso puede **tomar** una alerta: desde ese momento el agente deja de actuar en ella (solo sugiere en un panel aparte) hasta que el operador la **devuelve**. También puede **pausar al agente** para una instalación o para todo el tenant; reanudarlo es solo de personas. Tomar, devolver, pausar y reanudar quedan en la bitácora. Tomar, devolver, reanudar y los turnos de central son **solo de personas** (`soloPersonas`, con motivo en `paridad-excepciones.ts`: garantizan que el humano a cargo sea una persona); pausar sí lo puede hacer el agente sobre sí mismo.
- **R14. El cliente se entera por decisión humana.** Ningún aviso al cliente sale solo. El portal del cliente muestra la bitácora de su instalación solo si el tenant lo habilita, con el resumen de la alerta y sin hallazgos internos ni datos personales de los guardias más allá de lo que el portal ya muestra (ADR-033).
- **R15. Entrega de turno.** Al cerrar su turno, el operador ve el resumen (alertas abiertas, en atención, propuestas pendientes, avisos sin acuse) y lo entrega al siguiente, que lo acepta. Lo abierto pasa a nombre del nuevo responsable.

**Canales estructurados (sin chat)**

- **R16. Mensaje a la central.** (Precisa ADR-025 y amplía la cola sin conexión de ADR-044.3, que cubría marcas, rondas y novedades, a los mensajes a la central; pregunta 9, decidida, con notas del 29-oct-2026 en ambos ADR.) El guardia elige tipo (**novedad**, **consulta**, **urgencia**), escribe y adjunta fotos; el sistema lo liga a su instalación y turno según la pauta o la jornada pactada. La central responde **en el mismo hilo**. Reglas para que no sea chat:
  - el hilo lo abre siempre el terreno con un tipo, o la central desde una alerta; no hay hilos entre guardias ni conversaciones sin tipo;
  - mientras el hilo está abierto, el guardia puede agregar respuestas y fotos; al resolverlo, la central lo cierra y el guardia ve el cierre;
  - una **urgencia** abre una alerta crítica de inmediato; una **novedad** queda además en el libro de novedades si ese módulo está activo; una **consulta** espera respuesta con un plazo configurable (por defecto 15 min) y, vencido, entra a la cola.
- **R17. Avisos de la central.** La central envía consignas, cambios de turno e instrucciones a personas, puestos, instalaciones o «el turno de hoy». Con acuse obligatorio, la persona confirma «leído y entendido»; si no acusa dentro del plazo, se abre una alerta (R2, terreno) y se ejecuta la cadena. Un cambio de turno **avisa**, no cambia la pauta: el cambio lo hace Operaciones (R10, aprobación humana). Las consignas vigentes se ven fijas en la app del guardia hasta que vencen.

**Registro**

- **R18. Todo queda en la bitácora.** Cada alerta, señal, intento de contacto, llamada, respuesta, propuesta (aceptada o rechazada), aprobación, toma de control, mensaje, aviso y acuse es una entrada **inmutable**, con hora de servidor, actor (la persona, o «agente `Agente de central` (servicio)» con el responsable de turno anotado, ADR-051) y encadenada por tenant como `core.bitacora` y `core.audit_events` (ADR-023, ADR-052). Una corrección es una entrada nueva que referencia a la anterior. La bitácora se consulta por instalación y por turno.
- **R19. Lo externo es dato.** Textos de guardias, clientes, transcripciones y fotos llegan al agente marcados como externos: nunca habilitan por sí mismos una acción de aprobación humana (ADR-034 §2). «Llama a mi jefe y dile que me voy» en un mensaje no hace que el agente cambie la pauta.

**Alcance y aislamiento**

- **R20.** Un supervisor ve y atiende solo las alertas, hilos y avisos de las instalaciones a su cargo; el filtro va en la consulta (ADR-022). El agente de servicio ve todo el tenant (ADR-051); un tenant que quiera agentes por zona necesita una decisión sobre ADR-051, porque hoy una key de servicio no se acota a instalaciones (pregunta 2).
- **R21. Agent-first.** Toda acción de pantalla es una capacidad expuesta igual en la pantalla, en `/api/v1` y como herramienta MCP (ADR-004, ADR-055); toda escritura acepta `dryRun` (en MCP, `preview_…`) y clave de idempotencia y queda en la auditoría. Toda tabla nueva lleva `tenant_id` con RLS y la política `tenant_isolation` (ADR-002); las de aprobación humana devuelven `APPROVAL_REQUIRED` a los agentes y entran a la Bandeja del responsable.

## 6. Estados y transiciones

**Alerta**

| Desde | Hacia | Quién | Condición | Efecto | ¿Reversible? |
|---|---|---|---|---|---|
| — | **Nueva** | Sistema (regla), operador, supervisor, agente | Señal sobre umbral o alta manual | Inicia la cadena | — |
| Nueva | **En contacto** | Agente o persona | Primer intento de la cadena | Intento en bitácora | Sí |
| En contacto | **Escalada** | Sistema | Venció la espera sin confirmación | Pasa al paso siguiente | Sí |
| Nueva, En contacto, Escalada | **En atención** | Persona que confirma «me hago cargo» u operador que la toma | R8, R13 | Detiene la cadena; plazo para resolver | Sí (devolver) |
| En atención | **Escalada** | Sistema | Venció el plazo para resolver de quien se hizo cargo (R8) | Retoma la cadena desde el paso siguiente | Sí |
| En atención | **Resuelta** | Persona; agente solo como propuesta aceptada | Causa atendida, con nota | Cierra hilos ligados | Sí (reabrir, propuesta) |
| Cualquiera abierta | **Falsa alarma** | Persona; agente como propuesta; pánico solo con aprobación humana | Con motivo | Cierra | Sí (reabrir) |
| Nueva, En contacto, Escalada, En atención | **Pospuesta** | Persona (R4a; agente solo puede proponerlo); ajuste de Carlos, 29-oct-2026, pregunta 6 | Operador elige el plazo | Sale de la cola activa; cadena en espera | Sí (vuelve a su estado anterior al vencer el plazo o con una señal nueva) |
| Resuelta, Falsa alarma | **Reabierta → En atención** | Persona | Nueva evidencia | Retoma con el mismo historial | — |

**Mensaje a la central:** pendiente de envío (sin conexión) → enviado → recibido (la central lo vio) → respondido → cerrado. **Aviso:** borrador → enviado → (por persona) entregado → acusado | vencido sin acuse → acusado tarde. **Turno de central:** abierto → en entrega → cerrado.

## 7. Permisos por rol y portal

| Acción | owner | admin | gerente | supervisor | viewer | Cliente | Trabajador / Terreno | Agente de central |
|---|---|---|---|---|---|---|---|---|
| Ver cola y alertas | sí | sí | sí | alcance | lectura | — | — | todo el tenant (servicio, ADR-051) |
| Atender (contactar, tomar, resolver, posponer) | sí | sí | sí | alcance | no | — | — | según R10 (posponer: solo propone, R4a) |
| Aprobar lo irreversible | sí | sí | sí (configurable) | no (configurable) | no | — | — | nunca |
| Enviar avisos | sí | sí | sí | alcance | no | — | — | plantilla aprobada (solo); libre (propone) |
| Mandar mensaje a la central y acusar | — | — | — | sí | — | — | sí (lo propio) | — |
| Configurar reglas, cadenas y autonomía | sí | sí | no | no | no | — | — | solo prepara el cambio; lo aplica una persona (aprobación humana) |
| Pausar / reanudar al agente | sí | sí | sí | pausar en su alcance | no | — | — | pausarse sí; reanudarse no (`soloPersonas`) |
| Tomar o devolver una alerta; abrir, entregar y aceptar turno de central | sí | sí | sí | alcance | no | — | — | no (`soloPersonas`) |
| Ver bitácora | sí | sí | sí | alcance | lectura | resumen, si el tenant lo habilita | lo propio | alcance |

Permisos propuestos: `central:alertas.ver`, `central:alertas.atender`, `central:aprobar`, `central:avisos.enviar`, `central:config.manage`, `central:agente.gobernar`. El **operador de central** es un rol personalizado de plantilla (Brief 07c), no un rol base (pregunta 12).

## 8. Eventos y notificaciones

**Silencio por defecto (ADR-020):** por defecto todo se ve **solo dentro de OPAI** (la cola de la central, la Bandeja y la app del destinatario cuando la abre). Cualquier envío hacia afuera (push, WhatsApp, SMS, correo, llamada) queda apagado hasta que el tenant lo activa (R6). La columna «Al activarlo» dice a quién va cuando el tenant lo enciende.

| Evento | Cuándo | Por defecto | Al activarlo | Canal | Plantilla |
|---|---|---|---|---|---|
| `central.alerta.abierta` | Se abre o reabre una alerta | Cola de la central | Paso 1 de la cadena | El del paso | «Alerta en {instalación}: {título}» |
| `central.alerta.escalada` | Cambia de paso | Cola de la central | Destinatario del paso | El del paso | «Te necesitan en {instalación}» |
| `central.alerta.resuelta` | Se resuelve o se cierra | Cola y bitácora | Quien se hizo cargo y el supervisor | push | «Resuelta: {título}» |
| `central.aprobacion.pedida` | El agente pide algo irreversible | Bandeja del responsable | Responsable de central | push | «La central pide tu aprobación» |
| `central.mensaje.recibido` | Llega un mensaje del terreno | Cola de la central | Operador de turno | push | «Mensaje de {guardia}: {tipo}» |
| `central.mensaje.respondido` | La central responde | Hilo en la app del guardia | El guardia | push | «La central respondió» |
| `central.aviso.enviado` / `central.aviso.sin_acuse` | Se envía un aviso / vence el acuse | App del destinatario / cola | Destinatarios / operador | push | «Aviso de la central» / «Sin acuse: {aviso}» |
| `central.agente.pausado` | Alguien pausa al agente | Cola y bitácora | Responsable de central y owner | push | «Agente de central en pausa» |

Todas las plantillas son editables en Comunicaciones (ADR-020) y medidos en `core.consumos` cuando usan WhatsApp, SMS o telefonía (ADR-031).

## 9. Herramientas MCP

El agente de central opera **solo con estas capacidades** (no hay otro camino a los datos, ADR-049 «Consecuencias»), con la identidad de su key de servicio y **alcance de todo el tenant** (ADR-051, R12). No hereda el rol ni el alcance de ninguna persona: lo **gobierna** el responsable de central de turno o, si no hay, el responsable de respaldo, que recibe sus aprobaciones y avisos. Las acciones del piso fijo (descartar un pánico, llamar a emergencias, avisar al cliente; R11) **nunca las decide solo**: siempre pasan por la aprobación humana de ese responsable.

| Herramienta | Qué hace | Tipo | Vista previa | Aprobación humana |
|---|---|---|---|---|
| `central_estado` | Foto en vivo: alertas por severidad, instalaciones con problemas, responsable de turno, estado del agente | Lectura | — | — |
| `central_alertas_list` / `central_alertas_get` | Lista con filtros y detalle con señales, contexto del turno, cadena e intentos | Lectura | — | — |
| `central_alertas_abrir` | Abre una alerta manual | Escritura | sí | no |
| `central_alertas_contactar` | Registra o ejecuta un intento de contacto por un canal | Escritura | sí | no (llamar a emergencias: sí) |
| `central_alertas_escalar` | Pasa al siguiente paso o a uno elegido | Escritura | sí | no |
| `central_alertas_proponer` | Deja una propuesta para el operador | Escritura | sí | no |
| `central_alertas_resolver` / `central_alertas_falsa_alarma` / `central_alertas_reabrir` | Cierra o reabre | Escritura | sí | pánico: sí |
| `central_alertas_posponer` | Pospone una alerta por un plazo (R4a, ajuste de Carlos 29-oct-2026); el agente solo la propone | Escritura | sí | no |
| `central_alertas_avisar_cliente` | Aviso al cliente con plantilla | Irreversible | sí | **sí** |
| `central_mensajes_list` / `_get` / `_responder` / `_cerrar` | Hilos del terreno | Lectura / escritura | sí | no |
| `central_mensajes_enviar` | El guardia (key de trabajador o terreno, ADR-033) abre un hilo | Escritura | sí | no |
| `central_avisos_create` / `_list` / `_get` / `_acusar` | Avisos y acuses | Escritura / lectura | sí | aviso masivo: sí |
| `central_bitacora_list` | Bitácora por instalación y turno | Lectura | — | — |
| `central_agente_pausar` | El agente o una persona pausa al agente en una instalación o en todo el tenant | Escritura | sí | no |
| `core_config_set` (reglas) y `central_cadenas_*` | Configuración de reglas y cadenas | Escritura | sí | **sí** |

**Sin herramienta MCP, con motivo (`soloPersonas`, `paridad-excepciones.ts`):** tomar y devolver una alerta, abrir, entregar y aceptar el turno de central, y reanudar al agente. Motivo: son las acciones que garantizan que el humano a cargo es una persona. La autonomía del agente se configura con las capacidades existentes de Agentes y API keys del núcleo, no con una herramienta propia.

**Flujo típico del agente (para el manual `docs/2.0/agentes/central.md`, con escenario de prueba en `pnpm test`, ADR-034 §5):** `central_estado` → por cada alerta nueva, `central_alertas_get` → si no está tomada, `preview_central_alertas_contactar` y `central_alertas_contactar` con el paso de la cadena → esperar la confirmación o el vencimiento → `central_alertas_escalar` → al confirmarse la causa, `central_alertas_proponer` con la resolución → **se detiene** ante `APPROVAL_REQUIRED`, una alerta tomada por un humano o el agente pausado.

## 10. Integraciones

- **Push** (ADR-044) y **in-app** del núcleo; **WhatsApp y SMS** por el adaptador de mensajería del núcleo, con credenciales del tenant (ADR-027) y consumo medido (ADR-031). **Twilio (ajuste de Carlos, 29-oct-2026):** por defecto, los mensajes salen con el Twilio de OPAI y sus plantillas de WhatsApp ya aprobadas; como opción, cada tenant conecta su propia cuenta de Twilio en el catálogo de integraciones del núcleo (ADR-027, secretos cifrados, nunca en código ni en logs). Un tenant con número de WhatsApp propio necesita la aprobación de Meta **por número y por plantilla** antes de poder enviarlas; mientras no la tenga, sigue con el Twilio y las plantillas de OPAI.
- **Telefonía** (llamada humana desde el navegador o el teléfono en la v1; llamada por agente de IA en Central II) por un adaptador del núcleo aún no existente; proveedor por decidir (pregunta 8).
- **IA** por clase de tarea (`economica` para clasificar señales, `estandar` para resumir y proponer), nunca por nombre de modelo (ADR-031), con la key del tenant si la tiene (ADR-049 §6): si todas sus keys fallan, la solicitud falla y se avisa al tenant, **nunca** se pasa a la key de OPAI.
- **Mapas** solo por el servicio de geolocalización del núcleo, para la posición de la instalación y de la última marca o punto de ronda.

## 11. Mejoras respecto de 1.0 y lo que no se porta

1.0 es el piso. Lo de 1.0 que esta especificación cita está **sin verificar** contra el código (falta `extraccion/central.md`, ver §15).

| En 1.0 | En 2.0 | Por qué |
|---|---|---|
| Alertas de pánico y críticas de rondas, digest diario de cumplimiento (`extraccion/rondas-y-tickets.md`) | Señales de Rondas a una sola cola, con cadena y bitácora | Una alerta deja de ser un aviso suelto: tiene dueño, plazo y cierre |
| Configuración «alertas-cobertura» con radio de 30 km (sin verificar) | Regla de puesto sin cubrir por instalación y, con Operaciones, propuesta de reemplazo | Umbrales por tenant e instalación |
| ≈1.000 notificaciones diarias, tickets automáticos sin dueño | Silencio hacia afuera por defecto, agrupación (R4), alertas que no son tickets | Ruido controlado (ADR-020, ADR-025) |
| Hilos de Slack por ronda | Mensaje a la central y avisos con acuse, dentro de OPAI | Sin chat y con registro (ADR-025) |
| Una persona mirando pantallas | Agente que vigila y contacta, humano a cargo que aprueba | Operación 24/7 con trazabilidad |

**No se porta:** el chat de 1.0, los hilos de Slack, los tickets automáticos por hallazgo. Las cámaras de 1.0 siguen en backlog (pueden ser una fuente futura de señales).

## 12. Casos borde

- Guardia sin conexión: su mensaje queda «pendiente de envío» con hora del dispositivo y se sella con hora de servidor al llegar; la urgencia muestra además «llama a la central» con el número configurado.
- Dos señales de fuentes distintas para el mismo guardia (no marcó en Asistencia y no inició ronda): una alerta (R4).
- El supervisor confirma «me hago cargo» y no resuelve: vence el plazo y la cadena sigue (R8).
- El operador toma una alerta y cierra la sesión sin devolverla: al entregar el turno pasa al siguiente responsable (R15); sin entrega, la alerta sigue tomada a su nombre (el agente no la retoma solo, R13), se marca «tomada sin atención» en la cola y avisa al responsable de respaldo a los 30 min.
- Instalación sin cadena propia y sin cadena del tenant para esa severidad: se usa la cadena por defecto de la plantilla y se marca en Configuración como pendiente.
- Aviso a un puesto cuyo titular está de licencia: llega a quien cubre el turno según la pauta; sin Operaciones, a las personas con vínculo en la instalación.
- Pánico accidental: solo una persona lo cierra como falsa alarma, con motivo (R10).
- Cambio de horario de verano: los plazos se cuentan en tiempo real (UTC), la hora se presenta en la zona del tenant.

### Sin la fuente X (ADR-048)

| Falta | Qué hace la central |
|---|---|
| Rondas | No ofrece reglas de rondas; lo demás sigue |
| Asistencia | «No marcó» se reemplaza por «cobertura no confirmada al inicio del turno» (Operaciones) o se omite |
| Operaciones | Los turnos salen de la jornada pactada del vínculo laboral; sin puesto ni PPC; los avisos van a personas o a la instalación |
| Las tres | La central queda con mensajes, avisos, alertas manuales y bitácora: sirve como mesa de terreno |
| Tickets | No ofrece «derivar a ticket» |

## 13. Criterios de aceptación

- **CA1.** Con Rondas activa, una ronda que no empieza a la hora más el umbral de su instalación abre **una** alerta en la cola en menos de 1 minuto, y el agente contacta al paso 1 de la cadena.
- **CA2.** Si nadie confirma en la espera configurada, la alerta pasa al paso 2 y la bitácora muestra ambos intentos con hora y resultado.
- **CA3.** El agente propone «resolver» y el operador lo acepta desde el teléfono con un toque; la bitácora muestra «propuesta del agente aceptada por <operador>».
- **CA4.** El agente intenta avisar al cliente o descartar un pánico y recibe `APPROVAL_REQUIRED`; la aprobación aparece en la Bandeja del responsable y nada sale hasta que la aprueba.
- **CA5.** Un operador toma una alerta y el agente no ejecuta nada en ella hasta que la devuelve; pausar al agente para una instalación detiene sus acciones allí en el siguiente ciclo.
- **CA6.** Un guardia manda una urgencia sin señal; al volver la conexión, la alerta crítica se abre y el hilo muestra la respuesta de la central en el mismo hilo.
- **CA7.** Un aviso con acuse obligatorio no acusado en el plazo abre una alerta; el acuse queda con hora de servidor y no se puede editar.
- **CA8.** Un supervisor solo ve alertas, hilos y avisos de sus instalaciones, por pantalla, API y MCP; con los ids de otra instalación recibe «no encontrado».
- **CA9.** Cada acción de pantalla tiene su herramienta MCP, salvo las excepciones `soloPersonas` de §9 (tomar y devolver una alerta, abrir, entregar y aceptar el turno de central y reanudar al agente), que figuran en `paridad-excepciones.ts` con su motivo; el gate de paridad está en verde.
- **CA10.** Las pantallas del ERP pasan a 375, 1024 y 1280 px; las de la app del guardia y del supervisor, a 375 (y 1024 si el brief lo pide); en claro y oscuro, con oscuro obligatorio en la cola, el detalle de alerta y la pantalla de central; todo contra el export aprobado del DS 2.0.
- **CA11.** Un operador pospone una alerta por un plazo; sale de la cola activa, la cadena queda en espera y vuelve sola al vencer el plazo o antes si llega una señal nueva o más grave; el agente solo puede proponer «posponer», nunca ejecutarlo (R4a, ajuste de Carlos 29-oct-2026).

## 14. Preguntas para Carlos · **decididas**

**Decididas el 29-oct-2026:** Decisión de Carlos, 29-oct-2026, transmitida en la sesión de Claude de CAR-70 (PR #122): aprobó las 15 preguntas de `modulos/central.md` §14 tal como venían recomendadas. Cada respuesta es la recomendación de abajo; se conserva la pregunta con su porqué como historia. El efecto en otros documentos va anotado en cada una.

### Decisiones de Carlos 29-oct-2026

Carlos aceptó las 15 preguntas según la recomendación, con estos ajustes (transmitidos en la misma sesión de Claude de CAR-70, PR #122):

- **(3)** La puede operar un agente de IA del tenant, supervisado por el operador de turno. El agente nunca descarta un pánico, llama a emergencias ni avisa al cliente sin que una persona lo confirme.
- **(4)** El owner o un admin asigna en Configuración de la Central el operador de cada turno y el jefe de operaciones de respaldo.
- **(5)** Las reglas de vigilancia de la pregunta 6 parten activas solo dentro de la Central. Los avisos externos (push, WhatsApp, llamadas) parten apagados.
- **(6)** Umbrales como se recomendaban, con medidas contra la saturación: una sola alerta abierta por guardia y evento, agrupar por instalación, poder posponer, umbrales ajustables por instalación.
- **(8)** Las llamadas con IA quedan para Central II.
- **Twilio.** Por defecto, el Twilio de OPAI con plantillas de WhatsApp ya aprobadas; como opción, cada tenant conecta el suyo. WhatsApp con número propio exige aprobación de Meta por número y por plantilla.
- **Libro de novedades.** El libro de novedades de 1.0 pasa a 2.0 en la app Terreno, recibe las novedades de las rondas y la Central lo muestra en la ficha de la instalación (pestaña Central).

Cada ajuste queda aplicado en las reglas y secciones correspondientes (R4, R6, R9, R12, §9, §10 y §2/§3, marcadas abajo con «Ajuste de Carlos, 29-oct-2026»).

1. **¿Central es un módulo propio o parte de Operaciones II (Brief 12)?** Recomendación: **módulo propio «Central», vendible por separado**, que depende solo del núcleo y usa Rondas, Asistencia, Operaciones y Tickets como fuentes opcionales (ADR-048). Por qué: una empresa que solo compra Rondas también quiere la central; meterla en Operaciones II obligaría a comprar puestos y pauta. Va como **Brief 15b, después de Portales (Brief 15)**, porque los dos canales viven en las apps del guardia y del supervisor; las llamadas por IA quedan para **Central II**. **Decidido (29-oct-2026): sí, según la recomendación.** Queda así en `ROADMAP.md` y `PLAN-desarrollo.md`.
2. **¿Qué agente opera la central?** Recomendación: un **agente de servicio** propio por tenant («Agente de central», key de servicio con permisos explícitos y presupuesto, ADR-051, como automatización alojada de ADR-032), con alcance de todo el tenant y gobernado por el responsable de central de turno, y no el agente interno de ADR-049. Si Gard necesitara agentes por zona, habría que cambiar ADR-051 (hoy una key de servicio no se acota a instalaciones); no lo recomiendo para la v1. Por qué: el agente interno pide confirmación al usuario antes de cada escritura y vive en su sesión; la central tiene que actuar de noche sin nadie frente a la pantalla, dentro de los límites de R10. **Decidido (29-oct-2026): sí, según la recomendación.**
3. **¿Aceptas la tabla de autonomía de R10 y que descartar un pánico, llamar a emergencias y avisar al cliente nunca se autoricen al agente, ni siquiera con la autorización del owner?** («No autorizar» significa **sin autonomía**: el agente puede pedirlas, pero cada una pasa siempre por la aprobación humana del responsable, como en §9 y CA4.) Recomendación: **sí**. Por qué: son las tres acciones donde un error del agente cuesta una vida o un cliente; ADR-032 permite autorizar por capacidad, pero en la central conviene un piso fijo. **Decidido (29-oct-2026): sí, según la recomendación. Ajuste de Carlos, 29-oct-2026: la central la opera un agente de IA del tenant, supervisado por el operador de turno; el agente nunca descarta un pánico, llama a emergencias ni avisa al cliente sin que una persona lo confirme (R10, R11).**
4. **¿Qué pasa si no hay operador con turno de central abierto?** Recomendación: el **responsable de respaldo** (por defecto, el jefe de operaciones) pasa a estar a cargo y el agente sigue con las acciones «solo», escalándole todo lo demás; **sin ningún responsable nombrado, el agente solo lee y avisa a los owner y admin**. Por qué: «humano a cargo» tiene que ser verificable a toda hora, no una intención. **Decidido (29-oct-2026): sí, según la recomendación. Ajuste de Carlos, 29-oct-2026: el owner o un admin asigna en Configuración de la Central el operador de cada turno y el jefe de operaciones de respaldo (R12, §4.9/`ConfigCentral`).**
5. **Silencio por defecto (ADR-020) frente a una central que debe alertar.** Recomendación: las reglas de la plantilla llegan **activas dentro de la cola**, y los avisos hacia afuera (push, WhatsApp, llamadas a supervisores) se activan por tenant con un asistente de puesta en marcha. Por qué: el tenant ve desde el primer día lo que la central detecta, sin que nadie reciba mensajes que no pidió. **Decidido (29-oct-2026): sí, según la recomendación. Ajuste de Carlos, 29-oct-2026: las reglas de vigilancia de la pregunta 6 parten activas solo dentro de la Central; los avisos externos (push, WhatsApp, llamadas) parten apagados (R6).**
6. **¿Usamos estos umbrales de la plantilla de seguridad?** No marcó: 15 min tras el inicio del turno · llegó tarde: más de 5 min · ronda no iniciada o atrasada: 10 min · punto obligatorio saltado: siempre · trust score rojo: menor a 60 · puesto sin cubrir: al inicio del turno · consulta sin respuesta: 15 min · aviso sin acuse: 15 min · urgencia y pánico: inmediato. Recomendación: **sí, como punto de partida**, y que Carlos los ajuste con lo que Gard usa hoy. Por qué: son los de 1.0 donde existen (trust score) y valores prudentes donde no. **Decidido (29-oct-2026): sí, según la recomendación. Ajuste de Carlos, 29-oct-2026: con medidas contra la saturación: una sola alerta abierta por guardia y evento, agrupar por instalación, poder posponer y umbrales ajustables por instalación (R4, R4a, §6, §9).**
7. **¿Cadena por defecto (en la plantilla; hacia afuera se activa por tenant, R6)?** Recomendación: (1) el guardia del turno por push, 3 min → (2) supervisor de la instalación por push y WhatsApp, 5 min, exige «me hago cargo» → (3) jefe de turno u operador de central por llamada humana, 10 min → (4) jefe de operaciones. Críticas: pasos 2 y 3 a la vez. El cliente nunca es un paso automático. Por qué: replica cómo escala hoy un jefe de turno y deja la llamada a una persona en la v1. **Decidido (29-oct-2026): sí, según la recomendación.**
8. **Llamadas por IA: ¿cuándo y cómo?** Recomendación: **v1 sin llamadas por IA** (llamada humana con un toque y registro del resultado); **Central II** con un adaptador de telefonía del núcleo, guion aprobado por el tenant, presentación explícita como asistente automatizado, grabación opcional con aviso y retención configurable. Proveedor por decidir cuando se abra Central II. Por qué: sin proveedor elegido ni evaluación legal (Ley 21.719, grabaciones), adelantarlo pone en riesgo la v1. **Decidido (29-oct-2026): sí, según la recomendación. Ajuste de Carlos, 29-oct-2026: las llamadas con IA quedan para Central II (confirma R9).**
9. **En el hilo de «Mensaje a la central», ¿el guardia escribe libre?** Recomendación: **sí, pero solo dentro de un hilo abierto** que él abrió con un tipo o que abrió la central; sin hilos entre guardias ni sin tipo, y el hilo se cierra al resolver. Si lo apruebas, se agrega una nota a ADR-025 («el hilo de la central no es chat») y otra a ADR-044.3 (cola sin conexión para los mensajes). Por qué: mantiene el registro estructurado y evita que se convierta en el chat que ADR-025 descartó. **Decidido (29-oct-2026): sí, según la recomendación.** Notas del 29-oct-2026 en ADR-025 y ADR-044.
10. **¿Dónde se ve la bitácora y la ve el cliente?** Recomendación: pestaña **«Central»** en la ficha de la instalación (con filtro por turno) y vista transversal en Central; en el **Portal Cliente**, solo un resumen por alerta si el tenant lo habilita por cuenta, sin hallazgos internos. Por qué: sigue ADR-041 (pestaña de módulo) y el criterio de la vista del cliente de Rondas. **Decidido (29-oct-2026): sí, según la recomendación.**
11. **El backlog de `ROADMAP.md` dice que «alertas y cobertura» e «incidentes» de 1.0 no se portan. ¿La central los reemplaza y salen del backlog?** Recomendación: **sí**; la central los absorbe con un diseño nuevo (no se porta código), y «comunicaciones» y «chat» siguen en el backlog. Por qué: tu pedido del 29-oct es justamente ese caso de uso; sin esta decisión, el plan se contradice. **Decidido (29-oct-2026): sí, según la recomendación.** Salen del backlog en `ROADMAP.md` y `CONTEXTO-agentes.md`.
12. **¿El operador de central es un rol nuevo?** Recomendación: un **rol personalizado de plantilla** «Operador de central» (Brief 07c) con `central:alertas.*` y `central:avisos.enviar`, sin aprobar ni configurar; no un sexto rol base. Por qué: los roles base son fijos (ADR-016) y 07c ya resuelve roles por tenant. **Decidido (29-oct-2026): sí, según la recomendación.**
13. **¿Qué se vende y con qué?** Recomendación: Central se vende sola (como mesa de terreno con mensajes, avisos y alertas manuales) y **suma reglas automáticas por cada fuente activa**; incluye las pantallas mínimas de los dos canales en las apps del guardia y del supervisor aunque el tenant no tenga otros módulos de portal. El monto va al ADR futuro de planes y precios. Por qué: ADR-048 exige que funcione sin fuentes y los canales no sirven si el guardia no los ve. **Decidido (29-oct-2026): sí, según la recomendación.**
14. **¿Cuántas señales por segundo y cuántas instalaciones debe aguantar la v1?** Recomendación: dimensionar para **500 instalaciones y 5.000 guardias por tenant** con respuesta en vivo de la cola en menos de 2 s, y medirlo en el brief. Por qué: es un orden de magnitud sobre Gard y fija el diseño del tiempo real (ADR-045). **Decidido (29-oct-2026): sí, según la recomendación.**
15. **¿Agregamos el ámbito «Instalación» al centro de Configuración del núcleo (ADR-038)?** Recomendación: **sí**, con resolución defecto → plataforma → tenant → instalación → usuario, como cambio del núcleo antes del brief de Central. Por qué: los umbrales por instalación son el corazón de la central y Rondas los necesitará igual (geocerca y tiempos por instalación); guardarlos como datos propios del módulo crearía una segunda forma de configurar, que ADR-018 prohíbe. **Decidido (29-oct-2026): sí, según la recomendación.** Nota del 29-oct-2026 en ADR-038; lo construye el núcleo antes del Brief 15b.

## 15. Lugar en el ROADMAP

- **Decidido (pregunta 1):** módulo propio **Central**, fase 3, **Brief 15b** después de Portales Supervisor y Trabajador (Brief 15) y antes de Portales Cliente y Terreno (Brief 16), que suma el canal en el dispositivo de terreno. Fuentes opcionales: Rondas (14), Operaciones (11 y 12), Tickets (13) y, desde la fase 4, Asistencia (18): cada una suma sus reglas cuando llega.
- **Central II (llamadas por agente de IA):** después del Brief 17 (nativo, por el audio en segundo plano) y con el proveedor de telefonía decidido.
- **Antes del brief:** extracción `extraccion/central.md` de lo que 1.0 hace hoy (pánico, alertas de cobertura, líneas telefónicas, digest de rondas), aprobación de esta especificación y diseño aprobado en Claude Design con el DS 2.0.

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
| 29-oct-2026 | Primera versión (borrador) con reglas, preguntas y Design Prompt (CAR-70) | — (pendiente de aprobación) |
| 29-oct-2026 | Las 15 preguntas de §14 quedan decididas según la recomendación; notas en ADR-025, ADR-038 y ADR-044; §9 precisa el alcance del agente y quién lo gobierna | Carlos (preguntas); la especificación completa sigue pendiente |
| 29-oct-2026 | Ajustes de Carlos a las preguntas 3, 4, 5, 6 y 8: supervisión del agente por el operador de turno (R10), asignación de turno y respaldo por owner/admin (R12), reglas activas solo dentro de la Central (R6), anti-saturación con alerta única por guardia y evento, agrupación, posponer y umbrales por instalación (R4a, nueva), Central II para llamadas con IA (R9); se agrega Twilio por defecto con opción de cuenta propia del tenant (§10) y el libro de novedades en la app Terreno, mostrado en la pestaña Central de la instalación (§2, §3); notas en ADR-024 y ADR-027 | Carlos (ajustes, transmitidos en la sesión de Claude de CAR-70, PR #122); la especificación completa sigue pendiente |
