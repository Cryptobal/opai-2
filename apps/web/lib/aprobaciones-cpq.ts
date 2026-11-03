import type { Aprobacion } from "@/app/(erp)/configuracion/aprobaciones/tipos";

export type ItemBandejaCpqApi = {
  id: string;
  tipo: "margen" | "envio_propuesta";
  estado: string;
  resumen: string;
  cotizacionId: string;
  codigo: string;
  titulo: string;
  cuentaNombre: string;
  ventaMensualClp: number | null;
  margenEfectivoPct: number | null;
  margenMinimoPct: number;
  solicitanteId: string;
  solicitanteNombre: string;
  comentario: string | null;
  creadaEn: string;
  resueltaEn: string | null;
  motivo: string | null;
  enlaceCotizacion: string;
  enlaceBandeja: string;
};

export function esAprobacionCpq(id: string) {
  return id.startsWith("cpq-m/") || id.startsWith("cpq-e/");
}

/** Adapta un ítem CPQ al tipo de la bandeja del núcleo. */
export function aprobacionDesdeCpq(item: ItemBandejaCpqApi): Aprobacion {
  const riesgo = item.tipo === "envio_propuesta" ? ("alto" as const) : ("medio" as const);
  return {
    id: item.id,
    ambito: "cpq",
    apiKeyId: null,
    agente: item.solicitanteNombre,
    via: null,
    riesgo,
    capability:
      item.tipo === "margen" ? "cpq.aprobaciones.margen" : "cpq.aprobaciones.envio_propuesta",
    resumen: item.resumen,
    input: {
      cotizacionId: item.cotizacionId,
      codigo: item.codigo,
      titulo: item.titulo,
      cuentaNombre: item.cuentaNombre,
      ventaMensualClp: item.ventaMensualClp,
      margenEfectivoPct: item.margenEfectivoPct,
      margenMinimoPct: item.margenMinimoPct,
      comentario: item.comentario,
      tipo: item.tipo,
    },
    estado:
      item.estado === "pendiente" || item.estado === "pendiente_aprobacion"
        ? "pendiente"
        : item.estado === "aprobada" || item.estado === "enviado"
          ? "aprobada"
          : item.estado === "rechazada" || item.estado === "cancelado" || item.estado === "retirada"
            ? "rechazada"
            : "pendiente",
    venceEn: item.creadaEn,
    resueltaEn: item.resueltaEn,
    motivo: item.motivo,
    creadaEn: item.creadaEn,
  };
}
