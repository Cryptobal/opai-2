import { ChevronRight } from "lucide-react";

import { Alerta, Badge, SeccionTarjeta } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { fecha, hoyIso } from "@/lib/fechas";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { vocabularioActual } from "@/lib/vocabulario";

import { cargarLaboral, cargarPersona } from "../../_componentes/datos";
import { HojaExcepcion } from "../../_componentes/hoja-excepcion";
import { SelectorPuesto } from "../../_componentes/selector-puesto";
import { rotulosDe } from "../../_componentes/sueldo-comun";
import { TablaSueldo } from "../../_componentes/tabla-sueldo";

export const metadata = { title: "Cómo se arma su sueldo" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Sueldo en tres niveles (57): cada concepto, su valor por nivel y el que gana. */
export default function Sueldo({ params, searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Cómo se arma su sueldo"
      ruta="/personas"
      cargando="detalle"
      acciones={
        <EnlaceBoton href="?excepcion=1" variante="secondary">
          Editar excepción
        </EnlaceBoton>
      }
      cargar={async () => {
        const [{ id }, q, voc] = await Promise.all([
          params,
          leerParametros(searchParams),
          vocabularioActual(),
        ]);
        const d = await cargarPersona(id);
        const l = d.persona ? await cargarLaboral(d.persona, q["puesto"]) : null;
        return { ...d, l, q, voc };
      }}
      opciones={(d) => ({
        titulo: "Cómo se arma su sueldo",
        volver: {
          href: `/personas/${d.persona?.id ?? ""}/laboral`,
          etiqueta: d.persona?.nombreCompleto ?? "Persona",
        },
      })}
    >
      {({ persona: p, l, q }) => {
        if (!p || !l) return <Alerta tono="danger" titulo="No encontramos a esta persona" />;
        const puesto = l.puestos.find((x) => x.id === q["puesto"]);
        const s = l.sueldo;
        const excepcion = s?.niveles.persona;
        return (
          <div className="flex flex-col gap-4">
            <h2 className="t-title text-fg md:hidden">Cómo se arma su sueldo</h2>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex flex-wrap items-center gap-2 text-base text-fg-muted">
                Gana el nivel más específico:
                <Badge tono="accent" punto={false}>
                  Persona
                </Badge>
                <ChevronRight className="size-4" aria-hidden />
                <Badge tono="info" punto={false}>
                  Puesto
                </Badge>
                <ChevronRight className="size-4" aria-hidden />
                <Badge punto={false}>Cargo</Badge>
              </p>
              <span className="t-caption">Vigente al {fecha(s?.fecha ?? hoyIso())}</span>
            </div>
            <SelectorPuesto puestos={l.puestos} />
            {s ? (
              <TablaSueldo s={s} columnas={rotulosDe(p, puesto)} />
            ) : (
              <Alerta
                tono="neutral"
                titulo={
                  l.sueldoBloqueado ? "Sin permiso para ver sueldos" : "Sin estructura de sueldo"
                }
              />
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {excepcion ? (
                <SeccionTarjeta titulo="Excepción de la persona">
                  <p className="text-base text-fg">Vigente desde {fecha(excepcion.vigenteDesde)}</p>
                  {excepcion.motivo ? (
                    <p className="t-caption mt-1">Motivo: “{excepcion.motivo}”</p>
                  ) : null}
                </SeccionTarjeta>
              ) : null}
              {puesto ? (
                <SeccionTarjeta titulo={`${puesto.instalacion} · ${puesto.nombre}`}>
                  <EnlaceBoton
                    href={`/instalaciones/${puesto.instalacionId}/puestos?puesto=${puesto.id}`}
                    variante="ghost"
                  >
                    Abrir el puesto
                  </EnlaceBoton>
                </SeccionTarjeta>
              ) : null}
            </div>
            <p className="t-caption">
              La gratificación y los descuentos legales se calculan en la liquidación. Los montos de
              cargos sensibles solo los ve quien tiene permiso de sueldos sensibles.
            </p>
            <HojaExcepcion
              personaId={p.id}
              actual={excepcion ?? null}
              hoy={hoyIso()}
              nombre={p.nombreCompleto}
            />
          </div>
        );
      }}
    </PaginaPortal>
  );
}
