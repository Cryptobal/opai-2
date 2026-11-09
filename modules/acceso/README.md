# Control de acceso (`acceso`)

Portería: entrada y salida de personas y vehículos por la cola de Terreno, listas autorizada y bloqueada, e intentos
denegados. Especificación: `docs/2.0/modulos/control-acceso.md`. Del documento solo se guarda su **huella** (HMAC con
`ACCESO_HUELLA_SECRET`) y su **máscara**; nunca el número completo (decisión de Carlos, 7-nov-2026).

- Dominio puro (documento, máscara, huella, cruce con listas): `packages/domain/src/acceso`.
- Capacidades: `packages/capabilities/src/acceso`. Ingesta de la cola: `packages/capabilities/src/core/terreno/acceso-*.ts`.
- Tablas: `packages/db/prisma/schema/acceso.prisma` (schema `acceso`, RLS por empresa, hechos de solo inserción).
