export type Documento = {
  id: string;
  tipoId: string | null;
  tipo: string | null;
  nombre: string;
  titulo: string | null;
  mime: string;
  tamano: number;
  sha256: string | null;
  estado: string;
  version: number;
  emitidoEn: string | null;
  venceEn: string | null;
  vigencia: "vigente" | "por_vencer" | "vencido" | "sin_fecha";
  etiquetas: string[];
  visibleEn: string[];
  creadoEn: string;
};

export type TipoDocumento = {
  id: string;
  codigo: string;
  nombre: string;
  capa: string;
  obligatorio: boolean;
  tieneVencimiento: boolean;
  diasAlerta: number;
  visiblePortalDefault: string[];
};

export type EntidadDocumento = {
  tipo: "tenant" | "cuenta" | "instalacion" | "persona" | "puesto";
  id: string;
};

export const diasHasta = (vence: string | null) =>
  vence
    ? Math.round(
        (Date.parse(`${vence}T00:00:00Z`) -
          Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)) /
          86_400_000,
      )
    : null;
