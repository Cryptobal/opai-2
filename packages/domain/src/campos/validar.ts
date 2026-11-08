import { campoPorClave, coleccionPorClave } from "./catalogo";
import { formatoValido } from "./formatos";
import { parsearPlantillaCampos, type Nodo } from "./plantilla";
import type { FinalidadCampo, ProblemaCampo } from "./tipos";

export type ResultadoValidacion = {
  ok: boolean;
  problemas: ProblemaCampo[];
  /** Claves canónicas usadas (los alias se resuelven), sin repetir. */
  usados: string[];
  colecciones: string[];
};

function revisar(
  nodos: readonly Nodo[],
  finalidad: FinalidadCampo,
  salida: { problemas: ProblemaCampo[]; usados: Set<string>; colecciones: Set<string> },
): void {
  const usar = (token: string, formato?: string) => {
    const campo = campoPorClave(token);
    if (!campo) {
      salida.problemas.push({
        codigo: "token_desconocido",
        mensaje: `El campo «${token}» no existe en el catálogo.`,
        token,
      });
      return;
    }
    if (!campo.finalidades.includes(finalidad)) {
      salida.problemas.push({
        codigo: "no_autorizado",
        mensaje: `El campo «${campo.clave}» no está autorizado en un documento de tipo «${finalidad}».`,
        token,
      });
      return;
    }
    if (!formatoValido(campo.tipo, formato)) {
      salida.problemas.push({
        codigo: "formato_invalido",
        mensaje: `El formato «${formato}» no sirve para «${campo.clave}» (${campo.tipo}).`,
        token,
      });
      return;
    }
    salida.usados.add(campo.clave);
  };
  for (const n of nodos) {
    if (n.t === "campo") usar(n.clave, n.formato);
    else if (n.t === "si") {
      usar(n.clave);
      revisar(n.hijos, finalidad, salida);
    } else if (n.t === "cada") {
      if (!coleccionPorClave(n.coleccion)) {
        salida.problemas.push({
          codigo: "token_desconocido",
          mensaje: `La colección «${n.coleccion}» no existe en el catálogo.`,
          token: n.coleccion,
        });
      } else salida.colecciones.add(coleccionPorClave(n.coleccion)?.clave ?? n.coleccion);
      revisar(n.hijos, finalidad, salida);
    }
  }
}

/** Valida una plantilla contra el catálogo único y la finalidad del documento. No resuelve valores. */
export function validarPlantillaCampos(
  texto: string,
  finalidad: FinalidadCampo,
): ResultadoValidacion {
  const { nodos, problemas } = parsearPlantillaCampos(texto);
  const salida = {
    problemas: [...problemas],
    usados: new Set<string>(),
    colecciones: new Set<string>(),
  };
  revisar(nodos, finalidad, salida);
  return {
    ok: salida.problemas.length === 0,
    problemas: salida.problemas,
    usados: [...salida.usados],
    colecciones: [...salida.colecciones],
  };
}
