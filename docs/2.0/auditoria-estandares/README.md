# Auditoría de estándares — OPAI 2.0 contra la vara

**Fecha:** 12-nov-2026 · **Base:** `main` en `e83d177` · **Vara:** [`REFERENTES-saas.md`](../REFERENTES-saas.md) (ADR-106) · **Autora:** Sesión Estándares (CAR-348)

Un archivo por capa o módulo. En cada uno: qué hace hoy (con rutas de código), qué hace el referente, la brecha, la gravedad y la recomendación (mantener, ajustar o rehacer).

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

## Resultado

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

| # | Capa | Brecha | Issue |
|---|---|---|---|
| P-1 | Permisos | Los roles gerente y lector se definen por «todo menos…»: un permiso nuevo queda concedido sin que nadie lo decida | [CAR-350](https://linear.app/carlos-irigoyen/issue/CAR-350) |
| P-2 | Permisos | Un miembro tiene un solo rol y los grupos no reciben roles | [CAR-359](https://linear.app/carlos-irigoyen/issue/CAR-359) |
| P-3 | Permisos | Llaves de agente con alcance `*` y herencia completa por defecto | [CAR-351](https://linear.app/carlos-irigoyen/issue/CAR-351) |
| N-1 | Núcleo | No hay eventos salientes (webhooks) para la empresa | [CAR-352](https://linear.app/carlos-irigoyen/issue/CAR-352) |
| N-2 | Núcleo | Las listas no comparten un contrato: unas paginan, otras devuelven todo o cortan | [CAR-353](https://linear.app/carlos-irigoyen/issue/CAR-353) |
| F-1 | Finanzas | No hay libro contable de partida doble ni candado de mes | [CAR-354](https://linear.app/carlos-irigoyen/issue/CAR-354) |
| H-1 | Personas | El ingreso y la salida de una persona no son un proceso con pasos | [CAR-355](https://linear.app/carlos-irigoyen/issue/CAR-355) |
| O-1 | Operaciones | La pauta no tiene «borrador» y «publicada», ni avisa al trabajador | [CAR-356](https://linear.app/carlos-irigoyen/issue/CAR-356) |
| R-1 | Portales | El trabajador no ve sus turnos, documentos ni puede pedir cambios | [CAR-357](https://linear.app/carlos-irigoyen/issue/CAR-357) |
| R-2 | Portales | El cliente solo ve cotizaciones; las secciones de su servicio están vacías | [CAR-358](https://linear.app/carlos-irigoyen/issue/CAR-358) |

## Decisiones de producto o negocio para Carlos

No las decide esta sesión. Están numeradas de la más urgente a la menos urgente.

1. **Llave `*` de Gard (P-3).** Sigue pendiente revocarla y reemplazarla por llaves con permisos mínimos (ADR-034, ADR-051). Toca al tenant Gard: lo ejecuta quien Carlos indique.
2. **Contabilidad (F-1).** ¿OPAI lleva la contabilidad completa (asientos, libros, cierre de mes) o entrega los datos ordenados al contador y a su sistema? Define el tamaño de «15 · Informes».
3. **Portal del trabajador (R-1).** ¿Qué entra primero: ver mis turnos, mis documentos y liquidaciones, o pedir permisos y cambios de turno?
4. **Portal del cliente (R-2).** ¿Qué ve el cliente además de cotizaciones: informes de rondas, novedades de su instalación, facturas, tickets?
5. **Publicar la pauta (O-1).** ¿La pauta debe pasar por «publicar» y avisar a cada guardia? El 5-nov quedaron fuera las oleadas por WhatsApp; esto es distinto (aviso del turno propio), pero conviene confirmarlo.
6. **El acceso sigue al cargo (P-5).** ¿El rol de un usuario se deriva de su cargo en Personas, o se sigue asignando a mano?
7. **Empresa de prueba por cliente (N-5).** ¿Cada empresa tendrá un modo de prueba separado de sus datos reales?
8. **Eventos salientes (N-1).** ¿Se ofrece a los clientes como función del producto o queda solo para integraciones propias?

## Cómo se mantiene

Una vez por semana se repasa lo integrado a `main` y se actualiza el archivo de cada capa: brechas cerradas (con el PR), brechas nuevas y «por verificar» resueltos.
