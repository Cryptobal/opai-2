# Auditoría de cierre · 08 · Terreno

**Fecha:** 16-nov-2026 · **Sesión:** Auditoría de cierre (tanda 06, 07 y 08) · **Foto:** `main` en `4a5f7168`.

**Avance real: 61 %** (Linear: 3 de 7 en Done). Corregido el 16-nov en la tanda 09-10-11: el modo supervisor no estaba, ver ítem 10.

Método: el de [`asistencia.md`](asistencia.md#cómo-se-calculó-igual-en-los-tres-informes-de-esta-tanda). Terreno es el portal del equipo de la instalación: emparejar, identificarse, marcar, hacer rondas, portería y novedades. Alcance 7,5 / 12 = 63 %; estándares 4 / 6 = 67 %; pruebas 45 %. Total: **61 %**.

## Lo más importante

1. **El libro de novedades no se ve en Terreno.** El servidor está (#817, #826), pero la pantalla está en #843, abierto. Hoy `/terreno/novedades` solo envía una novedad.
2. **La marca de asistencia no entra a la cola sin conexión.** La cola acepta rondas, novedades y portería, pero no la marca (**CAR-626**).
3. **El JS de Terreno supera el tope de ADR-044.** Las rutas tienen entre 162 y 178 KB contra 150 (**CAR-625**).
4. **No hay botón de pánico:** `core.terreno.panico` existe y ninguna pantalla la usa. #883 lo agrega dentro de la ronda.

## 1. Tickets contra PR

| Ticket | Estado | PR | ¿En `main`? | ¿Hace lo que pide? |
|---|---|---|---|---|
| CAR-78 · Dispositivos emparejados y shell de Terreno | Done | #339, #354, #357, #367, #389 | Sí | Sí |
| CAR-405 · Rondas en el buscador | Done | #815 | Sí | Sí |
| CAR-498 · ¿Borro la tabla vieja de novedades? | Done | — | — | Decisión; el borrado sigue pendiente (parte 5 de CAR-77) |
| CAR-77 · Libro de novedades en el núcleo | In Progress | #817 y #826 integrados; #843 abierto | Parcial | Partes 1 y 2 sí; 3 a 5 pendientes |
| CAR-226 · Cierre operativo de Rondas y circuito móvil | In Progress (Urgente) | #439 (plan) | Parcial | Datos de cierre comentados en el ticket |
| CAR-501 · Rondas emite señales para la Central | In Progress | #877 y #883 abiertos | No | — |
| CAR-527 · Terreno explica el equipo emparejado | In Progress | #907 abierto | No | — |

## 2. Alcance contra 1.0

Fuente 1.0: `portal/terreno` (tarjetas Marcación, Rondas, Acceso, Libro, Incidentes), `portal/rondas` y `ronda/[code]`.

| # | Qué hace 1.0 | En 2.0 | Detalle |
|---|---|---|---|
| 1 | Emparejar el equipo con la instalación | Está | Código o QR |
| 2 | Identidad con RUT y PIN | Está | |
| 3 | Marcar asistencia | Está | `/terreno/marcar` |
| 4 | Ejecutar la ronda (iniciar, puntos GPS o QR, cerrar) | Está | Cierre con confirmación (CAR-381) |
| 5 | Novedad desde la ronda | Está | Ahora va al libro del núcleo |
| 6 | Libro de novedades e incidentes | Parcial | Se registra; no se lee en Terreno (#843) |
| 7 | Portería (acceso) | Está | Módulo 09 |
| 8 | Pánico o emergencia | Falta | #883 abierto |
| 9 | Cola sin conexión con pendientes visibles | Parcial | `/terreno/cola` existe; sin la marca de asistencia; e2e en rojo |
| 10 | Modo supervisor | Falta | Con sesión, `/terreno` muestra «Terreno: en construcción · Este portal se habilita en la fase de portales» (`PortalPlaceholder`). #907 (CAR-527) lo reemplaza. La e2e «terreno del supervisor» (`maestros.spec.ts`) en realidad prueba el portal Supervisor, no `/terreno` |
| 11 | Foto como evidencia de la novedad | Falta | Etapa T2 de CAR-226 |
| 12 | Señales a la Central | Parcial | #877 abierto |

Rediseñado sin portar: la ronda por enlace público `ronda/[code]` se reemplaza por el equipo emparejado (ADR-024).

## 3. Estándares

| Chequeo | Resultado | Evidencia |
|---|---|---|
| Patrón de portal (CAR-589) | Parcial | En curso para todos los portales |
| Paginación y búsqueda | Sí | Listas cortas por instalación |
| Sin duplicados | Parcial | `rondas.novedades` convive con `core.libro_novedades` hasta la parte 5 de CAR-77 |
| Sin textos internos | No | «en construcción · se habilita en la fase de portales» a la vista con sesión (comentado en CAR-527) |
| Permisos por rol | Sí | |
| MCP | Sí | `core.terreno.*` |

Además: el presupuesto de JS está sobre el tope de ADR-044 (CAR-625).

## 4. Pruebas

| Flujo | Estado (16-nov) |
|---|---|
| Emparejar el equipo (claro y oscuro, QR) | Verde |
| Inicio del equipo (`@preview`) | Verde |
| Cola sin conexión | **Rojo** en teléfono e iPad |
| Ronda completa en Terreno | Sin e2e |
| Servidor: hechos, rondas, libro (dos empresas) | Pruebas de base |

## 5. Tickets creados

| Prioridad | Ticket |
|---|---|
| Media | CAR-625 Presupuesto de JS de Terreno sobre 150 KB |
| Media | CAR-626 La marca de asistencia no entra a la cola sin conexión |

El resto (e2e de la ronda, cola en rojo, pánico, evidencia con foto) quedó comentado en CAR-226, que ya es el ticket de cierre del circuito.