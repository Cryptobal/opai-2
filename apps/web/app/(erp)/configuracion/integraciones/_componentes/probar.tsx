"use client";

import { RefreshCw } from "lucide-react";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Resultado = { ok: boolean; mensaje: string; latenciaMs: number };

/** "Probar conexión" (29): prueba cada proveedor con su credencial vigente y avisa el resultado. */
export function ProbarConexion({ proveedores }: { proveedores: string[] }) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  return (
    <Button
      variant="secondary"
      disabled={pendiente || !proveedores.length}
      onClick={async () => {
        for (const proveedor of proveedores) {
          const r = await ejecutar<Resultado>("core.integraciones.probar", { proveedor });
          if (!r) avisar.error("No se pudo probar la conexión");
          else if (r.ok) avisar.exito(`${r.mensaje} · ${r.latenciaMs} ms`);
          else avisar.error(r.mensaje);
        }
      }}
    >
      <RefreshCw className="size-4" aria-hidden /> {pendiente ? "Probando…" : "Probar conexión"}
    </Button>
  );
}
