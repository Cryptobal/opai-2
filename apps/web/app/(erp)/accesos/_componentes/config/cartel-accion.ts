"use server";

import { qrSvg } from "@/lib/qr";
import { ejecutarComoUsuario } from "@/lib/servidor";

export type CartelPrivacidad = {
  urlPolitica: string;
  aviso: string;
  instalacion: string;
  punto: string | null;
  empresa: string;
  qrSvg: string;
};

/** Cartel imprimible con QR (R19); la URL es pública con la marca del tenant. */
export async function cartelPrivacidad(
  instalacionId: string,
  puntoId?: string,
): Promise<{ ok: true; data: CartelPrivacidad } | { ok: false; error: string }> {
  const r = await ejecutarComoUsuario<Omit<CartelPrivacidad, "qrSvg">>("erp", "acceso.privacidad.cartel", {
    instalacionId,
    ...(puntoId ? { puntoId } : {}),
  });
  if (!r.ok) return { ok: false, error: r.error.message };
  return { ok: true, data: { ...r.data, qrSvg: qrSvg(r.data.urlPolitica) } };
}