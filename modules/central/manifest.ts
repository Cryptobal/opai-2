import { z } from "zod";

import { defineModule } from "@opai/capabilities";

import { capacidades } from "./capabilities";

/**
 * Manifest del módulo Central de monitoreo (CAR-85, Brief 15b; spec docs/2.0/modulos/central.md).
 * Se vende solo y suma reglas por cada fuente activa (pregunta 13). PR 1 (CAR-461): alertas manuales,
 * estados y bitácora. La entrada de navegación llega con las pantallas (PR 6, CAR-472).
 */
export const manifest = defineModule({
  id: "central",
  nombre: "Central",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    { id: "central:alertas.ver", descripcion: "Ver la cola y las alertas de la central" },
    {
      id: "central:alertas.atender",
      descripcion: "Abrir, resolver, cerrar como falsa alarma, reabrir y posponer alertas",
    },
  ],
  navegacion: [],
  configuracion: z.object({}),
  eventos: [
    { id: "central.alerta.abierta", descripcion: "Se abrió una alerta en la central." },
    { id: "central.alerta.resuelta", descripcion: "Una alerta se resolvió o se cerró como falsa alarma." },
    { id: "central.alerta.reabierta", descripcion: "Se reabrió una alerta cerrada." },
    { id: "central.alerta.pospuesta", descripcion: "Se pospuso una alerta por un plazo." },
  ],
  capacidades,
});
