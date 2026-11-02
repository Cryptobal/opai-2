import { Plug } from "lucide-react";

import { Badge, cn } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { haceCuanto } from "@/lib/fechas";

import { representanteTarjetaIntegracion } from "./integraciones-tarjetas";
import {
  CATEGORIA,
  ESTADO,
  type Integracion,
  MODALIDAD,
  rutaDe,
  SUBTITULO,
  TITULO_TARJETA,
  ICONO_TARJETA,
} from "./tipos";

type Props = { items: Integracion[] };

/** Tarjeta de una integración (28); las de IA se agrupan en una sola ("2 proveedores"). */
export function TarjetaIntegracion({ items }: Props) {
  const i = representanteTarjetaIntegracion(items);
  if (!i) return null;
  const cat = CATEGORIA[i.categoria] ?? { titulo: i.nombre, icono: Plug };
  const Icono = ICONO_TARJETA[i.proveedor] ?? cat.icono;
  const configuradas = items.filter((x) => x.estado === "configurada").length;
  const titulo =
    items.length === 1 ? (TITULO_TARJETA[i.proveedor] ?? cat.titulo) : cat.titulo;
  const subtitulo =
    i.categoria === "ia"
      ? `${configuradas} ${configuradas === 1 ? "proveedor" : "proveedores"}`
      : (SUBTITULO[i.proveedor] ?? i.nombre);
  const pronto = i.estado === "proximamente";
  const e = ESTADO[i.estado] ?? { texto: i.estado, tono: "neutro" as const };
  const pie = pronto
    ? null
    : i.estado === "error"
      ? `${i.ultimoError ?? "Error"}${i.ultimoTestEn ? ` · ${haceCuanto(i.ultimoTestEn)}` : ""}`
      : i.ultimoTestEn
        ? `Último test ${haceCuanto(i.ultimoTestEn)}`
        : "Sin test";
  const contenido = (
    <>
      <span className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 flex-none items-center justify-center rounded-md border border-border text-fg-muted"
        >
          <Icono className="size-[18px]" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-md font-semibold text-fg">{titulo}</span>
          <span className="t-caption truncate">{subtitulo}</span>
        </span>
      </span>
      <span className="flex flex-wrap gap-1.5">
        {pronto ? null : <Badge punto={false}>{MODALIDAD[i.modalidad] ?? i.modalidad}</Badge>}
        <Badge tono={e.tono} punto={!pronto}>
          {e.texto}
        </Badge>
      </span>
      {pie ? (
        <span className={cn("t-caption", i.estado === "error" && "text-danger-fg")}>{pie}</span>
      ) : null}
    </>
  );
  const clase = "flex flex-col gap-3 rounded-lg border border-border bg-surface p-4";
  if (pronto)
    return (
      <div className={cn(clase, "opacity-60")} aria-disabled>
        {contenido}
      </div>
    );
  return (
    <LinkNext
      href={rutaDe(i)}
      className={cn(
        clase,
        "outline-none transition-colors duration-150 hover:border-border-strong focus-visible:outline-2 focus-visible:outline-focus",
      )}
    >
      {contenido}
    </LinkNext>
  );
}
