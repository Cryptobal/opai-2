import { ajustesPauta, capacidadesPauta, defineModule } from "@opai/capabilities";

/**
 * Manifest del módulo Pauta (Operaciones, Brief 11b · PR 1). El núcleo deriva navegación, permisos,
 * eventos y herramientas MCP desde aquí. Las capacidades viven en packages/capabilities/src/pauta y
 * el dominio puro (series, excepciones, feriados, no doblar) en packages/domain/src/pauta. La entrada
 * «Pauta» del área Operaciones (pestañas Mensual y Diaria) se declara aquí; la Diaria llega en el PR 2.
 */
export const manifest = defineModule({
  id: "pauta",
  nombre: "Pauta",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    { id: "pauta:read", descripcion: "Ver la pauta mensual, los puestos por cubrir y el historial" },
    {
      id: "pauta:write",
      descripcion: "Fijar series de los puestos y registrar o anular excepciones de la pauta",
    },
  ],
  navegacion: [{
      portal: "erp",
      href: "/pauta",
      etiqueta: "Pauta",
      icono: "CalendarDays",
      area: "operaciones",
      orden: 40,
      permiso: "pauta:read",
    }],
  configuracion: ajustesPauta,
  eventos: [
    { id: "pauta.serie.fijada", descripcion: "Se fijó o cambió la serie de un puesto." },
    {
      id: "pauta.excepcion.creada",
      descripcion:
        "Se registró una excepción en la pauta (ausencia, licencia, vacaciones, permiso, reemplazo o refuerzo).",
    },
    { id: "pauta.excepcion.anulada", descripcion: "Se anularon excepciones de la pauta de un puesto." },
  ],
  capacidades: capacidadesPauta,
});
