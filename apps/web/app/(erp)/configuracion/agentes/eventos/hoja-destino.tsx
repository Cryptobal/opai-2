"use client";

import { useState } from "react";

import { Alerta, Button, Campo, Input, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import type { EventoCatalogo } from "./datos";
import { SecretoDestino } from "./secreto-destino";
import { SelectorEventos } from "./selector-eventos";

/** «Agregar destino», abierta por `?crear=1`: dirección, descripción y eventos (CAR-352). */
export function HojaDestino({ catalogo }: { catalogo: EventoCatalogo[] }) {
  const hoja = useHojaUrl("crear");
  const { ejecutar, error, limpiarError, pendiente } = useCapacidad("erp");
  const [url, setUrl] = useState("https://");
  const [descripcion, setDescripcion] = useState("");
  const [eventos, setEventos] = useState<string[]>([]);
  const [secreto, setSecreto] = useState<string | null>(null);
  const urlValida = /^https:\/\/[^/\s]+\.[^/\s]+/.test(url.trim());
  const listo = urlValida && eventos.length > 0 && !pendiente;

  const limpiar = () => {
    setUrl("https://");
    setDescripcion("");
    setEventos([]);
    limpiarError();
  };
  const cerrar = () => {
    limpiar();
    hoja.cerrar();
  };
  async function crear() {
    if (!listo) return;
    const r = await ejecutar<{ secreto: string | null }>("core.webhooks.destino_crear", {
      url: url.trim(),
      eventos,
      ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
    });
    if (!r?.secreto) return;
    hoja.cerrar();
    limpiar();
    setSecreto(r.secreto);
  }

  return (
    <>
      <Sheet
        abierto={hoja.abierta}
        onCerrar={cerrar}
        titulo="Agregar destino"
        acciones={
          <Button block size="lg" disabled={!listo} onClick={() => void crear()}>
            {pendiente ? "Agregando…" : "Agregar destino"}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? (
            <Alerta tono="danger" titulo="No se pudo agregar el destino">
              {error}
            </Alerta>
          ) : null}
          <Campo
            etiqueta="Dirección"
            htmlFor="destino-url"
            ayuda="https y un dominio público. OPAI envía ahí un POST firmado por cada evento."
          >
            <Input
              id="destino-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              inputMode="url"
              autoComplete="off"
            />
          </Campo>
          <Campo etiqueta="Descripción (opcional)" htmlFor="destino-descripcion">
            <Input
              id="destino-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={200}
              autoComplete="off"
            />
          </Campo>
          <Campo etiqueta="Eventos" htmlFor="destino-eventos">
            <SelectorEventos catalogo={catalogo} elegidos={eventos} onCambiar={setEventos} />
          </Campo>
        </div>
      </Sheet>
      <SecretoDestino
        secreto={secreto}
        titulo="Destino agregado"
        onCerrar={() => setSecreto(null)}
      />
    </>
  );
}
