import { cache } from "react";

import { ejecutarComoUsuario } from "@/lib/servidor";

/**
 * Lecturas de la ficha por request (CAR-124): el Resumen y las secciones de Laboral comparten una sola llamada
 * por capacidad, en vez de una por tarjeta (consultas por navegación, ADR-045). Mismo permiso y auditoría.
 */
export type Uniforme = {
  tallaCamisa: string | null;
  tallaPantalon: string | null;
  tallaChaqueta: string | null;
  tallaZapato: string | null;
  notas: string | null;
  entregas: {
    id: string;
    entregadaEn: string;
    articulo: string;
    talla: string | null;
    cantidad: number;
  }[];
};
export type JornadaDt = {
  resolucion: string | null;
  resolucionVigenteDesde: string | null;
  horasSemanales: string | null;
  distribucion: string | null;
  articulo22: boolean;
  plazoFijoPeriodo: number | null;
  terminoPlazoFijo: string | null;
  avisoTerminoDias: number | null;
};
export type Laboral = {
  uniforme: Uniforme | null;
  jornadaDt: JornadaDt | null;
  os10: { credencial: string | null; venceEn: string | null } | null;
  contacto: {
    estadoCivil: string | null;
    telefonoSecundario: string | null;
    emergenciaNombre: string | null;
    emergenciaRelacion: string | null;
    emergenciaTelefono: string | null;
  } | null;
};
export type Prevision = {
  personaId: string;
  afp: string | null;
  regimen: string | null;
  sistemaSalud: string | null;
  isapreNombre: string | null;
  planIsapre: string | null;
  planUf: string | null;
  cotizacionUfPct: string | null;
};
export type CuentaPago = {
  bancoCodigo: string | null;
  tipoCuenta: string | null;
  numeroCuenta: string | null;
  rutTitular: string | null;
  /** CAR-244: nombre del catálogo SBIF y señal de dato escrito a mano que hay que corregir. */
  bancoNombre: string | null;
  tipoCuentaEtiqueta: string | null;
  porCorregir: boolean;
};
export type Pago = {
  personaId: string;
  vigente: CuentaPago;
  solicitudPendiente: (CuentaPago & { id: string }) | null;
};

export const laboralDe = cache((id: string) =>
  ejecutarComoUsuario<Laboral>("erp", "core.personas.laboral_ver", { id }),
);
export const previsionDe = cache((id: string) =>
  ejecutarComoUsuario<Prevision>("erp", "core.personas.prevision_ver", { id }),
);
export const pagoDe = cache((id: string) =>
  ejecutarComoUsuario<Pago>("erp", "core.personas.pago_ver", { id }),
);
