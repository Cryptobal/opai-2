# Operaciones — auditoría contra Deputy · Connecteam · ServiceTitan

**Recomendación: ajustar.** El modelo de pauta es bueno. Falta el paso de publicar y avisar.

## Qué hace hoy

- **Pauta por series y excepciones**, con historial y registro operativo (`SeriePauta`, `ExcepcionPauta`, `HistorialPauta`, `RegistroOperativoPauta`, `packages/db/prisma/schema/pauta.prisma`).
- **Patrones de turno y funciones de puesto** compartidos con CPQ (`PatronTurno`, `FuncionPuesto`, `schema/turnos.prisma`, `puestos.prisma`).
- **Puestos por cubrir, cobertura, titulares, reemplazos y refuerzos** (`pauta.ppc.listar`, `pauta.cobertura.*`, `pauta.titular.*`, `pauta.reemplazos.*`, `pauta.refuerzos.agregar`).
- **Alertas de horas** al armar (`packages/domain/src/pauta/alertas-horas.ts`).
- **Tablero del día** de asistencia: presentes, sin marca, atrasos e incompletos sobre los turnos esperados (`asistencia.dias.hoy`).
- **Asistencia** con marcas encadenadas, correcciones, contingencias y días consolidados (`schema/asistencia.prisma`), hecha para certificar ante la DT.
- **Rondas** con plantillas, puntos, programación, ejecución y anomalías (`schema/rondas.prisma`).
- **Tickets** transversales con tipos (`schema/tickets.prisma`).
- **Informe por instalación** en curso (PR #581).

## Qué hace el referente

Deputy: armar con plantillas, **publicar** y avisar a cada trabajador, turnos abiertos que se ofrecen, intercambios con aprobación y avisos de reglas laborales antes de publicar. ServiceTitan: tablero del día con alertas por atraso. Connecteam: planilla de horas que sale de las marcas.

## Brechas

| # | Brecha | Evidencia | Gravedad | Recomendación |
|---|---|---|---|---|
| O-1 | **La pauta no se publica ni avisa.** No hay estado borrador o publicada: lo que se guarda rige de inmediato. El portal del trabajador ya ofrece la preferencia de aviso «Pauta y turnos», pero nada la alimenta: los eventos de pauta no son comunicables y su único consumidor regenera los turnos esperados. | Sin `publicar` en `packages/capabilities/src/pauta/`; sin estado en `schema/pauta.prisma`; `modules/pauta/manifest.ts`; `apps/web/app/(trabajador)/trabajador/_componentes/formulario-avisos.tsx` | Alta | Decisión de producto primero (ver README). Si se aprueba: estado de publicación por período y aviso por el servicio de notificaciones |
| O-2 | **Los puestos por cubrir no se ofrecen.** Se listan para la operación, pero un trabajador no puede tomar un turno abierto ni pedir un cambio. | `pauta.ppc.listar`; Portal Trabajador sin turnos | Media | Se aparta por decisión de Carlos del 5-nov (oleadas por WhatsApp fuera de alcance). Revisar cuando exista «mis turnos» (R-1) |

## Estado al 16-nov-2026

Repaso semanal contra `main` en `886e262` (CAR-586). Se cerró la alta.

| # | Estado | Qué cambió y dónde se comprueba |
|---|---|---|
| O-1 | Cerrada | CAR-356. La pauta se publica y avisa: `pauta.publicaciones.publicar` y `pauta.publicaciones.listar` (`packages/capabilities/src/pauta/publicaciones.ts`), evento `pauta.publicada` y los consumidores `pauta.publicada.avisar` y `pauta.cambio.avisar` |
| O-2 | Abierta | Los turnos extra ya se registran y se aprueban en el servidor (CAR-96, #891: `pauta.turnos_extra.*`), pero un puesto por cubrir todavía no se ofrece a los trabajadores ni hay intercambio de turno |

**Nuevo en la semana, sin brecha.** Visitas de supervisión en el servidor (CAR-83, #816) y tickets asociados a una instalación (CAR-84, #821), con Connecteam, ServiceTitan y Zendesk como referentes declarados.

## En qué se aparta a propósito

- **La marcación sigue la normativa de la DT** (hechos inmutables, cadena, correcciones como hechos nuevos, ADR-023), más estricta que cualquier referente. Se mantiene.

## Qué se mantiene tal cual

Series y excepciones, patrones compartidos con CPQ, reemplazos, alertas de horas, asistencia certificable y rondas.
