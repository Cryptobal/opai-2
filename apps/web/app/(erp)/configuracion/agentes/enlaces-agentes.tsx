import { Bot, Webhook } from "lucide-react";

import { FilaSeleccionable } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

const ENTRADAS = [
  {
    href: "/configuracion/agentes/conectar",
    titulo: "Conectar tu IA",
    descripcion: "Conecta ChatGPT, Claude u otro asistente a OPAI con una key",
    icono: Bot,
  },
  {
    href: "/configuracion/agentes/eventos",
    titulo: "Eventos salientes",
    descripcion: "Avisa a otros sistemas cuando pasa algo en OPAI (webhooks)",
    icono: Webhook,
  },
] as const;

/** Accesos rápidos bajo el título de Agentes y API keys. */
export function EnlacesAgentes() {
  return (
    <ul className="overflow-hidden rounded-lg border border-border bg-surface">
      {ENTRADAS.map((e) => (
        <li key={e.href} className="border-b border-border last:border-b-0">
          <FilaSeleccionable
            Link={LinkNext}
            href={e.href}
            titulo={e.titulo}
            secundario={e.descripcion}
            ajustarTexto
            inicio={<e.icono aria-hidden className="size-[18px] flex-none text-fg-muted" />}
          />
        </li>
      ))}
    </ul>
  );
}