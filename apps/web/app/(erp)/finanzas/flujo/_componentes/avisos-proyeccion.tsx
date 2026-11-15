"use client";

import { X } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";

import { Alerta, Button } from "@opai/ds";

import { avisosPendientes, cerrarAvisos, leerCerrados, suscribirAvisos } from "./avisos-cerrados";

type Aviso = { mensaje: string; abonoId: string };

/** Cada posible cobro en su línea, con una X. Cerrar lo recuerda; uno nuevo vuelve a mostrarse. */
export function AvisosProyeccion({ avisos, epoca }: { avisos: readonly Aviso[]; epoca: string }) {
  const cerrados = useSyncExternalStore(suscribirAvisos, () => leerCerrados(epoca).join("\n"), () => "");
  const visibles = useMemo(() => avisosPendientes(avisos, cerrados ? cerrados.split("\n") : []), [avisos, cerrados]);
  if (visibles.length === 0) return null;
  const titulo = visibles.length === 1 ? "Posible cobro ya recibido" : `${visibles.length} posibles cobros ya recibidos`;
  return (
    <Alerta
      tono="warning"
      titulo={titulo}
      accion={
        <Button variant="ghost" size="icon" aria-label="Cerrar avisos" onClick={() => cerrarAvisos(epoca, visibles.map((a) => a.abonoId))}>
          <X className="size-4" aria-hidden />
        </Button>
      }
    >
      <ul className="flex flex-col gap-1">
        {visibles.map((a) => (
          <li key={a.abonoId}>{a.mensaje}</li>
        ))}
      </ul>
    </Alerta>
  );
}
