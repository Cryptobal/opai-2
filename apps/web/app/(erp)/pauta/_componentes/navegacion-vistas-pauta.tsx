"use client";

import { Button } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

export function NavegacionVistasPauta(p: {
  diaria: boolean;
  anio: number;
  mes: number;
  onMensual: () => void;
  onDiaria: () => void;
  claveMes: string;
}) {
  return (
    <nav aria-label="Vistas de pauta" className="flex w-full gap-2">
      <Button variant={p.diaria ? "secondary" : "primary"} aria-current={!p.diaria ? "page" : undefined} onClick={p.onMensual}>Mensual</Button>
      <Button variant={p.diaria ? "primary" : "secondary"} aria-current={p.diaria ? "page" : undefined} onClick={p.onDiaria}>Diaria</Button>
      <EnlaceBoton variante="secondary" href={`/pauta/instalaciones?mes=${p.claveMes}`}>Por instalación</EnlaceBoton>
      <EnlaceBoton variante="secondary" href="/pauta/turnos-extra">Turnos extra</EnlaceBoton>
    </nav>
  );
}