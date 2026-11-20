import { avisar } from "@opai/ds";

import { type DatosPunto, puntoAInput } from "./hoja-punto-datos";
import type { Punto } from "./tipos";

type Ejecutar = (cap: string, input: unknown) => Promise<unknown>;

export function accionesPuntoHoja(opts: {
  ejecutar: Ejecutar;
  d: DatosPunto;
  instalacionId: string;
  actual: Punto | null;
  onCerrar: () => void;
  setConfirmar: (v: boolean) => void;
}) {
  const { ejecutar, d, instalacionId, actual, onCerrar, setConfirmar } = opts;
  const editar = actual !== null;
  const guardar = async () => {
    const input = puntoAInput(d, instalacionId, actual?.id ?? null);
    const r = editar
      ? await ejecutar("rondas.puntos.actualizar", input)
      : await ejecutar("rondas.puntos.crear", input);
    if (r) {
      avisar.exito(editar ? "Punto actualizado" : "Punto creado");
      onCerrar();
    }
  };
  const archivar = async () => {
    if (await ejecutar("rondas.puntos.archivar", { id: actual?.id })) {
      avisar.exito("Punto archivado");
      setConfirmar(false);
      onCerrar();
    }
  };
  return { editar, guardar, archivar };
}