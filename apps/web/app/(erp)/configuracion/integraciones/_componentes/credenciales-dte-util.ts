import type { Integracion } from "./tipos";

type Config = Record<string, unknown>;
export type MetaCertificado = { titular: string; rutTitular: string | null; venceEn: string };

export function metaCertificadoDe(i: Integracion): MetaCertificado | null {
  const c = i.config as Config | null;
  const m = c?.certificadoMeta;
  if (!m || typeof m !== "object") return null;
  const o = m as MetaCertificado;
  if (typeof o.titular !== "string" || typeof o.venceEn !== "string") return null;
  return o;
}

export function tonoVencimiento(venceEn: string): "success" | "warning" | "danger" {
  const fin = new Date(`${venceEn}T23:59:59Z`).getTime();
  const dias = (fin - Date.now()) / 86_400_000;
  if (dias < 0) return "danger";
  if (dias < 30) return "warning";
  return "success";
}

export function etiquetaVencimiento(venceEn: string): string {
  const fin = new Date(`${venceEn}T23:59:59Z`).getTime();
  if (fin < Date.now()) return "Vencido";
  return "Vigente";
}

export function formatearFechaCert(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

export async function archivoABase64(archivo: File): Promise<string> {
  const buf = await archivo.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}
