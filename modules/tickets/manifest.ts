import { z } from "zod";

import { defineModule } from "@opai/capabilities";

import { capacidades } from "./capacidades";

/**
 * Manifest del módulo Tickets (CAR-84, Brief 13 · PR 1, ADR-003/ADR-025). Tickets internos sin chat
 * libre, con responsable obligatorio desde que se crean, y solicitudes con aprobación de un paso.
 * Las capacidades viven en `./capacidades`. La configuración de tipos (Configuración › Módulos ›
 * Tickets) y el resto de pantallas del diseño llegan en el PR 2 (ver BRIEF-13 §Plan).
 */
export const manifest = defineModule({
  id: "tickets",
  nombre: "Tickets",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    {
      id: "tickets:tickets.ver",
      descripcion: "Ver los tickets propios y los asignados",
    },
    {
      id: "tickets:tickets.ver_todos",
      descripcion: "Ver todos los tickets del tenant en la bandeja",
    },
    {
      id: "tickets:tickets.gestionar",
      descripcion: "Crear, comentar, cambiar estado, reasignar y resolver solicitudes",
    },
    { id: "tickets:tipos.manage", descripcion: "Configurar los tipos de ticket del tenant" },
  ],
  navegacion: [
    {
      portal: "erp",
      area: "operaciones",
      href: "/tickets",
      etiqueta: "Tickets",
      icono: "Ticket",
      orden: 50,
      permiso: "tickets:tickets.ver",
    },
  ],
  configuracion: z.object({}),
  eventos: [
    { id: "tickets.tipo.creado", descripcion: "Se creó un tipo de ticket." },
    { id: "tickets.tipo.actualizado", descripcion: "Se modificó un tipo de ticket." },
    { id: "tickets.ticket.creado", descripcion: "Se creó un ticket o una solicitud." },
    { id: "tickets.ticket.comentado", descripcion: "Se agregó un comentario a un ticket." },
    { id: "tickets.ticket.estado_cambiado", descripcion: "Un ticket cambió de estado." },
    { id: "tickets.ticket.reasignado", descripcion: "Un ticket cambió de responsable." },
    { id: "tickets.ticket.aprobado", descripcion: "Se aprobó una solicitud." },
    { id: "tickets.ticket.rechazado", descripcion: "Se rechazó una solicitud con su motivo." },
  ],
  capacidades,
});
