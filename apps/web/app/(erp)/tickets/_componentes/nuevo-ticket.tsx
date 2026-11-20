"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button, Sheet, Tooltip } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { InstalacionOpcion, TipoTicket } from "./datos";
import { SIN_INSTALACION, useInstalacionesTicket } from "./instalaciones-ticket";
import { NuevoTicketFormulario } from "./nuevo-ticket-formulario";

export const CONFIG_TIPOS_TICKET = "/configuracion/modulo/tickets?seccion=tipos";

export const MOTIVO_SIN_TIPOS_TICKET =
  "Para crear un ticket hace falta un tipo disponible para tu rol. Quien administra Tickets puede crearlo en Configuración › Módulos › Tickets › Tipos.";

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
  const inst = useInstalacionesTicket(instalaciones);
  const [abierto, setAbierto] = useState(false);
  const [tipoId, setTipoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState("p3");
  const [instalacionId, setInstalacionId] = useState(SIN_INSTALACION);
  const tipo = tipos.find((t) => t.id === tipoId);
  const valido = tipoId !== "" && titulo.trim().length >= 3 && descripcion.trim().length >= 3;
  const sinTipos = tipos.length === 0;

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

  const boton = (
    <Button onClick={() => setAbierto(true)} disabled={sinTipos}>
      Nuevo ticket
    </Button>
  );

  return (
    <>
      {sinTipos ? (
        <Tooltip texto={MOTIVO_SIN_TIPOS_TICKET}>
          <span className="inline-flex">{boton}</span>
        </Tooltip>
      ) : (
        boton
      )}
      <Sheet
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Nuevo ticket"
        acciones={
          <Button block size="lg" disabled={pendiente || !valido} onClick={() => void crear()}>
            {pendiente
              ? "Creando…"
              : tipo?.requiereAprobacion
                ? "Enviar solicitud"
                : "Crear ticket"}
          </Button>
        }
      >
        <NuevoTicketFormulario
          tipos={tipos}
          tipoId={tipoId}
          onTipo={setTipoId}
          tipo={tipo}
          titulo={titulo}
          onTitulo={setTitulo}
          descripcion={descripcion}
          onDescripcion={setDescripcion}
          prioridad={prioridad}
          onPrioridad={setPrioridad}
          instalaciones={instalaciones}
          instalacionId={instalacionId}
          onInstalacion={setInstalacionId}
          instOpciones={inst.opciones}
          onBuscarInstalacion={inst.buscar}
          {...(error ? { error } : {})}
        />
      </Sheet>
    </>
  );
}