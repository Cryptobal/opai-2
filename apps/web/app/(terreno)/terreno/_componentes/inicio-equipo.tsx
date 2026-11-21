"use client";

import { Button, Empty, FilaSeleccionable } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { elegirPersona, type PersonaElegida } from "@/lib/terreno/persona";

import { BannerConexion } from "./banner-conexion";
import { useContextoTerreno } from "./contexto-terreno";
import { seccionesActivas } from "./secciones-terreno";

/** Inicio de Terreno en el equipo (g0): saludo, módulos activos y turno de ahora (CAR-801). */
export function InicioEquipo({
  instalacion,
  persona,
}: {
  instalacion: string;
  persona: PersonaElegida;
}) {
  const { datos } = useContextoTerreno();
  const tarjetas = seccionesActivas(datos?.modulos ?? null).filter((s) => s.href !== "/terreno");
  const nada = tarjetas.length === 0;

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
      {tarjetas.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {tarjetas.map((s) => (
            <FilaSeleccionable
              key={s.href}
              href={s.href}
              Link={LinkNext}
              titulo={s.titulo}
              secundario={s.secundario}
              inicio={<s.icono aria-hidden className="size-5 flex-none text-fg-muted" />}
            />
          ))}
        </div>
      ) : null}
      {nada ? (
        <Empty
          titulo="Aún no hay nada por hacer"
          descripcion="Tus rondas y accesos aparecerán aquí cuando tu empresa los active."
        />
      ) : null}
    </div>
  );
}