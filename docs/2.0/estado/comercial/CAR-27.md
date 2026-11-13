# CAR-27 · Comercial PR 3: reportes, exportación, campos personalizados, fusión y transferencia

- **Sesión:** Sesión Comercial

## PR #633 · rama `brief/car-27-transferir-negocios`

- **Estado:** Integrado (#633 `38d880d2`, 13-nov-2026)
- **Migración:** No

### Qué entra

Botón **Transferir cartera** en Negocios (tablero y lista; diseño `export-crm-v3-cierre/Negocios·cartera`): hoja con De, Nuevo responsable, «Tareas pendientes» y mensaje; antes de confirmar muestra cuántos negocios, el monto mensual y las tareas que se mueven (vista previa de la misma capacidad). Capacidad nueva `comercial.negocios.transferir` (MCP `comercial_negocios_transferir`, con `dryRun`): los negocios elegidos (`negocioIds`, hasta 200) o la cartera abierta de una persona (`deResponsableId`); solo abiertos y sin archivar; omite con motivo los no encontrados, cerrados y los que ya son del nuevo responsable; pasa las tareas pendientes de esos negocios; evento `comercial.negocio.actualizado` por negocio y aviso in-app al nuevo responsable con el mensaje. Lectura nueva `comercial.negocios.responsables` (MCP `comercial_negocios_responsables`): usuarios activos del ERP con sus negocios abiertos (sin contactos de clientes). Sin migración. **Decisiones nocturnas (revisar):** (1) la pantalla transfiere la **cartera de una persona**; la selección múltiple de negocios del diseño queda en la capacidad y el MCP (la lista actual no tiene selección); (2) las **cuentas** no se transfieren: en 2.0 no tienen responsable; (3) el aviso es in-app (sin correo).

## PR #635 · rama `brief/car-27-responsable-ficha`

- **Estado:** Integrado (#635 `7f3d1cf6`, 13-nov-2026)
- **Migración:** No
- **Apilado sobre:** #633 (integrado)

### Qué entra

La hoja «Editar negocio» suma el campo **Responsable** (personas del ERP de `comercial.negocios.responsables`); guarda con `comercial.negocios.update`, que ya aceptaba `responsableId`. Antes no había forma de cambiar el responsable desde la pantalla. Sin capacidad nueva ni migración. **Decisión nocturna (revisar):** sin prueba `@preview` porque `qa-e2e` no tiene negocios que editar.

## Pendientes vistos en el e2e completo (13-nov-2026)

- Con el diseño nuevo de listas de `main` fallan tres pruebas de Comercial que no tocaron estos PR: `crm-vinculos` (cuentas vinculadas), `cuenta-sii` (resumen «Lista para facturar», que queda oculto) y `actividad-tareas-car162` (la tarea no aparece en «Mis tareas»). Hay que revisarlas en un PR propio.
