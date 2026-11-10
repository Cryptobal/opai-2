"use client";

import { Pause, Play } from "lucide-react";
import { useEffect } from "react";

import { Button, avisar } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { accionCaf } from "./etiquetas-dte";
import type { FolioCaf } from "./tipos";

/**
 * Pausar o reactivar un CAF (CAR-240). La respuesta de la capacidad refresca la lista; un rechazo se muestra siempre
 * (nunca falla en silencio). Decide aquí la acción (no en la lista) para que esa lógica viaje en el chunk diferido.
 */
export function AccionCaf({ folio, hoy }: { folio: FolioCaf; hoy: string }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  useEffect(() => {
    if (error) avisar.error(error);
  }, [error]);
  const accion = folio.id ? accionCaf(folio, hoy) : null;
  if (!accion) return null;
  const rango = `${folio.folioDesde}–${folio.folioHasta}`;
  async function aplicar() {
    const activo = accion === "reactivar";
    const r = await ejecutar("finanzas.folios.set_activo", { folioId: folio.id, activo });
    if (r) avisar.exito(activo ? `CAF ${rango} reactivado` : `CAF ${rango} pausado: no se usará para emitir`);
  }
  return (
    <Button
      variant="secondary"
      disabled={pendiente}
      aria-label={`${accion === "pausar" ? "Pausar" : "Reactivar"} CAF ${rango}`}
      onClick={() => void aplicar()}
    >
      {accion === "pausar" ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
      {accion === "pausar" ? "Pausar" : "Reactivar"}
    </Button>
  );
}
