import { notFound } from "next/navigation";

import { exigirDatos } from "@/lib/carga";
import { POR_PAGINA } from "@/lib/lista-cursor";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { Bandeja, DetalleBandeja, FiltrosBandeja } from "./tipos";

/** Bandeja paginada: `cursor` en filtros y `siguiente` en la respuesta (`rendiciones.bandeja.listar`). */
export async function cargarBandeja(f: FiltrosBandeja): Promise<Bandeja> {
  return exigirDatos(
    await ejecutarComoUsuario<Bandeja>("erp", "rendiciones.bandeja.listar", { ...f, limite: POR_PAGINA }),
  );
}

export async function cargarDetalleBandeja(id: string): Promise<DetalleBandeja> {
  const r = await ejecutarComoUsuario<DetalleBandeja>("erp", "rendiciones.bandeja.obtener", { id });
  if (!r.ok && (r.error.code === "NOT_FOUND" || r.error.code === "INVALID_INPUT")) notFound();
  return exigirDatos(r);
}
