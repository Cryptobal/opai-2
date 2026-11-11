"use server";

import { z } from "zod";

import { consentirOAuth, elegirEmpresaOAuth, type PasoOAuth } from "@opai/auth";

/**
 * Pasos en pantalla del OAuth del MCP (CAR-247, ADR-098): elegir la empresa con la que entra la app
 * y autorizarla. Son identidad, no negocio: no hay capacidad; quedan en `paridad-entradas.ts`.
 */
const consulta = z.string().min(1).max(4096);

export async function accionElegirEmpresaOAuth(tenantId: string, q: string): Promise<PasoOAuth> {
  const id = z.uuid().safeParse(tenantId);
  const c = consulta.safeParse(q);
  if (!id.success || !c.success) return { ok: false, motivo: "vencido" };
  return elegirEmpresaOAuth(id.data, c.data);
}

export async function accionAutorizarOAuth(aceptar: boolean, q: string): Promise<PasoOAuth> {
  const c = consulta.safeParse(q);
  if (!c.success || typeof aceptar !== "boolean") return { ok: false, motivo: "vencido" };
  return consentirOAuth(aceptar, c.data);
}
