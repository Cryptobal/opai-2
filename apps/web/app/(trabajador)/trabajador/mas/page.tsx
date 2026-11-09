import { Bell, KeyRound, ScanFace, ShieldCheck, Smartphone, UserRound } from "lucide-react";

import { FilaSeleccionable } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { cargarAsistenciaPropia } from "@/app/_components/asistencia/cargar";

export const metadata = { title: tituloPagina("trabajador", "Más") };

const ENTRADAS = [
  { href: "/trabajador/mis-datos", titulo: "Mis datos", detalle: "Teléfono, correo y dirección", Icono: UserRound },
  { href: "/trabajador/cambiar-pin", titulo: "Cambiar mi PIN", detalle: "El PIN de 6 dígitos de terreno", Icono: KeyRound },
  { href: "/trabajador/notificaciones", titulo: "Notificaciones", detalle: "Qué avisos recibes y cuándo", Icono: Bell },
  { href: "/trabajador/mi-rostro", titulo: "Mi rostro", detalle: "Enrolar o borrar tu rostro para marcar", Icono: ScanFace },
  { href: "/trabajador/privacidad", titulo: "Privacidad", detalle: "Tus derechos sobre tus datos", Icono: ShieldCheck },
] as const;

/** Pantalla 06 · Más: solo lo que existe; las entradas pendientes no se dibujan. */
export default async function Pagina() {
  // «Marcar» solo existe para quien RR. HH. habilitó en el canal teléfono personal (D-01).
  const { estado } = await cargarAsistenciaPropia();
  const entradas = estado?.telefonoHabilitado
    ? [{ href: "/trabajador/marcar", titulo: "Marcar asistencia", detalle: "Desde tu teléfono personal", Icono: Smartphone }, ...ENTRADAS]
    : ENTRADAS;
  return (
    <PaginaPortal portal="trabajador" titulo="Más" ruta="/trabajador/mas">
      <h2 className="t-title mb-3 text-fg md:hidden">Más</h2>
      <div className="-mx-4 border-y border-border bg-surface md:mx-0 md:rounded-lg md:border">
        {entradas.map(({ href, titulo, detalle, Icono }) => (
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
