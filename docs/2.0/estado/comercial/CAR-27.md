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

## PR campos personalizados 1/3 · rama `brief/car-27-campos-personalizados`

- **Estado:** Abierto
- **Migración:** Sí (`20261226100000_core_campos_personalizados`, aditiva)

### Qué entra

Brief `docs/2.0/briefs/BRIEF-CAR-27-campos-personalizados.md` (3 PR: catálogo, valores, pantallas). Este primero trae el catálogo: tablas `core.campos_personalizados` y `core.campo_valores` (RLS con FORCE, `tenant_isolation`, trigger de mismo tenant, CHECK de entidad, tipo, clave y opciones), permiso nuevo `core:campos.config` (owner y admin), dominio puro (`claveCampoPersonalizado`, `validarValorCampo`, `normalizarOpcionesCampo`) y capacidades `core.campos_personalizados.list` (contrato de listas), `.create` y `.update` con `dryRun` (el tipo y la clave no cambian; archivar con `activo`). Herramientas MCP nuevas en la instantánea y el inventario. **Decisión nocturna (revisar):** no hay diseño aprobado para estas pantallas; el PR 3 usará los patrones del DS (FormScreen y la ficha) y se marcará para tu revisión.

### Pendiente

- Tokens de documentos para los campos personalizados (`{{cuenta.campo.<clave>}}`).

## PR campos personalizados 2/3 · rama `brief/car-27-campos-valores`

- **Estado:** Abierto (apilado sobre el PR 1/3)
- **Migración:** No

### Qué entra

Valores por ficha: `core.valores_personalizados.get/set` (cuentas y contactos, permisos `core:cuentas.read`/`core:cuentas.manage` y alcance de la cuenta o del contacto) y `comercial.negocio_campos.get/set` (negocios, permisos de Comercial). `set` cambia solo las claves enviadas, `null` borra, valida tipo y opciones contra el catálogo activo de **esa** entidad (una clave de otra entidad se rechaza), no deja vaciar un obligatorio, acepta `dryRun` y emite un evento sin valores (solo las claves). La lectura se audita con el id de la ficha.

## PR campos personalizados 3/3 · rama `brief/car-27-campos-pantallas`

- **Estado:** Abierto (apilado sobre el PR 2/3)
- **Migración:** No

### Qué entra

- **Configuración › Operación › Campos personalizados** (`/configuracion/campos-personalizados`, permiso `core:campos.config`): campos por entidad (Cuentas, Contactos, Negocios), con «Nuevo campo» y «Editar» en una hoja (nombre, tipo, opciones de lista, obligatorio y archivar).
- **Tarjeta «Campos de <empresa>» (título del Design Prompt del PR 3 §3)** en las fichas de cuenta, contacto y negocio. Solo aparece si hay campos definidos para esa entidad; muestra los valores y tiene un botón «Editar» (con el permiso de edición de la ficha) que guarda solo lo que cambió.
- El error de guardado nombra cada campo que falló.
- Entrada de novedades y prueba `@preview`.

**Decisiones nocturnas (revisar):**
1. Sin diseño aprobado: se usaron los patrones del DS (lista con hoja, como Planes de seguimiento; tarjeta de ficha como Etiquetas).
2. La entrada va en el grupo **Operación** porque Empresa ya tiene el máximo de 7.
3. Los tokens de documentos para estos campos quedan pendientes.

## Pendientes vistos en el e2e completo (13-nov-2026)

- Con el diseño nuevo de listas de `main` fallan tres pruebas de Comercial que no tocaron estos PR: `crm-vinculos` (cuentas vinculadas), `cuenta-sii` (resumen «Lista para facturar», que queda oculto) y `actividad-tareas-car162` (la tarea no aparece en «Mis tareas»). Hay que revisarlas en un PR propio.
- Avance (13-nov, noche): #682 arregla `cuenta-sii` (pasa a 375, 1024 y 1280 px) y `crm-vinculos` (pasa a 375 y 1280; en iPad falló en un shard cortado por tiempo, sin informe). `actividad-tareas-car162` no era un problema de localizadores: dejó de pasar entre el e2e nocturno del 12-nov (verde) y el 13-nov; la tarea sale en la actividad del negocio pero «Mi equipo» queda vacío. La capacidad `core.actividades.tareas` con `equipo` devuelve la tarea en una prueba contra Postgres, así que la causa está en la pantalla o en el contexto de la sesión. Investigación en curso con diagnóstico en el spec.
- `negocios-car33 › nuevo negocio` fallaba el primer intento porque la hoja diferida se compila al abrirse: #691 la calienta en `e2e/calentar.ts`.
- #688 corrige `finanzas-flujo-resumen-db.test.ts` (esperaba `ajustes`, que CAR-391 retiró), que tenía rojo `test:db` en `main` para todos.
