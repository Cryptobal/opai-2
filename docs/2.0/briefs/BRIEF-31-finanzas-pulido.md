# BRIEF-31 · Finanzas: pulido de QA (CAR-165 · F1)

## 1 Objetivo
Cerrar los hallazgos F-B3 a F-B8 y F-B10 de la auditoría de Finanzas y Rendiciones (§4, PR #241) que siguen abiertos en `main`.

## 2 Estado actual (verificado en `main` 65ddc78)
- F-B5 (texto «cron» en Programación) y F-B6 (Configuración DTE y Folios en el menú): ya resueltos por CAR-182 (#252); ambas pantallas viven en Configuración › Empresa (`secciones-finanzas.ts`).
- F-B3: el selector de proveedor de Registrar documento abre vacío, sin mensaje.
- F-B4: el vacío de Compras dice «con la API o el agente» y no tiene botón.
- F-B7: Folios dice «Suba» (usted); además «Revise» en la vista previa del CAF y en Emisión.
- F-B8: `/finanzas/compras` hace `compras.listar` (3 consultas + 2 de apoyo), `centros_costo.listar` y `proveedores.listar` en paralelo: ≤ 8 consultas, sin N+1. Cada ruta ya tiene esqueleto (Suspense de `PaginaPortal`). Las hojas del flujo ya cargan diferidas.
- F-B10: `hoja-mover.tsx` (162), `formulario-emitir.tsx` (151, con `eslint-disable max-lines`) y `pantalla-config-dte.tsx` (con `eslint-disable`).

## 3 Alcance
1. Registrar documento: si no hay proveedores, «Sin proveedores» y «Crear proveedor» (lleva a `compras/proveedores?nuevo=1`, misma capacidad `finanzas.proveedores.crear`).
2. Vacío de Compras en lenguaje de negocio, con «Registrar documento» e **«Importar RCV»**: hoja que lee el CSV del RCV, muestra qué entra (nuevos, repetidos, con error) con `dryRun` y luego importa con `finanzas.compras.importar` (≤ 200 por archivo, clave de idempotencia por importación).
3. Trato en tú en Folios y Emisión.
4. Dividir los archivos largos y quitar los `eslint-disable max-lines` de Finanzas.

## 4 Arquitectura
`leerRcv` (dominio puro, `packages/domain/src/finanzas/rcv.ts`) lee las columnas por el nombre del encabezado y informa cada línea inválida; la hoja `HojaRcv` solo llama a la capacidad existente. **El formato del CSV es un supuesto por confirmar con un archivo real del SII** (columnas Tipo Doc, RUT Proveedor, Razon Social, Folio, Fecha Docto, Monto Exento/Neto/IVA Recuperable/Total).

## 5–6 Archivos, datos
Sin migración. Nuevos: `rcv.ts`/`rcv.test.ts`, `hoja-rcv.tsx`, `celdas-compras.tsx`, `campos-mover.tsx`, `use-emision.ts`.

## 7 Capacidades
Ninguna nueva: paridad intacta (la hoja usa `finanzas.compras.importar`, ya expuesta por MCP).

## 8 Interfaz
Hoja con el patrón de cartola/CAF (`Input type="file"`, vista previa, confirmar). Permiso: `finanzas:compras.manage`; «crear proveedores» solo con `finanzas:proveedores.manage`.

## 9 Seguridad y tenant
Toda escritura pasa por la capacidad (tenant de la sesión, RLS, auditoría). El archivo se lee en el navegador; no se sube.

## 10 Casos límite
Archivo sin encabezado conocido, líneas con tipo no soportado, fechas inválidas, más de 200 filas (se importan las primeras 200 y se avisa), reimportar el mismo archivo (se omiten los duplicados).

## 11–14 Plan y criterios
Un commit por bloque; gate: typecheck, lint, test, test:db, build + presupuesto. Criterios: lo de §3 funciona a 375 y 1280 px; ningún archivo de Finanzas pasa de 150 líneas sin `eslint-disable`.

## 15 Riesgos
Formato del RCV no verificado (se informa por línea, no se pierde nada). TTFB de Compras: sin cambio de consultas; medir en vivo tras integrar (ADR-045).

## 16 Reporte de ejecución
Ver el PR.
