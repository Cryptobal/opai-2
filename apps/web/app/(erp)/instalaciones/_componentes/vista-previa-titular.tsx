import { Alerta } from "@opai/ds";

import { diaCorto, fechaCl, type PrevisualizacionTitular } from "./titular-tipos";

type Dias = { fecha: string; trabaja: boolean }[];

/** Los primeros 14 días de la serie nueva: verde = turno, gris = libre. */
export function DiasPrevia({ dias }: { dias: Dias }) {
  return (
    <ul className="grid grid-cols-7 gap-1" aria-label="Primeros 14 días de la serie nueva">
      {dias.map((d) => (
        <li
          key={d.fecha}
          aria-label={`${diaCorto(d.fecha)} ${d.fecha.slice(8)}: ${d.trabaja ? "turno" : "libre"}`}
          className={`flex flex-col items-center rounded-md border py-1 t-caption ${d.trabaja ? "border-success bg-success-muted text-success-fg" : "border-border bg-surface-muted text-fg-subtle"}`}
        >
          <span>{diaCorto(d.fecha)}</span>
          <span className="t-label">{d.fecha.slice(8)}</span>
        </li>
      ))}
    </ul>
  );
}

type Props = { datos: PrevisualizacionTitular; quitar: boolean };

/** Vista previa (dry run) de asignar o quitar un titular: serie que se cierra y primeros días. */
export function VistaPreviaTitular({ datos, quitar }: Props) {
  const { titularAnterior, serieAnteriorHasta, primerosDias, serie } = datos;
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <p className="t-label">Vista previa</p>
      <p className="t-body-sm text-fg-muted">
        {titularAnterior
          ? `Sale ${titularAnterior.nombre}: su serie se cierra el ${fechaCl(serieAnteriorHasta ?? serie.desde)}.`
          : "El puesto no tenía titular: no se cierra ninguna serie."}
      </p>
      {quitar ? (
        <Alerta tono="warning" titulo="El puesto quedará por cubrir">
          Desde {fechaCl(serie.desde)} los turnos del puesto quedan sin titular. Los días anteriores no cambian.
        </Alerta>
      ) : (
        <>
          <DiasPrevia dias={primerosDias} />
          <p className="t-caption text-fg-muted">
            Patrón {serie.patron}, desde {fechaCl(serie.desde)}. Verde: turno · gris: libre.
          </p>
        </>
      )}
    </div>
  );
}
