# BRIEF-26 · Finanzas: programaciones recurrentes que funcionan (F3 · CAR-159)

**Origen:** [auditoría de Finanzas y Rendiciones](../auditoria-finanzas-rendiciones-2026-11.md) §1.3, §2.1, §2.5 y §6 (F3). Pedido de Carlos del 3-nov-2026: «me preocupa que el flujo de caja funcione perfecto y las programaciones también».
**Rama:** `brief/car-159-finanzas-recurrentes` · **Tarea:** `Fixes CAR-159`.

## 1. Objetivo

Que una programación de facturación recurrente se pueda **crear, editar, pausar y activar** desde la pantalla y por MCP. Que **genere un borrador de venta por período, una sola vez**, con las líneas en CLP o UF (convertidas con la UF del SII), y que ese ingreso **aparezca en el flujo de caja** antes de emitirse. Nada se emite solo: el borrador queda para revisión (decisión 4 de la auditoría, propuesta por defecto).

## 2. Estado actual (verificado en `main` `7186617`)

- **Tablas de #235:**
  - `finanzas.ventas_programaciones` (frecuencia, día, moneda, plazo, política UF, IPC, receptor congelado, `ultimo_periodo_1_0`, `proxima_ejecucion_en`).
  - `ventas_programaciones_lineas` (cantidad `Decimal(14,4)`, `precio_unitario_clp` o `precio_unitario_uf` escalado por `UF_ESCALA`, `descuento_pct` en centésimas, exento).
  - `ventas_programaciones_destinatarios`.
  - `ventas_programaciones_corridas`, con `UNIQUE(programacion_id, periodo)`.
- **Capacidades:** solo `finanzas.ventas_programacion.listar|obtener`, en `packages/capabilities/src/finanzas/ventas-programacion-lectura.ts`. **Bug:** `montoLineaClp` en `ventas-programacion-vistas.ts` usa float y `Math.round`, y muestra 0 para las líneas en UF.
- **Pantallas:** `apps/web/app/(erp)/finanzas/ventas/programacion/` (lista) y `[id]` (ficha), ambas de solo lectura. Muestran el texto interno «(el cron no emite al SII)».
- **Borrador de venta:** `finanzas.ventas.crear_borrador` (`ventas-borrador.ts`). Las líneas del documento son `glosa + monto` CLP.
- **Dominio:** `validarMontosVenta` (`packages/domain/src/finanzas/ventas.ts`) prohíbe exento en la 33.
- **UF:** se publica en `core.valores_publicados` (indicador `clave = "uf"`, `valor_json` en centavos de CLP, `vigente_desde` por día; ver `core/remuneraciones/sii-captura-persistir.ts` y `listar.ts`). Dominio de dinero en `packages/domain/src/dinero.ts` (`UF_ESCALA`, `redondearRazonCLP`, `montoUfClp`).
- **Flujo:** `finanzas.ventas.proyeccion_flujo` (`proyeccion-flujo-cap.ts`) proyecta los DTE (borrador como «comprometido»). La derivada DTE de la planilla está en `modules/finanzas/capacidades/derivadas/dte.ts`.
- **Configuración DTE:** `fecha_corte_1_0`, en `dteConfig`.
- **La migración `20261103160000` puede no estar aplicada en Neon** (CAR-164). El código no debe asumir nada más allá del esquema de `main`.

## 3. Alcance

**Entra:**
1. Dominio puro, con tests:
   - Períodos y fechas de generación por frecuencia.
   - Fecha de la UF según la política.
   - Monto exacto de cada línea en CLP (CLP o UF, cantidad, descuento), solo con enteros (`bigint`) y `redondearRazonCLP`.
   - Montos del DTE de la programación.
2. Capacidades (todas en el MCP, con `dryRun` e `idempotencyKey`):
   - `finanzas.ventas_programacion.crear`
   - `finanzas.ventas_programacion.actualizar`
   - `finanzas.ventas_programacion.cambiar_estado` (activar o pausar)
   - `finanzas.ventas_programacion.generar` (un período o «todo lo pendiente hasta hoy»; idempotente por corrida)
   - `finanzas.ventas_programacion.vista_previa` (lectura: próximos N períodos con fecha, UF usada y montos)
3. Trabajo diario `finanzas.ventas_programacion.generar_pendientes` (`defineTrabajo`, `periodicidad: "diaria"`, registrado en `apps/web/lib/registro.ts`):
   - Encola o genera los borradores de las programaciones activas con `proxima_ejecucion_en <= ahora`.
   - Nunca emite al SII.
4. La activación nunca genera períodos anteriores a la fecha de corte con 1.0 ni al `ultimo_periodo_1_0`: no se duplican facturas ya emitidas en 1.0.
5. Corrección de las lecturas: montos exactos (sin float) y líneas en UF valorizadas con la UF de hoy, indicadas como «estimado».
6. **Proyección en el flujo de caja:** los períodos futuros de las programaciones activas (que todavía no tienen borrador) aparecen como ingreso «proyectado» en la semana de cobro, es decir, fecha de generación + plazo de pago. No hay doble conteo: cuando existe la corrida y su borrador, manda el DTE.
7. Pantallas con el DS 2.0 (export `export-finanzas-ventas-banca-v3`, artboard «Programación y cierre»):
   - Lista con «Nueva programación».
   - Ficha con «Editar», «Pausar» o «Activar», «Generar ahora» (con vista previa y confirmación) e historial de corridas con enlace al borrador.
   - Formulario de crear y editar (cuenta, tipo 33 o 34, frecuencia, día, moneda CLP o UF, política UF, plazo, inicio y fin, líneas, destinatarios).
   - Mobile first, a 375, 1024 y 1280 px.

**No entra:** emisión automática, envío por correo (F2), ajuste IPC automático (queda el dato; aviso en un PR posterior) y cierre de mes en lote (F5).

## 4. Arquitectura

- **Dominio** en `packages/domain/src/finanzas/programacion.ts`, exportado desde el índice del dominio. Sin Prisma ni Next.
- **Capacidades** en `packages/capabilities/src/finanzas/ventas-programacion-*.ts` (donde ya viven las de ventas; F8 las unificará después), registradas en `finanzas/index.ts`.
- **Generación en una sola `ctx.transaccion`:** insertar la corrida (si choca con `UNIQUE`, el período ya estaba: se omite sin error), crear el borrador `documento_emitido` con las líneas en CLP, enlazar la corrida y el documento, actualizar `ultima_ejecucion_en` y `proxima_ejecucion_en`, y emitir el evento `finanzas.venta.borrador_creado` por el outbox.
- **Valor de la UF:** se busca la UF publicada para la fecha que define la política. Si no hay UF publicada para esa fecha exacta, **no se genera**: la corrida no se crea y el resultado devuelve el motivo «Sin UF publicada para AAAA-MM-DD», que el trabajo diario reintenta al día siguiente. Nunca se usa una UF de otra fecha en silencio.
- **Factura afecta (33) con líneas exentas:** no se genera. Se devuelve el motivo «La factura afecta no admite líneas exentas; use tipo 34 o quite la exención». Pasa igual con los tipos 56 y 61 importados: quedan pausados con motivo y no se generan.

## 5. Archivos (orientativo)

- `packages/domain/src/finanzas/programacion.ts` y `.test.ts`
- `packages/capabilities/src/finanzas/ventas-programacion-{escritura,generar,trabajo,vista-previa}.ts` y `ventas-programacion-vistas.ts` (corregido)
- `packages/capabilities/src/finanzas/proyeccion-flujo-cap.ts` y/o `modules/finanzas/capacidades/derivadas/dte.ts` (proyección)
- `packages/capabilities/test/finanzas-programacion*.test.ts` y `finanzas-programacion-db.test.ts`
- `apps/web/app/(erp)/finanzas/ventas/programacion/**`
- `apps/web/lib/registro.ts`, instantánea MCP, `docs/2.0/paridad/mcp-inventario.md`
- `docs/2.0/ESTADO.md`

## 6. Modelo de datos

Migración aditiva `20261104100000_finanzas_programacion_corridas_documento`:
- En `ventas_programaciones_corridas` se agregan `documento_id uuid NULL` con FK a `documento_emitido` (`ON DELETE RESTRICT`), `fecha_generacion date NULL`, `uf_centavos bigint NULL` y `monto_total bigint NULL`.
- Lleva `SET LOCAL lock_timeout = '5s'`.
- La tabla ya tiene RLS: no se crean tablas nuevas.
- No se aplica en Neon: el PR lleva la etiqueta `migracion-pendiente`.

## 7. Capacidades

Todas con descripción de negocio de 40 o más caracteres, permiso `finanzas:ventas.manage` para escribir y `PERMISO_READ` para leer, `dryRun` en las escrituras y auditoría estándar.
- `generar` es escritura **no irreversible**: crea borradores que se pueden descartar.
- La instantánea `herramientas-mcp.txt` se actualiza.

## 8. Interfaz

- Patrones del DS (`ListScreen`, `DetailScreen`, `FormScreen`), hojas de `@opai/ds` y los estados vacío, carga, error y sin permisos.
- Montos con el formateador único de `@opai/domain` (#236), sin jerga interna.
- Acción principal fija sobre la barra inferior a 375 px.
- Archivos de hasta 150 líneas.

## 9. Seguridad y tenant

- Todo pasa por `ctx.db` o `tx`, nunca `dbAdmin`.
- Se valida que la cuenta, la instalación y los contactos sean del tenant.
- El trabajo diario recorre los tenants con el mecanismo estándar de `defineTrabajo`.
- Test de aislamiento entre dos empresas: A no ve, no edita ni genera la programación de B.

## 10. Casos límite

- Día 29–31 y `-1` (último día del mes) en febrero.
- Fecha de fin vencida.
- Programación sin líneas: no se activa.
- La misma generación dos veces: solo un borrador.
- Dos trabajos concurrentes: el `UNIQUE` de la corrida decide.
- Programación de 1.0 sin cuenta (receptor congelado): no genera hasta que se asigne una cuenta. Motivo «Asigna la cuenta del cliente».
- UF faltante.
- Descuento del 100 %.
- Cantidad decimal (0,5).

## 11. Plan por bloques (un commit por bloque)

1. Dominio y tests.
2. Migración y esquema Prisma.
3. Escrituras (`crear`, `actualizar`, `cambiar_estado`) y lecturas corregidas.
4. `generar`, `vista_previa` y trabajo diario.
5. Proyección en el flujo, sin doble conteo.
6. Pantallas.
7. Tests de base, aislamiento, instantánea MCP, ESTADO.

## 12. Tests

- **Vitest de dominio**, con todos los casos límite.
- **Capacidades con contexto falso:** permisos, validación, `dryRun`.
- **`*-db.test.ts` contra Postgres real:** generación idempotente, UF faltante, aislamiento entre dos empresas, proyección sin doble conteo.
- **Gate local:** `pnpm typecheck && pnpm lint && pnpm test && pnpm test:db`.

## 13. Criterios de aceptación

- Crear, editar, pausar y activar desde la pantalla y por MCP.
- «Generar ahora» crea exactamente un borrador por período, con montos que cuadran (`validarMontosVenta`).
- Las líneas en UF usan la UF del SII de la fecha de la política, y falla con un motivo claro si no está publicada.
- Las programaciones activas aparecen en el flujo de caja como ingreso proyectado, sin duplicarse con el borrador.
- Ningún período anterior a la fecha de corte o a `ultimo_periodo_1_0` se genera.
- Gate en verde y ESTADO al día.

## 14. Riesgos y rollback

- **Riesgo:** generar facturas que 1.0 todavía emite. Lo mitigan la fecha de corte, `ultimo_periodo_1_0`, que se importe pausado y que solo se generen borradores.
- **Rollback:** revertir el PR. La migración es aditiva y sus columnas son nulas.

## 15. Reporte de ejecución

Se completa en la descripción del PR.
