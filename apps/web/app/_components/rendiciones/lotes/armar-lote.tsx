"use client";

import { Badge, Checkbox, Table, Td, Th, Tr } from "@opai/ds";

import { pesos } from "../formato";
import { crearLotePago, PieArmarLote, totalesSeleccion, useSeleccionArmarLote } from "./armar-lote-comun";
import { type Candidata } from "./tipos";

/** Aprobadas listas para pagar. El total que se ve es una ayuda: el servidor lo suma al crear el lote. */
export function ArmarLote({ candidatas }: { candidatas: readonly Candidata[] }) {
  const { router, sel, ocupado, setOcupado, error, setError, alternar } = useSeleccionArmarLote();
  const { elegidas, total } = totalesSeleccion(candidatas, sel);
  const cuenta = (c: Candidata) =>
    c.conCuenta ? <span className="font-mono text-sm">{c.bancoCodigo} · {c.tipoCuenta ?? "cuenta"}</span> : <Badge tono="warning">Sin datos bancarios en la ficha</Badge>;
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2 md:hidden">
        {candidatas.map((c) => (
          <li key={c.id} className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
            <Checkbox marcado={sel.has(c.id)} onCambiar={(v) => alternar(c.id, v)} disabled={!c.conCuenta} etiqueta={`${c.codigoVisible} · ${c.solicitanteNombre ?? "Persona"} · ${pesos(c.montoTotal)}`} />
            <div className="pl-11">{cuenta(c)}</div>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table>
          <thead><tr><Th><span className="sr-only">Incluir</span></Th><Th>Código</Th><Th>Persona</Th><Th>Cuenta de destino (de la ficha)</Th><Th className="text-right">Total</Th></tr></thead>
          <tbody>
            {candidatas.map((c) => (
              <Tr key={c.id}>
                <Td><Checkbox soloControl marcado={sel.has(c.id)} onCambiar={(v) => alternar(c.id, v)} disabled={!c.conCuenta} etiqueta={`Incluir ${c.codigoVisible}`} /></Td>
                <Td>{c.codigoVisible}</Td><Td>{c.solicitanteNombre ?? "Persona"}</Td><Td>{cuenta(c)}</Td>
                <Td className="text-right tabular-nums">{pesos(c.montoTotal)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
      <PieArmarLote
        cantidad={elegidas.length}
        total={total}
        ocupado={ocupado}
        error={error}
        etiquetaBoton="Crear lote"
        onCrear={() =>
          void crearLotePago(elegidas.map((c) => c.id), "Lote creado en borrador", router, setOcupado, setError)
        }
      />
    </div>
  );
}