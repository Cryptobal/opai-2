import { reglaDeNegocio, type Contexto } from "@opai/capabilities";

import {
  autoaprobacionPrivilegioEnvio,
  debeQuedarPendienteAprobacionEnvio,
} from "../domain/documento/propuesta-envio-reglas";
import type { DestinatarioEnvio } from "../domain/documento/propuesta-tecnica";
import { usuarioReal } from "./aprobacion-reglas";
import { fueraDeMargenesEnvio } from "./propuesta-envio-aprobacion";
import { ejecutarEnvioPropuestaAprobado } from "./propuesta-envio-ejecutar";
import { registrarEnvioPropuesta } from "./propuesta-envio";
import { snapshotEnvioPendiente } from "./propuesta-envio-snapshot";
import type { ResultadoCalculo } from "../domain/motor";

type InputSolicitud = {
  cotizacionId: string;
  versionId: string;
  propuestaTecnicaId: string | null;
  incluyeCotizacion: boolean;
  incluyePropuesta: boolean;
  destinatarios: DestinatarioEnvio[];
  mensaje?: string;
  creadoPorId: string;
  resultado: ResultadoCalculo;
};

export async function registrarOEnviarSolicitudEnvioPropuesta(
  ctx: Contexto,
  input: InputSolicitud,
  dryRun: boolean,
) {
  const fueraDeMargenes = await fueraDeMargenesEnvio(ctx, input.versionId);
  const pendiente = debeQuedarPendienteAprobacionEnvio(fueraDeMargenes, ctx.rol);
  const solicitadoPorId = usuarioReal(ctx);
  const snapshot = snapshotEnvioPendiente(input.destinatarios);

  if (dryRun) {
    return {
      envioId: "00000000-0000-0000-0000-000000000000",
      estado: (pendiente ? "pendiente_aprobacion" : "enviado") as "pendiente_aprobacion" | "enviado",
      destinatarios: input.destinatarios,
    };
  }

  const envio = await registrarEnvioPropuesta(ctx, {
    cotizacionId: input.cotizacionId,
    versionId: input.versionId,
    propuestaTecnicaId: input.propuestaTecnicaId,
    incluyeCotizacion: input.incluyeCotizacion,
    incluyePropuesta: input.incluyePropuesta,
    destinatariosJson: JSON.stringify(input.destinatarios),
    snapshot,
    ...(input.mensaje !== undefined ? { mensaje: input.mensaje } : {}),
    solicitadoPorId,
    enviado: false,
  });

  if (pendiente) {
    return { envioId: envio.id, estado: "pendiente_aprobacion" as const, destinatarios: input.destinatarios };
  }

  const actorId = ctx.actor.id;
  if (!actorId) throw reglaDeNegocio("Se requiere una persona en sesión para enviar.");
  const autoaprobacion = autoaprobacionPrivilegioEnvio({
    fueraDeMargenes,
    rol: ctx.rol,
    actorId,
    solicitadoPorId,
  });
  await ejecutarEnvioPropuestaAprobado(ctx, envio, {
    actorId,
    autoaprobacion,
    envioDirectoDentroMargen: !fueraDeMargenes,
    resultado: input.resultado,
  });
  return { envioId: envio.id, estado: "enviado" as const, destinatarios: input.destinatarios };
}
