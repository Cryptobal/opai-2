import { Badge, Table, Td, Th, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { lineaEstado, pesos } from "./formato";
import type { OpcionesRendicion, ResumenRendicion } from "./tipos";
import { centroDe, ETIQUETA_ESTADO, ETIQUETA_TIPO, TONO_ESTADO } from "./tipos";

type Fila = ResumenRendicion & { solicitanteNombre?: string | null };

export function ListaTodasRendiciones({ items, opciones }: { items: Fila[]; opciones: OpcionesRendicion }) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Código</Th>
              <Th>Quién rinde</Th>
              <Th>Motivo</Th>
              <Th className="text-right">Total</Th>
              <Th>Estado</Th>
              <Th>Centro</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <Tr key={r.id}>
                <Td>
                  <LinkNext href={`/rendiciones/${r.id}`} className="font-medium text-fg hover:underline">
                    {r.codigoVisible}
                  </LinkNext>
                </Td>
                <Td>{r.solicitanteNombre ?? "Persona"}</Td>
                <Td>
                  <span className="block">{r.descripcion}</span>
                  <span className="text-sm text-fg-muted">{ETIQUETA_TIPO[r.tipo] ?? r.tipo}</span>
                </Td>
                <Td className="text-right tabular-nums">{pesos(r.montoTotal)}</Td>
                <Td>
                  <Badge tono={TONO_ESTADO[r.estado]}>{ETIQUETA_ESTADO[r.estado]}</Badge>
                </Td>
                <Td className="text-sm text-fg-muted">{centroDe(r, opciones)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
      <ul className="flex flex-col gap-3 p-4 md:hidden">
        {items.map((r) => (
          <li key={r.id}>
            <LinkNext href={`/rendiciones/${r.id}`} className="flex flex-col gap-1 rounded-md border border-border p-3">
              <span className="font-medium text-fg">{r.codigoVisible}</span>
              <span className="text-fg-muted">{r.solicitanteNombre ?? "Persona"}</span>
              <span>{r.descripcion}</span>
              <span className="text-fg-muted">{lineaEstado(r)} · {centroDe(r, opciones)}</span>
              <span className="font-medium tabular-nums">{pesos(r.montoTotal)}</span>
            </LinkNext>
          </li>
        ))}
      </ul>
    </>
  );
}