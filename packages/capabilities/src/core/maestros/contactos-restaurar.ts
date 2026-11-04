// Restaurar un contacto archivado (CAR-162, segundo PR): vuelve a la lista, no como principal.
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "./comun";
import { contactoDe, contactoSchema, emailLibre, vista } from "./contactos-vista";

export const contactosRestaurar = defineCapability({
  id: "core.contactos.restaurar",
  descripcion:
    "Restaura un contacto archivado: vuelve a aparecer en su cuenta con todo su historial. No queda como principal y falla si otro contacto activo de la cuenta ya usa su correo.",
  permiso: PERMISOS_CORE.cuentasManage,
  input: z.object({ id: uuidSchema }),
  output: contactoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id }, { dryRun }) {
    const actual = await contactoDe(ctx, id);
    if (actual.archivadoEn) await emailLibre(ctx, actual.cuentaId, actual.email, id);
    const data = { archivadoEn: null };
    if (dryRun) return vista({ ...actual, ...data });
    if (!actual.archivadoEn) return vista(actual);
    const c = await escribirConEvento(
      ctx,
      { tipo: "core.contacto.actualizado", entidadTipo: "contacto" },
      (tx) => tx.contacto.update({ where: { id }, data }),
    );
    return vista(c);
  },
});
