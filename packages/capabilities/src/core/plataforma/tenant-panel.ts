import { z } from "zod";

import { microAUsd, PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../define";
import { externo } from "../../externo";
import { iso, requierePlataforma } from "../comun";
import { uuidSchema } from "../esquemas";
import { inicioDeMes, metricasDelMes } from "./metricas";

export const platformTenantPanel = defineCapability({
  id: "platform.tenants.panel",
  descripcion:
    "Plataforma: panel del mes de una empresa: IA, correos y llamadas; consumo por recurso; gasto de cada API key contra su presupuesto; trabajos fallidos o reintentando y estado de sus integraciones (sin secretos), para ver qué necesita atención.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({ tenantId: uuidSchema }),
  output: z.object({
    mes: z.object({
      iaUsd: z.number(),
      iaTokens: z.number(),
      correos: z.number(),
      llamadas: z.number(),
      costoUsd: z.number(),
      ultimoAcceso: z.string().nullable(),
    }),
    porRecurso: z.array(
      z.object({ recurso: z.string(), cantidad: z.number(), costoUsd: z.number() }),
    ),
    keys: z.array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        prefijo: z.string(),
        revocada: z.boolean(),
        ultimoUsoEn: z.string().nullable(),
        gastadoUsd: z.number(),
        presupuestoUsd: z.number().nullable(),
      }),
    ),
    trabajos: z.object({ fallidos: z.number(), reintentando: z.number() }),
    integraciones: z.array(
      z.object({
        proveedor: z.string(),
        modalidad: z.string(),
        estado: z.string(),
        ultimoTestEn: z.string().nullable(),
        ultimoError: externo(z.string().nullable()),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input) {
    const e = requierePlataforma(ctx).empresa(input.tenantId);
    const desde = inicioDeMes();
    const [mes, recursos, porKey, keys, fallidos, conProblemas, integ] = await Promise.all([
      metricasDelMes(e),
      e.consumosPorRecurso(desde),
      e.consumosPorKey(desde),
      e.apiKeys(),
      e.contarTrabajos({ estado: "fallido" }),
      e.contarTrabajos({ conProblemas: true }),
      e.integraciones(),
    ]);
    // `conProblemas` = fallidos + los que están reintentando.
    const reintentando = conProblemas - fallidos;
    const gasto = new Map(porKey.map((g) => [g.apiKeyId, g._sum.costoTotalMicro ?? 0]));
    return {
      mes,
      porRecurso: recursos
        .map((r) => ({
          recurso: r.recurso,
          cantidad: r._sum.cantidad ?? 0,
          costoUsd: microAUsd(r._sum.costoTotalMicro ?? 0),
        }))
        .sort((a, b) => b.costoUsd - a.costoUsd || b.cantidad - a.cantidad),
      keys: keys.map((k) => ({
        id: k.id,
        nombre: k.nombre,
        prefijo: k.prefijo,
        revocada: k.revocadaEn !== null,
        ultimoUsoEn: iso(k.ultimoUsoEn),
        gastadoUsd: microAUsd(gasto.get(k.id) ?? 0),
        presupuestoUsd: k.presupuestoMensualMicro
          ? microAUsd(Number(k.presupuestoMensualMicro))
          : null,
      })),
      trabajos: { fallidos, reintentando },
      integraciones: integ.map((i) => ({
        proveedor: i.proveedor,
        modalidad: i.modalidad,
        estado: i.estado,
        ultimoTestEn: iso(i.ultimoTestEn),
        ultimoError: i.ultimoError,
      })),
    };
  },
});
