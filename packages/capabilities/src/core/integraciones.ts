import { z } from "zod";

import {
  CATALOGO_INTEGRACIONES,
  credencialDePlataforma,
  definicionIntegracion,
  enmascarar,
  sufijoParaGuardar,
} from "@opai/integrations";
import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { guardarSecreto } from "../integraciones/secretos";
import { integracionSchema, vistaIntegracion } from "./integraciones-vista";

export const integracionesList = defineCapability({
  id: "core.integraciones.list",
  descripcion:
    "Catálogo de integraciones de la empresa (correo, geolocalización, IA, WhatsApp, DTE, banco…) con modalidad, estado y secretos enmascarados. Nunca devuelve credenciales.",
  permiso: PERMISOS_CORE.integracionesManage,
  input: z.object({}),
  output: z.array(integracionSchema),
  efecto: "lectura",
  dryRun: false,
  handler: (ctx) => Promise.all(CATALOGO_INTEGRACIONES.map((d) => vistaIntegracion(ctx, d.id))),
});

export const integracionesGet = defineCapability({
  id: "core.integraciones.get",
  descripcion:
    "Detalle de una integración de la empresa: modalidad, configuración no secreta, estado y secretos enmascarados.",
  permiso: PERMISOS_CORE.integracionesManage,
  input: z.object({ proveedor: z.string() }),
  output: integracionSchema,
  efecto: "lectura",
  dryRun: false,
  handler: (ctx, input) => vistaIntegracion(ctx, input.proveedor),
});

export const integracionesConfigurar = defineCapability({
  id: "core.integraciones.configurar",
  // Credenciales y keys las gestionan personas: un agente no se crea keys ni cambia secretos.
  soloPersonas: true,
  descripcion:
    "Configura una integración: modalidad (de plataforma o propia del tenant) y configuración no secreta (remitente, modelos de IA por clase…). Los secretos van por core.integraciones.set_secreto.",
  permiso: PERMISOS_CORE.integracionesManage,
  input: z.object({
    proveedor: z.string(),
    modalidad: z.enum(["plataforma", "propia"]),
    config: z.record(z.string(), z.unknown()).default({}),
  }),
  output: integracionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const def = definicionIntegracion(input.proveedor);
    if (!def) throw noEncontrado(`La integración "${input.proveedor}"`);
    if (!def.disponible) throw reglaDeNegocio(`${def.nombre} estará disponible próximamente.`);
    if (!def.modalidades.includes(input.modalidad)) {
      throw reglaDeNegocio(`${def.nombre} no admite la modalidad "${input.modalidad}".`);
    }
    if (input.modalidad === "plataforma" && credencialDePlataforma(def.id) === null) {
      throw reglaDeNegocio(
        `${def.nombre} de plataforma no está disponible en este entorno: usa tus propias credenciales.`,
      );
    }
    const config = def.config.safeParse(input.config);
    if (!config.success)
      throw reglaDeNegocio(`Configuración inválida: ${config.error.issues[0]?.message ?? ""}`);
    if (dryRun)
      return {
        ...(await vistaIntegracion(ctx, def.id)),
        modalidad: input.modalidad,
        config: config.data,
      };
    const datos = {
      modalidad: input.modalidad,
      config: JSON.parse(JSON.stringify(config.data)),
      actualizadoPor: ctx.usuario?.id ?? null,
    };
    await ctx.transaccion(async (tx) => {
      await tx.integracion.upsert({
        where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: def.id } },
        create: { tenantId: ctx.tenantId, proveedor: def.id, estado: "configurada", ...datos },
        update: { ...datos, estado: "configurada", ultimoError: null },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.integracion.actualizada",
        entidadTipo: "integracion",
        entidadId: def.id,
        payload: { modalidad: input.modalidad },
      });
    });
    return vistaIntegracion(ctx, def.id);
  },
});

export const integracionesSetSecreto = defineCapability({
  id: "core.integraciones.set_secreto",
  // Credenciales y keys las gestionan personas: un agente no se crea keys ni cambia secretos.
  soloPersonas: true,
  descripcion:
    "Guarda una credencial propia de la empresa para una integración (cifrada; se muestra una sola vez enmascarada). La auditoría nunca guarda el valor.",
  permiso: PERMISOS_CORE.integracionesManage,
  sensibles: ["valor"],
  input: z.object({
    proveedor: z.string(),
    nombre: z.string(),
    valor: z.string().trim().min(8).max(4000),
  }),
  output: z.object({ proveedor: z.string(), nombre: z.string(), mascara: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const def = definicionIntegracion(input.proveedor);
    if (!def?.disponible) throw noEncontrado(`La integración "${input.proveedor}"`);
    if (!def.secretos.some((s) => s.nombre === input.nombre)) {
      throw reglaDeNegocio(`${def.nombre} no usa el secreto "${input.nombre}".`);
    }
    const mascara = enmascarar(sufijoParaGuardar(input.nombre, input.valor));
    if (dryRun) return { proveedor: def.id, nombre: input.nombre, mascara };
    const fila = await ctx.db.integracion.upsert({
      where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: def.id } },
      create: {
        tenantId: ctx.tenantId,
        proveedor: def.id,
        modalidad: "propia",
        estado: "configurada",
      },
      // Guardar un secreto propio pasa la integración a modalidad propia (si no, no se usaría).
      update: { modalidad: "propia", estado: "configurada", ultimoError: null },
    });
    await guardarSecreto(ctx, fila.id, input.nombre, input.valor);
    return { proveedor: def.id, nombre: input.nombre, mascara };
  },
});
