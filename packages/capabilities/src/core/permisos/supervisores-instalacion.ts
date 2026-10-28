import { PERMISOS_CORE } from "@opai/domain";
import { z } from "zod";

import { defineCapability } from "../../define";
import { prohibido } from "../../errores";
import { uuidSchema } from "../esquemas";
import { instalacionDe } from "../maestros/instalaciones";

const supervisorRef = z.object({
  membershipId: z.string(),
  userId: z.string(),
  nombre: z.string(),
  email: z.string(),
});

/**
 * Supervisores a cargo de una instalación y los que se le pueden asignar (CAR-38). Es la vista
 * inversa de `core.supervisores.list`, para asignar desde la ficha de la instalación. Revela nombre
 * y correo de usuarios, así que, como `core.users.list`, un actor con alcance acotado no la usa y
 * la lectura se audita con los ids de usuario revelados.
 */
export const supervisoresDeInstalacion = defineCapability({
  auditarLectura: (s) => [...s.asignados, ...s.candidatos].map((m) => m.userId),
  id: "core.supervisores.de_instalacion",
  descripcion:
    "Supervisores a cargo de una instalación (la tienen en su alcance) y los supervisores activos que aún no la tienen, para asignarla.",
  permiso: PERMISOS_CORE.usersRead,
  input: z.object({ instalacionId: uuidSchema }),
  output: z.object({
    instalacionId: z.string(),
    asignados: z.array(supervisorRef),
    candidatos: z.array(supervisorRef),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    if (ctx.alcance) throw prohibido("No tienes acceso al directorio de usuarios.");
    const i = await instalacionDe(ctx, input.instalacionId);
    const filas = await ctx.db.membership.findMany({
      where: { rol: "supervisor", estado: "activa" },
      include: {
        user: { select: { name: true, email: true } },
        instalacionesACargo: { where: { instalacionId: i.id }, select: { id: true } },
      },
    });
    const ref = (m: (typeof filas)[number]) => ({
      membershipId: m.id,
      userId: m.userId,
      nombre: m.user.name,
      email: m.user.email,
    });
    const orden = (a: { nombre: string }, b: { nombre: string }) =>
      a.nombre.localeCompare(b.nombre, "es");
    return {
      instalacionId: i.id,
      asignados: filas.filter((m) => m.instalacionesACargo.length).map(ref).sort(orden),
      candidatos: filas.filter((m) => !m.instalacionesACargo.length).map(ref).sort(orden),
    };
  },
});
