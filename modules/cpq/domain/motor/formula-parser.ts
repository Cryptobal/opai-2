export type Nodo = { tipo: "numero"; valor: number } | { tipo: "referencia"; clave: string }
  | { tipo: "operacion"; op: string; izq: Nodo; der: Nodo }
  | { tipo: "funcion"; nombre: string; args: Nodo[] };

/** Gramática cerrada, sin eval. Los literales son enteros; las variables declaran su escala. */
export function parsearFormula(texto: string): Nodo {
  if (texto.length > 2000) throw new RangeError("Fórmula demasiado larga");
  const tokens = texto.match(/\d+|[a-zA-Z_][a-zA-Z_0-9]*(?:\.[a-zA-Z_][a-zA-Z_0-9]*)?|[+\-*/(),]|\S/g) ?? [];
  if (tokens.length > 256) throw new RangeError("Demasiados términos");
  let i = 0, profundidad = 0;
  const tomar = () => tokens[i++];
  function primario(): Nodo {
    if (++profundidad > 32) throw new RangeError("Fórmula demasiado anidada");
    const t = tomar();
    let nodo: Nodo;
    if (t === "-") nodo = { tipo: "operacion", op: "*", izq: { tipo: "numero", valor: -1 }, der: primario() };
    else if (t === "+") nodo = primario();
    else if (t === "(") { nodo = expresion(0); if (tomar() !== ")") throw new Error("Falta paréntesis"); }
    else if (t && /^\d+$/.test(t)) {
      const valor = Number(t);
      if (!Number.isSafeInteger(valor)) throw new Error("Literal fuera de rango");
      nodo = { tipo: "numero", valor };
    } else if (t && /^[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)?$/.test(t)) {
      if (tokens[i] !== "(") nodo = { tipo: "referencia", clave: t };
      else {
        if (!["min", "max", "redondear", "si"].includes(t)) throw new Error(`Función no permitida: ${t}`);
        tomar(); const args: Nodo[] = [];
        args.push(expresion(0));
        while (tokens[i] === ",") { tomar(); args.push(expresion(0)); }
        if (tomar() !== ")") throw new Error("Falta cierre de función");
        if ((t === "redondear" && args.length !== 1) || (t === "si" && args.length !== 3)
          || (["min", "max"].includes(t) && args.length < 2)) throw new Error(`Argumentos inválidos: ${t}`);
        nodo = { tipo: "funcion", nombre: t, args };
      }
    } else throw new Error(`Símbolo no permitido en posición ${i}`);
    profundidad--; return nodo;
  }
  function expresion(minimo: number): Nodo {
    let izq = primario();
    while (i < tokens.length) {
      const op = tokens[i] ?? "";
      const prioridad = op === "+" || op === "-" ? 1 : op === "*" || op === "/" ? 2 : -1;
      if (prioridad < minimo) break;
      tomar(); izq = { tipo: "operacion", op, izq, der: expresion(prioridad + 1) };
    }
    return izq;
  }
  const raiz = expresion(0);
  if (i !== tokens.length) throw new Error(`Texto sobrante en posición ${i}`);
  return raiz;
}
