import type { Prisma } from "../src/index";
import type { PlantillaRol } from "./roles-base-plantillas";

type Existente = {
  id: string;
  tenantId: string;
  nombre: string;
  descripcion: string | null;
  updatedAt: Date;
  permisos: string[];
};

/** CAS: ni una edición de nombre/descripción ni un cambio de permisos concurrente se sobrescribe. */
export function actualizarPlantilla(
  db: {
    rol: { updateMany: (args: Prisma.RolUpdateManyArgs) => Promise<{ count: number }> };
  },
  existe: Existente,
  p: PlantillaRol,
) {
  return db.rol.updateMany({
    where: {
      id: existe.id,
      tenantId: existe.tenantId,
      nombre: p.nombre,
      sistema: false,
      updatedAt: existe.updatedAt,
      descripcion: existe.descripcion,
      permisos: { equals: existe.permisos },
    },
    data: { descripcion: p.descripcion, permisos: [...p.permisos] },
  });
}
