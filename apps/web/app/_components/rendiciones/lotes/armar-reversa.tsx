"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button, Checkbox, Table, Td, Th, Tr } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";

import { pesos } from "../formato";
import { type CandidataReversa, RUTA_LOTES } from "./tipos";

/** Rendiciones pagadas que pueden revertirse a Aprobada mediante un lote de reversa. */
export function ArmarReversa({ candidatas }: { candidatas: readonly CandidataReversa[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<ReadonlySet<string>>(new Set());
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const elegidas = candidatas.filter((c) => sel.has(c.id));
  const total = elegidas.reduce((s, c) => s + c.montoTotal, 0);
  const alternar = (id: string, v: boolean) => setSel((p) => { const n = new Set(p); if (v) n.add(id); else n.delete(id); return n; });
  async function crear() {
    setOcupado(true);
    setError(null);
    const r = await ejecutarCapacidad("erp", "rendiciones.lotes.crear_reversa", { rendicionIds: elegidas.map((c) => c.id) });
    setOcupado(false);
    if (!r.ok) return setError(r.error.message);
    avisar.exito("Lote de reversa creado en borrador");
    router.push(`${RUTA_LOTES}/${(r.data as { id: string }).id}`);
  }
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
      {error ? <p role="alert" className="text-base font-medium text-danger-fg">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-base text-fg-muted">{elegidas.length} rendiciones seleccionadas</span>
        <span className="flex items-center gap-3">
          <b className="tabular-nums">{pesos(total)}</b>
          <Button variant="secondary" disabled={elegidas.length === 0 || ocupado} onClick={() => void crear()}>{ocupado ? "Creando…" : "Crear lote de reversa"}</Button>
        </span>
      </div>
    </div>
  );
}