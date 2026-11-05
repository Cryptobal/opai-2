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

/** Entidades a las que se puede vincular un documento desde el explorador. */
export type EntidadVinculable = "tenant" | "cuenta" | "instalacion" | "persona";

/**
 * Capa de tipos de documento de cada entidad vinculable: solo para OFRECER los tipos que calzan.
 * El servidor decide (`tipoParaEntidad`, `CAPA_DE`); una prueba compara ambas tablas.
 */
export const CAPA_DE_ENTIDAD: Record<EntidadVinculable, string> = {
  tenant: "empresa",
  cuenta: "cuenta",
  instalacion: "instalacion",
  persona: "persona",
};

export const diasHasta = (vence: string | null) =>
  vence
    ? Math.round(
        (Date.parse(`${vence}T00:00:00Z`) -
          Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)) /
          86_400_000,
      )
    : null;
