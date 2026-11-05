import { prohibido, reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { PERMISO_ENVIOS_APROBAR } from "../capabilities/permisos";
import {
  evaluarAprobacionEnvioPropuesta,
  type EvaluacionAprobacionEnvioPropuesta,
  fueraDeMargenesEnvioConjunto,
} from "../domain/documento/propuesta-envio-reglas";
import { usuarioReal } from "./aprobacion-reglas";
import { leerVersionEsperada } from "./version-esperada";

export type EvaluacionAprobacionEnvio = EvaluacionAprobacionEnvioPropuesta;

export async function aprobacionMargenAprobada(ctx: Contexto, versionId: string) {
  return ctx.db.cpqAprobacion.findFirst({
    where: { versionId, estado: "aprobada" },
    select: { id: true },
  });
}

export async function fueraDeMargenesEnvio(ctx: Contexto, versionId: string) {
  const row = await aprobacionMargenAprobada(ctx, versionId);
  return fueraDeMargenesEnvioConjunto(row != null);
}

/** Decisor para envío pendiente (solo aplica fuera de márgenes). */
export function evaluarAprobacionEnvio(ctx: Contexto, solicitadoPorId: string): EvaluacionAprobacionEnvio {
  return evaluarAprobacionEnvioPropuesta({
    actorTipo: ctx.actor.tipo,
    actorId: usuarioReal(ctx),
    rol: ctx.rol,
    autorizaEnviosAprobar: ctx.autorizar(PERMISO_ENVIOS_APROBAR),
    solicitadoPorId,
  });
}

export function exigirDecisorEnvioPropuesta(ctx: Contexto, solicitadoPorId: string) {
  if (ctx.actor.tipo === "agent") {
    throw prohibido("Un agente no puede aprobar envíos conjuntos.");
  }
  const e = evaluarAprobacionEnvio(ctx, solicitadoPorId);
  if (!e.puedeDecidir) {
    throw prohibido(e.motivoNoDecidir ?? "No puedes aprobar este envío.");
  }
  return e;
}

/** Revalida gates de envío CPQ (R-CPQ-034) en solicitar y al enviar. */
export async function exigirGatesEnvioCpq(
  ctx: Contexto,
  cotizacionId: string,
  confirmarValoresViejos: boolean | undefined,
  dryRun: boolean,
) {
  const { exigirEnviable } = await import("./version");
  const { cargarFilasVersion } = await import("./recalcular");
  const { calculoVigente } = await import("./calculo-vigente");
  const { validarEnvioCpq } = await import("../capabilities/enviar-validar");
  const pack = await cargarFilasVersion(ctx, cotizacionId, undefined, false);
  if (!pack) throw reglaDeNegocio("No hay versión para enviar.");
  exigirEnviable(pack.version);
  // La huella es lo que el usuario vio: se toma antes de calcular y validar, de modo que cualquier cambio
  // posterior (una edición, un refresco del caché) haga fallar el envío en vez de quedar dentro de la huella.
  const versionEsperada = await leerVersionEsperada(ctx.db, pack.version.id);
  if (!versionEsperada || versionEsperada.estado !== pack.version.estado)
    throw reglaDeNegocio("La cotización cambió mientras se preparaba el envío; vuelve a cargar la ficha.");
  const resultado = await calculoVigente(ctx, cotizacionId, pack.version, pack.lineas);
  if (!resultado) throw reglaDeNegocio("No se pudo calcular la cotización.");
  await validarEnvioCpq(
    ctx,
    { confirmarValoresViejos },
    pack.version,
    pack.lineas,
    resultado,
    dryRun,
    cotizacionId,
  );
  return { pack, resultado, versionEsperada };
}
