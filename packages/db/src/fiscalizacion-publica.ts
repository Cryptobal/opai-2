import { clienteApp } from "./client";

export type EmpleadorPorRut = {
  tenantId: string;
  slug: string;
  razonSocial: string | null;
  rut: string;
};

/** Resuelve el tenant del empleador por RUT canónico o con formato (portal DT, sin tenant previo). */
export async function empleadorPorRut(rut: string): Promise<EmpleadorPorRut | null> {
  const filas = await clienteApp().$queryRaw<EmpleadorPorRut[]>`
    SELECT tenant_id AS "tenantId", slug, razon_social AS "razonSocial", rut
    FROM "asistencia"."empleador_por_rut"(${rut})`;
  return filas[0] ?? null;
}

export type ClaveFiscalizacionResuelta = {
  tenantId: string;
  claveId: string;
  correo: string;
  venceEn: Date;
  revocadoEn: Date | null;
  usos: number;
};

export async function resolverClaveFiscalizacion(claveHash: string): Promise<ClaveFiscalizacionResuelta | null> {
  const filas = await clienteApp().$queryRaw<
    { tenant_id: string; clave_id: string; correo: string; vence_en: Date; revocado_en: Date | null; usos: number }[]
  >`
    SELECT tenant_id, clave_id, correo, vence_en, revocado_en, usos
    FROM "asistencia"."fiscalizacion_resolver_clave"(${claveHash})`;
  const f = filas[0];
  return f
    ? {
        tenantId: f.tenant_id,
        claveId: f.clave_id,
        correo: f.correo,
        venceEn: f.vence_en,
        revocadoEn: f.revocado_en,
        usos: f.usos,
      }
    : null;
}