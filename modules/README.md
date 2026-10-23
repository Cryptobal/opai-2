# modules/

Un directorio por módulo vendible (`modules/<id>/`) y el registro (`modules/registry`).

Crear un módulo: `pnpm scaffold:module <id> --nombre "<Nombre>"`. Genera `manifest.ts`, dominio puro con test,
capacidades, una pantalla de ejemplo y el archivo `packages/db/prisma/schema/<id>.prisma`, y lo registra.

Reglas (ADR-003): el módulo solo importa de `packages/*` y de los módulos declarados en `dependencias`;
sus tablas viven en el schema de Postgres `<id>` con `tenant_id` y RLS; toda lógica se expone como capacidad;
configuración, notificaciones e integraciones se declaran en el manifest y las implementa el núcleo.
