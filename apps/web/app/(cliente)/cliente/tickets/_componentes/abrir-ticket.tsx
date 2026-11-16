"use client";

import { useState } from "react";

import { avisar, Button, Campo, Dialog, Input, Select, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Opcion = { valor: string; etiqueta: string };

/** «Abrir un ticket» (CAR-519): sobre una instalación del acceso, con un tipo que la empresa abrió a los clientes. */
export function AbrirTicket({ instalaciones, tipos }: { instalaciones: Opcion[]; tipos: Opcion[] }) {
  const { ejecutar, pendiente, error } = useCapacidad("cliente");
  const [abierto, setAbierto] = useState(false);
  const [instalacionId, setInstalacionId] = useState(instalaciones[0]?.valor ?? "");
  const [tipoId, setTipoId] = useState(tipos[0]?.valor ?? "");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const listo = instalacionId && tipoId && titulo.trim().length >= 3 && descripcion.trim().length >= 3;

  async function enviar() {
    const datos = { instalacionId, tipoId, titulo: titulo.trim(), descripcion: descripcion.trim() };
    if (!(await ejecutar("tickets.portal_tickets.crear", datos))) return;
    setAbierto(false);
    setTitulo("");
    setDescripcion("");
    avisar.exito("Listo. Tu empresa de seguridad recibió el ticket.");
  }

  if (instalaciones.length === 0 || tipos.length === 0) return null;
  return (
    <>
      <Button type="button" onClick={() => setAbierto(true)}>
        Abrir un ticket
      </Button>
      <Dialog
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Abrir un ticket"
        descripcion="Lo recibe tu empresa de seguridad. Aquí verás en qué estado va."
        acciones={
          <>
            <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={pendiente || !listo} onClick={() => void enviar()}>
              {pendiente ? "Enviando…" : "Enviar ticket"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Campo etiqueta="Instalación" htmlFor="tk-instalacion">
            <Select id="tk-instalacion" valor={instalacionId} onCambiar={setInstalacionId} opciones={instalaciones} />
          </Campo>
          <Campo etiqueta="Tipo" htmlFor="tk-tipo">
            <Select id="tk-tipo" valor={tipoId} onCambiar={setTipoId} opciones={tipos} />
          </Campo>
          <Campo etiqueta="Asunto" htmlFor="tk-titulo">
            <Input id="tk-titulo" value={titulo} maxLength={140} onChange={(e) => setTitulo(e.target.value)} />
          </Campo>
          <Campo etiqueta="Detalle" htmlFor="tk-detalle" ayuda="Qué pasó, dónde y desde cuándo.">
            <Textarea
              id="tk-detalle"
              value={descripcion}
              maxLength={4000}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Campo>
          {error ? <p className="t-body-sm text-danger-fg">{error}</p> : null}
        </div>
      </Dialog>
    </>
  );
}
