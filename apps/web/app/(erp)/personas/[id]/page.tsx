import { Suspense } from "react";

import { Skeleton } from "@opai/ds";

import { hoyIso } from "@/lib/fechas";
import type { SearchParams } from "@/lib/parametros";

import { HojaVincularUsuario } from "../_componentes/diferidas";
import { MarcaNoRecontratar } from "../_componentes/marca-no-recontratar";
import { PaginaPersona } from "../_componentes/pagina-persona";
import { ResumenPersona } from "../_componentes/resumen-persona";
import { TarjetasResumen } from "../_componentes/tarjetas-resumen";

/** Esqueleto con la forma de las tarjetas de estado (CAR-124, estado «cargando» del Resumen). */
const Esqueleto = () => (
  <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Cargando tarjetas">
    {[0, 1, 2, 3].map((i) => (
      <Skeleton key={i} className="h-44 rounded-lg" />
    ))}
  </div>
);

export const metadata = { title: "Persona" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Persona · Resumen (11/12). */
export default function Persona(props: Props) {
  return (
    <PaginaPersona {...props} tab="resumen">
      {(p) => (
        <>
          <div className="flex flex-col gap-4">
            <Suspense fallback={<Esqueleto />}>
              <TarjetasResumen personaId={p.id} hoy={hoyIso()} />
            </Suspense>
            <ResumenPersona p={p} hoy={hoyIso()} />
          </div>
          <MarcaNoRecontratar personaId={p.id} nombre={p.nombreCompleto} />
          {p.usuarioId ? null : (
            <HojaVincularUsuario personaId={p.id} email={p.emailLaboral ?? p.emailPersonal} />
          )}
        </>
      )}
    </PaginaPersona>
  );
}
