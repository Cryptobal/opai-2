import type { ReactNode } from "react";

import { Badge, Estado, type EstadoPantalla, Table, Td, Th, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { fechaDe, pesos, revisaDe } from "./formato";
import { CorregirRendicion, TarjetaRendicion } from "./lista-tarjeta";
import {
  BASE,
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  type PortalRendicion,
  type ResumenRendicion,
  TONO_ESTADO,
} from "./tipos";

const Estadotag = ({ r }: { r: ResumenRendicion }) => (
  <Badge tono={TONO_ESTADO[r.estado]}>{ETIQUETA_ESTADO[r.estado]}</Badge>
);

/** «Mis rendiciones»: tarjetas en teléfono y tabla en md+; estados vacío, error y sin permiso del patrón. */
export function ListaRendiciones({
  state,
  items,
  portal,
  textos,
  pie,
}: {
  state: EstadoPantalla;
  items: readonly ResumenRendicion[];
  portal: PortalRendicion;
  textos: { titulo: string; descripcion: string; accion?: React.ReactNode };
  pie?: ReactNode;
}) {
  return (
    <Estado
      state={state === "ready" && items.length === 0 ? "empty" : state}
      variante="lista"
      textos={{
        vacio: {
          titulo: textos.titulo,
          descripcion: textos.descripcion,
          ...(textos.accion ? { accion: textos.accion } : {}),
        },
      }}
    >
      <ul className="flex flex-col gap-3 md:hidden">
        {items.map((r) => (
          <li key={r.id}>
            <TarjetaRendicion r={r} portal={portal} />
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Código</Th>
              <Th>Motivo</Th>
              <Th className="text-right">Total</Th>
              <Th>Estado</Th>
              <Th className="hidden xl:table-cell">Fecha</Th>
              <Th className="hidden xl:table-cell">Quién revisa</Th>
              <Th>
                <span className="sr-only">Acción</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <Tr key={r.id} className="relative">
                <Td>
                  <LinkNext
                    href={`${BASE[portal]}/${r.id}`}
                    className="font-medium text-fg after:absolute after:inset-0 hover:underline"
                  >
                    {r.codigoVisible}
                  </LinkNext>
                </Td>
                <Td>
                  <span className="block">{r.descripcion}</span>
                  <span className="text-sm text-fg-muted">{ETIQUETA_TIPO[r.tipo] ?? r.tipo}</span>
                  <span className="block text-sm text-fg-muted xl:hidden">
                    {fechaDe(r)} · {revisaDe(r)}
                  </span>
                  {r.estado === "devuelta" && r.motivoDecision ? (
                    <span className="mt-1 block text-sm text-warning-fg">
                      Devuelta: {r.motivoDecision}
                    </span>
                  ) : null}
                </Td>
                <Td className="text-right tabular-nums">{pesos(r.montoTotal)}</Td>
                <Td>
                  <Estadotag r={r} />
                </Td>
                <Td className="hidden xl:table-cell">{fechaDe(r)}</Td>
                <Td className="hidden xl:table-cell">{revisaDe(r).replace("Revisa: ", "")}</Td>
                <Td>
                  <span className="relative">
                    <CorregirRendicion r={r} portal={portal} />
                  </span>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
      {pie}
    </Estado>
  );
}