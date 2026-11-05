# BRIEF DE IMPLEMENTACIÓN — Rendiciones R2a: kilometraje configurable por empresa (sin pantallas)

Rama `brief/car-194-rendiciones-kilometraje` · PR #321 · `Fixes CAR-194` (hijo de CAR-163). Fuentes: [alcance-rendiciones.md](../diseño/alcance-rendiciones.md) §4 y §5, [extracción de 1.0](../extraccion/rendiciones.md) (R-REN-10 a R-REN-14, R-REN-70), ADR-021, ADR-027, ADR-031, ADR-069.

## 1. Objetivo
Cada empresa elige cómo se reembolsa el kilometraje (consumo, tarifa por km o tramo fijo) y el servidor calcula el monto: el solicitante nunca lo escribe. Sin pantallas ni navegación; operable por MCP y API.

## 2. Decisiones de Carlos que aplican
Kilometraje configurable por empresa, fórmula como configuración versionada evaluada en `packages/domain`, no código por empresa (4-nov-2026, ADR-021). Un solo nivel de aprobación con aprobador asignado; el solicitante nunca decide lo suyo. El cobro por módulo NO va aquí (CAR-188). Rendiciones se vende sola (ADR-048). El supervisor solo rinde.

## 3. Qué se construyó
- **Dominio puro** `modules/rendiciones/domain/kilometraje.ts`: `calcularKilometraje(config, viaje)` con tres métodos. *Consumo*: `combustible = round(km ÷ rendimiento × precio del litro)`, `desgaste = round(combustible × recargo %)`. *Tarifa por km*: `km × tarifa`. *Tramo fijo*: monto del tramo nombrado. Siempre `+ peaje` (entero ≥ 0); ida y vuelta duplica los km y, en tramo fijo, el monto del tramo (decisión de Carlos del 5-nov-2026, R2c); el peaje se suma una sola vez. Aritmética entera exacta (km en décimas, razón con `bigint`, porcentaje en `PCT_ESCALA`); devuelve monto y desglose línea por línea, o un motivo de rechazo (`sin_configurar`, `metodo_desconocido`, `config_incompleta`, `km_invalido`, `peaje_invalido`, `tramo_invalido`). Configuración con `version: 1`.
- **Ajustes** (`ajustes.ts`, ámbito tenant, permiso `rendiciones:config.manage`, cambiables solo con `core.config.set`): `km_metodo`, `km_rendimiento_km_l`, `km_precio_litro_clp`, `km_recargo_desgaste_pct`, `km_tarifa_por_km_clp` y `km_tramos` (lista `{nombre, montoClp}`, control `json`). **Decisión:** campos planos (un control por campo) en vez de un objeto; los tramos son la única lista. Método vacío = sin configurar.
- **Distancia** en el adaptador `Geo` del núcleo: `distancia(origen, destino)` con Google Routes API (`TRAFFIC_UNAWARE`, `regionCode CL`, solo `routes.distanceMeters`) y respaldo en línea recta (haversine, mínimo 0,1 km entre puntos distintos). Devuelve `{ km, origenDistancia: "google" | "linea_recta" }`. `distanciaDe(ctx, …)` en `packages/capabilities` usa la clave del almacén cifrado del tenant (ADR-027) y mide `geo.ruta` (consulta, US$ 5 por mil) solo cuando respondió Google; sin clave o si Google falla, cae a línea recta sin consumir. R-REN-13 de 1.0 queda mejorado: el origen de la distancia **sí se guarda**.
- **Datos** (migración aditiva `20261106220000_rendiciones_viajes`): `rendiciones.rendicion_viajes`, una por rendición (origen y destino con texto y lat/lng, km, ida y vuelta, peaje, método, `config_snapshot` jsonb con parámetros y desglose, origen de la distancia, monto calculado). RLS ENABLE + FORCE + `tenant_isolation`, trigger `mismo_tenant` hacia la rendición, CHECKs, `lock_timeout` y bloque «-- Reversión:». Agregada a `dos-empresas/ajustes.ts`.
- **Capacidades**: `rendiciones.kilometraje.calcular` (lectura, sin escribir; misma fórmula que se guarda) y `rendiciones.rendiciones.crear` / `actualizar` con `tipo: "kilometraje"` y `viaje`. El servidor recalcula y guarda la instantánea; cualquier monto del cliente se descarta (el esquema lo elimina y el gasto único lo arma el servidor). `obtener` devuelve el `viaje`. Una rendición no cambia de tipo. Enviar y aprobar no cambian.
- Sin método configurado: error de negocio «Tu empresa aún no configura el kilometraje».

## 4. Diferencias con el encargo
- El gasto único del viaje se guarda en `rendicion_items` (proveedor «Kilometraje», motivo «Kilometraje calculado por el sistema») para que enviar, aprobar y los totales sigan siendo los de R1.
- ~~Tramo fijo no se duplica por ida y vuelta~~ **Reemplazado el 5-nov-2026 (CAR-200, R2c):** Carlos decidió que «ida y vuelta» duplica también el monto del tramo; el desglose dice «Tramo X: $A × 2 = $B» y el peaje se suma una vez (tramo $18.000 + peaje $2.000 = $20.000; ida y vuelta $38.000).
- `lat/lng` del origen y destino los envía el cliente (salen de `core.geo.autocompletar` / `detalle`); el servidor no geocodifica texto.

## 5. Seguridad y tenant
Tenant de la sesión, nunca del body. Ajustes con permiso de configuración. RLS y trigger en la tabla nueva; prueba de aislamiento entre dos empresas. Nada de claves en código ni en logs (la clave sale del almacén del tenant y los errores de Google la redactan).

## 6. Verificación
`pnpm test` del dominio (100 km, 10 km/l, $1.500/l, 10 %, peaje $2.000 → 15.000 + 1.500 + 2.000 = 18.500; $250/km con 100 km → 25.000; tramo fijo; km 0 o negativo; configuración incompleta; método desconocido; redondeos), `pnpm test:db` (`rendiciones-km-db.test.ts`), `rls-dos-empresas`, gate de paridad, snapshot MCP e inventario regenerados. Tras integrar y desplegar: `OPAI_MCP_KEY=<key> pnpm mcp:verificar` y una llamada a `rendiciones_kilometraje_calcular` en test.opai.cl.

## 7. Pendiente
Pantallas (esperan diseño aprobado en Claude Design), selector de aprobador y de método en Configuración, lotes de pago (R3).
