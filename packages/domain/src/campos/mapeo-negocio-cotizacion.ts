import type { ValorCampo } from "./tipos";

export function valoresNegocio(n: {
  titulo: string | null;
  inicioServicioEstimado: Date | string | null;
  cierreEstimado?: Date | string | null;
}): Readonly<Record<string, ValorCampo>> {
  const dia = (d: Date | string | null | undefined) => {
    if (!d) return null;
    if (d instanceof Date) return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    return d.slice(0, 10);
  };
  return {
    "negocio.titulo": n.titulo?.trim() || null,
    "negocio.inicio_servicio": dia(n.inicioServicioEstimado),
    "negocio.cierre_estimado": dia(n.cierreEstimado ?? null),
  };
}

export function valoresCotizacion(c: {
  codigo: string;
  titulo: string;
  versionNumero: number;
  validaHasta: string | null;
  ventaMensual: number | null;
  mesesContrato: number | null;
  fechaEnvio: string | null;
}): Readonly<Record<string, ValorCampo>> {
  return {
    "cotizacion.codigo": c.codigo,
    "cotizacion.titulo": c.titulo,
    "cotizacion.version": c.versionNumero,
    "cotizacion.valida_hasta": c.validaHasta,
    "cotizacion.venta_mensual": c.ventaMensual,
    "cotizacion.meses_contrato": c.mesesContrato,
    "cotizacion.fecha_envio": c.fechaEnvio,
  };
}