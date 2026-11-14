# Brief · Plataforma: paridad MCP y brechas (CAR-323, bloque E)

**Sesión:** «Sesión Núcleo» (decisión de Carlos, 12-nov-2026 10:37) · **Revisa:** Plataforma · Proyecto · **Hoja:** [`modulos/plataforma-hoja-alcance.md`](../modulos/plataforma-hoja-alcance.md) §2, §4 y §5 · **PRs:** 1 = A y B (este), 2 = C.

## 1. Objetivo
Lo que en Plataforma solo existía por MCP llega a la pantalla (editar empresa, usuarios de plataforma, auditoría, miembros e invitaciones). Se cierran las brechas de seguridad de §2.9 y se arreglan las de §2 que siguen abiertas.

## 2. Estado actual (verificado en `main` el 12-nov-2026)
- `platform.tenants.update`, `.users.list`, `.users.set_role`, `.auditoria.list`, `.auditoria.estado` y `.bitacora.estado` existían sin pantalla. `platform.usage.summary` no tenía usos.
- `platform.aprobaciones.rechazar` pedía `platform:tenants.read`, así que el rol support podía rechazar. Aprobar tenía el mismo permiso, aunque al ejecutar fallaba.
- `platform.tenants.get` no registraba la empresa objetivo. `platform.precios.set` aceptaba cualquier recurso. La caché de precios duraba 10 minutos.

## 3. Alcance
- **A:** «Editar empresa» en el menú ⋯ de la ficha (nombre, rubro y zona horaria, con vista previa y confirmación); «Usuarios» de plataforma, con el cambio de rol en dos pasos; «Auditoría» global y como pestaña de la ficha, con el estado de las cadenas; pestaña Usuarios con todos los miembros e invitaciones pendientes (reenviar y revocar); retiro de `platform.usage.summary`.
- **B:** aprobar o rechazar una acción de plataforma exige el permiso de esa acción; `tenants.get` audita la empresa objetivo; `precios.set` rechaza recursos que el medidor no conoce; la caché de precios se invalida al fijar un precio y dura 1 minuto.
- **C (PR 2):** módulos, trabajos, consumos, ajustes, títulos y nombres legibles, consultas en secuencia y el catálogo de Control de acceso.

**Diferencias con el encargo (reportadas):**
- La razón social se sigue editando en «Datos tributarios», junto al RUT, porque `perfil_set` exige ambos.
- **El slug no se edita.** Va dentro de cada API key y de los enlaces de invitación, firma y formularios web, así que cambiarlo los rompe. Queda como decisión de Carlos.

## 4. Arquitectura
Capacidades `platform.*` sin empresa (`sinTenant`) con `tenantObjetivo`, sobre las operaciones con nombre de `ctx.plataforma.empresa(id)` (CAR-40). Las operaciones nuevas viven en `packages/db/src/plataforma-empresa-miembros.ts`: miembros, una invitación y revocarla, sin el hash del token. Las pantallas son server-first; las acciones van por `useCapacidad` con `dryRun` antes de confirmar.

## 5. Archivos
- `packages/capabilities/src/core/plataforma/miembros.ts` (nuevo).
- `agentes/aprobaciones-plataforma-resolver.ts`, `plataforma/precios.ts`, `plataforma/auditoria-lista.ts`, `platform-tenants.ts`, `servicios-db.ts`.
- `packages/db/src/plataforma-empresa*.ts` y `plataforma-aprobaciones.ts`.
- `apps/web/app/(platform)/platform/{usuarios,auditoria}/`, la ficha (`hoja-editar-tenant`, `invitaciones-tab`, `administradores-tab`, `auditoria/`), `navegacion-plataforma.ts`, `iconos.ts` y las etiquetas de auditoría.

## 6. Modelo de datos y migraciones
Sin migración.

## 7. Capacidades
- Nuevas:
  - `platform.tenants.miembros` (lectura).
  - `platform.invitaciones.revocar` (escritura).
  - `platform.invitaciones.reenviar` (irreversible, como invitar).
- Cambian:
  - `platform.auditoria.list`: suma los filtros `desde` y `hasta`, y `antes` y `despues` en la salida.
  - `platform.aprobaciones.aprobar` y `.rechazar`: exigen el permiso de la acción.
  - `platform.tenants.get`: registra la empresa objetivo.
  - `platform.precios.set`: valida el recurso.
- Se retira: `platform.usage.summary`.

## 8. Interfaz y responsive
`ListScreen`, `Sheet` y `Dialog` del DS. Filas-tarjeta en el teléfono y tabla desde md. «Revisar» y «Confirmar» en dos pasos. No cambia el marco: Hilo es la etapa H5.

## 9. Seguridad y tenant
- Toda lectura o escritura de plataforma queda en la auditoría global, con la empresa objetivo.
- Una invitación de otra empresa responde «no encontrada»: lo cubren la RLS de `forTenant` y la prueba en base real.
- Nadie cambia su propio rol de plataforma y OPAI conserva un owner (sin cambios).

## 10. Casos límite
- Invitación ya aceptada o vencida: aviso claro.
- Rol de una invitación que ya no existe: se pide invitar de nuevo.
- Recurso de precio inventado: error de validación.
- Support que aprueba o rechaza: «prohibido», y la aprobación queda pendiente.

## 11. Plan por bloques
1. B (seguridad).
2. A (capacidades).
3. A (pantallas).
4. Documentación y ESTADO.

## 12. Tests
- `plataforma-aprobaciones.test.ts`: support no aprueba ni rechaza.
- `plataforma-escrituras-auditoria.test.ts`: `tenants.get` registra la empresa objetivo; un recurso inexistente se rechaza.
- `plataforma-car323-db.test.ts`: editar A no cambia B y la vista previa no escribe; la auditoría de A no trae filas de B; las invitaciones y los miembros no cruzan de empresa.
- Instantánea MCP e inventario de paridad.

## 13. Validación
- `pnpm typecheck`, `lint`, `test`, `test:db`, `build` y `presupuesto`.
- `preview-e2e`: `plataforma-paridad.spec.ts`. Se omite si la cuenta de QA no tiene rol de plataforma (ver Riesgos).

## 14. Criterios de aceptación
- Las capacidades de Plataforma de la hoja §4 tienen pantalla.
- La instantánea MCP sin `platform_usage_summary`, con las nuevas y su `preview_`.
- Las pruebas de B en verde.

## 15. Riesgos y rollback
- **Capturas de Plataforma con la cuenta de QA:** `qa-e2e` no tiene rol de plataforma, y darle uno le abriría todas las empresas, incluida Gard. Las pruebas `@preview` se omiten con el motivo y la verificación visual queda pendiente de una cuenta de plataforma de prueba (decisión de Carlos).
- Rollback: revertir el PR; no hay migración.

## 16. Reporte de ejecución
En el PR y en `ESTADO.md`.
