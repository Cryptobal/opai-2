import { z } from "zod";

import { camposFaltantes, coordenadasValidas, normalizarTelefono } from "@opai/domain";

const texto = (max: number) => z.string().trim().min(1).max(max);

export const telefono = z
  .string()
  .trim()
  .transform((v, c) => {
    const t = normalizarTelefono(v);
    if (!t) c.addIssue({ code: "custom", message: "Teléfono inválido." });
    return t ?? v;
  });

/** Dirección como la entrega el selector de Google Maps (place_id, coordenadas); sin claves aquí. */
export const direccionSchema = z
  .object({
    direccionFormateada: texto(300),
    calle: texto(200).nullable().optional(),
    comuna: texto(100).nullable().optional(),
    region: texto(100).nullable().optional(),
    placeId: texto(300).nullable().optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
  })
  .refine((d) => (d.lat == null) === (d.lng == null), {
    message: "Indica latitud y longitud juntas, o ninguna.",
  })
  .refine((d) => d.lat == null || d.lng == null || coordenadasValidas(d.lat, d.lng), {
    message: "Coordenadas fuera de rango.",
  });

export const misDatosSchema = z.object({
  personaId: z.string(),
  nombres: z.string(),
  apellidos: z.string(),
  rut: z.string(),
  emailPersonal: z.string().nullable(),
  emailLaboral: z.string().nullable(),
  telefono: z.string().nullable(),
  calle: z.string().nullable(),
  comuna: z.string().nullable(),
  region: z.string().nullable(),
  direccionFormateada: z.string().nullable(),
  placeId: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  /** Lo que falta completar, para la tarjeta de Inicio. */
  faltantes: z.array(z.enum(["telefono", "emailPersonal", "direccion"])),
});

type FilaPersona = {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  emailPersonal: string | null;
  emailLaboral: string | null;
  telefono: string | null;
  calle: string | null;
  comuna: string | null;
  region: string | null;
  direccionFormateada: string | null;
  placeId: string | null;
  lat: { toNumber(): number } | number | null;
  lng: { toNumber(): number } | number | null;
};

const num = (v: FilaPersona["lat"]): number | null =>
  v === null ? null : typeof v === "number" ? v : v.toNumber();

export function vistaMisDatos(p: FilaPersona): z.input<typeof misDatosSchema> {
  return {
    personaId: p.id,
    nombres: p.nombres,
    apellidos: p.apellidos,
    rut: p.rut,
    emailPersonal: p.emailPersonal,
    emailLaboral: p.emailLaboral,
    telefono: p.telefono,
    calle: p.calle,
    comuna: p.comuna,
    region: p.region,
    direccionFormateada: p.direccionFormateada,
    placeId: p.placeId,
    lat: num(p.lat),
    lng: num(p.lng),
    faltantes: camposFaltantes(p),
  };
}
