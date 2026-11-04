# BRIEF CPQ · QA en video (Loom) del 3-nov-2026 · CAR-162

Rama `fix/car-162-qa-loom-cpq`. Seis hallazgos del QA en video del módulo Cotizaciones. Resumen de las 16 secciones del formato.

## 1 · Objetivo y 2 · Estado verificado

Corregir los seis puntos del QA sin tocar los archivos que modifican #296 y #299, salvo el cambio mínimo de `ficha-cotizacion.tsx` (3 líneas) que pasa la edición de costos al resumen.

- Entrada/Salida del puesto: ya eran texto libre sin selector; el DS solo tenía `InputHora`, que usa el `<input type="time">` nativo.
- Montos: `Input` numérico sin formato.
- «Costos por categoría»: panel de solo lectura. El motor derivaba las categorías de puestos (mano de obra, feriados) y de ítems del catálogo; no había forma de fijar un importe por categoría.
- Propuesta técnica: el botón «Vista previa PDF» llamaba la capacidad y descartaba el resultado; el enlace «Volver» era un `LinkNext` con clases sueltas.
- Vista previa del PDF: el iframe recibía una URL `data:application/pdf;base64,…`.
- Bandeja: aprobaciones como enlaces de texto.

## 3 · Alcance

1. **SelectorHora** (DS): campo `HH:mm` con máscara y selector propio (popover Radix con horas y minutos cada 5), valor siempre `HH:mm` válido o vacío. Reemplaza los campos de Entrada/Salida de la hoja de puesto.
2. **InputMonto** (DS): miles es-CL al escribir (`800.000`); el estado y el payload guardan solo dígitos. Aplicado a sueldo base, líquido objetivo, colación, movilización y costo del ítem de catálogo. Ambos en `/ds`.
3. **Costos por categoría editables**, asignados a un puesto o a toda la cotización (detalle abajo).
4. **Propuesta técnica**: botones del DS (`Button`, `EnlaceBoton` con icono), alineados; «Vista previa PDF» genera y muestra el documento en un diálogo.
5. **PDF**: causa raíz = la CSP (`frame-src 'self' blob: R2`) no admite `data:`. Se usa una URL `blob:` (admitida) y se libera al cerrar. **No se cambia la CSP.** Comprobado con Chrome real: `data:` dispara violación de `frame-src`; `blob:` abre el visor con `object-src 'none'` intacto. La CSP está en enforcement desde CAR-57 (no Report-Only).
6. **Bandeja**: `AprobacionesPendientes` (encabezado con conteo, tarjeta por decisión con tipo, código y cliente, estados hover y foco, flecha). Solo la ruta `/bandeja`; la campana queda igual.

## 4 · Arquitectura del punto 3 (decisión de diseño)

Lectura elegida, la más simple: un **costo manual por categoría** es un importe mensual en CLP entero que se suma como una línea de costo más.

- Alcance **puesto**: toma la sección del puesto y, por tanto, el margen de esa sección. Alcance **global**: usa el margen de la cotización (sección virtual `__cotizacion__`).
- `feriados` no admite costo manual (se calcula desde los puestos). Cualquier otra categoría del modelo sí.
- Un costo por categoría y alcance (índices únicos parciales). Los de un puesto deshabilitado no cuentan; los de un puesto eliminado se borran en cascada.
- **Compatibilidad hacia atrás:** sin filas, `ajustes` es indefinido y `calcular` produce exactamente el mismo resultado (test de igualdad profunda y los casos dorados existentes siguen verdes).
- Nueva versión (clonar o crear): copia los costos; los de puesto siguen al puesto copiado.
- No se pierde ni cambia nada de lo existente: los ítems del catálogo siguen siendo la vía de costos con cantidad y modo de cálculo; el costo manual es el atajo por importe.

## 5 · Archivos

- Dominio: `modules/cpq/domain/motor/{ajustes,tipos,margenes,calcular}.ts`, `ajustes.test.ts`.
- Persistencia: `modules/cpq/persistencia/{mapear,recalcular,version-copiar}.ts`.
- Capacidades: `modules/cpq/capabilities/costos-categoria.ts` (+ test), `index.ts`.
- Base: `packages/db/prisma/schema/cpq.prisma`, migración `20261105190000_cpq_costos_categoria`.
- DS: `packages/ds/src/components/{selector-hora,input-monto}.tsx`, `lib/formato-entrada.ts`.
- Web: `campos-puesto.tsx`, `hoja-item-catalogo.tsx`, `panel-costos-categoria.tsx`, `costos-categoria-{editor,fila}.tsx`, `resumen-cotizacion.tsx`, `ficha-cotizacion.tsx` (3 líneas), `use-vista-previa-pdf.ts`, `propuesta-tecnica/_componentes/{pagina-armador,dialogo-pdf-propuesta}.tsx`, `aprobaciones-pendientes.tsx`, `bandeja.tsx`.
- Paridad: `herramientas-mcp.txt` y `docs/2.0/paridad/mcp-inventario.md` regenerados.

## 6 · Modelo de datos y migración (aditiva)

`cpq.costos_categoria(id, tenant_id, version_id, linea_id null, categoria, monto_clp int ≥ 0, created_at, updated_at)`. RLS `ENABLE` + `FORCE` con `tenant_isolation`, FK a tenants, versiones y líneas (cascada), `verificar_mismo_tenant` sobre `version_id` y `linea_id`, `SET LOCAL lock_timeout`, `CHECK` de monto y de categoría ≠ feriados. Reversible con `DROP TABLE`. **No aplicada en Neon.**

## 7 · Capacidades (2 nuevas, paridad MCP)

- `cpq.costos_categoria.list` (lectura, `cpq:costos.ver`): costos de la versión y categorías admisibles.
- `cpq.costos_categoria.guardar` (escritura con `dryRun`, `cpq:cotizaciones.manage` + `cpq:costos.ver`): reemplaza el conjunto de la versión en borrador; valida categoría, duplicados y que el puesto sea de la versión; recalcula en el servidor y devuelve venta, costo y margen. El tenant sale de la sesión. La auditoría y la idempotencia las aplica `executeCapability`.

## 8 · Interfaz y responsive

`Sheet` «Costos por categoría» con una tarjeta por costo (categoría, «Se asigna a», monto) y vista previa de venta, costo y margen (dryRun con 400 ms de espera). Un solo flujo para 375 y 1280 px (columna que pasa a dos columnas desde `sm`).

## 9 · Seguridad y tenant

RLS en la tabla nueva; permiso de costos exigido en lectura y escritura; el puesto se valida contra la versión; montos enteros no negativos; feriados bloqueado en zod, capacidad, dominio y `CHECK`.

## 10 · Casos límite

Puesto deshabilitado (ignorado), puesto borrado (cascada), versión enviada (no editable: `exigirBorrador`), costos duplicados (error claro y botón Guardar inactivo), `margenesSeccion` con costo global (usa el margen de la cotización), categoría fuera del orden fijo del panel (aparece si tiene monto).

## 11 · Plan por bloques (un commit por punto)

1–2 DS + puesto · 3 costos por categoría · 4–5 propuesta técnica y PDF · 6 Bandeja · docs.

## 12 · Tests

`ajustes.test.ts` (compatibilidad, global, puesto con margen por sección, deshabilitado, inexistente, validaciones, convivencia con ítems), `costos-categoria.test.ts` (capacidad, dryRun, permisos, copia de versión), `formato-entrada.test.ts`, `cpq-vista-previa-pdf.test.ts` (blob), `bandeja-aprobaciones.test.ts`.

## 13 · Validación y 14 · Criterios de aceptación

Ver el cuerpo del PR (validaciones realmente ejecutadas). Criterios: los seis puntos del Loom resueltos; cotizaciones existentes con el mismo resultado; paridad MCP verde.

## 15 · Riesgos y rollback

- Migración pendiente de aplicar (Carlos, con respaldo). Rollback: `DROP TABLE "cpq"."costos_categoria"` y revertir el PR; sin filas el cálculo no cambia.
- `pnpm test:db` no se corrió (sin Postgres local): la RLS de la tabla nueva queda cubierta por el test común de RLS en CI.
- No hay captura visual del flujo autenticado (sin sesión contra `dev`); sí de los componentes nuevos del DS.
- El PDF de la propuesta técnica y el de la cotización usan ahora URL `blob:`; si un día se endurece `frame-src` sin `blob:`, hay que cambiar el visor.

## 16 · Reporte de ejecución

En el PR.
