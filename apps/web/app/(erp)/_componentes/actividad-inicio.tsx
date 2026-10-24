import { Bot } from "lucide-react";

import { Avatar, SeccionTarjeta, Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { fecha, haceCuanto, hora, hoyIso } from "@/lib/fechas";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { Actividad } from "@/lib/tipos-maestros";

const diaDe = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date(iso));
const cuando = (iso: string) =>
  diaDe(iso) === hoyIso() ? hora(iso) : haceCuanto(iso) || fecha(iso);

/** Actividad de la empresa en Inicio (46/47): personas y agentes; sin permiso de auditoría no aparece. */
export async function ActividadInicio({ actor }: { actor: string | undefined }) {
  const filtro = actor === "persona" || actor === "agente" ? actor : undefined;
  const r = await ejecutarComoUsuario<Actividad>("erp", "core.actividad.list", {
    limite: 6,
    ...(filtro ? { actor: filtro } : {}),
  });
  if (!r.ok) return null;
  return (
    <SeccionTarjeta
      titulo="Actividad"
      accion={
        <Segmentado
          etiqueta="Filtrar actividad"
          activa={filtro ?? "todo"}
          Link={LinkNext}
          opciones={[
            { id: "todo", etiqueta: "Todo", href: "/" },
            { id: "persona", etiqueta: "Personas", href: "/?actor=persona" },
            { id: "agente", etiqueta: "Agentes", href: "/?actor=agente" },
          ]}
        />
      }
    >
      {r.data.items.length === 0 ? (
        <p className="text-base text-fg-muted">Sin actividad todavía.</p>
      ) : (
        <ul className="flex flex-col">
          {r.data.items.map((i) => (
            <li
              key={i.id}
              className="flex gap-3 border-b border-border py-3 first:pt-0 last:border-b-0"
            >
              {i.actor.agente ? (
                <span
                  aria-label="Agente"
                  className="flex size-8 flex-none items-center justify-center rounded-md bg-accent-muted text-accent"
                >
                  <Bot className="size-4" />
                </span>
              ) : (
                <Avatar nombre={i.actor.nombre} />
              )}
              <span className="flex min-w-0 flex-col">
                <span className="text-base text-fg">
                  <strong className="font-semibold">{i.actor.nombre}</strong> {i.accion}
                </span>
                <span className="t-caption">
                  {i.actor.agente ? `Agente${i.via ? ` vía ${i.via}` : ""} · ` : ""}
                  {cuando(i.cuando)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <EnlaceBoton href="/configuracion/auditoria" variante="ghost" className="mt-2 -ml-3">
        Ver toda la auditoría
      </EnlaceBoton>
    </SeccionTarjeta>
  );
}
