// Datos tributarios del emisor que el SII exige en el encabezado de una factura, nota de crédito o de débito (CAR-240).
// Sin ACTECO, SimpleAPI arma un DTE sin <Acteco> (obligatorio en el XSD del SII para 33/34/56/61) y lo rechaza con
// HTTP 401 aunque la API key autentique. OPAI 1.0, que sí emite, exige estos mismos seis datos antes de llamar
// (`dte-preflight.ts`, `checkConfig`); aquí se bloquea igual, con un mensaje que dice qué falta y dónde completarlo.
// Desde CAR-243 los seis datos, ACTECO incluido (el principal de la empresa), viven en Configuración › Empresa.
import { actecoValido } from "@opai/domain";

import type { Contexto } from "../types";

export { actecoValido };

export type EmisorTributario = {
  razonSocial: string | null;
  giro: string | null;
  acteco: number | null;
  calle: string | null;
  comuna: string | null;
  ciudad: string | null;
};

/** Datos del perfil de la empresa (Configuración › Empresa), en el orden en que se informan. */
const DEL_PERFIL = [
  ["razonSocial", "razón social"],
  ["giro", "giro"],
  ["calle", "dirección"],
  ["comuna", "comuna"],
  ["ciudad", "ciudad"],
] as const;

const texto = (v: string | null) => Boolean(v?.trim());

const lista = (xs: readonly string[]) =>
  xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} y ${xs.at(-1) ?? ""}`;

/** Nombres legibles de lo que falta: primero el ACTECO, luego los datos del perfil. */
export function faltantesEmisorTributario(e: EmisorTributario): string[] {
  const perfil = DEL_PERFIL.filter(([campo]) => !texto(e[campo])).map(([, nombre]) => nombre);
  return [...(actecoValido(e.acteco) ? [] : ["ACTECO"]), ...perfil];
}

const PANTALLA_EMPRESA = "Configuración › Empresa";

/**
 * Mensaje para la persona; null si no falta nada. Dice en qué pantalla se completan (todos en la de la empresa). Corto a propósito: el
 * lote de cierre le antepone su contexto y la emisión le agrega qué quedó como estaba, y el total cabe en los 300
 * caracteres que la UI muestra tal cual.
 */
export function mensajeFaltantesEmisor(e: EmisorTributario): string | null {
  const f = faltantesEmisorTributario(e);
  if (f.length === 0) return null;
  const [falta, completa] =
    f.length === 1 ? ["Falta un dato tributario", "Complétalo"] : ["Faltan datos tributarios", "Complétalos"];
  return `${falta} de tu empresa: ${lista(f)}. ${completa} en ${PANTALLA_EMPRESA}.`;
}

/**
 * Lee los datos del emisor con la misma regla que las credenciales de SimpleAPI (`adaptador-sii.ts`): la razón
 * social del perfil o, si falta, el nombre de la empresa.
 */
export async function emisorTributarioDe(ctx: Contexto): Promise<EmisorTributario> {
  const [perfil, tenant] = await Promise.all([
    ctx.db.perfilEmpresa.findUnique({
      where: { tenantId: ctx.tenantId },
      select: { razonSocial: true, giro: true, calle: true, comuna: true, ciudad: true, actecoPrincipal: true },
    }),
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
  ]);
  return {
    razonSocial: perfil?.razonSocial?.trim() || tenant?.nombre || null,
    giro: perfil?.giro ?? null,
    // CAR-243: el ACTECO principal de la empresa, el mismo que `adaptador-sii.ts` pone en el DTE.
    acteco: perfil?.actecoPrincipal ?? null,
    calle: perfil?.calle ?? null,
    comuna: perfil?.comuna ?? null,
    ciudad: perfil?.ciudad ?? null,
  };
}
