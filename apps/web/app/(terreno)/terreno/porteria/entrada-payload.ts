import {
  camposDelTipo,
  type ConfigAcceso,
  documentoSegun,
  esCampoPersonalizado,
  faltaObligatorio,
} from "@opai/domain/acceso-config";
import { normalizarPatente, type TipoDocumento } from "@opai/domain/acceso-documento";

export type Borrador = {
  tipo: string;
  docTipo: TipoDocumento;
  numero: string;
  pais: string;
  nombre: string;
  /** Valores de los campos del formulario por id (empresa, motivo, patente y `c_…`). */
  valores: Readonly<Record<string, string>>;
};

/**
 * Valida la entrada con la configuración de la instalación y arma el hecho `acceso.entrada`. Solo viajan los campos
 * que el formulario pide para ese tipo; los personalizados van con la etiqueta con que se pidieron.
 */
export function armarEntrada(
  c: ConfigAcceso,
  b: Borrador,
): { error: string } | { payload: Record<string, unknown> } {
  const documento = { tipo: b.docTipo, numero: b.numero, ...(b.pais ? { pais: b.pais } : {}) };
  if (!documentoSegun(c.validarRut, documento))
    return {
      error:
        b.docTipo === "run"
          ? "El RUN no es válido. Revisa el dígito verificador."
          : "Revisa el documento y el país.",
    };
  if (b.nombre.trim().length < 2) return { error: "Escribe el nombre de la persona." };
  const falta = faltaObligatorio(c, b.tipo, b.valores);
  if (falta) return { error: `Completa «${falta}».` };
  const visibles = camposDelTipo(c, b.tipo);
  const valor = (id: string) =>
    visibles.some((f) => f.id === id) ? (b.valores[id] ?? "").trim() : "";
  if (valor("patente") && !normalizarPatente(valor("patente")))
    return { error: "La patente no es válida." };
  const campos = visibles
    .filter((f) => esCampoPersonalizado(f.id) && valor(f.id))
    .map((f) => ({ etiqueta: f.etiqueta, valor: valor(f.id) }));
  const opcional = (k: string, v: string) => (v ? { [k]: v } : {});
  return {
    payload: {
      tipoRegistro: b.tipo,
      documento,
      nombre: b.nombre.trim(),
      ...opcional("empresa", valor("empresa")),
      ...opcional("motivo", valor("motivo")),
      ...opcional("patente", valor("patente")),
      ...(campos.length ? { campos } : {}),
    },
  };
}
