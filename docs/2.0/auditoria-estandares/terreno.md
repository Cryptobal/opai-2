# Terreno — auditoría contra Connecteam · Deputy · ServiceTitan

**Recomendación: mantener.** La app de terreno sigue el patrón: teléfono primero, dispositivo emparejado y cola sin conexión.

## Qué hace hoy

- **Rutas propias de terreno**: inicio, marcar, portería, rondas y cola (`apps/web/app/(terreno)/`); el reporte de una novedad operativa se hace desde el inicio. La ruta «novedades» es la de novedades del producto.
- **Dispositivo emparejado y credencial de terreno** (`Dispositivo`, `CodigoEmparejamiento`, `CredencialTerreno`, `packages/db/prisma/schema/terreno.prisma`).
- **Cola sin conexión** en el teléfono y envío por lote al volver (`apps/web/lib/terreno/cola.ts`, `apps/web/app/api/terreno/lote/`), con hechos idempotentes (`HechoTerreno`).
- **Marcación con rostro o PIN** y enrolamiento con consentimiento (`EnrolamientoBiometrico`, `asistencia.rostro.*`).
- **Rondas con puntos y etiquetas QR**, novedades e incidentes (`PuntoControl`, `EtiquetaQr`, `Novedad`).
- **Portería**: listas, registros de acceso y salidas (`schema/acceso.prisma`).
- **Presupuesto de JS por ruta de terreno** (ADR-044) y PWA.

## Qué hace el referente

Connecteam: marcación con geocerca, formularios y listas de control con foto y firma, todo desde el teléfono. ServiceTitan: el técnico ve su día y todo lo que necesita sin llamar a la oficina.

## Brechas

| # | Brecha | Evidencia | Gravedad | Recomendación |
|---|---|---|---|---|
| T-1 | **Formularios y listas de control a medida.** Las rondas tienen plantillas de puntos; no hay un formulario genérico que la empresa arme (entrega de turno, revisión de equipo) con foto y firma. | `schema/rondas.prisma`, `tickets.prisma`, `terreno.prisma` | Media | Ajustar cuando entre la segunda vertical (aseo, mantenimiento) |
| T-2 | **«Mi día» del trabajador en terreno.** La app parte de la acción (marcar, ronda); el inicio no muestra el turno ni la pauta del día. | `apps/web/app/(terreno)/terreno/page.tsx` | Media | Va junto con R-1 de Portales |

## Qué se mantiene tal cual

Cola sin conexión, dispositivo emparejado, marcación y rondas.
