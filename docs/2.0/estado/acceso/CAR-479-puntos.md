# CAR-479 · Puntos de acceso por instalación (parte 2)

**Sesión:** Acceso · 15-nov-2026. Padre: CAR-122. **Apilado sobre #917 (CAR-479 parte 1).**

## Qué entró

- **Migración aditiva `20270124110000_acceso_puntos`:** tabla `acceso.puntos` (nombre, tipo peatonal, vehicular o mixto, activo y orden; RLS FORCE con `tenant_isolation`, trigger `mismo_tenant`; `opai_app` sin `DELETE`) y columna opcional `registros_acceso.punto_id` con su FK y trigger de mismo tenant.
- **Capacidades** (UI, API y MCP, como pide la especificación §9): `acceso.puntos.list` (`acceso:read`, lectura auditada) y `acceso.puntos.set` (`acceso:config.manage`, vista previa, aprobación humana para agentes). Un punto que no viene en la lista queda inactivo; no se borra.
- **Portería:** «en sitio» trae los puntos activos; con más de uno, el teléfono elige y recuerda desde cuál registra (también las entradas por QR de prerregistro). El servidor guarda el punto solo si es activo de la instalación del equipo; si no, la entrada entra igual, sin punto.
- **ERP:** tarjeta «Puntos de acceso» en Accesos › Configuración de la instalación y «Punto de acceso» en la ficha del registro.
- Pruebas: `acceso-puntos-db.test.ts` (3, Postgres real, dos empresas); el entorno de dos empresas se comparte con `acceso-config-db.test.ts` (`acceso-entorno-a-b.ts`).

## Decisiones de la sesión (reversibles)

- Sin índice único por nombre: la capacidad valida nombres distintos (también contra los inactivos). Evita renombrar en dos pasadas al reordenar.
- Un punto inválido o inactivo no rechaza la entrada (la portería puede estar sin red con una lista vieja); queda sin punto.
- El orden es el de la lista que se guarda; los inactivos van al final.
- **Referente seguido y en qué se aparta:** Envoy Visitors (varias entradas por sede, cada iPad fijo en una). Se aparta en que el teléfono no queda amarrado al punto: lo elige el guardia y se recuerda en el equipo, porque un mismo guardia puede cubrir varias puertas con el mismo teléfono.

## Qué queda

- Cartel de privacidad por punto (CA9) y grupos de puntos (§7).
- **Migración:** se aplica con snapshot previo de Neon (dev y main) antes de integrar, después de la de #917.
