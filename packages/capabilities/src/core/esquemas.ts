import { z } from "zod";

import { PORTALES_TENANT, ROLES, VERTICALES } from "@opai/domain";

/** Tenant tal como lo devuelven las capacidades (fechas como Date → se serializan en JSON). */
export const tenantSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nombre: z.string(),
  vertical: z.string(),
  timezone: z.string(),
  estado: z.string(),
});

export const rolSchema = z.enum(ROLES);
export const verticalSchema = z.enum(VERTICALES);
export const portalSchema = z.enum(PORTALES_TENANT);
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
export const uuidSchema = z.uuid();

/** Zona horaria IANA válida para el runtime (America/Santiago, …). */
export const timezoneSchema = z.string().refine((tz) => {
  try {
    new Intl.DateTimeFormat("es-CL", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, "Zona horaria inválida.");

export const SLUGS_RESERVADOS = ["www", "app", "test", "api", "platform", "admin", "opai"] as const;

export const slugSchema = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, dígitos y guiones.")
  .refine((s) => !(SLUGS_RESERVADOS as readonly string[]).includes(s), "Ese slug está reservado.");

export const fecha = z
  .date()
  .or(z.string())
  .transform((d) => (typeof d === "string" ? d : d.toISOString()));
