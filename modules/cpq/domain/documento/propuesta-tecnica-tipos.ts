export const TIPOS_BLOQUE_PROPUESTA = [
  "portada",
  "indice",
  "seccion_institucional",
  "comprension_servicio",
  "detalle_servicio",
  "resumen_economico",
  "condiciones",
  "incluye_exclusiones",
  "metodologia",
  "contacto_ejecutivo",
  "certificaciones",
  "clientes_referencia",
  "texto_libre",
  "salto_pagina",
] as const;

export type TipoBloquePropuesta = (typeof TIPOS_BLOQUE_PROPUESTA)[number];

export type AperturaPropuesta = "por_instalacion" | "por_categoria" | "por_item";

export type BloquePlantillaPropuesta = {
  tipo: TipoBloquePropuesta;
  activo: boolean;
  fijo: boolean;
  opcional: boolean;
  bibliotecaClave?: string | null;
};

export type BloqueArmadorPropuesta = BloquePlantillaPropuesta & {
  id: string;
  titulo?: string;
  contenidoOverride?: string | null;
  editadoParaCliente?: boolean;
};

export type DestinatarioEnvio = {
  contactoId?: string;
  email: string;
  nombre?: string;
};

export type SnapshotEnvioPropuesta = {
  marcaDocumentoVersion: number;
  plantillaDocumentoId: string;
  plantillaDocumentoVersion: number;
  bloquesBiblioteca: Record<string, number>;
  propuestaBloquesJson: string;
  destinatarios: DestinatarioEnvio[];
};

export const PLANTILLA_PROPUESTA_DEFECTO: BloquePlantillaPropuesta[] = [
  { tipo: "portada", activo: true, fijo: true, opcional: false },
  { tipo: "indice", activo: true, fijo: false, opcional: true },
  { tipo: "comprension_servicio", activo: true, fijo: false, opcional: false },
  { tipo: "detalle_servicio", activo: true, fijo: true, opcional: false },
  { tipo: "resumen_economico", activo: true, fijo: true, opcional: false },
  { tipo: "condiciones", activo: true, fijo: false, opcional: true },
  { tipo: "incluye_exclusiones", activo: true, fijo: false, opcional: true },
  { tipo: "contacto_ejecutivo", activo: true, fijo: false, opcional: true },
];

export type ServicioDesdeCotizacion = {
  codigo: string;
  versionNumero: number;
  secciones: readonly {
    nombre: string;
    puestos: readonly {
      nombre: string;
      posiciones: number;
      patron: string | null;
      horaInicio: string | null;
      horaFin: string | null;
      diasCobertura: number | null;
    }[];
  }[];
};
