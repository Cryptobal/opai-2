// Hilo de un correo entrante (CAR-233): de qué negocio y con qué ámbito de acceso, a partir de lo que OPAI
// envió antes a esa misma contraparte con el mismo asunto base (últimos 90 días). Ante duda, nada.
import { asuntoBase, correosDe } from "@opai/domain/correos";

import type { Contexto } from "../../types";
import { AMBITO_FINANZAS } from "./comun";

const NOVENTA_DIAS = 90 * 86_400_000;

/**
 * Negocio del hilo: una respuesta hereda el negocio solo si, en los últimos 90 días, OPAI le envió a esa
 * misma dirección correos de esa cuenta con el mismo asunto base y todos son del MISMO negocio. Ante
 * cualquier duda, sin negocio (se ve en la cuenta y el contacto; el negocio se asocia a mano).
 */
export async function negocioDelHilo(
  ctx: Contexto,
  cuentaId: string,
  contrapartes: readonly string[],
  asunto: string | null,
) {
  const base = asuntoBase(asunto);
  if (!base || !contrapartes.length) return null;
  const previos = await ctx.db.correoCliente.findMany({
    where: {
      cuentaId,
      sentido: "enviado",
      negocioId: { not: null },
      ocurridoEn: { gte: new Date(Date.now() - NOVENTA_DIAS) },
    },
    select: { negocioId: true, asunto: true, destinatarios: true },
    orderBy: { ocurridoEn: "desc" },
    take: 100,
  });
  const delHilo = previos.filter(
    (p) =>
      asuntoBase(p.asunto) === base &&
      correosDe(p.destinatarios).some((d) => contrapartes.includes(d)),
  );
  const negocios = [...new Set(delHilo.map((p) => p.negocioId))];
  return negocios.length === 1 ? (negocios[0] ?? null) : null;
}

/**
 * Ámbito de una respuesta: hereda «finanzas» si responde a una factura (mismo asunto base y la
 * contraparte estuvo entre los destinatarios, últimos 90 días). Así la cita del correo original (folio,
 * monto) queda bajo el mismo bloqueo financiero. No depende de la cuenta: vale también en «sin asignar».
 */
export async function ambitoDelHilo(
  ctx: Contexto,
  contrapartes: readonly string[],
  asunto: string | null,
) {
  const base = asuntoBase(asunto);
  if (!base || !contrapartes.length) return null;
  const facturas = await ctx.db.correoCliente.findMany({
    where: {
      ambito: AMBITO_FINANZAS,
      sentido: "enviado",
      ocurridoEn: { gte: new Date(Date.now() - NOVENTA_DIAS) },
    },
    select: { asunto: true, destinatarios: true },
    orderBy: { ocurridoEn: "desc" },
    take: 200,
  });
  const delHilo = facturas.some(
    (f) =>
      asuntoBase(f.asunto) === base &&
      correosDe(f.destinatarios).some((d) => contrapartes.includes(d)),
  );
  return delHilo ? AMBITO_FINANZAS : null;
}
