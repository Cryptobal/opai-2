import { describe, expect, it } from "vitest";
import { calcular } from "./calcular";
import { itemPrueba, modeloPrueba, parametrosPrueba, versionPrueba } from "./fixtures";

/** Mismas entradas monetarias de cost-lines.test.ts de 1.0; etiquetas genéricas.
 * El ensamblado desde catálogo/defaults y la absorción de exámenes por relación
 * explícita corresponden al PR B. El motor recibe la lista final, sin heurísticas por nombre.
 */
describe("dorados de líneas de costo 1.0", () => {
  it("examen por rotación: 169.280 ×11 ×3/12 = 465.520", () => {
    const l = itemPrueba(169_280, { variables: { personas: 110_000, cambios_anuales: 3 } });
    l.item = { ...l.item, categoria: "examenes", modo: "formula", formula: "formula.examen" };
    const m = modeloPrueba(); m.valores = { permanencia_meses: 4 };
    expect(calcular(versionPrueba([l]), m, parametrosPrueba).costoBase).toBe(465_520);
  });
  it("examen con dotación explícita: 169.280 ×24/17 = 238.984; costo de inversión 4.062.710/17 = 238.983", () => {
    const explicito = itemPrueba(169_280, { variables: { personas: 240_000 } });
    explicito.item = { ...explicito.item, categoria: "examenes", modo: "formula", formula: "precio * personas / 17" };
    const inversion = itemPrueba(4_062_710);
    inversion.item = { ...inversion.item, categoria: "examenes", modo: "inversion", rateo: { tipo: "meses", meses: 17 } };
    expect(calcular(versionPrueba([explicito]), modeloPrueba(), parametrosPrueba).costoBase).toBe(238_984);
    expect(calcular(versionPrueba([inversion]), modeloPrueba(), parametrosPrueba).costoBase).toBe(238_983);
    // Se pasa SOLO la representación elegida del examen; sumar ambas sería una duplicación del ensamblador.
  });
  it("todo peso tiene línea: 1.000 + 238.983 +20.000 +25.000 +2.000 +5.000 =291.983", () => {
    const ls = [1_000, 238_983, 20_000, 25_000, 2_000, 5_000].map((n, i) => itemPrueba(n, { id: `Ítem ${i + 1}` }));
    const r = calcular(versionPrueba(ls), modeloPrueba(), parametrosPrueba);
    expect(r.costoBase).toBe(291_983); expect(r.lineas.reduce((s, l) => s + l.costoMensual, 0)).toBe(r.costoBase);
    expect(r.traza.filter((t) => ls.some((l) => l.id === t.item) && t.monto === "costoMensual")).toHaveLength(6);
  });
  it("no inventa una línea de balance: 100 cuesta 100; apagados y defaults deben venir explícitos", () => {
    const apagado = itemPrueba(50, { id: "Ítem 2", habilitada: false });
    const r = calcular(versionPrueba([itemPrueba(100), apagado]), modeloPrueba(), parametrosPrueba);
    expect(r.costoBase).toBe(100); expect(r.lineas).toHaveLength(1);
  });
});
