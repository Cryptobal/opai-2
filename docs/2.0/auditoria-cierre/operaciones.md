# Auditoría de cierre · 06 · Operaciones

**Fecha:** 16-nov-2026 · **Sesión:** Auditoría de cierre (tanda 06, 07 y 08) · **Foto:** `main` en `5c0a5a8` · Solo lectura sobre el código; los tickets se crearon por pedido de Carlos.

**Avance real: 69 %** (Linear: 11 de 15 tickets en Done).

Método: el mismo de [`asistencia.md`](asistencia.md#cómo-se-calculó-igual-en-los-tres-informes-de-esta-tanda) (alcance 70 %, estándares 15 %, pruebas 15 %). Operaciones abarca Pauta (puestos, mensual, diaria, turnos extra y visitas), Tickets y la configuración de Rondas. La ejecución de Rondas está en [`terreno.md`](terreno.md). No se probó en pantalla: lo visual sale del código y de las corridas nocturnas del 16-nov.

Operaciones: alcance 14 / 20 = 70 %; estándares 4 / 6 = 67 %; pruebas 65 %. Total: **69 %**.

## Lo más importante

1. **CAR-96 (turnos extra) está en Done con solo el servidor** (#891). Nadie puede registrar ni aprobar un turno extra en pantalla. Las pantallas quedaron como un «PR 2» sin ticket: ahora es **CAR-620**.
2. **En el ERP no hay dónde ver las rondas realizadas.** Hay configuración y ejecución en Terreno, pero no historial ni reporte (**CAR-621**).
3. **La Pauta es la parte más completa:** mensual, diaria, PPC, reemplazos, refuerzos, historial, publicar con aviso, exportar e informe por instalación, con e2e en verde.

## 1. Tickets contra PR

| Ticket | Estado | PR | ¿En `main`? | ¿Hace lo que pide? |
|---|---|---|---|---|
| CAR-81 · Pauta mensual | Done | #180 | Sí | Sí |
| CAR-86 · Pauta diaria y reemplazos | Done | #200 | Sí | Sí |
| CAR-201 · Turno esperado y cálculo único de horas | Done | #338 | Sí | Sí |
| CAR-72 · Rondas GPS y QR (especificación y backend) | Done | #124, #137, #141, #145 | Sí | Sí, configuración y backend |
| CAR-75 · Rondas PR 1 (construcción) | Done | Sin PR propio (#141 lo referencia) | — | Done sin PR propio; el trabajo entró por CAR-72 |
| CAR-356 · Publicar la pauta y avisar | Done | #686, #707, #709, #713, #715 | Sí | Sí. El aviso al celular espera las claves VAPID |
| CAR-310 · Indicadores de Operaciones | Done | #573 | Sí | Sí |
| CAR-330 · Informe por instalación | Done | #581, #616 | Sí | Sí |
| CAR-404 · Tickets y puestos en el buscador | Done | #808 | Sí | Sí |
| CAR-458 · Pregunta a Carlos sobre turnos extra | Done | — | — | Era una decisión (opción A) |
| CAR-96 · Turnos extra: registro y aprobación | Done | #891 (servidor), docs #365, #378, #421, #442 | Sí | **No completo:** sin pantallas → CAR-620 |
| CAR-84 · Tickets y solicitudes | Done (16-nov) | #169, #188, #811, #821, #868 | Sí | Sí en el ERP. Las solicitudes del portal Trabajador van en CAR-464 y CAR-508; las del portal Cliente, en #881 (abierto) |
| CAR-83 · Supervisión y visitas | In Progress | #816 (servidor) integrado; #871 (pestaña) abierto | Parcial | Falta iniciar y cerrar la visita en pantalla y los hallazgos (comentado en el ticket) |
| CAR-100 · Turnos pedidos y puestos temporales cobrables | In Progress | Solo documentos (#409, #442) | No | Sin código |
| CAR-541 · Mapa de puntos GPS de Rondas | In Progress | #933 abierto | No | — |

Sin reversiones. #884 (lockfile) se cerró sin integrar; no es del módulo.

## 2. Alcance contra 1.0

Fuente 1.0: `ops/pauta-*`, `ops/ppc`, `ops/refuerzos`, `ops/audit-pautas`, `ops/puestos`, `ops/turnos-extra/*`, `ops/supervision/*`, `ops/tickets`, `ops/rondas/*`.

| # | Qué hace 1.0 | En 2.0 | Detalle |
|---|---|---|---|
| 1 | Pauta mensual: series, excepciones, PPC, historial | Está | |
| 2 | Pauta diaria: cobertura, reemplazos, refuerzos, alertas, exportar | Está | |
| 3 | Publicar la pauta y avisar al trabajador | Está | Mejora sobre 1.0 |
| 4 | Puestos | Está | En la ficha de la instalación |
| 5 | Asignar titular y trasladar | Está | e2e en rojo el 16-nov (CAR-595) |
| 6 | Ausencias (licencia, vacaciones, permiso) en la pauta | Está | |
| 7 | Turnos extra: registro y aprobación | Parcial | Solo servidor (CAR-620) |
| 8 | Turnos extra: lotes y pagos | Falta | CAR-101, en curso |
| 9 | Supervisión: nueva visita y mis visitas | Parcial | Servidor; pestaña en #871 |
| 10 | Supervisión: hallazgos, tablero, reportes | Falta | Comentado en CAR-83 |
| 11 | Tickets: bandeja, ficha, estados, comentarios, reasignar | Está | |
| 12 | Tickets: tipos y aprobación | Está | |
| 13 | Tickets: SLA y aviso de vencimiento | Parcial | Se calcula `slaVenceEn`; sin aviso (CAR-622) |
| 14 | Tickets por instalación | Está | #821, #868 |
| 15 | Rondas: puntos, plantillas, programación, etiquetas QR | Está | |
| 16 | Rondas: monitoreo y alertas | Parcial | Eventos sí; la vista en vivo es de la Central (CAR-85, en curso) |
| 17 | Rondas: historial y reportes | Falta | CAR-621 |
| 18 | Informe por instalación e indicadores | Está | |
| 19 | Turnos pedidos y puestos temporales | Falta | CAR-100 |
| 20 | Buscador general | Está | |

Pasan a otros módulos: alertas de cobertura y control nocturno (Central, 17); cámaras y ATS (no se portan).

## 3. Estándares

| Chequeo | Resultado | Evidencia |
|---|---|---|
| Lista y ficha (CAR-545) | Parcial | Instalaciones y Tickets en CAR-550 (Backlog) |
| Paginación y búsqueda | No | La bandeja de Tickets pide 100 y descarta `siguiente`, sin búsqueda. Nueve listas siguen en `listas-pendientes.json` (CAR-623). Problema transversal: CAR-624 |
| Sin duplicados (CAR-580) | Parcial | Geocerca de Rondas contra radio de Asistencia, sin decidir (CAR-581) |
| Sin textos internos | Sí | No se encontraron en ajustes ni manifests (solo en comentarios de código) |
| Permisos por rol | Sí | `pauta:aprobar_extra` separado; nadie aprueba lo que registró |
| MCP para todo lo de pantalla | Sí | |

## 4. Pruebas

| Flujo | Estado (corrida nocturna del 16-nov) |
|---|---|
| Pauta mensual, diaria, publicar, por instalación, clase de ausencia | Verde |
| Puestos (CAR-8) | Verde |
| Asignar titular y trasladar | **Rojo** (CAR-595) |
| Tickets: bandeja y ficha | Verde, con un reintento en iPad; sin e2e de crear ni cambiar de estado |
| Rondas: configuración | Verde |
| Turnos extra y visitas | Solo pruebas de servidor; no hay pantalla que probar |

## 5. Tickets creados

| Prioridad | Ticket |
|---|---|
| Alta | CAR-620 Turnos extra: pantallas de registro y aprobación |
| Alta | CAR-624 Pantallas que descartan `siguiente` (proyecto 22, transversal) |
| Media | CAR-621 Rondas: historial y reporte en el ERP |
| Media | CAR-622 Tickets: búsqueda, paginación y aviso de SLA |
| Media | CAR-623 Listas de Pauta, Rondas y Tickets al contrato CAR-353 |

Comentario en CAR-83 (visitas) en vez de un ticket nuevo.
