import { Badge, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { fechaCorta, fechaHora } from "@/lib/formato";

import { AccionesSolicitud } from "./acciones-solicitud";
import {
  abierta,
  ESTADO_SOLICITUD,
  etiquetaDe,
  nombreTitular,
  SEMAFORO,
  type Solicitud,
  TIPOS_SOLICITUD,
} from "./tipos";

const fichaDe = (s: Solicitud) =>
  s.titular.id
    ? s.titular.tipo === "persona"
      ? `/personas/${s.titular.id}/privacidad`
      : `/contactos/${s.titular.id}`
    : null;

/** Ficha de una solicitud del titular: datos, plazo con semáforo, resultado y acciones (§8). */
export function DetalleSolicitud({
  s,
  yo,
  gestionar,
}: {
  s: Solicitud;
  yo: string | null;
  gestionar: boolean;
}) {
  const e = etiquetaDe(ESTADO_SOLICITUD, s.estado);
  const sem = etiquetaDe(SEMAFORO, s.semaforo);
  const ficha = fichaDe(s);
  return (
    <SeccionTarjeta titulo={`${TIPOS_SOLICITUD[s.tipo] ?? s.tipo} · ${nombreTitular(s)}`}>
      <div className="flex flex-col gap-4">
        <ParesGrid
          items={[
            { etiqueta: "Estado", valor: <Badge tono={e.tono}>{e.etiqueta}</Badge> },
            {
              etiqueta: "Plazo",
              valor: (
                <span className="flex flex-wrap items-center gap-2">
                  {s.plazoEn ? fechaCorta(s.plazoEn) : null}
                  {abierta(s.estado) ? (
                    <Badge tono={sem.tono} punto={false}>
                      {sem.etiqueta}
                    </Badge>
                  ) : null}
                </span>
              ),
            },
            {
              etiqueta: "Titular",
              valor: ficha ? (
                <LinkNext href={ficha} className="underline">
                  {nombreTitular(s)}
                </LinkNext>
              ) : (
                `${nombreTitular(s)} (sin registro interno)`
              ),
            },
            { etiqueta: "Correo", valor: s.titular.email },
            { etiqueta: "Recibida", valor: fechaHora(s.recibidaEn) },
            {
              etiqueta: "Responsable",
              valor: s.responsableId ? (s.responsableId === yo ? "Tú" : "Asignada") : null,
            },
            ...(s.resultado ? [{ etiqueta: "Resultado", valor: s.resultado, ancho: true }] : []),
          ]}
        />
        {!s.plazoEn && abierta(s.estado) ? (
          <p className="t-caption">
            El plazo legal de atención aún no está configurado: se fija en la pestaña Retención una
            vez confirmado con asesoría legal.
          </p>
        ) : null}
        <AccionesSolicitud s={s} yo={yo} gestionar={gestionar} />
      </div>
    </SeccionTarjeta>
  );
}
