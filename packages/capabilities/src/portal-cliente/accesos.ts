import { z } from "zod";

import { esMembresiaDeCliente, type Rol } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { accesoVistaSchema, candidatoSchema, type AccesoVista } from "./accesos-vista";
import { PERMISO_ACCESOS_READ, cuentaDe, estadoAccesoSchema } from "./comun";

/** Accesos al portal de una cuenta, con el usuario y las instalaciones que cada uno ve. */
export async function accesosDeCuenta(
  ctx: Parameters<typeof cuentaDe>[0],
  cuentaId: string,
): Promise<AccesoVista[]> {
  const filas = await ctx.db.accesoCliente.findMany({
    where: { cuentaId },
    include: { instalaciones: { select: { instalacionId: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (filas.length === 0) return [];
  const [membresias, instalaciones] = await Promise.all([
    ctx.db.membership.findMany({
      where: { id: { in: filas.map((f) => f.membershipId) } },
      select: { id: true, userId: true, user: { select: { name: true, email: true } } },
    }),
    ctx.db.instalacion.findMany({ where: { cuentaId }, select: { id: true, nombre: true } }),
  ]);
  const porMembresia = new Map(membresias.map((m) => [m.id, m]));
  const nombreInst = new Map(instalaciones.map((i) => [i.id, i.nombre]));
  return filas.flatMap((f) => {
    const m = porMembresia.get(f.membershipId);
    if (!m) return [];
    return [
      {
        id: f.id,
        membershipId: f.membershipId,
        userId: m.userId,
        nombre: m.user.name,
        email: m.user.email,
        cuentaId: f.cuentaId,
        contactoId: f.contactoId,
        estado: estadoAccesoSchema.catch("revocado").parse(f.estado),
        todasInstalaciones: f.todasInstalaciones,
        instalaciones: f.instalaciones.flatMap((i) => {
          const nombre = nombreInst.get(i.instalacionId);
          return nombre ? [{ id: i.instalacionId, nombre }] : [];
        }),
      },
    ];
  });
}

export const accesosListar = defineCapability({
  auditarLectura: (s) => s.map((a) => a.userId),
  id: "portal_cliente.accesos.listar",
  descripcion:
    "Lista los contactos de una cuenta cliente con acceso a su Portal Cliente, su estado y las instalaciones que cada uno puede ver (nombre y correo del usuario).",
  permiso: PERMISO_ACCESOS_READ,
  input: z.object({ cuentaId: uuidSchema }),
  output: z.array(accesoVistaSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { cuentaId }) {
    const cuenta = await cuentaDe(ctx, cuentaId);
    return accesosDeCuenta(ctx, cuenta.id);
  },
});

export const accesosCandidatos = defineCapability({
  auditarLectura: (s) => s.map((c) => c.userId),
  id: "portal_cliente.accesos.candidatos",
  descripcion:
    "Lista los usuarios de la empresa invitados solo al portal «cliente» que todavía no están vinculados a ninguna cuenta, para poder vincularlos a la cuenta de su cliente.",
  permiso: PERMISO_ACCESOS_READ,
  input: z.object({}),
  output: z.array(candidatoSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const [vinculados, miembros] = await Promise.all([
      ctx.db.accesoCliente.findMany({ select: { membershipId: true } }),
      ctx.db.membership.findMany({
        where: { rol: "viewer", estado: "activa", portales: { equals: ["cliente"] } },
        select: { id: true, rol: true, portales: true, userId: true, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const ya = new Set(vinculados.map((v) => v.membershipId));
    return miembros
      .filter((m) => !ya.has(m.id) && esMembresiaDeCliente(m.rol as Rol, m.portales))
      .map((m) => ({ membershipId: m.id, userId: m.userId, nombre: m.user.name, email: m.user.email }));
  },
});
