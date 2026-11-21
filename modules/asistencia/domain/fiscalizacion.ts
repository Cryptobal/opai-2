import { createHash, randomBytes } from "node:crypto";

import { normalizarRut } from "@opai/domain";

const DOMINIO_DT = "@dt.gob.cl";

export function esCorreoDt(correo: string): boolean {
  const c = correo.trim().toLowerCase();
  return c.endsWith(DOMINIO_DT) && c.length > DOMINIO_DT.length;
}

export function hashClaveFiscalizacion(clave: string): string {
  return createHash("sha256").update(clave.trim().toUpperCase()).digest("hex");
}

/** Clave de un solo uso por sesión, formato legible (ej. K7Q4-M2XD-9PTR). */
export function generarClaveFiscalizacionPlana(): string {
  const b = randomBytes(9).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const s = (b + "ABCDEFGH").slice(0, 12);
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export function rutEmpleadorCanonico(entrada: string): string | null {
  return normalizarRut(entrada);
}