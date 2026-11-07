import type { ProblemaCampo } from "./tipos";

export type Nodo =
  | { t: "texto"; v: string }
  | { t: "campo"; clave: string; formato?: string }
  | { t: "cada"; coleccion: string; hijos: Nodo[] }
  | { t: "si"; clave: string; hijos: Nodo[] };

// {{clave}} · {{clave | formato}} · {{#cada coleccion}} … {{/cada}} · {{#si clave}} … {{/si}}
const ETIQUETA =
  /\{\{\s*(#cada|#si|\/cada|\/si)?\s*([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*)?\s*(?:\|\s*([a-z_]+)\s*)?\}\}/gi;

type Marco = { tipo: "cada" | "si"; clave: string; hijos: Nodo[] };

const problema = (mensaje: string, token?: string): ProblemaCampo => ({
  codigo: "estructura",
  mensaje,
  ...(token ? { token } : {}),
});

/** Convierte la plantilla en un árbol. No consulta el catálogo: eso lo hace el validador. */
export function parsearPlantillaCampos(texto: string): {
  nodos: Nodo[];
  problemas: ProblemaCampo[];
} {
  const raiz: Nodo[] = [];
  const pila: Marco[] = [];
  const problemas: ProblemaCampo[] = [];
  const destino = () => pila[pila.length - 1]?.hijos ?? raiz;
  const agregarTexto = (v: string) => {
    if (v === "") return;
    if (/\{\{|\}\}/.test(v))
      problemas.push(
        problema("Hay llaves {{ }} que no forman una etiqueta válida.", v.trim().slice(0, 40)),
      );
    destino().push({ t: "texto", v });
  };
  let desde = 0;
  for (const m of texto.matchAll(ETIQUETA)) {
    agregarTexto(texto.slice(desde, m.index ?? 0));
    desde = (m.index ?? 0) + m[0].length;
    const [crudo, tipo, clave, formato] = [
      m[0],
      m[1]?.toLowerCase(),
      m[2]?.toLowerCase(),
      m[3]?.toLowerCase(),
    ];
    if (tipo === "#cada" || tipo === "#si") {
      if (!clave) problemas.push(problema(`La etiqueta ${tipo} necesita un nombre.`, crudo));
      if (tipo === "#cada" && pila.some((p) => p.tipo === "cada"))
        problemas.push(problema("No se admite #cada dentro de otro #cada.", crudo));
      const marco: Marco = {
        tipo: tipo === "#cada" ? "cada" : "si",
        clave: clave ?? "",
        hijos: [],
      };
      destino().push(
        marco.tipo === "cada"
          ? { t: "cada", coleccion: marco.clave, hijos: marco.hijos }
          : { t: "si", clave: marco.clave, hijos: marco.hijos },
      );
      pila.push(marco);
    } else if (tipo === "/cada" || tipo === "/si") {
      const esperado = tipo === "/cada" ? "cada" : "si";
      if (pila[pila.length - 1]?.tipo !== esperado)
        problemas.push(problema(`Cierre ${tipo} sin su apertura.`, crudo));
      else pila.pop();
    } else if (clave) {
      destino().push({ t: "campo", clave, ...(formato ? { formato } : {}) });
    } else {
      problemas.push(problema("Etiqueta vacía.", crudo));
    }
  }
  agregarTexto(texto.slice(desde));
  for (const p of pila) problemas.push(problema(`Falta cerrar {{#${p.tipo} ${p.clave}}}.`));
  return { nodos: raiz, problemas };
}
