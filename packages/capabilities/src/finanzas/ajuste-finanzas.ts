import type { z } from "zod";

import { ajuste, campoAjuste } from "../core/config";
import type { Contexto } from "../types";
import { ajustesFinanzas } from "./ajustes";

type Ajustes = z.infer<typeof ajustesFinanzas>;

/**
 * Ajuste efectivo de Finanzas (defecto → plataforma → empresa). Si el módulo no está registrado (herramientas y
 * pruebas sin catálogo) rige el valor por defecto del esquema, nunca un error.
 */
export async function ajusteFinanzas<K extends keyof Ajustes>(ctx: Contexto, clave: K): Promise<Ajustes[K]> {
  if (campoAjuste("finanzas", clave)) return ajuste<Ajustes[K]>(ctx, "finanzas", clave);
  return ajustesFinanzas.shape[clave].parse(undefined) as Ajustes[K];
}
