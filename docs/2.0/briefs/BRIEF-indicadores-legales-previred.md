# BRIEF — Indicadores legales automáticos desde Previred (CAR-183, PR B del plan CPQ)

## 1. Objetivo
Que nadie publique a mano los valores legales. Una captura mensual lee la página de indicadores previsionales de Previred; si el valor coincide con el vigente lo renueva, si cambió lo deja como **propuesta** que aprueba una persona de plataforma, y si la fuente falla conserva el último valor con aviso. **Nunca bloquea** el cálculo (decisión de Carlos, 3-nov-2026; [auditoría CPQ §2](../auditoria-cpq-2026-11.md)).

## 2. Estado actual (verificado en `main` a1dc539)
- UF y UTM se capturan solos desde el SII con un rol dedicado (`opai_cron_sii`) y una función SECURITY DEFINER (CAR-148).
- Los otros 9 indicadores quedaron fijos en la semilla de `20261102190000` y no tienen flujo de actualización (R5 de motor de sueldos).
- `valores_publicados` ya admite los estados `propuesto` y `rechazado`; `publicacionesParaFecha` solo usa `vigente`.

## 3. Alcance
**Entra:** `imm`, `topes`, `afp` (comisiones), `sis` y `cesantia`, leídos de Previred. Trabajo `core.remuneraciones.captura_previsional`, programado del 1 al 7 y el 15 de cada mes. Capacidades `platform.indicadores.propuestas` (lectura) y `platform.indicadores.resolver` (solo personas). Pantalla Plataforma → Valores legales.

**No entra (diferencia con el encargo de «9 indicadores»):** `reforma`, `mutual`, `jornada` e `impuesto` no se publican en la página de Previred (provienen de ley, SUSESO, DT y la tabla del SII). Quedan con su valor vigente y sin lector automático; un lector del SII para `impuesto` puede ser un PR aparte. `afp.obligatoria` (10 %), `afp.salud` (7 %) y `topes.indemnizacionUf` tampoco están en la página: se conservan del vigente.

## 4. Arquitectura
1. `packages/domain/remuneraciones/previred*.ts`: texto plano, cifras chilenas, un lector por indicador (devuelve `null` si no calza), `leerPrevired(html, vigentes)` y `dentroDeBanda`. Puro, sin red.
2. `capturarPrevisional` (capabilities): lee vigentes con esquemas zod, consulta la página (`previred.com`, sin redirecciones, 20 s), valida banda de sanidad y, **por indicador y en su propia transacción**, llama a `remuneraciones_proponer_previsional`. Deja una fila en `capturas_indicador` (`ok`, `propuesto` o `fallido` con motivo `fuente_caida`, `sin_lectura`, `fuera_de_banda`, `publicacion`) y auditoría.
3. Aprobación: `remuneraciones_resolver_propuesta(id, aprobar, actor)`, ejecutable por `opai_app`, que exige `platform_role` en el actor. La capacidad es `soloPersonas`.

## 5. Archivos
Dominio: `previred-texto.ts`, `previred-lectores.ts`, `previred.ts`, `previred.fixture.ts` y su test. DB: migración `20261105100000_remuneraciones_previsional_propuestas`, `remuneraciones-previsional.ts`, `plataforma-indicadores.ts`. Capacidades: `previsional-{esquemas,captura,auditoria,plataforma}.ts`, `trabajo-captura-previsional.ts`, `trabajos/runner.ts`. Web: `(platform)/platform/indicadores/`, entrada «Valores legales» en la navegación de Plataforma.

## 6. Modelo de datos y migración (aditiva, `migracion-pendiente`)
- `valores_publicados`: `resuelto_por_id`, `resuelto_en`; índice único parcial de una sola propuesta pendiente por indicador.
- `remuneraciones_proponer_previsional(text, jsonb, date, text, date)`: solo `opai_cron_sii`. Valida clave (las 5), fuente (`previred.com` o `spensiones.cl`), vigencia (primer día del mes en Santiago) y forma; con el mismo valor renueva (y descarta la propuesta pendiente), con otro crea o reemplaza la propuesta.
- `remuneraciones_resolver_propuesta(uuid, boolean, uuid)`: aprobar cierra el vigente el día anterior y exige vigencia posterior; rechazar no toca el vigente.
- Marca las 5 filas de `indicadores_legales` con fuente `Previred` y lectura automática.
- Reversión y `lock_timeout` en el archivo.

## 7. Capacidades
| id | efecto | notas |
|---|---|---|
| `platform.indicadores.propuestas` | lectura | propuestas con el vigente al lado y último resultado de captura por indicador |
| `platform.indicadores.resolver` | escritura, `dryRun`, `soloPersonas` | auditoría global con antes y después; en `paridad-excepciones.ts` |
Trabajo: `core.remuneraciones.captura_previsional` (idempotente; reintenta cada día de la ventana).

## 8. Interfaz
Plataforma → Valores legales: alertas por indicador con la fuente caída («se sigue usando el último valor»), tarjetas Vigente | Propuesto con Rechazar y «Aprobar para todas las empresas», estado vacío y chips con el estado de cada indicador. Sin diseño de Claude Design: usa `SeccionTarjeta`, `Alerta`, `Badge` y `Empty` del DS; el diseño `PlataformaFuentes` queda como referencia para una segunda pasada visual.

## 9. Seguridad y tenant
Tablas globales (sin `tenant_id`). Escritura solo por funciones SECURITY DEFINER; `opai_app` no puede proponer; resolver exige usuario de plataforma dentro de SQL. Fuente restringida por regex. Sin secretos. La captura no propone si la lectura sale de la banda de sanidad.

Riesgo residual aceptado (revisión independiente): `remuneraciones_resolver_propuesta` confía en el `p_actor` que le pasa el código de la aplicación (la capacidad ya exige `platform_role`, `soloPersonas` y permiso `tenantsManage`); un `$queryRaw` dentro de `enTransaccion` podría llamarla con otro id, pero ese código está prohibido por AGENTS.md y lo vigila el lint. Atar el actor a un GUC o rol dedicado queda como endurecimiento posterior.

## 10. Casos límite
Página irreconocible o caída → todo `fallido`, vigente intacto. Un indicador falla → los demás siguen. `topes` vigente trae `ipsPorVerificar`: la primera captura lo propone sin la marca y, al aprobarlo, queda verificado. Si el vigente ya empieza el primer día del mes, la propuesta toma vigencia desde el día siguiente (para que sea aprobable). La renovación solo cambia la fecha de consulta (y la fuente solo si ya era oficial); la fecha de consulta debe ser de hoy o ayer. Vigente con forma inválida → `sin_vigente_valido`, no se propone. Propuesta que se vuelve a leer igual → idempotente; la fuente vuelve al vigente → la propuesta se descarta.

## 11. Plan por bloques
1. Dominio: lectores y banda. 2. Migración y wrappers. 3. Captura, trabajo y programación. 4. Capacidades de plataforma y pantalla. 5. Pruebas, ESTADO.

## 12. Tests
`previred.test.ts` (11), `remuneraciones-previsional.test.ts` (6, base real), `previsional-captura-db.test.ts` (3, base real), paridad y snapshots.

## 13. Validación
Local: tests de dominio, paridad, base real (Postgres 16) y typecheck de `domain`, `db`, `capabilities` y `web`. **No validado:** e2e, capturas 375/1024/1280, y la **primera lectura contra la página real de Previred** (el HTML se verificó solo por su estructura publicada; los lectores se probaron contra una réplica). Si la estructura difiere, la captura falla con aviso sin afectar cálculos.

## 14. Criterios de aceptación
Captura sin cambios no genera propuestas; un cambio genera una sola propuesta; aprobar la hace vigente para todas las empresas desde su fecha; rechazar la descarta; fuente caída deja aviso y no bloquea; solo plataforma aprueba.

## 15. Riesgos y rollback
Riesgo: formato real de Previred distinto al supuesto. Mitigación: lector por indicador, banda de sanidad y aprobación humana. Rollback: snapshot Neon previo o el bloque comentado de la migración.

## 16. Reporte de ejecución
Ver el PR.
