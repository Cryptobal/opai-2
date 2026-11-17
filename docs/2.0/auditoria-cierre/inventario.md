# Auditoría de cierre · 07 · Inventario

**Fecha:** 16-nov-2026 · **Sesión:** Auditoría de cierre (tanda 06, 07 y 08) · **Foto:** `main` en `5c0a5a8`.

**Avance real en `main`: 0 %** (Linear: 0 de 7 en Done, así que el porcentaje de Linear no engaña aquí).

No hay nada de Inventario integrado. El trabajo existe en una pila de cinco PR abiertos, uno sobre otro, y la hoja de alcance sigue esperando la aprobación de Carlos.

## 1. Tickets contra PR

| Ticket | Estado | PR | ¿En `main`? |
|---|---|---|---|
| CAR-487 · ¿Apruebas el alcance de Inventario? («Decide Carlos») | Backlog desde el 14-nov | — | — |
| CAR-235 · Catálogo de tipos (activos y ropa) | In Progress | #824 abierto | No |
| CAR-236 · Activos por unidad | In Progress | #832 abierto, apilado sobre #824 | No |
| CAR-237 · Ropa por talla con existencias | In Progress | #834 abierto, apilado sobre #832 | No |
| CAR-238 · Entregas a personas e instalaciones, con devolución | In Progress | #839 abierto, apilado sobre #834 | No |
| CAR-504 · Ropa ligada a la prenda del uniforme | In Progress | #865 abierto, apilado sobre #839 | No |
| CAR-505 · Acta de entrega firmada y buscador | In Progress | Sin PR | No |

## 2. Alcance contra 1.0

Fuente 1.0: `ops/inventario/*` (productos, bodegas, compras, stock, entregas, activos, líneas, configuración). En el documento de arranque, Inventario figuraba como «nunca usado» y en backlog; se reactivó con el proyecto 07.

| Qué hace 1.0 | En `main` | En PR abierto |
|---|---|---|
| Catálogo de productos y tipos | Falta | #824 |
| Activos con serie | Falta | #832 |
| Stock de ropa por talla | Falta | #834 |
| Entregas y devoluciones | Falta | #839 |
| Líneas telefónicas | Falta | Propuesto como un tipo de activo (CAR-487) |
| Bodegas | Falta | No propuesto |
| Compras de inventario | Falta | No propuesto (el ingreso queda como movimiento con nota) |
| Configuración | Falta | Catálogo por empresa en #824 |

## 3. Estándares y pruebas

No se evalúan sobre `main` porque no hay nada integrado. Según las descripciones de los PR, la pila trae lista con búsqueda, ficha a la derecha, capacidades con MCP y migraciones aditivas en orden. Hay que revisarla al integrar.

## 4. Riesgo y lo que queda

- **CAR-487 lleva más de 48 horas sin respuesta.** Según ADR-114, la sesión dueña puede aplicar su recomendación (aprobar el alcance como está) y avisar en el issue.
- **La pila de cinco PR comparte `inventario.prisma` y migraciones.** Mientras más tiempo quede abierta, más conflictos con `main`.

No se crean tickets nuevos: la Sesión Inventario tiene todo el alcance en curso. Bodegas y compras quedan para cuando se apruebe el alcance.
