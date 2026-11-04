// Plataforma: ver y resolver los cambios que propone la captura de Previred (CAR-193).
import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { requierePlataforma, usuarioResponsable } from "../comun";
import { uuidSchema } from "../esquemas";
import { fechaCivil } from "./comun";

const propuestaSchema = z.object({
  id: uuidSchema,
  clave: z.string(),
  nombre: z.string(),
  valorPropuesto: z.unknown(),
  valorVigente: z.unknown().nullable(),
  vigenteDesde: z.string(),
  fuente: z.string(),
  consultadaEl: z.string().nullable(),
});

export const platformIndicadoresPropuestas = defineCapability({
  id: "platform.indicadores.propuestas",
  descripcion:
    "Plataforma: cambios a los indicadores legales (ingreso mínimo, topes, AFP, SIS, cesantía) que la captura mensual leyó de Previred y esperan aprobación, más el resultado de la última captura de cada indicador.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({}),
  output: z.object({
    propuestas: z.array(propuestaSchema),
    capturas: z.array(
      z.object({
        clave: z.string(),
        capturadoEn: z.string(),
        resultado: z.string().describe("ok (renovado), propuesto o fallido."),
        motivo: z.string().nullable().describe("Por qué falló: fuente_caida, sin_lectura, fuera_de_banda, sin_vigente_valido o publicacion."),
        alerta: z.boolean(),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const g = requierePlataforma(ctx).globales;
    const [filas, capturas] = await Promise.all([g.propuestasIndicadores(), g.capturasPrevisionales()]);
    return {
      propuestas: filas.map((f) => ({
        id: f.id, clave: f.indicador.clave, nombre: f.indicador.nombre,
        valorPropuesto: f.valorJson, valorVigente: f.vigente?.valorJson ?? null,
        vigenteDesde: fechaCivil(f.vigenteDesde), fuente: f.fuente,
        consultadaEl: f.consultadaEl ? fechaCivil(f.consultadaEl) : null,
      })),
      capturas: capturas.map((c) => ({
        clave: c.indicador.clave, capturadoEn: c.capturadoEn.toISOString(), resultado: c.resultado,
        motivo: c.diferencia, alerta: c.alertaEmitida,
      })),
    };
  },
});

export const platformIndicadoresResolver = defineCapability({
  id: "platform.indicadores.resolver",
  descripcion:
    "Plataforma: aprueba o rechaza un cambio propuesto a un indicador legal. Al aprobarlo rige para el cálculo de todas las empresas desde su fecha de vigencia; solo lo puede hacer una persona.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  soloPersonas: true,
  input: z.object({ propuestaId: uuidSchema, aprobar: z.boolean() }),
  output: z.object({
    propuestaId: uuidSchema,
    clave: z.string(),
    resultado: z.enum(["aprobado", "rechazado"]),
    valorAnterior: z.unknown().nullable(),
    valorNuevo: z.unknown(),
  }),
  efecto: "escritura",
  dryRun: true,
  // Afecta el cálculo de todas las empresas: la auditoría de plataforma guarda antes y después.
  cambio: (s) => ({ antes: s.valorAnterior, despues: { clave: s.clave, resultado: s.resultado, valor: s.valorNuevo } }),
  async handler(ctx, { propuestaId, aprobar }, { dryRun }) {
    const g = requierePlataforma(ctx).globales;
    const p = (await g.propuestasIndicadores()).find((x) => x.id === propuestaId);
    if (!p) throw noEncontrado("La propuesta de indicador");
    const resultado = aprobar ? ("aprobado" as const) : ("rechazado" as const);
    const salida = {
      propuestaId, clave: p.indicador.clave, resultado,
      valorAnterior: p.vigente?.valorJson ?? null, valorNuevo: p.valorJson,
    };
    if (dryRun) return salida;
    await g.resolverPropuestaIndicador({ id: propuestaId, aprobar, actorId: usuarioResponsable(ctx) }, ctx.db);
    return salida;
  },
});
