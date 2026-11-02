import type { AccionEntidad } from "@/app/_components/maestros/acciones-entidad";

import type { SolicitudDato } from "./datos";

export const nombreDe = (s: SolicitudDato) =>
  s.empresa ?? s.nombre ?? s.email ?? "Solicitud sin nombre";

export function accionesSolicitud(s: SolicitudDato, posibles: SolicitudDato[]): AccionEntidad[] {
  const lista: AccionEntidad[] = [];
  if (s.estado === "nueva")
    lista.push({
      id: "derivar",
      etiqueta: "Derivar a revisión",
      capacidad: {
        id: "comercial.solicitudes.derivar",
        input: { id: s.id },
        exito: "Solicitud derivada",
      },
    });
  if (s.estado === "nueva" || s.estado === "en_revision") {
    for (const d of posibles.filter((x) => !x.duplicadaDeId).slice(0, 3))
      lista.push({
        id: `duplicada-${d.id}`,
        etiqueta: `Duplicada de ${nombreDe(d)}`,
        grupo: "Marcar como duplicada",
        capacidad: {
          id: "comercial.solicitudes.marcar_duplicada",
          input: { id: s.id, originalId: d.id },
          exito: "Marcada como duplicada",
        },
      });
    lista.push({
      id: "descartar",
      etiqueta: "Descartar",
      peligro: true,
      capacidad: {
        id: "comercial.solicitudes.descartar",
        input: { id: s.id },
        exito: "Solicitud descartada",
      },
      confirmar: {
        titulo: "Descartar solicitud",
        descripcion: "Queda en la bandeja como descartada y puedes reabrirla después.",
        boton: "Descartar",
        peligro: true,
        motivo: true,
      },
    });
  }
  if (s.estado === "descartada")
    lista.push({
      id: "reabrir",
      etiqueta: "Reabrir",
      capacidad: {
        id: "comercial.solicitudes.reabrir",
        input: { id: s.id },
        exito: "Solicitud reabierta",
      },
    });
  if (s.estado === "convertida")
    lista.push({
      id: "pasar-cotizacion",
      etiqueta: "Abrir cotización CPQ",
      capacidad: {
        id: "comercial.solicitudes.pasar_a_cotizacion",
        input: { id: s.id },
        exito: "Cotización creada; ábrela desde el negocio",
      },
    });
  return lista;
}
