import { Pares } from "@opai/ds";

import { cuandoCompleto } from "@/lib/fechas";

import type { Alerta, EventoAlerta } from "../../../_componentes/datos";

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

type AlertaFicha = Alerta & { personaNombre: string | null };

export function QuePasoAlerta({ alerta }: { alerta: AlertaFicha }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="t-label text-fg">Qué pasó</h3>
      <Pares
        items={[
          { etiqueta: "Instalación", valor: alerta.instalacionNombre ?? "—" },
          ...(alerta.personaNombre ? [{ etiqueta: "Persona", valor: alerta.personaNombre }] : []),
          { etiqueta: "Origen", valor: alerta.origen === "manual" ? "Abierta a mano" : alerta.origen },
          ...(alerta.descripcion ? [{ etiqueta: "Descripción", valor: alerta.descripcion }] : []),
          { etiqueta: "Abierta", valor: cuandoCompleto(alerta.createdAt) },
          ...(alerta.pospuestaHasta ? [{ etiqueta: "Vuelve a la cola", valor: cuandoCompleto(alerta.pospuestaHasta) }] : []),
          ...(alerta.notaCierre ? [{ etiqueta: "Nota de cierre", valor: alerta.notaCierre }] : []),
        ]}
      />
    </section>
  );
}

export function BitacoraAlerta({ eventos }: { eventos: EventoAlerta[] }) {
  return (
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
  );
}
