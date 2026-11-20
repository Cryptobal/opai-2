import { formatearFecha } from "@opai/domain";
import { Badge, DetailScreen, type EstadoPantalla, Pares, type Par, Seccion } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { CancelarPrerregistro } from "./cancelar-prerregistro";
import type { Prerregistro } from "./datos";
import { ESTADO_DIA, estadoPrerregistro, horario, primerDiaPendiente, rango } from "./etiquetas";

function paresDe(p: Prerregistro): Par[] {
  return [
    { etiqueta: "Instalación", valor: p.instalacion },
    { etiqueta: "Fecha", valor: rango(p) },
    { etiqueta: "Horario esperado", valor: horario(p.desdeMin, p.hastaMin) },
    { etiqueta: "Anfitrión", valor: p.anfitrion },
    ...(p.motivo ? [{ etiqueta: "Motivo", valor: p.motivo }] : []),
    ...(p.nota ? [{ etiqueta: "Nota para el guardia", valor: p.nota }] : []),
    { etiqueta: "Aviso al llegar", valor: p.avisarLlegada ? "Sí" : "No" },
  ];
}

/** Visitantes con su documento enmascarado y el enlace a la invitación del próximo día. */
function Visitantes({ p }: { p: Prerregistro }) {
  const dia = primerDiaPendiente(p);
  return (
    <ul className="flex flex-col divide-y divide-border">
      {p.visitantes.map((v) => (
        <li key={v.id} className="flex items-center justify-between gap-3 py-2">
          <span className="flex min-w-0 flex-col">
            <span className="t-body truncate">{v.nombre}</span>
            <span className="t-caption">
              {[v.documento, v.empresa, v.patente].filter(Boolean).join(" · ")}
            </span>
          </span>
          {dia ? (
            <EnlaceBoton
              variante="secondary"
              href={`/accesos/prerregistros/${p.id}/invitacion?visitante=${v.id}&dia=${dia}`}
            >
              Invitación
            </EnlaceBoton>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Ficha de un prerregistro: datos de la visita, visitantes y estado de cada día (R15). */
export function DetallePrerregistro({
  p,
  state,
  crea,
}: {
  p: Prerregistro | null;
  state: EstadoPantalla;
  crea: boolean;
}) {
  const e = p ? estadoPrerregistro(p) : null;
  const cancelable = p && !p.cancelado && primerDiaPendiente(p) !== null;
  return (
    <DetailScreen
      state={p ? state : state === "ready" ? "error" : state}
      titulo={p ? `Visita · ${rango(p)}` : "Prerregistro"}
      {...(p && e
        ? {
            estado: (
              <Badge tono={e.tono} punto>
                {e.etiqueta}
              </Badge>
            ),
            subtitulo: p.instalacion,
            ...(crea && cancelable ? { acciones: <CancelarPrerregistro id={p.id} /> } : {}),
          }
        : {})}
    >
      {p ? (
        <div className="flex flex-col gap-5">
          <Seccion titulo="Visita">
            <Pares items={paresDe(p)} />
          </Seccion>
          <Seccion titulo="Visitantes">
            <Visitantes p={p} />
          </Seccion>
          <Seccion titulo="Días">
            <ul className="flex flex-wrap gap-2">
              {p.dias.map((d) => (
                <li key={d.dia}>
                  <Badge tono={ESTADO_DIA[d.estado].tono}>
                    {formatearFecha(d.dia)} · {ESTADO_DIA[d.estado].etiqueta}
                  </Badge>
                </li>
              ))}
            </ul>
          </Seccion>
        </div>
      ) : null}
    </DetailScreen>
  );
}
