import { describe, expect, it } from "vitest";
import { calcular } from "./calcular";
import { financieraPrueba, itemPrueba, modeloPrueba, parametrosPrueba, versionPrueba } from "./fixtures";
import { N, Numero, UNO } from "./numero";
import paquete from "../../package.json";

describe("regresiones de autorrevisión y addendum", () => {
  it("R31: guarda 100% en todos los modos y márgenes de secciones completos", () => {
    for (const modo of ["markup", "margen_sobre_venta", "margen_sobre_mano_de_obra"] as const) {
      const v = { ...versionPrueba([itemPrueba(100)]), margenModo: modo, margenPct: 1_000_000 };
      expect(calcular(v, modeloPrueba(), parametrosPrueba).ventaMensual).toBe(100);
    }
    const v = versionPrueba([itemPrueba(90, { seccion: "A" }), itemPrueba(87, { id: "otro", seccion: "C" })]);
    v.margenesSeccion = [{ seccion: "A", margenPct: 100_000 }, { seccion: "C", margenPct: 130_000 }];
    expect(calcular(v, modeloPrueba(), parametrosPrueba).ventaMensual).toBe(200);
    v.margenesSeccion = [{ seccion: "A", margenPct: 100_000 }];
    expect(() => calcular(v, modeloPrueba(), parametrosPrueba)).toThrow("Falta margen");
    v.margenesSeccion = [{ seccion: "A", margenPct: 100_000 }, { seccion: "A", margenPct: 100_000 }];
    expect(() => calcular(v, modeloPrueba(), parametrosPrueba)).toThrow("duplicado");
  });
  it.each([false, true])("R26: la traza reconstruye S con garantía fija=%s y únicos", (fija) => {
    const unico = itemPrueba(120_000, { id: "unico" });
    unico.item.modo = "inversion"; unico.item.rateo = { tipo: "unico" };
    const v = versionPrueba([itemPrueba(8_000_000), unico]), instrumentos = financieraPrueba();
    instrumentos.financiero.habilitado = true; instrumentos.garantia.habilitada = true;
    instrumentos.garantia.incluirUnicos = true;
    instrumentos.garantia.modo = fija ? "fija" : "porcentaje"; instrumentos.garantia.montoUf = 1_000_000;
    v.instrumentos = instrumentos;
    const r = calcular(v, modeloPrueba(), parametrosPrueba);
    const t = r.traza.find((t) => t.item === "totales" && t.monto === "ventaMensual");
    const leer = (clave: string) => {
      const valor = t?.variables.find((v) => v.clave === clave)?.valor;
      if (typeof valor !== "string") throw new Error("Operando faltante");
      const [n, d] = valor.split("/");
      return new Numero(BigInt(n ?? "0"), BigInt(d ?? "1"));
    };
    const reconstruida = leer("B").mas(leer("RC")).mas(leer("Gfijo")).mas(leer("únicos")).div(UNO.menos(leer("k")));
    expect(reconstruida.entero()).toBe(r.ventaMensual);
    expect(t?.exacto).toBe(reconstruida.exacto());
    expect(leer("Gfijo").comparar(N(0)) > 0).toBe(fija);
  });
  it("R30/R26: ítem UF traza valor y fecha; UF de otro día se trata como faltante", () => {
    const l = itemPrueba(10_000); l.item.moneda = "UF";
    const v = versionPrueba([l]), r = calcular(v, modeloPrueba(), parametrosPrueba);
    expect(r.costoMensual).toBe(40_845);
    expect(r.traza[0]?.variables).toContainEqual({ clave: "UF", ambito: "parametro", valor: 408_450_000 });
    expect(r.traza[0]?.variables).toContainEqual({ clave: "fechaUF", ambito: "parametro", valor: "2026-11-01" });
    const parametros = { ...parametrosPrueba, uf: { valorClpEscalado: 408_450_000, fecha: "2026-10-31" } };
    expect(calcular(v, modeloPrueba(), parametros)).toMatchObject({ costoMensual: 0, noEnviable: true, advertencias: ["falta valor UF"] });
    const i = financieraPrueba(); i.rc.habilitada = true; i.rc.primaAnualUf = 900_000;
    v.instrumentos = i;
    expect(calcular(v, modeloPrueba(), parametros).instrumentos.responsabilidad).toBe(0);
  });
  it("addendum: el export público del motor no se resuelve en bundles de navegador", () => {
    expect(paquete.exports["./motor"].browser).toBeNull();
  });
});
