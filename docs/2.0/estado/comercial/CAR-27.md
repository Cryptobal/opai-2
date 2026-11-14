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

- PR 2: valores por ficha (`core.campos_personalizados.valores.get/set`) con permiso y alcance de cada entidad.
- PR 3: pantallas de configuración y de ficha, y tokens de documentos.

## PR fusionar cuentas (F1) · rama `brief/car-27-fusionar`

- **Estado:** Abierto (apilado sobre el PR 1/3 de campos personalizados)
- **Migración:** No

### Qué entra

Brief `docs/2.0/briefs/BRIEF-CAR-27-fusionar.md`. Capacidad `core.cuentas.fusionar` (`efecto: "irreversible"`, así que un agente necesita aprobación humana; acepta `dryRun`).

- **Vista previa:** devuelve la comparación campo por campo y cuánto se mueve.
- **Al ejecutar:** mueve todo lo del duplicado (contactos, instalaciones, negocios, documentos, actividad, etiquetas, campos personalizados, portal, correos y facturas), resuelve los choques a favor de la cuenta que queda y borra el duplicado.
- **Se bloquea con explicación cuando:**
  - hay contactos con el mismo correo en las dos cuentas;
  - el duplicado tiene facturas emitidas y el RUT final es otro;
  - el duplicado tiene consentimiento de referencia comercial (registro legal append-only).
- Una prueba compara el inventario de tablas con FK a cuentas contra la base.

**Decisiones nocturnas (revisar):** las tres reglas de bloqueo; renombrar a « (fusionada)» la instalación movida si su nombre choca; el estado de la cuenta que queda no cambia.

### Pendiente

- F2: hoja de 4 pasos en la cuenta.
- F3: fusión de contactos.

## PR fusionar contactos (F3) · rama `brief/car-27-fusionar-contactos`

- **Estado:** Abierto (apilado sobre F1)
- **Migración:** No

### Qué entra

Capacidad `core.contactos.fusionar` (`efecto: "irreversible"`, `dryRun`), con la misma forma que la de cuentas. Todo pasa en una transacción con los dos contactos bloqueados. Funciona así:

- Pasan al contacto que queda: los vínculos con cuentas, negocios, actividad, etiquetas, campos personalizados, documentos, firmas, correos, accesos al portal, seguimientos y solicitudes.
- Si el duplicado era el contacto principal de una cuenta compartida, el que queda pasa a ser el principal.
- El correo del duplicado se libera antes de asignarlo.
- Se bloquea si el duplicado firmó un consentimiento de referencia comercial, porque ese registro es append-only.

Una prueba compara el inventario de FK con la base. Falta la pantalla.

## Pendientes vistos en el e2e completo (13-nov-2026)

- Con el diseño nuevo de listas de `main` fallan tres pruebas de Comercial que no tocaron estos PR: `crm-vinculos` (cuentas vinculadas), `cuenta-sii` (resumen «Lista para facturar», que queda oculto) y `actividad-tareas-car162` (la tarea no aparece en «Mis tareas»). Hay que revisarlas en un PR propio.
- Avance (13-nov, noche): #682 arregla `cuenta-sii` (pasa a 375, 1024 y 1280 px) y `crm-vinculos` (pasa a 375 y 1280; en iPad falló en un shard cortado por tiempo, sin informe). `actividad-tareas-car162` no era un problema de localizadores: dejó de pasar entre el e2e nocturno del 12-nov (verde) y el 13-nov; la tarea sale en la actividad del negocio pero «Mi equipo» queda vacío. La capacidad `core.actividades.tareas` con `equipo` devuelve la tarea en una prueba contra Postgres, así que la causa está en la pantalla o en el contexto de la sesión. Investigación en curso con diagnóstico en el spec.
- `negocios-car33 › nuevo negocio` fallaba el primer intento porque la hoja diferida se compila al abrirse: #691 la calienta en `e2e/calentar.ts`.
- #688 corrige `finanzas-flujo-resumen-db.test.ts` (esperaba `ajustes`, que CAR-391 retiró), que tenía rojo `test:db` en `main` para todos.
