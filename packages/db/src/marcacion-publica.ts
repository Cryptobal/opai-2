import { randomBytes } from "node:crypto";

import { clienteApp } from "./client";
import { hmacDispositivo } from "./dispositivos";

/** 16 bytes CSPRNG en base64url (128 bits). */
export const LARGO_CODIGO_MARCACION_PUBLICA = 22;
const RE_CODIGO = /^[A-Za-z0-9_-]{22}$/;

export const normalizarCodigoMarcacionPublica = (entrada: string): string | null => {
  const c = entrada.trim();
  return RE_CODIGO.test(c) ? c : null;
};

export const nuevoCodigoMarcacionPublica = (): string => randomBytes(16).toString("base64url");

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