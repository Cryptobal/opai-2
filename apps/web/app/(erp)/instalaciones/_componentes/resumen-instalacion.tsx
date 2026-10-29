import { Badge, ParesGrid, SeccionTarjeta, Table, Td, Th, Tr } from "@opai/ds";

import { COBERTURA_PUESTO, estadoDe } from "@/app/_components/maestros/estados";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { MapaOpai } from "@/app/_components/maestros/mapa";
import { fecha } from "@/lib/fechas";
import type { InstalacionDetalle } from "@/lib/tipos-maestros";

import { SupervisoresInstalacion } from "./supervisores-instalacion";

/** Resumen de una instalación (07): ubicación y vigencia con mapa, puestos activos y supervisores. */
export function ResumenInstalacion({ i }: { i: InstalacionDetalle }) {
  const activos = i.puestos.filter((p) => p.estado === "activo");
  const mapa = (
    <MapaOpai lat={i.lat} lng={i.lng} geocercaM={i.geocercaM} pie={`Geocerca ${i.geocercaM} m`} />
  );
  return (
    <div className="flex flex-col gap-4">
      <SeccionTarjeta
        titulo="Ubicación y vigencia"
        accion={
          <EnlaceBotonHoja href="?editar=1" variante="ghost">
            Editar
          </EnlaceBotonHoja>
        }
      >
        {/* Lado a lado según el ancho del panel (consulta de contenedor), no el de la ventana: con la barra
            lateral de 1024 px el panel mide ~390 px y el texto se partía por letras (CAR-65). Con poco
            panel, y en celular apaisado (hasta 500 px de alto, CAR-6), el mapa queda sobre el texto. */}
        <div className="@container">
          <div className="grid gap-4 [@media(min-height:501px)]:@[34rem]:grid-cols-[minmax(0,1fr)_minmax(0,280px)] [@media(min-height:501px)]:@[34rem]:items-start">
            <div className="[@media(min-height:501px)]:@[34rem]:order-2">{mapa}</div>
            <ParesGrid
              unaColumna
              items={[
                {
                  etiqueta: "Dirección",
                  valor:
                    i.direccionFormateada ??
                    ([i.calle, i.comuna].filter(Boolean).join(", ") || "Sin dirección"),
                },
                { etiqueta: "Región", valor: i.region },
                { etiqueta: "Geocerca", valor: `${i.geocercaM} m` },
                {
                  etiqueta: "Vigencia",
                  valor: i.vigenteDesde
                    ? `${fecha(i.vigenteDesde)} – ${i.vigenteHasta ? fecha(i.vigenteHasta) : "sin término"}`
                    : null,
                },
                ...(i.notas ? [{ etiqueta: "Notas", valor: i.notas }] : []),
              ]}
            />
          </div>
        </div>
      </SeccionTarjeta>
      <SeccionTarjeta
        titulo="Puestos activos"
        sinRelleno
        accion={
          <EnlaceBoton href={`/instalaciones/${i.id}/puestos`} variante="ghost">
            {activos.length ? `Ver los ${activos.length}` : "Agregar"}
          </EnlaceBoton>
        }
      >
        {activos.length ? (
          <div className="[&>div]:rounded-none [&>div]:border-0">
            <Table>
              <thead>
                <tr>
                  <Th>Puesto</Th>
                  <Th>Patrón</Th>
                  <Th>Horario</Th>
                  <Th className="text-right">Cobertura</Th>
                </tr>
              </thead>
              <tbody>
                {activos.map((p) => {
                  const c = estadoDe(COBERTURA_PUESTO, p.cobertura);
                  return (
                    <Tr key={p.id}>
                      <Td>{p.nombre}</Td>
                      <Td>{p.patron ?? "—"}</Td>
                      <Td className="t-numeric">
                        {p.horarioNoche ? `${p.horario} / ${p.horarioNoche}` : p.horario}
                      </Td>
                      <Td className="text-right">
                        <Badge tono={c.tono}>{c.corta}</Badge>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        ) : (
          <p className="px-4 py-6 text-center text-base text-fg-muted">Sin puestos activos.</p>
        )}
      </SeccionTarjeta>
      <SupervisoresInstalacion instalacionId={i.id} />
    </div>
  );
}
