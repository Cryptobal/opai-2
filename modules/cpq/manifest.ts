import { z } from "zod";

import { defineModule } from "@opai/capabilities";

import { capacidades } from "./capabilities";

/**
 * Manifest del módulo CPQ (CAR-119, Brief 10 · PR 10.1, ADR-003/ADR-042). Datos y capacidades base de
 * la cotización: crear (con código correlativo), listar y obtener. Depende de Comercial (ADR-048:
 * no hay cotización sin negocio). Planilla, motor de cálculo, envío, aprobación y configuración
 * llegan en los PR siguientes del brief; la navegación y las pantallas, con su diseño aprobado.
 */
export const manifest = defineModule({
  id: "cpq",
  nombre: "CPQ",
  version: "0.1.0",
  dependencias: ["comercial"],
  permisos: [
    { id: "cpq:cotizaciones.read", descripcion: "Ver las cotizaciones y sus estados" },
    {
      id: "cpq:cotizaciones.manage",
      descripcion: "Crear, editar, versionar, archivar y enviar cotizaciones",
    },
    {
      id: "cpq:costos.ver",
      descripcion: "Ver costos, sueldos cotizados y margen; sin él el servidor los omite",
    },
    { id: "cpq:aprobar", descripcion: "Aprobar o rechazar cotizaciones bajo el margen mínimo" },
    { id: "cpq:modelo.manage", descripcion: "Configurar el modelo de costeo y el catálogo de CPQ" },
  ],
  navegacion: [
    {
      portal: "erp",
      area: "comercial",
      href: "/cotizaciones",
      etiqueta: "Cotizaciones",
      icono: "FileText",
      orden: 3,
      permiso: "cpq:cotizaciones.read",
    },
  ],
  configuracion: z.object({}),
  eventos: [
    { id: "cpq.cotizacion.creada", descripcion: "Se creó una cotización en borrador." },
    { id: "cpq.cotizacion.aprobacion_solicitada", descripcion: "Una cotización pasó a aprobación por margen." },
    { id: "cpq.cotizacion.aprobada", descripcion: "Se aprobó el margen de una cotización." },
    { id: "cpq.cotizacion.aprobacion_rechazada", descripcion: "Se rechazó la aprobación de margen." },
    { id: "cpq.cotizacion.enviada", descripcion: "Se envió una cotización al cliente." },
  ],
  capacidades,
});
