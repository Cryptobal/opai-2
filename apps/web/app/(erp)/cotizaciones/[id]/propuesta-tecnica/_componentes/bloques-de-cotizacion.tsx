"use client";

import { Alerta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { EditorBloquesPropuesta } from "@/app/(erp)/configuracion/_cpq/editor-bloques-propuesta";
import {
  type BloqueArmador,
  type BloquePlantilla,
  etiquetaBloquePropuesta,
} from "@/lib/cpq-bloques-propuesta";

const LEYENDA = "Fijo: no se quita de este documento. Activo: sale en la propuesta.";

/** Bloques de esta cotización: el mismo editor de la plantilla, guardado en la propuesta. */
export function BloquesDeCotizacion(p: {
  propuestaId: string;
  bloques: BloqueArmador[];
  onGuardado: (bloques: BloqueArmador[]) => void;
}) {
  const { ejecutar, error } = useCapacidad("erp");
  async function guardar(lista: BloquePlantilla[]) {
    const bloques = conIds(p.bloques, lista);
    const r = await ejecutar(
      "cpq.propuestas_tecnica.update",
      { id: p.propuestaId, bloques },
      false,
      "ninguna",
      crypto.randomUUID(),
    );
    if (r) p.onGuardado(bloques);
  }
  return (
    <div className="space-y-2">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <EditorBloquesPropuesta
        bloques={p.bloques}
        leyenda={LEYENDA}
        onCambiar={(lista) => void guardar(lista)}
      />
    </div>
  );
}

/** Lista de bloques cuando la propuesta no se puede editar. */
export function ListaBloquesPropuesta({ bloques }: { bloques: BloqueArmador[] }) {
  const activos = bloques.filter((b) => b.activo);
  return (
    <ol className="grid gap-1 sm:grid-cols-2" aria-label="Bloques de la propuesta">
      {activos.map((b, i) => (
        <li key={b.id} className="t-body-sm truncate">
          <span className="text-fg-muted">{i + 1}.</span>{" "}
          {etiquetaBloquePropuesta(b.tipo, b.titulo)}
        </li>
      ))}
    </ol>
  );
}

function conIds(
  previos: readonly BloqueArmador[],
  lista: readonly BloquePlantilla[],
): BloqueArmador[] {
  return lista.map((b) => {
    const previo = previos.find((x) => x.tipo === b.tipo);
    return previo
      ? { ...previo, activo: b.activo, fijo: b.fijo, opcional: b.opcional }
      : { ...b, id: crypto.randomUUID() };
  });
}
