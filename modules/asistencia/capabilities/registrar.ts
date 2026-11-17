import { z } from "zod";

import { ajuste, defineCapability, reglaDeNegocio } from "@opai/capabilities";

import { CANALES, METODOS, MOTIVOS_RESPALDO } from "../domain";
import { armarRegistro } from "./armar-registro";
import { marcaVistaSchema, uuid, vistaDeMarca } from "./esquemas";
import {
  cargarEntidadesMarca,
  datosArmadoMarca,
  persistirMarca,
  resolverCanal,
  verificarIdentidadMarca,
} from "./registrar-flujo";

export const marcasRegistrar = defineCapability({
  id: "asistencia.marcas.registrar",
  descripcion:
    "Registra una marca legal de asistencia de un trabajador (entrada, salida o colación) con la hora del servidor, su identificación, el turno esperado y la ubicación como evidencia. El GPS nunca bloquea la marca. Solo la hace una persona desde Terreno o el Portal Trabajador: un agente nunca marca por un trabajador.",
  permiso: null,
  portales: ["terreno", "trabajador"],
  soloPersonas: true,
  sensibles: ["credencial", "muestra"],
  input: z.object({
    personaId: uuid,
    instalacionId: uuid,
    metodo: z.enum(METODOS),
    credencial: z.string().max(64).optional(),
    motivoRespaldo: z.enum(MOTIVOS_RESPALDO).optional(),
    muestra: z.string().min(8).max(2_000_000).optional(),
    tipo: z.enum(["inicio_colacion", "fin_colacion"]).optional(),
    claveDispositivo: z.string().min(8).max(128),
    origen: z.enum(["en_linea", "offline_queue"]).default("en_linea"),
    horaDispositivo: z.string().datetime().optional(),
    canal: z.enum(CANALES).optional(),
    enlacePublicoValidado: z.literal(true).optional(),
    dispositivoId: uuid.optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    precisionM: z.number().min(0).max(100_000).optional(),
  }),
  output: z.object({ marca: marcaVistaSchema, repetida: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, entrada, { dryRun }) {
    if (!(await ajuste<boolean>(ctx, "asistencia", "marcas_habilitadas")))
      throw reglaDeNegocio("Las marcas de asistencia aún no están habilitadas en esta empresa.");
    const { persona, instalacion } = await cargarEntidadesMarca(ctx, entrada.personaId, entrada.instalacionId);
    const previa = dryRun
      ? null
      : await ctx.db.marca.findUnique({
          where: { tenantId_idempotencyKey: { tenantId: ctx.tenantId, idempotencyKey: entrada.claveDispositivo } },
        });
    if (previa?.personaId === persona.id) return { marca: vistaDeMarca(previa), repetida: true };
    const canal = await resolverCanal(ctx, entrada, persona.id, instalacion.id);
    const i = { ...entrada, canal };
    const identidad = await verificarIdentidadMarca(ctx, i, persona.id, dryRun);
    const datos = await datosArmadoMarca(ctx, persona.id, instalacion, identidad);
    if (dryRun) {
      return {
        marca: vistaDeMarca({ ...(await armarRegistro(ctx.db, { ...datos, seq: 0 }, i)), id: "", hash: "" }),
        repetida: false,
      };
    }
    return persistirMarca(ctx, i, persona.id, datos, instalacion.id);
  },
});