# BRIEF CAR-341 (seguimiento) · Bancos: historial de importaciones, saldo de la cuenta y fecha futura de Web4Leads

Pedido de Carlos del 12-nov-2026, 22:02. Sesión Finanzas. Sigue a #606.

## 1. Objetivo

Carlos tiene que limpiar las cartolas 0001–0016 (importadas con el lector antiguo) y no tiene cómo hacerlo: la pantalla no muestra las importaciones ni deja deshacerlas, y el MCP le responde 401 al agente. Tampoco ve el saldo de la cuenta, y aparece un movimiento con fecha 13-11-2026, posterior a la cartola más nueva.

## 2. Estado verificado

- **Saldo:** las cartolas históricas no traen saldo por movimiento y Gard no recibe saldo por Web4Leads, así que `saldoDelBanco` no tenía ninguna fuente para la cuenta. Las importaciones anteriores a #606 guardaron `saldo_final = 0` y no tienen período.
- **Fecha 13-11:** Web4Leads manda `transactionDate = 2026-11-13` para movimientos que llegaron el 12-11 desde las 15:29 (hora de Chile). OPAI 1 muestra lo mismo. No es zona horaria de OPAI: es la fecha contable del día hábil siguiente que entrega el banco en línea. La cartola, en cambio, los fecha el día de la operación, y la huella (fecha|monto|glosa) no calzaba.
- **401 del MCP:** la validación de las llaves no cambió. La llave «Grok» de Gard está vigente hasta el 17-11 y su último uso exitoso fue el 11-11 a las 16:26 UTC; ninguna llave de Gard se usó el 12-11. #527 (OAuth del MCP, CAR-247), integrado el 12-11 a las 16:22 UTC, hizo que el 401 lleve `WWW-Authenticate` con `resource_metadata` y publicó `/.well-known/oauth-protected-resource/api/mcp`. Un cliente MCP que ve eso puede pasarse a OAuth en vez de mandar la llave. La otra causa posible es una llave vencida (las de plataforma duran 7 días).
- **Recarga del mismo archivo:** la hoja «Subir cartola» usaba como clave de idempotencia nombre, fecha y tamaño del archivo. Después de deshacer, volver a subir el mismo archivo devolvía el resultado guardado de la primera importación sin importar nada.

## 3. Alcance

1. Pestaña **Bancos › Importaciones**: historial por cuenta (archivo, período, movimientos y conciliados, saldo inicial y final, quién importó, si fue un agente, fecha) y **Deshacer importación** con vista previa en un diálogo de confirmación. No deja deshacer si hay movimientos conciliados.
2. **Saldo de la cuenta**: `finanzas.bancos.listar` devuelve `saldoHoy` y `saldoDesde`. El cierre de la última cartola importada pasa a ser una fuente más del saldo conocido (`saldoDelBanco`, también para el flujo de caja); se toma la más reciente y, con la misma fecha, la del banco. Se muestra en Movimientos y en Importaciones.
3. **Fecha futura**:
   - Web4Leads ya no guarda fechas posteriores a hoy (zona de la empresa).
   - La cartola reconoce como el mismo movimiento uno de Web4Leads con un día de diferencia, igual monto y glosa, que no haya calzado exacto.
   - La migración corrige los movimientos de Web4Leads que quedaron con fecha futura.
4. **Clave de idempotencia** nueva por cada archivo elegido.
5. **Migración** `20261215100000_finanzas_cartolas_historial`:
   - Columnas `creado_por_id`, `creado_por_nombre`, `via_agente` y `saldo_inicial`; `saldo_final` pasa a aceptar NULL, y el 0 sin respaldo queda NULL.
   - Relleno del período (con los movimientos) y del autor (con la auditoría de la importación más cercana, ±60 s).
   - Corrección de las fechas futuras de Web4Leads.

## 9. Seguridad y tenant

Todo pasa por `ctx.db`/`tx` con RLS. El autor sale de la sesión (`ctx.usuario`) y nunca del input. Deshacer sigue siendo `irreversible` (aprobación humana para agentes) y la pantalla exige `finanzas:bancos.gestionar`. La migración no cruza datos entre empresas: cada relleno se filtra por `tenant_id`.

## 12–13. Pruebas

- Dominio: ±1 día solo contra Web4Leads, cada movimiento calza una vez, el calce exacto va primero, dos días no calzan, y fecha futura acotada a hoy.
- Base (`finanzas-bancos-historial-db.test.ts`): autor y saldos de la importación; saldo de hoy desde el cierre de la cartola; fecha futura acotada que suma al saldo; calce de cartola con Web4Leads con un día de diferencia. Todas las `finanzas-*-db` siguen en verde.
- e2e `@preview` (`finanzas-bancos-importaciones-preview.spec.ts`) con la semilla `qa-e2e/bancos-importaciones.sql`: historial, saldo y diálogo de deshacer, cancelando.

## 15. Riesgos y rollback

- El saldo del flujo de caja puede cambiar en empresas con cartolas que traen saldo final: ahora ese cierre cuenta como saldo conocido. Es lo correcto (ADR-073: saldo del banco), pero se nota en la apertura.
- Rollback: revertir el PR; la migración trae su reversión manual al pie, y las fechas corregidas se restauran desde el respaldo de Neon.
