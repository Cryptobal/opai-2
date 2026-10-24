import { Lock } from "lucide-react";

import { Alerta } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { hoyIso } from "@/lib/fechas";
import type { SearchParams } from "@/lib/parametros";

import { CascadaSueldo } from "../../_componentes/cascada-sueldo";
import { cargarCargos, cargarLaboral } from "../../_componentes/datos";
import { HojaExcepcion } from "../../_componentes/diferidas";
import { HojaVinculo } from "../../_componentes/diferidas";
import { HistorialVinculos, VinculoVigente } from "../../_componentes/laboral";
import { PaginaPersona } from "../../_componentes/pagina-persona";
import { SelectorPuesto } from "../../_componentes/selector-puesto";
import { rotulosDe } from "../../_componentes/sueldo-comun";

export const metadata = { title: "Laboral" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Persona · Laboral (13): vínculo vigente, historial y estructura de sueldo en tres niveles. */
export default function Laboral(props: Props) {
  return (
    <PaginaPersona
      {...props}
      tab="laboral"
      acciones={
        <EnlaceBotonHoja href="?excepcion=1">Definir excepción para esta persona</EnlaceBotonHoja>
      }
    >
      {async (p, q) => {
        const [l, cargos] = await Promise.all([cargarLaboral(p, q["puesto"]), cargarCargos(true)]);
        const puesto = l.puestos.find((x) => x.id === q["puesto"]);
        const hoy = hoyIso();
        return (
          <div className="grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] md:items-start">
            <div className="flex flex-col gap-4">
              <VinculoVigente p={p} />
              {p.vinculoVigente ? null : (
                <EnlaceBotonHoja href="?vinculo=1" variante="secondary" className="self-start">
                  Nuevo vínculo
                </EnlaceBotonHoja>
              )}
              <HistorialVinculos vinculos={l.vinculos} cargos={cargos} />
            </div>
            <div className="flex flex-col gap-3">
              <SelectorPuesto puestos={l.puestos} />
              {l.sueldo ? (
                <CascadaSueldo
                  s={l.sueldo}
                  rotulos={rotulosDe(p, puesto)}
                  enlace={`/personas/${p.id}/sueldo${puesto ? `?puesto=${puesto.id}` : ""}`}
                />
              ) : (
                <Alerta
                  tono="neutral"
                  {...(l.sueldoBloqueado ? { icono: Lock } : {})}
                  titulo={
                    l.sueldoBloqueado ? "Sin permiso para ver sueldos" : "Sin estructura de sueldo"
                  }
                >
                  {l.sueldoBloqueado
                    ? "Tu rol no permite ver las estructuras de sueldo."
                    : "Define la estructura del cargo en Cargos y sueldos."}
                </Alerta>
              )}
            </div>
            <HojaExcepcion
              personaId={p.id}
              actual={l.sueldo?.niveles.persona ?? null}
              hoy={hoy}
              nombre={p.nombreCompleto}
            />
            {p.vinculoVigente ? null : (
              <HojaVinculo
                personaId={p.id}
                hoy={hoy}
                cargos={cargos
                  .filter((c) => c.activo)
                  .map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
              />
            )}
          </div>
        );
      }}
    </PaginaPersona>
  );
}
