import { capacidadesCpq, defineModule } from "@opai/capabilities";
import { z } from "zod";

/**
 * Manifest del módulo CPQ (ADR-003, Brief 10). El núcleo deriva navegación, permisos, configuración,
 * eventos y herramientas MCP desde aquí. Las capacidades viven en packages/capabilities/src/cpq y se
 * listan como `capacidadesCpq`. Depende de Comercial: la cotización cuelga de un negocio (ADR-040 §4,
 * ADR-048). La entrada «Cotizaciones» del área Comercial y el cotizador llegan con el PR 10.2; la
 * configuración en 3 pestañas (R58), con el PR 10.7.
 */
export const manifest = defineModule({
  id: "cpq",
  nombre: "CPQ",
  version: "0.1.0",
  dependencias: ["comercial"],
  permisos: [
    { id: "cpq:cotizaciones.read", descripcion: "Ver cotizaciones: venta, estado y versiones" },
    {
      id: "cpq:cotizaciones.manage",
      descripcion: "Crear, editar, versionar, pedir aprobación y enviar cotizaciones",
    },
    {
      id: "cpq:costos.ver",
      descripcion: "Ver costos, sueldos, margen y semáforo de las cotizaciones",
    },
    { id: "cpq:aprobar", descripcion: "Aprobar o rechazar cotizaciones bajo el margen mínimo" },
    {
      id: "cpq:modelo.manage",
      descripcion: "Cambiar la configuración del CPQ: catálogo, pólizas y finanzas, márgenes",
    },
  ],
  navegacion: [],
  configuracion: z.object({}),
  eventos: [
    { id: "cpq.cotizacion.creada", descripcion: "Se creó una cotización en borrador." },
    {
      id: "cpq.cotizacion.renombrada",
      descripcion: "Cambió el título de una cotización (queda en su Historial).",
    },
  ],
  capacidades: capacidadesCpq,
});
