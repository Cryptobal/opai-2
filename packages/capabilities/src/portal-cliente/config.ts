import { z } from "zod";

import {
  normalizarDestinatarios,
  SECCIONES_PORTAL,
  tipoNuncaVisibleParaCliente,
  tiposDocumentoPermitidos,
  type ConfigPortal,
} from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { escribirConEvento } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { configDeCuenta } from "./config-datos";
import {
  PERMISO_CONFIG_MANAGE,
  PERMISO_CONFIG_READ,
  configSchema,
  cuentaDe,
  rutEnReportesSchema,
  seccionSchema,
} from "./comun";

const salidaSchema = z.object({
  cuentaId: z.string(),
  cuentaNombre: z.string(),
  /** false = la cuenta aún no tiene configuración guardada y rigen los defectos. */
  guardada: z.boolean(),
  config: configSchema,
});

export const configLeer = defineCapability({
  // Revela los correos de los destinatarios del informe: se audita la cuenta consultada (NÚCLEO-H).
  auditarLectura: (s) => [s.cuentaId],
  id: "portal_cliente.config.leer",
  descripcion:
    "Lee la configuración del Portal Cliente de una cuenta: tipos de documento visibles, secciones, datos de los guardias (Ley 21.719), listas de acceso y destinatarios del informe mensual.",
  permiso: PERMISO_CONFIG_READ,
  input: z.object({ cuentaId: uuidSchema }),
  output: salidaSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { cuentaId }) {
    const cuenta = await cuentaDe(ctx, cuentaId);
    const { guardada, config } = await configDeCuenta(ctx, cuenta.id);
    return { cuentaId: cuenta.id, cuentaNombre: cuenta.nombre, guardada, config };
  },
});

export const configActualizar = defineCapability({
  id: "portal_cliente.config.actualizar",
  descripcion:
    "Cambia qué ve el cliente en su portal: tipos de documento de los guardias (nunca liquidaciones ni salud), secciones por instalación, foto y RUT de los guardias, si gestiona sus listas y los destinatarios del informe mensual.",
  permiso: PERMISO_CONFIG_MANAGE,
  input: z.object({
    cuentaId: uuidSchema,
    tiposDocumentoVisibles: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
    seccionesVisibles: z.array(seccionSchema).max(SECCIONES_PORTAL.length).optional(),
    muestraFotoGuardias: z.boolean().optional(),
    muestraRutGuardias: z.boolean().optional(),
    rutEnReportes: rutEnReportesSchema.optional(),
    gestionaListas: z.boolean().optional(),
    destinatariosInforme: z.array(z.string().trim().max(254)).max(20).optional(),
  }),
  output: salidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const cuenta = await cuentaDe(ctx, input.cuentaId);
    const vedados = (input.tiposDocumentoVisibles ?? []).filter(tipoNuncaVisibleParaCliente);
    if (vedados.length > 0)
      throw reglaDeNegocio(
        `El tipo de documento «${vedados[0]}» no puede ser visible para el cliente (remuneraciones y salud, Ley 21.719).`,
      );
    let destinatarios: string[] | undefined;
    if (input.destinatariosInforme) {
      const { validos, invalidos } = normalizarDestinatarios(input.destinatariosInforme);
      if (invalidos.length > 0) throw reglaDeNegocio(`El correo «${invalidos[0]}» no es válido.`);
      destinatarios = validos;
    }
    const { config: actual } = await configDeCuenta(ctx, cuenta.id);
    const config: ConfigPortal = {
      tiposDocumentoVisibles: input.tiposDocumentoVisibles
        ? tiposDocumentoPermitidos(input.tiposDocumentoVisibles)
        : actual.tiposDocumentoVisibles,
      seccionesVisibles: input.seccionesVisibles
        ? [...new Set(input.seccionesVisibles)]
        : actual.seccionesVisibles,
      muestraFotoGuardias: input.muestraFotoGuardias ?? actual.muestraFotoGuardias,
      muestraRutGuardias: input.muestraRutGuardias ?? actual.muestraRutGuardias,
      rutEnReportes: input.rutEnReportes ?? actual.rutEnReportes,
      gestionaListas: input.gestionaListas ?? actual.gestionaListas,
      destinatariosInforme: destinatarios ?? actual.destinatariosInforme,
    };
    const salida = { cuentaId: cuenta.id, cuentaNombre: cuenta.nombre, guardada: true, config };
    if (dryRun) return salida;
    const datos = {
      tiposDocumentoVisibles: [...config.tiposDocumentoVisibles],
      seccionesVisibles: [...config.seccionesVisibles],
      muestraFotoGuardias: config.muestraFotoGuardias,
      muestraRutGuardias: config.muestraRutGuardias,
      rutEnReportes: config.rutEnReportes,
      gestionaListas: config.gestionaListas,
      destinatariosInforme: [...config.destinatariosInforme],
      actualizadoPor: ctx.usuario?.id ?? null,
    };
    await escribirConEvento(
      ctx,
      {
        tipo: "portal_cliente.config.actualizada",
        entidadTipo: "cuenta",
        payload: () => ({ cuentaId: cuenta.id }),
      },
      async (tx) => {
        const fila = await tx.configPortalCuenta.upsert({
          where: { tenantId_cuentaId: { tenantId: ctx.tenantId, cuentaId: cuenta.id } },
          create: { tenantId: ctx.tenantId, cuentaId: cuenta.id, ...datos },
          update: datos,
        });
        return { id: fila.cuentaId };
      },
    );
    return salida;
  },
});
