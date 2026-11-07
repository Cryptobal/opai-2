import { z } from "zod";

import { esMembresiaDeCliente, type Rol } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { asegurarAccesoContacto } from "./acceso-contacto";
import { PERMISO_ACCESOS_MANAGE, PERMISO_ACCESOS_READ, cuentaDe } from "./comun";

/**
 * Acceso al Portal Cliente de cada contacto de una cuenta (CAR-218). Los contactos del cliente no son
 * usuarios del ERP: son las personas ya asociadas a la cuenta; desde aquí se les da o se les quita el
 * acceso. «Dar acceso» reutiliza el flujo de CPQ (`asegurarAccesoContacto`); «quitar» o «suspender» sigue
 * siendo `portal_cliente.accesos.actualizar` con el `accesoId` que devuelve el listado.
 */
const estadoContactoSchema = z.enum([
  "sin_acceso",
  "invitacion_pendiente",
  "activo",
  "suspendido",
  "revocado",
  "sin_correo",
  "no_disponible",
]);

const contactoAccesoSchema = z.object({
  contactoId: z.string(),
  nombre: z.string(),
  /** Correo del contacto (dato personal): solo para quien puede ver los accesos de la cuenta. */
  email: z.string().nullable(),
  cargo: z.string().nullable(),
  esPrincipal: z.boolean(),
  estado: estadoContactoSchema,
  /** Para suspender o revocar con `portal_cliente.accesos.actualizar`; null si no tiene vínculo. */
  accesoId: z.string().nullable(),
  /** Por qué no se puede dar acceso (vinculado a otra cuenta, usuario interno…). */
  motivo: z.string().optional(),
});

const LIMITE_CONTACTOS = 200;
const correoValido = (s: string | null) =>
  s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s.toLowerCase() : null;

export const contactosAccesoListar = defineCapability({
  // Revela correos de personas: se audita cada contacto mostrado, sin copiar su contenido (NÚCLEO-H).
  auditarLectura: (s) => s.map((c) => c.contactoId),
  id: "portal_cliente.contactos.listar",
  descripcion:
    "Lista los contactos vigentes de una cuenta cliente con el estado de su acceso al Portal Cliente (sin acceso, invitación pendiente, activo, suspendido o revocado), para darles o quitarles acceso desde la cuenta.",
  permiso: PERMISO_ACCESOS_READ,
  input: z.object({ cuentaId: uuidSchema }),
  output: z.array(contactoAccesoSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { cuentaId }) {
    const cuenta = await cuentaDe(ctx, cuentaId);
    const contactos = await ctx.db.contacto.findMany({
      where: { cuentaId: cuenta.id, estado: "activo", archivadoEn: null, anonimizadoEn: null },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        email: true,
        cargo: true,
        esPrincipal: true,
      },
      orderBy: [{ esPrincipal: "desc" }, { apellidos: "asc" }, { nombres: "asc" }],
      take: LIMITE_CONTACTOS,
    });
    const correos = [...new Set(contactos.flatMap((c) => correoValido(c.email) ?? []))];
    const usuarios = correos.length
      ? await ctx.db.user.findMany({
          where: { email: { in: correos } },
          select: { id: true, email: true },
        })
      : [];
    const [membresias, pendientes] = await Promise.all([
      usuarios.length
        ? ctx.db.membership.findMany({
            where: { tenantId: ctx.tenantId, userId: { in: usuarios.map((u) => u.id) } },
            select: { id: true, userId: true, rol: true, portales: true, estado: true },
          })
        : [],
      correos.length
        ? ctx.db.invitation.findMany({
            where: {
              email: { in: correos },
              acceptedAt: null,
              revocadaEn: null,
              expiresAt: { gt: new Date() },
            },
            select: { email: true },
          })
        : [],
    ]);
    const accesos = membresias.length
      ? await ctx.db.accesoCliente.findMany({
          where: { membershipId: { in: membresias.map((m) => m.id) } },
          select: { id: true, membershipId: true, cuentaId: true, estado: true },
        })
      : [];
    const usuarioPorCorreo = new Map(usuarios.map((u) => [u.email.toLowerCase(), u.id]));
    const membresiaPorUsuario = new Map(membresias.map((m) => [m.userId, m]));
    const accesoPorMembresia = new Map(accesos.map((a) => [a.membershipId, a]));
    const conInvitacion = new Set(pendientes.map((p) => p.email.toLowerCase()));

    return contactos.map((c) => {
      const base = {
        contactoId: c.id,
        nombre: `${c.nombres} ${c.apellidos}`.trim(),
        email: c.email,
        cargo: c.cargo,
        esPrincipal: c.esPrincipal,
        accesoId: null as string | null,
      };
      const correo = correoValido(c.email);
      if (!correo) return { ...base, estado: "sin_correo" as const };
      const userId = usuarioPorCorreo.get(correo);
      const m = userId ? membresiaPorUsuario.get(userId) : undefined;
      if (m) {
        if (m.estado !== "activa" || !esMembresiaDeCliente(m.rol as Rol, m.portales))
          return { ...base, estado: "no_disponible" as const, motivo: "usuario_interno" };
        const a = accesoPorMembresia.get(m.id);
        if (!a) return { ...base, estado: "sin_acceso" as const };
        if (a.cuentaId !== cuenta.id)
          return { ...base, estado: "no_disponible" as const, motivo: "vinculado_a_otra_cuenta" };
        const estado = estadoContactoSchema.catch("revocado").parse(a.estado);
        return { ...base, estado, accesoId: a.id };
      }
      return {
        ...base,
        estado: conInvitacion.has(correo)
          ? ("invitacion_pendiente" as const)
          : ("sin_acceso" as const),
      };
    });
  },
});

const resultadoSchema = z.object({
  estado: z.enum(["ya_tiene_acceso", "vinculado", "invitado", "invitacion_pendiente", "no_aplica"]),
  motivo: z.string().optional(),
});

export const contactosAccesoDar = defineCapability({
  id: "portal_cliente.contactos.dar_acceso",
  descripcion:
    "Da acceso al Portal Cliente a un contacto de la cuenta: si ya tiene usuario de cliente lo vincula; si no, le envía la invitación del núcleo. No habilita instalaciones (se amplían después) y no repite una invitación vigente. Un agente queda en aprobación humana.",
  permiso: PERMISO_ACCESOS_MANAGE,
  input: z.object({ cuentaId: uuidSchema, contactoId: uuidSchema }),
  output: resultadoSchema,
  // Gobierna el acceso de otra persona a datos de un cliente y puede enviar un correo a un tercero:
  // para un agente es irreversible (aprobación humana), como portal_cliente.accesos.vincular.
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    return asegurarAccesoContacto(ctx, input, dryRun);
  },
});
