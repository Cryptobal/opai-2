import { z } from "zod";

import {
  diasRestantesPrueba,
  entradaCatalogo,
  estadoPruebaGratis,
  PERMISOS_PLATAFORMA,
} from "@opai/domain";

import { defineCapability } from "../../../define";
import { noEncontrado } from "../../../errores";
import { requierePlataforma } from "../../comun";
import { uuidSchema } from "../../esquemas";
import { dia, hoy } from "../../maestros/comun";

export const platformCobrosPruebasGratisList = defineCapability({
  id: "platform.cobros.pruebas_gratis_list",
  descripcion:
    "Plataforma: pruebas gratis que una empresa activó desde su ERP (módulos y partes de Finanzas), con fechas, días que le quedan, cuántas veces se extendió y si ya terminó. Es lo que se extiende o reactiva con la herramienta de extensión.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({ tenantId: uuidSchema }),
  output: z.array(
    z.object({
      moduloId: z.string(),
      nombre: z.string(),
      inicio: z.string(),
      hasta: z.string().describe("Último día de la prueba (aaaa-mm-dd)."),
      estado: z.enum(["vigente", "vencida"]),
      diasRestantes: z.number().int(),
      extensiones: z.number().int(),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input) {
    const p = requierePlataforma(ctx);
    if (!(await p.globales.tenantPorId(input.tenantId))) throw noEncontrado("La empresa");
    return (await p.empresa(input.tenantId).pruebasGratis()).map((f) => {
      const hasta = dia(f.hasta) ?? hoy();
      return {
        moduloId: f.moduloId,
        nombre: entradaCatalogo(f.moduloId)?.nombre ?? f.moduloId,
        inicio: dia(f.inicio) ?? hasta,
        hasta,
        estado: estadoPruebaGratis(hasta, hoy()),
        diasRestantes: diasRestantesPrueba(hasta, hoy()),
        extensiones: f.extensiones,
      };
    });
  },
});
