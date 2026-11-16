"use client";

import { useRouter } from "next/navigation";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { PropuestaAgente } from "../../../_componentes/tipos-central";

const ETIQUETA: Record<string, string> = {
  resolver: "Resolver",
  falsa_alarma: "Falsa alarma",
  reabrir: "Reabrir",
  posponer: "Posponer",
  bajar_severidad: "Bajar severidad",
};

type Props = { propuestas: PropuestaAgente[] };

export function PropuestasAgente({ propuestas }: Props) {
  const router = useRouter();
  const { ejecutar, pendiente } = useCapacidad("erp");
  if (propuestas.length === 0) return null;

  async function resolver(id: string, aceptar: boolean) {
    if (await ejecutar("central.propuestas.resolver", { id, aceptar })) {
      avisar.exito(aceptar ? "Propuesta aceptada" : "Propuesta rechazada");
      router.refresh();
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="t-label text-fg">Propuestas del agente</h3>
      <ul className="flex flex-col gap-2">
        {propuestas.map((p) => (
          <li key={p.id} className="rounded-lg border border-border px-4 py-3">
            <p className="font-medium text-fg">{ETIQUETA[p.accion] ?? p.accion}</p>
            {p.nota ? <p className="t-caption text-fg-muted">{p.nota}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="primary" disabled={pendiente} onClick={() => void resolver(p.id, true)}>
                Aceptar
              </Button>
              <Button variant="secondary" disabled={pendiente} onClick={() => void resolver(p.id, false)}>
                Rechazar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}