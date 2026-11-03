import { formatearNumero, formatearUsd } from "@opai/domain";
import { Bot } from "lucide-react";

import { Table, Td, Th, Tr } from "@opai/ds";

import { nombreModulo, nombreRecurso, type PorAgente, type Resumen } from "./datos";

const usd = (n: number) => formatearUsd(n);
const num = (n: number) => formatearNumero(n);
const der = "text-right t-numeric";

/** Por recurso y módulo (33): la IA de entrada y salida se suma por clase. */
export function PorRecursoModulo({ filas }: { filas: Resumen["porRecursoModulo"] }) {
  const m = new Map<
    string,
    { recurso: string; modulo: string; cantidad: number; costoUsd: number }
  >();
  for (const f of filas) {
    const recurso = nombreRecurso(f.recurso);
    const clave = `${recurso}|${f.modulo}`;
    const x = m.get(clave) ?? { recurso, modulo: nombreModulo(f.modulo), cantidad: 0, costoUsd: 0 };
    m.set(clave, { ...x, cantidad: x.cantidad + f.cantidad, costoUsd: x.costoUsd + f.costoUsd });
  }
  const lista = [...m.values()].sort((a, b) => b.costoUsd - a.costoUsd || b.cantidad - a.cantidad);
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h3 className="text-md font-semibold text-fg">Por recurso y módulo</h3>
      {lista.length ? (
        <Table>
          <thead>
            <tr>
              <Th>Recurso</Th>
              <Th>Módulo</Th>
              <Th className="text-right">Uso</Th>
              <Th className="text-right">Costo</Th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <Tr key={`${f.recurso}|${f.modulo}`}>
                <Td>{f.recurso}</Td>
                <Td>{f.modulo}</Td>
                <Td className={der}>{num(f.cantidad)}</Td>
                <Td className={der}>{f.costoUsd ? usd(f.costoUsd) : "incluido"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="rounded-lg border border-border bg-surface px-4 py-4 text-base text-fg-muted">
          Sin consumos este mes.
        </p>
      )}
    </section>
  );
}

/** Por agente (33): llamadas y costo de cada API key del mes. */
export function PorAgenteTabla({ filas }: { filas: PorAgente }) {
  const total = filas.reduce((t, f) => ({ e: t.e + f.ejecuciones, c: t.c + f.costoUsd }), {
    e: 0,
    c: 0,
  });
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h3 className="text-md font-semibold text-fg">Por agente</h3>
      {filas.length ? (
        <Table>
          <thead>
            <tr>
              <Th>Agente</Th>
              <Th className="text-right">Llamadas</Th>
              <Th className="text-right">Costo</Th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <Tr key={f.apiKeyId}>
                <Td>
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="flex size-6 items-center justify-center rounded-sm bg-accent-muted text-accent"
                    >
                      <Bot className="size-3.5" />
                    </span>
                    {f.nombre}
                  </span>
                </Td>
                <Td className={der}>{num(f.ejecuciones)}</Td>
                <Td className={der}>{usd(f.costoUsd)}</Td>
              </Tr>
            ))}
            <Tr>
              <Td className="font-semibold">Total</Td>
              <Td className={`${der} font-semibold`}>{num(total.e)}</Td>
              <Td className={`${der} font-semibold`}>{usd(total.c)}</Td>
            </Tr>
          </tbody>
        </Table>
      ) : (
        <p className="rounded-lg border border-border bg-surface px-4 py-4 text-base text-fg-muted">
          Ningún agente usó OPAI este mes.
        </p>
      )}
    </section>
  );
}

export { usd, num };
