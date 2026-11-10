// Datos tributarios del emisor que el SII exige en el encabezado de una factura, nota de crédito o de débito (CAR-240).
// Sin ACTECO, SimpleAPI arma un DTE sin <Acteco> (obligatorio en el XSD del SII para 33/34/56/61) y lo rechaza con
// HTTP 401 aunque la API key autentique. OPAI 1.0, que sí emite, exige estos mismos seis datos antes de llamar
// (`dte-preflight.ts`, `checkConfig`); aquí se bloquea igual, con un mensaje que dice qué falta y dónde completarlo.
import type { Contexto } from "../types";

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

/** ACTECO válido: entero positivo de hasta 6 dígitos (el SII los publica con 6). */
export const actecoValido = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 999_999;

const lista = (xs: readonly string[]) =>
  xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} y ${xs.at(-1) ?? ""}`;

/** Nombres legibles de lo que falta: primero el ACTECO, luego los datos del perfil. */
export function faltantesEmisorTributario(e: EmisorTributario): string[] {
  const perfil = DEL_PERFIL.filter(([campo]) => !texto(e[campo])).map(([, nombre]) => nombre);
  return [...(actecoValido(e.acteco) ? [] : ["ACTECO"]), ...perfil];
}

const PANTALLA_DTE = "Finanzas › Configuración DTE";
const PANTALLA_EMPRESA = "Configuración › Empresa";

/**
 * Mensaje para la persona; null si no falta nada. Dice en qué pantalla se completa cada dato. Corto a propósito: el
 * lote de cierre le antepone su contexto y la emisión le agrega qué quedó como estaba, y el total cabe en los 300
 * caracteres que la UI muestra tal cual.
 */
export function mensajeFaltantesEmisor(e: EmisorTributario): string | null {
  const f = faltantesEmisorTributario(e);
  if (f.length === 0) return null;
  const sinActeco = !actecoValido(e.acteco);
  const delPerfil = f.length - (sinActeco ? 1 : 0);
  const donde =
    sinActeco && delPerfil > 0
      ? `${PANTALLA_DTE} (ACTECO) y en ${PANTALLA_EMPRESA}`
      : sinActeco
        ? PANTALLA_DTE
        : PANTALLA_EMPRESA;
  const [falta, completa] =
    f.length === 1 ? ["Falta un dato tributario", "Complétalo"] : ["Faltan datos tributarios", "Complétalos"];
  return `${falta} de tu empresa: ${lista(f)}. ${completa} en ${donde}.`;
}

/**
 * Lee los datos del emisor con la misma regla que las credenciales de SimpleAPI (`adaptador-sii.ts`): la razón
 * social del perfil o, si falta, el nombre de la empresa.
 */
export async function emisorTributarioDe(ctx: Contexto): Promise<EmisorTributario> {
  const [cfg, perfil, tenant] = await Promise.all([
    ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId }, select: { acteco: true } }),
    ctx.db.perfilEmpresa.findUnique({
      where: { tenantId: ctx.tenantId },
      select: { razonSocial: true, giro: true, calle: true, comuna: true, ciudad: true },
    }),
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
  ]);
  return {
    razonSocial: perfil?.razonSocial?.trim() || tenant?.nombre || null,
    giro: perfil?.giro ?? null,
    acteco: cfg?.acteco ?? null,
    calle: perfil?.calle ?? null,
    comuna: perfil?.comuna ?? null,
    ciudad: perfil?.ciudad ?? null,
  };
}
