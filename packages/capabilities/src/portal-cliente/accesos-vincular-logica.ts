import { esMembresiaDeCliente, type Rol } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { escribirConEvento } from "../core/maestros/comun";
import { conflicto, noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { instalacionesDeLaCuenta } from "./accesos-comun";
import type { AccesoVista } from "./accesos-vista";
import { ROL_CONTACTO_CLIENTE, cuentaDe, instalacionesDeCuenta } from "./comun";

export const vincularInputSchema = z.object({
  membershipId: uuidSchema,
  cuentaId: uuidSchema,
  contactoId: uuidSchema.nullable().optional(),
  todasInstalaciones: z.boolean().default(false),
  instalacionIds: z.array(uuidSchema).max(200).default([]),
});

/**
 * Vincula una membresía de cliente con una cuenta (lógica de `portal_cliente.accesos.vincular`,
 * compartida con el envío de CPQ para no abrir un camino paralelo). El permiso lo verifica quien llama.
 */
export async function vincularAcceso(
  ctx: Contexto,
  input: z.output<typeof vincularInputSchema>,
  dryRun: boolean,
): Promise<AccesoVista> {
  const cuenta = await cuentaDe(ctx, input.cuentaId);
  if (cuenta.archivadaEn) throw reglaDeNegocio("La cuenta está archivada.");
  const m = await ctx.db.membership.findUnique({
    where: { id: input.membershipId },
    select: { id: true, rol: true, portales: true, estado: true, userId: true, user: { select: { name: true, email: true } } },
  });
  if (!m) throw noEncontrado("La membresía");
  if (m.estado !== "activa" || !esMembresiaDeCliente(m.rol as Rol, m.portales))
    throw reglaDeNegocio(
      "Solo se vincula a un usuario invitado con rol viewer y el portal «cliente» como único portal.",
    );
  if (input.contactoId) {
    const c = await ctx.db.contacto.findFirst({
      where: { id: input.contactoId, cuentaId: cuenta.id },
      select: { id: true },
    });
    if (!c) throw noEncontrado("El contacto de la cuenta");
  }
  const instalaciones = input.todasInstalaciones
    ? []
    : await instalacionesDeLaCuenta(ctx, cuenta.id, input.instalacionIds);
  const previo = await ctx.db.accesoCliente.findUnique({
    where: { tenantId_membershipId: { tenantId: ctx.tenantId, membershipId: m.id } },
  });
  if (previo && previo.estado !== "revocado")
    throw conflicto("Ese usuario ya tiene un acceso al Portal Cliente. Edítalo en vez de vincularlo.");
  const nombres = new Map((await instalacionesDeCuenta(ctx, cuenta.id)).map((i) => [i.id, i.nombre]));
  const vista: AccesoVista = {
    id: previo?.id ?? "",
    membershipId: m.id,
    userId: m.userId,
    nombre: m.user.name,
    email: m.user.email,
    cuentaId: cuenta.id,
    contactoId: input.contactoId ?? null,
    estado: "activo",
    todasInstalaciones: input.todasInstalaciones,
    instalaciones: instalaciones.map((id) => ({ id, nombre: nombres.get(id) ?? "" })),
  };
  if (dryRun) return vista;
  const fila = await escribirConEvento(
    ctx,
    {
      tipo: "portal_cliente.acceso.vinculado",
      entidadTipo: "cuenta",
      payload: () => ({ cuentaId: cuenta.id, membershipId: m.id }),
    },
    async (tx) => {
      const datos = {
        cuentaId: cuenta.id,
        contactoId: input.contactoId ?? null,
        estado: "activo",
        todasInstalaciones: input.todasInstalaciones,
        creadoPor: ctx.usuario?.id ?? null,
      };
      const acceso = previo
        ? await tx.accesoCliente.update({ where: { id: previo.id }, data: datos })
        : await tx.accesoCliente.create({
            data: { tenantId: ctx.tenantId, membershipId: m.id, ...datos },
          });
      await tx.accesoInstalacion.deleteMany({ where: { accesoId: acceso.id } });
      if (instalaciones.length > 0)
        await tx.accesoInstalacion.createMany({
          data: instalaciones.map((instalacionId) => ({
            tenantId: ctx.tenantId,
            accesoId: acceso.id,
            instalacionId,
          })),
        });
      // El contacto del cliente solo recibe `portal_cliente:read`: nunca el `*:read` de viewer.
      const rol = await tx.rol.upsert({
        where: { tenantId_nombre: { tenantId: ctx.tenantId, nombre: ROL_CONTACTO_CLIENTE } },
        create: {
          tenantId: ctx.tenantId,
          nombre: ROL_CONTACTO_CLIENTE,
          descripcion: "Contacto de un cliente: usa su Portal Cliente y nada del ERP.",
          sistema: true,
          permisos: ["portal_cliente:read"],
        },
        update: {},
      });
      await tx.membership.update({ where: { id: m.id }, data: { roleId: rol.id } });
      return acceso;
    },
  );
  return { ...vista, id: fila.id };
}
