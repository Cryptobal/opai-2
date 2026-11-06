import { z } from "zod";

import { esParteFinanzas, MODULO_FINANZAS, PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../../define";
import { noEncontrado, reglaDeNegocio } from "../../../errores";
import { obtenerModulo } from "../../../module";
import { requierePlataforma } from "../../comun";
import { uuidSchema } from "../../esquemas";
import { aFecha, diaSchema, hoy } from "../../maestros/comun";
import { exigirCobrable, validarPartes } from "./partes";
import { diasEntre } from "./pruebas";

const ACTIVOS = new Set(["activo", "trial", "solo_lectura"]);

export const platformCobrosPruebaAbrir = defineCapability({
  id: "platform.cobros.prueba_abrir",
  descripcion:
    "Plataforma: abre una prueba de un módulo a una empresa ya validada (con RUT) hasta una fecha. El módulo debe tener su condición de cobro. Al vencer, si se marcó «pasa a cobro» empieza a cobrarse al día siguiente; si no, el módulo queda en solo lectura (se ve y se lee, nada se borra). Siete días antes avisa a Plataforma.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({
    tenantId: uuidSchema,
    moduloId: z.string().min(1).max(60),
    pruebaHasta: diaSchema.describe("Último día de la prueba (aaaa-mm-dd), posterior a hoy."),
    pasaACobro: z
      .boolean()
      .default(false)
      .describe("Al vencer: true se cobra desde el día siguiente; false queda en solo lectura."),
  }),
  output: z.object({
    moduloId: z.string(),
    estadoAnterior: z.string().nullable(),
    estado: z.literal("trial"),
    pruebaHasta: z.string(),
    pasaACobro: z.boolean(),
    diasDePrueba: z.number().int(),
  }),
  // Irreversible para agentes: le da a una empresa un módulo y fija qué pasa al vencer.
  efecto: "irreversible",
  dryRun: true,
  tenantObjetivo: (input) => input.tenantId,
  cambio: (s) => ({
    antes: { estado: s.estadoAnterior },
    despues: { estado: s.estado, pruebaHasta: s.pruebaHasta, pasaACobro: s.pasaACobro },
  }),
  async handler(ctx, input, { dryRun }) {
    const p = requierePlataforma(ctx);
    if (!(await p.globales.tenantPorId(input.tenantId))) throw noEncontrado("La empresa");
    exigirCobrable(input.moduloId);
    // Una parte de Finanzas se prueba dentro del módulo: su prueba vive en su condición (ADR-072).
    const parte = esParteFinanzas(input.moduloId);
    const manifest = obtenerModulo(parte ? MODULO_FINANZAS : input.moduloId);
    if (!manifest) throw noEncontrado(`El módulo "${input.moduloId}"`);
    const e = p.empresa(input.tenantId);
    // Sin RUT no hay a quién facturar: la prueba exige una empresa validada (ADR-071, adenda).
    if (!(await e.perfilTributario())?.rut)
      throw reglaDeNegocio(
        "La empresa no tiene RUT: complétalo en su ficha antes de abrir una prueba.",
      );
    const condicion = await e.condicionCobro(input.moduloId);
    if (!condicion)
      throw reglaDeNegocio("Fija primero el precio del módulo en la pestaña Cobro de la empresa.");
    if (input.pruebaHasta <= hoy()) throw reglaDeNegocio("La prueba debe terminar después de hoy.");
    const estados = new Map((await e.modulos()).map((m) => [m.moduloId, m.estado]));
    const anterior = estados.get(parte ? MODULO_FINANZAS : input.moduloId) ?? null;
    if (parte) {
      if (!ACTIVOS.has(anterior ?? "")) throw reglaDeNegocio(`Activa antes: ${MODULO_FINANZAS}.`);
      await validarPartes(e, input.moduloId);
    } else if (anterior === "activo")
      throw reglaDeNegocio(
        "El módulo ya está activo: una prueba es para uno que aún no se contrata.",
      );
    const faltan = manifest.dependencias.filter((d) => !ACTIVOS.has(estados.get(d) ?? ""));
    if (faltan.length) throw reglaDeNegocio(`Activa antes: ${faltan.join(", ")}.`);
    if (!dryRun) {
      const { id: _id, moduloId: _m, updatedAt: _u, ...datos } = condicion;
      await e.fijarCondicionCobro(input.moduloId, {
        ...datos,
        pruebaHasta: aFecha(input.pruebaHasta),
        pasaACobro: input.pasaACobro,
      });
      if (!parte) {
        await e.fijarModulo(input.moduloId, "trial");
        await e.sembrarModulo(input.moduloId);
      }
    }
    return {
      moduloId: input.moduloId,
      estadoAnterior: anterior,
      estado: "trial" as const,
      pruebaHasta: input.pruebaHasta,
      pasaACobro: input.pasaACobro,
      diasDePrueba: diasEntre(hoy(), input.pruebaHasta),
    };
  },
});
