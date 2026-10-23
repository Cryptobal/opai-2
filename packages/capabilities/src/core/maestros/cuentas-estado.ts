import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { aFecha, escribirConEvento, hoy, rutSchema } from "./comun";
import { cuentaDe } from "./cuentas";
import { cuentaSchema, ESTADOS_CUENTA, vistaCuenta } from "./cuentas-vista";

type EstadoCuenta = (typeof ESTADOS_CUENTA)[number];

/** Máquina de estados de la cuenta (principio 8): prospecto → activo ⇄ inactivo. */
const TRANSICIONES: Record<EstadoCuenta, readonly EstadoCuenta[]> = {
  prospecto: ["cliente_activo"],
  cliente_activo: ["cliente_inactivo"],
  cliente_inactivo: ["cliente_activo"],
};

export const cuentasSetEstado = defineCapability({
  id: "core.cuentas.set_estado",
  descripcion:
    "Cambia el estado comercial de una cuenta: prospecto → cliente activo → cliente inactivo (y de vuelta a activo). Al activar por primera vez fija 'cliente desde'.",
  permiso: PERMISOS_CORE.cuentasManage,
  input: z.object({ id: uuidSchema, estado: z.enum(ESTADOS_CUENTA) }),
  output: cuentaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const c = await cuentaDe(ctx, input.id);
    const desde = c.estado as EstadoCuenta;
    if (!TRANSICIONES[desde]?.includes(input.estado)) {
      throw reglaDeNegocio(`Una cuenta en "${desde}" no puede pasar a "${input.estado}".`);
    }
    const fecha = aFecha(hoy());
    const data =
      input.estado === "cliente_activo"
        ? { estado: input.estado, clienteDesde: c.clienteDesde ?? fecha, clienteHasta: null }
        : { estado: input.estado, clienteHasta: fecha };
    if (dryRun) return vistaCuenta({ ...c, ...data });
    const r = await escribirConEvento(
      ctx,
      {
        tipo: "core.cuenta.estado_cambiado",
        entidadTipo: "cuenta",
        payload: () => ({ desde, hacia: input.estado }),
      },
      (tx) => tx.cuenta.update({ where: { id: c.id }, data }),
    );
    return vistaCuenta(r);
  },
});

export const cuentasArchive = defineCapability({
  id: "core.cuentas.archive",
  descripcion:
    "Archiva una cuenta (no se borra: deja de aparecer en listas). No se puede si tiene instalaciones activas.",
  permiso: PERMISOS_CORE.cuentasManage,
  input: z.object({ id: uuidSchema }),
  output: cuentaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const c = await cuentaDe(ctx, input.id);
    const activas = await ctx.db.instalacion.count({
      where: { cuentaId: c.id, estado: "activa", archivadaEn: null },
    });
    if (activas) {
      throw reglaDeNegocio(
        `La cuenta tiene ${activas} instalación(es) activa(s); desactívalas antes.`,
      );
    }
    const data = { archivadaEn: c.archivadaEn ?? new Date() };
    if (dryRun) return vistaCuenta({ ...c, ...data });
    const r = await escribirConEvento(
      ctx,
      { tipo: "core.cuenta.archivada", entidadTipo: "cuenta" },
      (tx) => tx.cuenta.update({ where: { id: c.id }, data }),
    );
    return vistaCuenta(r);
  },
});

const representanteSchema = z.object({
  nombre: z.string().trim().min(3).max(160),
  rut: rutSchema,
  email: z.email().nullable().optional(),
});

export const cuentasSetRepresentantes = defineCapability({
  id: "core.cuentas.set_representantes",
  descripcion:
    "Reemplaza la lista de representantes legales de una cuenta (nombre, RUT y correo). Se usan en contratos y propuestas.",
  permiso: PERMISOS_CORE.cuentasManage,
  input: z.object({ cuentaId: uuidSchema, representantes: z.array(representanteSchema).max(10) }),
  output: z.array(representanteSchema.extend({ id: z.string(), email: z.string().nullable() })),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const c = await cuentaDe(ctx, input.cuentaId);
    const filas = input.representantes.map((r) => ({ ...r, email: r.email ?? null }));
    if (dryRun) return filas.map((r) => ({ ...r, id: "" }));
    return ctx.transaccion(async (tx) => {
      await tx.cuentaRepresentante.deleteMany({ where: { cuentaId: c.id } });
      const creados = [];
      for (const r of filas) {
        creados.push(
          await tx.cuentaRepresentante.create({
            data: { ...r, tenantId: ctx.tenantId, cuentaId: c.id },
          }),
        );
      }
      return creados.map((r) => ({ id: r.id, nombre: r.nombre, rut: r.rut, email: r.email }));
    });
  },
});
