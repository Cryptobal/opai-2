"use client";

import { useEffect, useState } from "react";

import { Alerta, Enlace } from "@opai/ds";

import { Marcar } from "@/app/_components/asistencia/marcar";
import { usePersonaElegida } from "@/lib/terreno/persona";
import { ejecutarAsistenciaEquipo } from "@/app/_acciones/terreno-asistencia";

import { LinkNext } from "@/app/_components/link-next";

/** Marcar en el kiosco: usa la persona que eligió su nombre en «¿Quién eres?» y se identifica con su PIN o su rostro. */
export function MarcarEquipo() {
  const persona = usePersonaElegida();
  const [texto, setTexto] = useState("");
  useEffect(() => {
    let vivo = true;
    void ejecutarAsistenciaEquipo("asistencia.rostro.textos", {}).then((r) => {
      if (vivo && r.ok) setTexto((r.data as { proposito: string; texto: string }[]).find((t) => t.proposito === "biometria_asistencia")?.texto ?? "");
    });
    return () => {
      vivo = false;
    };
  }, []);
  if (persona === undefined) return null;
  if (persona === null)
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-3">
        <Alerta tono="neutral" titulo="Primero elige tu nombre">Elige quién eres para marcar tu asistencia.</Alerta>
        <Enlace href="/terreno" Link={LinkNext}>Elegir mi nombre</Enlace>
      </div>
    );
  return <Marcar modo="equipo" personaId={persona.id} nombre={persona.nombre} textoRostro={texto} />;
}
