import { ParesGrid, SeccionTarjeta, Table, Td, Th, Tr } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { MapaOpai } from "@/app/_components/maestros/mapa";
import { fecha } from "@/lib/fechas";
import type { InstalacionDetalle } from "@/lib/tipos-maestros";

/** Resumen de una instalación (07): ubicación y vigencia con mapa, y puestos activos. */
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
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,280px)] md:items-start">
          <div className="md:order-2">{mapa}</div>
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
                  <Th className="text-right">Dotación</Th>
                </tr>
              </thead>
              <tbody>
                {activos.map((p) => (
                  <Tr key={p.id}>
                    <Td>{p.nombre}</Td>
                    <Td className="t-numeric">
                      {p.diasTrabajo}×{p.diasDescanso}
                    </Td>
                    <Td className="t-numeric">{p.horario}</Td>
                    <Td className="t-numeric text-right">{p.dotacion}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <p className="px-4 py-6 text-center text-base text-fg-muted">Sin puestos activos.</p>
        )}
      </SeccionTarjeta>
    </div>
  );
}
