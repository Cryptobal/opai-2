import { cookies } from "next/headers";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { COOKIE_MARCO, marcoDeCookie } from "@/lib/marco";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { requerirIdentidad } from "@/lib/servidor";

import { InicioErp } from "./_componentes/inicio";

/** Inicio del ERP (46/47). */
export default function Inicio({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Inicio"
      ruta="/"
      cargar={async () => {
        const [p, id, galletas] = await Promise.all([
          leerParametros(searchParams),
          requerirIdentidad("/"),
          cookies(),
        ]);
        return {
          actor: p["actor"],
          nombre: id.usuario.nombre,
          empresa: id.actual?.tenant.nombre ?? "",
          hilo: marcoDeCookie(galletas.get(COOKIE_MARCO)?.value) === "hilo",
        };
      }}
    >
      {(d) => <InicioErp nombre={d.nombre} empresa={d.empresa} actor={d.actor} hilo={d.hilo} />}
    </PaginaPortal>
  );
}
