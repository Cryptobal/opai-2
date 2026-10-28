import { Badge, ParesGrid, SeccionTarjeta, Table, Td, Th, Tr } from "@opai/ds";

import { fechaCorta, fechaHora } from "@/lib/formato";

import { AccionesIncidente } from "./acciones-incidente";
import { DESTINATARIO, ESTADO_INCIDENTE, etiquetaDe, type Incidente } from "./tipos";

/** Ficha de un incidente: qué pasó, alcance, avisos de brecha con su plazo y acciones (§16.5). */
export function DetalleIncidente({ i, gestionar }: { i: Incidente; gestionar: boolean }) {
  const e = etiquetaDe(ESTADO_INCIDENTE, i.estado);
  const avisados = new Set(i.avisos.map((a) => a.destinatario ?? ""));
  return (
    <SeccionTarjeta titulo={i.descripcion ?? "Incidente"}>
      <div className="flex flex-col gap-4">
        <ParesGrid
          items={[
            { etiqueta: "Estado", valor: <Badge tono={e.tono}>{e.etiqueta}</Badge> },
            { etiqueta: "Detectado", valor: i.ocurridoEn ? fechaHora(i.ocurridoEn) : null },
            { etiqueta: "Registrado", valor: fechaHora(i.registradoEn) },
            { etiqueta: "Datos afectados", valor: i.datosAfectados },
            ...(i.alcance ? [{ etiqueta: "Alcance", valor: i.alcance, ancho: true }] : []),
          ]}
        />
        <Table>
          <thead>
            <tr>
              <Th>Aviso a</Th>
              <Th>Canal</Th>
              <Th>Plazo</Th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(DESTINATARIO).map(([clave, nombre]) => {
              const a = i.avisos.find((x) => x.destinatario === clave);
              return (
                <Tr key={clave}>
                  <Td>{nombre}</Td>
                  <Td>{a ? (a.canal ?? "Registrado") : <Badge tono="warning">Pendiente</Badge>}</Td>
                  <Td className="t-numeric">{a?.plazoEn ? fechaCorta(a.plazoEn) : "—"}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
        <AccionesIncidente
          casoId={i.casoId}
          estado={i.estado}
          pendientes={Object.keys(DESTINATARIO).filter((d) => !avisados.has(d))}
          gestionar={gestionar}
        />
      </div>
    </SeccionTarjeta>
  );
}
