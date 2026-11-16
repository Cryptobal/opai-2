# Auditoría de estándares — OPAI 2.0 contra la vara

**Fecha:** 12-nov-2026 · **Base:** `main` en `e83d177` · **Última actualización:** 16-nov-2026, `main` en `886e262` (CAR-586) · **Vara:** [`REFERENTES-saas.md`](../REFERENTES-saas.md) (ADR-106) · **Autora:** Sesión Estándares (CAR-348)

Un archivo por capa o módulo. En cada uno: qué hace hoy (con rutas de código), qué hace el referente, la brecha, la gravedad y la recomendación (mantener, ajustar o rehacer).

## Estado al 16-nov-2026 (repaso semanal, CAR-586)

Primera actualización desde la auditoría inicial. Cada brecha se volvió a comprobar en el código de `main`; el detalle está en la sección «Estado al 16-nov-2026» de cada archivo.

**De las 10 brechas altas quedan 3 abiertas, y las tres con avance.** Seis se cerraron en el producto, una se retiró por decisión de Carlos y sigue sin haber ninguna crítica.

| Capa o módulo | Altas al 12-nov | Altas abiertas hoy | Medias abiertas hoy | Cambio de la semana |
|---|---|---|---|---|
| Permisos y roles | 3 | 0 | 3 | P-1, P-2 y P-3 cerradas |
| Núcleo | 2 | 1 (parcial) | 4 | N-1 cerrada; N-2 con contrato y prueba, faltan 137 listas antiguas |
| Comercial | 0 | 0 | 3 (una parcial) | C-3 cerrada; C-1 resuelta en el servidor |
| Finanzas | 1 | 0 | 3 (dos en PR) | F-1 retirada por decisión; F-4 y F-5 nuevas, F-5 cerrada |
| Personas | 1 | 0 | 1 (parcial) | H-1 y H-2 cerradas; H-4, H-5 y H-6 nuevas y cerradas |
| Operaciones | 1 | 0 | 1 | O-1 cerrada |
| Terreno | 0 | 0 | 2 | Sin cambios |
| Portales | 2 | 2 (una parcial, una en PR) | 1 | R-1 a un paso; R-2 en PR |

**Cumplimiento de la línea «Referente seguido y en qué se aparta».** De los 28 PR integrados entre el 15 y el 16 de noviembre, 26 la traen (varios con «no aplica» bien usado). Faltó en dos: #855, que es solo de pruebas, y #937 (panel único del agente), que sí cambia UX y quedó avisado en el PR. De los 33 PR abiertos en ese lapso faltó en dos: #959 (solo una prueba) y #940 (usabilidad), también avisado.

### Capas sin referente en la vara

Varios módulos nuevos citan referentes que [`REFERENTES-saas.md`](../REFERENTES-saas.md) no tiene, porque la vara se escribió antes de que existieran. Las sesiones eligieron bien, pero cada una por su cuenta:

| Módulo o tema | Referente que declaran los PR | PR de ejemplo |
|---|---|---|
| Control de acceso (portería) | Envoy, Proxyclick, Eptura | #840, #845, #917, #941 |
| Tickets (mesa de ayuda) | Zendesk | #821 |
| Flujo de caja (tesorería) | Float, Fathom, Pigment | #809, #866, #915 |
| Documentos comerciales (propuesta) | PandaDoc, HubSpot Quotes, Proposify | #916, #927, #946 |
| Central de monitoreo | Connecteam y Deputy para avisos con acuse | #958 |
| «Ver como» (soporte) | Stripe, Intercom | #910 |

Un referente se cambia o se agrega con una adenda al ADR-106, no en un PR de módulo. La propuesta de adenda quedó en [CAR-587](https://linear.app/carlos-irigoyen/issue/CAR-587) con la etiqueta «Decide Carlos».

## Alcance y límites de esta primera pasada

- Se revisó **modelo de datos, capacidades, permisos y rutas** leyendo el código. No se ejecutó la aplicación ni se recorrieron pantallas: el aspecto y la usabilidad los audita la Sesión Diseño (PR #584, `auditoria-diseno/`).
- Lo que no se pudo confirmar en el código queda marcado **«por verificar»** y no cuenta como brecha hasta confirmarlo.
- Un revisor independiente contrastó cada afirmación con el código antes de cerrar: confirmó 8 de las 10 brechas altas tal cual, precisó P-3 y corrigió la evidencia de N-2; dos puntos que estaban «por verificar» resultaron ya resueltos en el producto (vencimientos de documentos y tablero del día de asistencia) y se retiraron.
- No repite la [auditoría de salud del Núcleo](../auditoria-nucleo-2026-11-06.md) (seguridad, RLS, paridad). Aquí la pregunta es otra: ¿se parece a como lo resuelven los mejores?

## Gravedad

| Gravedad | Significa |
|---|---|
| Crítica | Riesgo de seguridad, de datos o de plata |
| Alta | Un cliente que viene de un SaaS serio lo nota, o bloquea vender el módulo |
| Media | Fricción o deuda; no bloquea |
| Baja | Pulido |

## Resultado de la auditoría inicial (12-nov-2026)

| Capa o módulo | Archivo | Críticas | Altas | Medias | Recomendación |
|---|---|---|---|---|---|
| Permisos y roles | [permisos.md](permisos.md) | 0 | 3 | 3 | Ajustar |
| Núcleo (multi-tenant, API, MCP, IA) | [nucleo.md](nucleo.md) | 0 | 2 | 4 | Ajustar |
| Comercial (CRM y CPQ) | [comercial.md](comercial.md) | 0 | 0 | 4 | Mantener |
| Finanzas | [finanzas.md](finanzas.md) | 0 | 1 | 2 | Mantener y completar |
| Personas | [personas.md](personas.md) | 0 | 1 | 2 | Ajustar |
| Operaciones | [operaciones.md](operaciones.md) | 0 | 1 | 1 | Ajustar |
| Terreno | [terreno.md](terreno.md) | 0 | 0 | 2 | Mantener |
| Portales | [portales.md](portales.md) | 0 | 2 | 1 | Completar |

**No se encontró ninguna brecha crítica y ningún módulo necesita rehacerse.** La base (aislamiento por empresa, capacidades únicas para pantalla, API y MCP, idempotencia, vista previa, cola de aprobaciones, auditoría encadenada) ya sigue a los referentes. Las brechas altas son piezas que faltan o reglas que conviene invertir, no un diseño equivocado.

## Brechas altas (10)

| # | Capa | Brecha | Issue | Estado al 16-nov |
|---|---|---|---|---|
| P-1 | Permisos | Los roles gerente y lector se definen por «todo menos…»: un permiso nuevo queda concedido sin que nadie lo decida | [CAR-350](https://linear.app/carlos-irigoyen/issue/CAR-350) | Cerrada |
| P-2 | Permisos | Un miembro tiene un solo rol y los grupos no reciben roles | [CAR-359](https://linear.app/carlos-irigoyen/issue/CAR-359) | Cerrada |
| P-3 | Permisos | Llaves de agente con alcance `*` y herencia completa por defecto | [CAR-351](https://linear.app/carlos-irigoyen/issue/CAR-351) | Cerrada en el producto; falta revocar la llave `*` de Gard |
| N-1 | Núcleo | No hay eventos salientes (webhooks) para la empresa | [CAR-352](https://linear.app/carlos-irigoyen/issue/CAR-352) | Cerrada |
| N-2 | Núcleo | Las listas no comparten un contrato: unas paginan, otras devuelven todo o cortan | [CAR-353](https://linear.app/carlos-irigoyen/issue/CAR-353) | Parcial: 137 listas antiguas por migrar |
| F-1 | Finanzas | No hay libro contable de partida doble ni candado de mes | [CAR-354](https://linear.app/carlos-irigoyen/issue/CAR-354) | Retirada: OPAI no lleva contabilidad (ADR-113, adenda del 14-nov) |
| H-1 | Personas | El ingreso y la salida de una persona no son un proceso con pasos | [CAR-355](https://linear.app/carlos-irigoyen/issue/CAR-355) | Cerrada |
| O-1 | Operaciones | La pauta no tiene «borrador» y «publicada», ni avisa al trabajador | [CAR-356](https://linear.app/carlos-irigoyen/issue/CAR-356) | Cerrada |
| R-1 | Portales | El trabajador no ve sus turnos, documentos ni puede pedir cambios | [CAR-357](https://linear.app/carlos-irigoyen/issue/CAR-357) | Parcial: faltan las solicitudes (#846, #851) |
| R-2 | Portales | El cliente solo ve cotizaciones; las secciones de su servicio están vacías | [CAR-358](https://linear.app/carlos-irigoyen/issue/CAR-358) | En PR (#827, #833, #838, #860, #863, #881) |

## Decisiones de producto o negocio para Carlos

No las decide esta sesión. Al 16-nov-2026:

**Pendientes**, de la más urgente a la menos urgente:

1. **Llave `*` de Gard (P-3).** Sigue pendiente revocarla y reemplazarla por llaves con permisos mínimos (ADR-034, ADR-051). Toca al tenant Gard: lo ejecuta quien Carlos indique. El producto ya no deja crear una llave así sin ser owner.
2. **Referentes de los módulos nuevos.** Sumar a la vara las capas que hoy no tiene (control de acceso, tickets, tesorería, documentos comerciales, central). Está en [CAR-587](https://linear.app/carlos-irigoyen/issue/CAR-587) con la etiqueta «Decide Carlos» y la recomendación de esta sesión; sin respuesta en 48 horas, se aplica.
3. **El acceso sigue al cargo (P-5).** ¿El rol de un usuario se deriva de su cargo en Personas, o se sigue asignando a mano?
4. **Empresa de prueba por cliente (N-5).** ¿Cada empresa tendrá un modo de prueba separado de sus datos reales?

**Ya decididas o resueltas esta semana:**

- **Contabilidad (F-1).** OPAI no lleva la contabilidad completa; entrega los datos al contador (ADR-113, adenda del 14-nov-2026).
- **Portal del trabajador (R-1).** Entraron primero los turnos y los documentos; las solicitudes de permisos y vacaciones están en PR.
- **Portal del cliente (R-2).** Carlos definió qué ve el cliente y en qué orden (CAR-514).
- **Publicar la pauta (O-1).** Construido: la pauta se publica y avisa a cada trabajador (CAR-356).
- **Eventos salientes (N-1).** Construidos por empresa (CAR-352).

## Cómo se mantiene

Una vez por semana se repasa lo integrado a `main` y se actualiza el archivo de cada capa: brechas cerradas (con el PR), brechas nuevas y «por verificar» resueltos.

En la revisión diaria de PR, las brechas altas y críticas van a Linear siempre. Las medias van a Linear cuando el PR ya está integrado (prioridad normal, proyecto del módulo, enlazadas a CAR-348); en un PR abierto quedan en el comentario (ADR-106, adenda del 13-nov-2026).
