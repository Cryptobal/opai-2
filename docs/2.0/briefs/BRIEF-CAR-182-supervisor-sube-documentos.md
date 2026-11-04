# BRIEF CAR-182 · El supervisor sube documentos a sus instalaciones

Tarea: [CAR-182](https://linear.app/carlos-irigoyen/issue/CAR-182). Continúa el [brief de «Vincular a»](BRIEF-CAR-182-explorador-vincular-a.md) (§15, «Pendiente: el supervisor sube a sus instalaciones desde el explorador») y la adenda de ADR-019 / ADR-022 «El supervisor sube documentos a sus instalaciones». **Decisión de Carlos del 4-nov-2026, 17:10.** **Este PR toca permisos y alcance: requiere el comentario «Revisor OPAI 2.0: sin bloqueos» sobre el head antes de integrar.**

## 1. Objetivo

Que un supervisor suba documentos (actas, informes) vinculados **solo a las instalaciones que tiene a su cargo**, desde `/documentos`, sin darle `core:documentos.manage`.

## 2. Estado actual (verificado en `main` `58d8a717`)

- `core:documentos.manage` lo tienen owner, admin y gerente; supervisor y viewer no (`permisos-nucleo.test.ts`). Las capacidades `core.documentos.iniciar_subida` y `core.documentos.confirmar_subida` exigen ese permiso.
- `ctx.alcance.instalaciones` (ADR-022) ya acota por filas: `verificarEntidad` rechaza (`NOT_FOUND`) lo que el actor acotado no tiene a cargo, y la empresa nunca está en su alcance.
- `puedeSubir` del explorador excluía al supervisor. La visibilidad del documento (`visibleEn`) sale del tipo (`visiblePortalDefault`) al crear, y se cambia luego con `core.documentos.update` (que exige `manage`).
- Los roles son código (`PATRONES_POR_ROL`), con roles personalizados y excepciones por usuario ya resueltos por `tienePermisoEfectivo`: **no hay roles por tenant guardados en base que exijan migrar**.

## 3. Alcance

**Entra**

- Permiso nuevo `core:documentos.subir_alcance` (módulo `core`, recurso `documentos`, acción `subir_alcance`, coherente con `<modulo>:<recurso>.<accion>`), concedido a supervisor en `PATRONES_POR_ROL`. Owner, admin y gerente lo cubren por comodín; viewer no (`*:*.read` no lo alcanza).
- `iniciar_subida` y `confirmar_subida` aceptan el permiso nuevo **como alternativa** a `documentos.manage` (`Capacidad.permisosAlternos`). Quien tiene `manage` conserva todo igual.
- Quien tiene el permiso nuevo y no `manage` (subida acotada):
  - (a) solo sube a una **instalación** cuyo id está en `ctx.alcance.instalaciones`;
  - (b) no sube a la empresa, a cuentas, a personas ni a puestos, ni versiona (`reemplazaAId`);
  - (c) el documento queda con `visibleEn = []` (no se publica a portal cliente ni trabajador), sin importar el tipo;
  - confirma solo lo que subió él mismo.
- Explorador: «Subir» aparece con el permiso nuevo y alcance por filas; «Vincular a» ofrece solo «Instalación» (candidatos de `core.instalaciones.list`, que ya aplica el alcance); la hoja no muestra ni envía la visibilidad.
- Etiquetas del permiso en la matriz de roles y en las keys.

**No entra**

- Editar, borrar, versionar, vincular o cambiar visibilidad: siguen siendo de `documentos.manage`.
- La hoja de subir del portal supervisor (`puedeGestionarDocumentos`, por ficha): sigue con `manage`. Se puede alinear después.
- Migración: ninguna (ver §6).

## 4. Arquitectura

- `Capacidad.permisosAlternos` (`types.ts`): `denegar` (ejecución) y `esVisible` (MCP) usan `tienePermisoDeCapacidad(ctx, c)`: el permiso principal **o** uno alterno. El handler acota; la autorización por sí sola no concede nada más.
- `core/documentos/subida-acotada.ts`: `subidaAcotada(ctx)` (= no tiene `manage`), `exigirDestinoAcotado` y `VISIBILIDAD_ACOTADA`. `verificarEntidad` sigue corriendo después (defensa en profundidad: existencia y alcance con locks).
- Errores: un tipo de destino no permitido o `reemplazaAId` da `FORBIDDEN` «Sin permiso para esta capacidad.» (el mismo mensaje de antes del permiso); una instalación fuera de alcance o inexistente da `NOT_FOUND` «La entidad instalacion», idéntico en ambos casos (no revela existencia). Sin alcance por filas (ve todo el tenant) y sin `manage`, ninguna instalación pasa: el permiso es para actores acotados.
- UI: `opcionesDeSubida` (`(erp)/documentos/_componentes/subida-permisos.ts`) decide `puedeSubir`, `vinculables` y `acotada`; `OpcionesVincular.acotada` oculta la visibilidad y no la envía. La UI solo ofrece; la capacidad decide.

## 5. Archivos

`packages/domain/src/{permisos-catalogo,permisos-patrones,permisos-nucleo.test}.ts` · `packages/capabilities/src/{types,autorizacion,mcp}.ts` · `packages/capabilities/src/core/documentos/{subida,confirmar,subida-acotada}.ts` · `apps/web/app/(erp)/documentos/{page.tsx,_componentes/{datos,subida-permisos}.ts}` · `apps/web/app/_components/documentos/{campo-vincular,use-destino,hoja-subir}.tsx` · etiquetas de permisos (`configuracion/usuarios/_permisos/etiquetas.ts`, `configuracion/agentes/etiqueta-permiso.ts`) · pruebas (§12) · este brief, `ESTADO.md`, adenda en `01-decisiones.md`.

## 6. Modelo de datos y migraciones

Ninguna. Los roles base son código; los roles personalizados guardan listas de permisos existentes y no incluyen el nuevo hasta que un administrador lo agregue (un rol personalizado con `manage` no se ve afectado: `permisosAlternos` es una alternativa, no un reemplazo).

## 7. Capacidades

Ninguna nueva ni cambia el esquema de entrada o salida: la herramienta MCP `core_documentos_iniciar_subida` es la misma; solo cambia quién la ve y qué puede hacer cada actor. `tools/list` y `herramientas-mcp.txt` no cambian; `paridad-inventario` en verde sin regenerar.

## 8. Interfaz y responsive

Hoja «Subir documento» del explorador, igual que con «Vincular a», pero para el supervisor: «Vincular a» muestra solo «Instalación» con su buscador (filas de 44 px), el texto de la hoja dice «Elige a qué se vincula antes de agregar el archivo.» hasta elegir, y no aparece «Visible en portal». Una columna a 375 px; hoja lateral a 1024 y 1280 px. Solo `@opai/ds`.

## 9. Seguridad y tenant

- Permiso nuevo y estrecho; el alcance se aplica en la capacidad (`ctx.alcance`) y en `verificarEntidad` (locks), nunca solo en la UI (ADR-022).
- Visibilidad fija en `[]`: el supervisor no puede publicar a portales, y no puede cambiarla después (`core.documentos.update` exige `manage`).
- Aislamiento: el tenant sale de la sesión; una instalación de otra empresa no existe para el actor (RLS + alcance).
- Una API key hereda permiso y alcance de su usuario; una key de servicio con el permiso nuevo en su lista sube con las mismas reglas.
- El documento acotado solo lo confirma quien lo subió: un supervisor no confirma lo pendiente de otro ni de un gerente.

## 10. Casos límite

Supervisor sin instalaciones a cargo (no ve «Subir»); instalación reasignada entre abrir la hoja y subir (el servidor responde `NOT_FOUND`); gerente con `manage` denegado por excepción (conserva el permiso por comodín pero sin alcance por filas: no sube a nada); rol personalizado sin el permiso nuevo y sin `manage` (no sube); supervisor con `manage` concedido por excepción (sube como siempre, sin restricción nueva; el explorador sigue sin ofrecerle «Subir», como antes, y usa la ficha).

## 11. Plan por bloques

1. `core: permiso core:documentos.subir_alcance y subida acotada a instalaciones a cargo`.
2. `documentos: el supervisor sube a sus instalaciones desde el explorador`.
3. `documentos: pruebas de base de la subida acotada con dos empresas`.
4. `docs: brief, ESTADO y adenda de ADR-019/ADR-022`.

## 12. Tests

- `packages/domain/src/permisos-nucleo.test.ts`: `subir_alcance` = owner, admin, gerente y supervisor sí; viewer no.
- `packages/capabilities/test/documentos-subir-alcance.test.ts` (en memoria): sube a instalación de su alcance (vista previa y real, visibilidad `[]` aunque el tipo traiga portales; quien gestiona sí hereda la del tipo); instalación fuera de alcance o inexistente (`NOT_FOUND`); empresa, cuenta, persona y puesto (`FORBIDDEN`); sin versionar; sin alcance por filas; tipo de otra capa; viewer o permiso denegado por excepción; quien gestiona conserva todo; confirmar solo lo propio; el MCP lo ofrece al supervisor y no al viewer.
- `packages/capabilities/test/documentos-subir-alcance-db.test.ts` (Postgres real, RLS, dos empresas): lo mismo con alcance real y aislamiento entre empresas. **No se pudo ejecutar localmente (sin `DATABASE_URL_TEST`); corre en CI (`test:db`).**
- `apps/web/test/documentos-subida-acotada.test.ts`: qué ofrece el explorador por rol y el vínculo de partida; `permisos-etiquetas.test.ts`.

## 13. Validación

`pnpm typecheck && pnpm lint && pnpm test` (paquetes tocados con `tsc --noEmit` y `eslint`); `pnpm test:db` en CI. Capturas a 375, 1024 y 1280 px del supervisor pendientes de QA en `test.opai.cl`: el constructor no tuvo base ni sesión para levantar la pantalla.

## 14. Criterios de aceptación

1. El supervisor con instalaciones a cargo ve «Subir» en `/documentos` y solo puede vincular a sus instalaciones.
2. El servidor rechaza instalación fuera de alcance, empresa, cuenta y persona, y deja la visibilidad vacía (pruebas).
3. `documentos.manage` sin cambios; viewer sin acceso.
4. Sin migración; paridad en verde; CI en verde; Revisor sin bloqueos sobre el head.

## 15. Riesgos y rollback

- El supervisor no puede corregir un error (borrar, reemplazar, cambiar visibilidad): lo hace un gerente. Decisión de alcance mínimo; se puede ampliar con otro permiso estrecho.
- Para llegar a `/documentos` el supervisor necesita el portal ERP en su membresía (los portales los asigna el administrador por usuario); sin él no ve el explorador.
- El portal supervisor (fichas) mantiene `manage`; si se quiere el mismo permiso allí, es un PR aparte.
- Rollback: revertir el PR; no hay datos migrados. Los documentos ya subidos quedan.

## 16. Reporte de ejecución

Ver el PR y la fila «CAR-182 · El supervisor sube documentos» en `ESTADO.md`.
