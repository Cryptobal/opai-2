import { notFound } from "next/navigation";

import { exigirDatos } from "@/lib/carga";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { Candidata, LoteDetalle, LoteResumen } from "./tipos";

export async function cargarLotes(): Promise<LoteResumen[]> {
  return exigirDatos(await ejecutarComoUsuario<{ lotes: LoteResumen[] }>("erp", "rendiciones.lotes.listar", { limite: 100 })).lotes;
}

/** Aprobadas sin lote activo: solo quien arma lotes; sin ese permiso la lista llega vacía y no se pide. */
export async function cargarCandidatas(puedePagar: boolean): Promise<Candidata[]> {
  if (!puedePagar) return [];
  return exigirDatos(await ejecutarComoUsuario<{ rendiciones: Candidata[] }>("erp", "rendiciones.lotes.candidatas", { limite: 200 })).rendiciones;
}

export async function cargarLote(id: string): Promise<LoteDetalle> {
  const r = await ejecutarComoUsuario<{ lote: LoteDetalle }>("erp", "rendiciones.lotes.obtener", { id });
  if (!r.ok && (r.error.code === "NOT_FOUND" || r.error.code === "INVALID_INPUT")) notFound();
  return exigirDatos(r).lote;
}
