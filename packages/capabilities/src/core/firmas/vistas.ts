import { z } from "zod";

import { enmascararRun } from "@opai/domain";

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

export const firmanteVistaSchema = z.object({
  id: z.string(),
  orden: z.number().int(),
  rol: z.string(),
  tipo: z.string(),
  nombre: z.string(),
  /** RUN enmascarado para pantalla; la evidencia guarda el canónico (CA8). */
  run: z.string().nullable(),
  estado: z.string(),
  vistoEn: z.string().nullable(),
  firmadoEn: z.string().nullable(),
  motivoRechazo: z.string().nullable(),
});
export type FirmanteVista = z.infer<typeof firmanteVistaSchema>;

export const evidenciaVistaSchema = z.object({
  tipo: z.string(),
  nivel: z.string().nullable(),
  metodo: z.string().nullable(),
  firmanteId: z.string().nullable(),
  fecha: z.string(),
});

export const solicitudVistaSchema = z.object({
  id: z.string(),
  documentoId: z.string(),
  documentoVersion: z.number().int(),
  sha256: z.string(),
  clase: z.string(),
  nivel: z.string(),
  orden: z.string(),
  estado: z.string(),
  mensaje: z.string().nullable(),
  plazoVence: z.string(),
  motivo: z.string().nullable(),
  documentoFirmadoId: z.string().nullable(),
  sha256Firmado: z.string().nullable(),
  completadaEn: z.string().nullable(),
  creadaEn: z.string(),
  firmantes: z.array(firmanteVistaSchema),
});
export type SolicitudVista = z.infer<typeof solicitudVistaSchema>;

type FilaFirmante = {
  id: string;
  orden: number;
  rol: string;
  tipo: string;
  nombre: string;
  run: string | null;
  estado: string;
  vistoEn: Date | null;
  firmadoEn: Date | null;
  motivoRechazo: string | null;
};

export function vistaFirmante(f: FilaFirmante): FirmanteVista {
  return {
    id: f.id,
    orden: f.orden,
    rol: f.rol,
    tipo: f.tipo,
    nombre: f.nombre,
    run: enmascararRun(f.run),
    estado: f.estado,
    vistoEn: iso(f.vistoEn),
    firmadoEn: iso(f.firmadoEn),
    motivoRechazo: f.motivoRechazo,
  };
}

type FilaSolicitud = {
  id: string;
  documentoId: string;
  documentoVersion: number;
  sha256: string;
  clase: string;
  nivel: string;
  orden: string;
  estado: string;
  mensaje: string | null;
  plazoVence: Date;
  motivo: string | null;
  documentoFirmadoId: string | null;
  sha256Firmado: string | null;
  completadaEn: Date | null;
  createdAt: Date;
  firmantes?: FilaFirmante[];
};

export function vistaSolicitud(s: FilaSolicitud): SolicitudVista {
  return {
    id: s.id,
    documentoId: s.documentoId,
    documentoVersion: s.documentoVersion,
    sha256: s.sha256,
    clase: s.clase,
    nivel: s.nivel,
    orden: s.orden,
    estado: s.estado,
    mensaje: s.mensaje,
    plazoVence: s.plazoVence.toISOString(),
    motivo: s.motivo,
    documentoFirmadoId: s.documentoFirmadoId,
    sha256Firmado: s.sha256Firmado,
    completadaEn: iso(s.completadaEn),
    creadaEn: s.createdAt.toISOString(),
    firmantes: (s.firmantes ?? []).sort((a, b) => a.orden - b.orden).map(vistaFirmante),
  };
}
