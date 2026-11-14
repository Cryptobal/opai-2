import { z } from "zod";

import { capacidadesInventario, defineModule, PERMISOS_INVENTARIO } from "@opai/capabilities";

/**
 * Manifest del módulo Inventario (ADR-116, CAR-235). Se vende aparte. Catálogo de tipos de activos
 * (por unidad, con campos propios) y de ropa (por talla, ligada al uniforme de Personas). Las
 * capacidades viven en packages/capabilities/src/inventario y el dominio puro en
 * packages/domain/src/inventario. Pantallas en apps/web/app/(erp)/inventario.
 * Especificación: docs/2.0/modulos/inventario.md.
 */
export const manifest = defineModule({
  id: "inventario",
  nombre: "Inventario",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    { id: PERMISOS_INVENTARIO.read, descripcion: "Ver los tipos, activos y existencias de inventario" },
    { id: PERMISOS_INVENTARIO.tiposManage, descripcion: "Configurar el catálogo de tipos de inventario" },
  ],
  navegacion: [
    {
      portal: "erp",
      area: "operaciones",
      href: "/inventario",
      etiqueta: "Inventario",
      icono: "LayoutGrid",
      orden: 60,
      permiso: PERMISOS_INVENTARIO.read,
    },
  ],
  configuracion: z.object({}),
  eventos: [
    { id: "inventario.tipo.creado", descripcion: "Se creó un tipo de inventario." },
    { id: "inventario.tipo.actualizado", descripcion: "Se modificó o desactivó un tipo de inventario." },
  ],
  capacidades: capacidadesInventario,
});
