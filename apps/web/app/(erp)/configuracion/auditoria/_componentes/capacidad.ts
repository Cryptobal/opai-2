import { RECURSOS } from "./etiquetas-recursos";
import { VERBOS } from "./etiquetas-verbos";

const humanizar = (t: string) => {
  const s = t.replace(/[_-]+/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** «core.marca.update» → «Marca · Editar»: el código técnico no se muestra al usuario. */
export function etiquetaCapacidad(codigo: string): string {
  const partes = codigo.split(".");
  const recurso = partes[1];
  if (!recurso) return codigo;
  const verbo = partes.slice(2).join(".");
  const r = RECURSOS[recurso] ?? humanizar(recurso);
  return verbo ? `${r} · ${VERBOS[verbo] ?? humanizar(verbo)}` : r;
}
