import { History } from "lucide-react";

import { Card, Estado, type ItemTimeline, Segmentado, Timeline } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { fecha, haceCuanto, haceDias, hora, hoyIso } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { Actividad } from "@/lib/tipos-maestros";

import { EnlaceBoton } from "./enlace-boton";

type Entidad = { tipo: "cuenta" | "instalacion" | "persona" | "cargo"; id: string };

const diaDe = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date(iso));

/** Tab Actividad de una ficha (52): por día, personas y agentes, campos cambiados y auditoría. */
export async function ActividadFicha({
  entidad,
  actor,
  base,
  consulta = "",
}: {
  entidad: Entidad;
  actor?: string | undefined;
  base: string;
  /** Parámetros de la lista (`?q=…`) que el filtro conserva al cambiar de "Todo" a "Personas" o "Agentes". */
  consulta?: string;
}) {
  const enlace = (a?: "persona" | "agente") => {
    const q = new URLSearchParams(consulta);
    if (a) q.set("actor", a);
    const t = q.toString();
    return t ? `${base}?${t}` : base;
  };
  const filtro = actor === "persona" || actor === "agente" ? actor : undefined;
  const r = await ejecutarComoUsuario<Actividad>("erp", "core.actividad.list", {
    entidad,
    limite: 50,
    ...(filtro ? { actor: filtro } : {}),
  });
  const items = r.ok ? r.data.items : [];
  const dias = [...new Set(items.map((i) => diaDe(i.cuando)))];
  const hace30 = haceDias(30);
  const recientes = items.filter((i) => new Date(i.cuando).getTime() >= hace30);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="flex min-w-0 flex-col gap-4">
        <Segmentado
          etiqueta="Filtrar actividad"
          activa={filtro ?? "todo"}
          Link={LinkNext}
          opciones={[
            { id: "todo", etiqueta: "Todo", href: enlace() },
            { id: "persona", etiqueta: "Personas", href: enlace("persona") },
            { id: "agente", etiqueta: "Agentes", href: enlace("agente") },
          ]}
          className="self-start"
        />
        <Estado
          state={r.ok && items.length === 0 ? "empty" : estadoPantalla(r)}
          variante="detalle"
          textos={{
            vacio: {
              titulo: "Sin actividad todavía",
              descripcion: "Cada cambio de esta ficha aparecerá aquí, con quién lo hizo y cuándo.",
            },
          }}
        >
          {dias.map((d) => (
            <section key={d} className="flex flex-col gap-3">
              <h3 className="t-caption">{d === hoyIso() ? "Hoy" : fecha(d)}</h3>
              <Timeline
                items={items
                  .filter((i) => diaDe(i.cuando) === d)
                  .map((i): ItemTimeline => ({
                    id: i.id,
                    actor: { nombre: i.actor.nombre, agente: i.actor.agente },
                    accion: i.accion,
                    conTipo: true,
                    cuando: `${hora(i.cuando)} · ${haceCuanto(i.cuando)}`,
                    meta: i.via ? `vía ${i.via}` : "desde OPAI",
                    ...(i.cambios[0] && i.cambios.length === 1
                      ? { cambio: { campo: i.cambios[0].campo, despues: i.cambios[0].valor } }
                      : {}),
                    ...(i.cambios.length > 1
                      ? {
                          detalle: i.cambios
                            .map((c) => `${c.campo.padEnd(16)} ${c.valor}`)
                            .join("\n"),
                        }
                      : {}),
                  }))}
              />
            </section>
          ))}
        </Estado>
      </div>
      <Card className="flex h-fit flex-col gap-3 p-4">
        <p className="t-label">Últimos 30 días</p>
        <p className="flex justify-between text-base text-fg-muted">
          Cambios por personas{" "}
          <span className="t-numeric text-fg">
            {recientes.filter((i) => !i.actor.agente).length}
          </span>
        </p>
        <p className="flex justify-between text-base text-fg-muted">
          Cambios por agentes{" "}
          <span className="t-numeric text-fg">
            {recientes.filter((i) => i.actor.agente).length}
          </span>
        </p>
        <p className="t-caption border-t border-border pt-3">
          Cada cambio queda en la auditoría con quién, cuándo y por qué canal.
        </p>
        <EnlaceBoton
          href={`/configuracion/auditoria?entidad=${entidad.id}`}
          variante="secondary"
          icono={History}
        >
          Abrir auditoría de esta ficha
        </EnlaceBoton>
      </Card>
    </div>
  );
}
