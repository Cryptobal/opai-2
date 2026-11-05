import { CircleCheck, FileSignature, FileText, Mail, Plug, UserCheck } from "lucide-react";

import { cn, FilaSeleccionable, SeccionTarjeta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

export type Pendiente = {
  tipo: "aprobaciones" | "documentos" | "invitaciones" | "integraciones" | "anexos";
  titulo: string;
  detalle: string;
  tono: "warning" | "danger" | "neutro";
  href: string;
  accion: string;
};

const MAXIMO = 5;

const ICONO: Record<Pendiente["tipo"], typeof UserCheck> = {
  aprobaciones: UserCheck,
  documentos: FileText,
  invitaciones: Mail,
  integraciones: Plug,
  anexos: FileSignature,
};
const FONDO = {
  warning: "bg-warning-muted text-warning-fg",
  danger: "bg-danger-muted text-danger-fg",
  neutro: "bg-fill text-fg-muted",
};

function Icono({ p }: { p: Pendiente }) {
  const I = ICONO[p.tipo];
  return (
    <span
      aria-hidden
      className={cn("flex size-9 flex-none items-center justify-center rounded-md", FONDO[p.tono])}
    >
      <I className="size-4" />
    </span>
  );
}

/** "Requiere tu decisión hoy" (46/47): una fila por tema con su acción; en teléfono, filas tocables. */
export function PendientesInicio({ items: todos }: { items: Pendiente[] }) {
  const items = todos.slice(0, MAXIMO);
  return (
    <SeccionTarjeta
      titulo="Requiere tu decisión hoy"
      accion={
        todos.length > MAXIMO ? (
          <EnlaceBoton href="/bandeja" variante="ghost">
            Ver todo ({todos.length})
          </EnlaceBoton>
        ) : (
          <span className="t-caption">
            {todos.length ? `${todos.length} ${todos.length === 1 ? "tema" : "temas"}` : ""}
          </span>
        )
      }
      sinRelleno
    >
      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-6 text-base text-fg-muted">
          <CircleCheck className="size-5 flex-none text-success-fg" aria-hidden />
          Nada pendiente. Lo urgente aparecerá aquí.
        </p>
      ) : (
        <ul>
          {items.map((p, i) => (
            <li key={`${p.tipo}-${i}`} className="border-b border-border last:border-b-0">
              <div className="md:hidden">
                <FilaSeleccionable
                  ajustarTexto
                  href={p.href}
                  Link={LinkNext}
                  inicio={<Icono p={p} />}
                  titulo={p.titulo}
                  secundario={p.detalle}
                  className="border-b-0"
                />
              </div>
              <div className="hidden items-center gap-3 px-4 py-3.5 md:flex">
                <Icono p={p} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-base font-medium text-fg">{p.titulo}</span>
                  <span className="t-caption">{p.detalle}</span>
                </span>
                <EnlaceBoton
                  href={p.href}
                  variante={i === 0 && p.tipo === "aprobaciones" ? "primary" : "secondary"}
                >
                  {p.accion}
                </EnlaceBoton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SeccionTarjeta>
  );
}
