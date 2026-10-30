import { Badge, Empty, Enlace, Table, Td, Th, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { type DiaVista, ETIQUETA_FUENTE, fechaCl } from "./tipos";

/** Calendario del año resuelto: fecha, nombre, origen (nacional/regional/empresa) e irrenunciable. */
export function TablaDias({ dias, puede }: { dias: DiaVista[]; puede: boolean }) {
  if (!dias.length)
    return (
      <Empty titulo="Sin feriados este año" descripcion="Agrega un día con “Agregar día”." />
    );
  return (
    <Table>
      <thead>
        <tr>
          <Th>Fecha</Th>
          <Th>Nombre</Th>
          <Th>Origen</Th>
          <Th>Irrenunciable</Th>
        </tr>
      </thead>
      <tbody>
        {dias.map((d) => (
          <Tr key={d.id || d.fecha}>
            <Td className="t-numeric whitespace-nowrap">{fechaCl(d.fecha)}</Td>
            <Td className="font-medium">
              {puede && d.editable ? (
                <Enlace Link={LinkNext} variante="fila" href={`?editar=${d.id}`}>
                  {d.nombre}
                </Enlace>
              ) : (
                d.nombre
              )}
            </Td>
            <Td>
              <Badge punto={false}>{ETIQUETA_FUENTE[d.fuente]}</Badge>
            </Td>
            <Td className="text-fg-muted">{d.irrenunciable ? "Sí" : "—"}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
