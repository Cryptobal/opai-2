"use client";

import { subirConProgreso } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import type { EntidadDocumento } from "./tipos";

/** SHA-256 en hex del archivo (Web Crypto): la huella que el servidor verifica al confirmar. */
async function huella(archivo: File): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", await archivo.arrayBuffer());
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type Metadatos = {
  tipoId?: string;
  emitidoEn?: string;
  venceEn?: string;
  reemplazaAId?: string;
  visibleEn?: string[];
};

/**
 * Sube un archivo como lo haría un agente (ADR-039): `iniciar_subida` (URL firmada), PUT directo
 * al almacenamiento con progreso real y `confirmar_subida` (tamaño, MIME, huella y bitácora).
 */
export async function subirDocumento(
  entidad: EntidadDocumento,
  archivo: File,
  m: Metadatos,
  progreso: (f: number) => void,
  portal = "erp",
): Promise<string> {
  const sha256 = await huella(archivo);
  const r = await ejecutarCapacidad(portal, "core.documentos.iniciar_subida", {
    entidad,
    nombre: archivo.name,
    mime: archivo.type || "application/octet-stream",
    tamano: archivo.size,
    sha256,
    ...(m.tipoId ? { tipoId: m.tipoId } : {}),
    ...(m.emitidoEn ? { emitidoEn: m.emitidoEn } : {}),
    ...(m.venceEn ? { venceEn: m.venceEn } : {}),
    ...(m.reemplazaAId ? { reemplazaAId: m.reemplazaAId } : {}),
  });
  if (!r.ok) throw new Error(r.error.message);
  const d = r.data as {
    documento: { id: string };
    subida: { url: string; cabeceras: Record<string, string> } | null;
  };
  if (!d.subida) throw new Error("El almacenamiento no está disponible en este entorno.");
  await subirConProgreso(d.subida.url, archivo, d.subida.cabeceras, progreso);
  progreso(1);
  const c = await ejecutarCapacidad(portal, "core.documentos.confirmar_subida", {
    id: d.documento.id,
  });
  if (!c.ok) throw new Error(c.error.message);
  if (m.visibleEn?.length)
    await ejecutarCapacidad(portal, "core.documentos.update", {
      id: d.documento.id,
      visibleEn: m.visibleEn,
    });
  return d.documento.id;
}
