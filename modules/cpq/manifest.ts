
import { defineModule } from "@opai/capabilities";

import { capacidades } from "./capabilities";
import { ajustesCpq } from "./persistencia/supuestos";

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
    {
      id: "cpq:biblioteca.manage",
      descripcion: "Editar biblioteca de bloques y plantilla de propuesta técnica",
    },
    { id: "cpq:envios.aprobar", descripcion: "Aprobar envíos conjuntos cotización/propuesta técnica" },
    {
      id: "cpq:puestos.confirmar",
      descripcion: "Confirmar los puestos que ofrece una cotización aceptada y crearlos (RRHH)",
    },
  ],
  navegacion: [
    {
      portal: "erp",
      area: "comercial",
      href: "/cotizaciones",
      etiqueta: "Cotizaciones",
      icono: "ReceiptText",
      orden: 3,
      permiso: "cpq:cotizaciones.read",
    },
  ],
  configuracion: ajustesCpq,
  eventos: [
    { id: "cpq.cotizacion.creada", descripcion: "Se creó una cotización en borrador." },
    { id: "cpq.cotizacion.aprobacion_solicitada", descripcion: "Una cotización pasó a aprobación por margen." },
    { id: "cpq.cotizacion.aprobada", descripcion: "Se aprobó el margen de una cotización." },
    { id: "cpq.cotizacion.aprobacion_rechazada", descripcion: "Se rechazó la aprobación de margen." },
    { id: "cpq.cotizacion.reabierta", descripcion: "Una cotización lista volvió a borrador para editarla." },
    { id: "cpq.cotizacion.enviada", descripcion: "Se envió una cotización al cliente." },
    { id: "cpq.cotizacion.aceptada", descripcion: "La cotización vigente quedó aceptada al ganar el negocio." },
    { id: "cpq.puestos.confirmados", descripcion: "RRHH confirmó y creó los puestos de una cotización aceptada." },
    { id: "cpq.envio_propuesta.solicitado", descripcion: "Se solicitó un envío conjunto cotización/propuesta." },
    { id: "cpq.envio_propuesta.aprobado", descripcion: "Se aprobó y registró un envío conjunto." },
    { id: "cpq.envio_propuesta.rechazado", descripcion: "Se rechazó un envío conjunto pendiente." },
    { id: "cpq.envio_propuesta.acceso_cliente", descripcion: "Al enviar una propuesta se invitó o vinculó al contacto a su Portal Cliente." },
  ],
  capacidades,
});
