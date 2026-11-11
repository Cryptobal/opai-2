import { z } from "zod";

import { rutValido } from "@opai/domain";

/** Factor (cesionario) guardado para no reescribir sus datos en cada cesión. */
export const factorCesionSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  rut: z.string().trim().refine(rutValido, "El RUT del factor no es válido."),
  // Octava corta el correo a 40 y la dirección a 70 caracteres: se valida igual que al ceder.
  email: z.string().trim().email().max(40).optional(),
  direccion: z.string().trim().min(3).max(70).optional(),
});

/** Ajuste `finanzas.factores_cesion`: catálogo corto de factores del tenant (CAR-267). */
export const factoresCesionAjuste = z
  .array(factorCesionSchema)
  .max(20)
  .refine(
    (lista) => new Set(lista.map((f) => f.rut.replace(/[.\s]/g, "").toUpperCase())).size === lista.length,
    "Hay un factor repetido: cada RUT va una sola vez.",
  )
  .default([])
  .meta({
    etiqueta: "Factores para ceder facturas",
    ayuda:
      "Empresas de factoring a las que se ceden facturas: nombre, RUT, correo y dirección. Se eligen al ceder y también se guardan desde esa pantalla; hasta 20.",
    grupo: "Cesión",
    ambito: "tenant",
    permiso: "finanzas:ventas.manage",
    control: "json",
  });
