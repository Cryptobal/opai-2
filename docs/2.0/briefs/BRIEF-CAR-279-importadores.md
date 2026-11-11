# BRIEF CAR-279 · Motor común de importación e importador de Comercial

**Encargo:** Carlos, 11-nov-2026 (chat del proyecto «Opai 2.0»). **Tarea:** CAR-279 y sus subtareas. **Decisiones de diseño:** ADR-091.

## 1 Objetivo
Que cualquier empresa cargue sus cuentas, contactos, instalaciones y negocios desde una planilla, y que Carlos traiga con lo mismo los datos de Gard desde los exportes de OPAI 1. El motor es del Núcleo y reutilizable: Personas y Finanzas agregan su importador sin reescribir lectura, mapeo, simulación, lote ni reversión.

## 2 Estado actual (verificado en `main` `06b1531`)
- Existe `comercial.importar_1_0` (CAR-25, CAR-157): corrida técnica que recibe el JSON del exportador de 1.0, solo para owner o admin, sin planillas ni mapeo. No se toca.
- Existen `core.importaciones` y `core.importaciones_filas` (RLS + FORCE) y `core.ids_externos`. Finanzas ya reutiliza esas tablas con su propio `version_contrato` (apertura).
- No existía lectura de CSV o Excel de maestros, mapeo de columnas ni pantalla de carga.

## 3 Alcance
Entra: motor (`@opai/domain/importacion` y `core/importar`), importadores de cuentas, contactos, instalaciones y negocios, adaptador del export JSON de OPAI 1, cinco capacidades con MCP y la pantalla Configuración › Importar datos.

No entra: personas y documentos tributarios (sus sesiones), actividades y cotizaciones de 1.0 (siguen en `comercial.importar_1_0`), geocodificación de direcciones, archivos `.xls` antiguos.

## 4 Arquitectura
- **Dominio puro** (`packages/domain/src/importacion`, subruta `@opai/domain/importacion` para no sumar JS al cliente): `leerCsv` (separador `;`, `,`, tabulador o `|`, BOM, comillas), `leerExcel` y `escribirExcel` (exceljs, primera hoja), `resolverMapeo` (clave, etiqueta y sinónimos sin tildes; el mapeo manual manda), `normalizarFilas` (RUT, correo, teléfono, fecha, entero, decimal, sí/no, opción) y plantillas.
- **Motor** (`packages/capabilities/src/core/importar`): `armarPlan` (leer → mapear → validar → `planificar` del importador → repetidas en la planilla → cambios según la política), `aplicarPlan` (una transacción, la de la capacidad: lote, filas, ids externos y evento) y `revertirLote`.
- **Contrato `Importador<D>`** (`tipos.ts`): definición de campos, entidad, permiso, módulo, campos actualizables, `planificar`, `crear`, `actualizar`, `actual`, `bloqueoAlBorrar` y `borrar`. Sumar un importador es implementar el contrato y agregarlo en `registro.ts`.
- **Lote:** `core.importaciones` con `version_contrato = motor-archivo/v1`, `sistema` = `archivo` (planillas y filas) u `opai1` (adaptador) y `conteos.importador`. Una fila en `importaciones_filas` por fila de la planilla: `creado`, `completado` con sus valores previos, `sin_cambio` u `omitido` con el motivo.

## 5 Archivos
`packages/domain/src/importacion/*`, `packages/capabilities/src/core/importar/*`, `apps/web/app/(erp)/configuracion/importar/*`, sección en `_centro/secciones.ts`, eventos en `eventos/catalogo-crm.ts`, guarda en `packages/db/scripts/importar-opai1/revertir.ts` y novedad `2026-11-11-importar-datos.md`.

## 6 Modelo de datos y migraciones
**Sin migración.** Reutiliza las tablas existentes; las acciones y los estados que usa ya están en sus CHECK.

## 7 Capacidades (todas con herramienta MCP)

| Capacidad | Efecto | Qué hace |
|---|---|---|
| `core.importar.catalogo` | lectura | Importadores, campos, sinónimos y límites |
| `core.importar.plantilla` | lectura | Plantilla en CSV o Excel (base64) |
| `core.importar.ejecutar` | escritura con vista previa | Simula o importa; `archivo`, `filas` u `opai1`; `mapeo`, `alExistir`, `desde`, `importacionId`, `soloSiTodoValido` |
| `core.importar.lotes` | lectura | Historial de lotes |
| `core.importar.revertir` | irreversible con vista previa | Revierte un lote completo |

Permiso: `core:tenant.manage` más el de la entidad (`core:cuentas.manage`, `core:instalaciones.manage`, `comercial:negocios.manage`) y, para negocios, el módulo Comercial activo. Un actor con alcance por filas no importa. El contenido de la planilla es `sensible`: no llega a la auditoría.

## 8 Interfaz y responsive
Configuración › Importar datos. Tarjeta «Cargar una planilla»: qué importar, qué hacer si el registro existe, plantillas, cargador del DS, tabla de columnas, cuatro contadores, tabla de filas con filtro de errores y botón Importar. Tarjeta «Cargas anteriores»: tabla con Revertir y diálogo de confirmación.

**No hay diseño aprobado de esta pantalla.** Se armó con los patrones de Configuración (`PaginaConfig`, `SeccionTarjeta`, tablas del DS), como «Correos de clientes». Las tablas hacen scroll horizontal en teléfono. En pantalla el archivo se limita a 700 KB (tope de una acción de servidor); por MCP y API, 2 MB.

## 9 Seguridad y tenant
Todo por `ctx.db` y `ctx.transaccion` (RLS). Las referencias (la cuenta de un contacto) se resuelven dentro de la empresa: una fila no puede apuntar a una cuenta de otra. Límites: 2 MB, 20.000 filas por planilla, 500 por llamada, 60 columnas y 2.000 caracteres por celda.

## 10 Casos límite
Encabezados repetidos, planilla vacía, fila repetida en la planilla, dos cuentas con el mismo nombre (pide el RUT), mismo nombre con otro RUT (se crea aparte y se avisa), RUT de otra cuenta, etapa inexistente (queda en la primera, con aviso), responsable que no es usuario activo, coordenadas incompletas, carga por partes, reversión con dependientes o con cambios posteriores.

## 11 Plan por bloques
1 dominio · 2 motor e importadores · 3 capacidades, eventos y pruebas con base · 4 pantalla y novedad · 5 documentación y ESTADO.

## 12 Tests
`importacion.test.ts` (9, dominio) y `core-importar-db.test.ts` más `core-importar-lotes-db.test.ts` (12, Postgres real con rol sin BYPASSRLS y dos empresas).

## 13 Validación
Gate completo, recorrido de la pantalla a 1440 y 390 px y verificación en test.opai.cl después de integrar.

## 14 Criterios de aceptación (CAR-279)
CSV y Excel con plantilla · mapeo de columnas · vista previa con errores por fila · simulación · deduplicación por RUT · reimportar no duplica · RLS por empresa · auditoría y reversión del lote · herramienta MCP · adaptador de OPAI 1 · no toca OPAI 1.

## 15 Riesgos y rollback
Sin migración: el rollback es revertir el PR. Cada carga se deshace con `core.importar.revertir`. Riesgo aceptado: los negocios importados como ganados no disparan los efectos de «ganar», porque es carga histórica.

## 16 Reporte de ejecución
Ver la descripción del PR.
