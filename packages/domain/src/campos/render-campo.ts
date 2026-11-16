import { escaparHtml } from "../plantillas";
import { campoPorClave } from "./catalogo";
import { estaVacio, formatearValor } from "./formatos";
import type { Nodo } from "./plantilla";
import type { OpcionesRender, ProblemaCampo, ValorCampo } from "./tipos";

type Ambito = Readonly<Record<string, ValorCampo>>;

export function textoCampo(
  n: Extract<Nodo, { t: "campo" }>,
  buscar: (clave: string, item?: Ambito) => ValorCampo,
  item: Ambito | undefined,
  op: OpcionesRender,
  faltantes: Set<string>,
  invalidos: ProblemaCampo[],
): string {
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
  return op.html && !campo.contenidoHtml ? escaparHtml(s) : s;
}