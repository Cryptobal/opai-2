import { z } from "zod";

import {
  DIAS_PRUEBA_GRATIS,
  entradaCatalogo,
  esParteFinanzas,
  estadoPruebaGratis,
  extenderPruebaGratis,
  MODULO_FINANZAS,
  PERMISOS_PLATAFORMA,
} from "@opai/domain";

import { defineCapability } from "../../../define";
import { noEncontrado, reglaDeNegocio } from "../../../errores";
import { requierePlataforma } from "../../comun";
import { uuidSchema } from "../../esquemas";
import { aFecha, dia, hoy } from "../../maestros/comun";

export const platformCobrosPruebaGratisExtender = defineCapability({
  id: "platform.cobros.prueba_gratis_extender",
  descripcion:
    "Plataforma: extiende o reactiva la prueba gratis que una empresa ya activó de un módulo o de una parte de Finanzas, por los días indicados (10 por defecto): desde su último día si sigue vigente, o desde hoy si ya terminó. Si el módulo quedó en solo lectura vuelve a estar en prueba. No crea precios ni cargos.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({
    tenantId: uuidSchema,
    moduloId: z.string().min(1).max(60),
    dias: z.number().int().min(1).max(60).default(DIAS_PRUEBA_GRATIS),
  }),
  output: z.object({
    moduloId: z.string(),
    hastaAntes: z.string(),
    hasta: z.string().describe("Nuevo último día de la prueba (aaaa-mm-dd)."),
    extensiones: z.number().int(),
    reactivada: z.boolean().describe("true si la prueba ya había terminado."),
    estadoModulo: z.string().describe("Estado del módulo después del cambio."),
  }),
  // Irreversible para agentes (aprobación humana): le da a una empresa acceso por más días.
  efecto: "irreversible",
  dryRun: true,
  tenantObjetivo: (input) => input.tenantId,
  cambio: (s) => ({
    antes: { hasta: s.hastaAntes },
    despues: { hasta: s.hasta, extensiones: s.extensiones },
  }),
  async handler(ctx, input, { dryRun }) {
    const p = requierePlataforma(ctx);
    if (!(await p.globales.tenantPorId(input.tenantId))) throw noEncontrado("La empresa");
    const entrada = entradaCatalogo(input.moduloId);
    if (!entrada) throw noEncontrado(`El módulo "${input.moduloId}"`);
    const e = p.empresa(input.tenantId);
    const prueba = await e.pruebaGratis(input.moduloId);
    if (!prueba)
      throw reglaDeNegocio(
        `La empresa no ha activado la prueba gratis de ${entrada.nombre}: la activa ella desde su ERP.`,
      );
    const modulo = esParteFinanzas(input.moduloId) ? MODULO_FINANZAS : input.moduloId;
    const estado = (await e.modulos()).find((m) => m.moduloId === modulo)?.estado ?? null;
    if (estado === "suspendido")
      throw reglaDeNegocio("El módulo está suspendido: reactívalo desde la pestaña Módulos.");
    if (estado === "activo") throw reglaDeNegocio("El módulo ya está activo: no necesita prueba.");
    const hastaAntes = dia(prueba.hasta) ?? hoy();
    const hasta = extenderPruebaGratis(hastaAntes, hoy(), input.dias);
    const salida = {
      moduloId: input.moduloId,
      hastaAntes,
      hasta,
      extensiones: prueba.extensiones + 1,
      reactivada: estadoPruebaGratis(hastaAntes, hoy()) === "vencida",
      estadoModulo: "trial",
    };
    if (!dryRun) {
      await e.actualizarPruebaGratis(input.moduloId, aFecha(hasta), salida.extensiones);
      if (estado !== "trial") {
        await e.fijarModulo(modulo, "trial");
        await e.sembrarModulo(modulo);
      }
    }
    return salida;
  },
});
