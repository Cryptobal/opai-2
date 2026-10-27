import { z } from "zod";

import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { iso } from "../comun";
import { dondePersona } from "./alcance";
import { dia, diaSchema, rutSchema, telefonoSchema, textoOpcional } from "./comun";

export const SEXOS = ["femenino", "masculino", "otro", "no_declara"] as const;

export const vinculoResumenSchema = z.object({
  id: z.string(),
  cargoId: z.string(),
  cargo: z.string(),
  tipo: z.string(),
  inicio: z.string(),
  termino: z.string().nullable(),
});

export const personaSchema = z.object({
  id: z.string(),
  nombres: z.string(),
  apellidos: z.string(),
  nombreCompleto: z.string(),
  rut: z.string(),
  emailPersonal: z.string().nullable(),
  emailLaboral: z.string().nullable(),
  telefono: z.string().nullable(),
  fechaNacimiento: z.string().nullable(),
  sexo: z.string().nullable(),
  nacionalidad: z.string(),
  calle: z.string().nullable(),
  comuna: z.string().nullable(),
  region: z.string().nullable(),
  direccionFormateada: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  estado: z.string(),
  bloqueada: z.boolean(),
  bloqueoMotivo: z.string().nullable(),
  usuarioId: z.string().nullable(),
  archivadaEn: z.string().nullable(),
  vinculoVigente: vinculoResumenSchema.nullable(),
});

export type FilaPersona = {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  emailPersonal?: string | null;
  emailLaboral?: string | null;
  telefono?: string | null;
  fechaNacimiento?: Date | null;
  sexo?: string | null;
  nacionalidad?: string | null;
  calle?: string | null;
  comuna?: string | null;
  region?: string | null;
  direccionFormateada?: string | null;
  lat?: { toNumber(): number } | number | null;
  lng?: { toNumber(): number } | number | null;
  estado?: string | null;
  bloqueada?: boolean | null;
  bloqueoMotivo?: string | null;
  usuarioId?: string | null;
  archivadaEn?: Date | null;
};

type Vinculo = z.input<typeof vinculoResumenSchema> | null;

const coordenada = (v: { toNumber(): number } | number | null | undefined) =>
  v == null ? null : typeof v === "number" ? v : v.toNumber();

export function vistaPersona(p: FilaPersona, vinculo: Vinculo = null) {
  return {
    id: p.id,
    nombres: p.nombres,
    apellidos: p.apellidos,
    nombreCompleto: `${p.nombres} ${p.apellidos}`,
    rut: p.rut,
    emailPersonal: p.emailPersonal ?? null,
    emailLaboral: p.emailLaboral ?? null,
    telefono: p.telefono ?? null,
    fechaNacimiento: dia(p.fechaNacimiento),
    sexo: p.sexo ?? null,
    nacionalidad: p.nacionalidad ?? "CL",
    calle: p.calle ?? null,
    comuna: p.comuna ?? null,
    region: p.region ?? null,
    direccionFormateada: p.direccionFormateada ?? null,
    lat: coordenada(p.lat),
    lng: coordenada(p.lng),
    estado: p.estado ?? "activa",
    bloqueada: p.bloqueada ?? false,
    bloqueoMotivo: p.bloqueoMotivo ?? null,
    usuarioId: p.usuarioId ?? null,
    archivadaEn: iso(p.archivadaEn),
    vinculoVigente: vinculo,
  };
}

const email = z.string().trim().toLowerCase().pipe(z.email()).nullable().optional();

export const camposPersona = {
  nombres: z.string().trim().min(1).max(80),
  apellidos: z.string().trim().min(1).max(120),
  rut: rutSchema,
  emailPersonal: email,
  emailLaboral: email,
  telefono: telefonoSchema.nullable().optional(),
  fechaNacimiento: diaSchema.nullable().optional(),
  sexo: z.enum(SEXOS).nullable().optional(),
  nacionalidad: z
    .string()
    .length(2)
    .toUpperCase()
    .optional()
    .describe("ISO 3166-1 alfa-2: CL, PE, VE…"),
  calle: textoOpcional(200),
  comuna: textoOpcional(80),
  region: textoOpcional(80),
  direccionFormateada: textoOpcional(300),
  placeId: textoOpcional(300).describe("Lugar elegido en core.geo.autocompletar, si lo hay."),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
};

export async function personaDe(ctx: Contexto, id: string) {
  // findFirst (no findUnique) para aplicar el alcance por filas: fuera de alcance = no encontrada.
  const p = await ctx.db.persona.findFirst({ where: { id, AND: [dondePersona(ctx)] } });
  if (!p) throw noEncontrado("La persona");
  return p;
}

/** Resumen del vínculo para una fila/ficha (con el nombre del cargo ya resuelto). */
export function vinculoVista(v: {
  id: string;
  cargoId: string;
  cargo?: { nombre: string } | null;
  tipo: string;
  inicio: Date | null;
  termino: Date | null;
}): z.input<typeof vinculoResumenSchema> {
  return {
    id: v.id,
    cargoId: v.cargoId,
    cargo: v.cargo?.nombre ?? "",
    tipo: v.tipo,
    inicio: dia(v.inicio) ?? "",
    termino: dia(v.termino),
  };
}

/** Vínculos vigentes (con nombre de cargo) de un grupo de personas, en una consulta (include del cargo). */
export async function vinculosVigentes(ctx: Contexto, personaIds: string[]) {
  const vinculos = await ctx.db.vinculoLaboral.findMany({
    where: { personaId: { in: personaIds }, estado: "vigente" },
    include: { cargo: { select: { nombre: true } } },
  });
  return new Map(vinculos.map((v) => [v.personaId, vinculoVista(v)]));
}
