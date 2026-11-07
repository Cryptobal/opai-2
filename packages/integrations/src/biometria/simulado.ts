import { createHash } from "node:crypto";

import {
  type Biometria,
  BiometriaError,
  type ResultadoEnrolamientoFacial,
  type ResultadoVerificacionFacial,
} from "./tipos";

// Proveedor SIMULADO, determinista y sin red (D-03/D-04 siguen abiertas: el adaptador real entra detrás
// de este mismo contrato). Una muestra válida es `rostro:<token>`; la misma persona repite su token.
//   rostro:<token>        → persona presente
//   rostro:<token>:foto   → foto o pantalla (sin prueba de vida)
// Cualquier otra cosa es una muestra ilegible.
const PREFIJO = "rostro:";

function leer(muestra: string): { token: string; vivo: boolean } {
  if (!muestra.startsWith(PREFIJO))
    throw new BiometriaError("muestra_invalida", "La muestra no se pudo leer.");
  const resto = muestra.slice(PREFIJO.length);
  const vivo = !resto.endsWith(":foto");
  const token = vivo ? resto : resto.slice(0, -":foto".length);
  if (token.length === 0)
    throw new BiometriaError("muestra_invalida", "La muestra no se pudo leer.");
  return { token, vivo };
}

const huella = (token: string) => createHash("sha256").update(token).digest("hex").slice(0, 32);

/** Proveedor simulado con memoria propia: lo enrolado y lo borrado se recuerda mientras viva el proceso. */
export function biometriaSimulada(): Biometria {
  const enroladas = new Set<string>();
  return {
    nombre: "simulado",
    disponible: true,
    async enrolar({ muestra }): Promise<ResultadoEnrolamientoFacial> {
      const { token, vivo } = leer(muestra);
      if (!vivo)
        throw new BiometriaError("sin_prueba_de_vida", "No se pudo comprobar que sea una persona.");
      // La referencia incluye una huella del token pero no la muestra; es opaca para quien la guarda.
      const referencia = `sim:${huella(token)}`;
      enroladas.add(referencia);
      return { referencia, proveedor: "simulado" };
    },
    async verificar({ referencia, muestra }): Promise<ResultadoVerificacionFacial> {
      if (!enroladas.has(referencia))
        throw new BiometriaError(
          "referencia_inexistente",
          "No hay un rostro enrolado para verificar.",
        );
      const { token, vivo } = leer(muestra);
      const coincide = `sim:${huella(token)}` === referencia;
      return { coincide, vivo, puntaje: coincide ? 99 : 12, proveedor: "simulado" };
    },
    async borrar(referencia) {
      enroladas.delete(referencia);
    },
  };
}
