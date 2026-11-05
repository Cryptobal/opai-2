import { Badge, Card, Estado, type EstadoPantalla, Table, Td, Th, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { fechaDe, lineaEstado, pesos, revisaDe } from "./formato";
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

/** Motivo que escribió quien revisó: texto de otra persona, se muestra como dato. */
function Motivo({ r }: { r: ResumenRendicion }) {
  if (!r.motivoDecision || (r.estado !== "devuelta" && r.estado !== "rechazada")) return null;
  const devuelta = r.estado === "devuelta";
  return (
    <p className="rounded-md bg-warning-muted px-3 py-2 text-base text-warning-fg" role="note">
      <span className="font-semibold">
        {devuelta ? "Devuelta" : "Rechazada"}
        {r.aprobadorNombre ? ` por ${r.aprobadorNombre}` : ""}:
      </span>{" "}
      «{r.motivoDecision}»{devuelta ? " Corrígela y reenvíala." : ""}
    </p>
  );
}

const Corregir = ({
  r,
  portal,
  className,
}: {
  r: ResumenRendicion;
  portal: PortalRendicion;
  className?: string;
}) =>
  r.estado === "devuelta" ? (
    <EnlaceBoton
      href={`${BASE[portal]}/${r.id}/corregir`}
      variante="primary"
      {...(className ? { className } : {})}
    >
      Corregir y reenviar
    </EnlaceBoton>
  ) : null;

/** Tarjeta (teléfono): el cuerpo es un enlace a la ficha; el botón de corregir va aparte, sin anidar enlaces. */
function Tarjeta({ r, portal }: { r: ResumenRendicion; portal: PortalRendicion }) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <LinkNext href={`${BASE[portal]}/${r.id}`} className="flex flex-col gap-2">
        <span className="flex items-center justify-between gap-2">
          <span className="t-label text-fg">{r.codigoVisible}</span>
          <Estadotag r={r} />
        </span>
        <span className="text-md font-medium text-fg">{r.descripcion}</span>
        <span className="t-title text-fg">{pesos(r.montoTotal)}</span>
        <span className="text-base text-fg-muted">{lineaEstado(r)}</span>
      </LinkNext>
      <Motivo r={r} />
      <Corregir r={r} portal={portal} className="w-full" />
    </Card>
  );
}

/** «Mis rendiciones»: tarjetas en teléfono y tabla en md+; estados vacío, error y sin permiso del patrón. */
export function ListaRendiciones({
  state,
  items,
  portal,
  textos,
}: {
  state: EstadoPantalla;
  items: readonly ResumenRendicion[];
  portal: PortalRendicion;
  textos: { titulo: string; descripcion: string; accion?: React.ReactNode };
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
            <Tarjeta r={r} portal={portal} />
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
                    <Corregir r={r} portal={portal} />
                  </span>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Estado>
  );
}
