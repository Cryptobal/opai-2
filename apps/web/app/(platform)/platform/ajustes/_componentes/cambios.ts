import { aMicro, type Ajuste, type ModelosIa, type Precio } from "./tipos";

/** Un cambio pendiente de Ajustes: la capacidad que lo escribe y su entrada. */
export type Cambio = {
  id: "platform.precios.set" | "platform.ajustes.set";
  input: Record<string, unknown>;
};

/** Ajustes que no se editan en Límites porque viven en otra pantalla (CAR-323, §2.7). */
export const FUERA_DE_LIMITES = new Set(["remuneraciones_imm"]);

/** Lo que cambió respecto de lo cargado, en el orden en que se guarda. */
export function cambiosPendientes(
  precios: Precio[],
  txtPrecios: Record<string, string>,
  modelos: ModelosIa | null,
  modelosIni: unknown,
  numericos: Ajuste[],
  nums: Record<string, string>,
): Cambio[] {
  const out: Cambio[] = [];
  for (const p of precios) {
    const micro = aMicro(txtPrecios[p.recurso] ?? "");
    if (micro === null || micro === p.costoUnitarioMicro) continue;
    out.push({
      id: "platform.precios.set",
      input: { recurso: p.recurso, unidad: p.unidad, costoUnitarioMicro: micro },
    });
  }
  if (modelos && JSON.stringify(modelos) !== JSON.stringify(modelosIni))
    out.push({
      id: "platform.ajustes.set",
      input: { modulo: "core", clave: "ia_modelos", valor: modelos },
    });
  for (const a of numericos) {
    const n = Number(nums[a.clave]);
    if (n !== a.valor)
      out.push({
        id: "platform.ajustes.set",
        input: { modulo: a.modulo, clave: a.clave, valor: n },
      });
  }
  return out;
}
