import { escaparHtml } from "../plantillas";
import { campoPorClave, coleccionPorClave } from "./catalogo";
import { estaVacio, formatearValor } from "./formatos";
import { parsearPlantillaCampos, type Nodo } from "./plantilla";
import type { FinalidadCampo, ProblemaCampo, ValorCampo, ValoresCampos } from "./tipos";
import { validarPlantillaCampos } from "./validar";

export type OpcionesRender = {
  finalidad: FinalidadCampo;
  /** Escapa cada valor para incrustarlo en HTML. */
  html?: boolean;
  /** Si es `true`, un valor faltante impide renderizar en vez de quedar vacío. */
  exigirCompleto?: boolean;
};

export type ResultadoRender =
  | { ok: true; texto: string; faltantes: string[]; usados: string[] }
  | { ok: false; problemas: ProblemaCampo[] };

type Ambito = Readonly<Record<string, ValorCampo>>;

/** Renderiza con valores ya resueltos. Nunca inventa: lo que falta queda vacío y se informa en `faltantes`. */
export function renderizarPlantillaCampos(
  texto: string,
  valores: ValoresCampos,
  op: OpcionesRender,
): ResultadoRender {
  const validacion = validarPlantillaCampos(texto, op.finalidad);
  if (!validacion.ok) return { ok: false, problemas: validacion.problemas };
  const faltantes = new Set<string>();
  const invalidos: ProblemaCampo[] = [];
  const buscar = (clave: string, item?: Ambito): ValorCampo =>
    item?.[clave] ?? valores.campos?.[clave];

  const recorrer = (nodos: readonly Nodo[], item?: Ambito): string =>
    nodos
      .map((n) => {
        if (n.t === "texto") return n.v;
        if (n.t === "campo") {
          const campo = campoPorClave(n.clave);
          if (!campo) return "";
          const v = buscar(campo.clave, item);
          if (estaVacio(v)) {
            faltantes.add(campo.clave);
            return "";
          }
          const s = formatearValor(campo.tipo, v, n.formato);
          if (s === null) {
            invalidos.push({
              codigo: campo.tipo === "url" ? "url_invalida" : "formato_invalido",
              mensaje: `El valor de «${campo.clave}» no es válido.`,
              token: campo.clave,
            });
            return "";
          }
          return op.html ? escaparHtml(s) : s;
        }
        if (n.t === "si") {
          const clave = campoPorClave(n.clave)?.clave ?? n.clave;
          const v = buscar(clave, item);
          return !estaVacio(v) && v !== false ? recorrer(n.hijos, item) : "";
        }
        const col = coleccionPorClave(n.coleccion)?.clave ?? n.coleccion;
        const elementos = valores.colecciones?.[col] ?? [];
        if (elementos.length === 0) faltantes.add(`colecciones.${col}`);
        return elementos.map((el) => recorrer(n.hijos, el)).join("");
      })
      .join("");

  const salida = recorrer(parsearPlantillaCampos(texto).nodos);
  if (invalidos.length > 0) return { ok: false, problemas: invalidos };
  if (op.exigirCompleto && faltantes.size > 0) {
    return {
      ok: false,
      problemas: [...faltantes].map((f) => ({
        codigo: "faltante" as const,
        mensaje: `Falta el valor de «${f}».`,
        token: f,
      })),
    };
  }
  return { ok: true, texto: salida, faltantes: [...faltantes], usados: validacion.usados };
}
