# CPQ · PR 10.1 — datos y capacidades base de la cotización (CAR-119)

Refs CAR-119

## Resumen ejecutivo para Carlos

- **Qué se hizo:** la base del cotizador. Ya se puede crear una cotización (con código `CPQ-AAAA-NNN`, versión 1 en borrador) colgada de un negocio abierto de Comercial, y listarla/leerla. Todo por la misma capacidad en pantalla, `/api/v1` y MCP, con vista previa (`dry_run`), idempotencia y auditoría.
- **Qué cambia para Gard:** nada visible todavía. No hay pantallas ni precios: eso viene con el motor de cálculo.
- **Qué decide Carlos:** (1) el número de partida del correlativo (R54): hoy parte en 1 cada año; hay que fijarlo al último de 1.0 al importar. (2) Las preguntas abiertas de `cpq.md` §14.C (Q16–Q18, Q22, Q24, Q25) siguen sin cerrar y bloquean los PR de envío y configuración.
- **Qué sigue:** Brief 08 (motor + casos dorados), luego PR 10.2 (planilla y resumen).

## Por qué solo la primera entrega

El encargo pide PR chico. `BRIEF-10` §9 exige el motor del Brief 08 (que no está en `main`) antes de mostrar cálculo, y §3 pide Puestos (Brief 11) para la oferta al ganar. Se construyó solo el PR 10.1 del brief.

## Qué entra

- Schema `cpq`, migración `20261031010000_cpq_schema` (aditiva; reversión documentada: `DROP SCHEMA "cpq" CASCADE`). RLS `tenant_isolation` FORCE en las 6 tablas, trigger `mismo_tenant`, CHECK de estados/moneda/tipos.
- Índices parciales: una cotización vigente por negocio; una versión editable por cotización.
- Correlativo por tenant y año con upsert atómico dentro de la transacción de crear.
- Dominio puro (`modules/cpq/domain`): máquina de estados R40, código, año en zona Chile, validez por defecto (30 días).
- Capacidades `cpq.cotizaciones.list|get|create`; permisos `cpq:cotizaciones.read|manage`, `cpq:costos.ver`, `cpq:aprobar`, `cpq:modelo.manage`; el gerente tiene denegados los dos últimos.
- `cpq:costos.ver` aplicado en el servidor (R59): sin el permiso, la clave `margen` no viaja.
- Lecturas con `auditarLectura` (ids de cotización y negocio).
- Arnés de pruebas en memoria: soporta `{ increment }`.
- Paridad MCP: snapshot e inventario regenerados.

## Pruebas

`typecheck`, `lint`, `test`, `test:db` y `build` (resultados en el hilo de la sesión; ver abajo).
Tests nuevos: dominio (7), capacidades (15, incluido aislamiento, alternativas, dry_run, permisos y R59), matriz de permisos y `test:db` de RLS, `mismo_tenant`, índices parciales y concurrencia del correlativo.

## Pendiente (anotado según el encargo)

| Bloque | Estado |
|---|---|
| Motor de cálculo, casos dorados CD-1/CD-2, traza (Brief 08) | No está en `main`; bloquea todo cálculo visible |
| PR 10.2 planilla viva y resumen por categoría; pantallas y componentes nuevos del DS (`PlanillaCotizacion`, etc.) | Requieren el motor y diseño → código con DS 2.0 |
| `cpq.cotizaciones.ajustar` (lote tipado), renombrar con auditoría y evento (R67) | PR 10.2 / 10.4 |
| Instrumentos financieros, condiciones, UF/CLP (10.3) | Pendiente |
| Versiones, aprobación por margen, envío, vencimiento diario (10.4) | Pendiente; `cpq:aprobar` ya existe en el catálogo |
| Cotización rápida, vista cliente, comparar (10.5) | Pendiente |
| Ganar → línea base inmutable R68 y oferta de puestos con RRHH (10.6) | Pendiente; depende de Puestos (Brief 11) |
| Configuración en 3 pestañas (10.7) y agente interno (10.8) | Pendiente |
| Pólizas y RC (R66) | Esperan la confirmación del corredor (CS Seguros) |
| Navegación del módulo | Vacía a propósito: sin pantallas |
| Importar el correlativo de 1.0 | Fijar `cpq.correlativos.ultimo` antes de cotizar en 2.0 |
| e2e y capturas a 375/1024/1280 | Sin pantallas no aplica |
| Presupuesto de JS | Sin cambios de UI |

## Datos

Sin datos reales: fixtures ficticios, ningún RUT, nombre real ni archivo de `_ds/`.
