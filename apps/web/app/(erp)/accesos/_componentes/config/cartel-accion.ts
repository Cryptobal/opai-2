"use server";

import { qrSvg } from "@/lib/qr";
import { ejecutarComoUsuario } from "@/lib/servidor";

type Cartel = {
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
): Promise<{ ok: true; data: Cartel } | { ok: false; error: string }> {
  const r = await ejecutarComoUsuario<Cartel>("erp", "acceso.privacidad.cartel", {
    instalacionId,
    ...(puntoId ? { puntoId } : {}),
  });
  if (!r.ok) return { ok: false, error: r.error.mensaje };
  return { ok: true, data: { ...r.data, qrSvg: qrSvg(r.data.urlPolitica) } };
}