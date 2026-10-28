"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { NegocioDetalle } from "../datos";
import type { ConfigComercial } from "./tipos";
import { useHojaNegocio } from "./use-hoja";

/** Perder: motivo del catálogo (detalle obligatorio con «otro») y competidor. Se reabre después. */
export function HojaPerder({ n, config }: { n: NegocioDetalle; config: ConfigComercial }) {
  const hoja = useHojaNegocio("perder");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [competidor, setCompetidor] = useState("");
  const elegido = config.motivos.find((m) => m.id === motivo);
  const faltaDetalle = !!elegido?.exigeDetalle && !detalle.trim();
  async function perder() {
    const r = await ejecutar("comercial.negocios.perder", {
      id: n.id,
      motivoPerdidaId: motivo,
      detalle: detalle.trim() || null,
      competidor: competidor.trim() || null,
    });
    if (!r) return;
    avisar.exito("Negocio perdido");
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Perder negocio"
      descripcion={`${n.titulo}. Podrás reabrirlo después.`}
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={pendiente || !motivo || faltaDetalle}
            onClick={() => void perder()}
          >
            {pendiente ? "Guardando…" : "Perder negocio"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Motivo de pérdida" htmlFor="perder-motivo">
          <Select
            id="perder-motivo"
            valor={motivo || undefined}
            onCambiar={setMotivo}
            placeholder="Elige un motivo"
            opciones={config.motivos
              .filter((m) => m.activo)
              .map((m) => ({ valor: m.id, etiqueta: m.nombre }))}
          />
        </Campo>
        <Campo
          etiqueta="Detalle"
          htmlFor="perder-detalle"
          ayuda={`${elegido?.exigeDetalle ? "Obligatorio" : "Opcional"}. Obligatorio si eliges «Otro».`}
          error={faltaDetalle ? "Cuenta qué pasó." : undefined}
        >
          <Textarea
            id="perder-detalle"
            rows={3}
            maxLength={500}
            placeholder="Qué pasó, con quién competimos, a qué precio"
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Competidor" htmlFor="perder-competidor" ayuda="Opcional.">
          <Input
            id="perder-competidor"
            maxLength={160}
            value={competidor}
            onChange={(e) => setCompetidor(e.target.value)}
          />
        </Campo>
      </div>
    </Sheet>
  );
}
