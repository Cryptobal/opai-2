import { LinkNext } from "@/app/_components/link-next";

import { type TurnoEstado } from "./datos";

type Props = { turno: TurnoEstado; nombres: Map<string, string> };

/** Quién está a cargo de la central (cabecera de la cola, spec §3). */
export function ResponsableTurno({ turno, nombres }: Props) {
  const id = turno.responsable?.usuarioId;
  const nombre = id ? (nombres.get(id) ?? "Persona del turno") : null;
  const pausa =
    turno.pausadaEmpresa ? "Agente en pausa en toda la empresa" : turno.instalacionesPausadas > 0 ? `Agente en pausa en ${turno.instalacionesPausadas} instalaciones` : null;
  return (
    <span className="flex flex-wrap items-center gap-2 text-base text-fg-muted">
      {nombre ? (
        <span>
          A cargo: <span className="text-fg">{nombre}</span>
          {turno.responsable?.tipo === "respaldo" ? " (respaldo)" : null}
        </span>
      ) : (
        <span className="text-warning">Sin persona a cargo: el agente solo mira</span>
      )}
      {pausa ? <span>· {pausa}</span> : null}
      <LinkNext href="/central/turno" className="underline-offset-2 hover:underline">
        Turno
      </LinkNext>
    </span>
  );
}