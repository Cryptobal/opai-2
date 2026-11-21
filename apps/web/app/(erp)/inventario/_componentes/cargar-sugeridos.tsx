"use client";

import { Sparkles } from "lucide-react";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { conteo } from "@/lib/plural";

/** R6: agrega los tipos típicos del rubro que falten (los existentes no cambian). */
export function CargarSugeridos() {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  async function cargar() {
    const r = await ejecutar<{ agregados: string[] }>("inventario.tipos.cargar_sugeridos", {});
    if (!r) return;
    avisar.exito(
      r.agregados.length ? `Se agregaron ${conteo(r.agregados.length, "tipo")}` : "Ya tenías todos los sugeridos",
    );
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="secondary" disabled={pendiente} onClick={() => void cargar()}>
        <Sparkles className="size-4" aria-hidden />
        {pendiente ? "Cargando…" : "Cargar tipos de mi rubro"}
      </Button>
      {error ? <p className="t-caption text-danger">{error}</p> : null}
    </div>
  );
}
