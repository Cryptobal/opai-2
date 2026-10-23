import { listarModulos } from "@opai/capabilities";

import { estadoPantalla } from "@/lib/formato";
import { hoyIso } from "@/lib/fechas";
import { ejecutarComoUsuario } from "@/lib/servidor";

export type ApiKey = {
  id: string;
  nombre: string;
  prefijo: string;
  scopes: string[];
  responsable: { nombre: string; email: string };
  ultimoUsoEn: string | null;
  revocadaEn: string | null;
  presupuestoMensualUsd: number | null;
  valida: boolean;
};
export type ApiKeyDetalle = ApiKey & {
  autonomia: { capability: string; descripcion: string; nivel: "directo" | "aprobacion" }[];
};

/** Gasto del mes en curso por key (USD), si el rol puede ver consumos. */
export async function gastoDelMes() {
  const r = await ejecutarComoUsuario<{ apiKeyId: string; costoUsd: number }[]>(
    "erp",
    "core.consumos.por_agente",
    { mes: hoyIso().slice(0, 7) },
  );
  return new Map((r.ok ? r.data : []).map((g) => [g.apiKeyId, g.costoUsd]));
}

export async function cargarKeys() {
  const [r, gasto] = await Promise.all([
    ejecutarComoUsuario<ApiKey[]>("erp", "core.apikeys.list"),
    gastoDelMes(),
  ]);
  return {
    state: estadoPantalla(r),
    keys: r.ok ? r.data : [],
    gasto,
    scopes: ["core", ...listarModulos().map((m) => m.id)],
  };
}

export const usd = (n: number) =>
  `US$ ${n.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
