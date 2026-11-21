"use server";

import { cookies, headers } from "next/headers";

import { executeCapability } from "@opai/capabilities";
import { normalizarRut } from "@opai/domain";
import { empleadorPorRut } from "@opai/db";

import { COOKIE_FISCALIZACION, emitirSesionFiscalizacion, leerSesionFiscalizacion } from "@/lib/fiscalizacion-sesion";
import { contextoSistema } from "@/lib/medidor";
import { fuentesReales } from "@/lib/fuentes";
import { ipDeCabeceras } from "@/lib/rate-limit";

async function ctxFiscalizacion(tenantId: string) {
  const modulos = await fuentesReales.modulosActivos(tenantId);
  return contextoSistema(tenantId, modulos);
}

export async function ingresarFiscalizacion(form: FormData): Promise<{ ok: boolean; error?: string }> {
  const correo = String(form.get("correo") ?? "");
  const rut = String(form.get("rut") ?? "");
  const clave = String(form.get("clave") ?? "").trim() || undefined;
  const rutCanon = normalizarRut(rut);
  if (!rutCanon) return { ok: false, error: "Revisa el RUT del empleador." };
  const canon = await empleadorPorRut(rutCanon);
  if (!canon) return { ok: false, error: "No hay un empleador con ese RUT en OPAI." };
  const ip = ipDeCabeceras(await headers());
  const r = await executeCapability(await ctxFiscalizacion(canon.tenantId), "asistencia.fiscalizacion_ingreso.validar", {
    correo, rutEmpleador: rut, clave, ip,
  });
  if (!r.ok) return { ok: false, error: r.error?.message ?? "No pudimos validar tu acceso." };
  const d = r.data as { slug: string; correo: string; empleadorRut: string; via: "correo" | "clave" };
  const token = emitirSesionFiscalizacion({
    tenantId: canon.tenantId, slug: d.slug, correo: d.correo, empleadorRut: d.empleadorRut, via: d.via,
  });
  (await cookies()).set(COOKIE_FISCALIZACION, token, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  return { ok: true };
}

export async function salirFiscalizacion(): Promise<void> {
  (await cookies()).delete(COOKIE_FISCALIZACION);
}

export async function sesionFiscalizacionActual() {
  const token = (await cookies()).get(COOKIE_FISCALIZACION)?.value;
  return leerSesionFiscalizacion(token);
}

type BusquedaFiscalizacion = {
  encontrado: boolean;
  razonSocial?: string | null;
  rut?: string;
  reportes?: { tipo: string; titulo: string; descripcion: string }[];
};

export async function buscarEmpleadorFiscalizacion(rut: string): Promise<BusquedaFiscalizacion | null> {
  const sesion = await sesionFiscalizacionActual();
  if (!sesion) return null;
  const ctx = await ctxFiscalizacion(sesion.tenantId);
  const r = await executeCapability(ctx, "asistencia.fiscalizacion_empleador.buscar", { rut });
  return r.ok ? (r.data as BusquedaFiscalizacion) : null;
}