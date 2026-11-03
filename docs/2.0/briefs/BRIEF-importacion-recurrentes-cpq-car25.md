# BRIEF — Importación recurrentes 1.0 y correlativo CPQ (CAR-25 PR 2)

**Repositorio:** `Cryptobal/opai-2` · **Rama:** `cursor/importar-1-0-recurrentes-131b` · **Refs:** CAR-25 · **Decisión Carlos (2-nov-2026):** la migración 1.0→2.0 debe dejar cuentas tributarias, contactos, **programación recurrente** y numeración CPQ continua.

## Objetivo

1. Modelar plantillas de facturación recurrente en Finanzas/Ventas (`finanzas.ventas_programaciones` + líneas + destinatarios).
2. Ampliar `comercial.importar_1_0` para importar plantillas, destinatarios (ids en plantilla + contactos con `recibeFacturacion`) y, en apply, fijar correlativo CPQ vía **`cpq.correlativos.fijar`** (#203) a partir de `cpqQuotes[]` (el dry-run invoca la misma capacidad en preview).
3. Dry-run con conteos claros (cuentas, contactos, programaciones, destinatarios, CPQ) y motivos de omisión sin PII.
4. UI mínima lista/ficha en `/finanzas/ventas/programacion` + MCP `finanzas.ventas_programacion.{listar,obtener}` con `preview_` vía importador.

## Fuera de alcance

- Ejecutar import real en Neon/Gard (solo código + tests).
- Cron que cree borradores mensuales (TODO Carlos).
- Edición de plantillas en pantalla (solo lectura post-import).

## Migración

`20261103140000_finanzas_ventas_programacion` — aditiva, RLS FORCE, reversa documentada. **No aplicar** en este PR.

## Verificación

- `pnpm typecheck`, `pnpm test`, `pnpm test:db` (si toca RLS), build web con env ficticio CI.
- Tests unitarios: `correlativos-cpq`, `modulos-plan` recurrentes, paridad inventario `-u`.
