"use client";

import { useEffect } from "react";

import { latidoSiCorresponde } from "@/lib/terreno/estado";
import { usePersonaElegida } from "@/lib/terreno/persona";
import type { PersonaDeLista } from "@/lib/terreno-servidor";

import { InicioEquipo } from "./inicio-equipo";
import { SelectorPersona } from "./selector-persona";

/** Terreno en un equipo emparejado: «¿Quién eres?» hasta que alguien elige, y después el inicio. */
export function PantallaEquipo({
  instalacion,
  personas,
}: {
  instalacion: string;
  personas: PersonaDeLista[];
}) {
  const elegida = usePersonaElegida();
  // Si la persona elegida ya no está en la instalación, se vuelve a preguntar.
  const persona = elegida && personas.some((p) => p.id === elegida.id) ? elegida : null;
  const personaId = persona?.id ?? null;
  useEffect(() => {
    void latidoSiCorresponde(personaId);
    const alVolver = () => {
      if (document.visibilityState === "visible") void latidoSiCorresponde(personaId);
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [personaId]);
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-safe pb-safe py-6">
      {elegida === undefined ? null : persona ? (
        <InicioEquipo instalacion={instalacion} persona={persona} />
      ) : (
        <SelectorPersona instalacion={instalacion} personas={personas} />
      )}
    </main>
  );
}
