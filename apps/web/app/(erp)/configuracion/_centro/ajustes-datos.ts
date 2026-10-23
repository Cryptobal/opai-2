import type { CampoAjusteVista } from "@opai/ds";

import { ejecutarComoUsuario } from "@/lib/servidor";

type Valor = { modulo: string; clave: string; valor: unknown; origen: string };

/** Esquema y valores efectivos de los ajustes de un módulo (opcionalmente, de un grupo). */
export async function cargarAjustes(modulo: string, grupo?: string) {
  const [s, v] = await Promise.all([
    ejecutarComoUsuario<CampoAjusteVista[]>("erp", "core.config.schema", { modulo }),
    ejecutarComoUsuario<Valor[]>("erp", "core.config.get", { modulo }),
  ]);
  const campos = (s.ok ? s.data : []).filter((c) => !grupo || c.grupo === grupo);
  const valores = Object.fromEntries(
    (v.ok ? v.data : []).map((x) => [
      `${x.modulo}.${x.clave}`,
      { valor: x.valor, origen: x.origen },
    ]),
  );
  return { ok: s.ok && v.ok, campos, valores };
}

export type Ajustes = Awaited<ReturnType<typeof cargarAjustes>>;
