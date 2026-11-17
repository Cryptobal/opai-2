# Auditoría de cierre · 16 · Rendiciones

**Fecha:** 16-nov-2026 · **Sesión:** Auditoría de cierre (tanda 04, 05 y 16) · **Foto:** `main` en `886e262` · Solo lectura: no se cambió código, datos ni tickets.

**Avance real: 70 %** (Linear marca 100 %: sus 10 tickets están en Done).

Método: el mismo de [`asistencia.md`](asistencia.md#cómo-se-calculó-igual-en-los-tres-informes-de-esta-tanda) (alcance 70 %, estándares 15 %, pruebas 15 %). El alcance se mide contra la hoja aprobada `docs/2.0/diseño/alcance-rendiciones.md` y la extracción `docs/2.0/extraccion/rendiciones.md`.

Rendiciones: alcance 17 / 24 = 71 %; estándares 4 / 6 = 67 %; pruebas 70 %. Total: 0,7 × 71 + 0,15 × 67 + 0,15 × 70 = **70 %**.

## Lo más importante

1. **Quien tiene «ver todas» no tiene dónde verlas.** La única lista en pantalla es «Mis rendiciones» (`alcance: "propias"`, `datos.ts`). Finanzas o el gerente solo ven el total en el Reporte o lo que les toca aprobar; la lista de toda la empresa existe solo por MCP. En 1.0 era la pantalla principal, con búsqueda y filtros por persona y fecha.
2. **Nadie recibe avisos.** El módulo emite eventos (enviada, aprobada, rechazada, devuelta, pagada) pero no hay consumidor ni comunicable. El aprobador ve su pendiente en la bandeja única «Por aprobar» del núcleo; quien rinde no se entera de que le devolvieron o pagaron. 1.0 mandaba correo y campana.
3. **La nómina Santander solo funciona en la empresa de pruebas.** El ajuste se llama «Activar la nómina Santander (solo empresa de pruebas)». Para Gard, el lote se paga a mano.

## 1. Tickets contra PR

| Ticket | Estado Linear | PR | ¿En `main`? | ¿El código hace lo que pide? |
|---|---|---|---|---|
| CAR-175 · R1 módulo base, modelo, configuración y MCP | Done | #303, #310 | Sí | Sí |
| CAR-176 · R2 pantallas del solicitante (ERP y Portal Trabajador) | Done | #313 (solo el Design Prompt) | Sí | **No por sí mismo.** Las pantallas entraron con CAR-197 (#332) en ERP y portal **Supervisor**. El portal Trabajador no se hizo: la hoja de alcance (decisión del 4-nov) dejó rendir solo a usuarios del ERP. Done con PR que no implementa el título; el cambio está justificado pero el ticket no lo dice |
| CAR-194 · R2a kilometraje configurable | Done | #321 | Sí | Sí |
| CAR-197 · R2 pantallas de quien rinde (Supervisor y ERP) | Done | #332 | Sí | Sí |
| CAR-200 · R2c tramo fijo y pendientes | Done | #335, #340 | Sí | Sí |
| CAR-205 · R2d sin permiso, respaldo y QA | Done | #351 | Sí | Sí |
| CAR-208 · R3 bandeja, lotes y nómina Santander (solo test) | Done | #361, #403 | Sí | Sí, con la nómina limitada a la empresa de pruebas |
| CAR-178 · R4 lotes de pago y conexión con Finanzas | Done | #741 | Sí | **Parcial.** El ticket pedía un consumidor que creara el movimiento esperado en Bancos y la salida en el flujo. ADR-113 lo cambió por una fila calculada «Rendiciones por pagar» en el flujo. El movimiento esperado en Bancos y la conciliación del lote quedaron pendientes (`estado/rendiciones/CAR-178.md`) |
| CAR-179 · R5 reporte y configuración | Done | #757 | Sí | **Parcial.** Reporte por mes con Excel, sí. «Tope mensual consumido» se omitió como decisión nocturna por revisar; faltan filtros por persona e instalación |
| CAR-403 · Rendiciones en el buscador general | Done | #766 | Sí | Sí |

Otros: #241 (auditoría CAR-163) se cerró sin integrar; CAR-163 sigue In Progress sin proyecto. CAR-564 (patrón lista y ficha, incluye la bandeja) está en Backlog. #627 (CAR-368, fechas) integrado. Sin reversiones en el módulo.

## 2. Alcance contra 1.0 y la hoja aprobada

| # | Qué hace 1.0 o pide la hoja de alcance | En 2.0 | Detalle |
|---|---|---|---|
| 1 | Rendición de compra, sin respaldo solo con motivo | Está | |
| 2 | Kilometraje configurable (consumo, tarifa por km, tramo fijo) con ruta | Está | Distancia por el servicio del núcleo; línea recta como respaldo, informada |
| 3 | Aprobador asignado; quien rinde nunca aprueba ni paga lo suyo | Está | |
| 4 | Aprobar, rechazar y devolver | Está | Bandeja del aprobador |
| 5 | Aprobar o rechazar en lote | Falta | Existía en 1.0 (`bulk-approve`, `bulk-reject`) |
| 6 | Corregir y reenviar tras devolución | Está | `/[id]/corregir` |
| 7 | Anular | Está | |
| 8 | Lotes de pago con segunda aprobación y «Pagada» al confirmar | Está | |
| 9 | Nómina Santander | Parcial | Solo en la empresa de pruebas |
| 10 | Cuenta de destino segura en el lote y aviso sin datos bancarios | Está | Se lee al generar y falla si la ficha cambió (en vez de copiarla) |
| 11 | Centro de costo: instalaciones activas y oficina central | Está | Validado del mismo tenant |
| 12 | Código `REN-n` por empresa | Está | |
| 13 | Aviso de boleta duplicada | Está | Mejora sobre 1.0 |
| 14 | Reporte con filtros y Excel | Parcial | Sin filtro por persona ni instalación |
| 15 | Lista de todas las rendiciones con búsqueda y filtros | Falta | Solo MCP |
| 16 | «Mis rendiciones» con búsqueda y paginación | Parcial | Pestañas por estado; sin búsqueda; tope de 100 y los contadores salen de esa misma lista |
| 17 | Avisos a aprobador y a quien rinde | Parcial | Solo la bandeja «Por aprobar» del núcleo |
| 18 | Reversa de una rendición pagada (lote de reversa) | Falta | Default de la hoja de alcance §5; `domain/lotes.ts` lo deja «fuera de R3» |
| 19 | Rendiciones por pagar en el flujo de caja | Está | CAR-178 |
| 20 | Conciliación del pago con la cartola | Falta | Pendiente de CAR-178 |
| 21 | Configuración del módulo | Está | Desde el manifest |
| 22 | Rendir desde el portal Supervisor | Está | |
| 23 | Rendiciones en la ficha de la persona | Falta | 1.0 tenía `PersonaRendicionesTab` |
| 24 | Buscador general | Está | CAR-403 |

Fuera de la cuenta por decisión: asiento contable (Contabilidad, CAR-354 cancelado), rendir desde el portal Trabajador y lectura de boleta por IA (hoja de alcance §2 y §4.1), topes de 1.0 (§2), Slack.

## 3. Estándares

| Chequeo | Resultado | Evidencia |
|---|---|---|
| Lista y ficha (CAR-545) | Parcial | La cabecera de «Mis rendiciones» lleva tres botones secundarios de navegación (Bandeja, Lotes, Reporte) más «Nueva», repetido en teléfono; las acciones de la ficha van en el cuerpo. CAR-564 cubre solo la bandeja |
| Paginación y búsqueda reales | No | `rendiciones.rendiciones.listar`, `bandeja.listar` y `lotes.listar` siguen en `listas-pendientes.json`, con tope de 100 y sin búsqueda de texto |
| Sin duplicados (CAR-580) | Sí | |
| Sin textos internos (CAR-579) | Parcial | «(solo empresa de pruebas)» en un ajuste visible y «Lista de {nombre, montoClp}» como ayuda del ajuste de tramos (`ajustes.ts`) |
| Permisos por rol | Sí | Seis permisos clasificados; quien creó un lote no es el único que lo aprueba |
| MCP para todo lo de pantalla | Sí | Excepción justificada: la descarga de la nómina (cuentas bancarias, Ley 21.719) |

## 4. Pruebas

| Flujo | Pruebas | Estado |
|---|---|---|
| Crear, kilometraje, envío, duplicado (ERP y Supervisor) | `rendiciones-r2b.spec.ts` | Verde el 16-nov (iPad y teléfono) |
| Sin permiso y ver respaldo | `rendiciones-r2d.spec.ts` | Verde |
| Bandeja y lotes (vista, permisos, dos empresas) | `rendiciones-r3.spec.ts` | Verde |
| Reporte y fechas | specs `@preview` | Verde en `preview-e2e` |
| Servidor (flujo, lotes, reporte, km, buscador, flujo de caja) | ocho pruebas `*-db` y dominio | Verde |
| Aprobar, rechazar y devolver de punta a punta en pantalla | — | Falta e2e |
| Lote: armar, aprobar, generar, marcar pagado | — | Falta e2e (solo servidor) |
| Excel del reporte | `reporte-excel.test.ts` | Unitaria |

## 5. Tickets propuestos (por impacto en la operación)

| # | Título | Qué hacer | Listo cuando | Prioridad |
|---|---|---|---|---|
| R1 | Lista de todas las rendiciones | Pestaña o vista «Todas» para `rendiciones:ver_todas`, con búsqueda (código, descripción, persona), filtros (estado, persona, centro, fechas) y paginación por cursor | Las tres listas salen de `listas-pendientes.json`; con 150 rendiciones se ven todas; e2e | Alta |
| R2 | Avisos de rendiciones | Comunicables y consumidores: enviada → aprobador; aprobada, rechazada, devuelta y pagada → quien rinde (campana y correo, editables en Comunicaciones) | Cada transición avisa una sola vez; prueba de idempotencia | Alta |
| R3 | Nómina Santander para uso real | Validar el formato con el banco y quitar «solo empresa de pruebas» | Archivo aceptado por el banco en una prueba real; ajuste con nombre de producto. **Depende de Carlos** (plata real) | Media |
| R4 | Aprobar y rechazar en lote | Selección múltiple en la bandeja con vista previa y motivo común al rechazar | Capacidad con MCP y `dryRun`; e2e | Media |
| R5 | Reversa de una rendición pagada | Lote de reversa con permiso de pagos y motivo, como dice la hoja de alcance | La rendición vuelve a «Aprobada» con historial; el flujo de caja la vuelve a contar | Media |
| R6 | Conciliar el lote con la cartola | El conciliador de Bancos sugiere el lote al reconocer el cargo de la nómina | Prueba con cartola sintética | Media |
| R7 | e2e de decisión y pago | Aprobar, rechazar, devolver y el ciclo completo del lote en qa-e2e | Run nocturno en verde | Media |
| R8 | Filtros del reporte y decisión de topes | Filtro por persona e instalación; revisar la decisión nocturna de CAR-179 sobre el tope mensual | Filtros en pantalla y MCP; decisión anotada | Baja |
| R9 | Rendiciones en las fichas de persona e instalación | Pestaña o tarjeta con lo rendido, con el mismo alcance | Visible solo con permiso | Baja |
| R10 | Ayudas de configuración en lenguaje de producto | Editor de tramos en vez de JSON; quitar «solo empresa de pruebas» del nombre | Sin llaves `{}` ni textos de entorno en Configuración | Baja |

Para el patrón de lista y ficha, ampliar CAR-564 a «Mis rendiciones», la ficha y los lotes, en vez de abrir otro ticket.
