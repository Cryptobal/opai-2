"use client";

import { useRouter } from "next/navigation";

import { Alerta, avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** «Marcar revisadas» (diseño 03): pasa a revisadas las liquidaciones calculadas del período. */
export function MarcarRevisadas({ periodoId, pendientes }: { periodoId: string; pendientes: number }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const router = useRouter();
  async function marcar() {
    const r = await ejecutar<{ revisadas: number }>("nomina.liquidaciones.marcar_revisadas", { periodoId });
    if (r) {
      avisar.exito(r.revisadas === 1 ? "1 liquidación revisada" : `${r.revisadas} liquidaciones revisadas`);
      router.refresh();
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" className="self-start" disabled={pendiente || pendientes === 0} onClick={() => void marcar()}>
        Marcar revisadas
      </Button>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
    </div>
  );
}
