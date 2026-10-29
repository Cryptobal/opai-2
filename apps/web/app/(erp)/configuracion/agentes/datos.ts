import { listarModulos } from "@opai/capabilities";

import { datosSiHayPermiso } from "@/lib/carga";
import { estadoPantalla } from "@/lib/formato";
import { hoyIso } from "@/lib/fechas";
import { contextoServidor, ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

export type ApiKey = {
  id: string;
  nombre: string;
  prefijo: string;
  scopes: string[];
  tipo: string;
  permisos: string[] | null;
  scopeAmplio: boolean;
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
  return new Map(datosSiHayPermiso(r, []).map((g) => [g.apiKeyId, g.costoUsd]));
}

/** Permisos efectivos del usuario que crea la key: el subconjunto que puede delegar (t457u). */
export async function misPermisos() {
  const r = await ejecutarComoUsuario<{ permisos: string[] }>("erp", "core.me");
  return r.ok ? r.data.permisos.filter((p) => !p.startsWith("platform:")) : [];
}

export async function cargarKeys() {
  const [r, gasto, permisos, identidad] = await Promise.all([
    ejecutarComoUsuario<ApiKey[]>("erp", "core.apikeys.list"),
    gastoDelMes(),
    misPermisos(),
    identidadActual(),
  ]);
  const ctx = identidad ? contextoServidor(identidad, "erp") : null;
  return {
    state: estadoPantalla(r),
    keys: r.ok ? r.data : [],
    gasto,
    // El scope "platform" solo se ofrece a un usuario de plataforma (ADR-055).
    scopes: [
      "core",
      ...listarModulos().map((m) => m.id),
      ...(identidad?.usuario.platformRole ? ["platform"] : []),
    ],
    permisos,
    puedeCrearServicio:
      ctx !== null && ctx.alcance === null && ctx.autorizar("core:agentes.manage"),
  };
}

export const usd = (n: number) =>
  `US$ ${n.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
