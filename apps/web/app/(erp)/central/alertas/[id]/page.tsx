import { Badge, DetailScreen, Pares } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { cuandoCompleto, haceCuanto } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";

import {
  cargarAlerta,
  cargarPropuestasAlerta,
  puedeAtender,
  ETIQUETA_ESTADO,
  ETIQUETA_SEVERIDAD,
  type EventoAlerta,
  TONO_ESTADO,
  TONO_SEVERIDAD,
} from "../../_componentes/datos";
import { AccionesAlerta } from "./_componentes/acciones";
import { ControlAgente } from "./_componentes/control-agente";
import { PropuestasAgente } from "./_componentes/propuestas";

export const metadata = { title: "Alerta" };
type Props = { params: Promise<{ id: string }> };

const ETIQUETA_EVENTO: Record<string, string> = {
  abierta: "Se abrió la alerta",
  resuelta: "Se resolvió",
  falsa_alarma: "Se cerró como falsa alarma",
  reabierta: "Se reabrió",
  pospuesta: "Se pospuso",
  reactivada: "Volvió a la cola",
  en_atencion: "Alguien se hizo cargo",
  contactada: "Se contactó al primer paso de la cadena",
  escalada: "Se escaló al siguiente paso",
  contacto: "Se registró un contacto",
  tomada: "Una persona tomó el control",
  devuelta: "Se devolvió al agente",
  severidad_bajada: "Se bajó la severidad",
  propuesta: "El agente propuso una acción",
  respaldo: "Se avisó al responsable de respaldo",
  senal: "Llegó una señal nueva",
  turno: "Cambio de turno",
};
const ACTOR: Record<EventoAlerta["actorTipo"], string> = { persona: "Persona", agente: "Agente", sistema: "Sistema" };

/** Ficha de la alerta (spec §3): qué pasó, la bitácora y las acciones, en una sola pantalla con secciones. */
export default function AlertaFicha({ params }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Alerta"
      ruta="/central"
      cargar={async () => {
        const { id } = await params;
        const [r, atender, propuestas] = await Promise.all([cargarAlerta(id), puedeAtender(), cargarPropuestasAlerta(id)]);
        return { id, r, atender, propuestas };
      }}
      opciones={({ r }) => ({ titulo: r.ok ? r.data.alerta.titulo : "Alerta" })}
    >
      {({ id, r, atender, propuestas }) => {
        const a = r.ok ? r.data.alerta : null;
        const eventos = r.ok ? r.data.eventos : [];
        const intentos = r.ok ? r.data.intentos : [];
        const propsPendientes = propuestas.ok ? propuestas.data.items : [];
        return (
          <DetailScreen
            state={estadoPantalla(r, propuestas)}
            titulo={a?.titulo ?? "Alerta"}
            subtitulo={a ? `${a.instalacionNombre ?? "Instalación"} · ${haceCuanto(a.createdAt)}` : undefined}
            estado={
              a ? (
                <span className="flex items-center gap-2">
                  <Badge tono={TONO_SEVERIDAD[a.severidad] ?? "neutro"}>{ETIQUETA_SEVERIDAD[a.severidad] ?? a.severidad}</Badge>
                  <Badge tono={TONO_ESTADO[a.estado] ?? "neutro"}>{ETIQUETA_ESTADO[a.estado] ?? a.estado}</Badge>
                </span>
              ) : undefined
            }
            acciones={
              a && atender ? (
                <div className="flex w-full flex-col gap-2">
                  <AccionesAlerta id={id} estado={a.estado} />
                  <ControlAgente id={id} estado={a.estado} eventos={eventos} />
                </div>
              ) : undefined
            }
          >
            {a ? (
              <div className="flex flex-col gap-4">
                <section className="flex flex-col gap-2">
                  <h3 className="t-label text-fg">Qué pasó</h3>
                  <Pares
                    items={[
                      { etiqueta: "Instalación", valor: a.instalacionNombre ?? "—" },
                      ...(a.personaNombre ? [{ etiqueta: "Persona", valor: a.personaNombre }] : []),
                      { etiqueta: "Origen", valor: a.origen === "manual" ? "Abierta a mano" : a.origen },
                      ...(a.descripcion ? [{ etiqueta: "Descripción", valor: a.descripcion }] : []),
                      { etiqueta: "Abierta", valor: cuandoCompleto(a.createdAt) },
                      ...(a.pospuestaHasta ? [{ etiqueta: "Vuelve a la cola", valor: cuandoCompleto(a.pospuestaHasta) }] : []),
                      ...(a.notaCierre ? [{ etiqueta: "Nota de cierre", valor: a.notaCierre }] : []),
                    ]}
                  />
                </section>
                {atender && propsPendientes.length > 0 ? <PropuestasAgente propuestas={propsPendientes} /> : null}
                {intentos.length > 0 ? (
                  <section className="flex flex-col gap-2">
                    <h3 className="t-label text-fg">Intentos de contacto</h3>
                    <ul className="overflow-hidden rounded-lg border border-border bg-surface">
                      {intentos.map((e) => (
                        <li key={e.id} className="border-b border-border px-4 py-2.5 last:border-b-0">
                          <span className="t-caption">
                            Paso {e.paso} · {e.canal} · {e.resultado} · {cuandoCompleto(e.createdAt)}
                          </span>
                          {e.nota ? <span className="block text-base text-fg">{e.nota}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                <section className="flex flex-col gap-2">
                  <h3 className="t-label text-fg">Bitácora</h3>
                  <ul className="overflow-hidden rounded-lg border border-border bg-surface">
                    {eventos.map((e) => (
                      <li key={e.id} className="flex flex-col gap-1 border-b border-border px-4 py-2.5 last:border-b-0">
                        <span className="t-caption">
                          {ETIQUETA_EVENTO[e.tipo] ?? e.tipo} · {ACTOR[e.actorTipo]} · {cuandoCompleto(e.createdAt)}
                        </span>
                        {e.nota ? <span className="text-base text-fg">{e.nota}</span> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            ) : null}
          </DetailScreen>
        );
      }}
    </PaginaPortal>
  );
}
