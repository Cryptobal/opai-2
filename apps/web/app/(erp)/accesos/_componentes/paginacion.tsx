import { LinkNext } from "@/app/_components/link-next";

/** «Siguiente página» de las listas de la pestaña Accesos; sin página siguiente, nada. */
export const paginacion = (href: string | null) =>
  href
    ? {
        paginacion: (
          <LinkNext href={href} className="t-label px-4 py-3 text-accent">
            Siguiente página
          </LinkNext>
        ),
      }
    : {};
