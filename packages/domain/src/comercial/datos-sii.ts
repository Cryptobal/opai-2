// Datos tributarios de una cuenta frente al SII (CAR-162, DESIGN-PROMPT-comercial-cierre §2 `DatosSII`).
// Dominio puro: comparación campo a campo y el indicador «Lista para facturar». Lo usan la capacidad
// `core.cuentas.consultar_sii`, la ficha de cuenta y, después, el chequeo previo de emisión.
import { normalizarRut } from "../rut";

/** Campos de la cuenta que el SII puede completar (los que pide el receptor de un DTE). */
export const CAMPOS_SII = ["razonSocial", "giro", "calle", "comuna", "ciudad", "emailDte"] as const;
export type CampoSii = (typeof CAMPOS_SII)[number];

export const ETIQUETA_CAMPO_SII: Record<CampoSii, string> = {
  razonSocial: "Razón social",
  giro: "Giro",
  calle: "Dirección tributaria",
  comuna: "Comuna",
  ciudad: "Ciudad",
  emailDte: "Correo de intercambio DTE",
};

export type EstadoCampoSii = "igual" | "distinto" | "vacio_ficha" | "vacio_sii";
export type ComparacionCampo = {
  campo: CampoSii;
  ficha: string | null;
  sii: string | null;
  estado: EstadoCampoSii;
};

type Valores = Partial<Record<CampoSii, string | null>>;

/** Compara sin distinguir mayúsculas, tildes ni espacios repetidos (el SII escribe en mayúsculas). */
export function mismoTexto(a: string, b: string): boolean {
  const n = (s: string) =>
    s.normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("es");
  return n(a) === n(b);
}

export function compararConSii(ficha: Valores, sii: Valores): ComparacionCampo[] {
  return CAMPOS_SII.map((campo) => {
    const f = ficha[campo]?.trim() || null;
    const s = sii[campo]?.trim() || null;
    const estado: EstadoCampoSii = !s
      ? "vacio_sii"
      : !f
        ? "vacio_ficha"
        : mismoTexto(f, s)
          ? "igual"
          : "distinto";
    return { campo, ficha: f, sii: s, estado };
  });
}

/** Lo mínimo para emitir una factura a la cuenta (receptor DTE). */
export const REQUISITOS_FACTURAR = ["rut", "razonSocial", "giro", "calle", "comuna"] as const;
export type RequisitoFacturar = (typeof REQUISITOS_FACTURAR)[number] | "destinatario";

export const ETIQUETA_REQUISITO: Record<RequisitoFacturar, string> = {
  rut: "RUT válido",
  razonSocial: "razón social",
  giro: "giro",
  calle: "dirección tributaria",
  comuna: "comuna",
  destinatario: "destinatario de facturación",
};

/**
 * «Lista para facturar»: RUT válido, razón social, giro, dirección y comuna, y al menos un
 * destinatario (correo DTE o un contacto con rol facturación). Devuelve lo que falta, en orden.
 */
export function listaParaFacturar(c: {
  rut: string | null;
  razonSocial: string | null;
  giro: string | null;
  calle: string | null;
  comuna: string | null;
  emailDte: string | null;
  contactosFacturacion: number;
}): { lista: boolean; faltan: RequisitoFacturar[] } {
  const faltan: RequisitoFacturar[] = [];
  if (!c.rut || !normalizarRut(c.rut)) faltan.push("rut");
  for (const k of ["razonSocial", "giro", "calle", "comuna"] as const)
    if (!c[k]?.trim()) faltan.push(k);
  if (!c.emailDte?.trim() && c.contactosFacturacion < 1) faltan.push("destinatario");
  return { lista: faltan.length === 0, faltan };
}

/** «Faltan 2 datos para facturar: giro y dirección tributaria». */
export function textoFaltan(faltan: readonly RequisitoFacturar[]): string {
  if (!faltan.length) return "Lista para facturar";
  const nombres = faltan.map((f) => ETIQUETA_REQUISITO[f]);
  const lista =
    nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
  return `Falta${faltan.length === 1 ? "" : "n"} ${faltan.length} dato${faltan.length === 1 ? "" : "s"} para facturar: ${lista}`;
}
