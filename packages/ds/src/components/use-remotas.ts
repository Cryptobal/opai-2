import { useEffect, useState } from "react";

import type { ComboboxProps } from "./combobox-cmdk";
import type { OpcionCombobox } from "./resaltado";

const SIN_OPCIONES: readonly OpcionCombobox[] = [];

/**
 * Búsqueda remota con espera de 220 ms. Devuelve las opciones de la última búsqueda terminada y si
 * hay una pendiente (`buscando`): mientras el texto escrito no tenga su respuesta, la lista no
 * puede decir «Sin resultados». Una respuesta que llega después de seguir escribiendo se descarta.
 */
export function useRemotas(q: string, onBuscar: ComboboxProps["onBuscar"]) {
  const [resuelta, setResuelta] = useState<{
    q: string;
    opciones: readonly OpcionCombobox[];
  } | null>(null);
  useEffect(() => {
    if (!onBuscar) return;
    let vigente = true;
    const t = setTimeout(() => {
      onBuscar(q)
        .catch(() => SIN_OPCIONES)
        .then((opciones) => {
          if (vigente) setResuelta({ q, opciones });
        });
    }, 220);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [q, onBuscar]);
  return {
    opciones: resuelta?.opciones ?? SIN_OPCIONES,
    buscando: Boolean(onBuscar) && q.trim() !== "" && resuelta?.q !== q,
  };
}
