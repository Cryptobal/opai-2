# BRIEF CAR-27 · Campos personalizados en cuentas, contactos y negocios

> DECISIÓN CARLOS (13-nov-2026, 22:05 Chile): se hace ahora, no después de la v1.0. No hay diseño exportado en Claude Design; se construye con la especificación de `design/DESIGN-PROMPT-crm-pr3.md` §3 y el patrón de HubSpot, con el sistema de diseño vigente. **Decisión nocturna (revisar):** las pantallas de este brief se arman con los patrones del DS sin diseño aprobado.

## 1. Objetivo
Que cada empresa agregue sus propios datos a cuentas, contactos y negocios sin tocar código, como «Rubro» o «N° de guardias». Son las «propiedades a medida por objeto» de `REFERENTES-saas.md` §4.

## 2. Estado actual (verificado en `main` 816d3b5…)
- No hay campos personalizados. `modulos/comercial.md` §11 y `extraccion/comercial-y-cpq.md` los dejaban en backlog.
- `core/campos` es el catálogo **fijo** de tokens para documentos (CAR-138). No es lo mismo, pero se reutilizará en el PR 3 para exponer los campos personalizados como tokens.
- Las etiquetas (`core.etiquetas`, CAR-26) son el patrón más parecido: un catálogo del tenant, la configuración para owner y admin, y la asignación a cuenta, contacto o negocio.

## 3. Alcance
Tres PR, uno por bloque:
1. **PR 1 · Catálogo.** Tabla, migración, permiso y capacidades para listar, crear y editar definiciones, con MCP.
2. **PR 2 · Valores.** Leer y guardar los valores de una ficha, validados por tipo. Los obligatorios se exigen al guardar desde la pantalla.
3. **PR 3 · Pantallas.**
   - «Configuración → Comercial → Campos», como lista ordenable.
   - La sección «Campos de <empresa>» en el resumen de cada ficha y en los formularios de crear y editar.
   - Los campos como tokens de documentos.

Fuera de alcance: campos calculados, campos en instalaciones o personas, y filtros de lista por campo personalizado (queda pendiente).

## 4. Arquitectura
- **Datos:** `core.campos_personalizados` (definición) y `core.campo_valores` (un valor por campo y entidad). El valor es `jsonb`, validado en la capacidad según el tipo.
- **Tipos:** `texto` (≤ 500), `numero` (decimal), `fecha` (`AAAA-MM-DD`), `lista` (una opción de `opciones`) y `si_no`.
- **Entidades:** `cuenta`, `contacto` y `negocio`. El campo pertenece a una sola entidad.
- **Clave estable:** `clave` en snake_case, única por empresa y entidad. Se deriva del nombre al crear y no cambia.
- Un campo no se borra: se **archiva** (`activo = false`). Así se conservan los valores y su historia.

## 5. Archivos
`packages/domain/src/campos-personalizados.ts` (tipos, clave y validación pura), `packages/domain/src/permisos-*.ts`, `packages/db/prisma/schema/crm.prisma`, migración, `packages/capabilities/src/core/campos-personalizados/*`, tests e instantáneas de paridad.

## 6. Modelo de datos y migraciones (aditivas)
- `core.campos_personalizados`: `id`, `tenant_id`, `entidad`, `clave`, `etiqueta`, `tipo`, `opciones text[]`, `obligatorio`, `orden int`, `activo`, timestamps.
  - Restricción única `(tenant_id, entidad, clave)` y CHECK de `entidad` y `tipo`.
- `core.campo_valores`: `id`, `tenant_id`, `campo_id` (FK con cascada) y exactamente una de `cuenta_id`, `contacto_id` o `negocio_id` (CHECK), más `valor jsonb` y timestamps.
  - Unicidad por campo y entidad.
- RLS ENABLE + FORCE con `tenant_isolation`, trigger `verificar_mismo_tenant` y `SET LOCAL lock_timeout`.

## 7. Capacidades
- `core.campos_personalizados.list`: lectura con `core:cuentas.read`. Filtros: entidad e incluir archivados. Sigue el contrato de listas (CAR-353).
- `core.campos_personalizados.create` y `.update`: el permiso nuevo `core:campos.config` (owner y admin). Con `dryRun`.
- (PR 2) `core.campos_personalizados.valores.get` y `.valores.set`. Usan el permiso de lectura o gestión de la entidad y su alcance (ADR-022).

## 8. Interfaz y responsive
En el PR 3, con los patrones `ListScreen` y `FormScreen` del DS, a 375, 1024 y 1280 px.

## 9. Seguridad y tenant
- RLS por tenant.
- El permiso de configuración solo para owner y admin.
- Los valores respetan el alcance de la ficha.
- Sin datos personales en la auditoría: solo IDs.

## 10. Casos límite
- Nombre duplicado en la misma entidad: conflicto.
- Lista sin opciones: rechazo.
- Cambiar el tipo de un campo con valores: no se permite. Se archiva y se crea otro.
- Quitar una opción de una lista: los valores existentes se conservan y se muestran como «(opción retirada)».

## 11. Plan por bloques (PR 1)
1. Dominio: tipos, clave y validación, con tests.
2. Permiso `core:campos.config`.
3. Modelo y migración.
4. Capacidades del catálogo, con tests y paridad.
5. Estado de CAR-27.

## 12. Tests
- Dominio: clave y validación por tipo.
- Capacidad con contexto falso: permisos y conflicto.
- `*-db.test.ts`: RLS, una empresa que no ve lo de otra, y la unicidad.

## 13. Validación
Los checks de GitHub en verde. Migración aplicada con snapshot de Neon en `dev` y `main`.

## 14. Criterios de aceptación
Se pueden crear, editar, ordenar y archivar campos por entidad desde el MCP, con permiso y aislamiento por tenant probados.

## 15. Riesgos y rollback
Migración aditiva: el rollback es no usar las tablas. Antes de aplicarla se toma un snapshot de Neon.

## 16. Reporte de ejecución
Se completa en `docs/2.0/estado/comercial/CAR-27.md`.
