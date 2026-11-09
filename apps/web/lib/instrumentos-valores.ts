/** Valores editables de los instrumentos financieros de una cotización (CAR-214); tasas y UF escalados como en CPQ. */
export const PCT_UNO = 10_000; // 1 % = 10.000
export const UF_UNO = 10_000; // 1 UF = 10.000

export type InstrumentosCompletos = {
  financiero: { habilitado: boolean; tasaPct: number };
  garantia: {
    habilitada: boolean;
    modo: "porcentaje" | "fija";
    meses: number;
    contratoPct: number;
    tasaAnualPct: number;
    administracionPct: number;
    montoUf: number;
    incluirUnicos: boolean;
  };
  rc: {
    habilitada: boolean;
    modo: "prima" | "tasa";
    primaAnualUf: number;
    aseguradoUf: number;
    tasaAnualPct: number;
    asignacionPct: number;
    plazo: "anual" | "contrato" | "meses";
    meses: number;
  };
};

type Numerico = {
  financiero: "tasaPct";
  garantia: "contratoPct" | "tasaAnualPct" | "administracionPct" | "montoUf" | "meses";
  rc: "primaAnualUf" | "aseguradoUf" | "tasaAnualPct" | "asignacionPct" | "meses";
};

/** Qué campos son % (escala 10.000 por 1 %), UF (10.000 por UF) o meses (enteros). */
const TIPO: Record<string, "pct" | "uf" | "meses"> = {
  tasaPct: "pct", contratoPct: "pct", tasaAnualPct: "pct", administracionPct: "pct", asignacionPct: "pct",
  montoUf: "uf", primaAnualUf: "uf", aseguradoUf: "uf", meses: "meses",
};
const MAXIMO = { pct: 1_000_000, uf: 1_000_000_000_000, meses: 120 } as const;

/** Escalado → texto con coma («120.000» → «12»; «12.500» → «1,25»). */
export function aTexto(valor: number, campo: string): string {
  const t = TIPO[campo] ?? "pct";
  if (t === "meses") return String(valor);
  const n = valor / (t === "pct" ? PCT_UNO : UF_UNO);
  return String(Number(n.toFixed(4))).replace(".", ",");
}

/** Texto del usuario → escalado, o `null` si no es un número válido o se sale del rango. */
export function aEscalado(texto: string, campo: string): number | null {
  const t = TIPO[campo] ?? "pct";
  const limpio = texto.trim();
  if (t === "meses") {
    if (!/^\d+$/.test(limpio)) return null;
    const n = Number(limpio);
    return n >= 1 && n <= MAXIMO.meses ? n : null;
  }
  if (!/^\d+([.,]\d{1,4})?$/.test(limpio)) return null;
  const n = Math.round(Number(limpio.replace(",", ".")) * (t === "pct" ? PCT_UNO : UF_UNO));
  return n >= 0 && n <= MAXIMO[t] ? n : null;
}

export type ValoresTexto = {
  financiero: Record<Numerico["financiero"], string>;
  garantia: Record<Numerico["garantia"], string>;
  rc: Record<Numerico["rc"], string>;
  garantiaModo: "porcentaje" | "fija";
  rcModo: "prima" | "tasa";
  rcPlazo: "anual" | "contrato" | "meses";
};

export function valoresIniciales(i: InstrumentosCompletos): ValoresTexto {
  const f = (o: object, ks: string[]) => Object.fromEntries(ks.map((k) => [k, aTexto((o as Record<string, number>)[k] ?? 0, k)]));
  return {
    financiero: f(i.financiero, ["tasaPct"]) as ValoresTexto["financiero"],
    garantia: f(i.garantia, ["contratoPct", "tasaAnualPct", "administracionPct", "montoUf", "meses"]) as ValoresTexto["garantia"],
    rc: f(i.rc, ["primaAnualUf", "aseguradoUf", "tasaAnualPct", "asignacionPct", "meses"]) as ValoresTexto["rc"],
    garantiaModo: i.garantia.modo,
    rcModo: i.rc.modo,
    rcPlazo: i.rc.plazo,
  };
}

/** Campos con texto inválido (por instrumento y campo), para mostrar el error en línea. */
export function erroresValores(v: ValoresTexto): Record<string, string> {
  const e: Record<string, string> = {};
  const revisar = (grupo: string, campos: Record<string, string>, activos: string[]) => {
    for (const k of activos) if (aEscalado(campos[k] ?? "", k) === null) e[`${grupo}.${k}`] = TIPO[k] === "meses" ? "Entre 1 y 120 meses." : "Escribe un número válido.";
  };
  revisar("financiero", v.financiero, ["tasaPct"]);
  revisar("garantia", v.garantia, v.garantiaModo === "fija" ? ["montoUf", "meses"] : ["contratoPct", "tasaAnualPct", "administracionPct", "meses"]);
  revisar("rc", v.rc, [...(v.rcModo === "prima" ? ["primaAnualUf", "asignacionPct"] : ["aseguradoUf", "tasaAnualPct"]), ...(v.rcPlazo === "meses" ? ["meses"] : [])]);
  return e;
}

/** Parcial de `cpq.versiones.parametros`: solo lo que cambió respecto de lo cargado. */
export function parcialInstrumentos(inicial: ValoresTexto, actual: ValoresTexto) {
  const cambios = <G extends Record<string, string>>(a: G, b: G) => {
    const out: Record<string, number> = {};
    for (const k of Object.keys(b)) {
      if (a[k] === b[k]) continue;
      const n = aEscalado(b[k] ?? "", k);
      if (n !== null) out[k] = n;
    }
    return out;
  };
  const fin = cambios(inicial.financiero, actual.financiero);
  const gar: Record<string, number | string> = cambios(inicial.garantia, actual.garantia);
  if (inicial.garantiaModo !== actual.garantiaModo) gar["modo"] = actual.garantiaModo;
  const rc: Record<string, number | string> = cambios(inicial.rc, actual.rc);
  if (inicial.rcModo !== actual.rcModo) rc["modo"] = actual.rcModo;
  if (inicial.rcPlazo !== actual.rcPlazo) rc["plazo"] = actual.rcPlazo;
  return {
    ...(Object.keys(fin).length ? { financiero: fin } : {}),
    ...(Object.keys(gar).length ? { garantia: gar } : {}),
    ...(Object.keys(rc).length ? { rc } : {}),
  };
}
