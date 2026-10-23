import { z } from "zod";

import { defineModule } from "@opai/capabilities";

import { capacidades } from "./capabilities";

/** Manifest del módulo __NOMBRE__ (ADR-003). El núcleo deriva todo lo transversal desde aquí. */
export const manifest = defineModule({
  id: "__ID__",
  nombre: "__NOMBRE__",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    { id: "__ID__:read", descripcion: "Ver __NOMBRE__" },
    { id: "__ID__:write", descripcion: "Editar __NOMBRE__" },
  ],
  navegacion: [{ portal: "erp", href: "/__ID__", etiqueta: "__NOMBRE__", icono: "LayoutGrid", orden: 100 }],
  configuracion: z.object({}),
  eventos: [],
  capacidades,
});
