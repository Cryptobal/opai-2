# Comercial — Especificación funcional

**Estado:** borrador para aprobación de Carlos · **Fase:** 2 · **Fecha:** 24-oct-2026 · **Insumos:** `extraccion/comercial-y-cpq.md`, `extraccion/maestros.md`, ADR-040 (modelo comercial), ADR-041 (fichas), ADR-042 (CPQ, solo en lo que toca al negocio), ADR-046 y `NAVEGACION.md` · **Autor:** Claude

> Lenguaje de negocio, sin código (ADR-047). Cotizaciones y modelo de costeo van en `modulos/cpq.md`; aquí solo se describe cómo se ven desde el negocio. El diseño y el brief citan las reglas (R1…) y los criterios (CA1…).

## 1. Objetivo

Que Gard (y cualquier empresa de servicios con personal) reciba, ordene y cierre sus oportunidades de venta en un solo lugar, sin copiar datos entre pantallas: cada solicitud que llega queda atendida a tiempo, cada negocio sabe qué cuenta, qué instalaciones y qué personas involucra, y al ganarlo las instalaciones quedan listas para operar. Un agente puede hacer todo lo que hace una persona, con vista previa y aprobación para lo irreversible.

**Cómo se nota que funciona:**
- 100 % de las solicitudes con primera respuesta dentro del plazo (SLA) del tenant.
- Durante dos semanas seguidas Gard gestiona todos sus negocios en 2.0 y deja de usar 1.0 para leads, cuentas, contactos y negocios (criterio de la fase 2 en `ROADMAP.md`).
- La conciliación diaria 1.0 ↔ 2.0 no reporta diferencias.

## 2. Entidades y relaciones

| Entidad | Qué es | Se relaciona con | Dónde vive |
|---|---|---|---|
| Solicitud | Pedido entrante (formulario web, correo, WhatsApp, agente) con los datos tal como llegaron | Puede terminar en una cuenta y un negocio | Comercial |
| Cuenta | Empresa cliente o prospecto (`prospecto`, `cliente_activo`, `cliente_inactivo`) | Contactos (N), instalaciones (N), negocios (N) | Núcleo (existe) |
| Contacto | **Persona única** en la empresa, identificada por su correo | Vinculada a N cuentas, con cargo y roles distintos en cada una; roles en instalaciones y en negocios | Núcleo (cambia, ADR-040 §5) |
| Instalación | Lugar donde se presta el servicio, de una cuenta | Negocios (N a lo largo del tiempo), puestos, contactos con rol | Núcleo (existe) |
| Negocio | Oportunidad de venta de una cuenta, que avanza por las etapas del embudo | 1 cuenta; 1..N instalaciones (nueva, ampliación, renovación, reemplazo); contactos con rol; cotizaciones (CPQ) | Comercial |
| Embudo y etapas | Secuencia de etapas configurable por la empresa, con una ganada y una perdida | Negocios | Comercial |
| Actividad | Nota, llamada, correo, WhatsApp, reunión con acuerdos, visita o tarea con vencimiento | Vinculable a la vez a negocio, cuenta, contacto e instalación | Núcleo (nuevo) |
| Etiqueta | Clasificación de la empresa (Rubro, Segmento, Tamaño o libres) | Cuentas, instalaciones, negocios, contactos y documentos | Núcleo (nuevo) |
| Documento | Archivo o documento generado | Negocio y demás entidades | Núcleo (existe) |

Relación central: **cuenta 1—N negocios**; **negocio N—N instalaciones** (siempre de la misma cuenta); **contacto N—N cuentas**; **negocio 1—N cotizaciones**, de las cuales una es la vigente.

## 3. Pantallas y pestañas

Áreas según `NAVEGACION.md`: **Comercial** (Solicitudes, Negocios, Cotizaciones) y **Clientes** (Cuentas, Contactos, Instalaciones).

| Pantalla | Ruta | Portal | Patrón | Menú o pestaña |
|---|---|---|---|---|
| Bandeja de solicitudes | `/solicitudes` | ERP | Lista con vista dividida en iPad y escritorio | Comercial → Solicitudes |
| Detalle de solicitud | `/solicitudes/[id]` | ERP | Detalle (texto original, datos detectados, acciones Derivar, Convertir, Descartar) | Desde la bandeja |
| Negocios — embudo | `/negocios` (vista Embudo) | ERP | Tablero por etapas, arrastrar entre columnas | Comercial → Negocios |
| Negocios — lista | `/negocios?vista=lista` | ERP | Lista con filtros (etapa, responsable, etiqueta, cierre, origen) | Misma entrada, selector de vista |
| Nuevo negocio | Hoja sobre la lista o el embudo | ERP | Formulario | Acción «Nuevo negocio» |
| Ficha del negocio | `/negocios/[id]` | ERP | Ficha (ADR-041) | — |
| Ficha de la cuenta | `/cuentas/[id]` | ERP | Ficha | Clientes → Cuentas |
| Ficha del contacto (nueva) | `/contactos/[id]` | ERP | Ficha | Clientes → Contactos |
| Lista de contactos (nueva) | `/contactos` | ERP | Lista | Clientes → Contactos |
| Ficha de la instalación | `/instalaciones/[id]` | ERP | Ficha | Clientes → Instalaciones |
| Reportes comerciales | `/negocios/reportes` | ERP | Tablero | Acción secundaria en Negocios |
| Embudo, tipos de negocio, orígenes, etiquetas | Configuración → Comercial y Configuración → Etiquetas | ERP | Catálogos declarativos (editor de lista ordenable) | Dentro de Configuración |
| Importación desde 1.0 | Configuración → Comercial → Importar desde OPAI 1.0 | ERP | Asistente con simulación y reporte | Solo owner y admin |

**Pestañas de fichas (orden fijo de ADR-041; las de módulos solo si el módulo está activo y el usuario puede leer):**

- **Negocio:** Resumen (cuenta, etapa, monto mensual, cierre estimado, instalaciones con su tipo, contactos con rol, cotización vigente, próxima tarea, última interacción) → Cotizaciones (CPQ) → Documentos → Actividad.
- **Cuenta:** Resumen → Contactos (con cargo y roles en esta cuenta) → Instalaciones → Negocios → Documentos → Actividad.
- **Contacto:** Resumen → Cuentas (vínculos con cargo y roles) → Negocios → Documentos → Actividad.
- **Instalación:** Resumen → Puestos → Contactos (roles de instalación) → Negocios → Documentos → Actividad.

Las notas no son pestaña: se escriben en el compositor sobre Actividad (nota, llamada, reunión, tarea). Las etiquetas van como chips bajo el título, editables en línea.

**Celular frente a iPad y escritorio:**
- En el celular: bandeja de solicitudes, derivar, convertir y descartar; mover un negocio de etapa; registrar llamada, nota o tarea; ver fichas.
- En iPad y escritorio: el embudo con arrastre, la importación, la configuración del embudo y los reportes.

El embudo en el celular se muestra como lista agrupada por etapa con un selector de etapa. Barra inferior para quien tiene «Comercial» como área principal (`NAVEGACION.md` §3): Inicio · Negocios · Cuentas · Buscar · Más.

## 4. Campos y validaciones

**Solicitud**

Ningún campo de esta sección es visible para el cliente ni para el trabajador en la v1 (el Portal Cliente, fase 3, mostrará solo cuenta, instalaciones y documentos propios).

| Campo | Tipo | Oblig. | Validación | Quién lo edita |
|---|---|---|---|---|
| Canal | Catálogo (`web`, `correo`, `whatsapp`, `telefono`, `agente`, `otro`) | Sí | — | Sistema o quien la crea |
| Nombre, empresa, RUT, correo, teléfono, dirección, servicio pedido | Texto (lo que llegó) | Al menos correo o teléfono | RUT y teléfono se validan y normalizan si vienen; si no son válidos se guardan tal cual con aviso | Sistema; Comercial puede corregir los datos detectados |
| Texto original | Texto externo | Sí | Se muestra como contenido de terceros (ADR-034) | Nadie |
| UTM y página de origen | Texto | No | — | Sistema |
| Responsable | Usuario | Sí al derivar | Debe tener permiso comercial | Comercial |
| Estado | `nueva`, `en_revision`, `convertida`, `descartada` | Sí | Ver §6 | Sistema por acciones |
| Motivo de descarte | Catálogo (`spam`, `duplicada`, `fuera_de_zona`, `servicio_no_ofrecido`, `sin_datos`, `otro` + detalle) | Al descartar | Detalle obligatorio en `otro` | Comercial |

**Negocio**

| Campo | Tipo | Oblig. | Validación | Quién lo edita |
|---|---|---|---|---|
| Título | Texto | Sí | 3–120 caracteres; por defecto «Cuenta · servicio» | Comercial |
| Cuenta | Cuenta | Sí | No cambia una vez que tiene instalaciones o cotizaciones (R6) | Comercial |
| Etapa | Etapa del embudo | Sí | Requisitos de entrada de la etapa (R9) | Comercial |
| Responsable | Usuario | Sí | Por defecto quien lo crea | Comercial |
| Tipo de negocio | Catálogo del tenant (p. ej. nuevo cliente, ampliación, renovación, licitación privada) | Sí | Activo en el catálogo | Comercial |
| Origen | Catálogo del tenant (web, referido, cliente actual, prospección, licitación…) | Sí | Activo en el catálogo | Comercial |
| Monto estimado mensual | CLP entero | Según la etapa | > 0; solo editable mientras no hay cotización vigente (R12) | Comercial |
| Valor mensual | CLP entero | — | Lo escribe CPQ desde la cotización vigente; solo lectura | CPQ |
| Probabilidad | 0–100 % | Sí | Por defecto la de la etapa; editable | Comercial |
| Cierre estimado | Fecha | Según la etapa | No en el pasado al fijarla | Comercial |
| Inicio de servicio estimado | Fecha | Según la etapa | ≥ hoy | Comercial |
| Instalaciones | 1..N con tipo | Al menos una para pasar de la primera etapa (R10) | Todas de la cuenta del negocio | Comercial |
| Contactos | N con rol (`decisor`, `tecnico`, `compras`, `usuario`) y un principal | Uno para enviar cotización | Vinculados a la cuenta (R16) | Comercial |
| Motivo de pérdida | Catálogo cerrado: `precio`, `cobertura`, `plazo`, `sin_respuesta`, `competencia`, `no_califica`, `otro` | Al perder | Detalle obligatorio en `otro`; competidor opcional | Comercial |

**Contacto (persona) y vínculo con la cuenta**

| Campo | Tipo | Oblig. | Validación |
|---|---|---|---|
| Nombres, apellidos | Texto | Nombres sí | — |
| Correo | Correo | No | Minúsculas, sin espacios; **único en la empresa** (R14) |
| Teléfono | Teléfono | No | Normalizado a E.164 |
| Cargo en la cuenta | Texto | No | Por vínculo |
| Roles en la cuenta | Varios de `comercial`, `operacional`, `facturacion`, `cobranza`, `cesion` | No | Por vínculo |
| Principal de la cuenta | Sí/no | — | Uno por cuenta (R15) |

**Actividad**: tipo, título, detalle, fecha en que ocurrió (puede ser pasada), canal; para tareas también vencimiento (con opción «todo el día»), prioridad (`alta`, `media`, `baja`), responsables (al menos uno) y estado (`pendiente`, `hecha`, `cancelada`); para reuniones, asistentes y acuerdos.

## 5. Reglas de negocio

**Solicitudes**
- **R1.** Toda solicitud entra a la bandeja en estado `nueva`, nunca directo como cuenta. Su texto original se guarda tal cual y se muestra marcado como contenido externo.
- **R2.** Toda solicitud tiene un plazo de primera respuesta (SLA, ajuste del tenant). La primera respuesta es una actividad de contacto registrada desde la solicitud o desde el negocio que nació de ella. Al vencer el plazo, se avisa al responsable y, si sigue sin respuesta al doble del plazo, al owner (si el tenant activó esos avisos).
- **R3.** Derivar asigna un responsable y pasa la solicitud a `en_revision`.
- **R4.** Convertir crea o reutiliza, en un solo paso:
  - la cuenta: si el RUT o el nombre canónico ya existen, se propone la existente;
  - el contacto: si el correo ya existe, se vincula la persona existente y no se duplica;
  - opcionalmente la instalación prospecto;
  - el negocio, en la primera etapa del embudo por defecto.
  La solicitud queda `convertida` y enlazada a la cuenta y al negocio.
- **R5.** Descartar exige motivo, no crea nada en los maestros y es reversible (volver a `en_revision`). Una solicitud duplicada se puede enlazar a la original.

**Negocios**
- **R6.** Todo negocio pertenece a una cuenta. La cuenta no se cambia una vez que el negocio tiene instalaciones o cotizaciones.
- **R7.** El negocio no copia datos de la instalación: los lee de ella.
- **R8.** El estado (`abierto`, `ganado`, `perdido`) se deriva del tipo de la etapa en que está; nadie lo edita a mano.
- **R9.** Cada etapa declara qué exige para entrar a ella:
  - monto;
  - fecha de cierre;
  - cotización enviada;
  - inicio del servicio;
  - motivo de pérdida.
  Mover un negocio a una etapa cuyos requisitos no se cumplen se rechaza con el detalle de lo que falta (persona o agente). Retroceder entre etapas abiertas siempre se permite. Desde la etapa perdida solo se sale reabriendo con motivo, y desde la ganada no se sale (R20). Perder un negocio es siempre la acción «Perder» con motivo; mover a la etapa perdida por arrastre abre esa misma acción.
- **R10.** Para salir de la primera etapa el negocio debe tener al menos una instalación vinculada.
- **R11.** Cada cambio de etapa queda en el historial con quién, cuándo y cuántos días estuvo en la etapa anterior.
- **R12.** El monto del negocio es el valor mensual de la cotización vigente, que escribe CPQ. Mientras no haya cotización vigente se usa el monto estimado manual, que deja de ser editable cuando aparece una vigente.
- **R13.** El «próximo paso» es la tarea abierta más próxima del negocio y el «último contacto» la interacción más reciente; ambos se calculan, nadie los escribe.

**Contactos**
- **R14.** Un correo identifica a una sola persona en la empresa. Crear un contacto con un correo existente vincula a esa persona a la cuenta en vez de duplicarla, y la vista previa lo avisa.
- **R15.** Cada cuenta tiene como máximo un contacto principal activo.
- **R16.** Solo pueden tener rol en una instalación o en un negocio las personas vinculadas a su cuenta.
- **R17.** No se desvincula a una persona de una cuenta mientras tenga roles en instalaciones de esa cuenta o esté en negocios abiertos de ella; los negocios cerrados conservan la referencia.

**Ganar y perder**
- **R18.** Al ganar:
  - las instalaciones vinculadas que estén en prospecto o inactivas se activan;
  - la cuenta pasa a `cliente_activo` si era prospecto;
  - CPQ acepta la cotización vigente, rechaza las demás abiertas y crea los puestos de servicio desde la cotización aceptada (ver `modulos/cpq.md`).
  - *Nota del 25-oct-2026, superada por la actualización de las 23:08–23:10 que sigue (reglas definidas por Carlos en la Page «Puestos y guardias OPAI 2.0: propuesta»; mockup pendiente de aprobación): ganar **no crea puestos**. CPQ solo acepta la vigente y rechaza las abiertas. Los puestos se crean desde la instalación o con un botón opcional, con vista previa, en la cotización aceptada (solo líneas de tipo puesto): un puesto por posición, en PPC, sin duplicar los ya creados. Ver ADR-040, punto 3, y `modulos/operaciones.md`.*
  - *Actualización (Decisión de Carlos, 25-oct-2026 23:08–23:10 (t263u–t265u), chat con OPAI 2.0 (registrada por el bot OPAI 2.0)): el disparador es **ganar el negocio**. Al ganarlo, cada línea de guardias de la cotización aceptada se **ofrece** para crear su puesto con el sueldo bruto cotizado y RRHH lo confirma; una cotización sin guardias no crea puestos. Ver `modulos/cpq.md`.*
- **R19.** Al perder:
  - se exige el motivo;
  - CPQ rechaza las cotizaciones abiertas;
  - si una instalación prospecto la creó este negocio, no tiene operación y ningún otro negocio abierto o ganado la usa, se **propone** archivarla y una persona confirma.
  Nunca se archiva sola.
- **R20.** Reabrir un negocio perdido es una transición con motivo y queda en el historial. Un negocio ganado no se reabre: si hay que corregirlo, se crea un negocio de reemplazo.
- **R21.** Una cuenta pasa a `cliente_inactivo` solo por acción de una persona. OPAI lo sugiere cuando su última instalación queda inactiva.

**Duplicados, fusión y transferencia**
- **R22.** OPAI sugiere duplicados al crear:
  - cuentas, por RUT o nombre canónico;
  - contactos, por correo, o por teléfono y nombre si no hay correo;
  - instalaciones de una cuenta, por el mismo lugar de Google (`place_id`) o a menos de 50 m.
  Las sugerencias avisan, no bloquean (salvo el correo duplicado, que vincula).
- **R23.** Fusionar dos cuentas o dos contactos mueve todo a la ganadora: vínculos, instalaciones, documentos, etiquetas y actividades. La perdedora queda archivada y la fusión registrada. Es irreversible: un agente necesita aprobación humana.
- **R24.** Transferir una instalación a otra cuenta, por cambio de razón social o de mandante, conserva la instalación, sus puestos y sus documentos. Exige motivo. Los negocios anteriores se quedan en la cuenta original. Un agente necesita aprobación humana.

**Etiquetas, embudo y convivencia con 1.0**
- **R25.** Las etiquetas son de la empresa. Pueden estar en grupos exclusivos (Rubro, Segmento, Tamaño: una por entidad) o libres. Se usan como filtro en todas las listas y en la búsqueda. El color es un tono del sistema de diseño.
- **R26.** Cada empresa configura su embudo. La única regla fija es exactamente una etapa ganada y una perdida. Una etapa con negocios no se elimina: se archiva después de mover sus negocios. Una etapa tampoco cambia de tipo.
- **R27.** Desde el corte de Comercial, **cuentas, contactos e instalaciones se editan solo en 2.0**. OPAI copia a 1.0 los cambios (altas, ediciones, vínculos, activaciones por negocio ganado) en un solo sentido, sin tocar el código de 1.0. Un control diario compara ambos y reporta diferencias.
- **R28.** La importación desde 1.0 se puede ejecutar en simulación antes de hacerla. Deduplica cuentas por RUT y une los contactos con el mismo correo en una sola persona. Las cuentas duplicadas por nombre se proponen para fusión, nunca se fusionan solas. Nunca crea una instalación a partir del texto de un negocio. Todo lo que no puede resolver va a un reporte.
- **R29.** **Cadencia de seguimiento configurable por paso.** Cada empresa define su cadencia de seguimiento de negocios como una secuencia de pasos; en cada paso elige quién lo ejecuta: una **persona**, **OPAI automático** o un **agente de IA**. Es parte del módulo Comercial, no del backlog (fuente: chat de Carlos con el bot Paridad, 24-oct-2026 12:37, confirmado por Carlos el 26-oct-2026 9:20 CLT; cadencia de 1.0 en `extraccion/comercial-y-cpq.md` §3.6, que es la referencia de partida).
  *Nota del 29-oct-2026 (CAR-67): la especificación de esta regla está en [`modulos/seguimiento-comercial.md`](seguimiento-comercial.md) (planes por tenant, respuesta del cliente, cierre, salida del envío, negocios detenidos, vista de pendientes y herramientas MCP), con las 18 preguntas decididas por Carlos el 29-oct-2026 (entre ellas, no se porta el cierre automático bajo un monto). El código vivo de 1.0 (`40d19a5`) usa días hábiles 3, 7, 14 y 15, no 3/7/3.*

## 6. Estados y transiciones

**Solicitud**

| Desde | Hacia | Quién | Condición | Efecto | ¿Reversible? |
|---|---|---|---|---|---|
| nueva | en_revision | Comercial o agente | Responsable asignado | Avisa al responsable (si está activo) | Sí |
| nueva / en_revision | convertida | Comercial o agente | Datos mínimos para cuenta y negocio | Crea o vincula cuenta, contacto y negocio (R4) | No (el negocio se gestiona aparte) |
| nueva / en_revision | descartada | Comercial o agente | Motivo | Ninguno en maestros | Sí, vuelve a en_revision |

**Negocio**

| Desde | Hacia | Quién | Condición | Efecto | ¿Reversible? |
|---|---|---|---|---|---|
| (crear) | Primera etapa abierta | Comercial, agente, conversión | Cuenta | — | — |
| Abierta | Otra abierta | Comercial o agente | Requisitos de la etapa (R9, R10) | Historial (R11) | Sí |
| Abierta | Ganada | Comercial; agente con aprobación humana | Requisitos de la etapa (Gard: inicio de servicio y cotización enviada) | R18 | No (R20) |
| Abierta | Perdida | Comercial o agente | Motivo de pérdida | R19 | Sí, reabriendo |
| Perdida | Abierta | Comercial o agente | Motivo de reapertura | Historial | Sí |
| Cualquiera | Archivado | owner o admin | Sin cotizaciones abiertas | Desaparece de listas por defecto | Sí |

## 7. Permisos por rol y portal

| Acción | owner | admin | gerente | supervisor | viewer | Portal Cliente | Portal Trabajador | Agente |
|---|---|---|---|---|---|---|---|---|
| Ver solicitudes y negocios | ✓ | ✓ | ✓ | — | ✓ | — | — | scope `comercial` |
| Crear, derivar, convertir, descartar solicitudes | ✓ | ✓ | ✓ | — | — | — | — | ✓ con vista previa |
| Crear y editar negocios; mover de etapa | ✓ | ✓ | ✓ | — | — | — | — | ✓ con vista previa |
| Ganar un negocio | ✓ | ✓ | ✓ | — | — | — | — | Aprobación humana |
| Reabrir | ✓ | ✓ | ✓ | — | — | — | — | ✓ con vista previa |
| Archivar negocio | ✓ | ✓ | ✓ | — | — | — | — | ✓ con vista previa |
| Crear y editar cuentas, contactos e instalaciones | ✓ | ✓ | ✓ | lectura de lo suyo (alcance) | lectura | lectura de su cuenta (fase 3) | — | ✓ con vista previa |
| Fusionar cuentas o contactos; transferir instalación | ✓ | ✓ | ✓ (ver §14, pregunta 11) | — | — | — | — | Aprobación humana |
| Configurar embudo, catálogos y etiquetas | ✓ | ✓ | — | — | — | — | — | — |
| Importar desde 1.0 | ✓ | ✓ | — | — | — | — | — | — |
| Reportes comerciales | ✓ | ✓ | ✓ | — | ✓ | — | — | ✓ lectura |

Alcance de filas en la v1: quien tiene Comercial ve **todos** los negocios de la empresa. «Solo mis negocios» queda como pregunta abierta (§14). Ver montos de negocios no está sujeto al bloqueo financiero de ADR-016: es información comercial, no contable.

Nota para el brief: hoy `packages/domain/src/permisos.ts` niega al supervisor `crm:*` y `cpq:*`; el módulo se llamará `comercial`, así que el brief alinea esa denegación (`comercial:*`) y sus tests (`permisos.test.ts` usa `crm:read`).

## 8. Eventos y notificaciones

Silencio por defecto (ADR-020): ninguno se envía hasta que el tenant lo activa en Configuración → Comunicaciones. Los marcados «recomendado» son la propuesta para Gard: no se activan solos; Carlos o el tenant los activa en Configuración → Comunicaciones.

| Evento | Cuándo ocurre | Quién se entera (recomendado) | Canal | Plantilla |
|---|---|---|---|---|
| `comercial.solicitud.recibida` | Entra una solicitud | Responsable por defecto (recomendado) | In-app, correo | Sí |
| `comercial.solicitud.sla_vencido` | Vence el plazo sin primera respuesta | Responsable; owner al doble del plazo (recomendado) | In-app, push | Sí |
| `comercial.solicitud.convertida` / `descartada` | Al convertir o descartar | — | — | — |
| `comercial.negocio.creado` | Nuevo negocio | — | — | — |
| `comercial.negocio.etapa_cambiada` | Cambio de etapa | Responsable si lo movió otro | In-app | Sí |
| `comercial.negocio.ganado` | Pasa a ganada | Owner y responsable (recomendado) | In-app, correo | Sí |
| `comercial.negocio.perdido` | Pasa a perdida | — | — | — |
| `core.actividad.tarea_asignada` | Te asignan una tarea | El asignado (recomendado) | In-app, push | Sí |
| `core.actividad.tarea_vencida` | Vence una tarea abierta | El responsable | In-app | Sí |
| `core.cuenta.fusionada` / `core.contacto.fusionado` / `core.instalacion.transferida` | Al fusionar o transferir | Owner | In-app | Sí |
| `comercial.sincronizacion.diferencias` | La conciliación diaria con 1.0 encuentra diferencias | Owner (recomendado mientras dure la convivencia) | Correo | Sí |

## 9. Herramientas MCP

| Herramienta | Qué hace | Efecto | Vista previa | Aprobación humana |
|---|---|---|---|---|
| `comercial_solicitudes_list` / `get` | Ver la bandeja y una solicitud (texto marcado externo) | Lectura | — | — |
| `comercial_solicitudes_create` | Registrar una solicitud que llegó por otro canal | Escritura | ✓ | — |
| `comercial_solicitudes_derivar` / `descartar` / `reabrir` | Asignar responsable, descartar con motivo (uno o varios a la vez) o devolver a revisión | Escritura | ✓ | — |
| `comercial_solicitudes_enlazar_duplicada` | Marcar una solicitud como duplicada de otra | Escritura | ✓ | — |
| `comercial_solicitudes_convertir` | Crear cuenta, contacto y negocio desde la solicitud | Escritura | ✓ (muestra qué reutiliza y qué crea) | — |
| `comercial_negocios_list` / `get` / `embudo` | Lista con filtros, ficha y resumen del embudo | Lectura | — | — |
| `comercial_negocios_create` / `update` | Crear y editar un negocio | Escritura | ✓ | — |
| `comercial_negocios_mover` | Cambiar entre etapas abiertas o a la ganada (valida requisitos) | Escritura | ✓ | Solo hacia ganada |
| `comercial_negocios_perder` / `reabrir` / `archivar` | Perder con motivo; reabrir con motivo; archivar | Escritura | ✓ | — |
| `comercial_negocios_vincular_instalacion` / `desvincular_instalacion` | Instalaciones del negocio con su tipo | Escritura | ✓ | — |
| `comercial_negocios_set_contactos` | Contactos del negocio con rol | Escritura | ✓ | — |
| `core_instalaciones_archivar` | Confirmar el archivo propuesto de una instalación prospecto (R19) | Escritura | ✓ | — |
| `core_cuentas_set_estado` | Pasar una cuenta a cliente inactivo (R21) | Escritura | ✓ | — |
| `core_config_*` (catálogos declarativos) | Leer y editar el embudo, tipos de negocio y orígenes | Escritura | ✓ | — |
| `comercial_reportes_*` | Embudo, pérdidas por motivo, ventas por mes y origen | Lectura | — | — |
| `core_contactos_*` (incl. `vincular`, `desvincular`, `set_roles`, `fusionar`; verbos `create`/`update` como el resto del núcleo) | Personas y sus vínculos con cuentas | Escritura | ✓ | Fusionar sí |
| `core_cuentas_fusionar`, `core_instalaciones_transferir` | Fusión y transferencia | Irreversible | ✓ | Sí |
| `core_actividades_*` | Registrar notas, llamadas, reuniones y tareas; completar tareas | Escritura | ✓ | — |
| `core_etiquetas_*` | Crear, asignar y quitar etiquetas (en lote) | Escritura | ✓ | — |
| `core_buscar` | Buscar en todas las entidades con filtro de etiquetas | Lectura | — | — |

**Flujo típico del agente:**
1. Leer la bandeja.
2. Por cada solicitud nueva, resumirla y sugerir si se convierte o se descarta.
3. Previsualizar la conversión y ejecutarla.
4. Registrar la primera respuesta como actividad.
5. Crear la tarea de seguimiento.

La importación desde 1.0 no tiene herramienta MCP: es una operación única de owner o admin con credenciales de 1.0, y se declara en `paridad-excepciones.ts` como `soloPersonas` con ese motivo.

El agente se detiene antes de ganar, fusionar o transferir. Se documenta en `docs/2.0/agentes/operar-comercial.md`, con su escenario de prueba.

## 10. Integraciones

- **Formulario web y correo de entrada.** Un endpoint por tenant con clave propia recibe solicitudes del sitio web (gard.cl u otro), y una dirección de correo de entrada las crea desde mensajes. Modalidad: propia del tenant, con el dominio y la clave configurados en Integraciones.
- **WhatsApp.** En la v1 se registra como actividad o se convierte en solicitud por un agente; no hay lectura automática de WhatsApp.
- **Geolocalización.** Para direcciones de instalaciones prospecto, por el servicio del núcleo (ADR-027): con la clave propia del tenant (hoy Gard usa la suya; no hay clave de plataforma por diseño). Se mide en consumos.
- **OPAI 1.0.** La importación inicial y la sincronización 2.0 → 1.0 usan la API existente de 1.0, con una key dedicada que pone Carlos. La conciliación es diaria y de solo lectura.
- **Correo saliente.** Avisos y plantillas por el adaptador de correo del tenant (Resend por defecto).

## 11. Mejoras respecto de 1.0 y lo que no se porta

| En 1.0 | En 2.0 | Por qué |
|---|---|---|
| El negocio copia nombre y dirección de la instalación como texto (P1) | Negocio vinculado a 1..N instalaciones reales, con tipo | Una sola verdad; «¿qué negocios tuvo esta instalación?» |
| Negocio ↔ cotización por tres caminos (P2, P3) | Un solo vínculo; una cotización vigente por negocio | Sin contradicciones |
| Rol del contacto en el negocio en texto libre (P6) | Roles de catálogo en cuenta, instalación y negocio | Reportes y agentes confiables |
| Un contacto por cuenta; la misma persona duplicada (§3.3) | Persona única con vínculos a N cuentas | Sin duplicados; roles por cuenta |
| Destinatarios en cinco banderas y punteros de la cuenta (P7) | Roles del vínculo contacto–cuenta | Una regla |
| Rubro, tamaño y segmento en texto libre (P8) | Etiquetas por empresa con grupos | Filtros consistentes |
| Historial en nueve tablas; «próximo paso» copiado a mano (P9) | Actividad unificada; próximo paso y último contacto derivados | Una línea de tiempo |
| Cuentas duplicadas por RUT (P10) | RUT único y sugerencias de duplicado | Datos limpios |
| Tareas con siete vínculos sueltos (P11) | Actividad vinculable a varias entidades con integridad garantizada | Nada huérfano |
| Bandera `negotiationIncomplete` | Requisitos de entrada por etapa | Reglas explícitas y configurables |
| Licitación, Slack y agente mezclados en el negocio (P18) | Facetas de sus módulos | Módulos independientes |
| Leads convertidos en una pantalla aparte | Bandeja con SLA, derivación y conversión en un paso | Respuesta a tiempo |
| ~1.000 notificaciones al día | Silencio por defecto | Menos ruido |

**No se porta:**
- datos de instalación copiados en el negocio;
- la tabla puente negocio–cotización y `activeQuotationId`;
- campos personalizados (backlog);
- `CrmIndustry` global;
- Slack por negocio;
- enlaces de PandaDoc y Drive en el negocio;
- `grokAgentId` como dueño del negocio;
- reseñas (backlog);
- ~~la cadencia automática de seguimiento (backlog)~~ *(26-oct: ya no es backlog; va en Comercial, configurable por paso, R29)*.

## 12. Casos borde

- Llega una solicitud con el correo de un contacto existente de otra cuenta: al convertirla, OPAI vincula a la misma persona a la cuenta nueva (o a la existente) y lo informa.
- La solicitud trae un RUT de una cuenta existente con otro nombre: se propone la cuenta existente y se puede crear igual con motivo (no bloquea).
- Un negocio tiene dos instalaciones y una ya está activa por otro negocio (ampliación): al ganar, solo se activa la que estaba en prospecto.
- Se intenta quitar una instalación de un negocio cuando una línea de la cotización la usa: se rechaza y se indica la cotización.
- Una persona sale de una empresa cliente: se archiva su vínculo con esa cuenta. Si tiene roles en instalaciones o negocios abiertos, primero hay que reasignarlos (R17).
- Una etapa con negocios se quiere eliminar: se ofrece mover los negocios a otra etapa y archivarla.
- Dos personas mueven el mismo negocio a la vez: gana la primera y la segunda recibe el cambio con aviso, sin pisar datos.
- Un agente intenta ganar un negocio: queda en la cola de aprobaciones con la vista previa del efecto.
- Alguien edita una cuenta en 1.0 después del corte: la conciliación diaria detecta y reporta la diferencia; el cambio en 1.0 se sobrescribe cuando ese registro vuelve a sincronizarse desde 2.0.
- La importación encuentra un negocio de 1.0 sin instalación identificable: se importa sin instalación (queda en la primera etapa) y va al reporte.
- Un contacto sin correo aparece dos veces: OPAI sugiere fusionar por teléfono y nombre, sin fusionar solo.
- Una solicitud es spam masivo: se descarta en lote con motivo `spam`.

## 13. Criterios de aceptación

- **CA1.** Una solicitud del formulario web de Gard aparece en la bandeja en segundos, con su texto original y los datos detectados; un usuario la convierte en cuenta, contacto y negocio en un solo paso, sin duplicar una cuenta o persona existente.
- **CA2.** El plazo de primera respuesta se ve en la bandeja; al vencer, el responsable recibe el aviso solo si el tenant lo activó.
- **CA3.** El embudo muestra los negocios por etapa. Arrastrar un negocio a una etapa con requisitos pendientes muestra qué falta y no lo mueve.
- **CA4.** Un negocio con dos instalaciones (una nueva y una ampliación) se gana. La instalación nueva queda activa, la cuenta pasa a cliente activo y el historial muestra el cambio de etapa con su duración.
- **CA5.** Al perder un negocio que creó una instalación prospecto sin uso, OPAI propone archivarla. No la archiva hasta que una persona confirma.
- **CA6.** La misma persona puede ser contacto de dos cuentas con roles distintos. Su ficha muestra ambas cuentas, y crear otro contacto con su correo la vincula en vez de duplicarla.
- **CA7.** La pestaña Actividad del negocio muestra notas, llamadas, tareas y cambios de etapa en una sola línea de tiempo. El resumen muestra la próxima tarea y la última interacción.
- **CA8.** Las etiquetas de Rubro se asignan como chips y filtran listas y búsqueda. No se pueden asignar dos rubros a la misma cuenta.
- **CA9.** Un agente con scope `comercial` hace por MCP todo lo de CA1, CA3, CA6 y CA7 con vista previa. Ganar, fusionar y transferir quedan en la cola de aprobaciones.
- **CA10.** La importación desde 1.0 en simulación entrega un reporte con cuentas, contactos unificados, instalaciones, negocios, historial de etapas y actividades, más la lista de lo que no pudo resolver. La importación real deja los mismos números.
- **CA11.** Después de la importación, un cambio en una cuenta de 2.0 aparece en 1.0. La conciliación diaria no reporta diferencias durante dos semanas.
- **CA12.** La navegación entre Negocios, Cuentas y Contactos cumple las metas de ADR-045 (respuesta visible < 100 ms; datos < 1 s en 4G). El embudo y las fichas se ven bien a 375, 1024 y 1280 px.
- **CA13.** Perder un negocio exige un motivo del catálogo (y detalle en «otro»). Reabrirlo exige motivo y deja ambos cambios en el historial.
- **CA14.** Una persona con permiso fusiona dos cuentas duplicadas y transfiere una instalación a otra cuenta. Todo lo vinculado queda en la ganadora o en la cuenta nueva, y la auditoría registra quién, cuándo y por qué.
- **CA15.** La configuración del embudo no permite guardar un embudo sin exactamente una etapa ganada y una perdida, ni eliminar una etapa con negocios.

## 14. Preguntas abiertas

**Cerradas.** Resueltas con la opción recomendada por la aprobación de Carlos del 26-oct-2026 15:12 CLT («Sí, aprueba las dos hojas con las recomendaciones y lanza», transmitido por el Chief of Staff). Donde `comercial.md` chocaba con la Page «Comercial OPAI 2.0: decisiones» del 25-oct-2026, **manda la Page** (`alcance-crm.md`, «Decide Carlos» punto 3): **el SLA de primera respuesta queda fuera** de este alcance y de Comercial (se define con Solicitudes, PR 2); **la etapa ganada es «Adjudicado»** («ganado = adjudicado»); **el acuse automático al solicitante es configurable** (apagado por defecto, ADR-020); y **los campos personalizados quedan en el backlog** (PR 3). Las demás recomendaciones de abajo quedan adoptadas.

1. **¿Quién recibe las solicitudes nuevas?**
   - (a) un responsable por defecto que deriva;
   - (b) reparto rotativo entre los vendedores;
   - (c) sin responsable hasta que alguien la toma.

   Recomendación: **(a)**, configurable; el reparto rotativo, al backlog.
2. **¿Cuál es el plazo de primera respuesta (SLA) de Gard?** **Decidido (Page del 25-oct): el SLA queda fuera** de Comercial y de este alcance; se define con Solicitudes en el PR 2. La recomendación original era 2 horas hábiles con aviso al owner a las 4 horas; queda registrada para ese PR, no se implementa aquí.
3. **¿Se activa el acuse automático al solicitante** («recibimos tu solicitud»)? **Decidido (Page del 25-oct): acuse configurable**, apagado por defecto (ADR-020); el tenant lo activa en Configuración → Comunicaciones cuando la plantilla esté aprobada.
4. **¿Se importan las etapas de 1.0 tal cual y se ajustan después en Configuración?** Recomendación: **sí**. «Aceptada» queda como etapa abierta que exige inicio de servicio; las etapas de negociación exigen monto y fecha de cierre.
5. **¿Cada vendedor ve todos los negocios** o solo los suyos? Recomendación: **todos** en la v1 (equipo chico); «solo los míos» como alcance opcional del rol en el backlog.
6. **¿Cuánto historial se importa de 1.0?**
   - (a) todo;
   - (b) negocios abiertos más los cerrados de los últimos 24 meses, con sus actividades;
   - (c) solo abiertos.

   Recomendación: **(b)**.
7. **¿Ganar un negocio exige una cotización enviada en la etapa ganada de Gard?** Recomendación: **sí**, además del inicio de servicio; los negocios sin cotización se cierran desde una cotización rápida.
8. **¿Durante la convivencia, al ganar un negocio en 2.0 se crean también sus puestos en 1.0?** Verificado en 1.0 (`09ab4fe`, `extraccion/comercial-y-cpq.md` §8): ganar un negocio **no** crea puestos. Hoy los crea una persona con «Enviar dotación a la instalación» desde la cotización, o a mano en Operaciones con `createOpsPuestos`, que también es la herramienta MCP `create_ops_puesto`.
   - **Recomendación: sí, automático.** Al ganar, el sincronizador 2.0 → 1.0 crea en 1.0 los puestos de la cotización aceptada con `create_ops_puesto`, una vez por puesto (id externo guardado) y con reporte si 1.0 rechaza alguno.
   - **Razón:** Operaciones sigue en 1.0 hasta la fase 3, y sin esos puestos Gard no puede armar la pauta del servicio que acaba de ganar.
   - *Nota del 25-oct-2026, superada por la actualización de las 23:08–23:10 que sigue (reglas de Puestos definidas por Carlos): en 2.0 los puestos ya no se crean al ganar, sino desde la instalación o con el botón opcional de la cotización aceptada. La recomendación de arriba queda superada en su disparador («al ganar»). Falta que Carlos decida si la sincronización 2.0 → 1.0 replica en 1.0 los puestos cuando se crean en 2.0.*
   - *Actualización (Decisión de Carlos, 25-oct-2026 23:08–23:10 (t263u–t265u), chat con OPAI 2.0 (registrada por el bot OPAI 2.0)): el disparador vuelve a ser **ganar el negocio**, pero no automático: cada línea de guardias se ofrece para crear su puesto y RRHH lo confirma (`modulos/cpq.md`). La duda pendiente para Carlos queda así: si la sincronización 2.0 → 1.0 replica en 1.0 los puestos **confirmados por RRHH al ganar**.*
9. **¿Qué reportes trae la v1?**
   - conversión y días por etapa;
   - pérdidas por motivo y competidor;
   - ventas ganadas por mes, origen y responsable;
   - exportación a CSV.

   Recomendación: **esos tres más la exportación**.
10. **¿Los correos con clientes se registran solos?** Recomendación: **no en la v1**. OPAI no es cliente de correo (ADR-032): una persona o un agente registra el correo como actividad.

11. **¿El gerente puede fusionar cuentas o contactos y transferir instalaciones?** Ningún ADR lo restringe hoy (ADR-016 le da escritura comercial). Recomendación: **sí**, porque son tareas de mantenimiento comercial y quedan en la auditoría. Si prefieres reservarlas a owner y admin, se agrega la denegación al rol.

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
| 24-oct-2026 | Borrador inicial | — |
| 25-oct-2026 | R18 y pregunta 8: los puestos no se crean al ganar (decisión de Carlos sobre Puestos; CAR-10; superada a las 23:08–23:10, fila siguiente) | — (nota; reglas definidas por Carlos) |
| 25-oct-2026 23:10 | R18 y pregunta 8: al ganar se ofrecen los puestos de las líneas de guardias y RRHH los confirma (respuesta 3 de ADR-048; CAR-10) | — (nota; decisión de Carlos 23:08–23:10) |
| 26-oct-2026 | R29: cadencia de seguimiento configurable por paso, fuera del backlog (chat con Paridad del 24-oct-2026 12:37, confirmado el 26-oct-2026 9:20 CLT) | Carlos |
| 26-oct-2026 | §14 cerrada según la Page «Comercial OPAI 2.0: decisiones» del 25-oct (SLA fuera, ganado = adjudicado, acuse configurable, campos personalizados al backlog) y la aprobación de Carlos del 26-oct 15:12 CLT (Brief 07 · PR 1, CAR-20) | Carlos |
| 29-oct-2026 | R29: nota con el enlace a `seguimiento-comercial.md` (CAR-67) | — (borrador) |
