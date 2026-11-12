"use server";

import { z } from "zod";

import { consentirOAuth, elegirEmpresaOAuth, type PasoOAuth } from "@opai/auth";

import { verificarMfaDe } from "@/lib/mfa";
import { identidadActual } from "@/lib/servidor";

/**
 * Pasos en pantalla del OAuth del MCP (CAR-247, ADR-098): elegir la empresa con la que entra la app
 * y autorizarla. Son identidad, no negocio: no hay capacidad; quedan en `paridad-entradas.ts`.
 */
const consulta = z.string().min(1).max(4096);

/** Defensa en el servidor: sin sesión o con segundo factor pendiente, no se autoriza ninguna app. */
async function sesionLista(): Promise<boolean> {
  const identidad = await identidadActual();
  return identidad !== null && (await verificarMfaDe(identidad)) === null;
}

export async function accionElegirEmpresaOAuth(tenantId: string, q: string): Promise<PasoOAuth> {
  const id = z.uuid().safeParse(tenantId);
  const c = consulta.safeParse(q);
  if (!id.success || !c.success || !(await sesionLista())) return { ok: false, motivo: "vencido" };
  return elegirEmpresaOAuth(id.data, c.data);
}

export async function accionAutorizarOAuth(aceptar: boolean, q: string): Promise<PasoOAuth> {
  const c = consulta.safeParse(q);
  if (!c.success || typeof aceptar !== "boolean" || !(await sesionLista()))
    return { ok: false, motivo: "vencido" };
  return consentirOAuth(aceptar, c.data);
}
