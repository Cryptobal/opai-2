import { z } from "zod";

import { capacidadesAcceso, defineModule } from "@opai/capabilities";

/**
 * Manifest del módulo Control de acceso (ADR-003, CAR-78 · E4). Las capacidades viven en
 * packages/capabilities/src/acceso. Las pantallas (ERP «Accesos» y portería en Terreno) llegan con su diseño
 * aprobado; por ahora el módulo solo declara permisos y capacidades.
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
  navegacion: [],
  configuracion: z.object({}),
  eventos: [],
  capacidades: capacidadesAcceso,
});
