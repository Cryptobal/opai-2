import { z } from "zod";

import { CODIGOS_BANCO, PERMISOS_CORE, VALORES_TIPO_CUENTA_BANCARIA } from "@opai/domain";

import { cifrarCampoEnTransaccion } from "../cumplimiento/cifrado-campos";
import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { escribirConEvento, rutSchema, sinDuplicado } from "./comun";
import { personaFicha } from "./personas-ficha-comun";
import { pagoVerSchema, solicitudPendiente, vistaPago } from "./personas-pago-vista";

export const personasPagoVer = defineCapability({
  auditarLectura: (s) => [s.personaId],
  id: "core.personas.pago_ver",
  descripcion:
    "Muestra la cuenta bancaria vigente de una persona y, si existe, la solicitud de cambio pendiente de RRHH. El supervisor ve el número enmascarado.",
  permiso: PERMISOS_CORE.personasPagoRead,
  input: z.object({ id: uuidSchema }),
  output: pagoVerSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => {
    await personaFicha(ctx, input.id);
    return vistaPago(ctx, input.id);
  },
});

const cambioBase = z.object({
  id: uuidSchema,
  tipo: z
    .enum(["reemplazar", "agregar", "marcar_defecto", "quitar"])
    .default("reemplazar")
    .describe(
      "reemplazar cambia la cuenta por defecto; agregar suma otra cuenta; marcar_defecto y quitar actúan sobre cuentaId.",
    ),
  cuentaId: uuidSchema.optional().describe("Cuenta a marcar por defecto o quitar."),
  porDefecto: z.boolean().default(false).describe("Al agregar, dejarla como cuenta por defecto."),
  // CAR-244: código SBIF/CMF del catálogo (el que va en las nóminas de pago), nunca el nombre libre.
  bancoCodigo: z
    .enum(CODIGOS_BANCO)
    .optional()
    .describe("Código SBIF de 3 dígitos del banco, p. ej. 012 (BancoEstado) o 037 (Santander)."),
  tipoCuenta: z
    .enum(VALORES_TIPO_CUENTA_BANCARIA)
    .optional()
    .describe("Tipo de cuenta: corriente, vista, rut o ahorro."),
  numeroCuenta: z.string().trim().min(4).max(40).optional(),
  rutTitular: rutSchema.nullable().optional(),
  titularNombre: z.string().trim().min(2).max(120).nullable().optional(),
});

const cambioInput = cambioBase.superRefine((v, c) => {
  const conDatos = v.tipo === "reemplazar" || v.tipo === "agregar";
  if (conDatos && (!v.bancoCodigo || !v.tipoCuenta || !v.numeroCuenta))
    c.addIssue({ code: "custom", message: "Indica banco, tipo y número de cuenta." });
  if (!conDatos && !v.cuentaId) c.addIssue({ code: "custom", message: "Indica la cuenta." });
});

export const personasPagoSolicitarCambio = defineCapability({
  id: "core.personas.pago_solicitar_cambio",
  descripcion:
    "Registra una solicitud pendiente de aprobación de RRHH para reemplazar la cuenta bancaria por defecto, agregar otra cuenta, marcar otra como por defecto o quitar una. No modifica nada hasta que la aprueben.",
  permiso: PERMISOS_CORE.personasPagoManage,
  sensibles: ["numeroCuenta"],
  input: cambioInput,
  output: pagoVerSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const p = await personaFicha(ctx, input.id);
    if (!ctx.usuario?.id) throw reglaDeNegocio("Se requiere un usuario autenticado.");
    const ya = await ctx.db.personaPagoSolicitud.findFirst({
      where: { personaId: p.id, estado: "pendiente" },
    });
    if (ya) throw reglaDeNegocio("Ya hay una solicitud de cambio pendiente para esta persona.");
    const data = {
      tenantId: p.tenantId,
      personaId: p.id,
      tipo: input.tipo,
      cuentaId: input.cuentaId ?? null,
      porDefecto: input.porDefecto,
      bancoCodigo: input.bancoCodigo ?? null,
      tipoCuenta: input.tipoCuenta ?? null,
      rutTitular: input.rutTitular ?? null,
      titularNombre: input.titularNombre ?? null,
      estado: "pendiente",
      solicitadoPorId: ctx.usuario.id,
    };
    if (dryRun) return vistaPago(ctx, p.id);
    await sinDuplicado(
      escribirConEvento(
        ctx,
        { tipo: "core.persona.pago_solicitud_creada", entidadTipo: "persona" },
        async (tx) => {
          const numeroCifrado = input.numeroCuenta
            ? await cifrarCampoEnTransaccion(
                ctx,
                tx,
                "personas_pago_solicitudes",
                "numero_cuenta",
                input.numeroCuenta,
              )
            : null;
          return tx.personaPagoSolicitud.create({ data: { ...data, numeroCuenta: numeroCifrado } });
        },
      ),
      "Ya hay una solicitud pendiente para esta persona.",
    );
    return vistaPago(ctx, p.id);
  },
});

export async function solicitudPendienteDe(
  ctx: Parameters<typeof personaFicha>[0],
  personaId: string,
) {
  try {
    return await solicitudPendiente(ctx, personaId);
  } catch {
    throw noEncontrado("La solicitud pendiente");
  }
}
