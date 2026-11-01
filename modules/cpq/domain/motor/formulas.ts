import { parsearFormula, type Nodo } from "./formula-parser";
import { CERO, N, type Numero } from "./numero";
import type { Ambito, ModeloCosteo, Unidad, Valores, VariableUsada } from "./tipos";

type Cantidad = { valor: Numero; clp: number; uf: number };
const cantidad = (valor: Numero, unidad: Unidad): Cantidad => ({ valor, clp: +(unidad === "clp"), uf: +(unidad === "uf") });
function compatibles(a: Cantidad, b: Cantidad): void {
  if (a.clp !== b.clp || a.uf !== b.uf) throw new Error("Unidades incompatibles");
}
export function evaluarFormula(
  expresion: string, modelo: ModeloCosteo, cotizacion: Valores = {}, linea: Valores = {},
): { valor: Numero; variables: VariableUsada[]; unidad: Unidad } {
  const usadas: VariableUsada[] = [], pila = new Set<string>();
  let operaciones = 0;
  function referencia(clave: string): Cantidad {
    const partes = clave.split("."), nombre = partes.at(-1) ?? clave;
    const formula = modelo.formulas.find((f) => f.clave === nombre);
    if (formula && (partes.length === 1 || partes[0] === "formula")) {
      if (pila.has(nombre)) throw new Error(`Ciclo de fórmulas: ${[...pila, nombre].join(" → ")}`);
      pila.add(nombre); const r = visitar(parsearFormula(formula.expresion)); pila.delete(nombre);
      compatibles(r, cantidad(CERO, formula.unidad)); return r;
    }
    const def = modelo.variables.find((v) => v.clave === nombre);
    if (!def) throw new Error(`Referencia rota: ${clave}`);
    const valores: Record<Ambito, Valores> = { tenant: modelo.valores, cotizacion, linea };
    const explicito = partes.length === 2 ? partes[0] : undefined;
    if (explicito && !["tenant", "cotizacion", "linea"].includes(explicito)) throw new Error(`Ámbito inválido: ${clave}`);
    const origen = (explicito ? [explicito as Ambito] : ["linea", "cotizacion", "tenant"] as const)
      .find((a) => Object.hasOwn(valores[a], nombre));
    const valor = origen ? valores[origen][nombre] ?? def.defecto : def.defecto;
    usadas.push({ clave: nombre, ambito: origen ?? "modelo", valor });
    return cantidad(N(valor, def.escala), def.unidad);
  }
  function visitar(n: Nodo): Cantidad {
    if (++operaciones > 4096) throw new Error("Demasiadas operaciones de fórmula");
    if (n.tipo === "numero") return cantidad(N(n.valor), "numero");
    if (n.tipo === "referencia") return referencia(n.clave);
    if (n.tipo === "operacion") {
      const a = visitar(n.izq), b = visitar(n.der);
      if (n.op === "+" || n.op === "-") {
        compatibles(a, b); return { ...a, valor: n.op === "+" ? a.valor.mas(b.valor) : a.valor.menos(b.valor) };
      }
      const signo = n.op === "*" ? 1 : -1;
      return { valor: signo === 1 ? a.valor.por(b.valor) : a.valor.div(b.valor), clp: a.clp + signo * b.clp, uf: a.uf + signo * b.uf };
    }
    const args = n.args.map(visitar), a = args[0];
    if (!a) throw new Error("Falta argumento");
    if (n.nombre === "si") {
      const b = args[1], c = args[2];
      if (!b || !c || a.clp || a.uf) throw new Error("Condición debe ser numérica");
      compatibles(b, c); return a.valor.comparar(CERO) ? b : c;
    }
    if (n.nombre === "redondear") return { ...a, valor: N(a.valor.entero()) };
    return args.slice(1).reduce((r, v) => {
      compatibles(r, v); const comparacion = r.valor.comparar(v.valor);
      return (n.nombre === "min" ? comparacion <= 0 : comparacion >= 0) ? r : v;
    }, a);
  }
  const r = visitar(parsearFormula(expresion));
  const unidad: Unidad = r.clp === 1 && r.uf === 0 ? "clp" : r.uf === 1 && r.clp === 0 ? "uf" : "numero";
  if ((unidad === "numero" && (r.clp || r.uf))) throw new Error("Unidad resultante incompatible");
  return { valor: r.valor, variables: usadas, unidad };
}

export function validarModelo(modelo: ModeloCosteo): void {
  const claves = [...modelo.variables.map((v) => v.clave), ...modelo.formulas.map((f) => f.clave)];
  if (new Set(claves).size !== claves.length) throw new Error("Claves duplicadas en modelo");
  if (new Set(modelo.categorias.map((c) => c.id)).size !== modelo.categorias.length) throw new Error("Categoría duplicada");
  if (new Set(modelo.items.map((c) => c.id)).size !== modelo.items.length) throw new Error("Ítem duplicado");
  const feriados = modelo.categorias.find((c) => c.id === "feriados");
  if (!feriados?.fija || feriados.clase !== "directo") throw new Error("Ajuste de feriados debe ser fijo y directo");
  for (const v of modelo.variables) N(v.defecto, v.escala);
  for (const formula of modelo.formulas) {
    const r = evaluarFormula(`formula.${formula.clave}`, modelo);
    if (r.unidad !== formula.unidad) throw new Error(`Unidad inválida: ${formula.clave}`);
  }
  for (const item of modelo.items) {
    if (!modelo.categorias.some((c) => c.id === item.categoria)) throw new Error(`Categoría rota: ${item.id}`);
    if (item.formula) evaluarFormula(item.formula, modelo);
  }
}
