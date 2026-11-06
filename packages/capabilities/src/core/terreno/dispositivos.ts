import { z } from "zod";

import { nuevoCodigoEmparejamiento, hmacDispositivo, VIGENCIA_CODIGO_MIN } from "@opai/db";
import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { dondeInstalacion } from "../maestros/alcance";
import { quien } from "./comun";

const iso = (d: Date | null) => (d ? d.toISOString() : null);

const dispositivoSchema = z.object({
  id: z.string(),
  instalacionId: z.string(),
  identificador: z.string(),
  estado: z.enum(["activo", "revocado"]),
  emparejadoEn: z.string(),
  ultimoContacto: z.string().nullable(),
  versionApp: z.string().nullable(),
  revocadoEn: z.string().nullable(),
});

type Fila = Awaited<ReturnType<Contexto["db"]["dispositivo"]["findFirstOrThrow"]>>;
const vista = (d: Fila) => ({
  id: d.id,
  instalacionId: d.instalacionId,
  identificador: d.identificador,
  estado: d.estado === "activo" ? ("activo" as const) : ("revocado" as const),
  emparejadoEn: d.emparejadoEn.toISOString(),
  ultimoContacto: iso(d.ultimoContacto),
  versionApp: d.versionApp,
  revocadoEn: iso(d.revocadoEn),
});

/** La instalación dentro del alcance del actor, o NOT_FOUND (igual que si fuera de otra empresa). */
async function instalacionVisible(ctx: Contexto, id: string) {
  const i = await ctx.db.instalacion.findFirst({
    where: { id, AND: [dondeInstalacion(ctx)] },
    select: { id: true },
  });
  if (!i) throw noEncontrado("La instalación");
  return i;
}

/** El dispositivo de una instalación dentro del alcance del actor, o NOT_FOUND. */
async function dispositivoVisible(ctx: Contexto, id: string) {
  const d = await ctx.db.dispositivo.findFirst({ where: { id } });
  if (!d) throw noEncontrado("El dispositivo");
  await instalacionVisible(ctx, d.instalacionId);
  return d;
}

export const dispositivosListar = defineCapability({
  id: "core.dispositivos.listar",
  descripcion:
    "Lista los dispositivos de terreno emparejados a una instalación, con su estado (activo o revocado), último contacto y versión de la app. Nunca muestra el token del dispositivo.",
  permiso: PERMISOS_CORE.instalacionesRead,
  input: z.object({ instalacionId: uuidSchema }),
  output: z.object({ items: z.array(dispositivoSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.items.map((d) => d.id),
  async handler(ctx, { instalacionId }) {
    await instalacionVisible(ctx, instalacionId);
    const filas = await ctx.db.dispositivo.findMany({
      where: { instalacionId },
      orderBy: { emparejadoEn: "desc" },
      take: 200,
    });
    return { items: filas.map(vista) };
  },
});

export const dispositivosEstado = defineCapability({
  id: "core.dispositivos.estado",
  descripcion:
    "Muestra el estado de un dispositivo de terreno: si sigue emparejado o fue revocado, cuándo contactó por última vez y qué versión de la app usa.",
  permiso: PERMISOS_CORE.instalacionesRead,
  input: z.object({ dispositivoId: uuidSchema }),
  output: dispositivoSchema,
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => [salida.id],
  async handler(ctx, { dispositivoId }) {
    return vista(await dispositivoVisible(ctx, dispositivoId));
  },
});

const codigoSchema = z.object({
  aplicado: z.boolean(),
  /** Se muestra una vez; en la vista previa y en repeticiones con la misma clave, `null`. */
  codigo: z.string().nullable(),
  venceEn: z.string().nullable(),
  /** Texto del QR: lleva el código a la pantalla de Terreno › Emparejar. */
  url: z.string().nullable(),
});

export const dispositivosGenerarCodigo = defineCapability({
  id: "core.dispositivos.generar_codigo",
  descripcion:
    "Genera el código de 6 caracteres para emparejar un dispositivo de terreno a una instalación. Vence a los 10 minutos y sirve una sola vez; se muestra una sola vez junto con su QR.",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({ instalacionId: uuidSchema }),
  output: codigoSchema,
  efecto: "escritura",
  dryRun: true,
  salidaIdempotente: (s) => ({ ...s, codigo: null, url: null }),
  auditoriaPayload: (_ctx, e) => ({ instalacionId: e.instalacionId }),
  async handler(ctx, { instalacionId }, { dryRun }) {
    await instalacionVisible(ctx, instalacionId);
    if (dryRun) return { aplicado: false, codigo: null, venceEn: null, url: null };
    const venceEn = new Date(Date.now() + VIGENCIA_CODIGO_MIN * 60_000);
    // Un código vigente por instalación: generar otro invalida los anteriores sin usar.
    const codigo = await ctx.transaccion(async (tx) => {
      await tx.codigoEmparejamiento.deleteMany({ where: { instalacionId, usadoEn: null } });
      const c = nuevoCodigoEmparejamiento();
      await tx.codigoEmparejamiento.create({
        data: {
          tenantId: ctx.tenantId,
          instalacionId,
          codigoHash: hmacDispositivo(c),
          venceEn,
          creadoPor: quien(ctx),
        },
      });
      return c;
    });
    const url = `${ctx.servicios.urlBase}/terreno/emparejar?c=${codigo}`;
    return { aplicado: true, codigo, venceEn: venceEn.toISOString(), url };
  },
});

export const dispositivosRevocar = defineCapability({
  id: "core.dispositivos.revocar",
  descripcion:
    "Revoca un dispositivo de terreno: corta su acceso al instante. En su siguiente petición el equipo avisa que ya no está emparejado y borra los datos de la instalación. Para volver a usarlo hay que emparejarlo de nuevo.",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({ dispositivoId: uuidSchema }),
  output: z.object({ aplicado: z.boolean(), dispositivo: dispositivoSchema }),
  efecto: "irreversible",
  dryRun: true,
  auditoriaPayload: (_ctx, e) => ({ dispositivoId: e.dispositivoId }),
  async handler(ctx, { dispositivoId }, { dryRun }) {
    const d = await dispositivoVisible(ctx, dispositivoId);
    if (d.estado === "revocado") throw reglaDeNegocio("Este dispositivo ya estaba revocado.");
    if (dryRun) return { aplicado: false, dispositivo: vista(d) };
    const nuevo = await ctx.transaccion((tx) =>
      tx.dispositivo.update({
        where: { id: d.id },
        data: { estado: "revocado", revocadoEn: new Date(), revocadoPor: quien(ctx) },
      }),
    );
    return { aplicado: true, dispositivo: vista(nuevo) };
  },
});

export const capacidadesDispositivos = [
  dispositivosListar,
  dispositivosEstado,
  dispositivosGenerarCodigo,
  dispositivosRevocar,
];
