import { z } from "zod";

import { defineModule } from "@opai/capabilities";

import { capacidades } from "./capabilities";

/**
 * Manifest del módulo Portal Trabajador (ADR-003, Brief 15). El núcleo deriva navegación, permisos,
 * configuración, eventos y herramientas MCP desde aquí. El PR 1 entrega las capacidades del propio
 * trabajador (mis datos, preferencias de aviso); Rondas, Central, Accesos y Mi pauta llegan en el
 * PR 2 (ver `docs/2.0/briefs/BRIEF-15-portal-trabajador.md`). Las capacidades del propio trabajador
 * no piden permiso: su alcance es la persona vinculada a su usuario (ADR-022).
 */
export const manifest = defineModule({
  id: "portal_trabajador",
  nombre: "Portal Trabajador",
  version: "0.1.0",
  dependencias: [],
  permisos: [],
  navegacion: [],
  configuracion: z.object({}),
  eventos: [
    {
      id: "portal_trabajador.mis_datos.actualizados",
      descripcion: "El trabajador actualizó su contacto o su dirección desde el portal.",
    },
  ],
  capacidades,
});
