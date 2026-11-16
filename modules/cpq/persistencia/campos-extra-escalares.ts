import {
  valoresCotizacion,
  valoresEmpresa,
  valoresNegocio,
  type ValorCampo,
} from "@opai/domain";

import type { EntradaPdfCotizacion } from "./documento-pdf-tipos";
import type * as Recalc from "./recalcular";

type PackFilasCotizacion = NonNullable<Awaited<ReturnType<typeof Recalc.cargarFilasVersion>>>;
import { mesesContrato } from "./version";

type Perfil = {
  razonSocial: string | null;
  rut: string | null;
  giro: string | null;
  correoComercial: string | null;
  telefono: string | null;
  sitioWeb: string | null;
} | null;

type Negocio = {
  titulo: string;
  inicioServicioEstimado: Date | null;
  cierreEstimado: Date | null;
} | null;

export type EscalaresCpq = {
  campos: Record<string, ValorCampo>;
  venta: number | null;
  meses: number | null;
};

export function escalaresCamposCotizacion(
  tenantNombre: string | null | undefined,
  perfil: Perfil,
  neg: Negocio,
  cot: { codigo: string; titulo: string },
  pack: PackFilasCotizacion | null,
  entrada: EntradaPdfCotizacion | null,
): EscalaresCpq {
  const version = pack?.version;
  const valida = version?.validaHasta?.toISOString().slice(0, 10) ?? entrada?.validaHasta ?? null;
  const meses = version?.mesesContrato ?? (version?.validaHasta ? mesesContrato(version.validaHasta) : null);
  const envio = version?.enviadaEn?.toISOString().slice(0, 10) ?? null;
  const venta = entrada?.calculo.ventaMensual ?? null;

  const campos: Record<string, ValorCampo> = {
    ...valoresEmpresa({
      nombreComercial: tenantNombre ?? null,
      razonSocial: perfil?.razonSocial ?? null,
      rut: perfil?.rut ?? null,
      giro: perfil?.giro ?? null,
      correoComercial: perfil?.correoComercial ?? null,
      telefono: perfil?.telefono ?? null,
      sitioWeb: perfil?.sitioWeb ?? null,
    }),
    ...(neg ? valoresNegocio(neg) : {}),
    ...valoresCotizacion({
      codigo: cot.codigo,
      titulo: cot.titulo,
      versionNumero: version?.numero ?? 1,
      validaHasta: valida,
      ventaMensual: venta,
      mesesContrato: meses,
      fechaEnvio: envio,
    }),
  };
  return { campos, venta, meses };
}