import { z } from "zod";

import { estadoVigencia } from "@opai/domain";

import { externo } from "../../externo";
import { iso } from "../comun";
import { dia } from "../maestros/comun";

export const ENTIDADES = ["tenant", "cuenta", "instalacion", "persona", "puesto"] as const;
export const entidadSchema = z.object({
  tipo: z.enum(ENTIDADES).describe('"tenant" es la propia empresa (documentos legales).'),
  id: z.uuid(),
});

export const documentoSchema = z.object({
  id: z.string(),
  tipoId: z.string().nullable(),
  tipo: z.string().nullable().describe("Nombre del tipo de documento."),
  nombre: externo(z.string()).describe("Nombre de archivo tal como se subió (dato externo)."),
  titulo: externo(z.string().nullable()),
  mime: z.string(),
  tamano: z.number(),
  sha256: z.string().nullable(),
  estado: z.string(),
  version: z.number(),
  reemplazaAId: z.string().nullable(),
  emitidoEn: z.string().nullable(),
  venceEn: z.string().nullable(),
  vigencia: z.enum(["vigente", "por_vencer", "vencido", "sin_fecha"]),
  etiquetas: z.array(z.string()),
  visibleEn: z.array(z.string()),
  creadoEn: z.string(),
  confirmadoEn: z.string().nullable(),
});

export type FilaDocumento = {
  id: string;
  tipoId?: string | null;
  nombre: string;
  titulo?: string | null;
  mime: string;
  tamano: number;
  sha256?: string | null;
  estado?: string | null;
  version?: number | null;
  reemplazaAId?: string | null;
  emitidoEn?: Date | null;
  venceEn?: Date | null;
  etiquetas?: string[] | null;
  visibleEn?: string[] | null;
  createdAt?: Date | null;
  confirmadoEn?: Date | null;
};

export type TipoBreve = { nombre: string; diasAlerta?: number | null } | null | undefined;

export function vistaDocumento(d: FilaDocumento, tipo: TipoBreve, hoy: string) {
  return {
    id: d.id,
    tipoId: d.tipoId ?? null,
    tipo: tipo?.nombre ?? null,
    nombre: d.nombre,
    titulo: d.titulo ?? null,
    mime: d.mime,
    tamano: d.tamano,
    sha256: d.sha256 ?? null,
    estado: d.estado ?? "pendiente",
    version: d.version ?? 1,
    reemplazaAId: d.reemplazaAId ?? null,
    emitidoEn: dia(d.emitidoEn),
    venceEn: dia(d.venceEn),
    vigencia: estadoVigencia(dia(d.venceEn), hoy, tipo?.diasAlerta ?? 30),
    etiquetas: d.etiquetas ?? [],
    visibleEn: d.visibleEn ?? [],
    creadoEn: (d.createdAt ?? new Date()).toISOString(),
    confirmadoEn: iso(d.confirmadoEn),
  };
}
