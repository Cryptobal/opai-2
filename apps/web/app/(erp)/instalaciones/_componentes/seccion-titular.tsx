"use client";

import { Alerta, Button, Timeline, type ItemTimeline } from "@opai/ds";

import { useParametros } from "@/app/_components/maestros/use-url";

import { cuandoCl, fechaCl, type TitularesPuesto } from "./titular-tipos";

function item(i: TitularesPuesto["items"][number]): ItemTimeline {
  return {
    id: i.serieId,
    actor: { nombre: i.fijadaPor ?? "Sistema", agente: false },
    accion: i.titular ? `asignó a ${i.titular}` : "dejó el puesto sin titular",
    cuando: i.fijadaEn ? cuandoCl(i.fijadaEn) : "Antes del registro",
    meta: `Desde ${fechaCl(i.desde)}${i.hasta ? ` hasta ${fechaCl(i.hasta)}` : " · vigente"}`,
  };
}

type Props = {
  puestoId: string;
  activo: boolean;
  titulares: TitularesPuesto;
  puedeAsignar: boolean;
};

/** Titular del puesto, sus acciones (asignar, cambiar, quitar) y el historial de titulares (CAR-206). */
export function SeccionTitular({ puestoId, activo, titulares, puedeAsignar }: Props) {
  const { fijar } = useParametros();
  const actual = titulares.items.find((i) => i.titularId && i.titularId === titulares.titularActualId);
  const sinPatron = !titulares.patronId;
  const abrir = (quitar: boolean) => fijar({ puesto: null, titular: puestoId, quitar: quitar ? "1" : null });
  return (
    <section aria-labelledby="titular-titulo" className="flex flex-col gap-3 border-b border-border pb-4">
      <div className="flex flex-col gap-1">
        <h3 id="titular-titulo" className="t-title">
          Titular
        </h3>
        <p className="t-body">{actual?.titular ?? "Sin titular · puesto por cubrir"}</p>
        {actual ? <p className="t-caption text-fg-muted">Desde {fechaCl(actual.desde)}</p> : null}
      </div>
      {puedeAsignar && activo && sinPatron ? (
        <Alerta tono="info" titulo="Elige el patrón de turno primero">
          Para asignar un titular el puesto necesita su patrón: elígelo abajo y guarda.
        </Alerta>
      ) : null}
      {puedeAsignar && activo ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={sinPatron} onClick={() => abrir(false)}>
            {actual ? "Cambiar titular" : "Asignar titular"}
          </Button>
          {actual ? (
            <Button variant="secondary" onClick={() => abrir(true)}>
              Quitar titular
            </Button>
          ) : null}
        </div>
      ) : null}
      {titulares.items.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h4 className="t-label">Historial de titulares</h4>
          <Timeline items={titulares.items.map(item)} />
        </div>
      ) : null}
    </section>
  );
}
