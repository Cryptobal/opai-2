import { useState } from "react";

/** Conjunto de IDs seleccionados (listas con checkbox). */
export function useSeleccionIds() {
  const [sel, setSel] = useState<ReadonlySet<string>>(new Set());
  const alternar = (id: string, v: boolean) =>
    setSel((p) => {
      const n = new Set(p);
      if (v) n.add(id);
      else n.delete(id);
      return n;
    });
  return { sel, alternar, vaciar: () => setSel(new Set()) };
}