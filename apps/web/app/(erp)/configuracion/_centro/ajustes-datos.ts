import type { CampoAjusteVista } from "@opai/ds";

import { exigirDatos } from "@/lib/carga";
import { ejecutarComoUsuario } from "@/lib/servidor";

type Valor = { modulo: string; clave: string; valor: unknown; origen: string };

/** Esquema y valores efectivos de los ajustes de un módulo (opcionalmente, de un grupo). Un fallo
 * lanza (`error.tsx`): no se muestra como «Sin ajustes» (CAR-50). */
export async function cargarAjustes(modulo: string, grupo?: string) {
  const [s, v] = await Promise.all([
    ejecutarComoUsuario<CampoAjusteVista[]>("erp", "core.config.schema", { modulo }),
    ejecutarComoUsuario<Valor[]>("erp", "core.config.get", { modulo }),
  ]);
  const campos = exigirDatos(s).filter((c) => !grupo || c.grupo === grupo);
  const valores = Object.fromEntries(
    exigirDatos(v).map((x) => [
      `${x.modulo}.${x.clave}`,
      { valor: x.valor, origen: x.origen },
    ]),
  );
  return { campos, valores };
}

export type Ajustes = Awaited<ReturnType<typeof cargarAjustes>>;
