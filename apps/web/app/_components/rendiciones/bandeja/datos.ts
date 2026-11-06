import { notFound } from "next/navigation";

import { exigirDatos } from "@/lib/carga";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { Bandeja, DetalleBandeja, FiltrosBandeja } from "./tipos";

/** La bandeja y sus totales salen de una sola capacidad (`rendiciones.bandeja.listar`). */
export async function cargarBandeja(f: FiltrosBandeja): Promise<Bandeja> {
  return exigirDatos(
    await ejecutarComoUsuario<Bandeja>("erp", "rendiciones.bandeja.listar", { ...f, limite: 100 }),
  );
}

export async function cargarDetalleBandeja(id: string): Promise<DetalleBandeja> {
  const r = await ejecutarComoUsuario<DetalleBandeja>("erp", "rendiciones.bandeja.obtener", { id });
  if (!r.ok && (r.error.code === "NOT_FOUND" || r.error.code === "INVALID_INPUT")) notFound();
  return exigirDatos(r);
}
