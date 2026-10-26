import { Navigation, Phone } from "lucide-react";

import { Alerta, SeccionTarjeta } from "@opai/ds";

import { BadgePuesto } from "@/app/_components/maestros/badge-puesto";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { MapaOpai } from "@/app/_components/maestros/mapa";
import { PaginaPortal } from "@/app/_components/pagina-portal";

import { AccionTile, marcable } from "../../_componentes/accion-tile";
import { instalacionTerreno } from "../../_componentes/datos";

export const metadata = { title: "Instalación" };

/** Instalación en terreno (56): mapa con geocerca, cómo llegar, llamar al cliente y puestos. */
export default function InstalacionTerreno({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaPortal
      portal="supervisor"
      titulo="Instalación"
      ruta="/supervisor/instalaciones"
      cargando="detalle"
      volver={{ href: "/supervisor/instalaciones", etiqueta: "Instalaciones" }}
      cargar={async () => instalacionTerreno((await params).id)}
      opciones={(d) => ({ titulo: d.i?.nombre ?? "Instalación" })}
    >
      {({ i, contacto }) => {
        if (!i) return <Alerta tono="danger" titulo="No encontramos esta instalación" />;
        const destino =
          i.lat !== null && i.lng !== null
            ? `${i.lat},${i.lng}`
            : encodeURIComponent([i.calle, i.comuna].filter(Boolean).join(", "));
        const activos = i.puestos.filter((p) => p.estado === "activo");
        return (
          <div className="flex flex-col gap-4">
            <MapaOpai
              lat={i.lat}
              lng={i.lng}
              geocercaM={i.geocercaM}
              pie={`Geocerca ${i.geocercaM} m`}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="t-title text-fg">{i.nombre}</h2>
                <p className="text-base text-fg-muted">
                  {[i.cuenta, i.direccionFormateada ?? i.calle].filter(Boolean).join(" · ")}
                </p>
              </div>
              <EnlaceBoton
                href={`https://www.google.com/maps/dir/?api=1&destination=${destino}`}
                variante="secondary"
                icono={Navigation}
              >
                Ir
              </EnlaceBoton>
            </div>
            {contacto?.telefono ? (
              <div className="grid grid-cols-2 gap-2">
                <AccionTile
                  href={`tel:${marcable(contacto.telefono)}`}
                  icono={Phone}
                  etiqueta={`Llamar a ${contacto.nombres}`}
                />
              </div>
            ) : null}
            <SeccionTarjeta titulo="Puestos" sinRelleno>
              {activos.length ? (
                <ul>
                  {activos.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="text-base font-medium text-fg">{p.nombre}</span>
                        <span className="t-caption">
                          {[p.patron ?? "Sin patrón", p.horario, p.horarioNoche]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <BadgePuesto estado={p.estado} cobertura={p.cobertura} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-4 text-base text-fg-muted">Sin puestos activos.</p>
              )}
            </SeccionTarjeta>
            <p className="t-caption">
              Quién está en su puesto ahora, rondas y novedades llegan con Operaciones.
            </p>
          </div>
        );
      }}
    </PaginaPortal>
  );
}
