import { useEffect, useState } from "react";

import type { ComboboxProps } from "./combobox-cmdk";
import type { OpcionCombobox } from "./resaltado";

export function useRemotas(q: string, onBuscar: ComboboxProps["onBuscar"]) {
  const [remotas, setRemotas] = useState<readonly OpcionCombobox[] | null>(null);
  useEffect(() => {
    if (!onBuscar) return;
    let vigente = true;
    const t = setTimeout(() => void onBuscar(q).then((r) => vigente && setRemotas(r)), 220);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [q, onBuscar]);
  return remotas;
}
