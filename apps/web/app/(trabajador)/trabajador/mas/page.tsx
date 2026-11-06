import { Bell, KeyRound, ShieldCheck, UserRound } from "lucide-react";

import { FilaSeleccionable } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";

export const metadata = { title: tituloPagina("trabajador", "Más") };

const ENTRADAS = [
  { href: "/trabajador/mis-datos", titulo: "Mis datos", detalle: "Teléfono, correo y dirección", Icono: UserRound },
  { href: "/trabajador/cambiar-pin", titulo: "Cambiar mi PIN", detalle: "El PIN de 6 dígitos de terreno", Icono: KeyRound },
  { href: "/trabajador/notificaciones", titulo: "Notificaciones", detalle: "Qué avisos recibes y cuándo", Icono: Bell },
  { href: "/trabajador/privacidad", titulo: "Privacidad", detalle: "Tus derechos sobre tus datos", Icono: ShieldCheck },
] as const;

/** Pantalla 06 · Más: solo lo que existe; las entradas pendientes no se dibujan. */
export default function Pagina() {
  return (
    <PaginaPortal portal="trabajador" titulo="Más" ruta="/trabajador/mas">
      <h2 className="t-title mb-3 text-fg md:hidden">Más</h2>
      <div className="-mx-4 border-y border-border bg-surface md:mx-0 md:rounded-lg md:border">
        {ENTRADAS.map(({ href, titulo, detalle, Icono }) => (
          <FilaSeleccionable
            key={href}
            href={href}
            Link={LinkNext}
            titulo={titulo}
            secundario={detalle}
            inicio={<Icono aria-hidden className="size-5 flex-none text-fg-muted" />}
          />
        ))}
      </div>
    </PaginaPortal>
  );
}
