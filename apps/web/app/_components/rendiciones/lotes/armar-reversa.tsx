"use client";

import { Checkbox, Table, Td, Th, Tr } from "@opai/ds";

import { pesos } from "../formato";
import { crearLoteDesdeSeleccion, PieArmarLote, totalesSeleccion, useSeleccionArmarLote } from "./armar-lote-comun";
import { type CandidataReversa } from "./tipos";

/** Rendiciones pagadas que pueden revertirse a Aprobada mediante un lote de reversa. */
export function ArmarReversa({ candidatas }: { candidatas: readonly CandidataReversa[] }) {
  const { router, sel, ocupado, setOcupado, error, setError, alternar } = useSeleccionArmarLote();
  const { elegidas, total } = totalesSeleccion(candidatas, sel);
  return (
    <div className="flex flex-col gap-3">
      <Table className="hidden md:table">
        <thead><tr><Th><span className="sr-only">Incluir</span></Th><Th>Código</Th><Th>Persona</Th><Th className="text-right">Total</Th></tr></thead>
        <tbody>
          {candidatas.map((c) => (
            <Tr key={c.id}>
              <Td><Checkbox soloControl marcado={sel.has(c.id)} onCambiar={(v) => alternar(c.id, v)} etiqueta={`Incluir ${c.codigoVisible}`} /></Td>
              <Td>{c.codigoVisible}</Td><Td>{c.solicitanteNombre ?? "Persona"}</Td>
              <Td className="text-right tabular-nums">{pesos(c.montoTotal)}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <ul className="flex flex-col gap-2 md:hidden">
        {candidatas.map((c) => (
          <li key={c.id} className="rounded-lg border border-border bg-surface p-3">
            <Checkbox marcado={sel.has(c.id)} onCambiar={(v) => alternar(c.id, v)} etiqueta={`${c.codigoVisible} · ${c.solicitanteNombre ?? "Persona"} · ${pesos(c.montoTotal)}`} />
          </li>
        ))}
      </ul>
      <PieArmarLote
        cantidad={elegidas.length}
        total={total}
        ocupado={ocupado}
        error={error}
        etiquetaBoton="Crear lote de reversa"
        varianteBoton="secondary"
        onCrear={() =>
          void crearLoteDesdeSeleccion(
            "rendiciones.lotes.crear_reversa",
            elegidas.map((c) => c.id),
            "Lote de reversa creado en borrador",
            router,
            setOcupado,
            setError,
          )
        }
      />
    </div>
  );
}