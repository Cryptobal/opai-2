# BRIEF CAR-182 · PR 1 — Orden del menú lateral

Tarea: [CAR-182](https://linear.app/carlos-irigoyen/issue/CAR-182). Diseño de referencia: [Inicio y menú lateral v2](https://claude.ai/artifact/9h3Et9xT5rosuksxapP8Hb) (tablero «Mapa del menú»). Este PR solo ordena el menú; el rediseño visual de Inicio y del sidebar es el PR 2, después de aprobar el diseño.

## 1. Objetivo

Que el menú del ERP muestre solo lo que se usa a diario, sin duplicados y con cada entrada en su área. Los catálogos que se editan pocas veces al año pasan a Configuración, sin cambiar ninguna URL.

## 2. Estado actual (verificado en `main` `d9aabf2`)

- `navegacionErp` (`apps/web/lib/navegacion.ts`) inserta «Bandeja» como ítem suelto, e Inicio además monta la bandeja completa (`<Bandeja />` en `inicio.tsx`).
- Finanzas declara en el menú «Configuración DTE», «Folios» y «Plan de cuentas» (`modules/finanzas/manifest.ts`). Plan de cuentas ya es una pestaña de Configuración › Módulos › Finanzas.
- El núcleo pone «Cargos» en Personas (`entradasNucleo`).
- «Cuentas» (núcleo) y «Contactos» (comercial) forman el área «Clientes», aparte de Comercial.
- El área Documentos se rotula «Firmas» por un caso especial en `navegacionErp`.
- La Bandeja ya recibe su contador en `marco-shell.tsx` y el ítem del DS lo pinta.
- No existe la pantalla central de Documentos (explorador). Solo existe `/documentos/firmas`; las capacidades `core.documentos.*` sí existen.

## 3. Alcance

**Entra**

- Orden de áreas: Comercial, Operaciones, Personas, Finanzas, Documentos.
- Cuentas y Contactos pasan al área Comercial.
- Salen del menú Cargos, Configuración DTE, Folios y Plan de cuentas. Se llega a ellos desde Configuración.
- Inicio deja de montar la bandeja completa. La Bandeja queda como un solo ítem del menú, con número (decisión 1 de Carlos, 3-nov).
- Remuneraciones queda en Personas con ese nombre (decisión 2 de Carlos, 3-nov).
- Firmas queda en el área Documentos, rotulada «Documentos» (decisión de Carlos, 3-nov: todo documento se centraliza ahí).

**No entra**

- Rediseño visual de Inicio y del sidebar (PR 2).
- Explorador de Documentos (PR 3, con diseño previo).

## 4. Arquitectura

El menú se sigue armando desde los manifests y `entradasNucleo`. Configuración recibe entradas fijas con `href` a las rutas existentes, filtradas por permiso y, cuando corresponde, por módulo activo (campo nuevo `modulo` en `Seccion`). No hay capacidades nuevas: cada pantalla ya invoca las suyas.

## 5. Archivos

- `apps/web/lib/navegacion.ts`, `apps/web/lib/navegacion-entradas.ts`
- `modules/finanzas/manifest.ts`, `modules/comercial/manifest.ts`
- `apps/web/app/(erp)/_componentes/inicio.tsx` y `bandeja-diferida.tsx` (se borra si queda sin uso)
- `apps/web/app/(erp)/configuracion/_centro/{seccion-tipo,secciones,secciones-operacion,datos}.ts`
- Tests: `apps/web/test/navegacion-erp-car182.test.ts` (nuevo), e2e de navegación que nombran el grupo «Clientes»
- Docs: `docs/2.0/NAVEGACION.md`, `docs/2.0/ESTADO.md`

## 6. Modelo de datos y migraciones

Sin migración. El área `clientes` sigue en la lista cerrada de `AREAS_NAV`, porque hay preferencias guardadas con ese valor. Si un usuario la tenía abierta, el menú cae al área de la ruta actual, como hoy.

## 7. Capacidades

Sin cambios. La paridad no se mueve: ninguna pantalla nueva.

## 8. Interfaz y responsive

- Desktop: acordeón con el orden nuevo. Bandeja suelta bajo Inicio, con su número.
- Teléfono: «Más» muestra las mismas áreas. La barra inferior no cambia.
- Configuración: «Cargos» en Operación; «Facturación electrónica» y «Folios» en Empresa, solo con Finanzas activo.

## 9. Seguridad y tenant

Las entradas de Configuración usan los mismos permisos que tenían en el menú: `core:estructuras.read` para Cargos y `finanzas:ventas.configure` para Facturación electrónica y Folios. Las pantallas siguen verificando permisos en servidor. Sin cambios de RLS.

## 10. Casos límite

- Tenant sin Comercial: Cuentas queda sola en el área Comercial y se muestra suelta (R3).
- Tenant sin Finanzas: Facturación electrónica y Folios no aparecen en Configuración.
- Fijados existentes de `/cargos`, `/finanzas/folios`, `/finanzas/plan-de-cuentas` o `/finanzas/configuracion-dte`: siguen funcionando, porque las URL no cambian.

## 11. Plan por bloques

1. `core:` menú — orden de áreas, Cuentas y Contactos a Comercial, sin Cargos, rótulo Documentos; Finanzas sin sus tres catálogos.
2. `core:` Configuración — entradas de Cargos, Facturación electrónica y Folios.
3. `core:` Inicio — sin la bandeja duplicada.
4. `docs:` tests, e2e, `NAVEGACION.md` y `ESTADO.md`.

## 12. Tests

- Unitario nuevo sobre `navegacionErp` con todos los módulos: Bandeja una vez; sin Cargos, Folios, DTE ni Plan de cuentas; orden de áreas; Cuentas y Contactos en Comercial; grupo «Documentos».
- Unitario de las secciones de Configuración: las tres entradas nuevas, con módulo y permiso.
- E2E: los specs que abren el grupo «Clientes» pasan a «Comercial».

## 13. Validación

Gate completo: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm build`. E2E local de los specs tocados si hay base disponible; si no, los valida el CI.

## 14. Criterios de aceptación

- «Bandeja» aparece una sola vez en el menú, con su número, e Inicio no repite la bandeja completa.
- Cargos, Folios, Configuración DTE y Plan de cuentas no están en el menú y se llega a ellos desde Configuración, con sus permisos.
- No cambia ninguna URL.
- El orden de las áreas es Comercial, Operaciones, Personas, Finanzas, Documentos, y no hay un área «Clientes».
- El menú se sigue armando desde manifests y permisos.

## 15. Riesgos y rollback

Riesgo bajo: es navegación, sin datos ni migración. Rollback: revertir el squash.

## 16. Reporte de ejecución

Se completa en la descripción del PR.
