"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button, Campo, Combobox, Input, Select, Sheet, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { InstalacionOpcion, TipoTicket } from "./datos";

// Solo el tipo viene de datos.ts: sus valores arrastran código de servidor al navegador.
const PRIORIDADES = [
  { valor: "p1", etiqueta: "P1 · Urgente" },
  { valor: "p2", etiqueta: "P2 · Alta" },
  { valor: "p3", etiqueta: "P3 · Media" },
  { valor: "p4", etiqueta: "P4 · Baja" },
];
const SIN_INSTALACION = "sin";

/**
 * Nuevo ticket (Sheet de la bandeja). Un ticket nace solo cuando una persona lo crea aquí o por
 * `tickets.tickets.crear`: ninguna regla ni integración lo crea (regla de Carlos, 30-oct-2026). El
 * responsable lo fija el tipo; quien no ve todos los tickets no lo elige. La instalación es opcional y
 * solo aparece si quien crea ve alguna (su alcance).
 */
export function NuevoTicket(p: { tipos: TipoTicket[]; instalaciones: InstalacionOpcion[] }) {
  const { tipos, instalaciones } = p;
  const router = useRouter();
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);
  const [tipoId, setTipoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState("p3");
  const [instalacionId, setInstalacionId] = useState(SIN_INSTALACION);
  const tipo = tipos.find((t) => t.id === tipoId);
  const valido = tipoId !== "" && titulo.trim().length >= 3 && descripcion.trim().length >= 3;

  const cerrar = () => {
    limpiarError();
    setAbierto(false);
  };

  async function crear() {
    const r = await ejecutar<{ id: string }>("tickets.tickets.crear", {
      tipoId,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      prioridad,
      ...(instalacionId !== SIN_INSTALACION ? { instalacionId } : {}),
    });
    if (!r) return;
    avisar.exito(tipo?.requiereAprobacion ? "Solicitud enviada" : "Ticket creado");
    setTitulo("");
    setDescripcion("");
    setInstalacionId(SIN_INSTALACION);
    setAbierto(false);
    router.push(`/tickets/${r.id}`);
  }

  return (
    <>
      <Button onClick={() => setAbierto(true)} disabled={tipos.length === 0}>
        Nuevo ticket
      </Button>
      <Sheet
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Nuevo ticket"
        acciones={
          <Button block size="lg" disabled={pendiente || !valido} onClick={() => void crear()}>
            {pendiente ? "Creando…" : tipo?.requiereAprobacion ? "Enviar solicitud" : "Crear ticket"}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Campo etiqueta="Tipo" htmlFor="nt-tipo">
            <Select
              valor={tipoId}
              opciones={tipos.map((t) => ({
                valor: t.id,
                etiqueta: t.nombre,
                ...(t.descripcion ? { descripcion: t.descripcion } : {}),
              }))}
              onCambiar={setTipoId}
            />
          </Campo>
          {tipo?.requiereAprobacion ? (
            <p className="t-caption">Este tipo pasa por aprobación antes de resolverse.</p>
          ) : null}
          <Campo etiqueta="Título" htmlFor="nt-titulo" {...(error ? { error } : {})}>
            <Input id="nt-titulo" value={titulo} maxLength={140} onChange={(e) => setTitulo(e.target.value)} />
          </Campo>
          <Campo etiqueta="Descripción" htmlFor="nt-desc">
            <Textarea
              id="nt-desc"
              rows={5}
              maxLength={4000}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Campo>
          {instalaciones.length > 0 ? (
            <Campo etiqueta="Instalación (opcional)" htmlFor="nt-inst">
              <Combobox
                id="nt-inst"
                valor={instalacionId}
                onCambiar={([v]) => setInstalacionId(v ?? SIN_INSTALACION)}
                opciones={[
                  { valor: SIN_INSTALACION, etiqueta: "Sin instalación" },
                  ...instalaciones.map((i) => ({ valor: i.id, etiqueta: i.nombre })),
                ]}
                placeholder="Sin instalación"
              />
            </Campo>
          ) : null}
          <Campo etiqueta="Prioridad" htmlFor="nt-prio">
            <Select valor={prioridad} opciones={PRIORIDADES} onCambiar={setPrioridad} />
          </Campo>
        </div>
      </Sheet>
    </>
  );
}
