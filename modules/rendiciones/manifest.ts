import { defineModule } from "@opai/capabilities";

import { ajustesRendiciones, capacidades } from "./capabilities";

/**
 * Manifest del módulo Rendiciones (CAR-175, R1; ADR-003, ADR-048). Se vende solo, sin depender de
 * Finanzas. R1 trae el modelo y las capacidades (compra, un nivel de aprobación con aprobador
 * asignado); las pantallas de quien rinde (CAR-197) viven en `/rendiciones` y `/supervisor/rendiciones`.
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
  navegacion: [
    // ERP: bajo Finanzas (NAVEGACION.md §2), pero el módulo se vende solo y funciona con o sin Finanzas.
    { portal: "erp", area: "finanzas", href: "/rendiciones", etiqueta: "Rendiciones", icono: "ReceiptText", orden: 12, permiso: "rendiciones:rendir" },
    // Supervisor: dentro de «Más» en el teléfono (fueraInferior); sigue en la barra lateral y el riel.
    { portal: "supervisor", href: "/supervisor/rendiciones", etiqueta: "Rendiciones", icono: "ReceiptText", orden: 10, permiso: "rendiciones:rendir" },
  ],
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
