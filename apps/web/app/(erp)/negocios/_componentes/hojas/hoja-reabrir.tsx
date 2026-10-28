"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Select, Sheet, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { fecha } from "@/lib/fechas";

import type { NegocioDetalle } from "../datos";
import type { ConfigComercial } from "./tipos";
import { useHojaNegocio } from "./use-hoja";

/** Reabrir un negocio perdido: etapa abierta a la que vuelve y por qué (R20). */
export function HojaReabrir({ n, config }: { n: NegocioDetalle; config: ConfigComercial }) {
  const hoja = useHojaNegocio("reabrir");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const abiertas = config.embudo.etapas.filter((e) => e.tipo === "abierta" && e.activa);
  // La etapa en que estaba al perderse: la de origen del último paso a la perdida en el historial.
  const anterior = [...n.historial].reverse().find((h) => h.a === n.etapaNombre)?.de ?? null;
  const sugerida = abiertas.find((e) => e.nombre === anterior) ?? abiertas[0];
  const [etapa, setEtapa] = useState(sugerida?.id ?? "");
  const [motivo, setMotivo] = useState("");
  async function reabrir() {
    const r = await ejecutar("comercial.negocios.reabrir", {
      id: n.id,
      etapaId: etapa,
      motivo: motivo.trim(),
    });
    if (!r) return;
    avisar.exito("Negocio reabierto");
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Reabrir negocio"
      descripcion={`${n.titulo}${n.historial.length ? ` · perdido el ${fecha(n.historial.at(-1)?.cuando)}` : ""}`}
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || !etapa || motivo.trim().length < 3}
            onClick={() => void reabrir()}
          >
            {pendiente ? "Reabriendo…" : "Reabrir"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo
          etiqueta="Volver a la etapa"
          htmlFor="reabrir-etapa"
          {...(anterior ? { ayuda: `${anterior} era su etapa al perderse.` } : {})}
        >
          <Select
            id="reabrir-etapa"
            valor={etapa || undefined}
            onCambiar={setEtapa}
            opciones={abiertas.map((e) => ({ valor: e.id, etiqueta: e.nombre }))}
          />
        </Campo>
        <Campo
          etiqueta="Por qué se reabre"
          htmlFor="reabrir-motivo"
          ayuda="El motivo de pérdida anterior queda en el historial."
        >
          <Textarea
            id="reabrir-motivo"
            rows={2}
            maxLength={500}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Campo>
      </div>
    </Sheet>
  );
}
