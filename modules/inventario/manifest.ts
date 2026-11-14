import { z } from "zod";

import { capacidadesInventario, defineModule, PERMISOS_INVENTARIO } from "@opai/capabilities";

/**
 * Manifest del módulo Inventario (ADR-116, CAR-235). Se vende aparte. Catálogo de tipos de activos
 * (por unidad, con campos propios), activos por unidad (CAR-236) y de ropa (por talla, ligada al uniforme de Personas). Las
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
    { id: PERMISOS_INVENTARIO.gestionar, descripcion: "Registrar y mantener activos, existencias y entregas" },
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
    { id: "inventario.activo.creado", descripcion: "Se registró un activo." },
    { id: "inventario.activo.actualizado", descripcion: "Se corrigieron los datos de un activo." },
    { id: "inventario.activo.estado_cambiado", descripcion: "Un activo pasó a reparación, volvió o se dio de baja." },
    { id: "inventario.ropa.ingresada", descripcion: "Ingresaron unidades de ropa a las existencias." },
    { id: "inventario.ropa.ajustada", descripcion: "Se corrigió la cantidad de una talla de ropa." },
    { id: "inventario.entrega.registrada", descripcion: "Se entregó un activo o ropa a una persona o instalación." },
    { id: "inventario.entrega.devuelta", descripcion: "Se devolvió una entrega de inventario." },
  ],
  capacidades: capacidadesInventario,
});
