# BRIEF-42 · Finanzas: rentabilidad por instalación con costo laboral estimado (CAR-174)

## 1. Objetivo
Mostrar, por mes y por instalación, cuánto se vendió, cuánto cuesta (estimado) el personal de sus puestos y el margen que queda. Carlos lo pidió el 14-nov-2026 a las 09:52 («avanza con ambos»): con costo **estimado** mientras Nómina no calcule liquidaciones. Ese mismo día, la adenda 5 del ADR-113 redujo CAR-174 a esta rentabilidad.

## 2. Estado actual (verificado en `main`)
- Las ventas por instalación ya existen: `finanzas.documentos_emitidos.instalacion_id`, más el signo de las notas de crédito (`signoDte`).
- `finanzas.reportes.resultados` ya calcula ventas sin IVA por mes, pero no por instalación.
- El costo de una persona sale de `costoEmpleadorPorPersona` (dominio) a partir de una capa de sueldo (`EstructuraSueldo`, nivel puesto o instalación) y del juego de valores legales publicado (`publicacionesParaFecha`).
- La lectura de montos de sueldo pasa por `ocultasDe`: sin `core:estructuras.read_sensible` oculta todos los montos (D7) y, con él, audita la lectura (A/07c).
- Nómina no calcula liquidaciones, así que no hay costo real.
- No hay diseño aprobado para esta pantalla. Se usa el patrón del reporte de Rendiciones (tarjetas de totales, selector de mes y tabla), que es el más cercano del área.

## 3. Alcance
- **Entra:**
  - capacidad `finanzas.rentabilidad.get` (mes aaaa-mm, hasta el mes actual);
  - pantalla `/finanzas/informes` con la entrada «Informes» en el área Finanzas (NAVEGACION.md §2 ya la lista);
  - novedad y prueba `@preview`.
- **No entra:** costo real de liquidaciones, gastos generales y compras por instalación, estado de resultados contable (adenda 5 del ADR-113).

## 4. Regla de cálculo
- **Ventas netas:** documentos no borrador del mes por fecha de emisión, neto + exento, con las notas de crédito restando. Sin instalación → fila «Sin instalación».
- **Costo estimado:**
  - Por cada puesto activo y vigente en el mes, se resuelve la capa puesto → instalación vigente al día de corte: el último día del mes, o hoy si es el mes en curso.
  - Se calcula el costo empresa mensual con supuestos fijos: contrato indefinido, AFP modelo, Fonasa, jornada del puesto (42 h si falta), mutual adicional del tenant (0 % si no está confirmada), y provisiones de vacaciones e indemnización como en CPQ.
  - Un puesto sin capa completa, o sin valores legales publicados, queda «sin costo» y se cuenta.
  - Los montos de sueldo solo se usan con `core:estructuras.read_sensible` (regla D7 vigente: sin ese permiso se ocultan todos los montos, no solo los de cargos sensibles). Sin él, el puesto se cuenta como «oculto».
- **Margen:** ventas menos costo. El % sobre ventas se guarda como entero escalado (`PCT_ESCALA`) y es nulo si no hay ventas.

## 5. Archivos
- `packages/capabilities/src/finanzas/rentabilidad.ts`: la capacidad.
- `rentabilidad-calculo.ts`: cálculo puro, con prueba.
- `rentabilidad-costos.ts`: lee puestos y capas y calcula el costo.
- La pantalla vive en `apps/web/app/(erp)/finanzas/informes/`.

## 6. Modelo de datos
Sin migración.

## 7. Seguridad y tenant
- Permiso `finanzas:read`.
- Todo pasa por `ctx.db` con el alcance de puestos, instalaciones y estructuras (`dondePuesto`, `dondeInstalacion`, `dondeEstructura`).
- La auditoría de lectura se hace con IDs de instalación. Los montos de sueldo respetan `read_sensible`, con la auditoría salarial existente (sin duplicarla).

## 8. Casos límite
- Mes futuro: se rechaza.
- Sin puestos ni ventas: estado vacío.
- Puesto de otra empresa: invisible por RLS.
- Sin permiso de sueldos: los puestos quedan ocultos y contados.
- Faltan valores legales: todo «sin costo», con un aviso.

## 9. Pruebas y validación
- Cálculo puro: signo de NC, margen y porcentaje, fila sin instalación.
- Prueba de base: ventas y costo por instalación, aislamiento, permiso, montos ocultos sin `read_sensible` y mes futuro.
- `@preview` a 375, 1024 y 1280 px con `qa-e2e`.

## 10. Riesgos
- Es una **estimación** y la pantalla lo dice en el título de la columna y en el subtítulo.
- Cuando Nómina calcule liquidaciones, el costo real reemplaza al estimado sin cambiar el contrato: el campo `origenCosto` pasa de `estimado` a `liquidaciones`.
