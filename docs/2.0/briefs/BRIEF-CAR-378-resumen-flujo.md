# Brief CAR-378 · Resumen del flujo por mes, indicadores de caja y escenario de cobros atrasados

**Sesión Caja · 13-nov-2026 (modo noche) · Fixes CAR-378**

## 1. Objetivo

Que la proyección se pueda ver por mes y no solo por semana, desde el saldo real del banco. Que muestre cuándo la caja se pone en riesgo y qué pasa si los clientes pagan tarde. Primero como capacidad, con MCP y API; la pantalla Hilo va en un PR aparte.

## 2. Estado actual

- La planilla (`finanzas.planilla.obtener`) es semanal y no tiene indicadores.
- OPAI 1 tenía la vista mensual (`matrix-monthly.ts`) y un Panel con KPIs (`insights-series.ts`: primer quiebre, runway, mínimo y fin del horizonte). No tenía escenarios.

## 3. Alcance

- Dominio puro `modules/finanzas/domain/resumen.ts`:
  - `atrasarCobros`: corre los cobros proyectados de facturas N semanas y recalcula los saldos;
  - `agruparPorMes`;
  - `indicadores`.
- Capacidad de lectura `finanzas.planilla.resumen`. Usa la misma serie de la planilla (`serieSaldos`), sin consultas extra: los cobros proyectados se toman de las celdas de la fila virtual «Cobros esperados».
- Fuera de alcance: la pantalla, y los escenarios guardados o personalizados.

## Decisiones nocturnas (revisar)

1. **Semana partida entre dos meses:** cuenta en el mes de su jueves (regla ISO). Cada celda del flujo es semanal y no tiene fecha propia. OPAI 1 reasignaba por la fecha de cada ítem.
2. **Escenario:** el único es atrasar los cobros de facturas, el riesgo típico de una empresa de servicios.
   - Los depósitos del factor no se atrasan, porque son más seguros.
   - Lo que cae fuera del horizonte deja de contar dentro de él.
3. **El mes toma el peor tono de sus semanas:** un mes con una semana negativa queda en rojo aunque cierre positivo.

## 9. Seguridad y tenant

- Solo lectura, con `PERMISO_VER`.
- Todo pasa por `ctx.db` (RLS).
- La prueba confirma que otra empresa no ve los egresos ni el saldo.

## 12. Tests

- `domain/resumen.test.ts` (7).
- `finanzas-flujo-resumen-db.test.ts` (4): por semana, por mes, escenario sin escritura y aislamiento.
