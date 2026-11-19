import type { ValorCampo } from "./tipos";

export type FilaEmpresa = {
  nombreComercial: string | null;
  razonSocial?: string | null;
  rut?: string | null;
  giro?: string | null;
  correoComercial?: string | null;
  telefono?: string | null;
  sitioWeb?: string | null;
  representanteNombre?: string | null;
};

const t = (v: string | null | undefined) => (v?.trim() ? v.trim() : null);

export function valoresEmpresa(e: FilaEmpresa): Readonly<Record<string, ValorCampo>> {
  return {
    "empresa.nombre": t(e.nombreComercial),
    "empresa.razon_social": t(e.razonSocial ?? null),
    "empresa.rut": t(e.rut ?? null),
    "empresa.giro": t(e.giro ?? null),
    "empresa.correo_comercial": t(e.correoComercial ?? null),
    "empresa.telefono": t(e.telefono ?? null),
    "empresa.sitio_web": t(e.sitioWeb ?? null),
    "empresa.representante_nombre": t(e.representanteNombre ?? null),
  };
}