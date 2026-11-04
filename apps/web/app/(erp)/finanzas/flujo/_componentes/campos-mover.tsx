import { Campo, Checkbox, Input, Select } from "@opai/ds";

import { clp } from "./datos";

type Movimiento = { desde: string; hasta: string; monto: number };

/** Campos de la hoja «Reprogramar»: fila, semana, cuántas semanas mover y la vista previa. */
export function CamposMover(p: {
  filas: { id: string; etiqueta: string }[];
  semanas: string[];
  filaId: string;
  semana: string;
  por: string;
  vista: { movimientos: Movimiento[] } | null;
  requierePasada: boolean;
  confirmarPasada: boolean;
  on: { fila: (v: string) => void; semana: (v: string) => void; por: (v: string) => void; confirmar: (v: boolean) => void };
}) {
  return (
    <>
      <Campo etiqueta="Fila" htmlFor="mv-fila">
        <Select
          id="mv-fila"
          valor={p.filaId}
          onCambiar={p.on.fila}
          opciones={p.filas.map((f) => ({ valor: f.id, etiqueta: f.etiqueta }))}
        />
      </Campo>
      <Campo etiqueta="Semana origen" htmlFor="mv-sem">
        <Select id="mv-sem" valor={p.semana} onCambiar={p.on.semana} opciones={p.semanas.map((s) => ({ valor: s, etiqueta: s }))} />
      </Campo>
      <Campo etiqueta="Semanas a mover" htmlFor="mv-por">
        <Input id="mv-por" value={p.por} onChange={(e) => p.on.por(e.target.value)} inputMode="numeric" />
      </Campo>
      {p.requierePasada ? (
        <Checkbox marcado={p.confirmarPasada} onCambiar={p.on.confirmar} etiqueta="Confirmo mover a una semana pasada" />
      ) : null}
      {p.vista?.movimientos.length ? (
        <ul className="text-sm text-fg-muted">
          {p.vista.movimientos.map((m) => (
            <li key={`${m.desde}-${m.hasta}`}>
              {m.desde} → {m.hasta}: {clp(m.monto)}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
