# BRIEF-35 · Ficha de cotización CPQ: reglas de estado y pantalla (alternativa B) · CAR-192

Encargo de Carlos (4-nov-2026, 21:23 y 21:24; PR #319): construir la alternativa **B, ficha con pasos plegables** de [la propuesta](../design/propuesta-cpq-ficha/PROPUESTA.md) (mockup navegable en `design/propuesta-cpq-ficha/index.html`, pestaña B). Quien construye: «Comercial · Code». Dos PRs en este orden: **PR 1, reglas de estado** (sin pantalla nueva) y **PR 2, la pantalla**, apilado sobre el 1. Formato de 16 secciones.

## 1 · Objetivo

Que una cotización diga una sola cosa y no se contradiga: un único estado con su único siguiente paso, un margen que nunca nace en 0 %, una versión aprobada que no vuelve a pedir aprobación y una pantalla que no ofrece lo que el servidor rechaza. Después, una ficha en una página con cuatro bloques plegables, el precio, el margen y el estado siempre a la vista.

## 2 · Estado verificado (main `c4bf2d0`)

1. `crear.ts` dejaba `margenObjetivoPct` en `null` y `mapear.ts` lo tomaba como 0: precio igual al costo, margen 0 %, semáforo rojo y «Requiere aprobación» desde el primer día.
2. `marcar_lista` solo validaba `noEnviable` y `requiereAprobacion`; no miraba valores desactualizados (huella) ni líneas.
3. La ficha recalculaba en vivo también en `lista`: una versión aprobada volvía a decir «Requiere aprobación» y «Bajo el mínimo».
4. `avisoRecalculo` y «Recalcular» se ofrecían fuera de borrador, donde no guardan nada, y como acción primaria tapaban «Enviar al contacto».
5. `meta.editable` valía `true` en `en_aprobacion` y `lista`, pero las capacidades de edición exigen borrador (`exigirBorrador`); «Nueva versión» se ofrecía en `lista` y chocaba con el índice único `versiones_una_editable_por_cotizacion`.
6. Mínimo (100 000 = 10 %) y alerta (30 000 = 3 puntos) fijos en `recalcular.ts`; la spec (cpq.md R35) los quiere como ajuste de la empresa.
7. Pendientes del Revisor de #315: `consumidor-enlace.ts` sin `tenantId` en el `updateMany`; `aplicarRespuesta` pisa el motivo «manual»; corre sobre seguimientos terminados; las etapas de planes ya guardados solo se validaban al guardar.

## 3 · Alcance

**PR 1.** (a) función pura de estado; (b) objetivo, mínimo y alerta como ajustes de la empresa; (c) requisitos compartidos por `marcar_lista`, `solicitar_aprobacion` y enviar; (d) versión congelada desde `en_aprobacion`; (e) `cpq.cotizaciones.reabrir` y regla de «Nueva versión»; (f) los cuatro pendientes del Revisor, cada uno en su commit. Sin pantalla nueva: solo se ajusta lo que la pantalla actual ofrece.

**PR 2.** Ficha B en `apps/web/app/(erp)/cotizaciones/[id]/`: resumen superior fijo, cuatro bloques plegables, costos agrupados y plegables, sin duplicados ni tarjetas sueltas, lenguaje simple. Componente `BloquePlegable` en el DS (con su caso en `/ds`).

**Fuera de alcance.** Alternativas A y C, nuevo diseño de la lista de cotizaciones, cambios al motor de cálculo, el asistente interno (ADR-049).

## 4 · Arquitectura

- **Estado único** (`modules/cpq/domain/estado-ficha.ts`, puro): `estadoFicha({ estado, hayLineas, costosPendientes, desactualizada, margenBajo })` devuelve `{ estado, etiqueta, siguiente, bloqueos }`. En borrador manda el primer bloqueo (incompleta → desactualizada → margen bajo → por dejar lista). Desde `en_aprobacion` el estado es el persistido: nunca «Requiere aprobación» junto a «Lista».
- **Requisitos** (`persistencia/requisitos.ts`): arma la entrada (con la huella de valores legales) y expone `exigirParaMarcarLista` y `exigirParaPedirAprobacion`. `validarEnvioCpq` usa los mismos `bloqueosParaLista`; en `lista` el margen aprobado no se vuelve a exigir.
- **Congelado** (`persistencia/calculo-vigente.ts`): solo el borrador se recalcula. `solicitarAprobacionMargen` y `marcarLista` guardan `ventaMensualClp` y `calculoCongeladoJson`; la ficha, el PDF y los gates de envío leen eso desde `en_aprobacion`. Una `lista` anterior a este cambio sin JSON guardado se calcula en vivo (compatibilidad).
- **Márgenes de la empresa**: `margen_objetivo_defecto_pct`, `margen_minimo_pct` y `margen_alerta_puntos` en `ajustesCpq` (Configuración › CPQ › Márgenes, porcentajes enteros), convertidos a enteros escalados (1 % = 10 000) por `margenesTenant`. `crear` guarda el objetivo; `mapearVersionCalculo` usa el de la empresa si la versión lo trae vacío; la ficha muestra el efectivo.
- **Reabrir**: `cpq.cotizaciones.reabrir` pasa `lista` a `borrador` con `updateMany` condicionado al estado (sin carrera) y emite `cpq.cotizacion.reabierta`. No toca la aprobación anterior: si el margen sigue bajo, se pide una nueva.
- **Pendientes del Revisor**: `avisado_en` (campo propio, migración aditiva) en lugar de pisar `motivo`; `aplicarRespuesta` relee el estado en la transacción y no corre sobre terminados; `etapasInvalidasDelPlan` revalida al ejecutar y al leer.
- **PR 2**: `lib/cpq-ficha-pasos.ts` (puro, con test) deriva de la ficha los pendientes por bloque y el primer bloque a abrir; los bloques reutilizan los componentes existentes (puestos, costos por categoría, margen, PDF, propuesta técnica, envío) dentro de `BloquePlegable`.

## 5 · Archivos

PR 1: `modules/cpq/domain/{estado-ficha,margenes-defecto}.ts` (+ test), `persistencia/{requisitos,calculo-vigente,supuestos,recalcular,mapear,ficha-meta,aprobacion-margen,entrada-pdf-cotizacion,propuesta-envio-aprobacion,version}.ts`, `capabilities/{crear,ficha,ficha-calcular,aprobacion-flujo,versiones,enviar-validar,index}.ts`, `manifest.ts`, `consumidor-enlace.ts`, `packages/capabilities/src/comercial/seguimiento-{ejecucion,cierre,etapas,planes}.ts`, schema y migración de `comercial.seguimientos`, instantánea MCP e inventario de paridad, ajustes mínimos de la pantalla actual (`acciones-cotizacion*`, `resumen-cotizacion`, `ficha-cotizacion`, `meta-ficha`).
PR 2: `packages/ds/src/components/bloque-plegable.tsx` y su caso en `/ds`; `apps/web/lib/cpq-ficha-pasos.ts`; `_componentes/` de la ficha (resumen superior, cuatro bloques, costos agrupados); se eliminan las tarjetas sueltas. Cada archivo ≤ 150 líneas.

## 6 · Modelo de datos y migración

Una columna: `comercial.seguimientos.avisado_en timestamptz NULL` (aditiva, `SET LOCAL lock_timeout`, con sección «Reversión»; la tabla ya tiene RLS FORCE y política). Sin migración de datos (un `UPDATE` bajo FORCE RLS afectaría 0 filas sin error): los seguimientos que una respuesta ya pausó (`motivo = cliente_respondio`) se tratan como avisados en el código. Migración `20261106140000_comercial_seguimiento_avisado`; el PR lleva `migracion-pendiente` y se pide al bot con `@opai-2.0:`. Los tres ajustes de márgenes usan `core.ajustes` (sin migración). El PR 2 no migra.

## 7 · Capacidades y MCP

Nueva: `cpq.cotizaciones.reabrir` (+ `preview_cpq_cotizaciones_reabrir`), permiso `cpq:cotizaciones.manage`, `dryRun`, auditoría estándar. Cambian sin cambiar de nombre: `marcar_lista`, `solicitar_aprobacion`, `calcular` (rechaza fuera de borrador), `versiones.crear`, `ficha` (agrega `meta.estadoFicha`, `puedeReabrir`, `puedeCrearVersion`, `editable` solo en borrador) y `comercial.seguimiento_planes.list` (agrega `etapasInvalidas`). Se actualiza `herramientas-mcp.txt` y `docs/2.0/paridad/mcp-inventario.md`. PR 2: toda acción de pantalla llega a una capacidad MCP; no se agregan herramientas.

## 8 · Interfaz y responsive

PR 1: la pantalla actual muestra un solo estado (chip del servidor), no ofrece Editar/Quitar/Agregar fuera de borrador, ofrece «Reabrir para editar» en lista y «Nueva versión» solo con la última enviada. PR 2 (mockup B): arriba, siempre visible (fijo en teléfono), precio mensual, margen contra el objetivo con semáforo explicado («Sobre el mínimo», «Cerca del mínimo», «Bajo el mínimo», con el mínimo y el objetivo) y el estado único con su siguiente acción; una sola acción primaria y el resto en un menú. Cuatro bloques plegables (Cliente e instalación, Puestos, Costos y margen, Documento y envío); abre el primer bloque con pendientes; cada bloque con su chip de pendientes. Costos agrupados por categoría, solo las que tienen monto, «Agregar costo» para el resto. Una sola «Nueva cotización» y una sola «Vista previa PDF»; el estado no se repite. Verificación a 375, 1024 y 1280 px, claro y oscuro, targets ≥ 44 px, foco visible, skeleton, vacío y error, `prefers-reduced-motion`.

## 9 · Seguridad y tenant

Sin acceso a datos nuevo salvo `reabrir` (por `ctx.db`, con RLS, tenant de la sesión) y `avisado_en`. Se agrega `tenantId` explícito al `updateMany` del consumidor de enlaces y a la reserva del aviso. La ficha sigue sin entregar costos ni margen sin `cpq:costos.ver` (el estado único no revela cifras). Pruebas entre dos empresas en `cpq-estado-ficha-db.test.ts`.

## 10 · Casos límite

Versión `lista` sin cálculo guardado (anterior a este cambio): se calcula en vivo. Sin `cpq:costos.ver`: el estado se calcula en el servidor y se muestra igual. Aprobación anterior tras reabrir: queda en el historial, la nueva edición exige otra si el margen sigue bajo. Dos respuestas del cliente a la vez: solo una reserva `avisado_en` y avisa. Etapa del plan borrada: «no cerrar desde» falla cerrado (no cierra) y deja una nota; «al responder» sigue y lo dice. Valores legales que cambian estando `lista`: se confirman al enviar (`confirmarValoresViejos`), no se recalcula.

## 11 · Plan por bloques (un commit por bloque)

PR 1: (1) función pura y tests; (2) reglas de estado, ajustes, congelado, reabrir y ajustes mínimos de la pantalla; (3) consumidor de enlaces con `tenantId`; (4) `avisado_en` y respuesta sobre seguimientos terminados; (5) revalidación de etapas; (6) pruebas en base real; (7) brief, `ESTADO.md` y docs. PR 2: (1) `BloquePlegable` en el DS y `/ds`; (2) `cpq-ficha-pasos` y tests; (3) resumen superior; (4) bloques; (5) costos agrupados; (6) limpieza de duplicados; (7) capturas y `ESTADO.md`.

## 12 · Tests

Vitest de dominio (tabla de estados e invariantes: nunca dos estados), de capacidades (validación, permisos, auditoría, `dryRun`, congelado, reabrir, versiones, ajustes por empresa) y del seguimiento (terminado, motivo, etapas inválidas); base real con dos empresas; paridad MCP e inventario; PR 2: test de `cpq-ficha-pasos`, Playwright de la ficha a 375/1024/1280 y presupuesto de JS.

## 13 · Validación

`pnpm typecheck && pnpm lint && pnpm test` y `pnpm test:db`; PR 2 además `pnpm --filter @opai/web build && pnpm presupuesto` y recorrido con Playwright (cotización nueva, con puestos, margen bajo, desactualizada, en aprobación, lista, enviada) sin errores de consola; capturas comparadas con el mockup B y subidas al PR.

## 14 · Criterios de aceptación

Una cotización nueva nace con el objetivo de la empresa y sin «Requiere aprobación». «Dejar lista» y enviar rechazan margen bajo, costos pendientes y valores desactualizados con un mensaje simple. Una versión lista o posterior no cambia al recalcular. La pantalla no ofrece lo que la capacidad rechaza. Paridad MCP y los cuatro checks obligatorios en verde. PR 2: la ficha coincide con el mockup B salvo diferencias justificadas.

## 15 · Riesgos y rollback

- **Decisión pendiente de Carlos**: el margen objetivo por defecto es una propuesta (20 % sobre venta); mientras no responda, es lo que usan las cotizaciones nuevas, y cada empresa lo cambia en Configuración.
- Las cotizaciones borrador existentes con objetivo vacío pasan de 0 % a 20 %: su precio sube al abrir la ficha (era un error de cálculo).
- Cotizaciones que hoy están en `lista` con margen bajo sin aprobación (casos de prueba) no cambian de estado; solo se les muestra lo congelado.
- Rollback: revertir el PR; la columna `avisado_en` puede quedar sin uso (`DROP COLUMN` en la reversión de la migración).

## 16 · Reporte de ejecución

PR 1 integrado en #324. PR 2: ficha B construida; capturas en `design/ficha-cpq-capturas/` (siete estados a 375 y 1280 px en claro, más 1024 y oscuro de los casos clave) y comparadas con el mockup B. Diferencias con el mockup: el resumen es una sola tarjeta fija arriba (precio, margen con barra y estado con su acción) en lugar de tres tarjetas, y en teléfono el botón principal queda dentro de ese resumen fijo, no en una barra inferior (la barra inferior de la app ya lleva la navegación); los costos se agrupan por categoría del motor (no «Uniformes y exámenes» juntos); el bloque «Documento y envío» muestra la mutual sin confirmar y reúne la propuesta técnica, el envío, compartir/archivar y el historial.

En el cuerpo de cada PR (validaciones realmente ejecutadas, capturas y diferencias con el mockup en el PR 2) y en `docs/2.0/ESTADO.md`.
