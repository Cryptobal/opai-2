import { ChevronLeft } from "lucide-react";

import { cn } from "../cn";
import type { LinkComponent, Volver } from "./types";

/** «‹» de la barra de iPad y desktop; con `bajoLg`, solo de 768 a 1023 px (ficha de un solo panel). */
export function AtrasBarra(props: { volver: Volver; bajoLg: boolean; Link: LinkComponent }) {
  const { volver, bajoLg, Link } = props;
  return (
    <Link
      href={volver.href}
      className={cn(
        "-ml-2 flex size-11 flex-none items-center justify-center rounded-md text-fg hover:bg-fill",
        bajoLg && "lg:hidden",
      )}
      aria-label={`Volver a ${volver.etiqueta}`}
    >
      <ChevronLeft className="size-5" />
    </Link>
  );
}

/** Migas «Cuentas / título»; con `bajoLg` desde 1024 px vuelve al título normal. */
export function MigasBarra(props: { volver: Volver; titulo: string; bajoLg: boolean }) {
  return (
    <div className="min-w-0">
      <p className={cn("t-caption truncate", props.bajoLg && "lg:hidden")}>
        {props.volver.etiqueta}
      </p>
      <h1
        className={cn(
          "truncate text-md leading-6 font-semibold text-fg",
          props.bajoLg && "lg:t-heading",
        )}
      >
        {props.titulo}
      </h1>
    </div>
  );
}
