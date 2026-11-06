"use client";

import { Button, Empty } from "@opai/ds";

import { elegirPersona, type PersonaElegida } from "@/lib/terreno/persona";

import { BannerConexion } from "./banner-conexion";

/** Inicio de Terreno en el equipo (g0): saludo, estado de la conexión y cola. Los módulos suman sus tarjetas. */
export function InicioEquipo({
  instalacion,
  persona,
}: {
  instalacion: string;
  persona: PersonaElegida;
}) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-fg-muted">Terreno · {instalacion}</p>
          <h1 className="t-title text-fg">Hola, {persona.nombre.split(" ")[0]}</h1>
        </div>
        <Button variant="secondary" onClick={() => elegirPersona(null)}>
          Cambiar
        </Button>
      </header>
      <BannerConexion />
      <Empty
        titulo="Aún no hay nada por hacer"
        descripcion="Tus rondas, novedades y accesos aparecerán aquí cuando tu empresa los active."
      />
    </div>
  );
}
