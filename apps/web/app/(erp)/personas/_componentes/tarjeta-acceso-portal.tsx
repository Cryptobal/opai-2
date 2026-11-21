"use client";

import { useState } from "react";

import { Alerta, avisar, Badge, Button, Dialog } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { UserPlus } from "lucide-react";

import {
  type AccesoPersona,
  mensajeDarAccesoPersona,
  type ResultadoDarAccesoPersona,
  vistaAccesoPersona,
} from "./acceso-portal-persona";

type Confirmar = "dar" | "reenviar" | null;

/** Acciones de acceso al portal del trabajador en la ficha (CAR-803). */
export function TarjetaAccesoPortal({
  personaId,
  acceso,
  puedeGestionar,
  tieneUsuario,
  personaActiva,
}: {
  personaId: string;
  acceso: AccesoPersona;
  puedeGestionar: boolean;
  tieneUsuario: boolean;
  personaActiva: boolean;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [confirmar, setConfirmar] = useState<Confirmar>(null);
  const v = vistaAccesoPersona(acceso, { tieneUsuario, personaActiva });

  async function aplicar() {
    if (!confirmar) return;
    if (confirmar === "dar") {
      const r = await ejecutar<ResultadoDarAccesoPersona>("core.personas.dar_acceso_portal", { personaId });
      if (r != null) {
        const m = mensajeDarAccesoPersona(r);
        (m.exito ? avisar.exito : avisar.info)(m.texto);
        setConfirmar(null);
      }
      return;
    }
    const r = await ejecutar<{ reenviada: boolean }>("core.personas.reenviar_invitacion", {
      personaId,
      forzar: true,
    });
    if (r != null) {
      avisar.exito(r.reenviada ? "Invitación reenviada" : "La invitación sigue vigente");
      setConfirmar(null);
    }
  }

  const titulo = confirmar === "dar" ? "Dar acceso al portal" : "Reenviar invitación";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="t-label">Portal del trabajador</span>
          {v.nota ? <span className="t-caption block text-fg-muted">{v.nota}</span> : null}
        </span>
        <span className="flex flex-wrap items-center gap-1">
          <Badge tono={v.tono}>{v.etiqueta}</Badge>
          {puedeGestionar && v.darAcceso ? (
            <Button type="button" variant="secondary" onClick={() => setConfirmar("dar")}>
              Dar acceso al portal
            </Button>
          ) : null}
          {puedeGestionar && v.reenviarInvitacion ? (
            <Button type="button" variant="ghost" onClick={() => setConfirmar("reenviar")}>
              Reenviar invitación
            </Button>
          ) : null}
        </span>
      </div>
      {v.vincular ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <EnlaceBotonHoja href="?vincular=1" variante="secondary" icono={UserPlus}>
            Vincular usuario
          </EnlaceBotonHoja>
          <span className="t-caption">Si ya tiene usuario de trabajador con otro correo</span>
        </div>
      ) : null}
      <Dialog
        abierto={confirmar !== null}
        onCerrar={() => setConfirmar(null)}
        titulo={titulo}
        descripcion={
          confirmar === "dar"
            ? "Se enviará una invitación al correo de la persona o se vinculará su usuario si ya existe."
            : "Se revocará la invitación anterior y se enviará una nueva."
        }
        acciones={
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmar(null)}>
              Cancelar
            </Button>
            <Button type="button" disabled={pendiente} onClick={() => void aplicar()}>
              {pendiente ? "Aplicando…" : "Confirmar"}
            </Button>
          </>
        }
      >
        {error ? <Alerta tono="danger" titulo={error} /> : null}
      </Dialog>
    </>
  );
}