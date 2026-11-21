"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";

import { Alerta, avisar, Badge, Button, Dialog } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { useCapacidad } from "@/app/_components/use-capacidad";

import {
  mensajeDarAcceso,
  type ResultadoDarAcceso,
} from "@/app/(erp)/configuracion/_portal_cliente/contactos-acceso";

type Estado =
  | "sin_correo"
  | "invitacion_pendiente"
  | "sin_acceso"
  | "activo"
  | "pin_creado"
  | "no_disponible";

export type AccesoPersona = { estado: Estado | string; motivo?: string };

const ETIQUETA: Record<Estado, { t: string; tono: "success" | "warning" | "neutro" }> = {
  sin_correo: { t: "Sin correo", tono: "neutro" },
  invitacion_pendiente: { t: "Invitación pendiente", tono: "warning" },
  sin_acceso: { t: "Sin acceso", tono: "neutro" },
  activo: { t: "Acceso activo", tono: "success" },
  pin_creado: { t: "Acceso listo", tono: "success" },
  no_disponible: { t: "No disponible", tono: "neutro" },
};

function notaEstado(a: AccesoPersona, personaActiva: boolean, tieneUsuario: boolean) {
  if (a.estado === "sin_correo") return "Agrega un correo personal o laboral para enviar la invitación.";
  if (a.estado === "no_disponible" && a.motivo === "usuario_interno")
    return "El correo pertenece a un usuario interno de la empresa.";
  if (a.estado === "invitacion_pendiente") return "La invitación está vigente; puedes reenviarla si hace falta.";
  if (a.estado === "sin_acceso")
    return personaActiva
      ? "Puedes dar acceso al portal o vincular un usuario existente."
      : "La persona no está activa.";
  if (a.estado === "activo") return "Ya puede entrar; falta que cree su PIN en el primer ingreso.";
  if (a.estado === "pin_creado") return "Tiene usuario y PIN de terreno.";
  return a.motivo ?? "";
}

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
  const [confirmar, setConfirmar] = useState<"dar" | "reenviar" | null>(null);
  const estado = acceso.estado as Estado;
  const e = ETIQUETA[estado] ?? ETIQUETA.no_disponible;
  const nota = notaEstado({ ...acceso, estado }, personaActiva, tieneUsuario);
  const darAcceso =
    puedeGestionar &&
    personaActiva &&
    (estado === "sin_acceso" || estado === "invitacion_pendiente");
  const reenviar = puedeGestionar && ["invitacion_pendiente", "activo"].includes(estado);
  const vincular = puedeGestionar && personaActiva && !tieneUsuario && estado === "sin_acceso";

  async function aplicar() {
    if (!confirmar) return;
    if (confirmar === "dar") {
      const r = await ejecutar<ResultadoDarAcceso & { estado: string }>("core.personas.dar_acceso_portal", {
        personaId,
      });
      if (r != null) {
        const m = mensajeDarAcceso(r as ResultadoDarAcceso);
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

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="t-label">Portal del trabajador</span>
          {nota ? <span className="t-caption block text-fg-muted">{nota}</span> : null}
        </span>
        <span className="flex flex-wrap items-center gap-1">
          <Badge tono={e.tono}>{e.t}</Badge>
          {darAcceso ? (
            <Button type="button" variant="secondary" onClick={() => setConfirmar("dar")}>
              Dar acceso al portal
            </Button>
          ) : null}
          {reenviar ? (
            <Button type="button" variant="ghost" onClick={() => setConfirmar("reenviar")}>
              Reenviar invitación
            </Button>
          ) : null}
        </span>
      </div>
      {vincular ? (
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
        titulo={confirmar === "dar" ? "Dar acceso al portal" : "Reenviar invitación"}
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