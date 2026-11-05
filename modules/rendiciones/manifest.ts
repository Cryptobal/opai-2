import { defineModule } from "@opai/capabilities";

import { ajustesRendiciones, capacidades } from "./capabilities";

/**
 * Manifest del módulo Rendiciones (CAR-175, R1; ADR-003, ADR-048). Se vende solo, sin depender de
 * Finanzas. R1 trae el modelo y las capacidades (compra, un nivel de aprobación con aprobador
 * asignado); las pantallas llegan en R2/R3, por eso aún no hay entrada de navegación.
 */
export const manifest = defineModule({
  id: "rendiciones",
  nombre: "Rendiciones",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    { id: "rendiciones:rendir", descripcion: "Crear, editar, enviar y anular las rendiciones propias" },
    { id: "rendiciones:aprobar", descripcion: "Aprobar, rechazar o devolver las rendiciones asignadas" },
    { id: "rendiciones:ver_todas", descripcion: "Ver todas las rendiciones de la empresa" },
    { id: "rendiciones:config.manage", descripcion: "Configurar el módulo Rendiciones" },
  ],
  navegacion: [],
  configuracion: ajustesRendiciones,
  eventos: [
    { id: "rendiciones.rendicion.creada", descripcion: "Se creó una rendición en borrador." },
    { id: "rendiciones.rendicion.editada", descripcion: "Se editó una rendición." },
    { id: "rendiciones.rendicion.enviada", descripcion: "Una rendición se envió a aprobación." },
    { id: "rendiciones.rendicion.aprobada", descripcion: "Una rendición fue aprobada." },
    { id: "rendiciones.rendicion.rechazada", descripcion: "Una rendición fue rechazada." },
    { id: "rendiciones.rendicion.devuelta", descripcion: "Una rendición fue devuelta a quien rinde." },
    { id: "rendiciones.rendicion.anulada", descripcion: "Una rendición fue anulada." },
  ],
  capacidades,
});
