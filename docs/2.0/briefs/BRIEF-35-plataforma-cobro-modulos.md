# BRIEF-35 · Plataforma: cobro por módulo (CAR-188)

**Sesión 6 · 4-nov-2026 · rama `brief/car-188-plataforma-cobro-modulos` · ADR-071 · hoja: `modulos/plataforma-hoja-alcance.md`**

## 1. Objetivo

Que Plataforma sepa cuánto cobrarle a cada empresa por cada módulo y deje cada mes un **cargo listo para facturar**, sin emitir facturas ni usar SimpleAPI. Ver de un vistazo qué se factura y qué no, por empresa y en total. Sirve para todos los módulos (decisión de Carlos del 4-nov, #313).

## 2. Estado actual (verificado en `main` `7f9a8f9`)

`core.tenant_modules` guarda solo `estado` (`trial`, `activo`, `suspendido`); «prueba» no vence y funciona igual que «activo». No hay precio, condición comercial ni cargo en ningún lado. La UF diaria vive en `remuneraciones.valores_publicados` (indicador `uf`, en centavos de CLP).

## 3. Alcance

**Entra:** condiciones comerciales por empresa y módulo; cálculo del cargo del mes en el dominio; generación idempotente de cargos de un mes cerrado (a mano y con un trabajo diario); anular un cargo; vista «Facturación» de Plataforma (por empresa y total, mes a mes); pestaña «Cobro» en la ficha de la empresa con editor y vista previa del cargo; capacidades con MCP y `preview_`.

**No entra:** emitir facturas o DTE; cobro por trabajador o por instalación (ADR-058, después); catálogo comercial de módulos (bloque C); pasar un módulo de «prueba» a «activo» solo al vencer (lo cobra igual, ver §10).

## 4. Arquitectura

- **Dominio** (`packages/domain/src/cobros/`): `cargoDelMes(condicion, estadoModulo, periodo)` decide si se factura, desde qué día, cuántos días y el monto, con aritmética entera (CLP en pesos, UF en diezmilésimas, descuento en `PCT_ESCALA`). `aClp(monto, moneda, ufCentavos)` convierte con la UF del último día del mes.
- **Datos** (schema `core`, RLS por empresa): `cobro_condiciones` (una por empresa y módulo) y `cobro_cargos` (uno vigente por empresa, módulo y mes; índice único parcial sobre los no anulados).
- **Acceso:** operaciones con nombre en `operacionesEmpresa` (CAR-40), siempre sobre `forTenant(tenantId)` y filtrando además por `tenantId`; la UF por una operación global con nombre.
- **Capacidades** `platform.cobros.*` (`sinTenant`, `tenantObjetivo`, auditoría global y en la empresa objetivo).

## 5. Archivos

`packages/domain/src/cobros/*` · `packages/db/prisma/schema/cobros.prisma` · `packages/db/prisma/migrations/20261106210000_core_cobro_modulos/` · `packages/db/src/plataforma-empresa-cobros.ts` · `packages/db/src/plataforma.ts` · `packages/capabilities/src/core/plataforma/cobros/*` · `apps/web/app/(platform)/platform/facturacion/*` · `apps/web/app/(platform)/platform/tenants/[id]/cobro/*` · `apps/web/lib/navegacion.ts` · tests e instantáneas.

## 6. Modelo de datos y migración (aditiva)

`core.cobro_condiciones`: `tenant_id`, `modulo_id`, `moneda` (`CLP`|`UF`), `precio_mensual` (entero: pesos o UF × 10.000, ≥ 0), `cobro_desde` y `prueba_hasta` (fechas opcionales), `descuento_pct` (0 a 1.000.000), `nota`; único `(tenant_id, modulo_id)`.

`core.cobro_cargos`: `tenant_id`, `modulo_id`, `periodo` (primer día del mes), copia de la condición usada (`moneda`, `precio_mensual`, `descuento_pct`), `dias_cobrados`, `dias_mes`, `monto` (en la moneda), `uf_centavos` (si es UF), `monto_clp`, `estado` (`listo`|`anulado`), `motivo_anulacion`, `anulado_en`. Único parcial `(tenant_id, modulo_id, periodo) WHERE estado = 'listo'`.

Ambas con RLS `tenant_isolation`, FORCE, `SET LOCAL lock_timeout`. Reversible con `DROP TABLE`.

## 7. Capacidades

| Id | Efecto | Qué hace |
|---|---|---|
| `platform.cobros.resumen` | lectura | Mes (por defecto el actual) por empresa y módulo: estado, condición, si se factura y por qué, monto estimado en CLP y el cargo si existe; totales |
| `platform.cobros.condiciones_set` | irreversible (aprobación humana para agentes), `dryRun` | Fija o quita la condición de un módulo; la vista previa devuelve el cargo del mes con la condición nueva |
| `platform.cobros.cargos_generar` | escritura, `dryRun` | Genera los cargos de un mes cerrado, idempotente (no duplica); omite con motivo lo que no se factura o no tiene UF |
| `platform.cobros.cargos_list` | lectura | Cargos por mes, empresa y estado |
| `platform.cobros.cargo_anular` | irreversible, `dryRun` | Anula un cargo listo con motivo; se puede volver a generar |

Trabajo diario `platform.cobros.generar_mes_anterior` por empresa: genera el mes anterior si falta (idempotente).

## 8. Interfaz y responsive

Diseño aprobado más cercano: Plataforma en `export-maestros` (pantallas 48–51: lista de empresas, ficha, ajustes). No hay diseño propio de Facturación: se usa `ListScreen`, `KpiTile`, `Table` y `Sheet` del DS con el mismo patrón que la ficha; se reporta y entra al Design Prompt del bloque D. `/platform/facturacion`: selector de mes, 4 indicadores (total del mes en CLP, módulos que se facturan, que no, empresas), tabla por empresa con chips de módulos (se factura / no y por qué), total, y «Generar cargos» de un mes cerrado con vista previa. Ficha › «Cobro»: módulos con su condición y su estado de cobro, hoja «Editar condición» con el cargo del mes en vivo, historial de cargos con «Anular». Verificar a 375, 1024 y 1280 px.

## 9. Seguridad y tenant

Solo `platformRole` (`platform:tenants.read` para leer, `platform:tenants.manage` para escribir). Toda escritura y lectura queda en la auditoría global y las escrituras también en la empresa objetivo. Las tablas tienen RLS; las operaciones filtran además por `tenantId`. Test entre empresas: lo de una empresa nunca aparece ni se escribe en otra. Lo irreversible pide aprobación humana a un agente.

## 10. Casos límite

Prueba sin fecha de fin: no se factura. Prueba vencida: se factura desde el día siguiente aunque el módulo siga marcado «prueba» (propuesta, decisión de Carlos pendiente). Inicio a mitad de mes: proporcional por días (propuesta). Módulo suspendido o no contratado: no se factura. UF del último día del mes no publicada: el cargo se omite con motivo y se reintenta. Mes en curso: no se generan cargos (solo estimación). Precio 0 o descuento 100 %: no se factura («bonificado»). Módulo `core`: no se cobra aparte.

## 11. Plan por bloques (un commit cada uno)

1. Dominio y tests. 2. Schema, migración y operaciones de datos. 3. Capacidades, trabajo y tests (incluido entre empresas). 4. Pantallas y navegación. 5. Instantáneas MCP, inventario de paridad, ESTADO.

## 12. Tests

Dominio (proporcional, prueba, descuento, UF, redondeo); capacidades en memoria (permisos, dry run, idempotencia, auditoría, empresa equivocada → NOT_FOUND); `test:db` con dos empresas sobre RLS real.

## 13. Validación

Gate completo; Playwright local en `/platform/facturacion` y la pestaña Cobro a 375, 1024 y 1280 px con capturas; herramientas `platform_cobros_*` y `preview_*` en la instantánea MCP.

## 14. Criterios de aceptación

Fijar la condición de un módulo y ver en el mismo momento si se factura y cuánto; ver por empresa y en total qué se factura y qué no; generar los cargos de octubre dos veces y obtener los mismos cargos; anular uno y regenerarlo; todo igual por MCP.

## 15. Riesgos y rollback

Migración aditiva (`DROP TABLE`). Sin efecto en las empresas: nada se cobra ni se emite. Riesgo: reglas de §10 marcadas como propuesta; se ajustan en el dominio sin migración.

## 16. Reporte de ejecución

Se completa al cerrar el PR.
