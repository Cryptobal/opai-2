# BRIEF-36 · Plataforma: catálogo de módulos (CAR-204)

**Plataforma · Code · 5-nov-2026 · rama `brief/car-204-plataforma-catalogo` · ADR-071 (adenda) y ADR-072 · hoja: `modulos/plataforma-hoja-alcance.md` §5 bloque C**

## 1. Objetivo
Que Plataforma tenga un catálogo de lo que se puede cobrar: el plan base, los módulos y las siete partes de Finanzas, con lo que incluye cada uno, su forma y unidad sugeridas, sus dependencias y un precio de lista por cobrable que rellena la hoja «Cobro» de una empresa.

## 2. Contexto y decisiones que rigen
- ADR-071 y su adenda (4-nov): plan base = empresa, usuarios, roles y permisos, ajustes, auditoría, notificaciones, documentos, tickets y portal. Motor de sueldos dentro de Nómina; la firma se cobra por uso (fuera de este bloque; el catálogo lo dice).
- DECISIÓN CARLOS (4-nov 20:45): Tickets, Portal Trabajador y Portal Cliente van incluidos en el plan base. Agente interno sigue cobrable hasta que Carlos decida (pendiente).
- ADR-072: Finanzas es un módulo con siete partes; Flujo necesita Bancos; Cobranza y Factoring necesitan Ventas; Contabilidad necesita Ventas o Compras. Sin partes declaradas, la empresa tiene todas.
- ADR-021: reglas comerciales como configuración versionada, nunca código por empresa.

## 3. Alcance
Catálogo en `@opai/domain`; capacidades `platform.catalogo.list` y `platform.catalogo.precio_set`; validación en `condiciones_set` y `prueba_abrir`; pantalla `/platform/catalogo`; cobro y Facturación con «Incluido en el plan base»; partes de Finanzas en el cobro; arreglos de CAR-188 (selector de mes, unidades con mayúscula, concordancia, tope de JS).

## 4. Fuera de alcance
Correo del aviso a 7 días, ocultar herramientas MCP de módulos en solo lectura, rutas públicas y webhooks en solo lectura (decisiones pendientes de #347); cobro por uso de la firma; filtro de partes en menú y MCP y la declaración de `parte` en las capacidades de Finanzas (Sesión 5, «Finanzas · Code»).

## 5. Ids de las partes (coordinación con Finanzas · Code)
En `main` y en los PR abiertos al 5-nov no había ids de partes. Se definen una sola vez en `packages/domain/src/cobros/catalogo-modulos.ts` (`PARTES_FINANZAS`): `finanzas.bancos`, `finanzas.flujo`, `finanzas.ventas`, `finanzas.cobranza`, `finanzas.factoring`, `finanzas.compras`, `finanzas.contabilidad`; `partesDeEmpresa(declaradas)` devuelve las siete si no hay declaradas. Finanzas · Code los importa, no los redefine. No se tocaron sus archivos.

## 6. Dominio (`packages/domain/src/cobros/`)
`catalogo-modulos.ts` (ids, `MODULOS_INCLUIDOS_EN_BASE`, tipo de entrada), `catalogo-entradas.ts` (una entrada por cobrable), `catalogo-reglas.ts` (`tienePrecioAparte`, `dependenciaFaltante` → «Flujo de caja necesita Bancos», `partesConPrecio`, `textoPrecioLista` → «UF 0,10 por trabajador activo · mínimo UF 5», `etiquetaUnidad`). Cada entrada: nombre, qué incluye, `incluidoEnBase`, forma y unidad sugeridas, dependencias. **Lo incluido se decide en un solo lugar: `MODULOS_INCLUIDOS_EN_BASE`; incluir el Agente interno es agregar su id (`agente`) ahí.** Motivo nuevo `incluido_en_base` en `MOTIVOS_COBRO`.

## 7. Datos y migración
**Sin migración.** El precio de lista vive en `core.ajustes_plataforma` (módulo `catalogo`, clave = id del cobrable, valor = moneda, forma, unidad, precio, mínimo), que ya tiene `version`; cada cambio queda en `core.auditoria_global` con antes y después. Quitar el precio guarda un valor vacío con versión nueva.

## 8. Capacidades
- `platform.catalogo.list` (lectura, `platform:tenants.read`): entradas con precio de lista, texto y versión.
- `platform.catalogo.precio_set` (escritura, `platform:tenants.manage`, `dryRun`, `idempotencyKey`): rechaza lo incluido en el plan base y la forma por unidad sin unidad; no toca condiciones ni cargos.
- `condiciones_set` y `prueba_abrir`: rechazan lo incluido («Tickets está incluido en el plan base: no tiene precio aparte.») y validan dependencias de partes. Decisiones propias: no se mezcla Finanzas entero con partes (se cobraría dos veces) y no se quita una parte de la que otra depende. La prueba de una parte vive en su condición (`pruebaHasta`): no cambia el estado del módulo `finanzas`, que debe estar activo o en prueba.
- `resumen`: cada fila trae `incluidoEnBase`; lo incluido no cuenta como «no se factura». Una parte sin condición no cuenta como contratada. Si `finanzas` (entero) ya tiene condición, se muestra igual; no se migran datos.

## 9. Pantallas (sin diseño aprobado: patrón de la pestaña Cobro; el bloque de diseño viene después)
`/platform/catalogo` (`ListScreen`, plan base arriba, módulos y Finanzas con sus siete partes; «Editar precio» abre hoja lateral con `CamposCondicion soloPrecio`; `support` en solo lectura). Cobro y Facturación: «Incluido en el plan base» sin «Fijar precio» ni «Sin condición comercial»; la hoja Cobro parte del precio de lista y el de la empresa manda. Entrada «Catálogo» después de Facturación.

## 10. Arreglos de CAR-188
Selector de mes con el mes elegido («Mes: noviembre de 2026 (en curso)», `ChipsFiltro.porDefecto`); unidades con mayúscula inicial; «Hoy se cuenta 1 usuario activo». Tope de JS: se revierte `finanzas/bancos` (169→168, medido 167,1). `finanzas/ventas/[id]` (170) ya estaba antes de #317 y mide 168,3: no se puede volver al valor por defecto.

## 11. Seguridad y tenant
Solo `platformRole`; el tenant sale de la sesión; las operaciones de empresa filtran por `tenantId` además de la RLS; toda escritura y lectura `platform.*` en la auditoría global. El catálogo es global (sin `tenant_id`).

## 12. Paridad MCP
`platform_catalogo_list`, `platform_catalogo_precio_set` y `preview_platform_catalogo_precio_set`; instantánea `herramientas-mcp-plataforma.txt`, `mcp-inventario.md` y lista cerrada de lecturas actualizados.

## 13. Pruebas
Dominio (22 con cobros): incluido no cobrable, dependencias, sin partes = todas, formato. Capacidades en memoria (`plataforma-catalogo.test.ts`) y con Postgres real (`plataforma-catalogo-db.test.ts`): rechazos, `dryRun` sin escritura, auditoría con antes y después, `support` solo lee, fijar la parte en A no cambia B, cargos de A no crean filas en B, con `app.tenant_id` de B no se ven las de A.

## 14. Riesgos y rollback
Sin migración: revertir el PR basta; los precios de lista quedan en `ajustes_plataforma` sin efecto. Riesgo: la dependencia se valida contra las partes con precio en la empresa, hasta que la Sesión 5 guarde las partes declaradas.

## 15. Decisiones de Carlos (6-nov-2026, vía OPAI 2.0)
Agente interno cobrable aparte; no se exige Finanzas contratado para fijar precio; `PARTES_FINANZAS` en este PR; prueba gratis de una parte de 10 días que se desactiva sola. **Pendiente en otro PR:** default de 10 días y «Pasa a cobro» apagado en la hoja «Abrir prueba», y la prueba de una parte sin Finanzas contratado (hoy `prueba_abrir` exige el módulo activo, en prueba o en solo lectura).

## 16. Reporte de ejecución
Ver el PR (capturas a 375, 1024 y 1280 px en `docs/2.0/qa/plataforma-catalogo-car204/`).
