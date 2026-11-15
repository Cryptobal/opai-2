import { z } from "zod";

import { capacidadesAcceso, defineModule } from "@opai/capabilities";

/**
 * Manifest del módulo Control de acceso (ADR-003, CAR-78 · E4, CAR-474). Las capacidades viven en
 * packages/capabilities/src/acceso. Pantallas: «Accesos» del ERP (área Operaciones, `/accesos`) y la portería
 * de Terreno (`/terreno/porteria`).
 */
export const manifest = defineModule({
  id: "acceso",
  nombre: "Control de acceso",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    {
      id: "acceso:read",
      descripcion: "Ver los registros de acceso y quién está en sitio (documentos enmascarados)",
    },
    {
      id: "acceso:listas.manage",
      descripcion: "Gestionar las listas autorizada y bloqueada de una instalación",
    },
    {
      id: "acceso:datos.ver_patente",
      descripcion: "Ver la patente completa de los vehículos registrados (acceso restringido)",
    },
  ],
  navegacion: [
    {
      portal: "erp",
      area: "operaciones",
      href: "/accesos",
      etiqueta: "Accesos",
      icono: "DoorOpen",
      orden: 60,
      permiso: "acceso:read",
    },
  ],
  configuracion: z.object({}),
  eventos: [],
  capacidades: capacidadesAcceso,
});
