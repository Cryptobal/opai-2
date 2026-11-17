import { Badge, Empty, Enlace, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { MOTIVO, fechaCl, nombreMes } from "@/app/(erp)/pauta/_componentes/etiquetas";
import type { Parametros } from "@/lib/parametros";

import { cargarDotacion, type DotacionPuesto } from "../datos-dotacion";

function lineasTramo(
  items: { etiqueta: string; desde: string; hasta: string; dias: number }[],
): string {
  if (!items.length) return "—";
  return items
    .map((t) => `${t.etiqueta} (${fechaCl(t.desde)}–${fechaCl(t.hasta)}, ${t.dias} d.)`)
    .join(" · ");
}

function TarjetaPuesto({ puesto }: { puesto: DotacionPuesto }) {
  const titular = puesto.serie?.titular ?? "Sin titular";
  return (
    <SeccionTarjeta titulo={puesto.nombre}>
      <p className="t-caption mb-3 text-muted">
        {[puesto.funcion, puesto.horario].filter(Boolean).join(" · ") || "—"}
      </p>
      <ParesGrid
        items={[
          { etiqueta: "Titular de la serie", valor: titular, ancho: true },
          {
            etiqueta: "Reemplazos en el mes",
            valor: lineasTramo(puesto.reemplazos.map((r) => ({ etiqueta: r.persona, ...r }))),
            ancho: true,
          },
          {
            etiqueta: "Refuerzos en el mes",
            valor: lineasTramo(puesto.refuerzos.map((r) => ({ etiqueta: r.persona, ...r }))),
            ancho: true,
          },
          {
            etiqueta: "Vacantes (PPC)",
            valor: lineasTramo(puesto.vacantes.map((v) => ({ etiqueta: MOTIVO[v.motivo], ...v }))),
            ancho: true,
          },
        ]}
      />
    </SeccionTarjeta>
  );
}

/** Pestaña Personas (dotación) de la ficha de instalación: vínculos vigentes y pauta del mes (CAR-596). */
export async function PestanaPersonas({
  instalacionId,
  parametros,
}: {
  instalacionId: string;
  parametros: Parametros;
}) {
  const r = await cargarDotacion(instalacionId, parametros);
  if (!r.ok) {
    return (
      <Empty
        titulo="No se pudo cargar la dotación"
        descripcion="Revisa tus permisos o vuelve a intentarlo."
      />
    );
  }
  const d = r.data;
  if (!d.puestos.length) {
    return (
      <Empty
        titulo="Sin puestos activos"
        descripcion="Activa puestos en la pestaña Puestos para ver titulares y vacantes aquí."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tono="neutro">{nombreMes(d.anio, d.mes)}</Badge>
        <span className="t-caption text-muted">Datos de la Pauta y vínculos vigentes en esta instalación.</span>
      </div>
      <SeccionTarjeta titulo="Vínculos vigentes">
        {d.vinculos.length ? (
          <ul className="flex flex-col gap-1">
            {d.vinculos.map((v) => (
              <li key={v.id}>
                <Enlace Link={LinkNext} href={`/personas/${v.id}`} className="underline">
                  {v.nombre}
                </Enlace>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-body text-muted">Nadie con vínculo vigente en esta instalación.</p>
        )}
      </SeccionTarjeta>
      <div className="flex flex-col gap-3">
        {d.puestos.map((p) => (
          <TarjetaPuesto key={p.id} puesto={p} />
        ))}
      </div>
    </div>
  );
}