"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";

import { pesos } from "../formato";
import { RUTA_LOTES } from "./tipos";

type FilaLote = { id: string; montoTotal: number };

export function useSeleccionArmarLote() {
  const router = useRouter();
  const [sel, setSel] = useState<ReadonlySet<string>>(new Set());
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alternar = (id: string, v: boolean) =>
    setSel((p) => {
      const n = new Set(p);
      if (v) n.add(id);
      else n.delete(id);
      return n;
    });
  return { router, sel, ocupado, setOcupado, error, setError, alternar };
}

export function totalesSeleccion<T extends FilaLote>(candidatas: readonly T[], sel: ReadonlySet<string>) {
  const elegidas = candidatas.filter((c) => sel.has(c.id));
  const total = elegidas.reduce((s, c) => s + c.montoTotal, 0);
  return { elegidas, total };
}

export async function crearLoteDesdeSeleccion(
  capacidad: string,
  rendicionIds: string[],
  mensajeOk: string,
  router: ReturnType<typeof useRouter>,
  setOcupado: (v: boolean) => void,
  setError: (v: string | null) => void,
): Promise<void> {
  setOcupado(true);
  setError(null);
  const r = await ejecutarCapacidad("erp", capacidad, { rendicionIds });
  setOcupado(false);
  if (!r.ok) return setError(r.error.message);
  avisar.exito(mensajeOk);
  router.push(`${RUTA_LOTES}/${(r.data as { id: string }).id}`);
}

export function PieArmarLote({
  cantidad,
  total,
  ocupado,
  error,
  etiquetaBoton,
  varianteBoton,
  deshabilitado,
  onCrear,
}: {
  cantidad: number;
  total: number;
  ocupado: boolean;
  error: string | null;
  etiquetaBoton: string;
  varianteBoton?: "secondary";
  deshabilitado?: boolean;
  onCrear: () => void;
}) {
  return (
    <>
      {error ? <p role="alert" className="text-base font-medium text-danger-fg">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-base text-fg-muted">{cantidad} rendiciones seleccionadas</span>
        <span className="flex items-center gap-3">
          <b className="tabular-nums">{pesos(total)}</b>
          <Button variant={varianteBoton} disabled={deshabilitado ?? cantidad === 0 || ocupado} onClick={() => void onCrear()}>
            {ocupado ? "Creando…" : etiquetaBoton}
          </Button>
        </span>
      </div>
    </>
  );
}