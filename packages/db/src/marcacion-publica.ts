import { randomInt } from "node:crypto";

import { clienteApp } from "./client";
import { ALFABETO, hmacDispositivo } from "./dispositivos";

export const LARGO_CODIGO_MARCACION_PUBLICA = 8;

export const normalizarCodigoMarcacionPublica = (entrada: string): string | null => {
  const c = entrada.replace(/[\s-]/g, "").toUpperCase();
  return c.length === LARGO_CODIGO_MARCACION_PUBLICA && [...c].every((x) => ALFABETO.includes(x)) ? c : null;
};

export const nuevoCodigoMarcacionPublica = (): string =>
  Array.from({ length: LARGO_CODIGO_MARCACION_PUBLICA }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");

export type MarcacionPublicaResuelta = {
  tenantId: string;
  instalacionId: string;
  instalacionNombre: string;
};

/** Resuelve el código antes de fijar empresa (SECURITY DEFINER). */
export async function marcacionPublicaPorCodigo(codigoEscrito: string): Promise<MarcacionPublicaResuelta | null> {
  const codigo = normalizarCodigoMarcacionPublica(codigoEscrito);
  if (!codigo) return null;
  const filas = await clienteApp().$queryRaw<
    { tenant_id: string; instalacion_id: string; instalacion_nombre: string }[]
  >`SELECT * FROM "core"."marcacion_publica_por_codigo"(${hmacDispositivo(codigo)})`;
  const f = filas[0];
  return f
    ? { tenantId: f.tenant_id, instalacionId: f.instalacion_id, instalacionNombre: f.instalacion_nombre }
    : null;
}