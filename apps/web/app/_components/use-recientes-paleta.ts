import { useEffect, useState } from "react";
import { validarFichasNav } from "@/app/_acciones/validar-fichas-nav";
import type { ItemNav } from "@/lib/navegacion";
import { leerRecientes, type Reciente } from "./use-recientes";

export function useRecientesPaleta(abierto: boolean, epoca: string, nav: ItemNav[]) {
  const [recientes, setRecientes] = useState<Reciente[]>([]);
  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    const lista = leerRecientes(epoca);
    void validarFichasNav(lista.map((r) => r.href)).then((validas) => {
      if (vigente) setRecientes(lista.filter((r) => validas.includes(r.href) || nav.some((n) => n.href === r.href)));
    });
    return () => { vigente = false; };
  }, [abierto, epoca, nav]);
  return { recientes, limpiarRecientes: () => setRecientes([]) };
}
